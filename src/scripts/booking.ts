/**
 * Booking form (same flow as the One Cut site): the visitor picks a service, day and time, adds their name and
 * phone, and the form writes the request out as a text message to the shop. Desktop visitors get a QR code that
 * opens the same text on their phone.
 *
 * Hooks for later:
 *  - business.booking.endpoint: when set, requests are sent there (form POST) instead of opening Messages,
 *    e.g. a Google Apps Script web app that adds them to the shop's Google Calendar.
 *  - Analytics: every step pushes an event to window.dataLayer (Google Tag Manager / GA4) and dispatches a
 *    `booking:*` DOM event with the same details, so any analytics script can listen for it.
 */
import qrcode from 'qrcode-generator';
import { smsLink } from '../lib/links';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Hours = Record<DayKey, { open: string; close: string } | null>;
type Config = { hours: Hours; timezone: string; sms: string; shop: string; endpoint: string | null };

const KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SLOT = 30; // minutes
const DAYS_AHEAD = 14;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** Today's calendar date and current minutes in the shop's timezone. */
function shopToday(tz: string) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g('year'), m: g('month') - 1, d: g('day'), minutes: (g('hour') % 24) * 60 + g('minute') };
}

type Day = { iso: string; key: DayKey; label: string; dow: string; num: number; mon: string; slots: number[] };

function upcomingDays(cfg: Config): Day[] {
  const t = shopToday(cfg.timezone);
  const out: Day[] = [];
  for (let i = 0; out.length < 10 && i < DAYS_AHEAD; i++) {
    const date = new Date(Date.UTC(t.y, t.m, t.d + i, 12));
    const key = KEYS[date.getUTCDay()];
    const h = cfg.hours[key];
    if (!h) continue;
    const open = toMin(h.open);
    const close = toMin(h.close);
    const slots: number[] = [];
    for (let s = open; s <= close - SLOT; s += SLOT) {
      if (i === 0 && s < t.minutes + 30) continue;
      slots.push(s);
    }
    if (!slots.length) continue;
    out.push({
      iso: date.toISOString().slice(0, 10),
      key,
      label: `${i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}${DOW[date.getUTCDay()]} ${MON[date.getUTCMonth()]} ${date.getUTCDate()}`,
      dow: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DOW[date.getUTCDay()],
      num: date.getUTCDate(),
      mon: MON[date.getUTCMonth()],
      slots,
    });
  }
  return out;
}

const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const isTouch = () => matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/.test(navigator.userAgent);

