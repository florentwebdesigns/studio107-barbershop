import { hours, formatTime, business } from '../data/business';

/* ---------- Live open/closed status (shop's own time zone) ---------- */
function shopNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: business.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export function updateOpenStatus() {
  const { day, minutes } = shopNow();
  if (day < 0) return;
  const today = hours[day];
  let open = false;
  let long = '';
  let short = '';

  if (today.open && today.close && minutes >= toMin(today.open) && minutes < toMin(today.close)) {
    open = true;
    long = `Open now · until ${formatTime(today.close)} today`;
    short = `Open until ${formatTime(today.close)}`;
  } else {
    // Find the next opening.
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const h = hours[d];
      if (!h.open) continue;
      if (i === 0 && minutes >= toMin(h.open)) continue;
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : h.day;
      long = `Closed now · opens ${when} at ${formatTime(h.open)}`;
      short = `Closed · opens ${i === 0 ? '' : when + ' '}${formatTime(h.open)}`.replace('  ', ' ');
      break;
    }
  }
  document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => (el.textContent = long));
  document.querySelectorAll<HTMLElement>('[data-open-short]').forEach((el) => (el.textContent = short));
  document.querySelectorAll<HTMLElement>('[data-open-dot]').forEach((el) => el.classList.toggle('is-open', open));
  document.querySelectorAll<HTMLElement>('[data-day]').forEach((row) => row.classList.toggle('is-today', row.dataset.day === today.schemaDay));
}

/* ---------- Navigation ---------- */
function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const mbar = document.querySelector<HTMLElement>('[data-mbar]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!nav) return;

  let lastY = window.scrollY;
  let menuOpen = false;
  const onScroll = () => {
    const y = window.scrollY;
    const heroH = hero?.offsetHeight ?? 600;
    nav.classList.toggle('is-solid', y > 40);
    // Hide on scroll down past the hero, reveal on scroll up.
    nav.classList.toggle('is-hidden', !menuOpen && y > heroH && y > lastY + 4);
    if (y < lastY - 4 || y < heroH) nav.classList.remove('is-hidden');
    mbar?.classList.toggle('is-visible', y > heroH * 0.6 && !menuOpen);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setMenu = (open: boolean) => {
    if (!toggle || !menu) return;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only')!.textContent = open ? 'Close menu' : 'Open menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-solid', open || window.scrollY > 40);
    nav.classList.remove('is-hidden');
    mbar?.classList.toggle('is-visible', !open && window.scrollY > (hero?.offsetHeight ?? 600) * 0.6);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 800);
    }
  };
  toggle?.addEventListener('click', () => setMenu(!menuOpen));
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle?.focus(); } });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  // Active section highlight
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-navlink]'));
  const sections = links.map((l) => document.querySelector<HTMLElement>(l.getAttribute('href')!)).filter(Boolean) as HTMLElement[];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = '#' + e.target.id;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ---------- Scroll reveals ---------- */
function initReveals() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

/* ---------- Subtle parallax ---------- */
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!els.length) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const speed = Number(el.dataset.parallax);
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      const target = (el.querySelector('img') ?? el) as HTMLElement;
      target.style.translate = `0 ${offset.toFixed(1)}px`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

export function initSite() {
  updateOpenStatus();
  setInterval(updateOpenStatus, 60_000);
  initNav();
  initReveals();
  initParallax();
}
