type Item = { src: string; alt: string; caption: string; video?: string; width: number; height: number };

export function initGallery() {
  const dataEl = document.getElementById('gallery-data');
  const dlg = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  if (!dataEl || !dlg) return;
  const items: Item[] = JSON.parse(dataEl.textContent || '[]');
  const media = dlg.querySelector<HTMLElement>('[data-lb-media]')!;
  const cap = dlg.querySelector<HTMLElement>('[data-lb-cap]')!;
  const count = dlg.querySelector<HTMLElement>('[data-lb-count]')!;
  let index = 0;
  let opener: HTMLElement | null = null;

  function render() {
    const it = items[index];
    media.replaceChildren();
    if (it.video) {
      const v = document.createElement('video');
      Object.assign(v, { src: it.video, muted: true, loop: true, playsInline: true, autoplay: true, controls: true, poster: it.src });
      v.setAttribute('aria-label', it.alt);
      media.append(v);
      v.play().catch(() => {});
    } else {
      const img = new Image();
      img.src = it.src;
      img.alt = it.alt;
      img.width = it.width;
      img.height = it.height;
      img.decoding = 'async';
      media.append(img);
    }
    cap.textContent = it.caption;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  }

  const go = (d: number) => { index = (index + d + items.length) % items.length; render(); };

  document.querySelectorAll<HTMLElement>('[data-lightbox-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      opener = btn;
      index = Number(btn.dataset.lightboxOpen);
      render();
      dlg.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
  });
  dlg.querySelector('[data-lb-close]')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-lb-prev]')!.addEventListener('click', () => go(-1));
  dlg.querySelector('[data-lb-next]')!.addEventListener('click', () => go(1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target === dlg.querySelector('[data-lb-stage]')) dlg.close(); });
  dlg.addEventListener('close', () => {
    media.replaceChildren();
    document.documentElement.style.overflow = '';
    opener?.focus();
  });

  // Swipe on touch devices
  let x0: number | null = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    x0 = null;
  });

  // Hover-to-play on gallery tiles that have footage (pointer devices only)
  if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    document.querySelectorAll<HTMLVideoElement>('[data-hover-video]').forEach((v) => {
      const btn = v.closest('button')!;
      btn.addEventListener('mouseenter', () => {
        if (!v.src) v.src = v.dataset.hoverVideo!;
        v.play().then(() => v.classList.add('is-playing')).catch(() => {});
      });
      btn.addEventListener('mouseleave', () => { v.pause(); });
    });
  }
}
