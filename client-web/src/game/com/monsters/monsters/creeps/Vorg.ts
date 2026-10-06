import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, FIREBALLS, ITargetable, MonsterBase, SOUNDS, SPRITES, Targeting } from "@game";

export class Vorg extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        SPRITES.SetupSprite("shadow");
        this.attackFlags = Targeting.getOldStyleTargets(1);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        if ((Number(this._creatureID.substr(1)) | 0) < 5) {
            SOUNDS.Play("hit" + ((1 + Math.random() * 3) | 0), 0.1 + Math.random() * 0.1);
        } else if ((Number(this._creatureID.substr(1)) | 0) < 10) {
            SOUNDS.Play("hit" + ((3 + Math.random() * 2) | 0), 0.1 + Math.random() * 0.1);
        } else {
            SOUNDS.Play("hit" + ((4 + Math.random() * 1) | 0), 0.1 + Math.random() * 0.1);
        }
        return FIREBALLS.Spawn2(new Point(this._tmpPoint.x, this._tmpPoint.y - this._altitude), this._targetCreep._tmpPoint, this._targetCreep, 25, this.damage | 0, 0, FIREBALLS.TYPE_FIREBALL, 1, this);
    }
}
