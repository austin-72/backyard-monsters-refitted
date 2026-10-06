import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, FIREBALLS, ITargetable, MonsterBase } from "@game";

export class Sabnox extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        if (param1 instanceof BFOUNDATION) {
            if (this._targetBuilding._class == "tower") {
                return FIREBALLS.Spawn(this._tmpPoint, this._targetBuilding._position, this._targetBuilding, 10, (this.damage * 2) | 0, 0, 0, FIREBALLS.TYPE_MAGMA, this);
            }
            return FIREBALLS.Spawn(this._tmpPoint, this._targetBuilding._position, this._targetBuilding, 10, this.damage | 0, 0, 0, FIREBALLS.TYPE_MAGMA, this);
        }
        return FIREBALLS.Spawn2(this._tmpPoint, this._targetCreep._tmpPoint, this._targetCreep, 10, this.damage | 0, 0, FIREBALLS.TYPE_MAGMA, 1, this);
    }
}
