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

- **Booking:** `business.booking` points to the shop's Vagaro page; every "Book Now" button opens it. Set it to `null` to fall back to "Call to Book".
  Set it to `{ label: 'Book Online', url: '…' }` once a real booking provider is confirmed and every CTA switches over.
- **Services:** the menu and prices live in `src/data/services.ts` (copied from Vagaro). Keep it in sync when prices change; the JSON-LD offer catalog updates automatically.
  Add entries and a full menu (with optional groups, prices, durations) renders automatically.

## The living storefront hero

The hero is the real storefront photo brought to life in WebGL (`src/scripts/storefront-hero.ts`):

- A hand-built depth map (`tools/make_depth.py` → `public/media/storefront-depth.png`) splits the photo into planes:
  roof, facade, the protruding sign / pole / mailbox, and the interior through the glass.
- The shader uses it for a slow dolly push-in with true parallax (plus gentle mouse parallax on desktop),
  and adds the live details: the barber pole turning, the neon OPEN sign humming, a light sweep across the gold lettering,
  soft highlight bloom, a filmic grade, vignette and grain.
- On phones the photo is reframed so the whole sign stays readable, with the copy beneath it.
- No WebGL: the same framing with a CSS push-in. Reduced motion: a still frame. Rendering pauses when the hero is off-screen.

Region coordinates (pole, neon, sign) are in storefront-photo pixels in the shader. If `storefront-hero.webp`
is replaced with a new photo, re-measure them and regenerate the depth map.

## Media notes (before launch)

The supplied media looks like it came from Google Maps / Street View (screenshots and a screen recording). It's fine for a pitch or preview,
but before the site goes live, get the owner's own photos/video or written permission to use these. The video was cropped to remove the
Maps player controls and watermark. Footage shot on a phone (4K, landscape, a slow walk from the sidewalk through the door) would make a much sharper hero.
Just replace the files in `public/media/` with the same names.

## 3D drone homepage

The homepage hero is a scroll-driven 3D scene (`src/components/DroneHero.astro`, code in `src/scripts/drone/`):
a dusk "drone shot" of the storefront, a client walking out and pulling the door shut, then the camera
flies through the door, along the chairs, and stops on a menu board drawn from `src/data/services.ts`.
The block around the shop is modeled on the Street View imagery of 265 Mountain Ave: the brick strip of
three shops under a shingled hip roof (neighbours shown without names), gravel forecourt and walkways,
herringbone brick sidewalk, hydrant, lamp post, utility wires, hedge, the white house on the right and the
pines behind. Phones without WebGL, data-saver mode and reduced-motion users get the real storefront photo instead.

Assets in `public/drone/` (about 5.2 MB, loaded only by the homepage hero):

| File | What | Source / license |
|---|---|---|
| `tex/*_c/_n/_orm.webp` | PBR texture sets (brick, shingles, pavers, gravel, wood wall, ...) | baked by `tools/bake_textures.py` (ours) |
| `trees.glb` | pines, bare trees, maple, shrubs | generated with [ez-tree](https://github.com/dgreenheck/ez-tree) (MIT) via `tools/bake-trees.html` + `tools/bake-trees.cjs` |
| `client.glb` | the client walking out | Ready Player Me sample avatar from the three.js examples |
| `anims.glb` | walk / idle clips | Mixamo clips from the three.js `Soldier.glb` example, retargeted in `client.ts` |

Re-bake textures: `python3 tools/bake_textures.py`. Re-bake trees: `node tools/bake-trees.cjs out.glb`, then
compress with `gltf-transform optimize out.glb public/drone/trees.glb --compress meshopt --texture-compress webp --texture-size 512`.

- Camera path: `KEYS` in `src/scripts/drone/drone-hero.ts` (scroll progress 0 to 1).
- Overlay text per scroll range: the `data-from` / `data-to` blocks in `DroneHero.astro`.
- Add `?snap` to the URL to disable scroll smoothing (handy for screenshots).
- **Roll back to the photo hero:** in `src/pages/index.astro`, import `Hero` and use `<Hero />` instead of `<DroneHero />`.
