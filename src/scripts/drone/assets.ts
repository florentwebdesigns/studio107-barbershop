/**
 * Asset loading for the 3D homepage: baked PBR texture sets (public/drone/tex),
 * procedural trees (public/drone/trees.glb, generated with ez-tree), the walking client
 * (public/drone/client.glb) and its walk/idle clips (public/drone/anims.glb).
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const BASE = '/drone/';
export const TEX_SETS = ['brick', 'shingles', 'pavers', 'gravel', 'concrete', 'sidewalk', 'asphalt', 'siding', 'stucco', 'woodwall', 'floor'] as const;
export type TexSet = (typeof TEX_SETS)[number];
export type PBRSet = { map: THREE.Texture; normal: THREE.Texture; orm: THREE.Texture };

export type Assets = {
  tex: Record<TexSet, PBRSet>;
  trees: THREE.Group;
  client: GLTF;
  anims: THREE.AnimationClip[];
  animRig: THREE.Object3D; // skeleton the clips were authored on (rest pose), for retargeting
};

export async function loadAssets(renderer: THREE.WebGLRenderer, onProgress: (f: number) => void): Promise<Assets> {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => onProgress(loaded / total);
  const tl = new THREE.TextureLoader(manager);
  const gl = new GLTFLoader(manager);
  gl.setMeshoptDecoder(MeshoptDecoder);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const loadTex = (file: string, srgb: boolean) =>
    tl.loadAsync(BASE + 'tex/' + file).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      return t;
    });

  const texEntries = TEX_SETS.map(async (n) => {
    const [map, normal, orm] = await Promise.all([loadTex(`${n}_c.webp`, true), loadTex(`${n}_n.webp`, false), loadTex(`${n}_orm.webp`, false)]);
    return [n, { map, normal, orm }] as const;
  });

  const [texList, trees, client, animsGltf] = await Promise.all([
    Promise.all(texEntries),
    gl.loadAsync(BASE + 'trees.glb'),
    gl.loadAsync(BASE + 'client.glb'),
    gl.loadAsync(BASE + 'anims.glb'),
  ]);

  return {
    tex: Object.fromEntries(texList) as Record<TexSet, PBRSet>,
    trees: trees.scene,
    client,
    anims: animsGltf.animations,
    animRig: animsGltf.scene,
  };
}

/**
 * Planar world-space UVs, per triangle: u runs along the face horizontally and v up the face,
 * both in meters / tile. Adjacent boxes therefore line up (brick courses continue across piers).
 * `offset` is the mesh position, so the mapping is in world space.
 */
export function worldUV(geo: THREE.BufferGeometry, tile: number, offset = new THREE.Vector3(), rot = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = new THREE.Vector3(), t = new THREE.Vector3(), bt = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i).add(offset);
    b.fromBufferAttribute(pos, i + 1).add(offset);
    c.fromBufferAttribute(pos, i + 2).add(offset);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    if (Math.abs(n.y) > 0.9) {
      // floors / ceilings: x and -z
      t.set(1, 0, 0);
      bt.set(0, 0, n.y > 0 ? -1 : 1);
    } else {
      t.crossVectors(up, n).normalize();
      bt.crossVectors(n, t).normalize();
    }
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      const u = p.dot(t) / tile, v = p.dot(bt) / tile;
      uv[(i + k) * 2] = u * cr - v * sr;
      uv[(i + k) * 2 + 1] = u * sr + v * cr;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
