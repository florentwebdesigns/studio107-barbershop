# Studio 107 Barbershop — website

Built by FD Web Designs LLC. Static site (Astro 5, no runtime framework, zero client dependencies).

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs static files to dist/
npm run preview    # serve the built site
```

## Deploy

The build is plain static HTML/CSS/JS in `dist/`, so it runs on any static host.

- **Vercel / Netlify:** import the folder (or its Git repo). Build command `npm run build`, output directory `dist`.
- **Set the domain** so canonical URLs, Open Graph URLs, robots.txt and sitemap.xml use absolute links:
  add an environment variable `SITE_URL=https://www.your-domain.com` before building.

## Where to edit things

| What | File |
|---|---|
| Name, address, phone, hours, booking link, socials | `src/data/business.ts` |
| Service menu (empty until the shop confirms services/prices) | `src/data/services.ts` |
| Gallery photos/videos (add haircut photos here) | `src/data/gallery.ts` + files in `public/media/` |
| Colours, fonts, spacing | `src/styles/global.css` (tokens at the top) |
| Hero film timing | `src/scripts/hero-film.ts` |

- **Booking:** `business.booking` is `null`, so every booking button is "Call to Book" → `tel:+19733769661`.
  Set it to `{ label: 'Book Online', url: '…' }` once a real booking provider is confirmed and every CTA switches over.
- **Services:** while `services` is empty the section shows "Ask for the current menu" with a call button.
  Add entries and a full menu (with optional groups, prices, durations) renders automatically.

## The live storefront hero

One continuous camera move, built only from the real Studio 107 media (`src/scripts/hero-film.ts`):

1. Opens on the street-level photo of 265 Mountain Ave.
2. The close-up storefront photo sits inside the street photo exactly over the shop's facade, so the camera
   zooms from the street onto the sign with no cut.
3. The front door's glass is a portal showing the real interior. Reflections fade and the room gains depth as the camera flies through.
4. The interior footage takes over and pulls back to reveal the floor, then settles into a seamless ambient loop,
   and the Studio 107 logo appears on the wall.

Photo alignment values (`FRONT`, `GLASS`) are measured in photo pixels at the top of the script. If you replace
`storefront.webp` or `exterior-street.webp`, re-measure them. Visitors can pause or replay; reduced-motion
and data-saver users get a still interior photo with the logo.

## Media notes (before launch)

The supplied media looks like it came from Google Maps / Street View (screenshots and a screen recording). It's fine for a pitch or preview,
but before the site goes live, get the owner's own photos/video or written permission to use these. The video was cropped to remove the
Maps player controls and watermark. Footage shot on a phone (4K, landscape, a slow walk from the sidewalk through the door) would make a much sharper hero.
Just replace the files in `public/media/` with the same names.
