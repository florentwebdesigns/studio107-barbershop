/**
 * Procedural canvas textures for the 3D storefront. Everything is drawn at runtime,
 * so the scene ships no image assets beyond code. Colors are sampled from the real shop photos.
 */
import * as THREE from 'three';
import { services, serviceGroups } from '../../data/services';

type Ctx = CanvasRenderingContext2D;

let seed = 107;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const rr = (a: number, b: number) => a + (b - a) * rand();
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function tex(c: HTMLCanvasElement, repeat?: [number, number], srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  return t;
}

function noise(ctx: Ctx, w: number, h: number, amt: number, n = 9000) {
  for (let i = 0; i < n; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * amt})`;
    ctx.fillRect(rand() * w, rand() * h, rr(1, 2.5), rr(1, 2.5));
  }
}

/* ---------- Exterior ---------- */

export function brick() {
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  const [bc, b] = canvas(W, H); // bump
  x.fillStyle = '#8c857c';
  x.fillRect(0, 0, W, H);
  b.fillStyle = '#000';
  b.fillRect(0, 0, W, H);
  const bw = 128, bh = 42, m = 7;
  const tones = ['#8a3f2c', '#9b4a33', '#7a3526', '#a5573b', '#6f3124', '#94503a', '#b0654a', '#5e2b20'];
  for (let row = 0; row * (bh + m) < H + bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * (bw + m) < W + bw; col++) {
      const px = col * (bw + m) + off, py = row * (bh + m);
      const g = x.createLinearGradient(px, py, px + bw, py + bh);
      const base = pick(tones);
      g.addColorStop(0, base);
      g.addColorStop(1, pick(tones));
      x.fillStyle = g;
      x.fillRect(px, py, bw, bh);
      // soot / wear
      x.fillStyle = `rgba(20,10,5,${rr(0, 0.25)})`;
      x.fillRect(px, py + bh * rr(0.4, 0.8), bw, bh * 0.4);
      b.fillStyle = `rgb(${rr(170, 230)},${rr(170, 230)},${rr(170, 230)})`;
      b.fillRect(px + 1, py + 1, bw - 2, bh - 2);
    }
  }
  noise(x, W, H, 0.18, 26000);
  noise(b, W, H, 0.3, 20000);
  return { map: tex(c, [1, 1]), bump: tex(bc, [1, 1], false) };
}

export function shingles() {
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#2b2d30';
  x.fillRect(0, 0, W, H);
  const rh = 64;
  for (let row = 0; row * rh < H; row++) {
    const off = (row % 2) * 48;
    for (let px = -off; px < W; px += rr(80, 120)) {
      const w = rr(78, 118);
      const v = rr(38, 70);
      x.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      x.fillRect(px, row * rh, w - 3, rh - 6);
      x.fillStyle = 'rgba(0,0,0,0.55)';
      x.fillRect(px, row * rh + rh - 8, w, 6);
    }
  }
  noise(x, W, H, 0.35, 60000);
  return tex(c, [1, 1]);
}

export function concrete(light = true) {
  const W = 512, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = light ? '#8d8a84' : '#2a2a2b';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const g = x.createRadialGradient(rr(0, W), rr(0, H), 0, rr(0, W), rr(0, H), rr(40, 160));
    g.addColorStop(0, `rgba(0,0,0,${rr(0, 0.08)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  noise(x, W, H, light ? 0.18 : 0.25, 30000);
  return tex(c, [1, 1]);
}

export function gravel() {
  const W = 512, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#6d6a66';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = rr(70, 190);
    x.fillStyle = `rgb(${v},${v - rr(0, 10)},${v - rr(0, 18)})`;
    x.beginPath();
    x.ellipse(rr(0, W), rr(0, H), rr(1.5, 4), rr(1.2, 3.2), rr(0, 3), 0, 7);
    x.fill();
  }
  return tex(c, [1, 1]);
}

