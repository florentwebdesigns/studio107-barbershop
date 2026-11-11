/**
 * Live storefront hero: one continuous camera move built from the real Studio 107 media.
 *
 * World space = pixels of the street photo (2000 × 1119). The close-up storefront photo is
 * placed inside that world exactly over the shop's facade, so a single camera (centre + zoom)
 * flies from the street, onto the sign, up to the front door and through its glass, which
 * shows the real interior. At the door the interior footage takes over and pulls back to
 * reveal the floor, then settles into a seamless ambient loop with the logo on the wall.
 *
 * Driven by requestAnimationFrame so it can pause, resume and replay. No dependencies.
 */

// --- Measured from the photos -------------------------------------------------------------
const STREET = { w: 2000, h: 1119 };
// Storefront photo (2000 × 1278) mapped into street space: top-left + scale (sign & pole aligned).
const FRONT = { x: 698.5, y: 471.4, k: 0.125, w: 2000, h: 1278 };
// Door glass in storefront-photo pixels.
const GLASS = { x: 1345, y: 643, w: 337, h: 635 };

const APPROACH_MS = 8200; // street → through the door
const HANDOFF_MS = 900; // portal → full-screen footage

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothRange = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a), 0, 1));

export function initHeroFilm() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const q = <E extends Element = HTMLElement>(s: string) => hero.querySelector<E>(s)!;
  const street = q('[data-street]');
  const front = q('[data-front]');
  const inside = q('[data-portal-inside]');
  const glass = q('[data-portal-glass]');
  const still = q<HTMLImageElement>('[data-still]');
  const reveal = q<HTMLVideoElement>('[data-reveal]');
  const ambient = q<HTMLVideoElement>('[data-ambient]');
  const logo = q('[data-wall-logo]');
  const toggleBtn = q<HTMLButtonElement>('[data-film-toggle]');
  const replayBtn = q<HTMLButtonElement>('[data-film-replay]');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as any).connection?.saveData === true;

  // Headline in once the first frame is ready.
  const firstImg = street.querySelector('img')!;
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  if (firstImg.complete) ready();
  else {
    firstImg.addEventListener('load', ready, { once: true });
    firstImg.addEventListener('error', ready, { once: true });
    setTimeout(ready, 1200);
  }

  function showStill() {
    still.loading = 'eager';
    street.style.opacity = '0';
    front.style.opacity = '0';
    still.style.opacity = '1';
    logo.classList.add('is-in');
  }
  if (reduce.matches || saveData) {
    hero.classList.add('no-film');
    showStill();
    return;
  }

  // --- Camera ---------------------------------------------------------------------------
  let vw = 0, vh = 0;
  let zStart = 1, zEnd = 1;
  let startC = { x: 0, y: 0 };
  const doorC = {
    x: FRONT.x + (GLASS.x + GLASS.w / 2) * FRONT.k,
    y: FRONT.y + (GLASS.y + GLASS.h / 2) * FRONT.k,
  };
  const glassW = GLASS.w * FRONT.k;
  const glassH = GLASS.h * FRONT.k;

  function measure() {
    vw = hero!.clientWidth;
    vh = hero!.clientHeight;
    zStart = Math.max(vw / STREET.w, vh / STREET.h) * 1.04;
    // End with the door glass overfilling the viewport, so the portal edges are off-screen.
    zEnd = Math.max((vw * 1.1) / glassW, (vh * 1.1) / glassH);
    // Opening frame: the whole strip, with Studio 107 sitting right of the headline on wide screens.
    const wide = vw > 760;
    // On phones the copy sits low, so frame the shop in the upper part of the screen.
    startC = wide
      ? { x: doorC.x - (vw * 0.17) / zStart, y: STREET.h * 0.52 }
      : { x: doorC.x, y: 560 + (0.5 - 0.27) * (vh / zStart) };
  }

  function place(el: HTMLElement, x: number, y: number, s: number, cx: number, cy: number, z: number) {
    const tx = vw / 2 + (x - cx) * z;
    const ty = vh / 2 + (y - cy) * z;
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${(z * s).toFixed(5)})`;
  }

  function frameAt(p: number) {
    // Zoom moves on a log scale (constant perceived speed), easing in, then accelerating at the door.
    const ez = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2.2) / 2;
    const ezz = lerp(ez, p * p * p, 0.35);
    const z = zStart * Math.pow(zEnd / zStart, ezz);
    // Camera centre glides to the door a little ahead of the zoom.
    const ec = smooth(clamp(p * 1.25, 0, 1));
    let cx = lerp(startC.x, doorC.x, ec);
    let cy = lerp(startC.y, doorC.y, ec);

    // How wide the storefront looks on screen, as a share of the viewport.
    const frontShare = (FRONT.w * FRONT.k * z) / vw;
    const frontOpacity = smoothRange(frontShare, 0.32, 0.85);
    const frontCovers = FRONT.w * FRONT.k * z > vw * 1.1 && FRONT.h * FRONT.k * z > vh * 1.1;

    // Keep the visible base layer covering the viewport (never show an edge).
    const bounds = frontCovers
      ? { x0: FRONT.x, y0: FRONT.y, x1: FRONT.x + FRONT.w * FRONT.k, y1: FRONT.y + FRONT.h * FRONT.k }
      : { x0: 0, y0: 0, x1: STREET.w, y1: STREET.h };
    const hw = vw / 2 / z, hh = vh / 2 / z;
    cx = clamp(cx, bounds.x0 + hw, bounds.x1 - hw);
    cy = clamp(cy, bounds.y0 + hh, bounds.y1 - hh);

    place(street, 0, 0, 1, cx, cy, z);
    place(front, FRONT.x, FRONT.y, FRONT.k, cx, cy, z);
    front.style.opacity = frontOpacity.toFixed(3);
    front.classList.toggle('is-solid', frontCovers);
    street.style.visibility = frontCovers ? 'hidden' : 'visible';

    // Through the glass: reflections fade and the room inside gains depth as we close in.
    const near = smoothRange(z, zEnd * 0.12, zEnd * 0.85);
    glass.style.opacity = (0.6 * (1 - near)).toFixed(3);
    const depth = Math.pow(zEnd / z, 0.32);
    inside.style.transform = `scale(${(1 / depth).toFixed(4)})`;
  }

  // --- Timeline -------------------------------------------------------------------------
  type Phase = 'approach' | 'handoff' | 'reveal' | 'ambient' | 'fallback';
  let phase: Phase = 'approach';
  let elapsed = 0; // ms inside current phase
  let last = 0;
  let raf = 0;
  let running = false;
  let userPaused = false;
  let inView = true;

  function reset() {
    cancelAnimationFrame(raf);
    phase = 'approach';
    elapsed = 0;
    street.style.opacity = '1';
    street.style.visibility = 'visible';
    [reveal, ambient, still].forEach((el) => { el.style.opacity = '0'; el.style.transform = ''; el.style.filter = ''; });
    logo.classList.remove('is-in');
    reveal.pause(); ambient.pause();
    try { reveal.currentTime = 0; } catch {}
    reveal.playbackRate = 1;
    measure();
    frameAt(0);
  }

  function loop(now: number) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (running) {
      elapsed += dt;
      step();
    }
    raf = requestAnimationFrame(loop);
  }

  function step() {
    if (phase === 'approach') {
      const p = clamp(elapsed / APPROACH_MS, 0, 1);
      frameAt(p);
      if (p >= 1) beginHandoff();
    } else if (phase === 'handoff') {
      const t = clamp(elapsed / HANDOFF_MS, 0, 1);
      const e = smooth(t);
      // Keep drifting forward while the footage fades up on top: no cut, no flash.
      const target = videoFailed ? still : reveal;
      target.style.opacity = e.toFixed(3);
      target.style.transform = `scale(${lerp(1.1, 1.05, e).toFixed(4)})`;
      if (t >= 1) {
        street.style.visibility = 'hidden';
        front.style.opacity = '0';
        phase = videoFailed ? 'fallback' : 'reveal';
        elapsed = 0;
        if (videoFailed) logo.classList.add('is-in');
      }
    } else if (phase === 'reveal') {
      const d = reveal.duration || 5.2;
      const k = clamp(reveal.currentTime / d, 0, 1);
      reveal.style.transform = `scale(${lerp(1.05, 1, smooth(k)).toFixed(4)})`;
      const remain = d - reveal.currentTime;
      if (remain < 1.4) reveal.playbackRate = Math.max(0.5, 0.5 + 0.5 * (remain / 1.4));
      if (remain < 1.6 && !logo.classList.contains('is-in')) logo.classList.add('is-in');
    } else if (phase === 'fallback') {
      const k = clamp(elapsed / 9000, 0, 1);
      still.style.transform = `scale(${lerp(1.12, 1, smooth(k)).toFixed(4)})`;
    }
  }

  let videoFailed = false;
  function beginHandoff() {
    phase = 'handoff';
    elapsed = 0;
    reveal.currentTime = 0;
    reveal.play().catch(() => {
      videoFailed = true;
      still.loading = 'eager';
    });
  }

  function toAmbient() {
    if (phase !== 'reveal') return;
    const go = () => {
      phase = 'ambient';
      try { ambient.currentTime = (ambient.duration || 10.6) / 2; } catch {}
      ambient.play().then(() => {
        ambient.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: 'forwards' });
      }).catch(() => {});
    };
    if (ambient.readyState >= 2) go();
    else ambient.addEventListener('canplay', go, { once: true });
  }
  reveal.addEventListener('ended', toAmbient);
  reveal.addEventListener('error', () => { videoFailed = true; });

  function play() {
    running = true;
    if (phase === 'reveal' && !reveal.ended) reveal.play().catch(() => {});
    if (phase === 'ambient') ambient.play().catch(() => {});
  }
  function pause() {
    running = false;
    reveal.pause();
    ambient.pause();
  }
  const shouldRun = () => inView && !userPaused && !document.hidden;
  const sync = () => (shouldRun() ? play() : pause());

  toggleBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    hero.classList.toggle('is-paused', userPaused);
    toggleBtn.setAttribute('aria-label', userPaused ? 'Play background film' : 'Pause background film');
    sync();
  });
  replayBtn.addEventListener('click', () => {
    userPaused = false;
    hero.classList.remove('is-paused');
    reset();
    last = 0;
    raf = requestAnimationFrame(loop);
    sync();
  });

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', sync);
  let rz = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { measure(); if (phase === 'approach') frameAt(clamp(elapsed / APPROACH_MS, 0, 1)); });
  });
  reduce.addEventListener?.('change', (e) => { if (e.matches) { pause(); cancelAnimationFrame(raf); hero.classList.add('no-film'); showStill(); } });

  // Fetch the ambient loop while the exterior plays.
  ambient.src = ambient.dataset.src!;
  ambient.preload = 'auto';

  reset();
  // Hold the opening frame a beat before the camera moves.
  setTimeout(() => { raf = requestAnimationFrame(loop); sync(); }, 500);
}
