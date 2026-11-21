import { business } from '../data/business';

/** tel: link from an E.164 or loosely formatted number. */
export const telLink = (phone: string = business.phone.e164) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/**
 * sms: link with an optional prefilled message. Only used if `business.sms` is confirmed.
 * Apple devices read `&body=`, everything else reads `?body=`.
 */
export const smsLink = (body = '', apple = false, phone: string = business.sms?.e164 ?? business.phone.e164) => {
  const n = phone.replace(/[^\d+]/g, '');
  if (!body) return `sms:${n}`;
  return `sms:${n}${apple ? '&' : '?'}body=${encodeURIComponent(body)}`;
};

/** Google Maps directions link for an address string. */
export const directionsLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

/** Google Maps search link (opens the place). */
export const mapsSearchLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** Embeddable Google Map (no API key required). */
export const mapsEmbedLink = (query: string = business.mapsQuery) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;

/** The shop's Vagaro booking page. */
export const bookingLink = () => business.bookingUrl;

/** Spread onto every booking <a>: opens Vagaro in a new tab. */
export const bookAttrs = () => ({ href: business.bookingUrl, target: '_blank', rel: 'noopener' });
