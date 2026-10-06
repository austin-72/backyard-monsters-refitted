"""Turns the Brimstone Pit renders (pit.py, at 3x game size) into the game's files for level 1:

    buildings/ibrimstonepit/top.1.v2.png, top.1.damaged.v2.png, top.1.destroyed.v2.png
    buildings/ibrimstonepit/shadow.1.v2.jpg, shadow.1.damaged.v2.jpg, shadow.1.destroyed.v2.jpg
    buildings/ibrimstonepit/anim.1.v2.png, anim.1.damaged.v2.png       (60 frames, a horizontal strip:
                                                                        the lava, the door, the eyes)
    buildings/ibrimstonepit/anim2.1.v2.png                             (80 frames: the dice in their bubble)
    buildingbuttons/brimstone_pit.v2.jpg, brimstone_pit.v2.silhouette.jpg   (116 x 157, build menu)
    buildingthumbs/141.png                                                   (40 x 40)

and prints the props imageData with every offset (from the footprint diamond's top point, as the game
places building images; footprint 90 x 90).

    python3 assemble.py <renders dir> <assets dir>
"""
import json, os, sys
from PIL import Image, ImageChops, ImageFilter

SS = 3
N = 90   # footprint

def load(png):
    return Image.open(png).convert("RGBA")

def small(im):
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)

def origin(meta):
    m = json.load(open(meta))
    return m["origin_center_px"][0] / SS, m["origin_center_px"][1] / SS - N / 2   # the diamond's top point

def top(rdir, state, out):
    im = small(load(f"{rdir}/top-{state}.png"))
    bb = im.getbbox()
    ox, oy = origin(f"{rdir}/top-{state}.json")
    im.crop(bb).save(out, optimize=True)
    return (round(bb[0] - ox), round(bb[1] - oy)), im.crop(bb).size

def shadow(rdir, state, out, darkness=0.5, blur=2.2):
    """The shadow catcher's alpha is how much light the ground lost: a soft grey on white, multiplied onto
    the ground in the game."""
    a = small(load(f"{rdir}/shadow-{state}.png")).getchannel("A")
    a = a.filter(ImageFilter.GaussianBlur(blur))
    g = a.point(lambda v: 255 - int(v * darkness))
    mask = a.point(lambda v: 255 if v > 6 else 0)
    bb = mask.getbbox()
    pad = 5
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(g.width, bb[2] + pad), min(g.height, bb[3] + pad))
    ox, oy = origin(f"{rdir}/shadow-{state}.json")
    g.crop(bb).convert("RGB").save(out, quality=92)
    return (round(bb[0] - ox), round(bb[1] - oy)), (bb[2] - bb[0], bb[3] - bb[1])

def anim2(rdir, state, out, frames=80, thr=10):
    """The bubble's frames: rendered whole round the bubble; kept only where they differ from the top (so
    a frame at rest adds nothing, and the glass is not drawn twice)."""
    T = small(load(f"{rdir}/top-{state}.png"))
    Fs = [small(load(f"{rdir}/anim2-{state}.{f:02d}.png")) for f in range(frames)]
    # where the frames were rendered (the render border), less a margin
    area = None
    for F in Fs:
        b = F.getchannel("A").getbbox()
        area = b if area is None else (min(area[0], b[0]), min(area[1], b[1]), max(area[2], b[2]), max(area[3], b[3]))
    m = 4
    area = (area[0] + m, area[1] + m, area[2] - m, area[3] - m)
    inside = Image.new("L", T.size, 0)
    inside.paste(255, area)
    outs, bb = [], None
    def premul(im):
        # (compared as they show: colour times alpha; a near-transparent pixel's colour hardly matters)
        a = im.getchannel("A")
        return Image.merge("RGBA", [ImageChops.multiply(c, a) for c in im.split()[:3]] + [a])
    Tp = premul(T)
    for F in Fs:
        d = ImageChops.difference(premul(F), Tp)
        r, g, b_, a = d.split()
        dm = ImageChops.lighter(ImageChops.lighter(r, g), ImageChops.lighter(b_, a)).point(lambda v: 255 if v > thr else 0)
        dm = ImageChops.multiply(dm.filter(ImageFilter.MaxFilter(3)), inside)
        X = Image.new("RGBA", T.size, (0, 0, 0, 0))
        X.paste(F, (0, 0), dm)
        outs.append(X)
        b2 = dm.getbbox()
        if b2:
            bb = b2 if bb is None else (min(bb[0], b2[0]), min(bb[1], b2[1]), max(bb[2], b2[2]), max(bb[3], b2[3]))
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    strip = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    for i, X in enumerate(outs):
        strip.paste(X.crop(bb), (i * w, 0))
    strip.save(out, optimize=True)
    ox, oy = origin(f"{rdir}/top-{state}.json")
    return (round(bb[0] - ox), round(bb[1] - oy), w, h)

