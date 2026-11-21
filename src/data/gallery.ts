/**
 * Gallery media. Only authentic Studio 107 photography belongs here.
 * To add a photo (for example finished cuts from the shop): drop the file into src/assets/gallery/,
 * import it below, and add an entry. `shape` sets the tile proportion: 'tall' | 'square' | 'wide'.
 */
import type { ImageMetadata } from 'astro';
import interiorWide from '../assets/gallery/interior-wide.webp';
import stillChairs from '../assets/gallery/still-chairs.webp';
import stillRoom from '../assets/gallery/still-room.webp';
import stillStation from '../assets/gallery/still-station.webp';
import storefront from '../assets/gallery/storefront.webp';
import exteriorStreet from '../assets/gallery/exterior-street.webp';

export type GalleryItem = {
  src: ImageMetadata;
  alt: string;
  caption: string;
  shape: 'tall' | 'square' | 'wide';
  /** 'cut' for photos of the shop's work (the lightbox offers "Book a cut like this"), 'shop' for the space. */
  kind?: 'cut' | 'shop';
};

export const gallery: GalleryItem[] = [
  {
    src: interiorWide,
    alt: 'Inside Studio 107 Barbershop: a row of black barber chairs facing white-framed mirrors on a reclaimed-wood wall',
    caption: 'The floor',
    shape: 'tall',
  },
  {
    src: stillStation,
    alt: 'A Studio 107 barber station with a white-framed mirror, tools on the counter and wood drawers',
    caption: 'A station, ready',
    shape: 'square',
  },
  {
    src: stillChairs,
    alt: 'Classic black barber chairs with chrome bases lined up along the mirrors at Studio 107',
    caption: 'Classic chairs',
    shape: 'tall',
  },
  {
    src: storefront,
    alt: 'Studio 107 Barbershop storefront at 265 Mountain Ave with its black sign, script logo and barber pole',
    caption: '265 Mountain Ave',
    shape: 'wide',
  },
  {
    src: stillRoom,
    alt: 'Wide view of the bright Studio 107 interior with plants, a wall clock and the front counter',
    caption: 'Bright, open, clean',
    shape: 'square',
  },
  {
    src: exteriorStreet,
    alt: 'Street view of the Mountain Ave storefronts in Springfield, NJ, including Studio 107 Barbershop',
    caption: 'On Mountain Avenue',
    shape: 'wide',
  },
];

/** Images used outside the gallery grid (About section). */
export const shopImages = { interiorWide, stillChairs, stillRoom, stillStation, storefront };
