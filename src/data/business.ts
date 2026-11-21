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
   * Where booking requests go. The booking form writes the request as a text message to this number.
   * Confirm the shop line receives texts, or swap in the number of the phone the shop books from.
   */
  sms: { display: '(973) 376-9661', e164: '+19733769661' } as null | { display: string; e164: string },
  booking: {
    /**
     * Optional. A URL that accepts booking requests (for example a Google Apps Script web app that adds them to
     * the shop's Google Calendar). When set, the form sends each request there as a form POST with the fields
     * service, price, date, dateLabel, time, name, phone, notes, source and submittedAt, and shows a
     * "Request sent" confirmation. While it is null, the form opens the visitor's messages app instead.
     */
    endpoint: null as string | null,
  },
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