export function pavers() {
  // Herringbone brick sidewalk, like the real Mountain Ave sidewalk.
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#3c2a24';
  x.fillRect(0, 0, W, H);
  const u = 32; // brick = 2u x 1u
  const tones = ['#7c3b2e', '#6b3328', '#8a4636', '#5d2c24', '#924c3a', '#70382c'];
  for (let i = -40; i < 40; i++) {
    for (let j = -40; j < 40; j++) {
      const ox = (i + j) * 2 * u, oy = (j - i) * 2 * u;
      // two bricks per cell, one horizontal and one vertical
      const rects: [number, number, number, number][] = [
        [ox, oy, 4 * u, 2 * u],
        [ox + 2 * u, oy + 2 * u, 2 * u, 4 * u],
      ];
      for (const [px, py, w, h] of rects) {
        if (px > W + 200 || py > H + 200 || px + w < -200 || py + h < -200) continue;
        x.fillStyle = pick(tones);
        x.fillRect(px + 2, py + 2, w - 4, h - 4);
      }
    }
  }
  noise(x, W, H, 0.22, 40000);
  return tex(c, [1, 1]);
}

export function asphalt() {
  const W = 512, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#1d1e20';
  x.fillRect(0, 0, W, H);
  noise(x, W, H, 0.35, 50000);
  return tex(c, [1, 1]);
}

export function stucco() {
  const W = 512, H = 256;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#c9c6bf';
  x.fillRect(0, 0, W, H);
  noise(x, W, H, 0.12, 20000);
  return tex(c, [1, 1]);
}

/** The real sign: black panel, gold "Studio 107", white BARBERSHOP, gold phone, "265" plate. */
export function sign() {
  const W = 2048, H = 500;
  const [c, x] = canvas(W, H);
  const [ec, e] = canvas(W, H); // emissive
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141414');
  g.addColorStop(0.5, '#070707');
  g.addColorStop(1, '#0d0d0d');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);

  const gold = (ctx: Ctx, x0: number, x1: number) => {
    const gg = ctx.createLinearGradient(x0, 0, x1, 0);
    gg.addColorStop(0, '#9c6a2c');
    gg.addColorStop(0.35, '#f1d48f');
    gg.addColorStop(0.6, '#c99a4f');
    gg.addColorStop(1, '#f6e2a8');
    return gg;
  };
  for (const ctx of [x, e]) {
    // 265 plate
    ctx.fillStyle = gold(ctx, 60, 230);
    ctx.fillRect(66, 22, 170, 74);
    ctx.fillStyle = '#111';
    ctx.font = '600 58px "Manrope Variable", Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('265', 151, 61);
    // Script wordmark
    ctx.fillStyle = gold(ctx, 380, 1720);
    ctx.font = 'italic 300px "Instrument Serif", Georgia, serif';
    ctx.fillText('Studio 107', 1010, 175);
    // BARBERSHOP
    ctx.fillStyle = ctx === x ? '#ece9e4' : '#9a978f';
    ctx.font = '600 76px "Manrope Variable", Manrope, sans-serif';
    (ctx as any).letterSpacing = '22px';
    ctx.fillText('BARBERSHOP', 1010, 345);
    (ctx as any).letterSpacing = '6px';
    // phone
    ctx.fillStyle = gold(ctx, 1400, 1980);
    ctx.font = '800 74px "Manrope Variable", Manrope, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('973 - 376 - 9661', 1975, 440);
    (ctx as any).letterSpacing = '0px';
  }
  return { map: tex(c), emissive: tex(ec) };
}

/** Neon "open" in red script with the blue swoosh underneath, as on the real window. */
export function neon() {
  const W = 1024, H = 512;
  const [c, x] = canvas(W, H);
  x.lineCap = x.lineJoin = 'round';
  const glow = (color: string, draw: () => void) => {
    x.save();
    x.shadowColor = color;
    x.shadowBlur = 40;
    x.strokeStyle = color;
    x.lineWidth = 26;
    draw();
    x.shadowBlur = 0;
    x.strokeStyle = 'rgba(255,255,255,0.9)';
    x.lineWidth = 7;
    draw();
    x.restore();
  };
  x.font = 'italic 300px "Instrument Serif", Georgia, serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  glow('#ff2a3a', () => x.strokeText('open', 512, 210));
  glow('#2f5bff', () => {
    x.beginPath();
    x.moveTo(140, 420);
    x.bezierCurveTo(330, 330, 560, 470, 880, 360);
    x.stroke();
  });
  return tex(c);
}

