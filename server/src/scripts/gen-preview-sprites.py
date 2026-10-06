"""Writes server/src/game-data/kits/previewSprites.ts from the client's INFERNOYARDPROPS.as imageData.

   python3 server/src/scripts/gen-preview-sprites.py <repo root>   (after changing building art in INFERNOYARDPROPS;
   then bump KIT_PICTURES in services/kits/refreshKitPictures.ts so every kit picture is drawn again)
"""
import re, sys, json
W = sys.argv[1]
src = open(W + '/client/scripts/INFERNOYARDPROPS.as').read()
src = re.sub(r'//[^\n]*', '', src)

def block(s, i):
    """s[i] == '{': returns the index after its matching '}'."""
    depth = 0
    for j in range(i, len(s)):
        if s[j] == '{': depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0: return j + 1
    raise ValueError

out = {}
for m in re.finditer(r'"id": (\d+),', src):
    bid = int(m.group(1))
    nxt = src.find('"id":', m.end())
    ent = src[m.end(): nxt if nxt > 0 else len(src)]
    k = ent.find('"imageData": {')
    if k < 0: continue
    b0 = ent.index('{', k); img = ent[b0:block(ent, b0)]
    bm = re.search(r'"baseurl": "([^"]+)"', img)
    if not bm: continue
    base = bm.group(1)
    levels = {}
    for t in re.finditer(r'\n\s*(\d+): \{', img):
        tb = img.index('{', t.start()); tier = img[tb:block(img, tb)]
        spr = {}
        for e in re.finditer(r'"(top|anim|anim2|anim3)": \["([^"]+)", new (Point|Rectangle)\(([^)]*)\)', tier):
            nums = [float(v) for v in e.group(4).split(',')]
            spr[e.group(1)] = [e.group(2)] + nums[:2] + (nums[2:4] if e.group(3) == 'Rectangle' else [])
        if spr: levels[t.group(1)] = spr
    if levels: out[str(bid)] = {'base': base, 'levels': levels}

head = '''/**
 * Building art used to draw outpost kit previews (services/kits/kitPreview.ts).
 * Generated from the client's INFERNOYARDPROPS (29 September: every level band, the outpost hall's own Inferno
 * art, anim2 and anim3): file names and the offsets the game itself uses to place each sprite on a building.
 * `top` = [file, x, y]; `anim`, `anim2`, `anim3` = [sprite sheet, x, y, frame width, frame height] (frame 0 is
 * drawn), drawn in that order over the top, as the yard draws them.
 */
export interface PreviewSprite {
  top?: [string, number, number];
  anim?: [string, number, number, number, number];
  anim2?: [string, number, number, number, number];
  anim3?: [string, number, number, number, number];
}

export const previewSprites: Record<number, { base: string; levels: Record<number, PreviewSprite> }> = '''
open(W + '/server/src/game-data/kits/previewSprites.ts', 'w').write(head + json.dumps(out, indent=1) + ';\n')
print(len(out), 'buildings;', {k: sorted(v['levels'], key=int) for k, v in out.items() if k in ('1','2','3','4','9','112','144','145','16','5')})