/** Format a US number as (973) 555-0123 while typing; leaves anything else alone. */
const prettyPhone = (v: string) => {
  const d = v.replace(/\D/g, '').replace(/^1(?=\d{10})/, '');
  if (d.length !== 10) return v.trim();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
function track(event: string, detail: Record<string, unknown> = {}) {
  try {
    window.dataLayer?.push({ event, ...detail });
    document.dispatchEvent(new CustomEvent(event.replace('_', ':'), { detail }));
  } catch {
    /* analytics must never break booking */
  }
}

export function initBooking() {
  const form = document.querySelector<HTMLFormElement>('[data-booking]');
  if (!form) return;
  const cfg: Config = JSON.parse(form.dataset.config || '{}');
  if (isTouch()) document.documentElement.classList.add('is-touch');

  const daysBox = form.querySelector<HTMLElement>('[data-days]')!;
  const timeSel = form.querySelector<HTMLSelectElement>('[data-times]')!;
  const stepForm = form.querySelector<HTMLElement>('[data-step="form"]')!;
  const stepDone = form.querySelector<HTMLElement>('[data-step="done"]')!;
  const stepSent = form.querySelector<HTMLElement>('[data-step="sent"]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const notesInput = form.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')!;
  const fields = {
    name: form.querySelector<HTMLInputElement>('input[name="name"]')!,
    phone: form.querySelector<HTMLInputElement>('input[name="phone"]')!,
  };
  const errors = {
    name: form.querySelector<HTMLElement>('[data-error="name"]')!,
    phone: form.querySelector<HTMLElement>('[data-error="phone"]')!,
  };
  const valid = {
    name: () => fields.name.value.trim().length > 1,
    phone: () => fields.phone.value.replace(/\D/g, '').length >= 10,
  };

  const days = upcomingDays(cfg);
  daysBox.innerHTML = '';
  days.forEach((d, i) => {
    const label = document.createElement('label');
    label.className = 'bk__chip bk__day';
    label.innerHTML = `<input type="radio" name="day" value="${d.iso}" ${i === 0 ? 'checked' : ''} aria-label="${d.label}">
      <span class="bk__day-dow">${d.dow}</span><span class="bk__day-num tnum">${d.num}</span><span class="bk__day-mon">${d.mon}</span>`;
    daysBox.appendChild(label);
  });

  const fillTimes = () => {
    const iso = (form.querySelector<HTMLInputElement>('input[name="day"]:checked') || ({} as HTMLInputElement)).value;
    const day = days.find((d) => d.iso === iso);
    const prev = timeSel.value;
    timeSel.innerHTML = '<option value="">First available</option>';
    day?.slots.forEach((s) => {
      const o = document.createElement('option');
      o.value = fmt(s);
      o.textContent = fmt(s);
      timeSel.appendChild(o);
    });
    if ([...timeSel.options].some((o) => o.value === prev)) timeSel.value = prev;
  };
  daysBox.addEventListener('change', fillTimes);
  fillTimes();

  // Any "Book" link on the page can pre-select a service or add a note:
  // <a href="#book" data-book-service="Kids Haircut"> · <a href="#book" data-book-note="Like the photo: ...">
  let started = false;
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-book-service], [data-book-note], a[href="#book"]');
    if (!t) return;
    const svc = t.dataset.bookService;
    if (svc) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="service"][value="${CSS.escape(svc)}"]`);
      if (radio) radio.checked = true;
    }
    const note = t.dataset.bookNote;
    if (note && !notesInput.value.includes(note)) notesInput.value = notesInput.value ? `${notesInput.value}\n${note}` : note;
    track('booking_cta', { service: svc || null, from: t.closest('section')?.id || t.closest('header, nav, footer')?.tagName.toLowerCase() || null });
  });
  form.addEventListener('input', () => {
    if (started) return;
    started = true;
    track('booking_start');
  });

  const read = () => {
    const fd = new FormData(form);
    const service = String(fd.get('service') || '');
    const svcInput = form.querySelector<HTMLInputElement>(`input[name="service"][value="${CSS.escape(service)}"]`);
    const iso = String(fd.get('day') || fd.get('date') || '');
    const day = days.find((d) => d.iso === iso);
    return {
      service,
      price: svcInput?.dataset.price || '',
      date: iso,
      dateLabel: day ? day.label : iso || 'Flexible',
      time: String(fd.get('time') || '') || 'First available',
      name: String(fd.get('name') || '').trim(),
      phone: prettyPhone(String(fd.get('phone') || '')),
      notes: String(fd.get('notes') || '').trim(),
    };
  };

  const compose = (r: ReturnType<typeof read>) => {
    const lines = [
      `Hi ${cfg.shop}! I'd like to book an appointment.`,
      `Service: ${r.service}${r.price ? ` (${r.price})` : ''}`,
      `Day: ${r.dateLabel}`,
      `Time: ${r.time}`,
      `Name: ${r.name}`,
      `Phone: ${r.phone}`,
    ];
    if (r.notes) lines.push(`Notes: ${r.notes}`);
    lines.push(`(Sent from the ${cfg.shop} website)`);
    return lines.join('\n');
  };

  const renderQR = (text: string) => {
    const box = form.querySelector<HTMLElement>('[data-qr]')!;
    try {
      (qrcode as unknown as { stringToBytes: unknown; stringToBytesFuncs: Record<string, unknown> }).stringToBytes =
        (qrcode as unknown as { stringToBytesFuncs: Record<string, unknown> }).stringToBytesFuncs['UTF-8'];
      const qr = qrcode(0, 'M');
      qr.addData(`SMSTO:${cfg.sms}:${text}`);
      qr.make();
      const n = qr.getModuleCount();
      let path = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
      box.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${path}" fill="#0b0b0c"/></svg>`;
    } catch {
      form.querySelector<HTMLElement>('[data-qr-wrap]')!.hidden = true;
    }
  };

  const showError = (k: keyof typeof fields, on: boolean) => {
    if (on) fields[k].setAttribute('aria-invalid', 'true');
    else fields[k].removeAttribute('aria-invalid');
    errors[k].hidden = !on;
  };
  // Validate on blur, clear as soon as it's fixed
  (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => {
    fields[k].addEventListener('blur', () => fields[k].value && showError(k, !valid[k]()));
    fields[k].addEventListener('input', () => valid[k]() && showError(k, false));
  });
  fields.phone.addEventListener('blur', () => (fields.phone.value = prettyPhone(fields.phone.value)));

  const showStep = (step: HTMLElement) => {
    [stepForm, stepDone, stepSent].forEach((s) => (s.hidden = s !== step));
    step.focus({ preventScroll: true });
    form.closest('.book__card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const openText = (r: ReturnType<typeof read>) => {
    const text = compose(r);
    const href = smsLink(text, isApple(), cfg.sms);
    form.querySelector<HTMLAnchorElement>('[data-sms-open]')!.href = href;
    form.querySelector<HTMLElement>('[data-preview]')!.textContent = text;
    renderQR(text);
    showStep(stepDone);
    if (isTouch()) window.location.href = href;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = (Object.keys(fields) as (keyof typeof fields)[]).filter((k) => !valid[k]());
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => showError(k, bad.includes(k)));
    if (bad.length) {
      fields[bad[0]].focus();
      return;
    }

    const r = read();
    track('booking_submit', { service: r.service, date: r.date, time: r.time, method: cfg.endpoint ? 'endpoint' : 'sms' });

    if (cfg.endpoint) {
      submitBtn.disabled = true;
      submitBtn.dataset.label ??= submitBtn.innerHTML;
      submitBtn.textContent = 'Sending…';
      try {
        const body = new URLSearchParams({ ...r, source: location.href, submittedAt: new Date().toISOString() });
        // no-cors: Google Apps Script and most form endpoints accept this; the response is not readable
        await fetch(cfg.endpoint, { method: 'POST', mode: 'no-cors', body });
        form.querySelector<HTMLElement>('[data-sent-summary]')!.textContent =
          `${r.service} · ${r.dateLabel} · ${r.time}`;
        showStep(stepSent);
        track('booking_sent', { service: r.service, date: r.date, time: r.time });
      } catch {
        // If the endpoint can't be reached, fall back to the text so the request isn't lost
        openText(r);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.label!;
      }
      return;
    }
    openText(r);
  });

  form.querySelector('[data-sms-open]')!.addEventListener('click', () => track('booking_text_opened'));

  form.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => {
      showStep(stepForm);
      fields.name.focus({ preventScroll: true });
    }),
  );

  form.querySelector('[data-copy]')!.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = form.querySelector<HTMLElement>('[data-preview]')!.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(form.querySelector('[data-preview]')!);
      const s = getSelection();
      s?.removeAllRanges();
      s?.addRange(range);
      btn.textContent = 'Selected, now copy it';
    }
    window.setTimeout(() => (btn.textContent = 'Copy text'), 2400);
  });
}
