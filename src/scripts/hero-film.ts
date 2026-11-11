/**
 * Cinematic hero: a directed sequence built from the real Studio 107 media.
 *
 *   01 Mountain Ave    street-level exterior, slow push toward the storefront
 *   02 The front door  close storefront shot, accelerating push into the door glass
 *   03 Inside          light bloom → real interior footage pulling back to reveal the floor
 *   04 Studio 107      seamless ambient loop of the interior (ping-pong of the same footage)
 *
 * Everything runs on the Web Animations API so the whole film can be paused, resumed,
 * replayed, and skipped for reduced-motion users. No dependencies.
 */

type Scene = HTMLElement;

const T = {
  streetEnd: 3700,
  frontIn: 3000,
  frontEnd: 7200,
  flash: 6350,
  reveal: 6750,
};

export function initHeroFilm() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const q = <E extends Element = HTMLElement>(s: string) => hero.querySelector<E>(s)!;
  const street = q<Scene>('[data-scene="street"]');
  const front = q<Scene>('[data-scene="front"]');
  const still = q<Scene>('[data-scene="still"]');
  const reveal = q<HTMLVideoElement>('[data-scene="reveal"]');
  const ambient = q<HTMLVideoElement>('[data-scene="ambient"]');
  const flash = q<HTMLElement>('[data-flash]');
  const chapters = Array.from(hero.querySelectorAll<HTMLElement>('[data-chapter]'));
  const toggleBtn = q<HTMLButtonElement>('[data-film-toggle]');
  const replayBtn = q<HTMLButtonElement>('[data-film-replay]');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as any).connection?.saveData === true;
  const small = () => window.matchMedia('(max-width: 700px)').matches;

  // Reveal the headline once the first frame is ready.
  const firstImg = street.querySelector('img')!;
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  if (firstImg.complete) ready();
  else {
    firstImg.addEventListener('load', ready, { once: true });
    firstImg.addEventListener('error', ready, { once: true });
    setTimeout(ready, 1200);
  }

  // ---------- Static mode (reduced motion / data saver) ----------
  function showStill() {
    loadStill();
    [street, front, reveal, ambient].forEach((el) => (el.style.opacity = '0'));
    still.style.opacity = '1';
  }
  function loadStill() {
    const img = still.querySelector('img')!;
    img.loading = 'eager';
  }

  if (reduce.matches || saveData) {
    hero.classList.add('no-film');
    showStill();
    return;
  }

  // ---------- Film ----------
  let anims: Animation[] = [];
  let userPaused = false;
  let inView = true;
  let phase: 'intro' | 'reveal' | 'ambient' | 'fallback' = 'intro';
  let raf = 0;
  let clock: Animation | null = null;
  let videoFailed = false;

  const blur = (px: number) => (small() ? 'none' : `blur(${px}px)`);

  function add(el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    const a = el ? (el as HTMLElement).animate(frames, { fill: 'both', ...opts }) : new Animation(new KeyframeEffect(null, [], { fill: 'both', ...opts }));
    if (!el) a.play();
    anims.push(a);
    return a;
  }

  function setChapter(i: number, progress: number) {
    chapters.forEach((c, idx) => {
      c.classList.toggle('is-active', idx === i);
      c.classList.toggle('is-done', idx < i);
      const bar = c.querySelector<HTMLElement>('.chapter__bar i');
      if (bar) bar.style.setProperty('--p', String(idx < i ? 1 : idx === i ? progress : 0));
    });
  }

  function tick() {
    if (phase === 'intro' && clock) {
      const t = Number(clock.currentTime ?? 0);
      if (t < T.frontIn + 200) setChapter(0, Math.min(1, t / (T.frontIn + 200)));
      else setChapter(1, Math.min(1, (t - T.frontIn - 200) / (T.reveal - T.frontIn - 200)));
    } else if (phase === 'reveal') {
      const d = reveal.duration || 5.2;
      setChapter(2, Math.min(1, reveal.currentTime / d));
      // Ease the camera into the slower ambient loop over the final stretch.
      const remain = d - reveal.currentTime;
      if (remain < 1.4) reveal.playbackRate = Math.max(0.5, 0.5 + 0.5 * (remain / 1.4));
    } else if (phase === 'ambient' || phase === 'fallback') {
      setChapter(3, 1);
    }
    raf = requestAnimationFrame(tick);
  }

  function resetVisuals() {
    anims.forEach((a) => a.cancel());
    anims = [];
    [street, front, still, reveal, ambient, flash].forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.filter = '';
    });
    reveal.pause();
    ambient.pause();
    try { reveal.currentTime = 0; } catch {}
    reveal.playbackRate = 1;
  }

  function start() {
    resetVisuals();
    phase = 'intro';
    userPaused = false;
    hero.classList.remove('is-paused');
    toggleBtn.setAttribute('aria-label', 'Pause background film');

    const glide = 'cubic-bezier(0.33, 0, 0.2, 1)';

    // 01 — Street approach
    // On wide screens, drift the storefront to the right so it isn't hidden behind the headline.
    const tx = small() ? 0 : 18;
    add(street, [
      { transform: 'translateX(0) scale(1.04)', opacity: 1, easing: glide },
      { transform: `translateX(${tx}%) scale(1.85)`, opacity: 1, offset: 0.82, easing: 'ease-in' },
      { transform: `translateX(${tx * 1.2}%) scale(2.15)`, opacity: 0 },
    ], { duration: T.streetEnd, easing: 'linear' });

    // 02 — Storefront, pushing into the door
    add(front, [
      { opacity: 0, transform: 'scale(1.16)', easing: 'ease-out' },
      { opacity: 1, transform: 'scale(1.05)', filter: 'none', offset: 0.17, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      { opacity: 1, transform: 'scale(1.5)', filter: 'none', offset: 0.6, easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)' },
      { opacity: 1, transform: 'scale(3.2)', filter: blur(5), offset: 0.93 },
      { opacity: 0, transform: 'scale(3.6)', filter: blur(8) },
    ], { delay: T.frontIn, duration: T.frontEnd - T.frontIn, easing: 'linear' });
    // Warm light bloom as the camera passes through the glass.
    add(flash, [
      { opacity: 0 }, { opacity: 0.85, offset: 0.4 }, { opacity: 0 },
    ], { delay: T.flash, duration: 1150, easing: 'ease-in-out' });

    // 03 — Interior reveal, triggered on the clock
    clock = add(null, [], { duration: T.reveal });
    clock.onfinish = beginReveal;

    // Begin fetching the ambient loop while the exterior plays.
    if (!ambient.src) {
      ambient.src = ambient.dataset.src!;
      ambient.preload = 'auto';
    }

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  async function beginReveal() {
    phase = 'reveal';
    try {
      reveal.currentTime = 0;
      await reveal.play();
    } catch {
      videoFailed = true;
    }
    if (videoFailed) return fallback();

    add(reveal, [
      { opacity: 0, transform: 'scale(1.32)', filter: blur(10) },
      { opacity: 1, transform: 'scale(1.12)', filter: blur(2), offset: 0.4 },
      { opacity: 1, transform: 'scale(1)', filter: 'none' },
    ], { duration: 1700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function fallback() {
    // Autoplay unavailable (e.g. low-power mode): keep the journey with the real interior photo.
    phase = 'fallback';
    loadStill();
    add(still, [
      { opacity: 0, transform: 'scale(1.25)', filter: blur(8) },
      { opacity: 1, transform: 'scale(1.06)', filter: 'none', offset: 0.25 },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 9000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function toAmbient() {
    if (phase !== 'reveal') return;
    const go = () => {
      phase = 'ambient';
      try { ambient.currentTime = (ambient.duration || 10.6) / 2; } catch {}
      ambient.play().then(() => {
        add(ambient, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
      }).catch(() => {});
    };
    if (ambient.readyState >= 2) go();
    else ambient.addEventListener('canplay', go, { once: true });
  }
  reveal.addEventListener('ended', toAmbient);
  reveal.addEventListener('error', () => { videoFailed = true; if (phase === 'reveal') fallback(); });

  // ---------- Controls ----------
  function pauseAll() {
    anims.forEach((a) => a.playState === 'running' && a.pause());
    reveal.pause();
    ambient.pause();
  }
  function resumeAll() {
    anims.forEach((a) => a.playState === 'paused' && a.play());
    if (phase === 'reveal' && !reveal.ended) reveal.play().catch(() => {});
    if (phase === 'ambient') ambient.play().catch(() => {});
  }

  toggleBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    hero.classList.toggle('is-paused', userPaused);
    toggleBtn.setAttribute('aria-label', userPaused ? 'Play background film' : 'Pause background film');
    userPaused ? pauseAll() : resumeAll();
  });
  replayBtn.addEventListener('click', start);

  // Save battery: pause when the hero is off-screen or the tab is hidden.
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (!inView) pauseAll();
    else if (!userPaused) resumeAll();
  }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAll();
    else if (inView && !userPaused) resumeAll();
  });
  reduce.addEventListener?.('change', (e) => { if (e.matches) { resetVisuals(); hero.classList.add('no-film'); showStill(); cancelAnimationFrame(raf); } });

  start();
}
