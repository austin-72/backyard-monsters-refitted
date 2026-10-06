import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, MonsterBase, Targeting } from "@game";

export class Balthazar extends CreepBase {
    public $ctor(id?: string, behavior?: string, spawn?: Point, rotation?: number, level: int = 0, health: int = 2147483647, center: Point = null, friendly: boolean = false, housing: BFOUNDATION = null, damageMult: number = 1, easy: boolean = false, monster: MonsterBase = null): void {
        super.$ctor(id, behavior, spawn, rotation, level, health, center, friendly, housing, damageMult, easy, monster);
        if (Boolean(this.defenseFlags & Targeting.k_TARGETS_FLYING)) {
            this.defenseFlags ^= Targeting.k_TARGETS_FLYING;
        }
        if (Boolean(this.defenseFlags & Targeting.k_TARGETS_GROUND)) {
            this.defenseFlags ^= Targeting.k_TARGETS_GROUND;
        }
        if (this.poweredUp()) {
            this.targetMode = 1;
        }
    }
}
