# Usage: python3 topbar-icons.py server/public/assets/topbar
# (needs numpy and Pillow)
# The top bar's shortcut pictures (UI_TOP.ioTopBars): Alliances, Attack Log, Leaderboard, Change Log, drawn like the
# level star and the Shiny coins: an outline, a bevel (light top-left, deep bottom-right) and a shine; the trophy and
# the page in gold and parchment, the shield and the swords in steel (with green and white, leather and red). 128 x 128 PNGs, shown at 38 (sharp on phones too). The user's, 4 October.
import math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
N = 128          # the picture's size
SS = 4           # drawn this many times bigger, then scaled down
BIG = N * SS

OUTLINE = (122, 62, 6)
GOLD = ((255, 236, 96), (246, 176, 22))      # top, bottom of a gold part
LIGHT = (255, 250, 200)
DEEP = (190, 112, 8)


def poly_mask(points, size=BIG):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in points], fill=255)
    return m


def ellipse_mask(box):
    m = Image.new("L", (BIG, BIG), 0)
    ImageDraw.Draw(m).ellipse([v * SS for v in box], fill=255)
    return m


def line_mask(points, width):
    m = Image.new("L", (BIG, BIG), 0)
    ImageDraw.Draw(m).line([(x * SS, y * SS) for x, y in points], fill=255, width=int(width * SS), joint="curve")
    for x, y in (points[0], points[-1]):
        r = width * SS / 2
        ImageDraw.Draw(m).ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=255)
    return m


def union(*masks):
    out = np.zeros((BIG, BIG))
    for m in masks:
        out = np.maximum(out, np.asarray(m, dtype=float))
    return Image.fromarray(out.astype(np.uint8))


def arr(m):
    return np.asarray(m, dtype=float) / 255


def shift(a, dx, dy):
    return np.roll(np.roll(a, int(dy * SS), axis=0), int(dx * SS), axis=1)


def part(canvas, mask, colors=GOLD, outline=3.2, bevel=2.2, shine=True, light=LIGHT, deep=DEEP, ocolor=OUTLINE):
    """Paints one part on `canvas` (H x W x 4 float): outline, gradient body, bevel, shine."""
    m = arr(mask)
    if m.max() == 0:
        return
    ys = np.nonzero(m.max(axis=1) > 0.5)[0]
    top, bottom = ys.min(), ys.max()
    if outline > 0:
        o = arr(mask.filter(ImageFilter.MaxFilter(int(outline * SS) * 2 + 1)))
        a = o * (1 - canvas[..., 3] * 0)  # the outline goes over what is under it
        for c in range(3):
            canvas[..., c] = canvas[..., c] * (1 - o) + ocolor[c] * o
        canvas[..., 3] = np.maximum(canvas[..., 3], o)
    t = np.clip((np.arange(BIG)[:, None] - top) / max(1, bottom - top), 0, 1)
    body = np.zeros((BIG, BIG, 3))
    for c in range(3):
        body[..., c] = colors[0][c] * (1 - t) + colors[1][c] * t
    # bevel: what is left of the part when it is moved up-left is its bottom-right edge (deep), and the other way
    inner_dr = m * (1 - shift(m, -bevel, -bevel))
    inner_ul = m * (1 - shift(m, bevel, bevel))
    soft = lambda a: arr(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS * 0.8)))
    inner_dr, inner_ul = soft(inner_dr) * m, soft(inner_ul) * m
    for c in range(3):
        body[..., c] = body[..., c] * (1 - 0.8 * inner_dr) + deep[c] * 0.8 * inner_dr
        body[..., c] = body[..., c] * (1 - 0.75 * inner_ul) + light[c] * 0.75 * inner_ul
    if shine:
        xs = np.nonzero(m.max(axis=0) > 0.5)[0]
        left, right = xs.min(), xs.max()
        w, h = right - left, bottom - top
        g = Image.new("L", (BIG, BIG), 0)
        ImageDraw.Draw(g).ellipse([left + w * 0.12, top + h * 0.06, left + w * 0.62, top + h * 0.34], fill=255)
        g = arr(g.filter(ImageFilter.GaussianBlur(SS * 2.5))) * m * 0.55
        for c in range(3):
            body[..., c] = body[..., c] * (1 - g) + 255 * g
    for c in range(3):
        canvas[..., c] = canvas[..., c] * (1 - m) + body[..., c] * m
    canvas[..., 3] = np.maximum(canvas[..., 3], m)


