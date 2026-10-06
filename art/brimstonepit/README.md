# The Brimstone Pit: building art

Art for the Inferno casino building (`brimstone-pit-casino-spec.md`, section 4.3), level 1. Levels 2 to 5
add to the same model (see the spec: skull arch, slot idol, Balthazar weathervane, gold facade).

## Files (level 1)

| File | What |
|---|---|
| `server/public/assets/buildings/ibrimstonepit/top.1.v2.png` | the building (127 x 107) |
| `top.1.damaged.v2.png`, `top.1.destroyed.v2.png` | damaged (soot, cracks, a broken corner, a die knocked off), destroyed (rubble, dice and bones) |
| `shadow.1.v2.jpg` (and `.damaged`, `.destroyed`) | soft shadow to the lower right, multiplied onto the ground like the other buildings' |
| `anim.1.v2.png` | idle loop, 60 frames in a horizontal strip: lava creeping and bubbling in the trough, the door glow breathing, the skull's eyes flickering |
| `anim2.1.v2.png` | the dice in their glass bubble, 80 frames: at rest most of the loop, then they pop up, tumble, hit the top of the bubble, bounce twice and settle; the pips flash as they land. Drawn over the top and `anim` (the game's second animation layer), only what moves |
| `anim.1.damaged.v2.png` | the lava loop with sparks from the broken corner; the bubble is shattered, the dice still (no `anim2` when damaged) |
| `server/public/assets/buildingbuttons/brimstone_pit.v2.jpg`, `.silhouette.jpg` | build menu button and its locked version (116 x 157) |
| `server/public/assets/buildingthumbs/141.png` | thumbnail (40 x 40) |

No text anywhere in the art: dice, a skull, coins. The dice sit in a big glass bubble on a gold collar
on the roof (shattered when damaged).

## Playback speed

Made for one frame every 3 game frames (13.3 a second), as the Monster Lab plays its own: 4.5 seconds for
the lava's loop, 6 for the dice's (they bounce once in it). The building's class calls `AnimFrame()` from
its `TickFast` (the layers `anim` and `anim2` each keep their own frame count):

```
private var _frameNumber:int = 0;

override public function TickFast(param1:Event = null):void {
    super.TickFast(param1);
    if (_countdownBuild.Get() + _countdownUpgrade.Get() == 0 && GLOBAL._render && this._frameNumber % 3 == 0) {
        AnimFrame(true);
    }
    ++this._frameNumber;
}
```

## Props (`INFERNOYARDPROPS.as`, footprint 90 x 90: `_footprint = [new Rectangle(0, 0, 90, 90)]`)

Offsets are from the footprint diamond's top point, as for every building.

```
"imageData": {
    "baseurl": "buildings/ibrimstonepit/",
    1: {
        "anim": ["anim.1.v2.png", new Rectangle(-51, 9, 83, 50), 60],
        "anim2": ["anim2.1.v2.png", new Rectangle(-40, -27, 80, 50), 80],
        "top": ["top.1.v2.png", new Point(-64, -31)],
        "shadow": ["shadow.1.v2.jpg", new Point(-69, 4)],
        "animdamaged": ["anim.1.damaged.v2.png", new Rectangle(-53, 1, 85, 58), 60],
        "topdamaged": ["top.1.damaged.v2.png", new Point(-64, -39)],
        "shadowdamaged": ["shadow.1.damaged.v2.jpg", new Point(-69, 4)],
        "topdestroyed": ["top.1.destroyed.v2.png", new Point(-64, 8)],
        "shadowdestroyed": ["shadow.1.destroyed.v2.jpg", new Point(-69, 6)]
    }
},
"buildingbuttons": ["brimstone_pit.v2"],
"upgradeImgData": {
    "baseurl": "buildingbuttons/",
    1: {"img": "brimstone_pit.v2.jpg", "silhouette_img": "brimstone_pit.v2.silhouette.jpg"}
},
```

## Making it again, or the other levels

The art is modelled and rendered with Blender from code (`pip install bpy`, Blender 5):

```
python3 pit.py top normal out/top-normal          # also: damaged, destroyed
python3 pit.py shadow normal out/shadow-normal
python3 pit.py anim normal out/anim-normal        # 60 frames; also: damaged
SAMPLES=128 python3 pit.py anim2 normal out/anim2-normal   # 80 frames round the bubble, as many samples as the top
python3 assemble.py out ../../server/public/assets # scales down, crops, strips; prints the props above
```

`SAMPLES=128` for the top renders and the bubble's frames (they must match: `assemble.py` keeps only what
differs from the top); 64 is enough for the shadows and the lava frames. `pit.py` matches the game's
camera: the 2:1 isometric view of `GRID.ToISO`, 1 Blender unit = 10 grid units, rendered at 3x and scaled
down; light from the upper left like the other Inferno buildings. `compose.py` places images the way the
game draws them (shadow multiplied, then top, then the animation frame) for previews.
