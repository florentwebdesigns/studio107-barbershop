/**
 * SERVICE MENU — awaiting confirmation from Studio 107.
 *
 * No services or prices have been verified yet, so this list is intentionally empty.
 * While it is empty, the Services section shows a polished "call for the current menu"
 * layout. As soon as you add entries below, the full menu renders automatically.
 *
 * Fields:
 *   name         required  e.g. the exact service name the shop uses
 *   price        optional  string, shown as written (e.g. "$00" or "From $00")
 *   duration     optional  e.g. "30 min"
 *   description  optional  one short line
 *   group        optional  heading the item is listed under (items keep their order)
 *
 * Example (do NOT publish until confirmed by the shop):
 *   { group: 'Cuts', name: 'Service name', price: '$00', duration: '30 min', description: 'Short description.' },
 */

export type Service = {
  name: string;
  price?: string;
  duration?: string;
  description?: string;
  group?: string;
};

export const services: Service[] = [];
