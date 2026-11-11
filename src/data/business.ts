/**
 * Single source of truth for Studio 107's verified business details.
 * Everything on the site (copy, structured data, footer, CTAs) reads from here.
 * Only edit with information confirmed by the shop.
 */

export const business = {
  name: 'Studio 107 Barbershop',
  shortName: 'Studio 107',
  category: "Professional Barbershop · Men's Haircuts & Grooming",
  address: {
    street: '265 Mountain Ave',
    city: 'Springfield',
    region: 'NJ',
    regionName: 'New Jersey',
    postalCode: '07081',
    country: 'US',
  },
  phone: {
    display: '(973) 376-9661',
    international: '+1 (973) 376-9661',
    href: 'tel:+19733769661',
    e164: '+19733769661',
  },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=265+Mountain+Ave+Springfield+NJ+07081',
  mapsEmbedUrl: 'https://www.google.com/maps?q=265+Mountain+Ave,+Springfield,+NJ+07081&output=embed',
  timeZone: 'America/New_York',

  /**
   * Online booking. Leave as null until the shop confirms a booking provider.
   * While null, every booking CTA becomes "Call to Book" using the phone link.
   * Example: { label: 'Book Online', url: 'https://...' }
   */
  booking: null as null | { label: string; url: string },

  /** Social profiles: add verified URLs only. e.g. { label: 'Instagram', url: 'https://instagram.com/...' } */
  social: [] as { label: string; url: string }[],
};

/** 0 = Sunday … 6 = Saturday. Times are 24h "HH:MM" in the shop's time zone. */
export type DayHours = { day: string; short: string; schemaDay: string; open: string | null; close: string | null };

export const hours: DayHours[] = [
  { day: 'Sunday', short: 'Sun', schemaDay: 'Sunday', open: null, close: null },
  { day: 'Monday', short: 'Mon', schemaDay: 'Monday', open: '09:00', close: '18:00' },
  { day: 'Tuesday', short: 'Tue', schemaDay: 'Tuesday', open: '09:00', close: '18:00' },
  { day: 'Wednesday', short: 'Wed', schemaDay: 'Wednesday', open: '09:00', close: '18:00' },
  { day: 'Thursday', short: 'Thu', schemaDay: 'Thursday', open: '09:00', close: '18:00' },
  { day: 'Friday', short: 'Fri', schemaDay: 'Friday', open: '09:00', close: '18:00' },
  { day: 'Saturday', short: 'Sat', schemaDay: 'Saturday', open: '08:00', close: '16:00' },
];

/** Monday-first order for display. */
export const hoursMondayFirst = [...hours.slice(1), hours[0]];

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hr} ${suffix}` : `${hr}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatRange(d: DayHours): string {
  return d.open && d.close ? `${formatTime(d.open)} – ${formatTime(d.close)}` : 'Closed';
}

export const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
