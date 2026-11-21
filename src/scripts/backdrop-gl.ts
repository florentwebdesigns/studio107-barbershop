/**
 * Studio 107 — site-wide animated backdrop.
 *
 * A fixed, full-screen WebGL2 layer behind every section below the hero:
 *   · "Pole silk": the barber pole's helix, abstracted into slow diagonal ribbons of
 *     muted rose, bone and dusk blue (the pole's red, white and blue, in pastel),
 *     domain-warped so they drift like silk rather than read as stripes
 *   · "Combed strands": fine hairlines flowing through the frame like freshly combed
 *     hair, with a chrome sheen travelling along them
 *   · soft cool light pools, scroll parallax, vignette and fine grain
 *
 * Renders only while visible (not behind the opaque hero, not in a hidden tab),
 * adapts resolution to hold 60fps, and draws one still frame for reduced motion.
 */

const frag = /* glsl */ `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;   // page scroll in px (device)
uniform float uDpr;

float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p+23.45); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = r*p*2.02 + 11.7; a *= 0.5; }
  return v;
}

float grainHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Silver motes drifting upward through the light, like dust caught in a barbershop sunbeam
vec3 motes(vec2 uv, float scale, float speed, float t, float density){
  vec2 g = uv * scale + vec2(0.0, -t * speed);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float r = h21(id);
  if (r > density) return vec3(0.0);
  vec2 off = (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.6;
  off.x += sin(t * 0.35 + r * 40.0) * 0.12;
  float size = 0.035 + 0.06 * h21(id + 1.3);
  float d = length(f - off);
  float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (0.6 + r * 1.8) + r * 60.0), 3.0);
  return vec3(0.9, 0.93, 1.0) * smoothstep(size, size * 0.15, d) * tw;
}

void main(){
  vec2 px = gl_FragCoord.xy;
  float minR = min(uRes.x, uRes.y);
  vec2 uv = (px - 0.5*uRes) / minR;          // aspect-correct, centered
  float t = uTime;
  float scr = uScroll / minR;                 // scroll in "screen units"
  vec2 p = uv + vec2(0.0, scr * 0.16);        // slow parallax relative to content

  // Large-scale flow field
  vec2 q = vec2(fbm(p*0.8 + vec2(0.0, t*0.03)), fbm(p*0.8 + vec2(5.2, -t*0.025)));
  vec2 w = p + (q - 0.5) * 0.6;

  vec3 col = vec3(0.027, 0.028, 0.030);

  // ── Pole silk: the barber pole's helix as slow satin ribbons (oxblood, silver, steel)
  vec2 dir = normalize(vec2(1.0, 0.62));
  float s = dot(w, dir) * 1.7 - t * 0.05;
  float band = fract(s);
  float idx = mod(floor(s), 3.0);
  vec3 rose = vec3(0.62, 0.24, 0.26);
  vec3 bone = vec3(0.80, 0.82, 0.85);
  vec3 dusk = vec3(0.46, 0.50, 0.57);
  vec3 ribbon = idx < 0.5 ? rose : (idx < 1.5 ? bone : dusk);
  float body = smoothstep(0.0, 0.22, band) * smoothstep(1.0, 0.62, band);
  float satin = pow(max(0.0, 1.0 - abs(band - 0.38) * 2.6), 4.0);
  float veil = smoothstep(0.30, 0.78, fbm(w * 0.6 + vec2(t * 0.015, 3.1)));
  col += ribbon * (body * 0.05 + satin * 0.13) * veil;

  // ── Combed strands: fine hairlines swept like a fresh comb-over, with a chrome sheen travelling through
  vec2 c = w * vec2(1.0, 1.0);
  float sweep = c.y + 0.32 * sin(c.x * 0.9 + 0.6) + 0.12 * sin(c.x * 2.3 - t * 0.05)
              + (fbm(c * 0.7 + vec2(t * 0.02, 0.0)) - 0.5) * 0.28;
  float f = sweep * 18.0;
  float dl = abs(fract(f) - 0.5);
  float aa = fwidth(f);
  float line = 1.0 - smoothstep(0.016, 0.016 + aa * 1.4, dl);
  float glow = exp(-dl * dl * 160.0) * 0.12;
  float strandMask = smoothstep(0.46, 0.82, fbm(c * 0.85 + vec2(-t * 0.02, 7.0)));
  float travel = 0.5 + 0.5 * sin(c.x * 1.8 + sweep * 2.5 - t * 0.5);
  travel = pow(travel, 14.0);
  vec3 chrome = vec3(0.80, 0.84, 0.90);
  col += chrome * (line + glow) * strandMask * (0.008 + travel * 0.2);

  // ── Light shaft from the upper right, swaying slowly
  vec2 bo = vec2(0.9 + sin(t * 0.07) * 0.15, 0.75);
  vec2 bd = normalize(vec2(-0.55 + sin(t * 0.05) * 0.08, -1.0));
  vec2 rel = uv - bo;
  float along = dot(rel, bd);
  float across = abs(rel.x * bd.y - rel.y * bd.x);
  float shaft = exp(-across * across * 9.0) * smoothstep(-0.1, 0.6, along) * exp(-along * 0.5);
  shaft *= 0.75 + 0.25 * fbm(uv * 3.0 + vec2(0.0, t * 0.1));
  col += vec3(0.86, 0.89, 0.95) * shaft * 0.07;

  // ── Cool light pools (one with a hint of oxblood), drifting
  vec2 l1 = vec2(sin(t*0.05)*0.6 + 0.35, cos(t*0.04)*0.25 + 0.1);
  vec2 l2 = vec2(cos(t*0.037)*0.7 - 0.45, sin(t*0.031)*0.3 - 0.2);
  float g1 = exp(-dot(uv - l1, uv - l1) * 2.6);
  float g2 = exp(-dot(uv - l2, uv - l2) * 3.4);
  col += vec3(0.14, 0.15, 0.17) * g1 * 0.35 + vec3(0.17, 0.07, 0.08) * g2 * 0.25;
  col *= 0.85 + 0.35 * (g1 + g2 * 0.6 + shaft * 0.8);

  // ── Motes (two depths), brighter inside the shaft
  vec2 mp = uv + vec2(0.0, scr * 0.35);
  vec3 m = motes(mp, 7.0, 0.05, t, 0.16) * 0.55 + motes(mp + 3.7, 15.0, 0.03, t, 0.2) * 0.35;
  col += m * (0.25 + shaft * 2.0 + g1 * 0.8);

  // ── Vignette + grain
  vec2 vu = px / uRes - 0.5;
  col *= 1.0 - dot(vu, vu) * 0.85;
  float ft = floor(t * 30.0);
  float gr = grainHash(floor(px / uDpr) + ft * 1.618) - 0.5;
  col += gr * 0.02;

  o = vec4(max(col, 0.0), 1.0);
}
`;

