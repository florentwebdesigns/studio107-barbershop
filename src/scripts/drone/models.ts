/**
 * Geometry for the 3D Studio 107 storefront and interior.
 * Coordinates are meters. x runs along the facade, y is up, +z points to the street.
 * The facade plane is z = 0 and the shop interior runs back to z = -11.
 * Layout and materials follow the real photos: red brick, black and gold sign, white-framed
 * window and door with the "265" transom, barber pole, neon "open", reclaimed-wood wall,
 * white mirrors, black barber chairs and grey-brown plank floor.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from './textures';

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

function rep(t: THREE.Texture, rx: number, ry: number) {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, shadow: 'both' | 'cast' | 'receive' | 'none' = 'both') {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow === 'both' || shadow === 'cast';
  m.receiveShadow = shadow === 'both' || shadow === 'receive';
  return m;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r = 0.02, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);

export type World = ReturnType<typeof buildWorld>;

export function buildWorld(scene: THREE.Scene, quality: 'high' | 'low') {
  T.resetSeed();
  const tx = {
    brick: T.brick(),
    shingles: T.shingles(),
    concrete: T.concrete(true),
    gravel: T.gravel(),
    pavers: T.pavers(),
    asphalt: T.asphalt(),
    stucco: T.stucco(),
    sign: T.sign(),
    neon: T.neon(),
    transom: T.transom(),
    pole: T.poleStripes(),
    sky: T.sky(),
    wood: T.woodWall(),
    floor: T.floor(),
    ceiling: T.ceiling(),
    menu: T.menuBoard(),
  };

  // Brick texture covers ~1.55m x 1.4m.
  const brickMat = (w: number, h: number) =>
    std({ map: rep(tx.brick.map, w / 1.55, h / 1.4), bumpMap: rep(tx.brick.bump, w / 1.55, h / 1.4), bumpScale: 1.2, roughness: 0.92 });
  const white = std({ color: '#e9e7e2', roughness: 0.55 });
  const alu = std({ color: '#d9dadb', roughness: 0.35, metalness: 0.6 });
  const black = std({ color: '#0c0c0c', roughness: 0.5 });
  const chrome = std({ color: '#ffffff', roughness: 0.08, metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#9fb2b8', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false,
  });

  const root = new THREE.Group();
  scene.add(root);
  const add = (o: THREE.Object3D) => (root.add(o), o);

  /* ---------------- Sky & backdrop ---------------- */
  const skyMat = new THREE.MeshBasicMaterial({ map: tx.sky, side: THREE.BackSide, fog: false, depthWrite: false });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 24), skyMat);
  skyDome.position.y = -8;
  add(skyDome);

  // Evergreen silhouettes behind the building, like the pines behind the real strip.
  const treeMat = std({ color: '#06090a', roughness: 1 });
  const treeSpots: [number, number, number][] = [[-11, -19, 13], [-4, -24, 16], [3, -21, 12], [9, -26, 17], [15, -20, 11], [-18, -26, 14]];
  for (const [x, z, h] of treeSpots) {
    for (let k = 0; k < 5; k++) {
      const r = (h * 0.26) * (1 - k * 0.17);
      const g = new THREE.ConeGeometry(r, h * 0.36, 14, 3);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) > h * 0.17) continue;
        const j = 1 + (Math.sin(i * 12.9898 + x * 78.233) * 0.5) * 0.45;
        pos.setX(i, pos.getX(i) * j);
        pos.setZ(i, pos.getZ(i) * j);
      }
      g.computeVertexNormals();
      const c = mesh(g, treeMat, x + Math.sin(k * 2.1) * 0.25, h * 0.2 + k * h * 0.15, z, 'none');
      c.rotation.y = k * 1.3;
      add(c);
    }
  }

  /* ---------------- Ground ---------------- */
  const plane = (w: number, d: number, mat: THREE.Material, x: number, z: number, y = 0) => {
    const m = mesh(new THREE.PlaneGeometry(w, d), mat, x, y, z, 'receive');
    m.rotation.x = -Math.PI / 2;
    return add(m);
  };
  const road = std({ map: rep(tx.asphalt, 20, 6), roughness: 0.55, metalness: 0.0, color: '#9a9a9a' });
  plane(120, 50, road, 0, 34.3, -0.12);
  const sidewalk = std({ map: rep(tx.pavers, 30, 1.0), roughness: 0.75 });
  plane(70, 3, sidewalk, 0, 7.5, 0.0);
  const curb = std({ map: rep(tx.concrete, 30, 0.2), roughness: 0.8 });
  add(mesh(box(70, 0.14, 0.25), curb, 0, -0.05, 9.12));
  // gravel beds + concrete walkways to each door
  const gravelMat = std({ map: rep(tx.gravel, 8, 2.5), roughness: 0.95 });
  plane(70, 6, gravelMat, 0, 3, 0.005);
  const walkMat = std({ map: rep(tx.concrete, 1, 4), roughness: 0.82, color: '#c8c4bc' });
  for (const wx of [-4.35, 1.78, 4.45, -10.4, 10.6]) plane(1.25, 6, walkMat, wx, 3, 0.02);
  // apron along the facade
  plane(70, 0.7, walkMat, 0, 0.35, 0.021);

  /* ---------------- Building shell ---------------- */
  const X0 = -14.5, X1 = 14.5, ZB = -11.6;
  // Studio 107 unit openings
  const WIN = { x0: -3.2, x1: 1.0, y0: 0.45, y1: 2.55 };
  const DOOR = { x0: 1.18, x1: 2.38, top: 2.42, transom: 3.0 };
  const SIGN = { x0: -3.4, x1: 1.02, y0: 2.6, y1: 3.66 };
  const BAND = 3.66; // brick top / stucco band start

  const wallT = 0.26;
  const brickBox = (x0: number, x1: number, y0: number, y1: number) => {
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    add(mesh(box(w, h, wallT), brickMat(w, h), (x0 + x1) / 2, (y0 + y1) / 2, -wallT / 2));
  };
  // Left neighbor (generic, no branding): window + door
  brickBox(X0, -9.6, 0, BAND);
  brickBox(-9.6, -5.2, 0, 0.45);
  brickBox(-9.6, -5.2, 2.5, BAND);
  brickBox(-5.2, -4.95, 0, BAND);
  brickBox(-4.95, -3.85, 2.45, BAND);
  brickBox(-3.85, WIN.x0, 0, BAND);
  // Studio 107
  brickBox(WIN.x0, WIN.x1, 0, WIN.y0);
  brickBox(WIN.x1, DOOR.x0, 0, BAND);
  brickBox(DOOR.x0, DOOR.x1, DOOR.transom, BAND);
  brickBox(WIN.x0, WIN.x1, WIN.y1, BAND);
  brickBox(DOOR.x1, 4.0, 0, BAND);
  // Right neighbor
  brickBox(4.0, 4.95, 2.45, BAND);
  brickBox(4.95, 5.25, 0, BAND);
  brickBox(5.25, 9.9, 0, 0.45);
  brickBox(5.25, 9.9, 2.5, BAND);
  brickBox(9.9, X1, 0, BAND);

  // Stucco band, soffit and gutter
  const stuccoMat = std({ map: rep(tx.stucco, 20, 1), roughness: 0.9 });
  add(mesh(box(X1 - X0, 0.5, wallT), stuccoMat, 0, BAND + 0.25, -wallT / 2));
  add(mesh(box(X1 - X0 + 0.8, 0.12, 0.85), white, 0, BAND + 0.56, 0.3));
  add(mesh(box(X1 - X0 + 0.8, 0.2, 0.08), white, 0, BAND + 0.5, 0.72));
  // side & back walls (dark, mostly unseen)
  const shellMat = std({ color: '#3a2a24', roughness: 0.95 });
  add(mesh(box(wallT, BAND + 0.5, -ZB), shellMat, X0, (BAND + 0.5) / 2, ZB / 2));
  add(mesh(box(wallT, BAND + 0.5, -ZB), shellMat, X1, (BAND + 0.5) / 2, ZB / 2));
  add(mesh(box(X1 - X0, BAND + 0.5, wallT), shellMat, 0, (BAND + 0.5) / 2, ZB));
  // Neighbor interiors are closed volumes so you never see through the building.
  const voidMat = std({ color: '#0e0c0e', roughness: 1 });
  add(mesh(box(-3.45 - X0, BAND, -0.95 - ZB), voidMat, (X0 - 3.45) / 2, BAND / 2, (ZB - 0.95) / 2, 'none'));
  add(mesh(box(X1 - 3.75, BAND, -0.95 - ZB), voidMat, (X1 + 3.75) / 2, BAND / 2, (ZB - 0.95) / 2, 'none'));

  // Hip roof
  {
    const eY = BAND + 0.6, rY = eY + 2.5, ez0 = 0.75, ez1 = ZB - 0.6, ex0 = X0 - 0.4, ex1 = X1 + 0.4;
    const rz = (ez0 + ez1) / 2, rx0 = ex0 + (ez0 - rz), rx1 = ex1 - (ez0 - rz);
    const v = [
      // front
      ex0, eY, ez0, ex1, eY, ez0, rx1, rY, rz, ex0, eY, ez0, rx1, rY, rz, rx0, rY, rz,
      // back
      ex1, eY, ez1, ex0, eY, ez1, rx0, rY, rz, ex1, eY, ez1, rx0, rY, rz, rx1, rY, rz,
      // left
      ex0, eY, ez1, ex0, eY, ez0, rx0, rY, rz,
      // right
      ex1, eY, ez0, ex1, eY, ez1, rx1, rY, rz,
    ];
    const uv: number[] = [];
    for (let i = 0; i < v.length; i += 3) {
      const x = v[i], y = v[i + 1], z = v[i + 2];
      const isSide = i >= 36;
      uv.push(isSide ? z / 3 : x / 3, (y - eY) / 1.6 + (isSide ? x / 6 : 0));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const shingleTex = rep(tx.shingles, 1, 1);
    const roof = mesh(g, std({ map: shingleTex, roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0, 'both');
    add(roof);
  }

  /* ---------------- Studio 107 storefront ---------------- */
  // Sign panel: black box, printed front face.
  {
    const w = SIGN.x1 - SIGN.x0, h = SIGN.y1 - SIGN.y0;
    const face = std({ map: tx.sign.map, emissiveMap: tx.sign.emissive, emissive: new THREE.Color('#ffd79a'), emissiveIntensity: 0.55, roughness: 0.32, metalness: 0.15 });
    const mats = [black, black, black, black, face, black];
    add(mesh(box(w, h, 0.14), mats, (SIGN.x0 + SIGN.x1) / 2, (SIGN.y0 + SIGN.y1) / 2, 0.07));
    // thin metal trim
    add(mesh(box(w + 0.04, 0.03, 0.16), alu, (SIGN.x0 + SIGN.x1) / 2, SIGN.y1 + 0.01, 0.07));
    add(mesh(box(w + 0.04, 0.03, 0.16), alu, (SIGN.x0 + SIGN.x1) / 2, SIGN.y0 - 0.01, 0.07));
  }

  // Window frame (white aluminium) with center mullion
  const frameBar = (x: number, y: number, w: number, h: number, d = 0.12) => add(mesh(box(w, h, d), white, x, y, -0.06));
  const wcx = (WIN.x0 + WIN.x1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0;
  frameBar(wcx, WIN.y0 + 0.04, ww, 0.08);
  frameBar(wcx, WIN.y1 - 0.04, ww, 0.08);
  frameBar(WIN.x0 + 0.04, (WIN.y0 + WIN.y1) / 2, 0.08, wh);
  frameBar(WIN.x1 - 0.04, (WIN.y0 + WIN.y1) / 2, 0.08, wh);
  frameBar(-1.08, (WIN.y0 + WIN.y1) / 2, 0.07, wh);
  add(mesh(new THREE.PlaneGeometry(ww, wh), glass, wcx, (WIN.y0 + WIN.y1) / 2, -0.04, 'none'));
  // brick sill cap
  add(mesh(box(ww + 0.1, 0.05, 0.32), std({ color: '#9b8f84', roughness: 0.8 }), wcx, WIN.y0 - 0.01, -0.02));

  // Neon "open" hanging inside the upper left of the window
  const neonMat = new THREE.MeshBasicMaterial({ map: tx.neon, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(2.4, 2.4, 2.4), blending: THREE.AdditiveBlending });
  const neonSign = mesh(new THREE.PlaneGeometry(1.0, 0.5), neonMat, -2.25, 2.12, -0.16, 'none');
  add(neonSign);
  const neonLight = new THREE.PointLight('#ff3048', 2.2, 4.5, 2);
  neonLight.position.set(-2.25, 2.1, 0.25);
  add(neonLight);

  // Door frame, transom with "265", and the door leaf on a hinge (right side, like the real door)
  const dcx = (DOOR.x0 + DOOR.x1) / 2, dw = DOOR.x1 - DOOR.x0;
  frameBar(DOOR.x0 + 0.04, DOOR.transom / 2, 0.08, DOOR.transom);
  frameBar(DOOR.x1 - 0.04, DOOR.transom / 2, 0.08, DOOR.transom);
  frameBar(dcx, DOOR.transom - 0.04, dw, 0.08);
  frameBar(dcx, DOOR.top + 0.03, dw, 0.07);
  add(mesh(new THREE.PlaneGeometry(dw - 0.1, DOOR.transom - DOOR.top - 0.1), glass, dcx, (DOOR.top + DOOR.transom) / 2, -0.05, 'none'));
  const transomNum = new THREE.MeshBasicMaterial({ map: tx.transom, transparent: true, depthWrite: false, color: new THREE.Color(1.1, 1.1, 1.1) });
  add(mesh(new THREE.PlaneGeometry(0.9, 0.45), transomNum, dcx, (DOOR.top + DOOR.transom) / 2, -0.035, 'none'));

  const hingeX = DOOR.x1 - 0.08;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(hingeX, 0, -0.05);
  add(doorPivot);
  {
    const lw = hingeX - (DOOR.x0 + 0.08), lh = DOOR.top - 0.02;
    const g = new THREE.Group();
    g.position.x = -lw / 2;
    const fb = (x: number, y: number, w: number, h: number) => {
      const m = mesh(box(w, h, 0.06), alu, x, y, 0);
      g.add(m);
    };
    fb(0, 0.12, lw, 0.24); // kick rail
    fb(0, lh - 0.05, lw, 0.1);
    fb(-lw / 2 + 0.05, lh / 2, 0.1, lh);
    fb(lw / 2 - 0.05, lh / 2, 0.1, lh);
    fb(0, 1.0, lw, 0.06);
    const gl = mesh(new THREE.PlaneGeometry(lw - 0.2, lh - 0.36), glass, 0, lh / 2 + 0.07, 0, 'none');
    g.add(gl);
    // vertical pull handle on the latch side (left), both faces
    for (const s of [1, -1]) {
      const h = mesh(cyl(0.016, 0.016, 0.42, 12), chrome, -lw / 2 + 0.16, 1.05, s * 0.07);
      g.add(h);
      for (const yy of [0.86, 1.24]) g.add(mesh(cyl(0.01, 0.01, 0.07, 8), chrome, -lw / 2 + 0.16, yy, s * 0.04).rotateX(Math.PI / 2));
    }
    doorPivot.add(g);
  }

  // Twin flood light above the door
  {
    const base = mesh(cyl(0.07, 0.07, 0.05, 16), std({ color: '#b9b4ab', roughness: 0.6 }), dcx - 0.25, BAND + 0.1, 0.03);
    base.rotation.x = Math.PI / 2;
    add(base);
    for (const s of [-1, 1]) {
      const head = mesh(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#b9b4ab', roughness: 0.6, side: THREE.DoubleSide }), dcx - 0.25 + s * 0.14, BAND + 0.04, 0.13);
      head.rotation.x = Math.PI * 0.7;
      add(head);
    }
  }

  // Barber pole on the brick right of the door
  const pole = new THREE.Group();
  pole.position.set(2.98, 2.0, 0.17);
  add(pole);
  const poleTex = tx.pole;
  poleTex.wrapS = poleTex.wrapT = THREE.RepeatWrapping;
  poleTex.repeat.set(1, 1.6);
  const stripeMat = std({ map: poleTex, emissiveMap: poleTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.45, roughness: 0.35 });
  pole.add(mesh(cyl(0.085, 0.085, 0.72, 32), stripeMat, 0, 0, 0, 'cast'));
  pole.add(mesh(cyl(0.1, 0.1, 0.72, 32, ), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.02, envMapIntensity: 2, depthWrite: false }), 0, 0, 0, 'none'));
  const capProfile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.115, 0), new THREE.Vector2(0.125, 0.03), new THREE.Vector2(0.11, 0.06), new THREE.Vector2(0.12, 0.1), new THREE.Vector2(0.1, 0.14), new THREE.Vector2(0.06, 0.16), new THREE.Vector2(0, 0.17)];
  const capGeo = new THREE.LatheGeometry(capProfile, 32);
  const capTop = mesh(capGeo, chrome, 0, 0.36, 0, 'cast');
  pole.add(capTop);
  const capBot = mesh(capGeo, chrome, 0, -0.36, 0, 'cast');
  capBot.rotation.x = Math.PI;
  pole.add(capBot);
  const globeMat = std({ color: '#ffffff', emissive: new THREE.Color('#fff4e6'), emissiveIntensity: 1.6, roughness: 0.2 });
  pole.add(mesh(new THREE.SphereGeometry(0.13, 32, 20), globeMat, 0, 0.64, 0, 'none'));
  pole.add(mesh(box(0.05, 0.05, 0.17), chrome, 0, 0.2, -0.09));
  pole.add(mesh(box(0.05, 0.05, 0.17), chrome, 0, -0.2, -0.09));
  const poleLight = new THREE.PointLight('#ffeedd', 1.2, 3, 2);
  poleLight.position.set(2.98, 2.7, 0.4);
  add(poleLight);
  // Mailbox with 265
  add(mesh(rbox(0.32, 0.4, 0.14, 0.02), std({ color: '#121212', roughness: 0.4, metalness: 0.3 }), 2.98, 1.0, 0.07));

  // Window plants (white pots), as seen in the real window
  const potMat = std({ color: '#efefec', roughness: 0.5 });
  const leafMat = std({ color: '#3f6b2f', roughness: 0.7, side: THREE.DoubleSide });
  const plant = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.47, z);
    g.add(mesh(cyl(0.13 * s, 0.1 * s, 0.26 * s, 20), potMat, 0, 0.13 * s, 0));
    for (let i = 0; i < 14; i++) {
      const leaf = mesh(new THREE.SphereGeometry(0.05, 8, 6), leafMat, 0, 0.3 * s, 0);
      leaf.scale.set(0.5 * s, 3.4 * s, 0.12 * s);
      const a = (i / 14) * Math.PI * 2;
      leaf.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6);
      leaf.position.set(Math.sin(a) * 0.06, 0.38 * s, Math.cos(a) * 0.06);
      g.add(leaf);
    }
    add(g);
  };
  plant(-1.9, -0.45, 1.1);
  plant(-0.45, -0.5, 1.0);
  plant(-2.85, -0.4, 0.75);

  /* ---------------- Neighbor storefronts (unbranded) ---------------- */
  const neighbor = (x0: number, x1: number, dx0: number, dx1: number, tint: string) => {
    const w = x1 - x0;
    add(mesh(new THREE.PlaneGeometry(w, 2.05), glass, (x0 + x1) / 2, 1.475, -0.04, 'none'));
    frameBar((x0 + x1) / 2, 0.49, w, 0.08);
    frameBar((x0 + x1) / 2, 2.46, w, 0.08);
    frameBar(x0 + 0.04, 1.475, 0.08, 2.05);
    frameBar(x1 - 0.04, 1.475, 0.08, 2.05);
    const glow = mesh(new THREE.PlaneGeometry(w - 0.2, 1.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint), toneMapped: true }), (x0 + x1) / 2, 1.475, -0.9, 'none');
    add(glow);
    add(mesh(new THREE.PlaneGeometry(dx1 - dx0, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(0.7) }), (dx0 + dx1) / 2, 1.2, -0.9, 'none'));
    frameBar(dx0 + 0.04, 1.22, 0.08, 2.45);
    frameBar(dx1 - 0.04, 1.22, 0.08, 2.45);
    add(mesh(new THREE.PlaneGeometry(dx1 - dx0, 2.4), glass, (dx0 + dx1) / 2, 1.2, -0.04, 'none'));
  };
  neighbor(-9.6, -5.2, -4.95, -3.85, '#1d2229');
  neighbor(5.25, 9.9, 4.0, 4.95, '#2a1d17');
  // Fabric awning on the right neighbor
  {
    const awn = mesh(box(4.8, 0.06, 0.9), std({ color: '#3b261c', roughness: 0.9 }), 7.57, 2.95, 0.42);
    awn.rotation.x = 0.35;
    add(awn);
    add(mesh(box(4.8, 0.25, 0.04), std({ color: '#3b261c', roughness: 0.9 }), 7.57, 2.68, 0.86));
  }

  /* ---------------- Street props ---------------- */
  // Street lamp (black post, globe), like the one on the real block
  const lampMat = std({ color: '#0d0d0e', roughness: 0.4, metalness: 0.5 });
  const lamp = new THREE.Group();
  lamp.position.set(-6.6, 0, 8.25);
  lamp.add(mesh(cyl(0.16, 0.22, 0.6, 16), lampMat, 0, 0.3, 0));
  lamp.add(mesh(cyl(0.06, 0.08, 3.6, 16), lampMat, 0, 2.2, 0));
  lamp.add(mesh(cyl(0.12, 0.07, 0.18, 16), lampMat, 0, 4.05, 0));
  const lampGlobe = mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffd9a8'), emissiveIntensity: 3, roughness: 0.3 }), 0, 4.38, 0, 'none');
  lamp.add(lampGlobe);
  lamp.add(mesh(cyl(0.03, 0.12, 0.12, 16), lampMat, 0, 4.66, 0));
  add(lamp);

  // Fire hydrant
  {
    const h = new THREE.Group();
    h.position.set(0.9, 0, 8.55);
    const red = std({ color: '#b3231c', roughness: 0.5 });
    const whiteCap = std({ color: '#e8e2d2', roughness: 0.5 });
    h.add(mesh(cyl(0.13, 0.15, 0.08, 20), red, 0, 0.04, 0));
    h.add(mesh(cyl(0.11, 0.12, 0.5, 20), red, 0, 0.32, 0));
    h.add(mesh(cyl(0.13, 0.13, 0.05, 20), red, 0, 0.58, 0));
    h.add(mesh(new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), whiteCap, 0, 0.6, 0));
    for (const s of [-1, 1]) h.add(mesh(cyl(0.045, 0.045, 0.1, 12), red, s * 0.15, 0.4, 0).rotateZ(Math.PI / 2));
    h.add(mesh(cyl(0.06, 0.06, 0.1, 12), red, 0, 0.38, 0.13).rotateX(Math.PI / 2));
    add(h);
  }
  // Shrubs at the ends
  const shrubMat = std({ color: '#141c12', roughness: 1 });
  for (const [x, z, s] of [[-12.6, 1.4, 1.3], [-13.6, 2.6, 1.0], [12.8, 1.2, 1.2], [14.0, 2.4, 1.4], [-8.6, 0.9, 0.7]] as const) {
    const b = mesh(new THREE.IcosahedronGeometry(s, 1), shrubMat, x, s * 0.6, z);
    b.scale.y = 0.75;
    add(b);
  }

  /* ---------------- Interior ---------------- */
  const IX0 = -3.4, IX1 = 3.6, IZ1 = -11, IH = 2.9;
  const interior = new THREE.Group();
  root.add(interior);
  const iadd = (o: THREE.Object3D) => (interior.add(o), o);

  // floor
  const floorMat = std({ map: rep(tx.floor, 7 / 1.4, 11 / 1.4), roughness: 0.42, metalness: 0.0 });
  const fl = mesh(new THREE.PlaneGeometry(IX1 - IX0, -IZ1), floorMat, (IX0 + IX1) / 2, 0.005, IZ1 / 2, 'receive');
  fl.rotation.x = -Math.PI / 2;
  iadd(fl);
  // ceiling
  const ceilMat = std({ map: rep(tx.ceiling, (IX1 - IX0) / 0.6, -IZ1 / 0.6), roughness: 0.95 });
  const ce = mesh(new THREE.PlaneGeometry(IX1 - IX0, -IZ1), ceilMat, (IX0 + IX1) / 2, IH, IZ1 / 2, 'none');
  ce.rotation.x = Math.PI / 2;
  iadd(ce);
  // walls
  const grey = std({ color: '#8e908f', roughness: 0.9 });
  const woodMat = std({ map: rep(tx.wood, -IZ1 / 6.5, 1), roughness: 0.78 });
  const lw = mesh(new THREE.PlaneGeometry(-IZ1, IH), woodMat, IX0 + 0.01, IH / 2, IZ1 / 2, 'receive');
  lw.rotation.y = Math.PI / 2;
  iadd(lw);
  const rwall = mesh(new THREE.PlaneGeometry(-IZ1, IH), grey, IX1 - 0.01, IH / 2, IZ1 / 2, 'receive');
  rwall.rotation.y = -Math.PI / 2;
  iadd(rwall);
  const backWall = mesh(new THREE.PlaneGeometry(IX1 - IX0, IH), std({ color: '#7f817f', roughness: 0.9 }), (IX0 + IX1) / 2, IH / 2, IZ1 + 0.01, 'receive');
  iadd(backWall);
  // inside face of the front wall (painted)
  const fw = mesh(new THREE.PlaneGeometry(IX1 - IX0, IH), grey, (IX0 + IX1) / 2, IH / 2, -wallT - 0.01, 'none');
  fw.rotation.y = Math.PI;
  fw.visible = false; // the facade boxes already close the front
  iadd(fw);
  // baseboard + crown trim along the wood wall
  iadd(mesh(box(0.03, 0.1, -IZ1), white, IX0 + 0.02, 0.05, IZ1 / 2));
  iadd(mesh(box(0.04, 0.08, -IZ1), white, IX0 + 0.03, IH - 0.05, IZ1 / 2));

  // Mirrors (white frames) and wood vanities, with black barber chairs facing them
  const mirrorMat = std({ color: '#eef3f4', roughness: 0.0, metalness: 1, envMapIntensity: 2.2 });
  const vanityWood = std({ color: '#5a3a26', roughness: 0.6 });
  const vanityTop = std({ color: '#5b5f63', roughness: 0.35 });
  const leather = std({ color: '#0d0d0e', roughness: 0.42, metalness: 0.0 });
  const chairBlack = std({ color: '#111113', roughness: 0.25, metalness: 0.6 });
  const stations = [-1.7, -3.55, -5.4, -7.25];
  stations.forEach((z, i) => {
    const mw = 0.95, mh = 1.75, my = 1.52;
    const fx = IX0 + 0.04;
    iadd(mesh(box(0.04, mh, mw), mirrorMat, fx + 0.02, my, z, 'none'));
    // frame
    const fr = 0.11;
    iadd(mesh(box(0.06, fr, mw + fr * 2), white, fx + 0.04, my + mh / 2 + fr / 2, z));
    iadd(mesh(box(0.06, fr, mw + fr * 2), white, fx + 0.04, my - mh / 2 - fr / 2, z));
    iadd(mesh(box(0.06, mh, fr), white, fx + 0.04, my, z + mw / 2 + fr / 2));
    iadd(mesh(box(0.06, mh, fr), white, fx + 0.04, my, z - mw / 2 - fr / 2));
    // vanity between stations
    if (i < stations.length - 1) {
      const vz = (z + stations[i + 1]) / 2;
      iadd(mesh(rbox(0.5, 0.86, 0.68, 0.015), vanityWood, IX0 + 0.27, 0.45, vz));
      iadd(mesh(rbox(0.55, 0.04, 0.74, 0.01), vanityTop, IX0 + 0.29, 0.9, vz));
      // a few product bottles
      const cols = ['#e9e4da', '#1d3557', '#a33', '#222', '#c9a25e'];
      for (let b = 0; b < 4; b++) {
        const bh = 0.12 + (b % 3) * 0.05;
        iadd(mesh(cyl(0.028, 0.03, bh, 12), std({ color: cols[(b + i) % cols.length], roughness: 0.3 }), IX0 + 0.22 + (b % 2) * 0.12, 0.92 + bh / 2, vz - 0.18 + b * 0.11));
      }
    }
    // chair
    const chair = barberChair(leather, chairBlack, chrome);
    chair.position.set(IX0 + 1.25, 0, z);
    chair.rotation.y = -Math.PI / 2; // faces the mirror (-x)
    iadd(chair);
    // pendant dome light above the station
    const pend = new THREE.Group();
    pend.position.set(IX0 + 1.3, IH, z);
    pend.add(mesh(cyl(0.006, 0.006, 0.15, 6), black, 0, -0.075, 0, 'none'));
    const dome = mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#121212', roughness: 0.4, metalness: 0.4, side: THREE.DoubleSide }), 0, -0.3, 0, 'none');
    dome.scale.y = 0.55;
    pend.add(dome);
    pend.add(mesh(new THREE.CircleGeometry(0.17, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.5), toneMapped: false, side: THREE.DoubleSide }), 0, -0.3, 0, 'none'));
    iadd(pend);
  });

  // LED strips across the ceiling
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.3), toneMapped: false });
  for (let z = -1.2; z > -10; z -= 1.45) iadd(mesh(box(3.6, 0.03, 0.07), ledMat, 1.45, IH - 0.02, z, 'none'));

  // Reception counter, wood accent column, waiting chairs, back door
  iadd(mesh(box(0.55, 1.05, 1.6), white, 2.9, 0.525, -8.1));
  iadd(mesh(box(0.6, 0.04, 1.7), std({ color: '#7a5a40', roughness: 0.6 }), 2.88, 1.07, -8.1));
  const col = mesh(box(0.7, IH, 0.5), std({ map: rep(tx.wood, 0.35, 1), roughness: 0.78 }), 3.25, IH / 2, -9.3);
  iadd(col);
  for (let k = 0; k < 4; k++) {
    const wc = waitingChair(leather, chairBlack);
    wc.position.set(3.15, 0, -1.4 - k * 0.72);
    wc.rotation.y = -Math.PI / 2;
    iadd(wc);
  }
  // back door
  iadd(mesh(box(0.95, 2.1, 0.05), white, 2.35, 1.05, IZ1 + 0.03));
  iadd(mesh(new THREE.SphereGeometry(0.03, 10, 8), chrome, 2.0, 1.0, IZ1 + 0.08));
  // exit sign glow
  iadd(mesh(box(0.32, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.35, 0.3), toneMapped: false }), 2.35, 2.45, IZ1 + 0.04, 'none'));

  // Menu board on the back wall: black board, gold frame, real prices
  const menuGroup = new THREE.Group();
  menuGroup.position.set(-0.45, 1.62, IZ1 + 0.06);
  const MW = 2.7, MH = MW * (1400 / 2048);
  const boardMat = std({ map: tx.menu, emissiveMap: tx.menu, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.32, roughness: 0.6 });
  menuGroup.add(mesh(new THREE.PlaneGeometry(MW, MH), boardMat, 0, 0, 0.035, 'none'));
  const goldFrame = std({ color: '#c9a25e', roughness: 0.28, metalness: 1 });
  const fr = 0.06;
  menuGroup.add(mesh(box(MW + fr * 2, fr, 0.06), goldFrame, 0, MH / 2 + fr / 2, 0.02));
  menuGroup.add(mesh(box(MW + fr * 2, fr, 0.06), goldFrame, 0, -MH / 2 - fr / 2, 0.02));
  menuGroup.add(mesh(box(fr, MH, 0.06), goldFrame, MW / 2 + fr / 2, 0, 0.02));
  menuGroup.add(mesh(box(fr, MH, 0.06), goldFrame, -MW / 2 - fr / 2, 0, 0.02));
  // picture lights over the board
  for (const s of [-0.7, 0.7]) {
    menuGroup.add(mesh(cyl(0.012, 0.012, 0.22, 8), goldFrame, s, MH / 2 + 0.16, 0.12).rotateX(Math.PI / 2.6));
    menuGroup.add(mesh(cyl(0.035, 0.035, 0.32, 16), goldFrame, s, MH / 2 + 0.22, 0.24).rotateZ(Math.PI / 2));
  }
  iadd(menuGroup);
  const menuLight = new THREE.SpotLight('#ffe2b0', 9, 4, 0.75, 0.6, 1.5);
  menuLight.position.set(-0.45, 2.75, IZ1 + 1.1);
  menuLight.target.position.set(-0.45, 1.5, IZ1);
  iadd(menuLight);
  iadd(menuLight.target);

  /* ---------------- Person ---------------- */
  const person = buildPerson();
  add(person.root);

  return {
    root, interior, doorPivot, person, poleTex, neonMat, neonLight, signFace: null,
    windowGlass: glass, lampGlobe, menuGroup, ledMat,
    dims: { WIN, DOOR, SIGN, IZ1, hingeX },
    quality,
  };
}

