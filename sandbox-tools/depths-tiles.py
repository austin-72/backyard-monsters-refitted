# Usage: python3 depths-tiles.py client/scripts/_assets/hellmap client/scripts/_assets/hellmap [platform scale, 0.68]
# (needs numpy and Pillow; reads land2_2.png and water3_2.png from the first folder)
# Depths of Hell map tiles: a lava backdrop, 4 platform variants, 6 half-bridges (150 x 100 each, the map's tile size).
# Second look (4 October, evening): red and black fire-and-brimstone platforms, wooden plank bridges.
import numpy as np, math, sys
from PIL import Image, ImageDraw, ImageFilter
SRC = sys.argv[1]; OUT = sys.argv[2]
W, H = 150, 100
CX, CY = 75.0, 37.5
FACE = [(36, 0), (114, 0), (150, 37.5), (114, 75), (36, 75), (0, 37.5)]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 0.68
PLAT = [(CX + (x - CX) * K, CY + (y - CY) * K) for x, y in FACE]
yy, xx = np.mgrid[0:H, 0:W]

def mask(poly, w=W, h=H, scale=4):
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).polygon([(x * scale, y * scale) for x, y in poly], fill=255)
    return m.resize((w, h), Image.LANCZOS)

def noise(seed, w, h, octaves=(8, 16, 32), weights=(0.5, 0.3, 0.2)):
    r = np.random.default_rng(seed); out = np.zeros((h, w))
    for o, wt in zip(octaves, weights):
        g = r.random((h // o + 3, w // o + 3))
        img = Image.fromarray((g * 255).astype(np.uint8)).resize(((w // o + 3) * o, (h // o + 3) * o), Image.BICUBIC)
        out += np.asarray(img, dtype=float)[:h, :w] / 255 * wt
    return out

def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=float) / 255

def rgba(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")

def fire(t):
    # 0..1 heat to colour: deep red, orange, yellow-white
    t = np.clip(t, 0, 1)[..., None]
    return np.clip(np.concatenate([120 + 135 * t * 1.6, 10 + 200 * t ** 1.6, 0 + 120 * t ** 3], -1), 0, 255)

# ---- the lava backdrop: the void's lava art in the face, scorched black-red rock walls below
land = np.asarray(Image.open(f"{SRC}/land2_2.png").convert("RGBA"), dtype=float)
import os
face = np.asarray(mask(FACE).filter(ImageFilter.MaxFilter(3)), dtype=float) / 255  # a pixel past the edge: no dark seam between cells
walls = land.copy()
lum = walls[..., :3].mean(-1)
walls[..., 0] = lum * 0.62 + 8; walls[..., 1] = lum * 0.30; walls[..., 2] = lum * 0.26
# every lava texture of the map (3 depths x 3 looks), so the Depths' lava doesn't repeat (the user's, 4 October):
# depths_lava.png from water3_2 (the first one), depths_lava_2..9 from the others
LAVAS = [("water3_2", "depths_lava.png")] + [(n, f"depths_lava_{i + 2}.png") for i, n in enumerate(
    ["water3_3", "water3_4", "water2_2", "water2_3", "water2_4", "water1_2", "water1_3", "water1_4"])]
for srcname, outname in LAVAS:
    lava = np.asarray(Image.open(f"{SRC}/{srcname}.png").convert("RGBA"), dtype=float)
    lv = lava[..., :3].copy()
    # the art has a dark outline round its face: grow the inside out over the outline (and a pixel past the edge)
    known = np.asarray(mask(FACE).filter(ImageFilter.MinFilter(5)), dtype=float) / 255 > 0.99
    ring = ~known
    for _ in range(5):
        acc = np.zeros_like(lv); cnt = np.zeros((H, W))
        for ddy in (-1, 0, 1):
            for ddx in (-1, 0, 1):
                k = np.roll(known, (ddy, ddx), (0, 1)); acc += np.roll(lv, (ddy, ddx), (0, 1)) * k[..., None]; cnt += k
        grow = (~known) & (cnt > 0)
        lv[grow] = acc[grow] / cnt[grow][:, None]; known = known | grow
    soft = np.stack([np.asarray(Image.fromarray(np.clip(lv[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), dtype=float) for c in range(3)], -1)
    lv[ring] = soft[ring]
    ll = lv.mean(-1)
    dark = np.clip((95 - ll) / 60, 0, 1)[..., None]
    lv = lv * (1 - 0.75 * dark) + np.array([128, 34, 6]) * (0.75 * dark) * (0.7 + 0.6 * (ll[..., None] / 95))
    lv *= 0.9
    # darker, smouldering (the user's, 4 October): most of the lava dimmed to a deep red-orange, the hottest streaks
    # keeping some glow; LAVA_DIM 0 = the bright lava art, 1 = the darkened look
    DIM = float(os.environ.get("LAVA_DIM", "1"))
    t = np.clip(lv.mean(-1, keepdims=True) / 255, 0, 1)
    dim = lv * (0.40 + 0.32 * t ** 2)
    dim[..., 1] *= 0.78; dim[..., 2] *= 0.7
    lv = lv * (1 - DIM) + dim * DIM
    o = walls.copy()
    for c in range(3):
        o[..., c] = o[..., c] * (1 - face) + lv[..., c] * face
    o[..., 3] = np.maximum(land[..., 3], face * 255)
    rgba(o).save(f"{OUT}/{outname}")

# ---- platforms
pm = np.asarray(mask(PLAT), dtype=float) / 255
D = 7  # the pillar under the platform's lower half: the lower edges dropped by D px
lower = [PLAT[5], PLAT[4], PLAT[3], PLAT[2]]
pillar_poly = lower + [(x, y + D) for x, y in reversed(lower)]
pil = np.asarray(mask(pillar_poly), dtype=float) / 255

def cells(seed, sx=12, sy=9, jx=3, jy=2):
    r = np.random.default_rng(seed)
    pts = np.array([(x + r.uniform(-jx, jx), y + r.uniform(-jy, jy)) for y in np.arange(4, 76, sy) for x in np.arange((y // sy % 2) * sx / 2, 150, sx)])
    d = np.sqrt((xx[..., None] - pts[:, 0]) ** 2 + ((yy[..., None] - pts[:, 1]) * 1.6) ** 2)
    ds = np.sort(d, axis=2)
    return ds[..., 1] - ds[..., 0], np.argmin(d, axis=2), r.uniform(0.7, 1.15, len(pts))

def cracked(seed):
    # black volcanic crust broken into plates, molten red-orange in the cracks
    gap, idx, shade = cells(seed, 14, 10, 4, 3)
    n = noise(seed, W, H)
    crust = np.stack([34 + 26 * n, 22 + 14 * n, 20 + 12 * n], -1) * shade[idx][..., None]
    crack = np.clip(1 - gap / 1.8, 0, 1)
    halo = blur(crack, 1.6)
    heat = np.clip(crack + 0.35 * halo, 0, 1)
    col = crust * (1 - heat[..., None]) + fire(0.35 + 0.65 * crack * (0.6 + 0.4 * n)) * heat[..., None]
    col += np.stack([70 * halo, 10 * halo, 0 * halo], -1)
    return col

def brimstone(seed):
    # brimstone cobbles: rough red stones glowing at their hearts, packed in black cinders, ember specks
    r = np.random.default_rng(seed)
    gap, idx, shade = cells(seed, 9, 7, 2.5, 1.8)
    n = noise(seed, W, H, (3, 6, 12), (0.4, 0.35, 0.25))
    stone = np.clip(gap / 4.0, 0, 1)
    heart = np.clip((gap - 2.2) / 3.0, 0, 1)
    col = np.stack([70 + 60 * n, 14 + 16 * n, 10 + 10 * n], -1) * shade[idx][..., None]
    col = col * (0.25 + 0.75 * stone[..., None])
    col += np.stack([110 * heart, 26 * heart, 0 * heart], -1) * (0.6 + 0.4 * n[..., None])
    sh = np.roll(n, (1, 1), (0, 1)) - n
    col += (sh * 90 * stone)[..., None] * np.array([1.0, 0.4, 0.3])
    emb = np.zeros((H, W))
    for _ in range(30):
        x, y = r.uniform(30, 120), r.uniform(10, 66)
        emb[int(y), int(x)] = r.uniform(0.6, 1)
    ember = np.clip(emb + blur(emb, 1.0) * 3, 0, 1) * (1 - stone * 0.6)
    col = col * (1 - ember[..., None]) + fire(0.6 + 0.4 * ember) * ember[..., None]
    return col

def seal(seed):
    # a black obsidian slab cut in flagstones, a burning seal of rings and runes in red
    n = noise(seed, W, H, (5, 10), (0.6, 0.4))
    col = np.stack([26 + 20 * n, 18 + 12 * n, 18 + 12 * n], -1)
    gx = ((xx + (yy // 12 % 2) * 9) % 18) < 1.3
    gy = (yy % 12) < 1.0
    col[gx | gy] *= 0.4
    sheen = np.clip((n - 0.6) * 4, 0, 1)[..., None] * np.array([46, 30, 30])
    col += sheen
    rr = np.sqrt((xx - CX) ** 2 + ((yy - CY) * 2.0) ** 2)
    ring = np.clip(1 - np.abs(rr - 27) / 1.5, 0, 1) + np.clip(1 - np.abs(rr - 20) / 1.0, 0, 1) * 0.8
    ang = np.arctan2((yy - CY) * 2.0, xx - CX)
    ticks = (np.abs(np.sin(ang * 6)) < 0.08) & (rr > 20) & (rr < 27)
    # a five-pointed star drawn as lines inside the inner ring
    star = Image.new("L", (W * 4, H * 4), 0); dr = ImageDraw.Draw(star)
    pts = [(CX + 19 * math.cos(-math.pi / 2 + k * 4 * math.pi / 5), CY + 9.5 * math.sin(-math.pi / 2 + k * 4 * math.pi / 5)) for k in range(6)]
    dr.line([(x * 4, y * 4) for x, y in pts], fill=255, width=5)
    star = np.asarray(star.resize((W, H), Image.LANCZOS), dtype=float) / 255
    glyph = np.clip(ring + ticks + star, 0, 1)
    glow = blur(glyph, 2.2)
    col = col * (1 - glyph[..., None]) + fire(0.4 + 0.5 * glyph) * glyph[..., None]
    col += np.stack([130 * glow, 18 * glow, 0 * glow], -1)
    return col

def vents(seed):
    # black rock with fire vents: small flames standing up out of glowing holes
    r = np.random.default_rng(seed)
    n = noise(seed, W, H, (6, 12, 24), (0.5, 0.3, 0.2))
    col = np.stack([40 + 26 * n, 24 + 14 * n, 22 + 12 * n], -1)
    sh = np.roll(n, (1, 1), (0, 1)) - n
    col += (sh * 110)[..., None] * np.array([1.0, 0.6, 0.5])
    holes = Image.new("L", (W * 4, H * 4), 0); dh = ImageDraw.Draw(holes)
    flames = Image.new("L", (W * 4, H * 4), 0); df = ImageDraw.Draw(flames)
    cores = Image.new("L", (W * 4, H * 4), 0); dc = ImageDraw.Draw(cores)
    for x, y in [(56, 30), (94, 26), (74, 48), (100, 47), (48, 50)][: 5]:
        x += r.uniform(-3, 3); y += r.uniform(-2, 2)
        dh.ellipse([(x - 5) * 4, (y - 2.2) * 4, (x + 5) * 4, (y + 2.2) * 4], fill=255)
        for k in range(3):
            fx = x + (k - 1) * 2.6 + r.uniform(-0.6, 0.6); hgt = r.uniform(9, 14) * (1.0 if k == 1 else 0.7)
            lean = r.uniform(-2, 2)
            df.polygon([((fx - 2.6) * 4, y * 4), ((fx + lean) * 4, (y - hgt) * 4), ((fx + 2.6) * 4, y * 4)], fill=255)
            dc.polygon([((fx - 1.2) * 4, y * 4), ((fx + lean * 0.5) * 4, (y - hgt * 0.5) * 4), ((fx + 1.2) * 4, y * 4)], fill=255)
    holes = np.asarray(holes.resize((W, H), Image.LANCZOS), dtype=float) / 255
    fl = np.asarray(flames.resize((W, H), Image.LANCZOS), dtype=float) / 255
    core = np.asarray(cores.resize((W, H), Image.LANCZOS), dtype=float) / 255
    glow = blur(np.maximum(holes, fl), 3)
    col += np.stack([150 * glow, 30 * glow, 0 * glow], -1)
    col = col * (1 - holes[..., None]) + fire(0.7)[None, None] * holes[..., None] * np.ones((H, W, 1))
    return col, fl, core

variants = [cracked(11), brimstone(23), seal(37)]
vcol, vflame, vcore = vents(41)
variants.append(vcol)

edge_d = np.asarray(Image.fromarray((pm * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)), dtype=float) / 255
rim = pm - edge_d
top_edge = rim * (yy < CY)  # the far edges catch the glow of the lava
shadow = blur(np.clip(pm + pil, 0, 1), 4)
for i, tex in enumerate(variants):
    o = np.zeros((H, W, 4))
    o[..., 3] = np.roll(shadow, 3, axis=0) * 80
    # the pillar: black rock, vertical streaks, red heat creeping up from the lava at its foot
    streak = noise(100 + i, W, H, (2, 4), (0.6, 0.4))
    wall = np.stack([30 + 22 * streak, 18 + 12 * streak, 16 + 10 * streak], -1)
    foot = np.zeros((H, W))
    for x in range(W):
        col_ = np.nonzero(pil[:, x] > 0.5)[0]
        if len(col_):
            b = col_.max(); foot[:, x] = np.clip(1 - (b - yy[:, x]) / 5.0, 0, 1) * (yy[:, x] <= b)
    wall = wall * (1 - 0.8 * foot[..., None]) + fire(0.3 + 0.3 * streak)[...] * (0.8 * foot[..., None])
    for c in range(3):
        o[..., c] = wall[..., c] * pil + o[..., c] * (1 - pil)
    o[..., 3] = np.maximum(o[..., 3], pil * 255)
    top = tex * (1 - 0.5 * rim[..., None]) + np.stack([90 * top_edge, 26 * top_edge, 0 * top_edge], -1)
    for c in range(3):
        o[..., c] = top[..., c] * pm + o[..., c] * (1 - pm)
    o[..., 3] = np.maximum(o[..., 3], pm * 255)
    if i == 3:
        # the flames stand over the platform (they may rise past its edge)
        fcol = fire(0.45 + 0.5 * vcore + 0.15 * (1 - yy / 75.0))
        a = np.clip(vflame * 0.95, 0, 1)
        for c in range(3):
            o[..., c] = fcol[..., c] * a + o[..., c] * (1 - a)
        o[..., 3] = np.maximum(o[..., 3], a * 255)
    rgba(o).save(f"{OUT}/depths_platform_{i + 1}.png")

# ---- half-bridges of wooden planks, from under the platform's edge to the face's edge: N, NE, SE, S, SW, NW
MIDS = {"n": (75, 0), "ne": (132, 18.75), "se": (132, 56.25), "s": (75, 75), "sw": (18, 56.25), "nw": (18, 18.75)}
for name, (mx, my) in MIDS.items():
    S = 4
    r = np.random.default_rng(300 + list(MIDS).index(name))
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0)); dr = ImageDraw.Draw(img)
    dx, dy = mx - CX, my - CY
    L = math.hypot(dx, dy); ux, uy = dx / L, dy / L
    straight = name in ("n", "s")
    px, py = -uy, ux
    BW = 2.0  # (twice the size they were, the user's, 4 October)
    half = (9.0 if straight else 8.0) * BW
    start = K - 0.08
    end = 1.0
    def at(t, side):
        cx_, cy_ = CX + dx * t + ux * 0.8 * (t >= end), CY + dy * t + uy * 0.8 * (t >= end)
        if straight:
            return (cx_ + side * half, cy_)
        return (cx_ + side * px * half, cy_ + side * py * half * 0.62)
    deck = [at(start, 1), at(end, 1), at(end, -1), at(start, -1)]
    sh = [(x + 2.2, y + 5) for x, y in deck]
    dr.polygon([(x * S, y * S) for x, y in sh], fill=(12, 2, 0, 110))
    # stringers under the planks (dark, a little wider)
    dr.polygon([(x * S, y * S) for x, y in deck], fill=(60, 32, 12, 255))
    # planks: one quad each, a gap between, each its own shade of brown, a lighter top edge
    steps = max(3, int(L * (end - start) / 4.2))
    for k in range(steps):
        t0 = start + (end - start) * k / steps; t1 = start + (end - start) * (k + 0.78) / steps
        q = [at(t0, 1.05), at(t1, 1.05), at(t1, -1.05), at(t0, -1.05)]
        s = r.uniform(0.82, 1.12)
        dr.polygon([(x * S, y * S) for x, y in q], fill=(int(176 * s), int(104 * s), int(44 * s), 255))
        g = [at(t0 + (t1 - t0) * 0.45, 0.9), at(t0 + (t1 - t0) * 0.45, -0.9)]
        dr.line([(x * S, y * S) for x, y in g], fill=(int(120 * s), int(66 * s), int(24 * s), 255), width=max(1, S // 2))
        if r.random() < 0.3:  # a scorched plank
            dr.polygon([(x * S, y * S) for x, y in q[:2] + [at(t1, 0.2), at(t0, 0.2)]], fill=(60, 34, 18, 200))
    # side rails (rope-tied logs) and a post at the outer end on each side
    for side in (1, -1):
        a, b = at(start, side * 1.1), at(end, side * 1.1)
        dr.line([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)], fill=(86, 44, 16, 255), width=int(S * 1.8 * BW))
        dr.line([(a[0] * S, (a[1] - 0.5 * BW) * S), (b[0] * S, (b[1] - 0.5 * BW) * S)], fill=(196, 128, 58, 230), width=max(1, S))
        p = at(K + 0.04, side * 1.1)
        dr.rectangle([(p[0] - 1.1 * BW) * S, (p[1] - 3.2 * BW) * S, (p[0] + 1.1 * BW) * S, (p[1] + 0.6 * BW) * S], fill=(84, 50, 24, 255))
        dr.rectangle([(p[0] - 1.1 * BW) * S, (p[1] - 3.2 * BW) * S, (p[0] + 1.1 * BW) * S, (p[1] - 2.4 * BW) * S], fill=(170, 116, 64, 255))
    img.resize((W, H), Image.LANCZOS).save(f"{OUT}/depths_bridge_{name}.png")
print("ok")
