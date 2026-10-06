import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, CreepBase, GRID, IAttackable, ITargetable, MonsterBase } from "@game";

/**
 * Inferno-only: Flickerfiend (IC14), heat-shimmer with teeth. After every 3rd strike on a building it
 * dissolves into hot air, and reappears beside another building up to 400 px away (never the one it
 * was hitting). While it shimmers it cannot be targeted, and whatever was already fired at it misses.
 * The shimmer is the sprite sheet's blink rows (9-12), a frame every 8 ticks (10 a second, from the first):
 * 32 ticks (0.4 s, the four frames once) fading out, then gone (not drawn at all) for a full second (80
 * ticks: the game runs 80 steps a second), then 24 ticks (0.3 s) shimmering back in beside the new
 * building. (It used to fade out and in over 8 ticks each, a tenth of a second: too quick to see.) It is
 * too nimble
 * to set traps off (BTRAP.FindTargets, Targeting.ioSkipsTraps); a trap something else sets off still
 * catches it in the blast, unless it is shimmering.
 */
export class Flickerfiend extends CreepBase {
    static {
        as3.fields(this, { _strikes: 0, _blink: 0, _blinkTo: null });
    }

    public static readonly ID: string = "IC14";

    private static readonly STRIKES: int = 3;

    private static readonly RANGE: number = 400;

    public static readonly OUT_TICKS: int = 32;

    public static readonly IN_TICKS: int = 24;

    /** Gone for a full second: the game runs 80 steps (ticks) a second. */
    private static readonly GONE_TICKS: int = 80;
    private _strikes: int;
    /** 0 not blinking; counts up through the fade out, the jump and the fade in. */
    private _blink: int;
    private _blinkTo: BFOUNDATION;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
    }

    public get blinking(): boolean {
        return this._blink > 0;
    }

    protected override attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        super.attacked(param1, param2, param3);
        if (this._blink > 0 || this.health <= 0 || !(param1 instanceof BFOUNDATION) || this._behaviour != MonsterBase.k_sBHVR_ATTACK && this._behaviour != MonsterBase.k_sBHVR_BOUNCE) {
            return;
        }
        if (++this._strikes >= Flickerfiend.STRIKES) {
            this._strikes = 0;
            this.startBlink();
        }
    }

    /** Another building close by: alive, not a wall, trap or decoration, not the one it is on. */
    private pickTarget(): BFOUNDATION {
        let near: any[] = [];
        let b: BFOUNDATION = null;
        let dx: number = NaN;
        let dy: number = NaN;
        for (b of as3.values(BASE._buildingsMain)) {
            if (!b || b == this._targetBuilding || b.health <= 0 || !b.isTargetable || !b._mc) {
                continue;
            }
            if (b._class == "decoration" || b._class == "immovable" || b._class == "enemy" || b._class == "wall" || b._class == "trap") {
                continue;
            }
            if (b._class == "tower" && b instanceof BTOWER && as3.cast(b, BTOWER).isJard) {
                continue;
            }
            dx = b._mc.x - this._tmpPoint.x;
            dy = b._mc.y + b._middle - this._tmpPoint.y;
            if (dx * dx + dy * dy <= Flickerfiend.RANGE * Flickerfiend.RANGE) {
                near.push(b);
            }
        }
        return as3.cast(near.length ? near[(Math.random() * near.length) | 0] : null, BFOUNDATION);
    }

    private startBlink(): void {
        this._blinkTo = this.pickTarget();
        if (!this._blinkTo) {
            return;
        }
        this._blink = 1;
        // the shimmer starts on its first frame (SPRITES: a frame every 8 ticks)
        this._frameNumber = (this._frameNumber + (32 - this._frameNumber % 32) % 32) | 0;
        ++this.targetableStatus;
        this.spriteAction = "blink";
        this._hasPath = false;
        this._attacking = false;
    }

    /** Beside the new building, on the side facing where it was. */
    private landingPoint(param1: BFOUNDATION): Point {
        let centre: Point = GRID.FromISO(param1._mc.x, param1._mc.y + param1._middle);
        let from: Point = GRID.FromISO(this._tmpPoint.x, this._tmpPoint.y);
        let d: Point = from.subtract(centre);
        if (d.length < 1) {
            d = new Point(1, 1);
        }
        // just outside the footprint's edge on that side (not further out, where a neighbour may stand)
        d.normalize(1);
        let edge: number = param1._footprint[0].width * 0.5 / Math.max(Math.abs(d.x), Math.abs(d.y), 0.5);
        d.normalize(edge + 10);
        let at: Point = centre.add(d);
        return GRID.ToISO(at.x, at.y, 0);
    }

    /** Ticks 1-32 fade out, 33-112 gone (it moves on tick 33), 113-136 fade in, then on its way. */
    private tickBlink(): void {
        ++this._blink;
        let a: number = 1;
        if (this._blink <= Flickerfiend.OUT_TICKS) {
            a = 1 - this._blink / (Flickerfiend.OUT_TICKS + 1);
        } else if (this._blink <= Flickerfiend.OUT_TICKS + Flickerfiend.GONE_TICKS) {
            if (this._blink == Flickerfiend.OUT_TICKS + 1 && this._blinkTo && this._blinkTo.health > 0) {
                this._tmpPoint = this.landingPoint(this._blinkTo);
            }
            a = 0;
        } else if (this._blink <= Flickerfiend.OUT_TICKS + Flickerfiend.GONE_TICKS + Flickerfiend.IN_TICKS) {
            a = (this._blink - Flickerfiend.OUT_TICKS - Flickerfiend.GONE_TICKS) / Flickerfiend.IN_TICKS;
        } else {
            this.endBlink();
            return;
        }
        this.fade(a);
    }

    private endBlink(): void {
        this._blink = 0;
        --this.targetableStatus;
        this.spriteAction = "walking";
        this.fade(1);
        // on to the new building (the closest one now, which is the one it came out beside)
        this.loseTarget();
        this._hasPath = false;
        this._waypoints = [];
        if (this._blinkTo && this._blinkTo.health > 0) {
            this.WaypointTo(new Point(this._blinkTo._mc.x, this._blinkTo._mc.y), this._blinkTo);
        } else {
            this.findTarget(this._targetGroup);
        }
        this._blinkTo = null;
    }

    private fade(param1: number): void {
        if (this._graphicMC) {
            this._graphicMC.alpha = param1;
        }
        if (this._rasterData) {
            this._rasterData.alpha = param1;
        }
        if (this._shadowData) {
            this._shadowData.alpha = param1;
        }
    }

    public override tickBAttack(): boolean {
        if (this._blink > 0) {
            if (this.health <= 0) {
                return true;
            }
            this.tickBlink();
            return false;
        }
        return super.tickBAttack();
    }

    /** It stays where it is while it blinks (fading out, gone, fading in beside the new building). */
    protected override move(): void {
        if (this._blink > 0) {
            return;
        }
        super.move();
    }

    /** Nothing lands on heat-shimmer: what was fired at it while it blinked misses. */
    public override modifyHealth(param1: number, param2: ITargetable = null): number {
        if (this._blink > 0 && param1 < 0) {
            return 0;
        }
        return super.modifyHealth(param1, param2);
    }
}