/** Transom numbers "265" in white vinyl over the door. */
export function transom() {
  const W = 512, H = 256;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#f4f4f4';
  x.font = '800 170px "Manrope Variable", Manrope, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('265', 256, 136);
  return tex(c);
}

export function poleStripes() {
  const W = 256, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#f5f3ef';
  x.fillRect(0, 0, W, H);
  const band = 64;
  x.save();
  x.transform(1, -0.75, 0, 1, 0, 0); // shear for diagonal
  for (let y = -H * 2; y < H * 3; y += band * 3) {
    x.fillStyle = '#d4202f';
    x.fillRect(-10, y, W + 20, band);
    x.fillStyle = '#1d3fbf';
    x.fillRect(-10, y + band * 1.5, W + 20, band * 0.75);
  }
  x.restore();
  const t = tex(c, [1, 1]);
  return t;
}

export function sky() {
  // Gradient for the dusk sky dome (vertical), sampled by uv.y
  const [c, x] = canvas(4, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#04060b');
  g.addColorStop(0.22, '#0a1328');
  g.addColorStop(0.38, '#1c2744');
  g.addColorStop(0.45, '#4a3a4a');
  g.addColorStop(0.49, '#b06a42');
  g.addColorStop(0.505, '#e09a5c');
  g.addColorStop(0.53, '#2a201d');
  g.addColorStop(1, '#0a0909');
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 512);
  return tex(c);
}

/* ---------- Interior ---------- */

/** Reclaimed-wood plank wall: mixed dark brown, tan, grey and whitewashed boards. */
export function woodWall() {
  const W = 2048, H = 1024;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#2a1f18';
  x.fillRect(0, 0, W, H);
  const tones = ['#3b2a1f', '#4e3626', '#6b4b33', '#7d5d42', '#9a7b5c', '#b39a7a', '#d9d1c3', '#cfc6b6', '#5a4a3e', '#2f241c', '#8a6a4c'];
  const bh = 46;
  for (let row = 0; row * bh < H; row++) {
    let px = -rr(0, 300);
    while (px < W) {
      const w = rr(180, 620);
      const tone = pick(tones);
      x.fillStyle = tone;
      x.fillRect(px, row * bh + 2, w - 3, bh - 4);
      // grain
      x.globalAlpha = 0.25;
      for (let k = 0; k < 7; k++) {
        x.strokeStyle = rand() > 0.5 ? '#1a120c' : '#e8dccb';
        x.lineWidth = rr(0.6, 1.6);
        x.beginPath();
        const yy = row * bh + rr(6, bh - 6);
        x.moveTo(px, yy);
        x.bezierCurveTo(px + w * 0.3, yy + rr(-4, 4), px + w * 0.7, yy + rr(-4, 4), px + w, yy + rr(-3, 3));
        x.stroke();
      }
      x.globalAlpha = 1;
      // nail holes
      x.fillStyle = 'rgba(0,0,0,0.6)';
      x.fillRect(px + 10, row * bh + bh / 2, 3, 3);
      x.fillRect(px + w - 16, row * bh + bh / 2, 3, 3);
      px += w;
    }
  }
  noise(x, W, H, 0.15, 30000);
  return tex(c, [1, 1]);
}

