import { business, dayOrder, dayNames, type DayKey, type DayHours } from '../data/business';

/** "20:00" -> "8 PM", "09:30" -> "9:30 AM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

export function formatRange(hours: DayHours): string {
  return hours ? `${formatTime(hours.open)} – ${formatTime(hours.close)}` : 'Closed';
}

/** Rows for an hours table, Monday first. */
export function hoursRows() {
  return dayOrder.map((key) => ({
    key,
    day: dayNames[key],
    short: dayNames[key].slice(0, 3),
    range: formatRange(business.hours[key]),
    closed: business.hours[key] === null,
  }));
}

/** Groups consecutive days with identical hours, e.g. "Mon – Fri · 9 AM – 8 PM". */
export function hoursSummary() {
  const groups: { from: DayKey; to: DayKey; range: string }[] = [];
  for (const key of dayOrder) {
    const range = formatRange(business.hours[key]);
    const last = groups[groups.length - 1];
    if (last && last.range === range) last.to = key;
    else groups.push({ from: key, to: key, range });
  }
  return groups.map((g) => ({
    days:
      g.from === g.to
        ? dayNames[g.from].slice(0, 3)
        : `${dayNames[g.from].slice(0, 3)} – ${dayNames[g.to].slice(0, 3)}`,
    range: g.range,
  }));
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Current weekday and minutes past midnight in the shop's timezone. */
export function shopNow(date = new Date(), timeZone: string = business.timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = get('weekday').toLowerCase().slice(0, 3) as DayKey;
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  return { day, minutes };
}

export type OpenStatus = {
  open: boolean;
  today: DayKey;
  /** "Open now" or "Closed" */
  label: string;
  /** "Until 8 PM", "Closes soon · 8 PM", "Opens tomorrow 9 AM" */
  detail: string;
};

/** Live open/closed status, computed in the shop's timezone (America/New_York). */
export function openStatus(date = new Date()): OpenStatus {
  const { day, minutes } = shopNow(date);
  const today = business.hours[day];
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    const left = toMinutes(today.close) - minutes;
    return {
      open: true,
      today: day,
      label: 'Open now',
      detail: left <= 60 ? `Closes soon · ${formatTime(today.close)}` : `Until ${formatTime(today.close)}`,
    };
  }
  const start = dayOrder.indexOf(day);
  for (let i = 0; i < 8; i++) {
    const key = dayOrder[(start + i) % 7];
    const h = business.hours[key];
    if (!h) continue;
    if (i === 0 && minutes >= toMinutes(h.open)) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : dayNames[key].slice(0, 3);
    return { open: false, today: day, label: 'Closed', detail: `Opens ${when} ${formatTime(h.open)}` };
  }
  return { open: false, today: day, label: 'Closed', detail: '' };
}
