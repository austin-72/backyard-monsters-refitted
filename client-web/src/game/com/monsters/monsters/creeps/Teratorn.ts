import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, FIREBALLS, GlavesOnAttack, ITargetable, MonsterBase, SPRITES } from "@game";

export class Teratorn extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        SPRITES.SetupSprite("shadow");
        if (this.poweredUp()) {
            this.addComponent(new GlavesOnAttack(this.powerUpLevel() >>> 0));
        }
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        if (param1 instanceof BFOUNDATION) {
            return FIREBALLS.Spawn(new Point(this._tmpPoint.x, this._tmpPoint.y - this._altitude), this._targetBuilding._position, this._targetBuilding, 6, this.damage | 0, 0, 0, FIREBALLS.TYPE_MAGMA, this);
        }
        return FIREBALLS.Spawn2(this._tmpPoint, this._targetCreep._tmpPoint, this._targetCreep, 10, this.damage | 0, 0, FIREBALLS.TYPE_MAGMA, 1, this);
    }
}
