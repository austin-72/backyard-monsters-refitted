import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, BlendMode, IBitmapDrawable, Sprite } from "flash/display";
import { Event } from "flash/events";
import { Matrix, Point, Rectangle } from "flash/geom";
import { BFOUNDATION, BYMConfig, GLOBAL, ImageCache, MAP, RasterData, SOUNDS } from "@game";

/**
 * Hell Freezes Over: the event's pictures (server/public/assets/hfo/, the user's hfo_props.zip) and a small
 * player for its one-shot animations (a patch shattering, a tower's ice breaking, the tomb bursting).
 *
 * Pictures load once (ImageCache) and are copied into a BitmapData of their own, made at once at the
 * picture's size: whatever shows it can be built before the picture arrives and fills in when it does.
 * Offsets are the pack's (offsets.json): from a building's anchor, the top corner of its footprint diamond.
 */
export class IoHfoArt extends ASObject {
    public static readonly ROOT: string = "hfo/";

    /** [file, x, y, w, h] for each still picture (offsets.json "top" and "shadow"). */
    public static readonly PICS: any = { "small1": ["icepatch/small1.png", -25, -3, 50, 31], "small1_shadow": ["icepatch/small1_shadow.jpg", -31, -5, 66, 40], "small2": ["icepatch/small2.png", -25, -12, 50, 40], "small2_shadow": ["icepatch/small2_shadow.jpg", -31, -5, 61, 40], "small3": ["icepatch/small3.png", -25, -8, 50, 36], "small3_shadow": ["icepatch/small3_shadow.jpg", -31, -5, 66, 40], "small4": ["icepatch/small4.png", -25, -8, 50, 36], "small4_shadow": ["icepatch/small4_shadow.jpg", -31, -5, 63, 40], "small5": ["icepatch/small5.png", -25, -6, 50, 34], "small5_shadow": ["icepatch/small5_shadow.jpg", -31, -5, 66, 40], "big1": ["icepatch/big1.png", -39, -9, 79, 60], "big1_shadow": ["icepatch/big1_shadow.jpg", -45, 3, 111, 54], "big2": ["icepatch/big2.png", -39, -9, 79, 60], "big2_shadow": ["icepatch/big2_shadow.jpg", -45, 3, 100, 54], "big3": ["icepatch/big3.png", -39, -9, 79, 60], "big3_shadow": ["icepatch/big3_shadow.jpg", -45, 3, 101, 54], "ice_short": ["towerice/ice_short.png", -50, -59, 100, 117], "ice_short_shadow": ["towerice/ice_short_shadow.jpg", -53, -10, 183, 73], "ice_tall": ["towerice/ice_tall.png", -51, -91, 102, 148], "ice_tall_shadow": ["towerice/ice_tall_shadow.jpg", -53, -17, 203, 79], "ice_large": ["towerice/ice_large.png", -81, -25, 163, 127], "ice_large_shadow": ["towerice/ice_large_shadow.jpg", -84, 10, 218, 97], "block0": ["champblock/block_stage0.png", -65, -82, 129, 164], "block1": ["champblock/block_stage1.png", -65, -82, 129, 164], "block2": ["champblock/block_stage2.png", -65, -82, 129, 165], "block3": ["champblock/block_stage3.png", -65, -82, 129, 165], "block_shadow": ["champblock/block_shadow.jpg", -66, -1, 232, 89] };

    /** [file, x, y, frame w, frame h, frames] for each strip (offsets.json animations). */
    public static readonly STRIPS: any = { "small1_shatter": ["icepatch/small1_shatter.png", -31, -10, 63, 46, 7], "small2_shatter": ["icepatch/small2_shatter.png", -32, -15, 74, 51, 7], "small3_shatter": ["icepatch/small3_shatter.png", -27, -8, 61, 44, 7], "small4_shatter": ["icepatch/small4_shatter.png", -40, -11, 69, 49, 7], "small5_shatter": ["icepatch/small5_shatter.png", -35, -7, 68, 41, 7], "big1_crack": ["icepatch/big1_crack.png", -39, -9, 79, 60, 5], "big2_crack": ["icepatch/big2_crack.png", -39, -9, 79, 60, 5], "big3_crack": ["icepatch/big3_crack.png", -39, -9, 79, 60, 5], "big1_melt": ["icepatch/big1_melt.png", -50, -9, 104, 66, 6], "big2_melt": ["icepatch/big2_melt.png", -50, -9, 104, 66, 6], "big3_melt": ["icepatch/big3_melt.png", -50, -9, 104, 66, 6], "ice_short_shatter": ["towerice/ice_short_shatter.png", -81, -66, 162, 147, 8], "ice_tall_shatter": ["towerice/ice_tall_shatter.png", -84, -103, 166, 190, 8], "ice_large_shatter": ["towerice/ice_large_shatter.png", -119, -35, 252, 174, 8], "block_reveal": ["champblock/block_reveal.png", -163, -137, 294, 271, 8] };

