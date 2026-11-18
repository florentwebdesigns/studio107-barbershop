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

/* ---------- Signage ---------- */








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
  g.addColorStop(0, '#0b1633');
  g.addColorStop(0.2, '#15274f');
  g.addColorStop(0.36, '#2b3f6c');
  g.addColorStop(0.44, '#5c5170');
  g.addColorStop(0.475, '#b8775a');
  g.addColorStop(0.497, '#eaa66a');
  g.addColorStop(0.53, '#2a201d');
  g.addColorStop(1, '#0a0909');
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 512);
  return tex(c);
}

/* ---------- Interior ---------- */



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
      y += col.length === 1 ? 86 : 72;
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
        y += col.length === 1 ? 112 : 74;
      }
      y += col.length === 1 ? 44 : 34;
    }
  });
  x.textAlign = 'center';
  x.fillStyle = 'rgba(243,238,230,0.6)';
  x.font = '600 28px "Manrope Variable", Manrope, sans-serif';
  (x as any).letterSpacing = '6px';
  x.fillText('BOOK ONLINE ON VAGARO   ·   (973) 376-9661', W / 2, H - 70);
  (x as any).letterSpacing = '0px';
  const t = tex(c, undefined, true, 16);
  return t;
}

/** Neighbour unit (dog groomer): black dog silhouettes in white circles, no business name. */
export function dogDecals() {
  const W = 1024, H = 512;
  const [c, x] = canvas(W, H);
  x.clearRect(0, 0, W, H);
  const paw = (cx: number, cy: number, s: number, rot: number) => {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.scale(s, s);
    x.fillStyle = '#121212';
    x.beginPath();
    x.ellipse(0, 22, 34, 28, 0, 0, 7); // main pad
    x.fill();
    for (const [tx, ty, r] of [[-38, -14, 13], [-14, -36, 14], [14, -36, 14], [38, -14, 13]] as const) {
      x.beginPath();
      x.ellipse(tx, ty, r, r * 1.25, tx * 0.01, 0, 7);
      x.fill();
    }
    x.restore();
  };
  const spots: [number, number, number][] = [[170, 150, -0.2], [420, 150, 0.15], [170, 380, 0.1], [420, 380, -0.15]];
  for (const [cx, cy, r] of spots) {
    x.fillStyle = 'rgba(245,245,240,0.92)';
    x.beginPath();
    x.ellipse(cx, cy, 105, 108, 0, 0, 7);
    x.fill();
    paw(cx, cy + 4, 1.1, r);
  }
  // a small white info panel on the right, as in the photo (no legible text)
  x.fillStyle = 'rgba(240,240,236,0.85)';
  x.fillRect(640, 60, 300, 400);
  x.fillStyle = 'rgba(30,30,30,0.6)';
  for (let i = 0; i < 9; i++) x.fillRect(670, 100 + i * 38, 140 + ((i * 53) % 90), 12);
  return tex(c);
}

/** Neighbour unit (day spa): brown sign panel with a cream border and ornament, no name. */
export function spaSign() {
  const W = 1024, H = 192;
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4a2d20');
  g.addColorStop(1, '#3a2218');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(236,222,196,0.8)';
  x.lineWidth = 5;
  x.strokeRect(18, 18, W - 36, H - 36);
  x.beginPath();
  x.arc(W / 2, H / 2, 40, 0, 7);
  x.stroke();
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(140, H / 2); x.lineTo(W / 2 - 60, H / 2);
  x.moveTo(W / 2 + 60, H / 2); x.lineTo(W - 140, H / 2);
  x.stroke();
  noise(x, W, H, 0.06, 6000);
  return tex(c);
}

/** Generic softly lit shop interior seen through a neighbour's glass at dusk. */
export function shopInterior(tint: string, salon = false) {
  const W = 512, H = 256;
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, tint);
  g.addColorStop(1, '#0b0a0a');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const r = x.createRadialGradient(W * 0.5, 0, 10, W * 0.5, 0, W * 0.7);
  r.addColorStop(0, 'rgba(255,240,220,0.35)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  if (salon) {
    // styling stations: lit mirrors with chair silhouettes
    for (let i = 0; i < 4; i++) {
      const mx = 40 + i * 120;
      x.fillStyle = 'rgba(255,226,190,0.26)';
      x.fillRect(mx, 60, 70, 95);
      x.fillStyle = 'rgba(30,20,15,0.9)';
      x.beginPath();
      x.ellipse(mx + 35, 175, 26, 30, 0, 0, 7);
      x.fill();
      x.fillRect(mx + 31, 200, 8, 30);
    }
  } else {
    // a front counter and wall shelves
    x.fillStyle = 'rgba(20,22,26,0.85)';
    x.fillRect(260, 150, 200, 90);
    for (let i = 0; i < 3; i++) {
      x.fillStyle = 'rgba(200,210,220,0.18)';
      x.fillRect(40, 70 + i * 45, 170, 6);
      for (let k = 0; k < 8; k++) {
        x.fillStyle = `rgba(${120 + rand() * 120},${100 + rand() * 100},${90 + rand() * 120},0.6)`;
        x.fillRect(46 + k * 20, 50 + i * 45, 14, 20);
      }
    }
  }
  noise(x, W, H, 0.05, 4000);
  return tex(c);
}

/** The shop's own "BARBER" feather flag (red / white / blue), as in the Street View photo. */
export function featherFlag() {
  const W = 256, H = 1024;
  const [c, x] = canvas(W, H);
  x.clearRect(0, 0, W, H);
  // feather silhouette
  x.beginPath();
  x.moveTo(0, 40);
  x.bezierCurveTo(60, 0, 230, 10, 250, 140);
  x.lineTo(232, 1000);
  x.lineTo(0, 1000);
  x.closePath();
  x.save();
  x.clip();
  x.fillStyle = '#f4f2ee';
  x.fillRect(0, 0, W, H);
  // diagonal pole stripes down the leading edge
  x.save();
  x.beginPath();
  x.rect(0, 0, 52, H);
  x.clip();
  for (let y = -60; y < H; y += 60) {
    x.fillStyle = '#c8202d';
    x.beginPath(); x.moveTo(0, y); x.lineTo(52, y + 26); x.lineTo(52, y + 46); x.lineTo(0, y + 20); x.fill();
    x.fillStyle = '#1f3fae';
    x.beginPath(); x.moveTo(0, y + 30); x.lineTo(52, y + 56); x.lineTo(52, y + 70); x.lineTo(0, y + 44); x.fill();
  }
  x.restore();
  x.fillStyle = '#1f3fae';
  x.fillRect(220, 0, 40, H);
  x.fillStyle = '#c8202d';
  x.fillRect(206, 0, 12, H);
  // BARBER, reading bottom-to-top like the real flag
  x.save();
  x.translate(140, 560);
  x.rotate(-Math.PI / 2);
  x.fillStyle = '#121212';
  x.font = '900 118px "Manrope Variable", Manrope, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('BARBER', 0, 0);
  x.restore();
  x.restore();
  const t = tex(c);
  return t;
}

export function resetSeed() {
  seed = 107;
}