def anim(rdir, state, out, frames=60):
    ims = [small(load(f"{rdir}/anim-{state}.{f:02d}.png")) for f in range(frames)]
    bb = None
    for im in ims:
        b = im.getbbox()
        if b:
            bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    strip = Image.new("RGBA", (w * frames, h), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        strip.paste(im.crop(bb), (i * w, 0))
    strip.save(out, optimize=True)
    ox, oy = origin(f"{rdir}/anim-{state}.json")
    return (round(bb[0] - ox), round(bb[1] - oy), w, h)

def button(rdir, out, out_sil, thumb_out):
    """Build-menu button (the building large on light grey, as the other Inferno buttons), its locked
    silhouette (near black on dark grey), and the small thumbnail."""
    im = load(f"{rdir}/top-normal.png")
    im = im.crop(im.getbbox())
    W, H = 116, 157
    s = min(106 / im.width, 120 / im.height)
    b = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (W - b.width) // 2, H - b.height - 22
    bg = Image.new("RGBA", (W, H), (239, 239, 239, 255))
    # a soft contact shadow under it
    sh = Image.new("L", (W, H), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(sh).ellipse((x + 6, y + b.height - 26, x + b.width - 6, y + b.height + 4), fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    bg = Image.composite(Image.new("RGBA", (W, H), (150, 150, 150, 255)), bg, sh)
    bg.alpha_composite(b, (x, y))
    bg.convert("RGB").save(out, quality=92)
    sil = Image.new("RGBA", (W, H), (66, 66, 66, 255))
    dark = Image.new("RGBA", b.size, (4, 4, 4, 255))
    sil.paste(dark, (x, y), b.getchannel("A"))
    sil.convert("RGB").save(out_sil, quality=92)
    t = im.copy()
    t.thumbnail((40, 40), Image.LANCZOS)
    th = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    th.alpha_composite(t, ((40 - t.width) // 2, (40 - t.height) // 2))
    th.save(thumb_out, optimize=True)

if __name__ == "__main__":
    rdir, assets = sys.argv[1], sys.argv[2]
    bdir = f"{assets}/buildings/ibrimstonepit"
    os.makedirs(bdir, exist_ok=True)
    os.makedirs(f"{assets}/buildingbuttons", exist_ok=True)
    os.makedirs(f"{assets}/buildingthumbs", exist_ok=True)
    d = {}
    for st, suffix in (("normal", ""), ("damaged", ".damaged"), ("destroyed", ".destroyed")):
        d["top" + suffix.strip(".")] = (f"top.1{suffix}.v2.png",) + top(rdir, st, f"{bdir}/top.1{suffix}.v2.png")
        d["shadow" + suffix.strip(".")] = (f"shadow.1{suffix}.v2.jpg",) + shadow(rdir, st, f"{bdir}/shadow.1{suffix}.v2.jpg")
    for st, suffix in (("normal", ""), ("damaged", ".damaged")):
        d["anim" + suffix.strip(".")] = (f"anim.1{suffix}.v2.png", anim(rdir, st, f"{bdir}/anim.1{suffix}.v2.png"))
    d["anim2"] = ("anim2.1.v2.png", anim2(rdir, "normal", f"{bdir}/anim2.1.v2.png"))
    button(rdir, f"{assets}/buildingbuttons/brimstone_pit.v2.jpg", f"{assets}/buildingbuttons/brimstone_pit.v2.silhouette.jpg", f"{assets}/buildingthumbs/141.png")
    json.dump(d, open(f"{rdir}/offsets.json", "w"), indent=1)
    # the props entry
    lines = ['"imageData": {', '    "baseurl": "buildings/ibrimstonepit/",', '    1: {']
    order = ["anim", "anim2", "top", "shadow", "animdamaged", "topdamaged", "shadowdamaged", "topdestroyed", "shadowdestroyed"]
    nframes = {"anim": 60, "animdamaged": 60, "anim2": 80}
    body = []
    for k in order:
        v = d[k]
        if k.startswith("anim"):
            x, y, w, h = v[1]
            body.append(f'        "{k}": ["{v[0]}", new Rectangle({x}, {y}, {w}, {h}), {nframes[k]}]')
        else:
            body.append(f'        "{k}": ["{v[0]}", new Point({v[1][0]}, {v[1][1]})]')
    lines += [",\n".join(body), "    }", "},", '"buildingbuttons": ["brimstone_pit.v2"],',
              '"upgradeImgData": {', '    "baseurl": "buildingbuttons/",',
              '    1: {"img": "brimstone_pit.v2.jpg", "silhouette_img": "brimstone_pit.v2.silhouette.jpg"}', '},']
    snippet = "\n".join(lines)
    open(f"{rdir}/props-snippet.as", "w").write(snippet + "\n")
    print(snippet)
