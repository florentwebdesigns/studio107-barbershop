/**
 * Service menu, as listed on Studio 107's Vagaro booking page (vagaro.com/studio107barbersho/services).
 * Keep this in sync with Vagaro. Prices are in USD; `from: true` shows "From $X" (Vagaro's "Starting at").
 * Only add a `note` when the detail is on the shop's own listing.
 */

export type Service = {
  name: string;
  price: number;
  from?: boolean;
  note?: string;
  group: string;
  /** Highlights the item (the shop is known for hot towel shaves). */
  signature?: boolean;
};

export const serviceGroups = ['Haircuts', 'Cut & Beard', 'Shave & Beard', 'Wax & Color'] as const;

export const services: Service[] = [
  { group: 'Haircuts', name: 'Regular Haircut', price: 35, note: 'Tailored to your face shape and routine' },
  { group: 'Haircuts', name: 'Skin Fade Haircut', price: 40, note: 'Longer on top, faded to the skin' },
  { group: 'Haircuts', name: 'Buzzcut', price: 30, from: true, note: 'One guard length all around' },
  { group: 'Haircuts', name: 'Kids Haircut', price: 35 },
  { group: 'Haircuts', name: 'Senior Haircut', price: 30 },
  { group: 'Haircuts', name: 'Women’s Haircut', price: 40, from: true },

  { group: 'Cut & Beard', name: 'Haircut and Beard', price: 55 },
  { group: 'Cut & Beard', name: 'Skin Fade Haircut and Beard', price: 60 },
  { group: 'Cut & Beard', name: 'Senior Haircut and Beard', price: 45 },

  { group: 'Shave & Beard', name: 'Hot Towel Shave', price: 30, signature: true },
  { group: 'Shave & Beard', name: 'Beard Trim', price: 30 },

  { group: 'Wax & Color', name: 'Eyebrows', price: 15 },
  { group: 'Wax & Color', name: 'Ear Hair Removal', price: 16 },
  { group: 'Wax & Color', name: 'Color', price: 30, from: true },
];

const prices = services.map((s) => s.price);
export const priceRange = `$${Math.min(...prices)}–$${Math.max(...prices)}`;

export const formatPrice = (s: Pick<Service, 'price' | 'from'>) => `${s.from ? 'From ' : ''}$${s.price.toFixed(0)}`;
