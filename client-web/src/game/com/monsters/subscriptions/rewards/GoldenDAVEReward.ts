import * as as3 from "as3";
import { CreepEvent, CreepSkinManager, GLOBAL, Reward } from "@game";

export class GoldenDAVEReward extends Reward {
    public static readonly ID: string = "goldenDAVE";

    private static readonly DAVE_CREEP_ID: string = "C12";

    private static readonly GOLD_SKIN_ID: string = "C12Gold";

    public $ctor(): void {
        super.$ctor();
    }

    protected override onApplication(): void {
        let _loc1_: string = !(!this._value) ? GoldenDAVEReward.GOLD_SKIN_ID : null;
        CreepSkinManager.instance.SetSkin(GoldenDAVEReward.DAVE_CREEP_ID, _loc1_);
        GLOBAL.eventDispatcher.addEventListener(CreepEvent.ATTACKING_MONSTER_SPAWNED, as3.bind(this, this.onAttackingCreepSpawned));
        GLOBAL.eventDispatcher.addEventListener(CreepEvent.DEFENDING_CREEP_SPAWNED, as3.bind(this, this.onDefendingCreepSpawned));
    }

    public override removed(): void {
        CreepSkinManager.instance.SetSkin(GoldenDAVEReward.DAVE_CREEP_ID, null);
        GLOBAL.eventDispatcher.removeEventListener(CreepEvent.ATTACKING_MONSTER_SPAWNED, as3.bind(this, this.onAttackingCreepSpawned));
        GLOBAL.eventDispatcher.removeEventListener(CreepEvent.DEFENDING_CREEP_SPAWNED, as3.bind(this, this.onDefendingCreepSpawned));
    }

    public override reset(): void {
    }

    private onAttackingCreepSpawned(param1: CreepEvent): void {
        if (GLOBAL.isAtHomeOrInOutpost() && this._value && param1.creep && param1.creep._creatureID == GoldenDAVEReward.DAVE_CREEP_ID) {
            param1.creep.currentSkinOverride = GoldenDAVEReward.DAVE_CREEP_ID;
        }
    }

    private onDefendingCreepSpawned(param1: CreepEvent): void {
        if (!GLOBAL.isAtHomeOrInOutpost() && this._value && param1.creep && param1.creep._creatureID == GoldenDAVEReward.DAVE_CREEP_ID) {
            param1.creep.currentSkinOverride = GoldenDAVEReward.DAVE_CREEP_ID;
        }
    }
}
