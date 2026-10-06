import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { Dictionary, getTimer } from "flash/utils";
import { BYMConfig, GLOBAL, ImageCache, MAP, MonsterBase, RasterData, Targeting } from "@game";

/**
 * Inferno-only: the pool of magma a Clinkerjaw (IC12) leaves where it dies. For `LIFE_TICKS` (6 seconds of
 * game time: the game runs 80 steps a second) every monster on the Clinkerjaw's side that is within `RADIUS` of it and hurt gets `HEAL`
 * health back, once: each monster is healed by a puddle one time only (never above its full health). The
 * picture (effects/magma_puddle.png) lies on the ground under the monsters, glows, and fades out over the
 * last second. Puddles tick with the monsters (CREEPS.Tick) and go when the map is cleared (MAP.Clear).
 */
export class MagmaPuddle extends ASObject {
    static {
        as3.fields(this, { _x: NaN, _y: NaN, _flags: 0, _age: 0, _born: 0, _healed: null, _raster: null, _bitmap: null, _pt: null, healedCount: 0 });
    }

    public static readonly HEAL: int = 100;

    /** In ground units, as Targeting measures (about a trap's blast): 50 is about 140 x 70 on screen. */
    public static readonly RADIUS: number = 50;

    public static readonly LIFE_TICKS: int = 480;

    private static readonly FADE_TICKS: int = 80;

    private static readonly SCAN_EVERY: int = 8;

    public static readonly IMAGE: string = "effects/magma_puddle.png";

    private static s_all: any[] = [];

    private static s_bmd: BitmapData = null;

    private static s_loading: boolean = false;
    private _x: number;
    private _y: number;
    private _flags: int;
    private _age: int;
    private _born: int;
    private _healed: Dictionary;
    private _raster: RasterData;
    private _bitmap: Bitmap;
    private _pt: Point;
    /** How many monsters this puddle has healed (for tests). */
    public healedCount: int;

    public $ctor(param1?: number, param2?: number, param3?: boolean): void {
        this._healed = new Dictionary(true);
        this._pt = new Point();
        super.$ctor();
        this._x = param1;
        this._y = param2;
        this._born = getTimer();
        this._flags = (param3 ? Targeting.k_TARGETS_DEFENDERS : Targeting.k_TARGETS_ATTACKERS) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
    }

    public static Preload(): void {
        if (MagmaPuddle.s_bmd || MagmaPuddle.s_loading) {
            return;
        }
        MagmaPuddle.s_loading = true;
        ImageCache.GetImageWithCallBack(MagmaPuddle.IMAGE, (param1: string, param2: BitmapData, param3: any[] = null): void => {
            MagmaPuddle.s_bmd = param2;
            MagmaPuddle.s_loading = false;
        });
    }

    /** A puddle where a Clinkerjaw fell (param1, param2: its map position), healing its own side. */
    public static Drop(param1: number, param2: number, param3: boolean): MagmaPuddle {
        MagmaPuddle.Preload();
        let p: MagmaPuddle = new MagmaPuddle(param1, param2, param3);
        MagmaPuddle.s_all.push(p);
        p.heal();
        return p;
    }

    public static get puddles(): any[] {
        return MagmaPuddle.s_all;
    }

    public static TickAll(): void {
        let i: int = (MagmaPuddle.s_all.length - 1) | 0;
        while (i >= 0) {
            if (as3.cast(MagmaPuddle.s_all[i], MagmaPuddle).tick()) {
                as3.cast(MagmaPuddle.s_all[i], MagmaPuddle).remove();
                MagmaPuddle.s_all.splice(i, 1);
            }
            i--;
        }
    }

    public static ClearAll(): void {
        for (let p of as3.values(MagmaPuddle.s_all)) {
            p.remove();
        }
        MagmaPuddle.s_all = [];
    }

    /** True when it is gone. */
    public tick(): boolean {
        ++this._age;
        // (a puddle outlives nothing: game time, or 3 times its life in real time if the game stopped ticking)
        if (this._age > MagmaPuddle.LIFE_TICKS || getTimer() - this._born > MagmaPuddle.LIFE_TICKS * 12.5 * 3) {
            return true;
        }
        if (this._age % MagmaPuddle.SCAN_EVERY == 0) {
            this.heal();
        }
        this.draw();
        return false;
    }

    private heal(): void {
        let near: any[] = Targeting.getCreepsInRange(MagmaPuddle.RADIUS, new Point(this._x, this._y), this._flags);
        let m: MonsterBase = null;
        for (let c of as3.values(near)) {
            m = as3.as(c.creep, MonsterBase);
            if (!m || this._healed.get(m) || m.health <= 0 || m.health >= m.maxHealth) {
                continue;
            }
            this._healed.set(m, true);
            ++this.healedCount;
            m.modifyHealth(MagmaPuddle.HEAL);
        }
    }

    private alpha(): number {
        let a: number = 0.9 + 0.1 * Math.sin(this._age / 12);
        if (this._age > MagmaPuddle.LIFE_TICKS - MagmaPuddle.FADE_TICKS) {
            a *= (MagmaPuddle.LIFE_TICKS - this._age) / MagmaPuddle.FADE_TICKS;
        }
        if (this._age < 12) {
            a *= this._age / 12;
        }
        return Math.max(0, Math.min(1, a));
    }

    private draw(): void {
        if (!MagmaPuddle.s_bmd || !GLOBAL._render) {
            return;
        }
        if (BYMConfig.instance.RENDERER_ON) {
            if (!MAP.instance) {
                return;
            }
            let off: Point = MAP.instance.offset;
            this._pt.x = this._x - MagmaPuddle.s_bmd.width * 0.5 - off.x;
            this._pt.y = this._y - MagmaPuddle.s_bmd.height * 0.5 - off.y;
            if (!this._raster) {
                // on the ground: over the ground's shadows, under the monsters and buildings
                this._raster = new RasterData(as3.cast(MagmaPuddle.s_bmd, IBitmapDrawable), this._pt, MAP.DEPTH_SHADOW + 0.5);
            }
            this._raster.alpha = this.alpha();
        } else if (MAP._EFFECTS) {
            if (!this._bitmap) {
                this._bitmap = as3.as(MAP._EFFECTS.addChild(new Bitmap(MagmaPuddle.s_bmd)), Bitmap);
                this._bitmap.x = this._x - MagmaPuddle.s_bmd.width * 0.5;
                this._bitmap.y = this._y - MagmaPuddle.s_bmd.height * 0.5;
            }
            this._bitmap.alpha = this.alpha();
        }
    }

    private remove(): void {
        if (this._raster) {
            this._raster.clear();
            this._raster = null;
        }
        if (this._bitmap && this._bitmap.parent) {
            this._bitmap.parent.removeChild(this._bitmap);
        }
        this._bitmap = null;
    }
}
