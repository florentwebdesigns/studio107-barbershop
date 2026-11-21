/**
 * Verified business facts for Studio 107 Barbershop.
 * Edit this file to update contact details or hours. Components read from here only.
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** 24h "HH:MM" strings. `null` means closed all day. */
export type DayHours = { open: string; close: string } | null;

export const business = {
  name: 'Studio 107 Barbershop',
  shortName: 'Studio 107',
  category: 'Barbershop',
  address: {
    street: '265 Mountain Avenue',
    streetShort: '265 Mountain Ave',
    city: 'Springfield',
    region: 'NJ',
    regionName: 'New Jersey',
    postalCode: '07081',
    country: 'US',
  },
  phone: {
    display: '(973) 376-9661',
    e164: '+19733769661',
  },
  /**
   * Number for a "Text the shop" link. Leave null until the shop confirms this number receives texts.
   */
  sms: null as null | { display: string; e164: string },
  /** The shop's real online booking page (Vagaro). Every "Book" button points here. */
  bookingUrl: 'https://www.vagaro.com/studio107barbersho/services',
  bookingProvider: 'Vagaro',
  /** No verified official social profiles supplied yet. Add them here when confirmed. */
  social: [] as { label: string; url: string }[],
  mapsQuery: '265 Mountain Ave, Springfield, NJ 07081',
  timezone: 'America/New_York',
  hours: {
    mon: { open: '09:00', close: '18:00' },
    tue: { open: '09:00', close: '18:00' },
    wed: { open: '09:00', close: '18:00' },
    thu: { open: '09:00', close: '18:00' },
    fri: { open: '09:00', close: '18:00' },
    sat: { open: '08:00', close: '16:00' },
    sun: null,
  } as Record<DayKey, DayHours>,
  /** Publicly listed details. Only include what is verified. */
  amenities: ['Appointments recommended', 'Free parking behind the shop'],
  parking: 'Free parking behind the shop.',
};

export const dayOrder: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const dayNames: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
