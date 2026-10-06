import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, DAVERockets, FIREBALL, FIREBALLS, ITargetable, MonsterBase, SOUNDS } from "@game";

export class DAVE extends CreepBase {
    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        if (this.poweredUp()) {
            this.addComponent(new DAVERockets());
        }
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        if (param1 instanceof BFOUNDATION) {
            FIREBALLS.Spawn(new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10), this._targetBuilding._position, this._targetBuilding, 10, (this.damage / 2) | 0, 0, 0, FIREBALL.TYPE_MISSILE, this);
            return FIREBALLS.Spawn(new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10), this._targetBuilding._position, this._targetBuilding, 10, (this.damage / 2) | 0, 0, 0, FIREBALL.TYPE_MISSILE, this);
        }
        FIREBALLS.Spawn2(new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10), this._targetCreep._tmpPoint, this._targetCreep, 10, (this.damage / 2) | 0, 0, FIREBALL.TYPE_MISSILE, 1, this);
        return FIREBALLS.Spawn2(new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10), this._targetCreep._tmpPoint, this._targetCreep, 10, (this.damage / 2) | 0, 0, FIREBALL.TYPE_MISSILE, 1, this);
    }

    public override deathSplat(): void {
        SOUNDS.Play("monsterlanddave");
    }
}
