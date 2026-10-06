import * as as3 from "as3";
import { int } from "as3";
import { GLOBAL, HousingPersistentMonsterBar_CLIP, KEYS, STORE } from "@game";

export class HousingPersistentMonsterBar extends HousingPersistentMonsterBar_CLIP {
    static {
        as3.fields(this, { m_creatureID: null });
    }

    public static readonly k_monsterBarDisplayBarWidth: int = 175;

    public static readonly k_HealFrame: int = 2;

    public static readonly k_NormalFrame: int = 1;
    public m_creatureID: string;

    public $ctor(param1?: string): void {
        super.$ctor();
        this.m_creatureID = param1;
    }

    public updateTimer(): void {
        if (this.bFinish) {
            this.bFinish.Setup(KEYS.Get("btn_housing_finish", { "v1": this.getTimeCost() }));
        }
        let _loc1_: int = this.calcTimeLeft();
        this.tHealStatusText.htmlText = "<b>" + GLOBAL.ToTime(_loc1_) + "</b>";
    }

    public calcTimeLeft(): int {
        return GLOBAL.player.getHighestTimeHealingUsingNumberOfHousing(this.m_creatureID);
    }

    public getTimeCost(param1: boolean = false): int {
        let _loc2_: int = 0;
        let _loc3_: int = GLOBAL.player.getSecsTillDoneByID(this.m_creatureID, param1);
        if (_loc3_ == 0) {
            return 0;
        }
        _loc2_ = (STORE.GetTimeCost(_loc3_, false) * GLOBAL.ABTestHealingTimeShinyMod()) | 0;
        return Math.max(_loc2_, 1) | 0;
    }

    public getResourceCostInShiny(): int {
        if (this.currentFrame == HousingPersistentMonsterBar.k_HealFrame || this.m_healthBar.mcBar.width == HousingPersistentMonsterBar.k_monsterBarDisplayBarWidth) {
            return 0;
        }
        return GLOBAL.player.getResourceCostInShinyByID(this.m_creatureID);
    }
}