/** Grey-brown wood-look vinyl plank floor. */
export function floor() {
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  const pw = 128;
  for (let col = 0; col * pw < W; col++) {
    let py = -rr(0, 600);
    while (py < H) {
      const h = rr(500, 900);
      const v = rr(88, 128);
      x.fillStyle = `rgb(${v + 18},${v + 8},${v - 4})`;
      x.fillRect(col * pw, py, pw, h);
      x.globalAlpha = 0.18;
      for (let k = 0; k < 14; k++) {
        x.strokeStyle = rand() > 0.5 ? '#3a2e24' : '#d8cbb8';
        x.lineWidth = rr(0.5, 1.4);
        const xx = col * pw + rr(4, pw - 4);
        x.beginPath();
        x.moveTo(xx, py);
        x.bezierCurveTo(xx + rr(-6, 6), py + h * 0.3, xx + rr(-6, 6), py + h * 0.7, xx + rr(-4, 4), py + h);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(30,22,16,0.7)';
      x.fillRect(col * pw, py, pw, 2);
      x.fillRect(col * pw, py, 2, h);
      py += h;
    }
  }
  noise(x, W, H, 0.08, 20000);
  return tex(c, [1, 1]);
}

export function ceiling() {
  const W = 512, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#e9e8e4';
  x.fillRect(0, 0, W, H);
  noise(x, W, H, 0.1, 24000);
  x.fillStyle = '#b9b8b3';
  x.fillRect(0, 0, W, 6);
  x.fillRect(0, 0, 6, H);
  return tex(c, [1, 1]);
}

/** The menu board, drawn from src/data/services.ts so prices always match the site. */
export function menuBoard() {
  const W = 2048, H = 1400;
  const [c, x] = canvas(W, H);
  const g = x.createRadialGradient(W / 2, H * 0.3, 100, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, '#1d1a17');
  g.addColorStop(1, '#0a0908');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  noise(x, W, H, 0.06, 40000);

  const goldGrad = (x0: number, x1: number) => {
    const gg = x.createLinearGradient(x0, 0, x1, 0);
    gg.addColorStop(0, '#b98a45');
    gg.addColorStop(0.45, '#f0d698');
    gg.addColorStop(0.7, '#c9a25e');
    gg.addColorStop(1, '#9c7a3e');
    return gg;
  };
  x.strokeStyle = 'rgba(201,162,94,0.55)';
  x.lineWidth = 3;
  x.strokeRect(46, 46, W - 92, H - 92);
  x.strokeStyle = 'rgba(201,162,94,0.22)';
  x.strokeRect(64, 64, W - 128, H - 128);

  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#c9a25e';
  x.font = '700 30px "Manrope Variable", Manrope, sans-serif';
  (x as any).letterSpacing = '12px';
  x.fillText('SERVICES  ·  PRICES', W / 2, 150);
  (x as any).letterSpacing = '0px';
  x.fillStyle = goldGrad(700, 1350);
  x.font = 'italic 150px "Instrument Serif", Georgia, serif';
  x.fillText('Studio 107', W / 2, 290);

  const colX = [150, 1090];
  const colW = 810;
  const groups = serviceGroups.map((name) => ({ name, items: services.filter((s) => s.group === name) }));
  // Haircuts on the left, the rest on the right
  const cols = [[groups[0]], groups.slice(1)];
  cols.forEach((col, ci) => {
    let y = 400;
    for (const grp of col) {
      x.textAlign = 'left';
      x.fillStyle = '#c9a25e';
      x.font = '700 26px "Manrope Variable", Manrope, sans-serif';
      (x as any).letterSpacing = '9px';
      x.fillText(grp.name.toUpperCase(), colX[ci], y);
      (x as any).letterSpacing = '0px';
      x.fillStyle = 'rgba(201,162,94,0.5)';
      x.fillRect(colX[ci], y + 18, colW, 2);
      y += 86;
      for (const s of grp.items) {
        x.textAlign = 'left';
        x.fillStyle = '#f1ece4';
        x.font = '62px "Instrument Serif", Georgia, serif';
        x.fillText(s.name, colX[ci], y);
        const nameW = x.measureText(s.name).width;
        const price = `${s.from ? 'from ' : ''}$${s.price}`;
        x.font = '62px "Instrument Serif", Georgia, serif';
        const pw = x.measureText(price).width;
        x.fillStyle = 'rgba(201,162,94,0.45)';
        for (let d = colX[ci] + nameW + 18; d < colX[ci] + colW - pw - 18; d += 14) x.fillRect(d, y - 10, 4, 4);
        x.textAlign = 'right';
        x.fillStyle = goldGrad(colX[ci] + colW - pw, colX[ci] + colW);
        x.fillText(price, colX[ci] + colW, y);
        y += col.length === 1 ? 112 : 84;
      }
      y += 44;
    }
  });
  x.textAlign = 'center';
  x.fillStyle = 'rgba(243,238,230,0.6)';
  x.font = '600 28px "Manrope Variable", Manrope, sans-serif';
  (x as any).letterSpacing = '6px';
  x.fillText('BOOK ONLINE ON VAGARO   ·   (973) 376-9661', W / 2, H - 110);
  (x as any).letterSpacing = '0px';
  const t = tex(c, undefined, true, 16);
  return t;
}

export function resetSeed() {
  seed = 107;
}
