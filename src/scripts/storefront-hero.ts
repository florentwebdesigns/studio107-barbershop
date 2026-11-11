/**
 * Living storefront: a WebGL "2.5D" treatment of the real Studio 107 storefront photo.
 *
 * A hand-built depth map (tools/make_depth.py) separates the photo into planes: roof, facade,
 * the protruding sign / pole / mailbox, and the interior seen through the glass. The shader uses it
 * for a slow dolly push-in with true parallax, and adds the details that make the shop feel alive:
 * the barber pole turning, the neon OPEN sign humming, a slow light sweep across the gold lettering,
 * soft highlight bloom, a filmic grade, vignette and grain.
 *
 * Falls back to the same framing as a plain image with a CSS push-in when WebGL is unavailable,
 * and to a still frame for reduced-motion users.
 */

const IMG = { w: 2122, h: 1356 };
// Regions measured in storefront-photo pixels.
const SIGN_TEXT_CENTER_X = 785; // centre of the "Studio 107" lettering + phone number
const SIGN_TEXT_WIDTH = 1120;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uRes;      // canvas size, device px
uniform vec2 uImgPx;    // photo size, px
uniform vec3 uView;     // offset.xy (device px), scale (device px per photo px)
uniform vec2 uFocus;    // dolly centre, photo px
uniform float uDolly;   // 0 → no push-in
uniform vec2 uPar;      // lateral parallax, photo px at full depth range
uniform float uTime;
uniform float uExposure;
uniform float uFadeTop; // screen-space fade into the page colour (portrait framing), device px
uniform float uFadeBottom;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float rectMask(vec2 p, vec4 r, float soft) {
  vec2 a = smoothstep(r.xy - soft, r.xy + soft, p);
  vec2 b = 1.0 - smoothstep(r.zw - soft, r.zw + soft, p);
  return a.x * a.y * b.x * b.y;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 ip = (p - uView.xy) / uView.z;

  // Dolly + parallax with two depth refinements (cheap parallax-occlusion approximation).
  vec2 q = ip;
  float d = texture(uDepth, ip / uImgPx).r;
  for (int i = 0; i < 2; i++) {
    float k = d - 0.5;
    q = uFocus + (ip - uFocus) / (1.0 + uDolly * (1.0 + k * 1.6)) + uPar * k;
    d = texture(uDepth, q / uImgPx).r;
  }

  // Barber pole: slide the stripes along by one period so it appears to turn, cross-fading at the wrap.
  vec2 uv = q / uImgPx;
  vec3 c;
  vec4 pole = vec4(1927.0, 540.0, 2005.0, 838.0);
  if (q.x > pole.x && q.x < pole.z && q.y > pole.y && q.y < pole.w) {
    float period = 183.0;
    float yy = q.y + mod(uTime * 64.0, period);
    float w = smoothstep(pole.w - 36.0, pole.w, yy);
    vec3 a = texture(uImg, vec2(q.x, yy) / uImgPx).rgb;
    vec3 b = texture(uImg, vec2(q.x, yy - period) / uImgPx).rgb;
    c = mix(a, b, w);
  } else {
    c = texture(uImg, uv).rgb;
  }

  // Neon OPEN sign: gentle hum, rare flicker, and a soft glow on the glass around it.
  vec4 neon = vec4(330.0, 645.0, 592.0, 778.0);
  float nm = rectMask(q, neon, 6.0);
  if (nm > 0.0) {
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float sat = (mx - mn) / max(mx, 0.001);
    float tube = smoothstep(0.35, 0.6, sat) * smoothstep(0.35, 0.65, mx) * nm;
    float hum = 0.96 + 0.04 * sin(uTime * 47.0) * sin(uTime * 3.1);
    float flick = step(0.93, fract(sin(floor(uTime * 6.0) * 91.7) * 4375.85)) * step(0.5, fract(uTime * 13.0));
    c = mix(c, c * (hum - 0.35 * flick) * 1.06, tube);
  }
  vec3 glow = textureLod(uImg, uv, 4.5).rgb;
  float gmx = max(glow.r, max(glow.g, glow.b)), gmn = min(glow.r, min(glow.g, glow.b));
  float gsat = (gmx - gmn) / max(gmx, 0.001);
  c += glow * smoothstep(0.3, 0.7, gsat) * rectMask(q, neon + vec4(-60.0, -50.0, 60.0, 50.0), 50.0) * 0.45;

  // Slow light sweep across the gold lettering, like a lamp passing a metallic sign.
  vec4 sign = vec4(150.0, 330.0, 1340.0, 615.0);
  float sm = rectMask(q, sign, 4.0);
  if (sm > 0.0) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float gold = smoothstep(0.12, 0.32, c.r - c.b) * smoothstep(0.28, 0.5, lum) * step(c.b, c.g);
    float cyc = fract(uTime / 9.0);
    float pos = mix(-400.0, 1800.0, smoothstep(0.0, 0.5, cyc));
    float band = exp(-pow((q.x + (q.y - 450.0) * 0.55 - pos) / 110.0, 2.0));
    c += vec3(1.0, 0.86, 0.58) * gold * band * sm * 0.5;
    c += vec3(1.0, 0.9, 0.7) * gold * sm * 0.04; // a touch more glow on the letters overall
  }

  // Highlight bloom (ceiling tubes, pole globe, neon).
  vec3 b1 = textureLod(uImg, uv, 3.0).rgb;
  vec3 b2 = textureLod(uImg, uv, 5.0).rgb;
  c += max(b1 - 0.82, 0.0) * 0.6 + max(b2 - 0.7, 0.0) * 0.5;

  // Filmic grade: gentle contrast, warm highlights, cool deep shadows.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.94);
  c = (c - 0.5) * 1.07 + 0.5;
  c *= mix(vec3(0.94, 0.97, 1.03), vec3(1.04, 1.0, 0.93), smoothstep(0.15, 0.8, l));
  c = c * 0.96 + 0.01;

  // Vignette + grain.
  vec2 sp = p / uRes - 0.5;
  float vig = smoothstep(1.05, 0.25, length(sp * vec2(1.0, 0.95) * 1.45));
  c *= mix(0.68, 1.0, vig);
  c += (hash(p + fract(uTime) * 100.0) - 0.5) * 0.035;

  // Portrait framing: melt the photo edges into the page colour.
  vec3 ink = vec3(0.051, 0.047, 0.043);
  float imgTop = uView.y, imgBottom = uView.y + uImgPx.y * uView.z;
  float fade = smoothstep(imgTop, imgTop + uFadeTop, p.y) * (1.0 - smoothstep(imgBottom - uFadeBottom, imgBottom, p.y));
  c = mix(ink, c, fade);

  outColor = vec4(c * uExposure, 1.0);
}`;

type View = { ox: number; oy: number; s: number; focus: [number, number]; fadeTop: number; fadeBottom: number; par: number; portrait: boolean };

function computeView(cssW: number, cssH: number, navH: number): View {
  const portrait = cssW / cssH < 1.15;
  if (!portrait) {
    // Landscape: cover with a little overscan for the camera; crop more roof than window.
    const s = Math.max(cssW / IMG.w, cssH / IMG.h) * 1.045;
    const ox = (cssW - IMG.w * s) * 0.5;
    const oy = (cssH - IMG.h * s) * 0.58;
    return { ox, oy, s, focus: [1060, 560], fadeTop: 0, fadeBottom: 0, par: 30, portrait };
  }
  // Portrait: reframe so the "Studio 107" lettering fills the width; the copy sits below the photo.
  let s = Math.max((0.97 * cssW) / SIGN_TEXT_WIDTH, (1.06 * cssW) / IMG.w);
  s = Math.min(s, (cssH * 0.78) / IMG.h);
  let ox = cssW / 2 - SIGN_TEXT_CENTER_X * s;
  ox = Math.min(0, Math.max(cssW - IMG.w * s, ox));
  const oy = navH - 110 * s;
  return { ox, oy, s, focus: [SIGN_TEXT_CENTER_X, 470], fadeTop: 40, fadeBottom: Math.min(220, IMG.h * s * 0.32), par: 22, portrait };
}

export function initStorefrontHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-canvas]')!;
  const base = hero.querySelector<HTMLImageElement>('[data-hero-base]')!;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navH = () => (document.querySelector('[data-nav]') as HTMLElement | null)?.offsetHeight ?? 76;

  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));

  // Base image shares the WebGL framing, so the hand-off from image to canvas is invisible.
  let view = computeView(hero.clientWidth, hero.clientHeight, navH());
  function layoutBase() {
    view = computeView(hero!.clientWidth, hero!.clientHeight, navH());
    hero!.classList.toggle('is-portrait', view.portrait);
    Object.assign(base.style, {
      left: `${view.ox}px`, top: `${view.oy}px`,
      width: `${IMG.w * view.s}px`, height: `${IMG.h * view.s}px`,
    });
    hero!.style.setProperty('--photo-bottom', `${view.oy + IMG.h * view.s}px`);
  }
  layoutBase();
  if (base.complete) ready();
  else { base.addEventListener('load', ready, { once: true }); setTimeout(ready, 1500); }

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl || (navigator as any).connection?.saveData) {
    hero.classList.add('no-gl');
    window.addEventListener('resize', layoutBase);
    return;
  }

  // --- GL setup -------------------------------------------------------------------------
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch (e) {
    console.warn('Storefront hero: WebGL unavailable, using image fallback.', e);
    hero.classList.add('no-gl');
    window.addEventListener('resize', layoutBase);
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    img: U('uImg'), depth: U('uDepth'), res: U('uRes'), imgPx: U('uImgPx'), view: U('uView'), focus: U('uFocus'),
    dolly: U('uDolly'), par: U('uPar'), time: U('uTime'), exposure: U('uExposure'), fadeTop: U('uFadeTop'), fadeBottom: U('uFadeBottom'),
  };

  function texture(img: HTMLImageElement, unit: number, mips: boolean) {
    const t = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.pixelStorei(gl!.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl!.NONE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    if (mips) {
      gl!.generateMipmap(gl!.TEXTURE_2D);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
      const ext = gl!.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl!.texParameterf(gl!.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    } else {
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    }
  }

  const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

  // --- Sizing -----------------------------------------------------------------------------
  let dpr = 1;
  function resize() {
    layoutBase();
    dpr = Math.min(window.devicePixelRatio || 1, view.portrait ? 2 : 1.75);
    const w = Math.round(hero!.clientWidth * dpr), h = Math.round(hero!.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, w, h);
  }

  // --- Interaction: pointer parallax on desktop --------------------------------------------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    hero.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  }

  // --- Render loop ---------------------------------------------------------------------------
  let start = 0, raf = 0, visible = true, running = false;
  const TAU = Math.PI * 2;

  function draw(now: number) {
    const t = (now - start) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;
    const still = reduce.matches;
    const time = still ? 0 : t;
    // Slow push-in over ~20 s, easing back over the next ~20 s.
    const dolly = still ? 0.015 : 0.06 * (0.5 - 0.5 * Math.cos((TAU * time) / 42));
    const amp = view.par;
    const px = still ? 0 : Math.sin((TAU * time) / 27) * amp + mouse.x * amp * 0.9;
    const py = still ? 0 : Math.sin((TAU * time) / 41) * amp * 0.3 + mouse.y * amp * 0.45;
    const exposure = still ? 1 : Math.min(1, t / 1.6);

    gl!.uniform1i(u.img, 0);
    gl!.uniform1i(u.depth, 1);
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform2f(u.imgPx, IMG.w, IMG.h);
    gl!.uniform3f(u.view, view.ox * dpr, view.oy * dpr, view.s * dpr);
    gl!.uniform2f(u.focus, view.focus[0], view.focus[1]);
    gl!.uniform1f(u.dolly, dolly);
    gl!.uniform2f(u.par, px, py);
    gl!.uniform1f(u.time, time);
    gl!.uniform1f(u.exposure, 0.35 + 0.65 * (1 - Math.pow(1 - exposure, 3)));
    gl!.uniform1f(u.fadeTop, view.fadeTop * dpr);
    gl!.uniform1f(u.fadeBottom, view.fadeBottom * dpr);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function loop(now: number) {
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  }
  function setRunning(on: boolean) {
    if (reduce.matches) on = false;
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(loop);
    else cancelAnimationFrame(raf);
  }
  const sync = () => setRunning(visible && !document.hidden);

  Promise.all([load('/media/storefront-hero.webp'), load('/media/storefront-depth.png')])
    .then(([img, depth]) => {
      texture(img, 0, true);
      texture(depth, 1, false);
      resize();
      start = performance.now();
      draw(start);
      hero.classList.add('has-gl');
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.02 }).observe(hero);
      document.addEventListener('visibilitychange', sync);
      reduce.addEventListener?.('change', () => { sync(); draw(performance.now()); });
      let rz = 0;
      window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { resize(); draw(performance.now()); }); });
      sync();
    })
    .catch((e) => {
      console.warn('Storefront hero: textures failed, using image fallback.', e);
      hero.classList.add('no-gl');
    });

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setRunning(false); hero.classList.remove('has-gl'); hero.classList.add('no-gl'); });
}
