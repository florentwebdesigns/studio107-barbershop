/**
 * The 3D block around Studio 107, 265 Mountain Ave, Springfield NJ.
 * Coordinates are meters. x runs along the facade (street on +z), y is up, the facade is z = 0.
 *
 * Layout follows the Street View imagery of the real block:
 * - one-storey brick strip of three shops under a dark shingled hip roof with a white fascia:
 *   a dog groomer (left), Studio 107 (center), a day spa with a brown sign panel (right).
 *   Neighbours are shown without names or logos.
 * - a gravel forecourt with concrete walkways to each door, a herringbone brick sidewalk,
 *   a fire hydrant at the curb, a black lamp post with a street tree at the left end,
 *   overhead utility wires, the shop's BARBER feather flag,
 * - a metal-sided building and parking lot on the left, a long hedge, a white two-storey
 *   house and a red Japanese maple on the right, tall pines and bare trees behind.
 * Studio 107 itself follows the storefront photo: black sign with gold script, white-framed
 * window with the neon "open", "265" transom, barber pole, mailbox, twin flood light; inside,
 * the reclaimed-wood wall, white mirrors, black chairs and a menu board with the real prices.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import * as T from './textures';
import { worldUV, type Assets, type TexSet } from './assets';

type Shadow = 'both' | 'cast' | 'receive' | 'none';
const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, shadow: Shadow = 'both') {
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

// Studio 107 openings (shared with the camera choreography in drone-hero.ts)
export const WIN = { x0: -2.5, x1: 1.0, y0: 0.42, y1: 2.55 };
export const DOOR = { x0: 1.18, x1: 2.38, top: 2.42, transom: 2.95 };
export const SIGN = { x0: -2.72, x1: 1.04, y0: 2.6, y1: 3.56 };
const BAND = 2.98; // top of brick, start of the stucco band
const FASCIA = 3.62;
const X0 = -10.2, X1 = 10.6, ZB = -12;
const WALL_T = 0.26;
export const IZ1 = -11; // back wall of the shop interior

export function buildWorld(scene: THREE.Scene, A: Assets, quality: 'high' | 'low') {
  T.resetSeed();
  const ctex = {
    sign: T.sign(),
    neon: T.neon(),
    transom: T.transom(),
    pole: T.poleStripes(),
    sky: T.sky(),
    ceiling: T.ceiling(),
    menu: T.menuBoard(),
    dogs: T.dogDecals(),
    spa: T.spaSign(),
    flag: T.featherFlag(),
    shopCool: T.shopInterior('#3a4048'),
    shopWarm: T.shopInterior('#6a4a34', true),
  };

  /* ---------- PBR materials from the baked sets ---------- */
  const pbr = (set: TexSet, o: Omit<THREE.MeshStandardMaterialParameters, 'normalScale'> & { normalScale?: number } = {}) => {
    const s = A.tex[set];
    const { normalScale = 1, ...rest } = o;
    return std({
      map: s.map, normalMap: s.normal, aoMap: s.orm, roughnessMap: s.orm, roughness: 1, metalness: 0,
      normalScale: new THREE.Vector2(normalScale, normalScale), aoMapIntensity: 1, ...rest,
    });
  };
  const M = {
    brick: pbr('brick', { normalScale: 1.2 }),
    shingles: pbr('shingles', { normalScale: 1.1, side: THREE.DoubleSide }),
    pavers: pbr('pavers', { normalScale: 1.2 }),
    gravel: pbr('gravel', { normalScale: 1.4 }),
    concrete: pbr('concrete', { color: '#e8e4dc' }),
    sidewalk: pbr('sidewalk'),
    asphalt: pbr('asphalt', { color: '#b8b8b8' }),
    siding: pbr('siding'),
    metalSiding: pbr('siding', { color: '#a9adb0', roughness: 0.8 }),
    stucco: pbr('stucco', { color: '#d6d2ca' }),
    wood: pbr('woodwall', { normalScale: 0.8 }),
    floor: pbr('floor', { normalScale: 0.5 }),
  };
  const white = std({ color: '#ecebe6', roughness: 0.42 });
  const alu = std({ color: '#d4d6d8', roughness: 0.3, metalness: 0.75 });
  const black = std({ color: '#0b0b0b', roughness: 0.45 });
  const blackMetal = std({ color: '#121314', roughness: 0.38, metalness: 0.6 });
  const chrome = std({ color: '#ffffff', roughness: 0.06, metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#cfe0e4', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 2.4,
    depthWrite: false, specularIntensity: 1, ior: 1.5,
  });

  const root = new THREE.Group();
  scene.add(root);
  const add = <O extends THREE.Object3D>(o: O) => (root.add(o), o);

  /** A box with continuous world-space texture mapping. */
  const wbox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, tile: number, shadow: Shadow = 'both', rot = 0) => {
    const off = new THREE.Vector3(x, y, z);
    return add(mesh(worldUV(box(w, h, d), tile, off, rot), mat, x, y, z, shadow));
  };
  /** A ground patch (thin box so edges read) with world-space mapping. */
  const ground = (x0: number, x1: number, z0: number, z1: number, y: number, mat: THREE.Material, tile: number, rot = 0, thick = 0.04) =>
    wbox(x1 - x0, thick, z1 - z0, mat, (x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2, tile, 'receive', rot);

  /* ================= Sky ================= */
  const skyMat = new THREE.MeshBasicMaterial({ map: ctex.sky, side: THREE.BackSide, fog: false, depthWrite: false });
  const skyDome = add(new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), skyMat));
  skyDome.position.y = -10;
  skyDome.renderOrder = -1;

  /* ================= Ground plan ================= */
  const SW0 = 6.2, SW1 = 8.6; // sidewalk z range
  ground(-70, 70, 8.82, 40, -0.13, M.asphalt, 4); // Mountain Ave
  // double yellow centre line
  for (const dz of [-0.08, 0.08]) add(mesh(box(140, 0.005, 0.1), std({ color: '#c9a227', roughness: 0.7 }), 0, -0.127, 19 + dz, 'receive'));
  wbox(140, 0.17, 0.22, M.concrete, 0, -0.045, 8.71, 1.5, 'both'); // granite-ish curb
  ground(-70, 70, SW0, SW1, 0.0, M.pavers, 0.8, Math.PI / 4); // herringbone at 45 degrees, like the real sidewalk
  // gravel forecourt in front of the strip, plus the strip of gravel continuing right toward the hedge
  ground(X0, 14, 0.9, SW0, 0.004, M.gravel, 1.0);
  // concrete apron along the facade and walkways to each door
  ground(X0, X1, 0, 0.9, 0.03, M.concrete, 2.0);
  const walks = [-4.48, 1.78, 9.22, 12.4];
  for (const wx of walks) ground(wx - 0.65, wx + 0.65, 0.9, SW0, 0.028, M.concrete, 2.0, 0.0);
  // black steel edging along each walkway
  for (const wx of walks) for (const s of [-1, 1]) add(mesh(box(0.012, 0.05, SW0 - 0.9), blackMetal, wx + s * 0.66, 0.02, (0.9 + SW0) / 2, 'receive'));
  add(mesh(box(X1 - X0 + 3.4, 0.05, 0.012), blackMetal, (X0 + 14) / 2, 0.02, 0.9, 'receive'));
  // left: parking lot of the metal-sided building
  ground(-40, X0, -14, SW0, 0.0, M.asphalt, 4, 0, 0.06);
  // right: lawn strip behind the hedge, toward the house
  ground(14, 40, -16, SW0, 0.0, std({ color: '#3c4630', roughness: 1 }), 2, 0, 0.05);
  ground(X1, 40, -16, 0.9, 0.001, std({ color: '#3a4430', roughness: 1 }), 2, 0, 0.05);
  // backdrop ground behind the strip (dark lawn)
  ground(-40, 40, -40, -14, 0.0, std({ color: '#262b20', roughness: 1 }), 2, 0, 0.05);
  ground(X0, X1, -14, ZB, 0.0, std({ color: '#2a2e23', roughness: 1 }), 2, 0, 0.05);

  /* ================= The strip building ================= */
  const brick = (x0: number, x1: number, y0: number, y1: number) => {
    if (x1 - x0 <= 0 || y1 - y0 <= 0) return;
    wbox(x1 - x0, y1 - y0, WALL_T, M.brick, (x0 + x1) / 2, (y0 + y1) / 2, -WALL_T / 2, 1.02);
  };
  // left unit: end pier, window, pier, door, pier
  brick(X0, -9.7, 0, BAND);
  brick(-9.7, -5.3, 0, 0.42);
  brick(-9.7, -5.3, 2.55, BAND);
  brick(-5.3, -5.0, 0, BAND);
  brick(-5.0, -3.95, 2.95, BAND);
  brick(-3.95, WIN.x0, 0, BAND);
  // Studio 107
  brick(WIN.x0, WIN.x1, 0, WIN.y0);
  brick(WIN.x0, WIN.x1, WIN.y1, BAND);
  brick(WIN.x1, DOOR.x0, 0, BAND);
  brick(DOOR.x0, DOOR.x1, DOOR.transom, BAND);
  brick(DOOR.x1, 3.6, 0, BAND);
  // right unit (spa): window, pier, door, end pier
  brick(3.6, 3.9, 0, BAND);
  brick(3.9, 8.4, 0, 0.42);
  brick(3.9, 8.4, 2.55, BAND);
  brick(8.4, 8.7, 0, BAND);
  brick(8.7, 9.75, 2.95, BAND);
  brick(9.75, X1, 0, BAND);
  // brick sills under the windows
  const sill = std({ color: '#8f7a6c', roughness: 0.8 });
  for (const [a, b] of [[-9.7, -5.3], [WIN.x0, WIN.x1], [3.9, 8.4]]) add(mesh(rbox(b - a + 0.08, 0.06, 0.3, 0.01), sill, (a + b) / 2, 0.43, 0.0));

  // stucco band, white soffit + fascia + gutter, downspouts
  wbox(X1 - X0, FASCIA - BAND, WALL_T, M.stucco, (X0 + X1) / 2, (BAND + FASCIA) / 2, -WALL_T / 2, 1.5);
  add(mesh(box(X1 - X0 + 0.9, 0.06, 0.95), white, (X0 + X1) / 2, FASCIA + 0.02, 0.3)); // soffit
  add(mesh(rbox(X1 - X0 + 0.9, 0.2, 0.05, 0.01), white, (X0 + X1) / 2, FASCIA + 0.08, 0.78)); // fascia
  add(mesh(rbox(X1 - X0 + 0.9, 0.12, 0.12, 0.03), white, (X0 + X1) / 2, FASCIA + 0.2, 0.84)); // gutter
  for (const dx of [X0 - 0.3, X1 + 0.3]) add(mesh(rbox(0.08, FASCIA + 0.2, 0.08, 0.02), white, dx, (FASCIA + 0.2) / 2, 0.84));
  // side and back walls in brick so nothing reads as a void
  wbox(WALL_T, BAND, -ZB, M.brick, X0, BAND / 2, ZB / 2, 1.02);
  wbox(WALL_T, BAND, -ZB, M.brick, X1, BAND / 2, ZB / 2, 1.02);
  wbox(WALL_T, FASCIA - BAND, -ZB, M.stucco, X0, (BAND + FASCIA) / 2, ZB / 2, 1.5);
  wbox(WALL_T, FASCIA - BAND, -ZB, M.stucco, X1, (BAND + FASCIA) / 2, ZB / 2, 1.5);
  wbox(X1 - X0, FASCIA, WALL_T, M.brick, (X0 + X1) / 2, FASCIA / 2, ZB, 1.02);
  // neighbour interiors are closed boxes so you never see through the strip
  const voidMat = std({ color: '#151313', roughness: 1 });
  add(mesh(box(WIN.x0 - 0.35 - X0, BAND, -1.2 - ZB), voidMat, (X0 + WIN.x0 - 0.35) / 2, BAND / 2, (ZB - 1.2) / 2, 'none'));
  add(mesh(box(X1 - 3.65, BAND, -1.2 - ZB), voidMat, (X1 + 3.65) / 2, BAND / 2, (ZB - 1.2) / 2, 'none'));

  // hip roof with ridge cap
  {
    const eY = FASCIA + 0.1, rY = eY + 2.0, ez0 = 0.85, ez1 = ZB - 0.6, ex0 = X0 - 0.45, ex1 = X1 + 0.45;
    const rz = (ez0 + ez1) / 2, rx0 = ex0 + (ez0 - rz) * 0.9, rx1 = ex1 - (ez0 - rz) * 0.9;
    const v = [
      ex0, eY, ez0, ex1, eY, ez0, rx1, rY, rz, ex0, eY, ez0, rx1, rY, rz, rx0, rY, rz,
      ex1, eY, ez1, ex0, eY, ez1, rx0, rY, rz, ex1, eY, ez1, rx0, rY, rz, rx1, rY, rz,
      ex0, eY, ez1, ex0, eY, ez0, rx0, rY, rz,
      ex1, eY, ez0, ex1, eY, ez1, rx1, rY, rz,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const gg = worldUV(g, 1.2);
    gg.computeVertexNormals();
    add(mesh(gg, M.shingles, 0, 0, 0, 'both'));
    // ridge and hip caps
    const capMat = std({ color: '#2a2b2d', roughness: 0.85 });
    const capLine = (a: THREE.Vector3, b: THREE.Vector3) => {
      const len = a.distanceTo(b);
      const m = mesh(box(0.22, 0.06, len), capMat, (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.02, (a.z + b.z) / 2, 'cast');
      m.lookAt(b.x, b.y + 0.02, b.z);
      add(m);
    };
    const R0 = new THREE.Vector3(rx0, rY, rz), R1 = new THREE.Vector3(rx1, rY, rz);
    capLine(R0, R1);
    capLine(new THREE.Vector3(ex0, eY, ez0), R0);
    capLine(new THREE.Vector3(ex1, eY, ez0), R1);
    capLine(new THREE.Vector3(ex0, eY, ez1), R0);
    capLine(new THREE.Vector3(ex1, eY, ez1), R1);
  }

  /* ================= Studio 107 storefront ================= */
  {
    const w = SIGN.x1 - SIGN.x0, h = SIGN.y1 - SIGN.y0;
    const face = std({
      map: ctex.sign.map, emissiveMap: ctex.sign.emissive, emissive: new THREE.Color('#ffd79a'), emissiveIntensity: 0.6,
      roughness: 0.28, metalness: 0.1,
    });
    add(mesh(rbox(w, h, 0.14, 0.015), black, (SIGN.x0 + SIGN.x1) / 2, (SIGN.y0 + SIGN.y1) / 2, 0.07));
    add(mesh(new THREE.PlaneGeometry(w - 0.02, h - 0.02), face, (SIGN.x0 + SIGN.x1) / 2, (SIGN.y0 + SIGN.y1) / 2, 0.142, 'none'));
    add(mesh(box(w + 0.03, 0.025, 0.16), alu, (SIGN.x0 + SIGN.x1) / 2, SIGN.y1 + 0.005, 0.07));
    add(mesh(box(w + 0.03, 0.025, 0.16), alu, (SIGN.x0 + SIGN.x1) / 2, SIGN.y0 - 0.005, 0.07));
  }

  const frameBar = (x: number, y: number, w: number, h: number, d = 0.12) => add(mesh(rbox(w, h, d, 0.008, 2), white, x, y, -0.06));
  const storefrontWindow = (x0: number, x1: number, y0: number, y1: number, mullions: number[]) => {
    const cx = (x0 + x1) / 2, w = x1 - x0, h = y1 - y0;
    frameBar(cx, y0 + 0.04, w, 0.08);
    frameBar(cx, y1 - 0.04, w, 0.08);
    frameBar(x0 + 0.04, (y0 + y1) / 2, 0.08, h);
    frameBar(x1 - 0.04, (y0 + y1) / 2, 0.08, h);
    for (const mx of mullions) frameBar(mx, (y0 + y1) / 2, 0.07, h);
    add(mesh(new THREE.PlaneGeometry(w, h), glass, cx, (y0 + y1) / 2, -0.04, 'none'));
  };
  const doorFrame = (x0: number, x1: number, top: number, transom: number) => {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    frameBar(x0 + 0.04, transom / 2, 0.08, transom);
    frameBar(x1 - 0.04, transom / 2, 0.08, transom);
    frameBar(cx, transom - 0.04, w, 0.08);
    frameBar(cx, top + 0.03, w, 0.07);
    add(mesh(new THREE.PlaneGeometry(w - 0.1, transom - top - 0.1), glass, cx, (top + transom) / 2, -0.05, 'none'));
    const num = new THREE.MeshBasicMaterial({ map: ctex.transom, transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.95, 0.95) });
    add(mesh(new THREE.PlaneGeometry(0.8, 0.4), num, cx, (top + transom) / 2, -0.035, 'none'));
  };
  storefrontWindow(WIN.x0, WIN.x1, WIN.y0, WIN.y1, [-0.75]);
  doorFrame(DOOR.x0, DOOR.x1, DOOR.top, DOOR.transom);

  // neon "open" inside the upper left of the window
  const neonMat = new THREE.MeshBasicMaterial({
    map: ctex.neon, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(2.4, 2.4, 2.4), blending: THREE.AdditiveBlending,
  });
  add(mesh(new THREE.PlaneGeometry(0.95, 0.48), neonMat, -1.65, 2.1, -0.16, 'none'));
  const neonLight = add(new THREE.PointLight('#ff3048', 2.2, 4.5, 2));
  neonLight.position.set(-1.65, 2.1, 0.3);

  // the door leaf, hinged on the right like the real door
  const hingeX = DOOR.x1 - 0.08;
  const doorPivot = add(new THREE.Group());
  doorPivot.position.set(hingeX, 0, -0.05);
  {
    const lw = hingeX - (DOOR.x0 + 0.08), lh = DOOR.top - 0.02;
    const g = new THREE.Group();
    g.position.x = -lw / 2;
    const fb = (x: number, y: number, w: number, h: number) => g.add(mesh(rbox(w, h, 0.06, 0.008, 2), alu, x, y, 0));
    fb(0, 0.12, lw, 0.24);
    fb(0, lh - 0.05, lw, 0.1);
    fb(-lw / 2 + 0.05, lh / 2, 0.1, lh);
    fb(lw / 2 - 0.05, lh / 2, 0.1, lh);
    g.add(mesh(new THREE.PlaneGeometry(lw - 0.2, lh - 0.36), glass, 0, lh / 2 + 0.07, 0, 'none'));
    for (const s of [1, -1]) {
      g.add(mesh(cyl(0.016, 0.016, 0.42, 16), chrome, -lw / 2 + 0.16, 1.05, s * 0.07));
      for (const yy of [0.86, 1.24]) g.add(mesh(cyl(0.01, 0.01, 0.07, 8), chrome, -lw / 2 + 0.16, yy, s * 0.04).rotateX(Math.PI / 2));
    }
    // closer arm at the top
    g.add(mesh(rbox(0.3, 0.06, 0.06, 0.01), alu, lw / 2 - 0.3, lh - 0.06, -0.08));
    doorPivot.add(g);
  }

  // twin flood light on the stucco above the door
  const floodBase = std({ color: '#b9b4ab', roughness: 0.55 });
  {
    const bx = (DOOR.x0 + DOOR.x1) / 2 - 0.25;
    add(mesh(cyl(0.07, 0.07, 0.05, 20), floodBase, bx, BAND + 0.38, 0.03).rotateX(Math.PI / 2));
    for (const s of [-1, 1]) {
      const head = mesh(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#b9b4ab', roughness: 0.55, side: THREE.DoubleSide }), bx + s * 0.14, BAND + 0.32, 0.13);
      head.rotation.x = Math.PI * 0.7;
      add(head);
    }
  }

  // barber pole on the brick right of the door
  const pole = add(new THREE.Group());
  pole.position.set(2.98, 1.95, 0.17);
  const poleTex = ctex.pole;
  poleTex.wrapS = poleTex.wrapT = THREE.RepeatWrapping;
  poleTex.repeat.set(1, 1.6);
  pole.add(mesh(cyl(0.085, 0.085, 0.72, 40), std({ map: poleTex, emissiveMap: poleTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.5, roughness: 0.3 }), 0, 0, 0, 'cast'));
  pole.add(mesh(cyl(0.1, 0.1, 0.72, 40), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.02, envMapIntensity: 2.5, depthWrite: false }), 0, 0, 0, 'none'));
  const capGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.115, 0), new THREE.Vector2(0.125, 0.03), new THREE.Vector2(0.11, 0.06),
    new THREE.Vector2(0.12, 0.1), new THREE.Vector2(0.1, 0.14), new THREE.Vector2(0.06, 0.16), new THREE.Vector2(0, 0.17),
  ], 40);
  pole.add(mesh(capGeo, chrome, 0, 0.36, 0, 'cast'));
  pole.add(mesh(capGeo, chrome, 0, -0.36, 0, 'cast').rotateX(Math.PI));
  pole.add(mesh(new THREE.SphereGeometry(0.13, 40, 24), std({ color: '#ffffff', emissive: new THREE.Color('#fff4e6'), emissiveIntensity: 1.8, roughness: 0.2 }), 0, 0.64, 0, 'none'));
  for (const yy of [0.2, -0.2]) pole.add(mesh(box(0.05, 0.05, 0.17), chrome, 0, yy, -0.09));
  const poleLight = add(new THREE.PointLight('#ffeedd', 1.2, 3, 2));
  poleLight.position.set(2.98, 2.65, 0.4);
  // mailbox "265" under the pole
  add(mesh(rbox(0.3, 0.42, 0.14, 0.02), std({ color: '#121212', roughness: 0.35, metalness: 0.35 }), 2.98, 0.98, 0.07));

  // window plants in white pots, as in the real window
  const potMat = std({ color: '#f0efec', roughness: 0.45 });
  const leafMat = std({ color: '#3f6b2f', roughness: 0.6, side: THREE.DoubleSide });
  const plant = (x: number, z: number, s: number, grass = false) => {
    const g = new THREE.Group();
    g.position.set(x, 0.46, z);
    g.add(mesh(cyl(0.13 * s, 0.1 * s, 0.26 * s, 24), potMat, 0, 0.13 * s, 0));
    const n = grass ? 34 : 14;
    for (let i = 0; i < n; i++) {
      const leaf = mesh(new THREE.SphereGeometry(0.05, 10, 6), grass ? std({ color: '#6f8f4a', roughness: 0.7 }) : leafMat, 0, 0.3 * s, 0, 'cast');
      leaf.scale.set((grass ? 0.12 : 0.5) * s, (grass ? 7 : 3.4) * s, 0.12 * s);
      const a = (i / n) * Math.PI * 2 + i;
      const tilt = grass ? 0.25 : 0.6;
      leaf.rotation.set(Math.sin(a) * tilt, a, Math.cos(a) * tilt);
      leaf.position.set(Math.sin(a) * 0.05, (grass ? 0.55 : 0.38) * s, Math.cos(a) * 0.05);
      g.add(leaf);
    }
    add(g);
  };
  plant(-1.4, -0.45, 1.1);
  plant(0.1, -0.5, 1.0, true);
  plant(-2.2, -0.4, 0.75);

  /* ================= Neighbours (no names or logos) ================= */
  const fakeInterior = (x0: number, x1: number, tex: THREE.Texture, depth = 1.0) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.5, 1.5, 1.5) });
    add(mesh(new THREE.PlaneGeometry(x1 - x0, 2.6), m, (x0 + x1) / 2, 1.3, -depth, 'none'));
  };
  // left: dog groomer
  storefrontWindow(-9.7, -5.3, 0.42, 2.55, [-7.5]);
  doorFrame(-5.0, -3.95, 2.42, 2.95);
  add(mesh(new THREE.PlaneGeometry(4.2, 2.0), new THREE.MeshStandardMaterial({ map: ctex.dogs, transparent: true, roughness: 0.6, alphaTest: 0.05 }), -7.5, 1.5, -0.05, 'none'));
  fakeInterior(-9.7, -3.95, ctex.shopCool, 1.1);
  add(mesh(new THREE.PlaneGeometry(0.9, 2.3), glass, -4.48, 1.2, -0.05, 'none'));
  // right: day spa with brown sign panel and two gooseneck lights
  storefrontWindow(3.9, 8.4, 0.42, 2.55, [6.15]);
  doorFrame(8.7, 9.75, 2.42, 2.95);
  fakeInterior(3.9, 9.75, ctex.shopWarm, 1.1);
  add(mesh(new THREE.PlaneGeometry(0.9, 2.3), glass, 9.22, 1.2, -0.05, 'none'));
  add(mesh(rbox(4.9, 0.62, 0.12, 0.02), std({ map: ctex.spa, roughness: 0.75 }), 6.15, 2.95, 0.07));
  const goose: THREE.Vector3[] = [];
  for (const gx of [4.9, 7.4]) {
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(gx, 3.45, 0.02), new THREE.Vector3(gx, 3.62, 0.25), new THREE.Vector3(gx, 3.55, 0.45)]);
    add(mesh(new THREE.TubeGeometry(arm, 12, 0.012, 8), blackMetal, 0, 0, 0, 'cast'));
    add(mesh(new THREE.ConeGeometry(0.09, 0.12, 20, 1, true), std({ color: '#151515', roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }), gx, 3.5, 0.48, 'cast'));
    goose.push(new THREE.Vector3(gx, 3.45, 0.5));
  }

  /* ================= Left: metal-sided building + parking ================= */
  {
    const bx0 = -26, bx1 = -11.4, bz0 = -15, bz1 = -2.5, bh = 4.4;
    wbox(bx1 - bx0, bh, bz1 - bz0, M.metalSiding, (bx0 + bx1) / 2, bh / 2, (bz0 + bz1) / 2, 1.2, 'both', Math.PI / 2);
    add(mesh(box(bx1 - bx0 + 0.3, 0.25, bz1 - bz0 + 0.3), white, (bx0 + bx1) / 2, bh + 0.12, (bz0 + bz1) / 2));
    // roll-up door + small sign board (blank)
    add(mesh(box(3.2, 3.0, 0.05), std({ color: '#c8cacb', roughness: 0.6, metalness: 0.3 }), -14.5, 1.5, bz1 + 0.03));
    add(mesh(box(1.6, 0.9, 0.06), std({ color: '#1d3f8a', roughness: 0.6 }), -18, 3.2, bz1 + 0.04));
    // white fence along the lot
    for (let fx = -16; fx <= -10.8; fx += 0.12) add(mesh(box(0.08, 1.15, 0.03), white, fx, 0.6, 4.2, 'cast'));
    add(mesh(box(5.4, 0.08, 0.05), white, -13.4, 1.0, 4.2));
    // parking bay lines
    for (let px = -24; px < -11; px += 2.7) add(mesh(box(0.1, 0.004, 4.8), std({ color: '#d8d6cf', roughness: 0.8 }), px, 0.004, 1.0, 'receive'));
  }

  /* ================= Right: hedge and white house ================= */
  const hedgeMat = std({ color: '#2b3a22', roughness: 1 });
  {
    // a long clipped hedge with a lumpy top, from the strip's right corner along the lot line
    const hg = new RoundedBoxGeometry(18, 1.6, 1.4, 4, 0.5);
    const p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 2.3) * 0.06 + Math.sin(x * 5.1 + z * 3) * 0.04 + Math.sin(z * 4.2 + y) * 0.03;
      p.setXYZ(i, x, y + (y > 0 ? n : 0), z + (Math.abs(z) > 0.5 ? n : 0));
    }
    hg.computeVertexNormals();
    add(mesh(hg, hedgeMat, 22.5, 0.8, 0.6));
    // white two-storey house, gable end to the street
    const hx0 = 15.5, hx1 = 23.5, hz0 = -14, hz1 = -4, wallH = 5.6;
    wbox(hx1 - hx0, wallH, hz1 - hz0, M.siding, (hx0 + hx1) / 2, wallH / 2, (hz0 + hz1) / 2, 1.2);
    const gable = new THREE.Shape();
    gable.moveTo(-(hx1 - hx0) / 2 - 0.4, 0);
    gable.lineTo((hx1 - hx0) / 2 + 0.4, 0);
    gable.lineTo(0, 3.0);
    gable.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gable, { depth: hz1 - hz0 + 0.8, bevelEnabled: false });
    add(mesh(worldUV(gGeo, 1.2, new THREE.Vector3((hx0 + hx1) / 2, wallH, hz0 - 0.4)), M.siding, (hx0 + hx1) / 2, wallH, hz0 - 0.4));
    // roof planes
    const rl = Math.hypot((hx1 - hx0) / 2 + 0.5, 3.0) + 0.2;
    const ang = Math.atan2(3.0, (hx1 - hx0) / 2 + 0.5);
    for (const s of [-1, 1]) {
      const r = mesh(worldUV(box(rl, 0.12, hz1 - hz0 + 1.2), 1.2), M.shingles, (hx0 + hx1) / 2 + s * (rl / 2) * Math.cos(ang) - s * 0.05, wallH + 1.5 + 0.08, (hz0 + hz1) / 2);
      r.rotation.z = -s * ang;
      add(r);
    }
    // windows with warm light in a couple of them
    const winLit = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.1) });
    const winDark = std({ color: '#1b2026', roughness: 0.1, metalness: 0.4 });
    const hwin = (x: number, y: number, lit: boolean) => {
      add(mesh(box(1.0, 1.35, 0.06), white, x, y, hz1 + 0.04));
      add(mesh(new THREE.PlaneGeometry(0.84, 1.18), lit ? winLit : winDark, x, y, hz1 + 0.08, 'none'));
      add(mesh(box(0.84, 0.04, 0.02), white, x, y, hz1 + 0.09));
    };
    hwin(17.5, 1.7, true);
    hwin(21.5, 1.7, false);
    hwin(17.5, 4.3, false);
    hwin(21.5, 4.3, true);
    hwin(19.5, 6.6, false);
    // small porch roof on the left side
    add(mesh(worldUV(box(3.2, 0.1, 3.0), 1.2), M.shingles, 14.2, 2.9, -6.5).rotateZ(0.25));
    for (const px of [12.9, 15.4]) add(mesh(cyl(0.06, 0.06, 2.8, 12), white, px, 1.4, -5.2));
  }

  /* ================= Trees and shrubs (ez-tree, baked) ================= */
  const treeLib: Record<string, THREE.Object3D> = {};
  A.trees.traverse((c) => { if (c.parent === A.trees || (c.parent && c.parent.parent === A.trees && !treeLib[c.name] && !(c as THREE.Mesh).isMesh)) treeLib[c.name] = c; });
  const leafMats: THREE.MeshStandardMaterial[] = [];
  A.trees.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m) return;
    if (m.alphaTest > 0) {
      m.side = THREE.DoubleSide;
      if (!leafMats.includes(m)) leafMats.push(m);
    }
    m.roughness = 0.9;
  });
  const placeTree = (name: string, x: number, z: number, scale = 1, ry = 0, shadow = true) => {
    const src = treeLib[name];
    if (!src) return;
    const t = src.clone(true);
    t.position.set(x, 0, z);
    t.scale.setScalar(scale);
    t.rotation.y = ry;
    t.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = shadow;
        o.receiveShadow = true;
      }
    });
    add(t);
    return t;
  };
  // tall pines behind the centre-right of the strip
  placeTree('pineA', 2.5, -16, 1.0, 0.3);
  placeTree('pineB', 6.0, -18.5, 1.05, 1.9);
  placeTree('pineC', -0.5, -19.5, 1.2, 0.9, quality === 'high');
  placeTree('pineB', 9.5, -15.5, 0.85, 2.6, quality === 'high');
  // big bare deciduous trees behind the left
  placeTree('oakBareA', -8.5, -18, 1.0, 0.4);
  placeTree('oakBareB', -14, -14, 1.1, 2.2, quality === 'high');
  placeTree('oakBareA', -3.5, -24, 1.15, 4.1, false);
  // street tree behind the lamp at the left end of the sidewalk
  placeTree('streetTree', -11.3, 5.6, 1.0, 0.8);
  // right: bare tree and red Japanese maple in front of the house, more pines behind it
  placeTree('ashBare', 16.2, -2.2, 0.9, 1.1);
  placeTree('maple', 19.8, -1.6, 1.0, 0.2);
  placeTree('pineA', 26, -20, 1.0, 1.2, false);
  placeTree('oakBareB', 28, -10, 1.0, 0.7, false);
  // shrubs at the strip corners, like the burgundy bush on the left corner
  placeTree('bushRed', -10.6, 1.4, 1.0, 0.2);
  placeTree('bushGreen', -10.9, 3.3, 1.0, 1.5);
  placeTree('bushDark', 11.4, 0.6, 1.2, 0.8);
  placeTree('bushGreen', -8.9, 0.75, 0.6, 2.4);

  // wind sway for leaves (vertex shader tweak)
  const wind = { value: 0 };
  for (const m of leafMats) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = wind;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wp = modelMatrix * vec4(position, 1.0);
         float sway = sin(uWind * 1.3 + wp.x * 0.35 + wp.z * 0.2) * 0.04 + sin(uWind * 3.1 + wp.y * 1.7) * 0.015;
         transformed.x += sway * position.y * 0.06;
         transformed.z += sway * position.y * 0.04;`,
      );
    };
  }

  /* ================= Street furniture ================= */
  // black ornamental lamp post with a globe lantern (left end of the sidewalk)
  const lampMat = std({ color: '#0c0c0d', roughness: 0.35, metalness: 0.55 });
  const lamp = add(new THREE.Group());
  lamp.position.set(-11.9, 0, 6.55);
  lamp.add(mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0.24, 0.12), new THREE.Vector2(0.17, 0.2),
    new THREE.Vector2(0.15, 0.55), new THREE.Vector2(0.12, 0.62), new THREE.Vector2(0.075, 0.7), new THREE.Vector2(0.06, 0.72), new THREE.Vector2(0, 0.72),
  ], 32), lampMat, 0, 0, 0));
  lamp.add(mesh(cyl(0.055, 0.07, 3.2, 20), lampMat, 0, 2.3, 0));
  lamp.add(mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.14, 0.12), new THREE.Vector2(0.12, 0.2), new THREE.Vector2(0, 0.2),
  ], 24), lampMat, 0, 3.88, 0));
  const lampGlobe = mesh(new THREE.SphereGeometry(0.27, 40, 24), std({ color: '#fff', emissive: new THREE.Color('#ffd9a8'), emissiveIntensity: 3.2, roughness: 0.35 }), 0, 4.33, 0, 'none');
  lamp.add(lampGlobe);
  lamp.add(mesh(new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.18), new THREE.Vector2(0.1, 0.12), new THREE.Vector2(0.06, 0.0), new THREE.Vector2(0, 0)], 20), lampMat, 0, 4.56, 0));

  // fire hydrant (red body, white bonnet) at the curb in front of the shop
  {
    const h = add(new THREE.Group());
    h.position.set(0.25, 0, 8.05);
    const red = new THREE.MeshPhysicalMaterial({ color: '#b3231c', roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.4 });
    const cap = new THREE.MeshPhysicalMaterial({ color: '#efe9dc', roughness: 0.4, clearcoat: 0.5 });
    const prof = [
      [0, 0], [0.16, 0], [0.16, 0.05], [0.13, 0.08], [0.12, 0.12], [0.115, 0.5], [0.14, 0.53], [0.14, 0.58], [0.12, 0.6], [0, 0.6],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    h.add(mesh(new THREE.LatheGeometry(prof, 32), red, 0, 0, 0));
    h.add(mesh(new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 0.6, 0));
    h.add(mesh(cyl(0.025, 0.035, 0.06, 6), cap, 0, 0.74, 0));
    for (const s of [-1, 1]) h.add(mesh(cyl(0.045, 0.05, 0.12, 20), red, s * 0.16, 0.38, 0).rotateZ(Math.PI / 2));
    h.add(mesh(cyl(0.065, 0.07, 0.12, 24), red, 0, 0.36, 0.14).rotateX(Math.PI / 2));
    for (const s of [-1, 1]) h.add(mesh(cyl(0.03, 0.03, 0.03, 6), cap, s * 0.235, 0.38, 0).rotateZ(Math.PI / 2));
  }

  // the shop's BARBER feather flag in the gravel, with cloth wave
  const flagTime = { value: 0 };
  {
    const f = add(new THREE.Group());
    f.position.set(-2.0, 0, 3.4);
    f.rotation.y = 0.25;
    const fg = new THREE.PlaneGeometry(0.62, 2.5, 8, 32);
    fg.translate(0.31, 1.25 + 0.55, 0);
    const fm = new THREE.MeshStandardMaterial({ map: ctex.flag, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 });
    fm.onBeforeCompile = (sh) => {
      sh.uniforms.uT = flagTime;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float k = position.x / 0.62;
         float w = sin(uT * 2.4 + position.y * 2.2 - k * 3.0) * 0.07 + sin(uT * 4.1 + position.y * 4.0) * 0.02;
         transformed.z += w * k;
         transformed.x -= abs(w) * k * 0.3;`,
      ).replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
         float kk = position.x / 0.62;
         objectNormal = normalize(objectNormal + vec3(-cos(uT * 2.4 + position.y * 2.2 - kk * 3.0) * 0.25 * kk, 0.0, 0.0));`);
    };
    const flag = mesh(fg, fm, 0, 0, 0, 'cast');
    flag.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: ctex.flag, alphaTest: 0.5 });
    f.add(flag);
    f.add(mesh(cyl(0.012, 0.016, 3.1, 10), std({ color: '#aaa', metalness: 0.8, roughness: 0.3 }), 0, 1.55, 0));
    f.add(mesh(new THREE.TorusGeometry(0.31, 0.008, 6, 24, Math.PI * 0.6), std({ color: '#aaa', metalness: 0.8, roughness: 0.3 }), 0.31, 2.95, 0).rotateZ(0.3));
  }

  // utility poles and sagging wires overhead (they cross the real view)
  {
    const woodPole = std({ color: '#4a3a2c', roughness: 0.95 });
    const wireMat = new THREE.MeshBasicMaterial({ color: '#08090a' });
    const polesX = [-48, -18.5, 17.5, 46];
    const pz = 8.35;
    for (const x of polesX) {
      add(mesh(cyl(0.13, 0.17, 10.5, 14), woodPole, x, 5.25, pz));
      add(mesh(box(2.2, 0.12, 0.12), woodPole, x, 9.3, pz));
      add(mesh(box(1.4, 0.1, 0.1), woodPole, x, 8.1, pz));
      add(mesh(cyl(0.22, 0.22, 0.7, 14), std({ color: '#5d6266', roughness: 0.6, metalness: 0.4 }), x + 0.35, 7.4, pz - 0.2, 'cast'));
    }
    const wires: [number, number][] = [[-1.0, 9.38], [-0.35, 9.38], [0.35, 9.38], [1.0, 9.38], [-0.6, 8.18], [0.6, 8.18], [0, 6.9]];
    for (let i = 0; i < polesX.length - 1; i++) {
      for (const [dz, wy] of wires) {
        const a = new THREE.Vector3(polesX[i], wy, pz + dz), b = new THREE.Vector3(polesX[i + 1], wy, pz + dz);
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const p = a.clone().lerp(b, t);
          p.y -= Math.sin(t * Math.PI) * 0.9;
          pts.push(p);
        }
        add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 5), wireMat, 0, 0, 0, 'none'));
      }
    }
    // service drop crossing to the strip roof
    const drop = new THREE.CatmullRomCurve3([new THREE.Vector3(17.5, 8.1, pz), new THREE.Vector3(14, 6.6, 4.5), new THREE.Vector3(X1 - 0.5, FASCIA + 0.9, -2)]);
    add(mesh(new THREE.TubeGeometry(drop, 32, 0.012, 5), wireMat, 0, 0, 0, 'none'));
  }

  // fallen leaves scattered on the sidewalk and curb, as in the November Street View
  {
    const leafTex = (leafMats[0]?.map as THREE.Texture | null) ?? null;
    const lm = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, color: '#a8643a' });
    const count = quality === 'high' ? 900 : 450;
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.11), lm, count);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const tones = ['#b07040', '#8c4a26', '#c08a48', '#7a3a20', '#a85a2e', '#6f4a2a'];
    for (let i = 0; i < count; i++) {
      const edge = Math.random() < 0.55;
      const x = (Math.random() - 0.5) * 60;
      const z = edge ? 8.3 + Math.random() * 0.9 : SW0 + Math.random() * (SW1 - SW0);
      o.position.set(x, (z > 8.6 ? -0.11 : 0.008) + Math.random() * 0.004, z);
      o.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.4, 0, Math.random() * Math.PI * 2);
      const s = 0.7 + Math.random() * 0.7;
      o.scale.set(s, s, s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, col.set(tones[i % tones.length]));
    }
    im.receiveShadow = true;
    add(im);
  }

  /* ================= Interior ================= */
  const IX0 = -2.7, IX1 = 3.45, IH = 2.9;
  const interior = add(new THREE.Group());
  const iadd = <O extends THREE.Object3D>(o: O) => (interior.add(o), o);
  const iw = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, tile: number, sh: Shadow = 'receive') =>
    iadd(mesh(worldUV(box(w, h, d), tile, new THREE.Vector3(x, y, z)), mat, x, y, z, sh));

  iw(IX1 - IX0, 0.02, -IZ1, M.floor, (IX0 + IX1) / 2, -0.005, IZ1 / 2, 2.4);
  const ceilTex = ctex.ceiling;
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set((IX1 - IX0) / 0.6, -IZ1 / 0.6);
  const ce = iadd(mesh(new THREE.PlaneGeometry(IX1 - IX0, -IZ1), std({ map: ceilTex, roughness: 0.95 }), (IX0 + IX1) / 2, IH, IZ1 / 2, 'none'));
  ce.rotation.x = Math.PI / 2;
  const grey = pbr('stucco', { color: '#a3a5a4', normalScale: 0.6 });
  iw(0.04, IH, -IZ1 - WALL_T, M.wood, IX0, IH / 2, (IZ1 - WALL_T) / 2, 2.4);
  iw(0.04, IH, -IZ1, grey, IX1, IH / 2, IZ1 / 2, 1.5);
  iw(IX1 - IX0, IH, 0.04, pbr('stucco', { color: '#8f9190', normalScale: 0.6 }), (IX0 + IX1) / 2, IH / 2, IZ1, 1.5);
  // inner face of the front wall above the window (so the interior is closed when looking back)
  iw(IX1 - IX0, IH - BAND + 0.1, 0.04, grey, (IX0 + IX1) / 2, (IH + BAND) / 2 - 0.05, -WALL_T - 0.02, 2, 'none');
  iadd(mesh(box(0.03, 0.1, -IZ1), white, IX0 + 0.03, 0.05, IZ1 / 2));
  iadd(mesh(box(0.04, 0.08, -IZ1), white, IX0 + 0.04, IH - 0.05, IZ1 / 2));

  const mirrorMat = std({ color: '#c4ccce', roughness: 0.02, metalness: 1, envMapIntensity: 1.0 });
  const vanityWood = std({ color: '#5a3a26', roughness: 0.5 });
  const vanityTop = std({ color: '#5b5f63', roughness: 0.25, metalness: 0.1 });
  const leather = new THREE.MeshPhysicalMaterial({ color: '#0f0f10', roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new THREE.Color('#444') });
  const chairBlack = std({ color: '#141416', roughness: 0.22, metalness: 0.7 });
  const stations = [-1.7, -3.55, -5.4, -7.25];
  const mirrors: THREE.Mesh[] = [];
  // The four mirrors are coplanar, so one planar reflection render feeds all of them.
  const rs = quality === 'high' ? 1024 : 512;
  const mirrorGeo = new THREE.PlaneGeometry(0.95, 1.75);
  const reflector = new Reflector(mirrorGeo, { textureWidth: rs, textureHeight: Math.round(rs * 1.4), color: 0x8a9294, clipBias: 0.003 });
  reflector.frustumCulled = false;
  reflector.userData.noAO = true;
  const reflectors: THREE.Mesh[] = [];
  stations.forEach((z, i) => {
    const mw = 0.95, mh = 1.75, my = 1.52, fx = IX0 + 0.04;
    mirrors.push(iadd(mesh(box(0.03, mh, mw), mirrorMat, fx + 0.02, my, z, 'none')));
    const r = i === 0 ? reflector : new THREE.Mesh(mirrorGeo, reflector.material);
    r.position.set(fx + 0.04, my, z);
    r.rotation.y = Math.PI / 2;
    r.userData.noAO = true;
    reflectors.push(iadd(r));
    const fr = 0.11;
    iadd(mesh(rbox(0.06, fr, mw + fr * 2, 0.012), white, fx + 0.04, my + mh / 2 + fr / 2, z));
    iadd(mesh(rbox(0.06, fr, mw + fr * 2, 0.012), white, fx + 0.04, my - mh / 2 - fr / 2, z));
    iadd(mesh(rbox(0.06, mh, fr, 0.012), white, fx + 0.04, my, z + mw / 2 + fr / 2));
    iadd(mesh(rbox(0.06, mh, fr, 0.012), white, fx + 0.04, my, z - mw / 2 - fr / 2));
    if (i < stations.length - 1) {
      const vz = (z + stations[i + 1]) / 2;
      iadd(mesh(rbox(0.5, 0.86, 0.68, 0.02), vanityWood, IX0 + 0.27, 0.45, vz));
      iadd(mesh(rbox(0.55, 0.04, 0.74, 0.01), vanityTop, IX0 + 0.29, 0.9, vz));
      const cols = ['#e9e4da', '#1d3557', '#a33', '#222', '#c9a25e'];
      for (let b = 0; b < 4; b++) {
        const bh = 0.12 + (b % 3) * 0.05;
        iadd(mesh(cyl(0.028, 0.03, bh, 16), std({ color: cols[(b + i) % cols.length], roughness: 0.25 }), IX0 + 0.22 + (b % 2) * 0.12, 0.92 + bh / 2, vz - 0.18 + b * 0.11));
      }
    }
    const chair = barberChair(leather, chairBlack, chrome);
    chair.position.set(IX0 + 1.25, 0, z);
    chair.rotation.y = -Math.PI / 2;
    iadd(chair);
    const pend = iadd(new THREE.Group());
    pend.position.set(IX0 + 1.3, IH, z);
    pend.add(mesh(cyl(0.006, 0.006, 0.15, 6), black, 0, -0.075, 0, 'none'));
    const dome = mesh(new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#121212', roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }), 0, -0.3, 0, 'none');
    dome.scale.y = 0.55;
    pend.add(dome);
    pend.add(mesh(new THREE.CircleGeometry(0.17, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.5), toneMapped: false, side: THREE.DoubleSide }), 0, -0.3, 0, 'none'));
  });

  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.3), toneMapped: false });
  for (let z = -1.2; z > -10; z -= 1.45) iadd(mesh(box(3.6, 0.03, 0.07), ledMat, 1.35, IH - 0.02, z, 'none'));

  iadd(mesh(rbox(0.55, 1.05, 1.6, 0.02), white, 2.85, 0.525, -8.1));
  iadd(mesh(rbox(0.6, 0.04, 1.7, 0.01), std({ color: '#7a5a40', roughness: 0.5 }), 2.83, 1.07, -8.1));
  iw(0.7, IH, 0.5, M.wood, 3.1, IH / 2, -9.3, 2.4, 'both');
  for (let k = 0; k < 4; k++) {
    const wc = waitingChair(leather, chairBlack);
    wc.position.set(3.05, 0, -1.4 - k * 0.72);
    wc.rotation.y = -Math.PI / 2;
    iadd(wc);
  }
  iadd(mesh(rbox(0.95, 2.1, 0.05, 0.01), white, 2.3, 1.05, IZ1 + 0.04));
  iadd(mesh(new THREE.SphereGeometry(0.03, 12, 8), chrome, 1.95, 1.0, IZ1 + 0.09));
  iadd(mesh(rbox(0.32, 0.14, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.35, 0.3), toneMapped: false }), 2.3, 2.45, IZ1 + 0.05, 'none'));

  // menu board on the back wall: real prices from src/data/services.ts
  const menuGroup = iadd(new THREE.Group());
  menuGroup.position.set(-0.45, 1.62, IZ1 + 0.06);
  const MW = 2.7, MH = MW * (1400 / 2048);
  menuGroup.add(mesh(new THREE.PlaneGeometry(MW, MH), std({ map: ctex.menu, emissiveMap: ctex.menu, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3, roughness: 0.55 }), 0, 0, 0.035, 'none'));
  const goldFrame = std({ color: '#c9a25e', roughness: 0.25, metalness: 1 });
  const fr = 0.06;
  menuGroup.add(mesh(rbox(MW + fr * 2, fr, 0.06, 0.01), goldFrame, 0, MH / 2 + fr / 2, 0.02));
  menuGroup.add(mesh(rbox(MW + fr * 2, fr, 0.06, 0.01), goldFrame, 0, -MH / 2 - fr / 2, 0.02));
  menuGroup.add(mesh(rbox(fr, MH, 0.06, 0.01), goldFrame, MW / 2 + fr / 2, 0, 0.02));
  menuGroup.add(mesh(rbox(fr, MH, 0.06, 0.01), goldFrame, -MW / 2 - fr / 2, 0, 0.02));
  for (const s of [-0.7, 0.7]) {
    menuGroup.add(mesh(cyl(0.012, 0.012, 0.22, 8), goldFrame, s, MH / 2 + 0.16, 0.12).rotateX(Math.PI / 2.6));
    menuGroup.add(mesh(cyl(0.035, 0.035, 0.32, 20), goldFrame, s, MH / 2 + 0.22, 0.24).rotateZ(Math.PI / 2));
  }
  const menuLight = iadd(new THREE.SpotLight('#ffe2b0', 9, 4, 0.75, 0.6, 1.5));
  menuLight.position.set(-0.45, 2.75, IZ1 + 1.1);
  menuLight.target.position.set(-0.45, 1.5, IZ1);
  iadd(menuLight.target);

  return {
    root, interior, doorPivot, poleTex, neonMat, neonLight, lampGlobe, menuGroup, ledMat, mirrors, reflectors, skyDome,
    wind, flagTime, goose, lampPos: new THREE.Vector3(-11.9, 4.33, 6.55),
    dims: { WIN, DOOR, SIGN, IZ1, hingeX, IX0, IX1, IH },
    quality,
  };
}

/* ---------------- Furniture ---------------- */

function barberChair(leather: THREE.Material, frame: THREE.Material, chrome: THREE.Material) {
  // Built facing +z.
  const g = new THREE.Group();
  g.add(mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.33, 0), new THREE.Vector2(0.33, 0.02), new THREE.Vector2(0.28, 0.05),
    new THREE.Vector2(0.1, 0.07), new THREE.Vector2(0.075, 0.12), new THREE.Vector2(0.07, 0.4), new THREE.Vector2(0.12, 0.42), new THREE.Vector2(0, 0.43),
  ], 40), frame, 0, 0, 0));
  g.add(mesh(cyl(0.12, 0.12, 0.04, 32), chrome, 0, 0.43, 0));
  g.add(mesh(rbox(0.56, 0.15, 0.56, 0.065, 5), leather, 0, 0.535, 0.02));
  g.add(mesh(rbox(0.6, 0.06, 0.6, 0.025, 3), frame, 0, 0.45, 0.02));
  const back = new THREE.Group();
  back.position.set(0, 0.6, -0.26);
  back.rotation.x = -0.18;
  back.add(mesh(rbox(0.54, 0.68, 0.13, 0.06, 5), leather, 0, 0.34, 0));
  const btn = new THREE.SphereGeometry(0.012, 10, 8);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) back.add(mesh(btn, frame, (c - 1) * 0.14, 0.16 + r * 0.17, 0.066, 'none'));
  back.add(mesh(cyl(0.012, 0.012, 0.14, 10), chrome, 0, 0.74, -0.02));
  back.add(mesh(rbox(0.3, 0.12, 0.09, 0.045, 4), leather, 0, 0.84, 0.0));
  g.add(back);
  for (const s of [-1, 1]) {
    g.add(mesh(rbox(0.085, 0.065, 0.5, 0.03, 3), leather, s * 0.32, 0.78, 0.02));
    g.add(mesh(rbox(0.04, 0.26, 0.04, 0.012), frame, s * 0.32, 0.64, 0.2));
    g.add(mesh(rbox(0.04, 0.26, 0.04, 0.012), frame, s * 0.32, 0.64, -0.16));
  }
  g.add(mesh(cyl(0.012, 0.012, 0.36, 10), chrome, 0, 0.36, 0.38).rotateX(0.6));
  g.add(mesh(rbox(0.42, 0.03, 0.2, 0.012), frame, 0, 0.22, 0.5));
  return g;
}

function waitingChair(seat: THREE.Material, frame: THREE.Material) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.46, 0.07, 0.44, 0.025), seat, 0, 0.46, 0));
  g.add(mesh(rbox(0.46, 0.4, 0.05, 0.02), seat, 0, 0.72, -0.21).rotateX(-0.1));
  for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) g.add(mesh(cyl(0.012, 0.012, 0.44, 10), frame, x, 0.22, z));
  return g;
}
