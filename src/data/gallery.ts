/**
 * Gallery media. Only authentic Studio 107 photography belongs here.
 * The cut photos and the stations photo come from the shop's own Instagram (supplied by FD Web Designs).
 * To add a photo: drop the file into src/assets/gallery/, import it below, and add an entry.
 * `shape` sets the tile proportion: 'tall' | 'square' | 'wide'. Mark photos of the shop's work `kind: 'cut'`.
 * The grid is laid out for six tiles; the first is the large one.
 */
import type { ImageMetadata } from 'astro';
import interiorWide from '../assets/gallery/interior-wide.webp';
import stillChairs from '../assets/gallery/still-chairs.webp';
import stillRoom from '../assets/gallery/still-room.webp';
import stillStation from '../assets/gallery/still-station.webp';
import storefront from '../assets/gallery/storefront.webp';
import cutCurlyDesign from '../assets/gallery/cut-curly-design.jpg';
import cutLowTaper from '../assets/gallery/cut-low-taper.jpg';
import cutBeardPart from '../assets/gallery/cut-beard-part.jpg';
import workLineup from '../assets/gallery/work-lineup.jpg';
import shopStations from '../assets/gallery/shop-stations.jpg';

export type GalleryItem = {
  src: ImageMetadata;
  alt: string;
  caption: string;
  shape: 'tall' | 'square' | 'wide';
  /** 'cut' for photos of the shop's work (the lightbox offers "Book a cut like this"), 'shop' for the space. */
  kind?: 'cut' | 'shop';
  /** CSS object-position for the tile crop, e.g. '50% 30%'. */
  focus?: string;
};

export const gallery: GalleryItem[] = [
  {
    src: cutCurlyDesign,
    alt: 'Curly textured top over a skin fade, with a cross and two lines shaved into the side, cut at Studio 107',
    caption: 'Curls, fade & design',
    shape: 'tall',
    kind: 'cut',
    focus: '45% 40%',
  },
  {
    src: cutLowTaper,
    alt: 'Side view of a low taper fade with a short, neatly combed top, cut at Studio 107',
    caption: 'Low taper',
    shape: 'square',
    kind: 'cut',
    focus: '45% 40%',
  },
  {
    src: cutBeardPart,
    alt: 'Short curly cut with a shaved hard part, taper and a full shaped beard, outside the Studio 107 storefront',
    caption: 'Hard part & beard',
    shape: 'tall',
    kind: 'cut',
    focus: '25% 62%',
  },
  {
    src: workLineup,
    alt: 'A Studio 107 barber lining up a client’s hairline with a trimmer',
    caption: 'The line-up',
    shape: 'tall',
    kind: 'cut',
    focus: '60% 35%',
  },
  {
    src: stillStation,
    alt: 'A Studio 107 barber station with a white-framed mirror, tools on the counter and wood drawers',
    caption: 'A station, ready',
    shape: 'square',
    kind: 'shop',
  },
  {
    src: storefront,
    alt: 'Studio 107 Barbershop storefront at 265 Mountain Ave with its black sign, script logo and barber pole',
    caption: '265 Mountain Ave',
    shape: 'wide',
    kind: 'shop',
  },
];

/** Images used outside the gallery grid. */
export const shopImages = {
  interiorWide,
  stillChairs,
  stillRoom,
  stillStation,
  storefront,
  shopStations,
  workLineup,
  cutLowTaper,
  cutBeardPart,
  cutCurlyDesign,
};
