import { int } from "as3";
import { Point } from "flash/geom";
import { AOEDamageOnDeath, BFOUNDATION, CreepBase, MonsterBase, Targeting } from "@game";

export class ProjectX extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        let _loc13_: any = 0;
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        if (this.poweredUp()) {
            _loc13_ = Targeting.k_TARGETS_BUILDINGS | Targeting.k_TARGETS_GROUND;
            if (param8) {
                _loc13_ |= Targeting.k_TARGETS_ATTACKERS;
            } else {
                _loc13_ |= Targeting.k_TARGETS_DEFENDERS;
            }
            this.addComponent(new AOEDamageOnDeath(60, _loc13_ | 0));
        }
    }
}
