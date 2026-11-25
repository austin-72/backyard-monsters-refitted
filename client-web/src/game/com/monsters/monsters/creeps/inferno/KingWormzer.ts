import { int } from "as3";
import { Point } from "flash/geom";
import { AOEDamageOnAttackOncePerTarget, BFOUNDATION, CreepBase, GLOBAL, MapRoomManager, MonsterBase, Targeting } from "@game";

export class KingWormzer extends CreepBase {
    /**
     * Inferno-only (21 October): how far King Wormzer's splash reaches round him when he comes up under a building
     * (his first hit on each target, 4 times its damage, AOEDamageOnAttackOncePerTarget; it was 100).
     */
    public static readonly IO_SPLASH_RADIUS: int = 50;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        let _loc13_: any = Targeting.k_TARGETS_BUILDINGS | Targeting.k_TARGETS_GROUND;
        // Monster targeting parameters disabled.
        // King Wormer's splash damage did not work against monsters in the original game, and is too overpowered when re-enabled.
        // if(param8)
        // {
        // _loc13_ |= Targeting.k_TARGETS_ATTACKERS;
        // }
        // else
        // {
        // _loc13_ |= Targeting.k_TARGETS_DEFENDERS;
        // }
        if (!MapRoomManager.instance.isInMapRoom3) {
            // (Inferno-only, 21 October, the user's: the splash as he pops up reaches half as far, 50 rather than 100)
            this.addComponent(new AOEDamageOnAttackOncePerTarget(GLOBAL.INFERNO_ONLY ? KingWormzer.IO_SPLASH_RADIUS : 100, _loc13_ | 0, 4));
        }
    }
}
