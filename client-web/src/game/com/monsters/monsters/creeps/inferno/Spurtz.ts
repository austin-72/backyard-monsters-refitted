import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, EFFECTS, MonsterBase } from "@game";

export class Spurtz extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
    }

    public override deathSplat(): void {
        EFFECTS.Burn(this._tmpPoint.x | 0, this._tmpPoint.y | 0);
    }
}
