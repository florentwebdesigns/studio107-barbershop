// Dev tool: renders tools/bake-trees.html in headless Chromium and saves the baked tree GLB.
// Files are served straight from the project folder through Playwright request routing (no server).
// Usage: node tools/bake-trees.cjs <out.glb>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
(async () => {
  const out = process.argv[2] || 'trees-raw.glb';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.route('http://bake.local/**', (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
  });
  p.on('pageerror', (e) => console.log('[err]', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
  await p.goto('http://bake.local/tools/bake-trees.html');
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const b64 = await p.evaluate(() => window.bake());
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(out, buf);
  console.log('written', out, buf.length);
  await b.close();
})();
