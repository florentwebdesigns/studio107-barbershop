import { defineConfig } from 'astro/config';

// Set SITE_URL to the live domain when deploying so canonical URLs, Open Graph URLs
// and the sitemap use absolute links, e.g. SITE_URL=https://www.example.com npm run build
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});
