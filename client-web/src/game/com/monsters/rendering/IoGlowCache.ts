import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { BitmapFilter, filterSettings } from "flash/filters";
import { Matrix } from "flash/geom";
import { GLOBAL } from "@game";

/**
 * Inferno-only (16 October, the user's: "the game slows to halfish fps during attacks when monsters have a buff from
 * sulfur bombs or Ashkarr's speed buff"): a buffed monster glows (Enrage, WarCryBoost, IoSulfurShield: GlowFilters on
 * its picture), and the yard's renderer blurred each glowing monster afresh every frame its picture changed, which is
 * nearly every frame for one walking: a canvas shadow blur drawn as many times as the glow's strength (3 to 5), for
 * every glowing monster. Thirty raging Spurtz took the battle from 41 to 28 fps.
 *
 * Monsters of a kind are drawn from the same frames (SPRITES.GetFrame copies a frame of the kind's sheet into the
 * monster's own picture), so their glowing pictures are the same too: made once for a frame and a glow, and kept
 * here for every monster showing that frame with that glow, now and later in its walk.
 *
 * A monster's picture says which frame it holds (tag, from GetFrame; retag for what is drawn over it after, its
 * health bar), for as long as nothing else is drawn on it (the picture's version): a picture drawn some other way
 * says nothing, and is glowed the old way (MonsterBase.updateRasterData).
 */
export class IoGlowCache extends ASObject {
    /** How many glowing pictures are kept (the least lately used go first): ~30 KB each. */
    private static readonly MAX: int = 600;

    private static _made: Map<string, any> = new Map<string, any>();

    private static _bm: Bitmap = null;

    /** For a test: pictures made, and found made. */
    public static made: int = 0;

    public static reused: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** After a frame is copied into `bmd` (SPRITES.GetFrame): what it holds now. */
    public static tag(bmd: BitmapData, frame: string): void {
        if (!GLOBAL.INFERNO_ONLY || !bmd) {
            return;
        }
        let b: any = bmd;
        b.$ioFrame = frame;
        b.$ioFrameVer = b.$version;
        b.$ioExtra = null;
        b.$ioExtraVer = -1;
    }

    /**
     * After something else of a known few is drawn over the frame (a monster's health bar: `extra` says which), when
     * the picture held a known frame just before.
     */
    public static retag(bmd: BitmapData, extra: string): void {
        if (!GLOBAL.INFERNO_ONLY || !bmd) {
            return;
        }
        let b: any = bmd;
        if (b.$ioFrame != null && (b.$version - 1 === b.$ioFrameVer || b.$version - 1 === b.$ioExtraVer)) {
            b.$ioExtra = extra;
            b.$ioExtraVer = b.$version;
        } else {
            b.$ioFrame = null;
        }
    }

    /** What the picture holds, if it is known; null when it isn't. */
    private static tagOf(bmd: BitmapData): string {
        let b: any = bmd;
        if (!b || b.$ioFrame == null) {
            return null;
        }
        if (b.$version === b.$ioFrameVer) {
            return b.$ioFrame;
        }
        if (b.$version === b.$ioExtraVer) {
            return b.$ioFrame + "|" + b.$ioExtra;
        }
        return null;
    }

    private static sig(filters: any[]): string {
        let s: string = "";
        for (let f of filters) {
            let o: any = f;
            s += (o && o.constructor ? o.constructor.name : "?") + ":" + [o.color, o.alpha, o.blurX, o.blurY, o.strength, o.quality, o.inner, o.knockout, o.matrix ? (o.matrix as any[]).join(",") : ""].join(",") + ";";
        }
        return s;
    }

    /**
     * `src` with `filters` drawn round it, and how far its picture is from the source's (pad): kept for every picture
     * holding the same frame. Null when `src` doesn't say what it holds (the caller draws it the old way).
     */
    public static glowed(src: BitmapData, filters: any[]): any {
        if (!GLOBAL.INFERNO_ONLY || !src || !filters || !filters.length) {
            return null;
        }
        let tag: string = IoGlowCache.tagOf(src);
        if (tag == null) {
            return null;
        }
        let key: string = tag + "#" + src.width + "x" + src.height + "#" + IoGlowCache.sig(filters) + "#" + filterSettings.epoch;
        let hit: any = IoGlowCache._made.get(key);
        if (hit) {
            // (the most lately used last)
            IoGlowCache._made.delete(key);
            IoGlowCache._made.set(key, hit);
            ++IoGlowCache.reused;
            return hit;
        }
        let pad: number = 0;
        for (let f of filters) {
            let p: number = (f as BitmapFilter).$padding ? Number((f as BitmapFilter).$padding()) : 0;
            if (!isFinite(p)) {
                return null;
            }
            pad = Math.max(pad, p);
        }
        // (room for the glow at the screen's pixel density: the filters blur by it)
        let px: int = (Math.ceil(pad * 2) + 2) | 0;
        let out: BitmapData = new BitmapData(src.width + px * 2, src.height + px * 2, true, 0);
        if (!IoGlowCache._bm) {
            IoGlowCache._bm = new Bitmap();
        }
        let bm: any = IoGlowCache._bm;
        bm.bitmapData = src;
        bm.filters = filters;
        // (its layer made for this picture, not one kept from another)
        bm.$fx = undefined;
        bm.$fxLayer = undefined;
        out.draw(as3.cast(bm, IBitmapDrawable), new Matrix(1, 0, 0, 1, px, px));
        bm.bitmapData = null;
        bm.filters = [];
        let made: any = { "bmd": out, "pad": px };
        IoGlowCache._made.set(key, made);
        ++IoGlowCache.made;
        // (the least lately used forgotten: not disposed, a monster may still be showing it this frame)
        while (IoGlowCache._made.size > IoGlowCache.MAX) {
            IoGlowCache._made.delete(IoGlowCache._made.keys().next().value);
        }
        return made;
    }

    /** How many are kept (a test). */
    public static get size(): int {
        return IoGlowCache._made.size | 0;
    }
}