def save(canvas, name):
    rgba = np.zeros((BIG, BIG, 4), dtype=np.uint8)
    a = np.clip(canvas[..., 3], 0, 1)
    for c in range(3):
        rgba[..., c] = np.clip(canvas[..., c], 0, 255)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").resize((N, N), Image.LANCZOS).save(f"{OUT}/{name}.png")


def blank():
    return np.zeros((BIG, BIG, 4))


# ---- Alliances: a steel shield, quartered green and white like the Alliances window's emblem (not gold: the
# user's, 4 October)
DARK = (38, 34, 40)
STEEL = ((244, 247, 252), (138, 150, 168))
c = blank()
shield = [(64, 8), (110, 22), (106, 68), (64, 120), (22, 68), (18, 22)]
part(c, poly_mask(shield), colors=STEEL, outline=4, light=(255, 255, 255), deep=(76, 86, 104), ocolor=DARK)
inner = [(64, 20), (98, 31), (95, 66), (64, 105), (33, 66), (30, 31)]
im = arr(poly_mask(inner))
yy, xx = np.mgrid[0:BIG, 0:BIG] / SS
for quarter, green in [((xx < 64) & (yy < 60), True), ((xx >= 64) & (yy < 60), False), ((xx < 64) & (yy >= 60), False), ((xx >= 64) & (yy >= 60), True)]:
    q = Image.fromarray((im * quarter * 255).astype(np.uint8))
    if green:
        part(c, q, colors=((74, 188, 84), (22, 112, 42)), outline=0, bevel=1.6, shine=False, light=(150, 230, 150), deep=(10, 70, 24))
    else:
        part(c, q, colors=((255, 255, 250), (206, 212, 206)), outline=0, bevel=1.6, shine=False, light=(255, 255, 255), deep=(150, 160, 150))
# a steel cross between the quarters, and the shine over the whole field
cross = union(line_mask([(64, 21), (64, 104)], 5), line_mask([(32, 60), (96, 60)], 5))
cm = Image.fromarray((arr(cross) * im * 255).astype(np.uint8))
part(c, cm, colors=STEEL, outline=0, bevel=1, shine=False, light=(255, 255, 255), deep=(76, 86, 104))
g = Image.new("L", (BIG, BIG), 0)
ImageDraw.Draw(g).ellipse([36 * SS, 22 * SS, 76 * SS, 46 * SS], fill=255)
g = arr(g.filter(ImageFilter.GaussianBlur(SS * 3))) * im * 0.4
for ch in range(3):
    c[..., ch] = c[..., ch] * (1 - g) + 255 * g
save(c, "alliances")

# ---- Attack Log: two crossed steel swords, dark iron guards, leather grips, red pommels (not gold either)
c = blank()
for d in (1, -1):
    tip, hilt = (64 + d * 46, 14), (64 - d * 30, 92)
    blade = line_mask([tip, hilt], 14)
    part(c, blade, colors=((250, 252, 255), (150, 162, 180)), outline=3.6, bevel=1.8, light=(255, 255, 255), deep=(80, 92, 110), ocolor=DARK)
    # the fuller: a darker groove down the middle of the blade
    part(c, line_mask([(tip[0] - d * 6, tip[1] + 6), (hilt[0] + d * 6, hilt[1] - 6)], 3), colors=((170, 182, 198), (120, 132, 150)), outline=0, bevel=0.6, shine=False, light=(220, 228, 236), deep=(80, 90, 106))