/* ---------------- Furniture ---------------- */

function barberChair(leather: THREE.Material, frame: THREE.Material, chrome: THREE.Material) {
  // Built facing +z.
  const g = new THREE.Group();
  g.add(mesh(cyl(0.3, 0.33, 0.05, 32), frame, 0, 0.025, 0));
  g.add(mesh(cyl(0.07, 0.11, 0.36, 24), frame, 0, 0.23, 0));
  g.add(mesh(cyl(0.12, 0.12, 0.05, 24), chrome, 0, 0.42, 0));
  // seat
  g.add(mesh(rbox(0.56, 0.14, 0.56, 0.06, 4), leather, 0, 0.53, 0.02));
  g.add(mesh(rbox(0.6, 0.06, 0.6, 0.02), frame, 0, 0.45, 0.02));
  // backrest, tilted back, with tufting buttons
  const back = new THREE.Group();
  back.position.set(0, 0.6, -0.26);
  back.rotation.x = -0.18;
  back.add(mesh(rbox(0.54, 0.66, 0.12, 0.05, 4), leather, 0, 0.33, 0));
  const btn = new THREE.SphereGeometry(0.012, 8, 6);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) back.add(mesh(btn, frame, (c - 1) * 0.14, 0.16 + r * 0.17, 0.062, 'none'));
  // headrest
  back.add(mesh(cyl(0.012, 0.012, 0.14, 8), chrome, 0, 0.72, -0.02));
  back.add(mesh(rbox(0.3, 0.12, 0.09, 0.04, 3), leather, 0, 0.82, 0.0));
  g.add(back);
  // armrests
  for (const s of [-1, 1]) {
    g.add(mesh(rbox(0.08, 0.06, 0.5, 0.025), leather, s * 0.32, 0.78, 0.02));
    g.add(mesh(rbox(0.04, 0.26, 0.04, 0.01), frame, s * 0.32, 0.64, 0.2));
    g.add(mesh(rbox(0.04, 0.26, 0.04, 0.01), frame, s * 0.32, 0.64, -0.16));
  }
  // footrest
  g.add(mesh(cyl(0.012, 0.012, 0.36, 8), chrome, 0, 0.36, 0.38).rotateX(0.6));
  g.add(mesh(rbox(0.42, 0.03, 0.2, 0.01), frame, 0, 0.22, 0.5));
  return g;
}

