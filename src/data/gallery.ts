/**
 * Gallery media. All items are real photos/footage of Studio 107.
 * To add haircut photos later, drop files into /public/media and append entries.
 * `layout` controls the editorial grid placement: 'tall' | 'wide' | 'square' | 'feature'.
 */
export type GalleryItem = {
  src: string;
  thumb?: string;
  alt: string;
  caption: string;
  layout: 'tall' | 'wide' | 'square' | 'feature';
  video?: string;
  width: number;
  height: number;
};

export const gallery: GalleryItem[] = [
  {
    src: '/media/interior-wide.webp',
    thumb: '/media/interior-wide-sm.webp',
    alt: 'Inside Studio 107 Barbershop: a row of black barber chairs facing white-framed mirrors on a reclaimed-wood wall',
    caption: 'The floor — chairs, mirrors and the reclaimed-wood wall',
    layout: 'feature',
    width: 1096,
    height: 1268,
  },
  {
    src: '/media/storefront.webp',
    thumb: '/media/storefront-sm.webp',
    alt: 'Studio 107 Barbershop storefront at 265 Mountain Ave with its black and gold sign and barber pole',
    caption: '265 Mountain Ave, Springfield',
    layout: 'wide',
    width: 2000,
    height: 1278,
  },
  {
    src: '/media/still-station.webp',
    alt: 'A Studio 107 barber station with a white mirror, tools and wood drawers',
    caption: 'A station, ready',
    layout: 'tall',
    video: '/media/interior-reveal.mp4',
    width: 816,
    height: 1016,
  },
  {
    src: '/media/still-chairs.webp',
    alt: 'Classic black barber chairs lined up along the mirrors at Studio 107',
    caption: 'Classic chairs',
    layout: 'square',
    width: 816,
    height: 1016,
  },
  {
    src: '/media/still-room.webp',
    alt: 'Wide view of the bright Studio 107 interior with plants, a wall clock and the front counter',
    caption: 'Bright, open, clean',
    layout: 'square',
    width: 816,
    height: 1016,
  },
  {
    src: '/media/exterior-street.webp',
    thumb: '/media/exterior-street-sm.webp',
    alt: 'Street view of the Mountain Ave storefronts in Springfield, NJ, including Studio 107 Barbershop',
    caption: 'On Mountain Ave',
    layout: 'wide',
    width: 2000,
    height: 1119,
  },
];
