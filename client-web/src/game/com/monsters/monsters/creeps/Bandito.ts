import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, BanditoAOEDamageSpin, CreepBase, MonsterBase, Targeting } from "@game";

export class Bandito extends CreepBase {
    public $ctor(creatureID?: string, behaviour?: string, spawnPoint?: Point, rotation?: number, level: int = 0, health: int = 2147483647, center: Point = null, friendly: boolean = false, house: BFOUNDATION = null, damageMult: number = 1, goEasy: boolean = false, monster: MonsterBase = null): void {
        let flags: any = 0;
        super.$ctor(creatureID, behaviour, spawnPoint, rotation, level, health, center, friendly, house, damageMult, goEasy, monster);
        if (this._creatureID == "C7" && this.poweredUp()) {
            flags = Targeting.k_TARGETS_GROUND;
            flags |= friendly ? Targeting.k_TARGETS_ATTACKERS : Targeting.k_TARGETS_DEFENDERS;
            this.addComponent(new BanditoAOEDamageSpin(60, flags | 0, 60, false));
        }
    }
}