    private static _bmd: any = {};

    private static _loading: any = {};

    private static _waiting: any = {};

    // ---- one-shot animations (a strip played once where it is put, then gone)
    private static _fx: any[] = [];

    private static _ticker: Sprite = null;

    // ---- an ice block on a tower in battle (IoIce: an ice monster's hit): the picture over it, its
    // shadow under it, and the frost icon above
    private static _battle: any[] = [];

    /** The picture's BitmapData (filled in when it has loaded). */
    public static pic(name: string): BitmapData {
        let p: any[] = as3.as(IoHfoArt.PICS[name], Array);
        return p ? IoHfoArt.image(as3.str(p[0]), p[3] | 0, p[4] | 0) : null;
    }

    public static picAt(name: string): Point {
        let p: any[] = as3.as(IoHfoArt.PICS[name], Array);
        return p ? new Point(p[1], p[2]) : new Point();
    }

    /** A file's (under hfo/, or "@path" from the assets folder) BitmapData of size w x h, filled in when it has loaded; `then` is told when it has. */
    public static image(file: string, w: int, h: int, then: Function = null): BitmapData {
        let bmd: BitmapData = as3.as(IoHfoArt._bmd[file], BitmapData);
        if (!bmd) {
            bmd = new BitmapData(Math.max(1, w), Math.max(1, h), true, 0);
            IoHfoArt._bmd[file] = bmd;
        }
        if (!IoHfoArt._loading[file]) {
            IoHfoArt._loading[file] = true;
            IoHfoArt._waiting[file] = [];
            // ("@effects/x.png": from the assets folder itself, not hfo/)
            ImageCache.GetImageWithCallBack(file.charAt(0) == "@" ? file.substr(1) : IoHfoArt.ROOT + file, (key: string, loaded: BitmapData, args: any[] = null): void => {
                let target: BitmapData = as3.as(IoHfoArt._bmd[file], BitmapData);
                if (loaded && target) {
                    target.copyPixels(loaded, new Rectangle(0, 0, Math.min(loaded.width, target.width), Math.min(loaded.height, target.height)), new Point(), null, null, true);
                }
                IoHfoArt._loading[file] = "done";
                for (let f of as3.values(as3.as(IoHfoArt._waiting[file], Array))) {
                    try {
                        f();
                    } catch (e) {
                    }
                }
                IoHfoArt._waiting[file] = [];
            });
        }
        if (then != null) {
            if (IoHfoArt._loading[file] == "done") {
                then();
            } else {
                (as3.as(IoHfoArt._waiting[file], Array)).push(then);
            }
        }
        return bmd;
    }

    public static loaded(file: string): boolean {
        return IoHfoArt._loading[file] == "done";
    }

    // ---- the ice block a tower wears: "short" (64 footprint, up to about 115 tall), "tall", "large" (120)
    /** Sniper, Lightning (Tesla) and the Quake tower are tall; the Monster Bunker (120) large; the rest short. */
    public static towerSize(tower: BFOUNDATION): string {
        if (!tower) {
            return "short";
        }
        let t: int = tower._type;
        if (t == 22 || tower._footprint && tower._footprint.length && as3.cast(tower._footprint[0], Rectangle).width >= 100) {
            return "large";
        }
        if (t == 21 || t == 25 || t == 129) {
            return "tall";
        }
        return "short";
    }

