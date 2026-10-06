"""Builds server/public/assets/casino/ from casino.py's renders:

    python3 assemble.py <renders dir> <server/public/assets>

Scales the renders down, keys the monsters' portraits (popups/IC*-150.png, drawn on white) out of their
backgrounds, adds them to the lobby's tiles and the Scratchers' symbols, and draws the Scratchers' coatings.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from scipy import ndimage

SRC, ASSETS = sys.argv[1], sys.argv[2]
OUT = os.path.join(ASSETS, "casino")
rng = np.random.default_rng(141)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")


def save(img, rel, quality=88):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if rel.endswith(".jpg"):
        img.convert("RGB").save(path, quality=quality, optimize=True, progressive=False)
    else:
        img.save(path, optimize=True)
    print(rel, img.size)


def portrait(n):
    """Monster n's portrait (IC<n>-150.png) with its white background made transparent and its grey
    shadow made a soft dark one; cropped to what is left."""
    im = np.asarray(Image.open(os.path.join(ASSETS, "popups", f"IC{n}-150.png")).convert("RGB")).astype(np.float32)
    lum = im.mean(2)
    sat = im.max(2) - im.min(2)
    lab, _ = ndimage.label((sat < 28) & (lum > 95))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg |= ndimage.binary_dilation(bg) & ~bg & (lum > 170) & (sat < 60)
    a = np.where(bg, np.clip((255 - lum) / 255 * 1.5, 0, 1) * 0.8, 1.0)
    rgb = np.where(bg[..., None], 0, im)
    img = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    return img.crop(img.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())


def glow(img, color=(255, 110, 20), radius=6, strength=1.4):
    """img with a soft coloured glow round it (on a canvas big enough for the glow)."""
    pad = radius * 2
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(img, (pad, pad))
    a = canvas.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    a = a.point(lambda v: min(255, int(v * strength)))
    g = Image.new("RGBA", canvas.size, color + (0,))
    g.putalpha(a)
    g.alpha_composite(canvas)
    return g


def fit(img, w, h):
    """img scaled to fit in w x h, centred on a transparent w x h."""
    k = min(w / img.width, h / img.height)
    s = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    c.alpha_composite(s, ((w - s.width) // 2, (h - s.height) // 2))
    return c


def value_noise(w, h, cell, seed):
    r = np.random.default_rng(seed)
    g = r.random((h // cell + 3, w // cell + 3)).astype(np.float32)
    big = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize(((w // cell + 3) * cell, (h // cell + 3) * cell), Image.BICUBIC)).astype(np.float32) / 255
    return big[cell:cell + h, cell:cell + w]


def fbm(w, h, seed, cells=(64, 32, 16, 8, 4, 2)):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for i, c in enumerate(cells):
        out += value_noise(w, h, c, seed + i) * amp
        tot += amp
        amp *= 0.55
    return out / tot


# ------------------------------------------------------------------ Magma Drop
def magmadrop():
    b = load("board.png").convert("RGB").resize((474, 394), Image.LANCZOS)
    # darker in the middle, where the pegs are
    arr = 255 * (np.asarray(b).astype(np.float32) / 255) ** 2.0   # darker rock, the cracks still bright
    yy, xx = np.mgrid[0:394, 0:474]
    d = np.sqrt(((xx - 237) / 260) ** 2 + ((yy - 180) / 230) ** 2)
    arr *= np.clip(0.55 + d * 0.5, 0.55, 1.0)[..., None]
    save(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), "magmadrop/board_bg.jpg")
    save(load("peg.png").resize((18, 18), Image.LANCZOS), "magmadrop/peg.png")
    save(load("cup.png").resize((34, 30), Image.LANCZOS), "magmadrop/cup.png")
    save(fit(portrait(1), 40, 40), "magmadrop/spurtz_ball.png")


# ------------------------------------------------------------------ Brimstone Scratchers
SYMBOLS = ["crown", "balthazar", "spurtz", "magma", "sulfur", "coal", "bone"]


def scratch():
    for tier in ("bone", "obsidian", "magma"):
        save(load(f"card_{tier}.png").resize((300, 300), Image.LANCZOS), f"scratch/card_{tier}.png")
        save(coating(tier), f"scratch/coating_{tier}.png")
    for s in SYMBOLS:
        if s in ("balthazar", "spurtz"):
            src = portrait(5 if s == "balthazar" else 1)
        else:
            src = load(f"sym_{s}.png")
            src = src.crop(src.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
        # all the same size: 186 of 210 (62 of 70), with a glow round them
        img = glow(fit(src, 186, 186), radius=6, strength=0.9).resize((70, 70), Image.LANCZOS)
        save(img, f"scratch/symbol_{s}.png")


def coating(tier):
    """The ash to scratch off: a rough foil, a faint 3 x 3 grid pressed in it and a small skull in each cell."""
    S = 252
    n = fbm(S, S, {"bone": 1, "obsidian": 2, "magma": 3}[tier])
    fine = fbm(S, S, 9, (4, 2))
    # the pressed pattern (a height map)
    hm = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(hm)
    for k in (84, 168):
        d.line([(k, 6), (k, S - 6)], fill=150, width=2)
        d.line([(6, k), (S - 6, k)], fill=150, width=2)
    for c in range(9):
        cx, cy = (c % 3) * 84 + 42, (c // 3) * 84 + 42
        d.ellipse([cx - 13, cy - 15, cx + 13, cy + 9], fill=190)
        d.rectangle([cx - 7, cy + 5, cx + 7, cy + 14], fill=190)
        d.ellipse([cx - 9, cy - 6, cx - 2, cy + 1], fill=40)
        d.ellipse([cx + 2, cy - 6, cx + 9, cy + 1], fill=40)
        d.polygon([(cx, cy + 2), (cx - 2, cy + 6), (cx + 2, cy + 6)], fill=60)
        for tx in (-4, 0, 4):
            d.line([(cx + tx, cy + 9), (cx + tx, cy + 14)], fill=90, width=1)
    h = np.asarray(hm.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    h = h * 0.6 + n * 0.5 + fine * 0.25
    gy, gx = np.gradient(h)
    shade = np.clip(1.0 + (-gx - gy) * 6.0, 0.55, 1.5)
    base = {"bone": np.array([176, 166, 150]), "obsidian": np.array([62, 58, 66]), "magma": np.array([196, 132, 48])}[tier]
    col = base[None, None, :] * (0.75 + n[..., None] * 0.5) * shade[..., None]
    if tier == "obsidian":
        flecks = (fbm(S, S, 21, (2, 1)) > 0.86).astype(np.float32)
        col += flecks[..., None] * np.array([40, 40, 48])
    if tier == "magma":
        glint = np.clip((fine - 0.62) * 4, 0, 1)
        col += glint[..., None] * np.array([90, 60, 10])
    # a darker, burnt edge
    yy, xx = np.mgrid[0:S, 0:S]
    edge = np.minimum(np.minimum(xx, S - 1 - xx), np.minimum(yy, S - 1 - yy))
    col *= np.clip(0.75 + edge / 16, 0.75, 1.0)[..., None]
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), np.full((S, S), 255)]).astype(np.uint8), "RGBA")


# ------------------------------------------------------------------ the lobby
TILE_MONSTERS = {"magmadrop": [(1, (100, 62), 44)], "scratch": [(6, (98, 44), 58)], "roulette": [(8, (100, 40), 58)],
                 "bonepile": [(7, (100, 44), 56)], "slots": [(3, (96, 44), 60)], "ascent": [(5, (70, 2), 58)],
                 "derby": [(2, (4, 40), 54), (4, (94, 46), 56)]}


def lobby():
    bg = load("lobby.png").convert("RGB")
    save(bg.resize((728, 518), Image.LANCZOS), "lobby/lobby_bg.jpg", 86)
    # the tiles' backdrop: the cavern, blurred and dark, warmer at the top
    back = bg.resize((304, 216), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
    for i, g in enumerate(["magmadrop", "scratch", "roulette", "bonepile", "slots", "ascent", "derby"]):
        W, H = 152, 142
        x0 = [20, 80, 140, 60, 110, 30, 150][i]
        t = back.crop((x0, 40, x0 + W, 40 + H)).convert("RGBA")
        arr = np.asarray(t).astype(np.float32)
        yy, xx = np.mgrid[0:H, 0:W]
        glow_ = np.exp(-(((xx - 76) / 70) ** 2 + ((yy - 48) / 50) ** 2))
        arr[..., :3] = arr[..., :3] * 0.45 + glow_[..., None] * np.array([70, 26, 8])
        # dark at the bottom, for the game's name
        fade = np.clip((yy - 88) / 40, 0, 1)
        arr[..., :3] *= (1 - fade * 0.8)[..., None]
        t = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
        obj = load(f"tile_{g}.png").resize((152, 100), Image.LANCZOS)
        t.alpha_composite(obj, (0, 0))
        for n, (px, py), size in TILE_MONSTERS[g]:
            p = glow(fit(portrait(n), size, size), (0, 0, 0), 3, 1.0)
            t.alpha_composite(p, (px - 6, py - 6))
        # rounded corners
        m = Image.new("L", (W * 4, H * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, W * 4 - 1, H * 4 - 1], 40, fill=255)
        t.putalpha(ImageChops.multiply(t.getchannel("A"), m.resize((W, H), Image.LANCZOS)))
        save(t, f"lobby/tile_{g}.png")


# ------------------------------------------------------------------ the monsters, Roulette and Slots
MONSTERS = {"spurtz": 1, "zagnoid": 2, "malphus": 3, "valgos": 4, "balthazar": 5, "grokus": 6, "sabnox": 7, "wormzer": 8}
# the wheel's order (server/src/config/CasinoConfig.ts roulette.monsters): segment 0 King Wormzer, then
# segments 1 to 28 round these
WHEEL = ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox"]


def monsters():
    """Every monster's head, its white background taken out (120 px, a dark rim so it reads on any
    colour): the Roulette table and wheel, the Slots reels."""
    for m, n in MONSTERS.items():
        img = glow(fit(portrait(n), 208, 208), (0, 0, 0), 4, 1.2).resize((120, 120), Image.LANCZOS)
        save(img, f"monsters/{m}.png")


def roulette():
    import math
    wheel = load("wheel.png")          # 720 across: 3 x the game's 240
    for i in range(29):
        m = "wormzer" if i == 0 else WHEEL[(i - 1) % 7]
        icon = glow(fit(portrait(MONSTERS[m]), 180, 180), (0, 0, 0), 5, 1.4).resize((80, 80), Image.LANCZOS)
        a = i * 360 / 29
        icon = icon.rotate(-a, resample=Image.BICUBIC, expand=True)
        # at 0.84 of the way out (the band is 0.58 to 1.04; 1 = 300 px here, 100 in the game)
        cx = 360 + math.sin(math.radians(a)) * 0.84 * 300
        cy = 360 - math.cos(math.radians(a)) * 0.84 * 300
        wheel.alpha_composite(icon, (int(cx - icon.width / 2), int(cy - icon.height / 2)))
    save(wheel.resize((240, 240), Image.LANCZOS), "roulette/wheel.png")
    save(load("rim.png").resize((260, 260), Image.LANCZOS), "roulette/wheel_rim.png")


def slots():
    save(load("cabinet.png").resize((480, 400), Image.LANCZOS), "slots/cabinet.png")
    save(load("lever.png").resize((36, 140), Image.LANCZOS), "slots/lever.png")


def bonepile():
    g = load("grid_bg.png").convert("RGB").resize((474, 394), Image.LANCZOS)
    arr = 255 * (np.asarray(g).astype(np.float32) / 255) ** 1.8 * 0.8   # darker: the piles sit on it
    save(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), "bonepile/grid_bg.jpg")
    save(load("pile.png").resize((72, 72), Image.LANCZOS), "bonepile/pile.png")
    save(load("crystal.png").resize((52, 52), Image.LANCZOS), "bonepile/crystal.png")


def ascent():
    """The sky: a hazy cavern (drawn here: dark above, red glow low down, embers) behind the rendered
    lava sea and spires; the tower."""
    W, H = 1440, 450
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = yy / H
    sky = np.zeros((H, W, 3), np.float32)
    top, mid, low = np.array([10, 5, 6]), np.array([60, 16, 10]), np.array([150, 45, 14])
    k1 = np.clip(v / 0.6, 0, 1)[..., None]
    k2 = np.clip((v - 0.6) / 0.4, 0, 1)[..., None]
    sky = top * (1 - k1) + mid * k1
    sky = sky * (1 - k2) + low * k2
    haze = fbm(W, H, 77, (128, 64, 32, 16))
    sky *= (0.75 + haze * 0.5)[..., None]
    img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(5)
    for _ in range(140):
        x, y = r.uniform(0, W), r.uniform(0, H * 0.8)
        s = r.uniform(0.8, 2.2)
        c = (255, int(r.uniform(120, 200)), 60, int(r.uniform(90, 220)))
        d.ellipse([x - s, y - s, x + s, y + s], fill=c)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.alpha_composite(load("sky.png"))
    save(img.convert("RGB").resize((960, 300), Image.LANCZOS), "ascent/sky.jpg", 86)
    save(load("tower.png").resize((70, 120), Image.LANCZOS), "ascent/tower.png")


def derby():
    t = load("track.png").convert("RGB").resize((960, 226), Image.LANCZOS)
    arr = 255 * (np.asarray(t).astype(np.float32) / 255) ** 1.5 * 0.85   # darker: the runners on it
    save(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), "derby/track.jpg")
    save(load("finish.png").resize((60, 208), Image.LANCZOS), "derby/finish.png")


magmadrop()
scratch()
lobby()
monsters()
roulette()
slots()
bonepile()
ascent()
derby()
