"""
Bakes the seamless PBR texture sets used by the 3D homepage (src/scripts/drone).
Each set gets: <name>_c.webp (color, sRGB), <name>_n.webp (normal map, OpenGL +Y),
<name>_orm.webp (R = ambient occlusion, G = roughness, B = 0).
Colors were sampled from the real Studio 107 storefront and Street View photos.

Run:  python3 tools/bake_textures.py   (needs numpy + Pillow)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'drone', 'tex')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(107)


# ---------- helpers ----------
def fnoise(n, beta=2.0, seed=None, aniso=(1.0, 1.0)):
    """Seamless fractal noise via FFT filtering, normalised to 0..1."""
    r = np.random.default_rng(seed) if seed is not None else rng
    w = r.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None] * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1
    spec = np.fft.fft2(w) / f ** (beta / 2)
    spec[0, 0] = 0
    out = np.real(np.fft.ifft2(spec))
    out -= out.min()
    out /= out.max() + 1e-9
    return out


def hash2(a, b, s=0):
    """Deterministic per-cell random in 0..1 for integer arrays."""
    v = np.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453
    return v - np.floor(v)


def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx = -dx * strength
    ny = dy * strength  # OpenGL convention (green up)
    nz = np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return ((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)


def ao_from_height(h, radius=6, amount=1.0):
    img = Image.fromarray((h * 255).clip(0, 255).astype(np.uint8))
    blur = np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
    ao = 1 - np.clip((blur - h) * 3.0 * amount, 0, 1)
    return ao


def save(name, color, height, rough, normal_strength=4.0, ao=None, size=None, q=86):
    color = np.clip(color, 0, 1)
    c = Image.fromarray((color * 255).astype(np.uint8))
    n = Image.fromarray(normal_from_height(height, normal_strength))
    if ao is None:
        ao = ao_from_height(height)
    orm = np.stack([ao, np.clip(rough, 0, 1), np.zeros_like(ao)], -1)
    o = Image.fromarray((orm * 255).astype(np.uint8))
    if size:
        c, n, o = (im.resize((size, size), Image.LANCZOS) for im in (c, n, o))
    c.save(os.path.join(OUT, f'{name}_c.webp'), quality=q, method=6)
    n.save(os.path.join(OUT, f'{name}_n.webp'), quality=92, method=6)
    o.save(os.path.join(OUT, f'{name}_orm.webp'), quality=88, method=6)
    print('baked', name)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def palette_pick(ids, tones):
    tones = np.array([hexrgb(t) for t in tones])
    idx = (ids * len(tones)).astype(int) % len(tones)
    return tones[idx]


# ---------- brick: tile = 5 bricks x 15 courses (1.02 m square) ----------
def brick(N=2048):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    cw, ch = N / 5, N / 15
    row = np.floor(y / ch)
    xo = x + (row % 2) * cw / 2
    col = np.floor(xo / cw) % 5
    lx = (xo % cw) / cw
    ly = (y % ch) / ch
    mort_x, mort_y = 0.045, 0.14
    ex = np.minimum(lx, 1 - lx)
    ey = np.minimum(ly, 1 - ly)
    edge = np.minimum(ex / mort_x, ey / mort_y)
    face = np.clip((edge - 0.5) * 2.2, 0, 1)
    face = face * face * (3 - 2 * face)
    rid = hash2(col, row, 1)
    rid2 = hash2(col, row, 2)
    tones = ['#8e3f2b', '#9d4a31', '#7b3424', '#a9583a', '#6e3022', '#985039', '#b4673f', '#5f2a1e', '#8a4a35', '#a2503a']
    base = palette_pick(rid, tones)
    n1 = fnoise(N, 2.2, seed=3)
    n2 = fnoise(N, 1.2, seed=4)
    speck = fnoise(N, 0.4, seed=5)
    # per-brick tonal shift, soot toward the bottom of each brick, granular speckle
    col_rgb = base * (0.85 + 0.3 * rid2)[..., None]
    col_rgb *= (0.9 + 0.2 * n1)[..., None]
    col_rgb *= (1 - 0.18 * np.clip(ly - 0.55, 0, 1) * (rid > 0.6))[..., None]
    col_rgb += ((speck - 0.5) * 0.08)[..., None]
    mortar = hexrgb('#9b968d') * (0.82 + 0.25 * n2)[..., None]
    color = col_rgb * face[..., None] + mortar * (1 - face[..., None])
    height = 0.35 + 0.6 * face + 0.06 * (n1 - 0.5) + 0.05 * (speck - 0.5) * face
    pits = (fnoise(N, 0.2, seed=6) > 0.93) * face
    height -= pits * 0.08
    rough = 0.82 + 0.12 * (1 - face) + 0.05 * (n2 - 0.5)
    save('brick', color, height, rough, normal_strength=6.0)


# ---------- architectural shingles: tile = 1.2 m ----------
def shingles(N=1024):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    rows = 8
    rh = N / rows
    row = np.floor(y / rh)
    ly = (y % rh) / rh
    # irregular tab widths per row
    tabs = 6
    off = hash2(row, row, 3) * N / tabs
    xo = (x + off) % N
    tw = N / tabs
    tab = np.floor(xo / tw)
    lx = (xo % tw) / tw
    tid = hash2(tab, row, 4)
    gap = (np.minimum(lx, 1 - lx) < 0.012).astype(np.float32)
    v = 0.17 + 0.09 * tid
    grain = fnoise(N, 0.1, seed=8)
    grain2 = fnoise(N, 1.4, seed=9)
    shade = 1 - 0.55 * np.clip((ly - 0.82) / 0.18, 0, 1)  # shadow line under next course
    lum = v * (0.75 + 0.5 * grain) * shade * (1 - 0.6 * gap) * (0.92 + 0.16 * grain2)
    color = np.stack([lum, lum * 1.02, lum * 1.07], -1)
    height = (1 - ly) * 0.25 + 0.45 + 0.25 * grain - 0.35 * gap - 0.3 * np.clip((ly - 0.85) / 0.15, 0, 1)
    rough = 0.9 + 0.08 * grain
    save('shingles', color, height, rough, normal_strength=5.0)


# ---------- herringbone brick sidewalk: tile 0.8 m (pavers 0.2 x 0.1) ----------
def pavers(N=2048):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    u = N / 8  # 0.1 m
    # herringbone: in a 4u x 4u repeat, alternating horizontal/vertical 2u x 1u bricks along diagonals
    X, Y = x / u, y / u
    # Simpler robust herringbone via staircase pattern
    i = np.floor(X).astype(int)
    j = np.floor(Y).astype(int)
    m = (i - j) % 4
    # staircase herringbone: m 0/1 pair horizontally, m 3 (bottom) / 2 (top) pair vertically
    horiz = m < 2
    bx = np.where(horiz, i - (m % 2), i)
    by = np.where(horiz, j, j - (3 - m))
    lx = np.where(horiz, (X - bx) / 2, X - bx)
    ly = np.where(horiz, Y - by, (Y - by) / 2)
    ex = np.minimum(lx, 1 - lx) * np.where(horiz, 2, 1)
    ey = np.minimum(ly, 1 - ly) * np.where(horiz, 1, 2)
    edge = np.minimum(ex, ey)
    face = np.clip((edge - 0.035) / 0.06, 0, 1)
    face = face * face * (3 - 2 * face)
    rid = hash2(bx % 64, by % 64, 7)
    tones = ['#7e3a2c', '#6a3127', '#8b4435', '#5b2b23', '#93503d', '#733a2d', '#a05a43', '#64322a']
    base = palette_pick(rid, tones) * (0.85 + 0.3 * hash2(bx % 64, by % 64, 8))[..., None]
    n1 = fnoise(N, 1.8, seed=11)
    grit = fnoise(N, 0.2, seed=12)
    color = base * (0.86 + 0.24 * n1)[..., None] + ((grit - 0.5) * 0.06)[..., None]
    joint = hexrgb('#4a3b31') * (0.7 + 0.4 * n1)[..., None]
    color = color * face[..., None] + joint * (1 - face[..., None])
    # worn edges / dirt
    color *= (1 - 0.15 * (fnoise(N, 2.6, seed=13) > 0.7))[..., None]
    height = 0.3 + 0.6 * face + 0.05 * (grit - 0.5) + 0.04 * (rid - 0.5) * face
    rough = 0.78 + 0.15 * (1 - face) + 0.06 * (n1 - 0.5)
    save('pavers', color, height, rough, normal_strength=7.0)


# ---------- gravel with fallen leaves: tile 1 m ----------
def gravel(N=2048):
    height = np.zeros((N, N), np.float32)
    color = np.zeros((N, N, 3), np.float32) + hexrgb('#6f6a63') * 0.7
    yy, xx = np.mgrid[-14:15, -14:15].astype(np.float32)
    count = 26000
    xs = rng.integers(0, N, count)
    ys = rng.integers(0, N, count)
    rs = rng.uniform(4, 11, count)
    tones = np.array([hexrgb(t) for t in ['#b8b2a8', '#a39c91', '#cfc9bf', '#8d877e', '#9e9284', '#c2b7a6', '#7d7770', '#d9d3c8']])
    tid = rng.integers(0, len(tones), count)
    for k in range(count):
        r = rs[k]
        a = rng.uniform(0.7, 1.0)
        ang = rng.uniform(0, np.pi)
        ca, sa = np.cos(ang), np.sin(ang)
        px = (xx * ca + yy * sa) / r
        py = (-xx * sa + yy * ca) / (r * a)
        d = px * px + py * py
        bump = np.sqrt(np.clip(1 - d, 0, 1))
        msk = bump > 0
        ys_ = (ys[k] + yy.astype(int)) % N
        xs_ = (xs[k] + xx.astype(int)) % N
        hh = bump * r / 11
        cur = height[ys_, xs_]
        upd = msk & (hh > cur)
        height[ys_[upd], xs_[upd]] = hh[upd]
        shade = (0.8 + 0.35 * bump[upd])[:, None]
        color[ys_[upd], xs_[upd]] = tones[tid[k]] * shade * rng.uniform(0.85, 1.1)
    # fallen leaves (autumn, as in the Street View imagery)
    lc = 520
    leafTones = np.array([hexrgb(t) for t in ['#7a4a22', '#94572a', '#5e3a1e', '#a06a35', '#6b3f1f', '#8a3e22']])
    for k in range(lc):
        cx, cy = rng.integers(0, N, 2)
        L = rng.uniform(14, 26)
        ang = rng.uniform(0, np.pi * 2)
        ca, sa = np.cos(ang), np.sin(ang)
        px = (xx * ca + yy * sa) / L
        py = (-xx * sa + yy * ca) / (L * 0.45)
        d = px * px + py * py
        msk = d < 1
        ys_ = (cy + yy.astype(int)) % N
        xs_ = (cx + xx.astype(int)) % N
        height[ys_[msk], xs_[msk]] = np.maximum(height[ys_[msk], xs_[msk]], 0.75)
        color[ys_[msk], xs_[msk]] = leafTones[rng.integers(0, len(leafTones))] * rng.uniform(0.8, 1.1)
    height = np.clip(height, 0, 1)
    rough = 0.88 + 0.1 * (1 - height)
    save('gravel', color, height, rough, normal_strength=9.0, ao=ao_from_height(height, 4, 1.6))


# ---------- broom-finished concrete: tile 2 m ----------
def concrete(N=1024, name='concrete', base='#a19d95', seed=20):
    n1 = fnoise(N, 2.4, seed=seed)
    n2 = fnoise(N, 0.6, seed=seed + 1)
    broom = fnoise(N, 1.2, seed=seed + 2, aniso=(1.0, 14.0))
    stains = fnoise(N, 3.0, seed=seed + 3)
    lum = (0.86 + 0.18 * n1) * (0.95 + 0.1 * broom) * (1 - 0.18 * np.clip((stains - 0.62) * 4, 0, 1))
    color = hexrgb(base)[None, None, :] * lum[..., None] + ((n2 - 0.5) * 0.05)[..., None]
    height = 0.5 + 0.15 * broom + 0.1 * n2
    rough = 0.86 + 0.08 * n2
    save(name, color, height, rough, normal_strength=2.5)


def asphalt(N=1024):
    n1 = fnoise(N, 2.0, seed=30)
    agg = fnoise(N, 0.1, seed=31)
    patch = fnoise(N, 3.2, seed=32)
    lum = 0.16 + 0.07 * n1 + 0.09 * (agg > 0.62) * agg - 0.04 * (patch > 0.6)
    color = np.stack([lum, lum * 1.0, lum * 1.03], -1)
    height = 0.5 + 0.3 * agg + 0.1 * n1
    rough = 0.72 + 0.2 * agg - 0.2 * (patch > 0.65)  # smoother worn patches catch the lamps
    save('asphalt', color, height, rough, normal_strength=3.5)


# ---------- white vinyl siding (neighbour house): tile 1.2 m ----------
def siding(N=1024):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    boards = 6
    ly = (y % (N / boards)) / (N / boards)
    n1 = fnoise(N, 1.4, seed=40, aniso=(0.2, 1.0))
    height = ly * 0.7 + 0.1 * n1
    lum = 0.88 - 0.25 * np.clip((ly - 0.9) * 10, 0, 1) + 0.04 * (n1 - 0.5)
    color = np.stack([lum, lum * 0.995, lum * 0.98], -1)
    rough = 0.55 + 0.1 * n1
    save('siding', color, height, rough, normal_strength=5.0)


def stucco(N=512):
    n = fnoise(N, 0.8, seed=50)
    n2 = fnoise(N, 2.2, seed=51)
    lum = 0.8 + 0.06 * n + 0.05 * n2
    color = np.stack([lum, lum * 0.99, lum * 0.96], -1)
    save('stucco', color, n * 0.6 + n2 * 0.2, 0.92 - 0.05 * n, normal_strength=2.5)


# ---------- interior: reclaimed wood plank wall, tile 2.4 m x 2.4 m ----------
def woodwall(N=2048):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    rows = 18
    rh = N / rows
    row = np.floor(y / rh)
    ly = (y % rh) / rh
    color = np.zeros((N, N, 3), np.float32)
    height = np.zeros((N, N), np.float32)
    tones = ['#3b2a1f', '#4e3626', '#6b4b33', '#7d5d42', '#9a7b5c', '#b39a7a', '#d6cdbd', '#c9bfae', '#5a4a3e', '#2f241c', '#8a6a4c', '#e2dccf']
    grain = fnoise(N, 1.6, seed=60, aniso=(0.08, 1.0))
    fine = fnoise(N, 0.6, seed=61, aniso=(0.15, 1.0))
    knots = fnoise(N, 2.8, seed=62)
    for r in range(rows):
        sl = slice(int(r * rh), int((r + 1) * rh))
        px = -rng.uniform(0, 500)
        while px < N:
            w = rng.uniform(260, 820)
            a, b = int(max(px, 0)), int(min(px + w, N))
            tone = hexrgb(tones[rng.integers(0, len(tones))]) * rng.uniform(0.85, 1.12)
            color[sl, a:b] = tone
            height[sl, a:b] = rng.uniform(0.55, 0.8)
            # board end gaps
            if a > 0:
                color[sl, a:a + 3] *= 0.3
                height[sl, a:a + 3] = 0.1
            px += w
    lum = 0.78 + 0.35 * grain[..., None] + 0.12 * (fine[..., None] - 0.5)
    color *= lum
    color *= (1 - 0.3 * np.clip((knots - 0.8) * 5, 0, 1))[..., None]
    gap = np.clip(1 - np.minimum(ly, 1 - ly) / 0.05, 0, 1)
    color *= (1 - 0.75 * gap)[..., None]
    height = height + 0.12 * grain + 0.05 * fine - 0.6 * gap
    rough = 0.72 + 0.15 * fine
    save('woodwall', color, height, rough, normal_strength=6.0)


# ---------- interior floor: grey-brown vinyl plank, tile 2.4 m ----------
def floor(N=2048):
    cols = 12
    cw = N / cols
    color = np.zeros((N, N, 3), np.float32)
    height = np.ones((N, N), np.float32) * 0.6
    grain = fnoise(N, 1.5, seed=70, aniso=(1.0, 0.07))
    for c in range(cols):
        a, b = int(c * cw), int((c + 1) * cw)
        py = -rng.uniform(0, N)
        while py < N:
            h = rng.uniform(700, 1300)
            s, e = int(max(py, 0)), int(min(py + h, N))
            v = rng.uniform(0.38, 0.52)
            color[s:e, a:b] = np.array([v * 1.08, v * 1.0, v * 0.9])
            if s > 0:
                height[s:s + 3, a:b] = 0.2
            py += h
        height[:, a:a + 3] = 0.2
    color *= (0.82 + 0.3 * grain)[..., None]
    rough = 0.42 + 0.2 * grain
    save('floor', color, height + 0.1 * grain, rough, normal_strength=3.0)


if __name__ == '__main__':
    brick()
    shingles()
    pavers()
    gravel()
    concrete()
    concrete(name='sidewalk', base='#9a958c', seed=24)
    asphalt()
    siding()
    stucco()
    woodwall()
    floor()


def shrink():
    """Keep the download small: 1K everywhere except a few hero color maps."""
    keep2k = {'brick_c', 'pavers_c', 'woodwall_c'}
    for f in sorted(os.listdir(OUT)):
        stem = f.rsplit('.', 1)[0]
        im = Image.open(os.path.join(OUT, f))
        if stem not in keep2k and im.width > 1024:
            im = im.resize((1024, 1024), Image.LANCZOS)
        q = 80 if stem.endswith('_n') else (78 if stem.endswith('_orm') else 84)
        im.save(os.path.join(OUT, f), quality=q, method=6)


if __name__ == '__main__':
    shrink()