for d in (1, -1):
    hilt = (64 - d * 30, 92)
    ux, uy = (-d * 76) / math.hypot(76, 78), 78 / math.hypot(76, 78)
    px, py = -uy, ux
    guard = line_mask([(hilt[0] + px * 17, hilt[1] + py * 17), (hilt[0] - px * 17, hilt[1] - py * 17)], 9)
    part(c, guard, colors=((150, 150, 162), (70, 70, 84)), outline=2.6, bevel=1.4, shine=False, light=(210, 210, 222), deep=(40, 40, 50), ocolor=DARK)
    grip = line_mask([hilt, (hilt[0] + ux * 20, hilt[1] + uy * 20)], 9)
    part(c, grip, colors=((170, 100, 50), (100, 50, 20)), outline=2.6, bevel=1.4, shine=False, light=(220, 150, 90), deep=(70, 30, 8), ocolor=DARK)
    pommel = ellipse_mask([hilt[0] + ux * 22 - 7, hilt[1] + uy * 22 - 7, hilt[0] + ux * 22 + 7, hilt[1] + uy * 22 + 7])
    part(c, pommel, colors=((255, 110, 70), (190, 30, 20)), outline=2.4, bevel=1.4, light=(255, 200, 170), deep=(110, 10, 6), ocolor=DARK)
save(c, "attacklog")

# ---- Leaderboard: a gold trophy cup, two handles, a stem, a stepped base, a star on the cup
c = blank()
handles = union(line_mask([(34, 30), (16, 34), (18, 54), (40, 62)], 10), line_mask([(94, 30), (112, 34), (110, 54), (88, 62)], 10))
part(c, handles, outline=3, bevel=1.4, shine=False)
cup = Image.new("L", (BIG, BIG), 0)
ImageDraw.Draw(cup).pieslice([30 * SS, -6 * SS, 98 * SS, 78 * SS], 0, 180, fill=255)
ImageDraw.Draw(cup).rectangle([30 * SS, 16 * SS, 98 * SS, 36 * SS], fill=255)
part(c, cup, outline=3.6)
part(c, poly_mask([(56, 76), (72, 76), (76, 94), (52, 94)]), outline=3, bevel=1.4, shine=False)
part(c, poly_mask([(40, 94), (88, 94), (92, 104), (36, 104)]), outline=3, bevel=1.4, shine=False)
part(c, poly_mask([(30, 104), (98, 104), (98, 118), (30, 118)]), colors=((214, 128, 40), (150, 70, 14)), outline=3, bevel=1.6, shine=False, light=(250, 190, 120), deep=(100, 40, 6))
star = []
for k in range(10):
    r = 12 if k % 2 == 0 else 5
    ang = -math.pi / 2 + k * math.pi / 5
    star.append((64 + r * math.cos(ang), 42 + r * math.sin(ang)))
part(c, poly_mask(star), colors=((255, 120, 70), (200, 40, 20)), outline=2, bevel=1, shine=False, light=(255, 210, 180), deep=(120, 10, 6))
save(c, "leaderboard")

# ---- Change Log: a parchment page curling at the corner, with gold-lettered lines and a red seal
c = blank()
page = [(26, 10), (86, 10), (104, 28), (104, 118), (26, 118)]
part(c, poly_mask(page), colors=((255, 246, 214), (236, 206, 140)), outline=3.6, bevel=2, light=(255, 255, 245), deep=(196, 150, 80))
part(c, poly_mask([(86, 10), (86, 28), (104, 28)]), colors=((236, 200, 120), (206, 160, 80)), outline=2.6, bevel=1, shine=False, light=(250, 230, 170), deep=(160, 110, 50))
for i, y in enumerate([40, 56, 72, 88]):
    part(c, line_mask([(38, y), (92 if i < 3 else 66, y)], 6), colors=((214, 140, 30), (180, 100, 14)), outline=0, bevel=1, shine=False, light=(250, 200, 90), deep=(130, 70, 8))
part(c, ellipse_mask([72, 86, 100, 114]), colors=((240, 70, 50), (170, 20, 14)), outline=2.6, bevel=1.6, light=(255, 180, 160), deep=(100, 8, 4))
save(c, "changelog")
print("ok")