    /**
     * Plays strip `name` once at map position (x, y) (the anchor its offsets are from), drawn at `depth`
     * (MAP.DEPTH_SHADOW + 0.5: on the ground; a building's depth: with it), `step` frames apart.
     */
    public static play(name: string, x: number, y: number, depth: number, step: int = 4, then: Function = null): void {
        let s: any[] = as3.as(IoHfoArt.STRIPS[name], Array);
        if (!s) {
            if (then != null) {
                then();
            }
            return;
        }
        IoHfoArt.playRow(as3.str(s[0]), s[3] | 0, s[4] | 0, s[5] | 0, 0, Number(x + s[1]), Number(y + s[2]), depth, step, then, 1);
    }

    /**
     * Plays row `row` of a strip of `frames` frames of w x h (`rows` rows in the file) once, its top left at
     * map point (x, y).
     */
    public static playRow(file: string, w: int, h: int, frames: int, row: int, x: number, y: number, depth: number, step: int = 4, then: Function = null, rows: int = 3): void {
        if (!BYMConfig.instance.RENDERER_ON || !MAP.instance || !GLOBAL._render) {
            if (then != null) {
                then();
            }
            return;
        }
        let strip: BitmapData = IoHfoArt.image(file, (w * frames) | 0, (h * Math.max(1, rows)) | 0);
        let frame: BitmapData = new BitmapData(w, h, true, 0);
        let off: Point = MAP.instance.offset;
        let pt: Point = new Point(x - off.x, y - off.y);
        let fx: any = { "strip": strip, "frame": frame, "pt": pt, "w": w, "h": h, "row": row, "frames": frames, "at": 0, "step": Math.max(1, step), "tick": 0, "then": then, "raster": new RasterData(as3.cast(frame, IBitmapDrawable), pt, depth) };
        IoHfoArt.draw(fx);
        IoHfoArt._fx.push(fx);
        if (!IoHfoArt._ticker) {
            IoHfoArt._ticker = new Sprite();
            IoHfoArt._ticker.addEventListener(Event.ENTER_FRAME, IoHfoArt.tick);
        }
    }

    /** Calls `then` after `frames` frames (a pause in a sequence). */
    public static wait(frames: int, then: Function): void {
        IoHfoArt._fx.push({ "strip": null, "frame": null, "raster": null, "frames": 1, "at": 0, "step": Math.max(1, frames), "tick": 0, "then": then });
        if (!IoHfoArt._ticker) {
            IoHfoArt._ticker = new Sprite();
            IoHfoArt._ticker.addEventListener(Event.ENTER_FRAME, IoHfoArt.tick);
        }
    }

    /** The drawing depth of something standing at map point (x, y). */
    public static mapDepth(x: number, y: number): number {
        if (!MAP.instance) {
            return MAP.DEPTH_SHADOW + 1;
        }
        let off: Point = MAP.instance.offset;
        return (y - off.y) * 1000 + (x - off.x);
    }

    private static draw(fx: any): void {
        let frame: BitmapData = as3.cast(fx.frame, BitmapData);
        frame.fillRect(frame.rect, 0);
        frame.copyPixels(as3.cast(fx.strip, BitmapData), new Rectangle(fx.at * fx.w, fx.row * fx.h, fx.w, fx.h), new Point());
    }

    private static tick(e: Event): void {
        let i: int = (IoHfoArt._fx.length - 1) | 0;
        while (i >= 0) {
            let fx: any = IoHfoArt._fx[i];
            if (++fx.tick >= fx.step) {
                fx.tick = 0;
                fx.at += 1;
                if (fx.at >= fx.frames) {
                    if (fx.raster) {
                        as3.cast(fx.raster, RasterData).clear();
                    }
                    IoHfoArt._fx.splice(i, 1);
                    if (fx.then != null) {
                        try {
                            fx.then();
                        } catch (err) {
                        }
                    }
                } else {
                    IoHfoArt.draw(fx);
                }
            }
            i--;
        }
    }

    /** Every animation gone (a yard leaving). */
    public static clearFx(): void {
        for (let fx of as3.values(IoHfoArt._fx)) {
            if (fx.raster) {
                as3.cast(fx.raster, RasterData).clear();
            }
        }
        IoHfoArt._fx = [];
    }

