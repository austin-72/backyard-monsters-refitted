import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, ConquestAttackCostMultiplier, KEYS, MapRoomManager } from "@game";

export class AllianceConquestBuff extends BaseBuff {
    public static readonly k_AttackCostMultiplier: number = 0.75;

    public static readonly ID: uint = 9;

    public $ctor(): void {
        super.$ctor("ap_conquest");
    }

    public override get description(): string {
        return KEYS.Get(MapRoomManager.instance.isInMapRoom2 ? "ap_conquest_desc" : "nwm_ap_conquest_desc");
    }

    public override apply(): void {
        MapRoomManager.instance.attackCostMultiplier.addModifier(new ConquestAttackCostMultiplier());
    }

    public override clear(): void {
        MapRoomManager.instance.attackCostMultiplier.removeModifier(MapRoomManager.instance.attackCostMultiplier.getModifierByType(ConquestAttackCostMultiplier));
    }
}
