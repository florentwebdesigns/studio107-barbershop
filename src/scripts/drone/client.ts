/**
 * The client who walks out with a fresh cut: a rigged avatar (public/drone/client.glb) driven by
 * walk / idle clips (public/drone/anims.glb) whose playhead follows the scroll, plus a procedural
 * right-arm reach for pulling the door shut.
 */
import * as THREE from 'three';
import type { Assets } from './assets';

export type Client = ReturnType<typeof buildClient>;

export function buildClient(A: Assets, height = 1.78) {
  const model = A.client.scene;
  const root = new THREE.Group();
  root.add(model);

  // normalise height, feet on the ground
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const s = height / (box.max.y - box.min.y);
  model.scale.setScalar(s);
  model.position.y = -box.min.y * s;

  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isMesh) {
      const mat0 = m.material as THREE.MeshStandardMaterial;
      // no hat: he's just had his cut; dark jacket and jeans read better at dusk
      if (mat0.name === 'Wolf3D_Headwear') m.visible = false;
      if (mat0.name === 'Wolf3D_Outfit_Top') mat0.color.setRGB(0.32, 0.33, 0.36);
      if (mat0.name === 'Wolf3D_Outfit_Bottom') mat0.color.setRGB(0.45, 0.5, 0.62);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && 'roughness' in mat) mat.envMapIntensity = 0.8;
    }
  });

  // Retarget the Mixamo clips onto the avatar. Both rigs share bone names (minus the "mixamorig"
  // prefix) and a T-pose rest, but their local bone axes differ, so each keyframe is converted to a
  // world-space delta from the source rest pose and re-applied on top of the avatar's rest pose.
  const restInfo = (rootObj: THREE.Object3D, strip: boolean) => {
    rootObj.updateMatrixWorld(true);
    const map = new Map<string, { local: THREE.Quaternion; parentWorld: THREE.Quaternion }>();
    rootObj.traverse((o) => {
      if (!(o as THREE.Bone).isBone && !/Hips|Spine|Arm|Leg|Hand|Foot|Head|Neck|Shoulder|Toe/.test(o.name)) return;
      const pw = new THREE.Quaternion();
      o.parent?.getWorldQuaternion(pw);
      map.set(strip ? o.name.replace(/^mixamorig:?/, '') : o.name, { local: o.quaternion.clone(), parentWorld: pw });
    });
    return map;
  };
  // The source rig's stored node pose isn't its T-pose, so pose it with its own TPose clip first.
  const tposeClip = A.anims.find((a) => a.name === 'TPose');
  if (tposeClip) {
    const m = new THREE.AnimationMixer(A.animRig);
    m.clipAction(tposeClip).play();
    m.update(0);
  }
  const srcRest = restInfo(A.animRig, true);

  // The avatar rests in an A-pose; turn its limbs to match the source T-pose before measuring.
  const basis = (r: THREE.Object3D, pre: string) => {
    const g = (n: string) => r.getObjectByName(pre + n)!.getWorldPosition(new THREE.Vector3());
    const right = g('RightArm').sub(g('LeftArm')).normalize();
    const up = g('Head').sub(g('Hips')).normalize();
    const fwd = new THREE.Vector3().crossVectors(right, up).normalize();
    up.crossVectors(fwd, right).normalize();
    return new THREE.Matrix4().makeBasis(right, up, fwd);
  };
  model.updateMatrixWorld(true);
  A.animRig.updateMatrixWorld(true);
  const bs = basis(A.animRig, 'mixamorig'), bd = basis(model, '');
  const toChar = bs.clone().invert();
  const limbs: [string, string][] = [
    ['LeftShoulder', 'LeftArm'], ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'],
    ['RightShoulder', 'RightArm'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
    ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
  ];
  {
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), want = new THREE.Vector3();
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
    for (const [b0, b1] of limbs) {
      const sb = A.animRig.getObjectByName('mixamorig' + b0), sc = A.animRig.getObjectByName('mixamorig' + b1);
      const db = model.getObjectByName(b0), dc = model.getObjectByName(b1);
      if (!sb || !sc || !db || !dc) continue;
      sb.getWorldPosition(p1);
      sc.getWorldPosition(p2);
      want.subVectors(p2, p1).normalize().transformDirection(toChar).transformDirection(bd);
      db.getWorldPosition(p1);
      dc.getWorldPosition(p2);
      qa.setFromUnitVectors(p2.sub(p1).normalize(), want);
      db.getWorldQuaternion(qb);
      qb.premultiply(qa);
      db.parent!.getWorldQuaternion(qc);
      db.quaternion.copy(qc.invert().multiply(qb));
      db.updateMatrixWorld(true);
    }
  }
  const dstRest = restInfo(model, false);
  // the rigs face opposite ways; world-space deltas are carried across by this rotation
  const F = new THREE.Quaternion().setFromRotationMatrix(bd.clone().multiply(toChar));
  const Finv = F.clone().invert();
  const q = new THREE.Quaternion(), d = new THREE.Quaternion(), tmp = new THREE.Quaternion();
  const fix = (clip: THREE.AnimationClip) => {
    const c = clip.clone();
    c.tracks = c.tracks
      .filter((t) => t.name.endsWith('.quaternion'))
      .map((t) => {
        const bone = t.name.replace(/\.quaternion$/, '').replace(/^mixamorig:?/, '');
        const s = srcRest.get(bone), r = dstRest.get(bone);
        const nt = t.clone();
        nt.name = bone + '.quaternion';
        if (!s || !r) return nt;
        const v = nt.values;
        const sInv = s.local.clone().invert();
        const spw = s.parentWorld, spwInv = spw.clone().invert();
        const rpw = r.parentWorld, rpwInv = rpw.clone().invert();
        for (let i = 0; i < v.length; i += 4) {
          q.fromArray(v, i);
          d.copy(q).multiply(sInv); // delta in the source parent frame
          tmp.copy(spw).multiply(d).multiply(spwInv); // to world
          tmp.premultiply(F).multiply(Finv); // to the avatar's facing
          d.copy(rpwInv).multiply(tmp).multiply(rpw); // to avatar parent frame
          d.multiply(r.local).normalize().toArray(v, i);
        }
        return nt;
      });
    return c;
  };
  const walkClip = fix(A.anims.find((a) => a.name === 'Walk')!);
  const idleClip = fix(A.anims.find((a) => a.name === 'Idle')!);
  const mixer = new THREE.AnimationMixer(model);
  const walk = mixer.clipAction(walkClip);
  const idle = mixer.clipAction(idleClip);
  walk.play();
  idle.play();

  const bone = (n: string) => model.getObjectByName(n) as THREE.Bone | undefined;
  const hips = bone('Hips');
  const rArm = bone('RightArm'), rFore = bone('RightForeArm'), rHand = bone('RightHand');
  const hipsY = hips ? hips.position.y : 0;

  const a = new THREE.Vector3(), b = new THREE.Vector3(), target = new THREE.Vector3();
  const qd = new THREE.Quaternion(), qw = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const ident = new THREE.Quaternion();
  const fwd = new THREE.Vector3();

  /** Rotate `bone` (in world space) so the segment bone -> child points toward `dir`, by amount k. */
  function aim(bn: THREE.Bone, child: THREE.Object3D, dir: THREE.Vector3, k: number) {
    bn.getWorldPosition(a);
    child.getWorldPosition(b);
    const cur = b.sub(a).normalize();
    qd.setFromUnitVectors(cur, dir);
    qd.slerpQuaternions(ident, qd, k);
    bn.getWorldQuaternion(qw);
    qw.premultiply(qd);
    (bn.parent as THREE.Object3D).getWorldQuaternion(qp);
    bn.quaternion.copy(qp.invert().multiply(qw));
    bn.updateMatrixWorld(true);
  }

  /**
   * @param cycle walk cycle position in cycles (distance / stride)
   * @param walkW 0 idle .. 1 walking
   * @param reach 0..1 right arm reaching forward to the door handle
   * @param t seconds (for idle breathing)
   */
  function pose(cycle: number, walkW: number, reach: number, t: number) {
    walk.setEffectiveWeight(walkW);
    idle.setEffectiveWeight(1 - walkW);
    walk.time = (((cycle % 1) + 1) % 1) * walkClip.duration;
    idle.time = t % idleClip.duration;
    mixer.update(0);
    if (hips) hips.position.y = hipsY;
    if (reach > 0.001 && rArm && rFore && rHand) {
      root.updateMatrixWorld(true);
      fwd.set(0, -0.25, 1).applyQuaternion(root.quaternion).normalize();
      aim(rArm, rFore, fwd, reach);
      target.copy(fwd).add(new THREE.Vector3(0, 0.08, 0)).normalize();
      aim(rFore, rHand, target, reach);
    }
  }
  pose(0, 0, 0, 0);
  return { root, pose };
}