const vert = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export function initBackdrop() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-backdrop]');
  if (!canvas) return;
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return; // CSS fallback stays

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[backdrop]', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, vert);
  const fs = sh(gl.FRAGMENT_SHADER, frag);
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
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  const uDpr = gl.getUniformLocation(prog, 'uDpr');

  // Resolution: full device pixels up to 2x on capable screens; adapts down if frames run long.
  const maxScale = Math.min(window.devicePixelRatio || 1, 2);
  let scale = Math.min(maxScale, matchMedia('(pointer: coarse)').matches ? 1.5 : maxScale);
  const resize = () => {
    const w = Math.round(window.innerWidth * scale);
    const h = Math.round(window.innerHeight * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uDpr, scale);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const t0 = performance.now();
  const draw = (now: number) => {
    gl.uniform1f(uTime, (now - t0) / 1000 + 40);
    gl.uniform1f(uScroll, window.scrollY * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const showCanvas = () => document.documentElement.classList.add('has-backdrop');

  if (reduced) {
    draw(t0);
    showCanvas();
    return;
  }

  let raf = 0;
  let running = false;
  let last = 0;
  let slow = 0;
  let fast = 0;
  const visible = () => !document.hidden && (!hero || window.scrollY > 1);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? now - last : 16;
    last = now;
    if (dt > 21 && dt < 250) {
      slow++;
      fast = 0;
    } else if (dt < 17.5) {
      fast++;
      slow = Math.max(0, slow - 1);
    }
    if (slow > 40 && scale > 0.6) {
      scale = Math.max(0.6, scale * 0.8);
      slow = 0;
      resize();
    } else if (fast > 600 && scale < maxScale) {
      scale = Math.min(maxScale, scale * 1.15);
      fast = 0;
      resize();
    }
    draw(now);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const check = () => (visible() ? start() : stop());

  draw(t0);
  showCanvas();
  window.addEventListener('scroll', check, { passive: true });
  document.addEventListener('visibilitychange', check);
  check();
}
