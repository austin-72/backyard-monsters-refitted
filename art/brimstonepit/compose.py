"""Composes buildings the way the game draws them: shadow JPG multiplied onto the ground at its offset,
then the top PNG at its offset, offsets measured from the footprint diamond's top point (the origin)."""
import os, re, sys
from PIL import Image, ImageChops, ImageDraw
# the game's assets, from this folder (art/brimstonepit)
A = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "server", "public", "assets"))

def ground(w, h, tile="2169_inferno_lava1_inferno_lava1.png"):
    # the Inferno yard's own ground tile (200 x 100), repeated
    src = Image.open(f"{A}/yardbg/lava/{tile}").convert("RGB")
    g = Image.new("RGB", (w, h))
    for y in range(0, h, src.height):
        for x in range(0, w, src.width):
            g.paste(src, (x, y))
    return g

def diamond(img, ox, oy, n, color=(255, 255, 255, 90)):
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(ox, oy), (ox + n, oy + n / 2), (ox, oy + n), (ox - n, oy + n / 2)], outline=color)

def place(canvas, ox, oy, top=None, top_off=None, shadow=None, shadow_off=None, anim=None, anim_rect=None, frame=0):
    if shadow:
        sh = Image.open(shadow).convert("RGB")
        x, y = ox + shadow_off[0], oy + shadow_off[1]
        region = canvas.crop((x, y, x + sh.width, y + sh.height))
        canvas.paste(ImageChops.multiply(region, sh), (x, y))
    if top:
        t = Image.open(top).convert("RGBA")
        canvas.paste(t, (ox + top_off[0], oy + top_off[1]), t)
    if anim:
        a = Image.open(anim).convert("RGBA")
        fx, fy, fw, fh = anim_rect
        f = a.crop((frame * fw, 0, frame * fw + fw, fh))
        canvas.paste(f, (ox + int(fx), oy + int(fy)), f)

def load_top(render_png, meta, ss=3, n=90):
    """A render at ss x game size scaled down and cropped to what is drawn: (image, offset from the origin).
    The origin is the footprint diamond's top point; the footprint centre is (0, n / 2) from it."""
    import json
    m = json.load(open(meta)) if isinstance(meta, str) else meta
    im = Image.open(render_png).convert("RGBA")
    sm = im.resize((im.width // ss, im.height // ss), Image.LANCZOS)
    bb = sm.getbbox()
    cx, cy = m["origin_center_px"][0] / ss, m["origin_center_px"][1] / ss
    return sm.crop(bb), (round(bb[0] - cx), round(bb[1] - cy + n / 2))