function waitingChair(seat: THREE.Material, frame: THREE.Material) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.46, 0.07, 0.44, 0.02), seat, 0, 0.46, 0));
  g.add(mesh(rbox(0.46, 0.4, 0.05, 0.02), seat, 0, 0.72, -0.21).rotateX(-0.1));
  for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) g.add(mesh(cyl(0.012, 0.012, 0.44, 8), frame, x, 0.22, z));
  return g;
}

/* ---------------- Person (stylised, fresh cut, walking out) ---------------- */

export type Person = ReturnType<typeof buildPerson>;

export function buildPerson() {
  const skin = std({ color: '#8d5a3e', roughness: 0.55 });
  const hair = std({ color: '#0e0b09', roughness: 0.85 });
  const jacket = std({ color: '#1c1d20', roughness: 0.8 });
  const jeans = std({ color: '#26334a', roughness: 0.85 });
  const shoe = std({ color: '#ecebe7', roughness: 0.6 });
  const sole = std({ color: '#2a2a2a', roughness: 0.8 });
  const cap = (r: number, l: number, m: THREE.Material) => {
    const g = new THREE.CapsuleGeometry(r, l, 6, 14);
    const me = new THREE.Mesh(g, m);
    me.castShadow = true;
    return me;
  };

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);
  const pelvis = mesh(rbox(0.34, 0.2, 0.21, 0.07, 3), jeans, 0, 0, 0, 'cast');
  hips.add(pelvis);

  const leg = (side: number) => {
    const upper = new THREE.Group();
    upper.position.set(side * 0.095, -0.04, 0);
    const u = cap(0.072, 0.32, jeans);
    u.position.y = -0.21;
    upper.add(u);
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    upper.add(knee);
    const l = cap(0.058, 0.33, jeans);
    l.position.y = -0.2;
    knee.add(l);
    const foot = new THREE.Group();
    foot.position.y = -0.43;
    knee.add(foot);
    const s = mesh(rbox(0.11, 0.08, 0.27, 0.035, 3), shoe, 0, -0.02, 0.05, 'cast');
    foot.add(s);
    foot.add(mesh(rbox(0.115, 0.025, 0.28, 0.01, 2), sole, 0, -0.06, 0.05, 'cast'));
    hips.add(upper);
    return { upper, knee, foot };
  };
  const L = leg(1), R = leg(-1);

  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);
  const chest = mesh(rbox(0.42, 0.56, 0.25, 0.1, 4), jacket, 0, 0.27, 0, 'cast');
  torso.add(chest);
  torso.add(mesh(rbox(0.18, 0.06, 0.16, 0.03), jacket, 0, 0.56, 0, 'cast'));
  const neck = mesh(cyl(0.05, 0.055, 0.1, 14), skin, 0, 0.6, 0, 'cast');
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.74;
  torso.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.105, 24, 18), skin, 0, 0, 0, 'cast');
  skull.scale.set(0.92, 1.12, 1.0);
  head.add(skull);
  // fresh cut: short top, faded sides
  const top = mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, 0, 0.012, -0.005, 'cast');
  top.scale.set(0.95, 1.12, 1.03);
  head.add(top);
  const fade = mesh(new THREE.SphereGeometry(0.107, 24, 12, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.28), std({ color: '#2b211b', roughness: 0.9 }), 0, 0, -0.008, 'none');
  fade.scale.set(0.93, 1.12, 1.01);
  head.add(fade);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.022, 10, 8), skin, s * 0.097, -0.01, 0, 'none');
    ear.scale.set(0.5, 1, 0.8);
    head.add(ear);
  }

  const arm = (side: number) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.235, 0.5, 0);
    const u = cap(0.058, 0.22, jacket);
    u.position.y = -0.15;
    sh.add(u);
    const el = new THREE.Group();
    el.position.y = -0.3;
    sh.add(el);
    const f = cap(0.048, 0.2, jacket);
    f.position.y = -0.13;
    el.add(f);
    const hand = mesh(new THREE.SphereGeometry(0.047, 14, 10), skin, 0, -0.29, 0.01, 'cast');
    hand.scale.set(0.8, 1.15, 0.9);
    el.add(hand);
    torso.add(sh);
    return { sh, el };
  };
  const AL = arm(1), AR = arm(-1);

  /** phase: walk cycle angle; walk: 0..1 amount; reach: 0..1 right arm reaching forward (door). */
  function pose(phase: number, walk: number, reach: number) {
    const s = Math.sin(phase), c = Math.cos(phase);
    L.upper.rotation.x = -s * 0.5 * walk;
    R.upper.rotation.x = s * 0.5 * walk;
    L.knee.rotation.x = Math.max(0, -c) * 0.85 * walk + 0.05;
    R.knee.rotation.x = Math.max(0, c) * 0.85 * walk + 0.05;
    L.foot.rotation.x = -L.upper.rotation.x * 0.3 - L.knee.rotation.x * 0.4;
    R.foot.rotation.x = -R.upper.rotation.x * 0.3 - R.knee.rotation.x * 0.4;
    hips.position.y = 0.95 - 0.018 * walk + Math.abs(c) * 0.03 * walk;
    hips.rotation.y = s * 0.08 * walk;
    torso.rotation.y = -s * 0.14 * walk;
    torso.rotation.x = 0.04 * walk;
    AL.sh.rotation.x = s * 0.42 * walk;
    AL.sh.rotation.z = 0.08;
    AL.el.rotation.x = -0.25 - Math.max(0, -s) * 0.3 * walk;
    const swingR = -s * 0.42 * walk;
    AR.sh.rotation.x = swingR * (1 - reach) - 1.25 * reach;
    AR.sh.rotation.z = -0.08 + 0.1 * reach;
    AR.el.rotation.x = (-0.25 - Math.max(0, s) * 0.3 * walk) * (1 - reach) - 0.12 * reach;
    head.rotation.y = 0;
  }
  pose(0, 0, 0);
  return { root, pose, head, torso };
}
