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

## The cinematic hero

Sequenced from the real media, in order:

1. `exterior-street.webp`: street-level view of 265 Mountain Ave, slow push toward the storefront
2. `storefront.webp`: close storefront shot, accelerating push into the front door
3. A warm light bloom, then `interior-reveal.mp4`: real interior footage pulling back to reveal the floor
4. `interior-ambient.mp4`: seamless ping-pong loop of the same footage, which picks up exactly where the reveal ends

No footage physically passes through the door, so the door → interior moment is a light-bloom transition, not a fake camera move.
Visitors can pause or replay the film. Reduced-motion and data-saver users get a still interior photo.
If autoplay is blocked (e.g. iOS Low Power Mode) the sequence falls back to the interior photo.

## Media notes (before launch)

The supplied media looks like it came from Google Maps / Street View (screenshots and a screen recording). It's fine for a pitch or preview,
but before the site goes live, get the owner's own photos/video or written permission to use these. The video was cropped to remove the
Maps player controls and watermark. Footage shot on a phone (4K, landscape, a slow walk from the sidewalk through the door) would make a much sharper hero.
Just replace the files in `public/media/` with the same names.
