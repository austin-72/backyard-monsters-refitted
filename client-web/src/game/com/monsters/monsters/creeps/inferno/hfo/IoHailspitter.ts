import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, FIREBALL, FIREBALLS, ITargetable, IoIceCreep, MonsterBase, SPRITES } from "@game";

/**
 * Hell Freezes Over: the Hailspitter (IC30), a frostbitten toad with a crystal mortar on its back. It lobs
 * hailstones (FIREBALL.TYPE_HAIL, effects hfo/extras/hailstone.png) over walls from range, and a hailstone
 * that lands is an ice hit like any other (IoIce).
 */
export class IoHailspitter extends IoIceCreep {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        SPRITES.SetupSprite(FIREBALL.HAIL_GRAPHIC_NAME);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let from: Point = new Point(this._tmpPoint.x, this._tmpPoint.y - 20);
        if (param1 instanceof BFOUNDATION) {
            return FIREBALLS.Spawn(from, this._targetBuilding._position, this._targetBuilding, 8, this.damage | 0, 0, 0, FIREBALL.TYPE_HAIL, this);
        }
        return FIREBALLS.Spawn2(from, this._targetCreep._tmpPoint, this._targetCreep, 8, this.damage | 0, 0, FIREBALL.TYPE_HAIL, 1, this);
    }
}