    /**
     * Puts the ice on `tower` (BTOWER) for a battle hit; returns a handle for towerIceOff. `scale` enlarges the
     * block for a bigger building (the Compound sealed during the waves: IoHfoWaves), drawn then without its
     * ground shadow (the building's own is there). Drawn straight onto the map just above the building (a
     * building's own children were not drawn: the Compound's block never showed).
     */
    public static towerIceOn(tower: BFOUNDATION, scale: number = 1, depthBelow: number = NaN): any {
        let src: BitmapData = null;
        let big: BitmapData = null;
        if (!tower || !tower._mc || !BYMConfig.instance.RENDERER_ON || !MAP.instance) {
            return null;
        }
        let size: string = IoHfoArt.towerSize(tower);
        let name: string = "ice_" + size;
        let at: Point = IoHfoArt.picAt(name);
        let bmd: BitmapData = IoHfoArt.pic(name);
        if (scale != 1) {
            let p: any[] = as3.as(IoHfoArt.PICS[name], Array);
            src = bmd;
            big = new BitmapData(Math.ceil((p[3] | 0) * scale), Math.ceil((p[4] | 0) * scale), true, 0);
            // (made again once the picture has loaded: told at once when it already has)
            IoHfoArt.image(as3.str(p[0]), p[3] | 0, p[4] | 0, (): void => {
                big.fillRect(big.rect, 0);
                big.draw(as3.cast(src, IBitmapDrawable), new Matrix(scale, 0, 0, scale), null, null, null, true);
            });
            bmd = big;
        }
        let off: Point = MAP.instance.offset;
        // (`depthBelow`: drawn over everything down to that many pixels below the building's top: the Compound's
        // monsters inside it)
        let depth: number = isNaN(depthBelow) ? IoHfoArt.depthOf(tower) + 5 : (tower._mc.y + depthBelow - off.y) * 1000 + (tower._mc.x - off.x) + 15;
        let top: RasterData = new RasterData(as3.cast(bmd, IBitmapDrawable), new Point(tower._mc.x + at.x * scale - off.x, tower._mc.y + at.y * scale - off.y), depth);
        let icon: RasterData = new RasterData(as3.cast(IoHfoArt.image("@effects/frost_icon.png", 16, 20), IBitmapDrawable), new Point(tower._mc.x - 8 - off.x, tower._mc.y + at.y * scale - 24 - off.y), depth + 1);
        let shadow: RasterData = null;
        if (scale == 1) {
            let shadowAt: Point = IoHfoArt.picAt(name + "_shadow");
            shadow = new RasterData(as3.cast(IoHfoArt.pic(name + "_shadow"), IBitmapDrawable), new Point(tower._mc.x + shadowAt.x - off.x, tower._mc.y + shadowAt.y - off.y), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true);
        }
        let handle: any = { "tower": tower, "top": top, "icon": icon, "shadow": shadow, "size": size };
        IoHfoArt._battle.push(handle);
        return handle;
    }

    /** Takes the ice off (`shatter`: it breaks with the shatter animation). */
    public static towerIceOff(handle: any, shatter: boolean = true): void {
        if (!handle) {
            return;
        }
        let tower: BFOUNDATION = as3.as(handle.tower, BFOUNDATION);
        if (handle.top) {
            as3.cast(handle.top, RasterData).clear();
        }
        if (handle.icon) {
            as3.cast(handle.icon, RasterData).clear();
        }
        if (handle.shadow) {
            as3.cast(handle.shadow, RasterData).clear();
        }
        let i: int = IoHfoArt._battle.indexOf(handle);
        if (i >= 0) {
            IoHfoArt._battle.splice(i, 1);
        }
        if (shatter && tower && tower._mc && tower.health > 0) {
            IoHfoArt.play("ice_" + handle.size + "_shatter", tower._mc.x, tower._mc.y, IoHfoArt.depthOf(tower) + 50, 3);
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.5);
        }
    }

    /** Every battle ice gone at once (the yard is leaving). */
    public static clearBattleIce(): void {
        for (let handle of as3.values(IoHfoArt._battle.concat())) {
            IoHfoArt.towerIceOff(handle, false);
        }
        IoHfoArt._battle = [];
    }

    /** A building's drawing depth (as BFOUNDATION.updateRasterData works it out), for things drawn with it. */
    public static depthOf(b: BFOUNDATION): number {
        if (!b || !b._mc || !MAP.instance) {
            return MAP.DEPTH_SHADOW + 1;
        }
        let off: Point = MAP.instance.offset;
        return (b._mc.y - off.y + (b._middle ? b._middle : b._mc.height * 0.5)) * 1000 + (b._mc.x - off.x) + 10;
    }
}
