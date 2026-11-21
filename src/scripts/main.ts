import { openStatus, shopNow } from '../lib/hours';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── Nav: solid on scroll, active section ───────── */
function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const mbar = document.querySelector<HTMLElement>('[data-mbar]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!nav) return;
  // With the opening intro on the page, the nav stays clear over it and the mobile bar waits for the site
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  const onScroll = () => {
    const y = window.scrollY;
    const start = intro ? intro.offsetHeight - window.innerHeight * 0.2 : 0;
    nav.classList.toggle('is-solid', y > start + 40);
    if (mbar && hero) mbar.classList.toggle('is-on', y > start + hero.offsetHeight * 0.75);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-navlink]')];
  const sections = links
    .map((a) => document.querySelector<HTMLElement>(a.getAttribute('href')!))
    .filter(Boolean) as HTMLElement[];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = `#${e.target.id}`;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id && id !== '#top'));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}

/* ───────── Mobile full-screen menu ───────── */
function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu) return;
  let open = false;
  let lastFocus: HTMLElement | null = null;

  const set = (next: boolean) => {
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close menu' : 'Open menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      lastFocus = document.activeElement as HTMLElement;
      menu.hidden = false;
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
      });
    } else {
      menu.classList.remove('is-open');
      window.setTimeout(() => {
        if (!open) menu.hidden = true;
      }, reduced ? 0 : 700);
      lastFocus?.focus({ preventScroll: true });
    }
  };
  toggle.addEventListener('click', () => set(!open));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') set(false);
    if (e.key === 'Tab') {
      const f = [toggle, ...menu.querySelectorAll<HTMLElement>('a, button')];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  matchMedia('(min-width: 761px)').addEventListener('change', (e) => e.matches && open && set(false));
}

/* ───────── Scroll reveals ───────── */
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal], [data-split]');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
  // Hero copy plays on load (when the intro is on the page, it plays as the hero scrolls in instead)
  if (document.querySelector('[data-intro]')) return;
  document.querySelectorAll<HTMLElement>('.hero [data-reveal], .hero [data-split]').forEach((el) => {
    requestAnimationFrame(() => el.classList.add('is-in'));
  });
}

