/**
 * Scroll-driven 3D "drone shot" of Studio 107.
 * The camera hovers in front of the shop at dusk, watches a client walk out with a fresh cut and
 * pull the door shut, then glides through the door, along the chairs, and settles on the menu board.
 * All motion is a function of scroll progress (smoothed), so scrolling back plays it in reverse.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { buildWorld } from './models';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const eseg = (p: number, a: number, b: number) => smooth(seg(p, a, b));

type V3 = [number, number, number];
type Key = { t: number; pos: V3; look: V3 };

// Camera choreography (desktop framing). Portrait screens are adapted at runtime.
const KEYS: Key[] = [
  { t: 0.0, pos: [4.6, 3.5, 15.5], look: [-2.4, 1.9, 0] },
  { t: 0.075, pos: [2.6, 2.8, 11.6], look: [-1.0, 1.85, 0] },
  { t: 0.15, pos: [-0.4, 2.3, 8.8], look: [1.25, 1.5, 0.3] },
  { t: 0.245, pos: [-0.5, 1.95, 6.9], look: [1.55, 1.35, 0.4] },
  { t: 0.33, pos: [-3.2, 2.8, 12.0], look: [0.8, 1.0, 5.4] },
  { t: 0.405, pos: [1.6, 2.5, 12.4], look: [-4.0, 1.0, 7.4] },
  { t: 0.47, pos: [1.78, 1.75, 4.8], look: [1.78, 1.55, -2] },
  { t: 0.535, pos: [1.78, 1.63, 1.1], look: [1.72, 1.5, -4] },
  { t: 0.585, pos: [1.55, 1.62, -1.0], look: [0.5, 1.45, -5] },
  { t: 0.665, pos: [0.9, 1.75, -2.3], look: [-2.7, 1.25, -3.6] },
  { t: 0.755, pos: [0.25, 1.55, -3.5], look: [-2.8, 1.0, -5.6] },
  { t: 0.85, pos: [0.7, 1.55, -6.3], look: [-0.35, 1.58, -11] },
  { t: 0.94, pos: [-0.45, 1.6, -7.0], look: [-0.45, 1.5, -11] },
  { t: 1.0, pos: [-0.45, 1.6, -7.15], look: [-0.45, 1.5, -11] },
];

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.03 },
    uVignette: { value: 0.9 },
    uAberration: { value: 0.0005 },
    uFade: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVignette, uAberration, uFade;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * r2 * uAberration * 18.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      // gentle split-tone: warm highlights, cool shadows
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col * vec3(0.94, 0.98, 1.06), col * vec3(1.05, 1.0, 0.92), smoothstep(0.15, 0.75, l));
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
      float vig = smoothstep(0.95, 0.18, r2 * uVignette * 2.2);
      col *= mix(0.55, 1.0, vig);
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      col += g * uGrain;
      col *= uFade;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function initDroneHero() {
  const section = document.querySelector<HTMLElement>('[data-drone]');
  const canvas = section?.querySelector<HTMLCanvasElement>('[data-drone-canvas]');
  if (!section || !canvas) return;

  const fail = () => {
    section.classList.add('no-gl');
    section.classList.remove('is-loading');
  };

  const probe = document.createElement('canvas').getContext('webgl2');
  const saveData = (navigator as any).connection?.saveData === true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reduced motion or data saver: keep the real storefront photo instead of the camera flight.
  if (!probe || saveData || reduce) return fail();

  start(section, canvas).catch((e) => {
    console.warn('3D hero unavailable, showing photo fallback.', e);
    fail();
  });
}

async function start(section: HTMLElement, canvas: HTMLCanvasElement) {
  const reduce = false; // reduced-motion users get the photo fallback (see initDroneHero)
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const quality: 'high' | 'low' = coarse || small ? 'low' : 'high';

  // Canvas textures need the brand fonts.
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 100px "Instrument Serif"'),
      document.fonts.load('100px "Instrument Serif"'),
      document.fonts.load('600 60px "Manrope Variable"'),
      document.fonts.load('800 60px "Manrope Variable"'),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, quality === 'high' ? 1.75 : 1.5);
  renderer.setPixelRatio(dpr);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    section.classList.add('no-gl');
  });

  RectAreaLightUniformsLib.init();
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#1b1a22', 0.018);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const world = buildWorld(scene, quality);

  /* ---------- Lights ---------- */
  const shadowSize = quality === 'high' ? 2048 : 1024;
  scene.add(new THREE.HemisphereLight('#41507a', '#2a1c14', 0.55));

  const moon = new THREE.DirectionalLight('#a9bcff', 0.55);
  moon.position.set(-14, 20, 16);
  moon.castShadow = true;
  moon.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 10, bottom: -6, near: 1, far: 60 });
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.02;
  scene.add(moon);

  const lampSpot = new THREE.SpotLight('#ffc27a', 70, 20, 0.95, 0.85, 1.7);
  lampSpot.position.set(-6.6, 4.3, 8.25);
  lampSpot.target.position.set(-5.6, 0, 6.0);
  lampSpot.castShadow = true;
  lampSpot.shadow.mapSize.set(1024, 1024);
  lampSpot.shadow.bias = -0.0008;
  scene.add(lampSpot, lampSpot.target);

  const flood = new THREE.SpotLight('#ffdcb0', 32, 12, 0.8, 0.7, 1.6);
  flood.position.set(1.53, 3.72, 0.3);
  flood.target.position.set(1.7, 0, 2.6);
  flood.castShadow = true;
  flood.shadow.mapSize.set(shadowSize / 2, shadowSize / 2);
  flood.shadow.bias = -0.0008;
  scene.add(flood, flood.target);

  const signWash = new THREE.SpotLight('#ffe6c0', 16, 9, 0.75, 1, 1.5);
  signWash.position.set(-1.2, 5.6, 2.6);
  signWash.target.position.set(-1.2, 3.0, 0);
  scene.add(signWash, signWash.target);

  const winSpill = new THREE.RectAreaLight('#ffd7a3', 3.2, 4.1, 2.0);
  winSpill.position.set(-1.1, 1.5, 0.08);
  winSpill.lookAt(-1.1, 0.4, 6);
  scene.add(winSpill);
  const doorSpill = new THREE.RectAreaLight('#ffd7a3', 2.6, 1.1, 2.3);
  doorSpill.position.set(1.78, 1.2, 0.06);
  doorSpill.lookAt(1.78, 0.3, 6);
  scene.add(doorSpill);

  // Interior: LED ceiling panel + warm station lights
  const ceilingPanel = new THREE.RectAreaLight('#f4f2ff', 4.2, 4.0, 9.5);
  ceilingPanel.position.set(0.1, 2.86, -5.6);
  ceilingPanel.lookAt(0.1, 0, -5.6);
  scene.add(ceilingPanel);
  const stationLights: THREE.PointLight[] = [];
  for (const z of [-2.6, -6.3]) {
    const pl = new THREE.PointLight('#ffe6c8', 2.4, 6, 1.8);
    pl.position.set(-2.0, 2.4, z);
    scene.add(pl);
    stationLights.push(pl);
  }

  /* ---------- Camera ---------- */
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 260);
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function cameraAt(p: number) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].t) i++;
    const a = KEYS[i].t, b = KEYS[i + 1].t;
    let u = clamp((p - a) / (b - a));
    u = lerp(u, smooth(u), 0.4);
    const t = (i + u) / (KEYS.length - 1);
    posCurve.getPoint(t, tmpP);
    lookCurve.getPoint(t, tmpL);
  }

  /* ---------- Person path ---------- */
  const walkCurve = new THREE.CatmullRomCurve3(
    [new THREE.Vector3(1.72, 0, 1.05), new THREE.Vector3(1.76, 0, 3.4), new THREE.Vector3(1.6, 0, 6.2), new THREE.Vector3(0.4, 0, 7.4), new THREE.Vector3(-4, 0, 7.6), new THREE.Vector3(-11, 0, 7.7)],
    false,
    'centripetal',
  );
  const walkLen = walkCurve.getLength();
  const STRIDE = 1.45;
  const pv = new THREE.Vector3(), tv = new THREE.Vector3();
  function placePerson(p: number) {
    const P = world.person;
    let x = 1.72, z = -1.7, heading = 0, walk = 0, reach = 0, dist = 0;
    if (p < 0.1) {
      walk = 0;
    } else if (p < 0.19) {
      const u = seg(p, 0.1, 0.19);
      z = lerp(-1.7, 1.05, u);
      dist = z + 1.7;
      walk = Math.min(1, u * 6, (1 - u) * 6 + 0.25);
      reach = 0.6 * (1 - eseg(p, 0.1, 0.15)) * eseg(p, 0.095, 0.105);
    } else if (p < 0.29) {
      z = 1.05;
      dist = 2.75;
      const turn1 = eseg(p, 0.19, 0.215);
      const turn2 = eseg(p, 0.265, 0.29);
      heading = Math.PI * turn1 + Math.PI * turn2;
      reach = eseg(p, 0.205, 0.225) * (1 - eseg(p, 0.258, 0.275));
      walk = 0.25 * (Math.sin(seg(p, 0.19, 0.29) * Math.PI));
      dist += seg(p, 0.19, 0.29) * 0.6;
    } else {
      const u = seg(p, 0.29, 0.43);
      walkCurve.getPointAt(u, pv);
      walkCurve.getTangentAt(Math.min(u, 0.999), tv);
      x = pv.x;
      z = pv.z;
      heading = Math.atan2(tv.x, tv.z);
      dist = 3.35 + u * walkLen;
      walk = Math.min(1, u * 10 + 0.3);
    }
    P.root.position.set(x, 0, z);
    P.root.rotation.y = heading;
    P.root.visible = p < 0.44;
    P.pose((dist / STRIDE) * Math.PI * 2, walk, reach);
  }

  /* ---------- Post ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 2 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  /* ---------- Sizing ---------- */
  let W = 0, H = 0, aspect = 1, portraitPull = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    aspect = W / H;
    renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    bloom.resolution.set(W / 2, H / 2);
    // Keep roughly the desktop horizontal framing on tall screens: widen fov a little, then pull back.
    const deskHalf = Math.tan(THREE.MathUtils.degToRad(21)) * (16 / 9);
    let vfov = 42;
    if (aspect < 16 / 9) {
      vfov = Math.min(66, THREE.MathUtils.radToDeg(2 * Math.atan(deskHalf / aspect)));
    }
    camera.fov = vfov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const have = Math.tan(THREE.MathUtils.degToRad(vfov / 2)) * aspect;
    portraitPull = Math.max(1, deskHalf / have);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  /* ---------- Scroll / pointer ---------- */
  let target = 0, prog = 0;
  const snap = new URLSearchParams(location.search).has('snap'); // testing: no scroll smoothing
  function readScroll() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    target = total > 0 ? clamp(-r.top / total) : 0;
  }
  readScroll();
  prog = target;
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!coarse) {
    addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- UI hooks ---------- */
  const chapters = Array.from(section.querySelectorAll<HTMLElement>('[data-from]')).map((el) => ({
    el, from: parseFloat(el.dataset.from!), to: parseFloat(el.dataset.to!),
  }));
  const hudAlt = section.querySelector<HTMLElement>('[data-hud-alt]');
  const hudTime = section.querySelector<HTMLElement>('[data-hud-time]');
  const hudChap = section.querySelector<HTMLElement>('[data-hud-chap]');
  const hudBar = section.querySelector<HTMLElement>('[data-hud-bar]');
  const scrollCue = section.querySelector<HTMLElement>('[data-scroll-cue]');
  const CHAPS: [number, string][] = [[0, '01 · Outside'], [0.09, '02 · After the cut'], [0.44, '03 · Stepping in'], [0.6, '04 · The floor'], [0.84, '05 · The menu']];
  const startTime = performance.now();

  function updateUI(p: number, now: number) {
    for (const c of chapters) {
      const fi = c.from < 0 ? 1 : smooth(seg(p, c.from, c.from + 0.025));
      const fo = c.to >= 1 ? 1 : 1 - smooth(seg(p, c.to - 0.025, c.to));
      const o = Math.min(fi, fo);
      c.el.style.opacity = o.toFixed(3);
      c.el.style.transform = `translate3d(0, ${((1 - fi) * 24 - (1 - fo) * 24).toFixed(1)}px, 0)`;
      c.el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }
    if (hudAlt) hudAlt.textContent = `ALT ${tmpP.y.toFixed(1).padStart(4, '0')} M`;
    if (hudTime) {
      const s = Math.floor((now - startTime) / 1000);
      const f = Math.floor(((now - startTime) % 1000) / 41.7);
      hudTime.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
    }
    if (hudChap) {
      let label = CHAPS[0][1];
      for (const [t, l] of CHAPS) if (p >= t) label = l;
      if (hudChap.textContent !== label) hudChap.textContent = label;
    }
    if (hudBar) hudBar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (scrollCue) scrollCue.style.opacity = String(1 - seg(p, 0.0, 0.03));
  }

  /* ---------- Loop ---------- */
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }).observe(section);
  const clock = new THREE.Clock();
  let fadeIn = 0;
  let frames = 0, slowFrames = 0;
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3();
  const dir = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!visible) return;
    const t = clock.elapsedTime;

    // Smooth the scroll so the camera glides like a gimbal.
    prog += (target - prog) * (1 - Math.exp(-dt * 3.0));
    if (snap) prog = target;
    if (Math.abs(target - prog) < 1e-5) prog = target;
    const p = prog;
    const inside = eseg(p, 0.5, 0.6);

    // Camera
    cameraAt(p);
    dir.subVectors(tmpP, tmpL);
    if (portraitPull > 1) tmpP.addScaledVector(dir, (portraitPull - 1) * lerp(0.4, 0.6, inside));
    // Tall screens: tilt down outside so the storefront sits in the top half, above the copy.
    if (aspect < 1) tmpL.y -= clamp((1 - aspect) / 0.5) * tmpP.distanceTo(tmpL) * 0.2 * (1 - inside);
    if (p > 0.56) {
      tmpP.x = clamp(tmpP.x, -3.1, 3.3);
      tmpP.z = clamp(tmpP.z, -10.4, 6);
    }
    const hover = reduce ? 0 : 1;
    const idle = 1 - seg(p, 0, 0.06);
    tmpP.x += (Math.sin(t * 0.55) * 0.05 + Math.sin(t * 0.13) * 0.5 * idle) * hover;
    tmpP.y += (Math.sin(t * 0.83) * 0.04 + Math.sin(t * 0.21) * 0.15 * idle) * hover;
    tmpP.z += Math.cos(t * 0.47) * 0.04 * hover;
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 2.5));
    mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 2.5));
    dir.subVectors(tmpL, tmpP).normalize();
    right.crossVectors(dir, up).normalize();
    const par = lerp(0.35, 0.12, inside);
    tmpP.addScaledVector(right, mouse.sx * par).addScaledVector(up, -mouse.sy * par * 0.5);
    camera.position.copy(tmpP);
    camera.lookAt(tmpL);
    camera.rotation.z += Math.sin(t * 0.4) * 0.003 * hover;

    // Door: opens for the client, closes behind him, opens again for the drone.
    const open1 = eseg(p, 0.09, 0.135), close1 = eseg(p, 0.212, 0.262), open2 = eseg(p, 0.45, 0.53);
    world.doorPivot.rotation.y = clamp(open1 * (1 - close1) + open2) * THREE.MathUtils.degToRad(84);

    placePerson(p);

    // Living details
    world.poleTex.offset.y = -t * 0.32;
    let flick = 1;
    const n = Math.sin(t * 7.3) + Math.sin(t * 17.1 + 1.3) + Math.sin(t * 2.1);
    if (!reduce && n > 2.45) flick = 0.35;
    world.neonMat.color.setScalar(2.4 * flick);
    world.neonLight.intensity = 2.2 * flick;

    // Exposure & atmosphere shift as we go inside
    renderer.toneMappingExposure = lerp(1.0, 0.95, inside);
    scene.environmentIntensity = lerp(0.3, 0.42, inside);
    (scene.fog as THREE.FogExp2).density = lerp(0.018, 0.006, inside);
    bloom.strength = lerp(0.5, 0.32, inside);
    // Interior reads dimmer from the street (camera exposure), full once we're in.
    const il = lerp(0.5, 1, inside);
    ceilingPanel.intensity = 2.0 * il;
    for (const l of stationLights) l.intensity = 3.0 * il;
    world.ledMat.color.setScalar(lerp(1.4, 2.4, inside));

    fadeIn = Math.min(1, fadeIn + dt * 0.7);
    grade.uniforms.uTime.value = reduce ? 0 : t;
    grade.uniforms.uFade.value = smooth(fadeIn);

    composer.render(dt);
    updateUI(p, performance.now());

    // Adaptive resolution: if we're consistently slow, drop the pixel ratio once.
    frames++;
    if (dt > 0.034) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45 && dpr > 1) {
        dpr = Math.max(1, dpr * 0.7);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frames = 0;
      slowFrames = 0;
    }
    if (section.classList.contains('is-loading')) section.classList.remove('is-loading');
  }
  section.classList.add('has-gl');
  requestAnimationFrame(frame);
}
