import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, MonsterBase, PATHING, Targeting } from "@game";

/**
 * Inferno-only: the Fusebug (IC15; the user's FUSEBUG_EMBERGHOUL.md). It explodes on its first attack with
 * the game's own blast (CreepBase.explode, as Eye-ra's; `"explode": [1]` in its locker entry).
 *
 * A creep stops at the edge of a building's footprint, which left the Fusebug going off well away from the
 * building's middle, where the blast is measured from (the user: "get closer to its targets"). So when it
 * would blow up at a building it first scuttles on in to it, walking (its walk frames), until it is within
 * CLOSE of the building's middle, or for at most MAX_APPROACH game steps, then goes off. Against a monster
 * (a defender that caught it) it goes off at once, as before.
 */
export class Fusebug extends CreepBase {
    static {
        as3.fields(this, { m_approach: 0, approaching: false });
    }

    public static readonly ID: string = "IC15";

    /** How close (grid) to the building's middle it gets before it goes off. */
    public static readonly CLOSE: number = 12;

    /** The longest it keeps creeping in (game steps: 1.5 s). */
    public static readonly MAX_APPROACH: int = 120;
    private m_approach: int;
    /** Creeping in to its building now. */
    public approaching: boolean;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
    }

    /** The middle of a building, in map (iso) coordinates. */
    private static middleOf(param1: BFOUNDATION): Point {
        return new Point(param1._mc.x, param1._mc.y + param1._middle);
    }

    /** Its distance (grid) to the building's middle. */
    public distanceTo(param1: BFOUNDATION): number {
        return Point.distance(PATHING.FromISO(this._tmpPoint), PATHING.FromISO(Fusebug.middleOf(param1)));
    }

    protected override explode(): number {
        let b: BFOUNDATION = this._targetBuilding;
        if (!this._targetCreep && b && b.health > 0 && b._mc && this.m_approach < Fusebug.MAX_APPROACH && this.distanceTo(b) > Fusebug.CLOSE) {
            // one step in, at its walking pace; asked again next step (the attack's cooldown kept at 0)
            ++this.m_approach;
            this.approaching = true;
            let to: Point = Fusebug.middleOf(b);
            this._xd = to.x - this._tmpPoint.x;
            this._yd = to.y - this._tmpPoint.y;
            let len: number = Math.sqrt(this._xd * this._xd + this._yd * this._yd);
            let step: number = Math.min(len, Math.max(0.5, this.moveSpeed * 0.5));
            if (len > 0) {
                this._tmpPoint.x += this._xd / len * step;
                this._tmpPoint.y += this._yd / len * step;
                this.node = Targeting.CreepCellMove(this._tmpPoint, this._id, this, this.node);
            }
            this.attackCooldown = 0;
            return 0;
        }
        this.approaching = false;
        return super.explode();
    }

    /** Walking while it creeps in (not the standing frame it shows at a target). */
    protected override ioAction(): string {
        let action: string = super.ioAction();
        return this.approaching && action == "idle" ? "walking" : action;
    }
}
