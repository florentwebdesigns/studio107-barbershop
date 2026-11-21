# Studio 107 Barbershop — website

Static Astro 5 site for Studio 107 Barbershop, 265 Mountain Avenue, Springfield, NJ 07081.
No client-side framework: a few small vanilla TypeScript modules, self-hosted fonts, a scroll-driven three.js
clipper intro and a WebGL hero.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static files to dist/
npm run preview   # serves dist/ locally
```

Requires Node 18.20+ (Node 20 or 22 recommended).

## Environment

| Variable   | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `SITE_URL` | Live domain. Used for the canonical URL, Open Graph image URLs, sitemap and robots.txt. |

Copy `.env.example` to `.env` for local builds, and set `SITE_URL` in Vercel's project settings.

## Where things live

```
src/
  data/
    business.ts    name, address, phone, hours, amenities, booking number and optional booking endpoint
    services.ts    service menu and starting prices
    gallery.ts     gallery photos, captions and alt text
  lib/
    hours.ts       hour formatting + live open/closed status (America/New_York)
    links.ts       tel:, sms:, directions, map and booking link helpers
  assets/
    logo-path.txt  the Studio 107 script logo, traced to a single SVG path
  components/      Intro, Backdrop, Nav, Hero, Statement, About, Services, Gallery, Booking, Visit, Hours, Footer, MobileBar
  scripts/
    craft-3d.ts    the clipper intro (three.js): studio lighting, chrome clipper with the Studio 107 logo,
                   hair that gets cut, exploded view and the logo wipe
    hero-gl.ts     the live cinematic hero (WebGL2)
    backdrop-gl.ts the animated site-wide background behind every section (WebGL2)
    main.ts        nav, mobile menu, reveals, status, lightbox, map loader
  styles/global.css  design tokens (chrome palette, type scale, motion) and shared styles
public/media/      hero.mp4 (looping interior footage), hero-poster.jpg, craft-clipper.webp (intro fallback still)
```

## Common updates

**Hours** — edit `hours` in `src/data/business.ts` (24-hour `"HH:MM"`, `null` for closed). The hours table, the
"Open now" status, the mobile menu, the footer and the structured data all update from this one place.

**Phone or address** — edit `src/data/business.ts`.

**Services and prices** — edit `src/data/services.ts`. Set `from: true` for prices that are a starting price.

**Booking** — every Book button jumps to the booking form (`Booking.astro`, `src/scripts/booking.ts`), and the
Book buttons on the menu pre-select that service. The visitor picks a service, day and time (30-minute slots inside
opening hours, skipping closed days and times that have passed) and adds their name and phone. The form then
writes the request out as a text to `sms` in `business.ts` and opens their messages app; on a computer it shows a
QR code that opens the same text on their phone. The number in `sms` must be able to receive texts.

To send requests somewhere else (for example a Google Apps Script that adds them to the shop's Google Calendar),
set `booking.endpoint` in `business.ts`. The form then POSTs `service, price, date, dateLabel, time, name, phone,
notes, source, submittedAt` as form fields and shows a "Request sent" confirmation; if the endpoint can't be
reached it falls back to the text.

Analytics: the form pushes `booking_cta`, `booking_start`, `booking_submit`, `booking_text_opened` and
`booking_sent` to `window.dataLayer` (Google Tag Manager / GA4) and fires matching `booking:*` DOM events.

**Accent color** — the site uses chrome and silver. To switch to the gold of the storefront sign, change
`--silver`, `--silver-hi`, `--steel` and `--metal` in `src/styles/global.css`.

**Photos** — put the image in `src/assets/gallery/`, import it in `src/data/gallery.ts`, and add an entry with a
caption and descriptive alt text. Use real Studio 107 photos only.

**Hero video** — replace `public/media/hero.mp4` and `public/media/hero-poster.jpg`, then update `VIDEO_W`,
`VIDEO_H` and `FOCUS` at the top of `src/scripts/hero-gl.ts`. Encode as H.264 MP4 without audio.

## How the intro works

`Intro.astro` pins a tall scroll section; `craft-3d.ts` maps scroll progress to keyframed poses of a procedural
chrome clipper lit by a custom studio environment, with bloom, ACES tone mapping, vignette and grain. The clipper
cuts a patch of instanced hair strands, breaks into an exploded view, reassembles, and sweeps across the screen
to wipe in the Studio 107 logo. Without WebGL, or with reduced motion, a still image and the same captions show.

## Deploy (Vercel)

Every push to the default branch redeploys production; other branches get preview URLs.

## Still needed from the shop

- Official website domain (for `SITE_URL`)
- Confirmation that (973) 376-9661 receives texts (booking requests are texted there), or the number to use instead
- Photos of finished cuts, with permission, for the gallery
- Their own footage of the shop, with permission, for the hero
