/**
 * Studio 107 — live cinematic hero.
 *
 * Takes authentic footage of the Studio 107 floor (a slow pan past the reclaimed-wood
 * wall, mirrors and chairs, cut into a seamless forward/back loop) and composites it in WebGL2:
 *   · sharp "subject" layer + out-of-focus ambient layer of the same room
 *   · slow dolly push and pointer parallax with a two-plane depth split
 *   · halation on the ceiling light bars and mirrors, an occasional soft light pass
 *   · filmic grade toward ink, steel and bone, vignette and fine animated grain
 *
 * Falls back to the CSS composition when WebGL2 is unavailable, the user prefers
 * reduced motion, or Save-Data is on. Pauses when off-screen or the tab is hidden.
 */

const VIDEO_W = 816;
const VIDEO_H = 1016;
/** Focal point in the video frame (normalized): the far end of the room, used as the dolly focus. */
const FOCUS = { x: 0.56, y: 0.44 };

/** Landscape layout — keep in sync with .hero__frame in Hero.astro */
const FRAME_H = 1.24;
const FRAME_Y = 0.47;
/** Portrait layout: where the sign sits on screen (fraction of hero height). */
const PORTRAIT_SIGN_Y = 0.3;

const vert = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const frag = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D uTex;
uniform vec2  uRes;      // canvas px
uniform vec4  uFrame;    // sharp layer rect in px (x, y, w, h), top-left origin
uniform vec4  uAmb;      // ambient layer rect in px
uniform float uLandscape;
uniform float uTime;
uniform float uIntro;    // 0 → 1 opening fade
uniform vec2  uMouse;    // -1..1, smoothed
uniform float uScroll;   // 0..1 hero scrolled
uniform vec2  uFocus;    // focus point in px

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Rough depth of the room in video UV: chairs & floor are near, the slat wall far.
float depthAt(vec2 uv) {
  float floorNear = smoothstep(0.66, 1.0, uv.y);
  float ceilNear  = smoothstep(0.30, 0.0, uv.y) * 0.45;
  float sides     = smoothstep(0.62, 0.95, abs(uv.x - 0.5) * 2.0) * smoothstep(0.55, 0.8, uv.y) * 0.4;
  return clamp(floorNear + ceilNear + sides, 0.0, 1.0);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 suv = px / uRes;                                   // screen uv, top-left origin
  float t = uTime;

  // ── Camera: slow dolly (48s breath), opening settle, scroll push, gentle drift
  float breath = 0.5 - 0.5 * cos(t * 6.28318 / 48.0);
  float scale = 1.0 + 0.045 * breath + 0.07 * (1.0 - uIntro) + 0.06 * uScroll;
  vec2 drift = vec2(sin(t * 0.071), cos(t * 0.053)) * 0.0035 * uRes.y;
  vec2 q = (px - uFocus) / scale + uFocus + drift;

  // ── Sharp layer with depth parallax
  vec2 par = uMouse * uRes.y * 0.010;
  vec2 uv0 = (q - uFrame.xy) / uFrame.zw;
  float d = depthAt(uv0);
  vec2 uv = (q - par * (0.35 + d * 1.1) - uFrame.xy) / uFrame.zw;
  vec3 sharp = texture(uTex, uv).rgb;
  vec3 soft1 = textureLod(uTex, uv, 1.6).rgb;
  sharp += (sharp - soft1) * 0.45;                        // gentle unsharp mask
  sharp = max(sharp, 0.0);

  // ── Ambient layer: same room, defocused, moving against the subject
  vec2 auv = (q + par * 0.8 - uAmb.xy) / uAmb.zw;
  vec3 amb = textureLod(uTex, auv, 5.6).rgb;
  amb = mix(vec3(luma(amb)), amb, 0.6) * 0.42;

  // Feathered mask for the sharp layer (landscape only)
  float m;
  if (uLandscape > 0.5) {
    m  = smoothstep(0.0, 0.30, uv.x) * smoothstep(1.0, 0.84, uv.x);
    m *= smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.88, uv.y);
  } else {
    m = smoothstep(1.0, 0.86, uv.y) * smoothstep(-0.02, 0.04, uv.y);
  }
  vec3 col = mix(amb, sharp, m);

  // ── Halation: the ceiling light bars and white mirror frames bloom softly
  vec3 b1 = textureLod(uTex, uv, 3.2).rgb;
  vec3 b2 = textureLod(uTex, uv, 5.0).rgb;
  vec3 halo = max(b1 - 0.72, 0.0) * 0.7 + max(b2 - 0.62, 0.0) * 0.45;
  col += halo * vec3(0.92, 0.95, 1.0) * m;

  // ── Light pass: a soft, warm band drifting across the room every ~26s
  float cyc = fract((t + 6.0) / 26.0);
  float pos = mix(-0.35, 1.35, smoothstep(0.0, 0.62, cyc));
  float band = exp(-pow((suv.x * 0.92 + suv.y * 0.38 - pos) / 0.16, 2.0));
  band *= smoothstep(0.0, 0.08, cyc) * (1.0 - smoothstep(0.55, 0.65, cyc));
  col += band * vec3(0.9, 0.94, 1.0) * (0.02 + luma(col) * 0.2);

  // ── Faint haze drifting through the light
  float hz = fbm(suv * vec2(2.2, 3.0) + vec2(t * 0.018, -t * 0.012));
  col += vec3(0.78, 0.8, 0.84) * hz * 0.024 * (0.4 + luma(b2) * 1.6);

  // ── Grade: the footage is bright fluorescent daylight; take it down into a moody product-film look.
  // Ink blacks with a steel cast, muted mids that keep a little of the wood's warmth, clean bone highlights.
  float L = luma(col);
  col = mix(vec3(L), col, 0.72);
  col *= 0.74;                                             // exposure down
  col = pow(col, vec3(1.18));                              // deeper mids
  vec3 shadowTint = vec3(0.9, 0.96, 1.06);
  vec3 highTint = vec3(1.03, 1.0, 0.95);
  col *= mix(shadowTint, highTint, smoothstep(0.06, 0.6, L));
  col = col * 0.97 + vec3(0.008, 0.009, 0.011);
  col = col / (1.0 + col * 0.22);                          // soft shoulder

  // ── Vignette + scroll dim + opening fade
  vec2 vc = suv - vec2(uLandscape > 0.5 ? 0.62 : 0.5, 0.45);
  float vig = smoothstep(1.05, 0.25, length(vc * vec2(uRes.x / uRes.y * 0.62, 1.0)));
  col *= mix(0.42, 1.0, vig);
  col *= (1.0 - uScroll * 0.55);
  col *= smoothstep(0.0, 1.0, uIntro);

  // ── Grain (24fps cadence)
  float ft = floor(t * 24.0);
  float g = hash(px + ft * 37.0) + hash(px * 1.37 - ft * 11.0) - 1.0;
  col += g * 0.035 * (0.55 + 0.45 * (1.0 - L));

  outColor = vec4(max(col, 0.0), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[hero] shader', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const video = hero.querySelector<HTMLVideoElement>('[data-hero-video]')!;
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-gl]')!;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reduced.matches || saveData) {
    hero.classList.add('reduced');
    video.removeAttribute('autoplay');
    video.preload = 'none';
    return;
  }

  // ── Video playback
  let videoReady = false;
  const tryPlay = () => video.play().catch(() => {});
  video.addEventListener('playing', () => {
    videoReady = true;
    hero.classList.add('is-video');
  });
  tryPlay();
  // iOS low-power mode can refuse autoplay: start on first interaction.
  const kick = () => {
    if (video.paused) tryPlay();
  };
  window.addEventListener('touchstart', kick, { once: true, passive: true });
  window.addEventListener('pointerdown', kick, { once: true });

  // ── WebGL2
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return; // CSS composition stays

  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    res: U('uRes'),
    frame: U('uFrame'),
    amb: U('uAmb'),
    land: U('uLandscape'),
    time: U('uTime'),
    intro: U('uIntro'),
    mouse: U('uMouse'),
    scroll: U('uScroll'),
    focus: U('uFocus'),
  };
  gl.uniform1i(U('uTex'), 0);

  // Seed the texture with the poster so the first frame is never black.
  const poster = hero.querySelector<HTMLImageElement>('.hero__poster')!;
  let hasTex = false;
  const upload = (src: TexImageSource) => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    hasTex = true;
  };
  const seedPoster = () => {
    if (!hasTex && poster.complete && poster.naturalWidth) upload(poster);
  };
  seedPoster();
  poster.addEventListener('load', seedPoster, { once: true });

  // ── Layout
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0;
  let H = 0;
  const geom = { frame: [0, 0, 1, 1], amb: [0, 0, 1, 1], focus: [0, 0], land: 1 };

  const layout = () => {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);

    const landscape = r.width >= r.height;
    geom.land = landscape ? 1 : 0;
    if (landscape) {
      const fx = Math.min(0.64, 1 - (FRAME_H * r.height * (VIDEO_W / VIDEO_H)) / 2 / r.width + 0.02);
      hero.style.setProperty('--fx', `${(fx * 100).toFixed(2)}%`);
      const fh = H * FRAME_H;
      const fw = fh * (VIDEO_W / VIDEO_H);
      geom.frame = [W * fx - fw / 2, H * 0.5 - fh * FRAME_Y, fw, fh];
    } else {
      // Portrait: fill the width, lift the sign into the upper third so the copy sits below it.
      // Keep in sync with the portrait .hero__frame rules.
      const s = Math.max(W / VIDEO_W, H / VIDEO_H);
      const fw = VIDEO_W * s;
      const fh = VIDEO_H * s;
      geom.frame = [(W - fw) * 0.53, H * PORTRAIT_SIGN_Y - fh * FOCUS.y, fw, fh];
    }
    // Ambient: cover the whole canvas with margin, centered on the sign
    const as = Math.max(W / VIDEO_W, H / VIDEO_H) * 1.25;
    const aw = VIDEO_W * as;
    const ah = VIDEO_H * as;
    geom.amb = [W / 2 - aw * FOCUS.x, H / 2 - ah * FOCUS.y, aw, ah];
    const [x, y, w, h] = geom.frame;
    geom.focus = [x + w * FOCUS.x, y + h * FOCUS.y];

    gl.uniform2f(u.res, W, H);
    gl.uniform4f(u.frame, geom.frame[0], geom.frame[1], geom.frame[2], geom.frame[3]);
    gl.uniform4f(u.amb, geom.amb[0], geom.amb[1], geom.amb[2], geom.amb[3]);
    gl.uniform2f(u.focus, geom.focus[0], geom.focus[1]);
    gl.uniform1f(u.land, geom.land);
  };
  layout();
  let resizeT = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeT);
    resizeT = requestAnimationFrame(layout);
  }).observe(hero);

  // ── Inputs
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) {
    window.addEventListener(
      'pointermove',
      (e) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true },
    );
  }
  let scroll = 0;
  const onScroll = () => {
    scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Video frames → texture (only when a new frame is decoded)
  let newFrame = false;
  type RVFC = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
  const v = video as RVFC;
  if (v.requestVideoFrameCallback) {
    const onFrame = () => {
      newFrame = true;
      v.requestVideoFrameCallback!(onFrame);
    };
    v.requestVideoFrameCallback(onFrame);
  }
  let lastVT = -1;

  // ── Loop
  let running = false;
  let raf = 0;
  let start = performance.now();
  let introStart = 0;
  let shown = false;
  let slowFrames = 0;
  let last = performance.now();

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    last = now;

    // Adaptive resolution on slower devices
    if (dt > 26 && dt < 200) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 45 && dpr > 1) {
      dpr = 1;
      slowFrames = 0;
      layout();
    }

    if (videoReady && video.readyState >= 2) {
      if (v.requestVideoFrameCallback ? newFrame : video.currentTime !== lastVT) {
        upload(video);
        newFrame = false;
        lastVT = video.currentTime;
      }
    }
    if (!hasTex) return;

    if (!introStart) introStart = now;
    const intro = Math.min(1, (now - introStart) / 2600);
    const introE = 1 - Math.pow(1 - intro, 3);

    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;

    gl.uniform1f(u.time, (now - start) / 1000);
    gl.uniform1f(u.intro, introE);
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.uniform1f(u.scroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!shown) {
      shown = true;
      hero.classList.add('is-gl');
    }
  };

  const play = () => {
    if (running) return;
    running = true;
    last = performance.now();
    tryPlay();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    video.pause();
  };

  let inView = true;
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) play();
      else stop();
    },
    { threshold: 0 },
  ).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (inView) play();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    hero.classList.remove('is-gl');
  });

  reduced.addEventListener?.('change', (e) => {
    if (e.matches) {
      stop();
      hero.classList.remove('is-gl');
      hero.classList.add('reduced');
    }
  });

  start = performance.now();
  play();
}
