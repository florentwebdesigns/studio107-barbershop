/**
 * SERVICE MENU, as listed on Studio 107's Vagaro booking page (vagaro.com/studio107barbersho/services).
 * Keep this in sync with Vagaro. Prices are in USD; `from: true` shows "From $X" (Vagaro's "Starting at").
 *
 * Fields:
 *   name         required  the service name as the shop lists it
 *   price        required  number in dollars
 *   from         optional  true when the price is a starting price
 *   description  optional  one short line
 *   group        required  one of serviceGroups (items keep their order)
 */

export type Service = {
  name: string;
  price: number;
  from?: boolean;
  description?: string;
  group: string;
};

export const serviceGroups: string[] = ['Haircuts', 'Cut & Beard', 'Shave & Beard', 'Wax & Color'];

export const services: Service[] = [
  { group: 'Haircuts', name: 'Regular Haircut', price: 35, description: 'A tailored cut for your face shape and your daily routine.' },
  { group: 'Haircuts', name: 'Skin Fade Haircut', price: 40, description: 'Longer on top, faded down to the skin on the sides.' },
  { group: 'Haircuts', name: 'Buzzcut', price: 30, from: true, description: 'One guard length all around. Clean, uniform, low-maintenance.' },
  { group: 'Haircuts', name: 'Kids Haircut', price: 35 },
  { group: 'Haircuts', name: 'Senior Haircut', price: 30 },
  { group: 'Haircuts', name: 'Women’s Haircut', price: 40, from: true, description: 'Cuts tailored to your personal style.' },

  { group: 'Cut & Beard', name: 'Haircut and Beard', price: 55 },
  { group: 'Cut & Beard', name: 'Skin Fade Haircut and Beard', price: 60 },
  { group: 'Cut & Beard', name: 'Senior Haircut and Beard', price: 45, description: 'A tailored senior cut finished with a precise beard trim.' },

  { group: 'Shave & Beard', name: 'Beard Trim', price: 30 },
  { group: 'Shave & Beard', name: 'Hot Towel Shave', price: 30 },

  { group: 'Wax & Color', name: 'Eyebrows', price: 15 },
  { group: 'Wax & Color', name: 'Ear Hair Removal', price: 16 },
  { group: 'Wax & Color', name: 'Color', price: 30, from: true, description: 'A wide range of hair color options.' },
];

const prices = services.map((s) => s.price);
export const priceRange = `$${Math.min(...prices)}–$${Math.max(...prices)}`;