/* ───────── Statement: words light up with scroll ───────── */
function initScrub() {
  const el = document.querySelector<HTMLElement>('[data-scrub]');
  if (!el) return;
  const words = [...el.querySelectorAll<HTMLElement>('.w')];
  if (reduced) {
    words.forEach((w) => w.classList.add('is-lit'));
    return;
  }
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const lit = Math.round(p * words.length * 1.15);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/* ───────── Gentle image parallax ───────── */
function initParallax() {
  if (reduced) return;
  const els = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (!els.length) return;
  const visible = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement)));
  });
  els.forEach((el) => {
    io.observe(el);
    el.style.willChange = 'transform';
  });
  const tick = () => {
    const vh = window.innerHeight;
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const k = parseFloat(el.dataset.parallax || '0');
      const off = (r.top + r.height / 2 - vh / 2) * k;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0) scale(${1 + Math.abs(k) * 1.6})`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ───────── Live open/closed status (America/New_York) ───────── */
function initStatus() {
  const update = () => {
    const s = openStatus();
    document.querySelectorAll<HTMLElement>('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', s.open);
      const l = el.querySelector('[data-status-label]');
      const d = el.querySelector('[data-status-detail]');
      if (l) l.textContent = s.label;
      if (d) d.textContent = s.detail;
    });
    const { day } = shopNow();
    document.querySelectorAll<HTMLElement>('[data-hours] tr').forEach((tr) => {
      tr.classList.toggle('is-today', tr.dataset.day === day);
    });
  };
  update();
  window.setInterval(update, 60_000);
}

/* ───────── Map: load the embed on demand ───────── */
function initMap() {
  const box = document.querySelector<HTMLElement>('[data-map]');
  if (!box) return;
  const load = () => {
    if (box.classList.contains('is-loaded')) return;
    const f = document.createElement('iframe');
    f.src = box.dataset.src!;
    f.title = 'Map showing Studio 107 Barbershop at 265 Mountain Avenue, Springfield, NJ';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    box.appendChild(f);
    box.classList.add('is-loaded');
  };
  box.querySelector('[data-map-load]')?.addEventListener('click', load);
  // On the live site, load automatically as the section approaches.
  if (window.self === window.top) {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          load();
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(box);
  }
}

/* ───────── Lightbox: keyboard, swipe, focus trap ───────── */
function initLightbox() {
  const lb = document.querySelector<HTMLElement>('[data-lightbox]');
  const triggers = [...document.querySelectorAll<HTMLButtonElement>('[data-lightbox-index]')];
  if (!lb || !triggers.length) return;
  const img = lb.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const cap = lb.querySelector<HTMLElement>('[data-lb-caption]')!;
  const count = lb.querySelector<HTMLElement>('[data-lb-count]')!;
  const btnClose = lb.querySelector<HTMLButtonElement>('[data-lb-close]')!;
  const btnPrev = lb.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const btnNext = lb.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  const book = lb.querySelector<HTMLAnchorElement>('[data-lb-book]');
  const bookLabel = lb.querySelector<HTMLElement>('[data-lb-book-label]');
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number, animate = true) => {
    index = (i + triggers.length) % triggers.length;
    const t = triggers[index];
    const apply = () => {
      img.src = t.dataset.full!;
      img.alt = t.dataset.alt || '';
      cap.textContent = t.dataset.caption || '';
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(triggers.length).padStart(2, '0')}`;
      // Photos of the shop's work: "Book a cut like this" carries the photo into the booking notes
      const cut = t.dataset.kind === 'cut';
      if (bookLabel) bookLabel.textContent = cut ? 'Book a cut like this' : 'Book your chair';
      if (book) {
        if (cut) book.dataset.bookNote = `Like gallery photo ${index + 1}: ${t.dataset.caption || ''}`.trim();
        else delete book.dataset.bookNote;
      }
      img.decode?.().catch(() => {}).finally(() => img.classList.remove('is-swap'));
    };
    if (animate && !reduced) {
      img.classList.add('is-swap');
      window.setTimeout(apply, 220);
    } else apply();
    // preload neighbour
    const n = new Image();
    n.src = triggers[(index + 1) % triggers.length].dataset.full!;
  };
  const open = (i: number) => {
    opener = document.activeElement as HTMLElement;
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    show(i, false);
    requestAnimationFrame(() => lb.classList.add('is-open'));
    btnClose.focus({ preventScroll: true });
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    window.setTimeout(() => (lb.hidden = true), reduced ? 0 : 500);
    opener?.focus({ preventScroll: true });
  };

  triggers.forEach((t, i) => t.addEventListener('click', () => open(i)));
  lb.querySelector('[data-lb-book]')?.addEventListener('click', () => {
    opener = null;
    close();
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb || (e.target as HTMLElement).matches('[data-lb-stage]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'Tab') {
      const f = [btnClose, btnPrev, btnNext];
      const at = f.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  // Swipe
  let sx = 0;
  let sy = 0;
  lb.addEventListener(
    'touchstart',
    (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    },
    { passive: true },
  );
  lb.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) show(index + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
    },
    { passive: true },
  );
}

/* ───────── Section joins: open the seam glow as each join scrolls into view ───────── */
function initSeams() {
  const seams = document.querySelectorAll<HTMLElement>('.seam');
  if (reduced || !('IntersectionObserver' in window)) {
    seams.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  seams.forEach((el) => io.observe(el));
}

// Each feature starts on its own, so one failing can never take the others (or the text reveals) down with it.
const run = (fn: () => void) => {
  try {
    fn();
  } catch (err) {
    console.warn('[one-cut]', err);
  }
};
run(initReveal);
document.documentElement.classList.add('reveal-ready');
[initNav, initMenu, initSeams, initScrub, initParallax, initStatus, initMap, initLightbox].forEach(run);
