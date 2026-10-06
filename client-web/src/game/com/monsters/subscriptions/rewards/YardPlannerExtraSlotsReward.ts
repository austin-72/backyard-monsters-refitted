import * as as3 from "as3";
import { BasePlanner, GLOBAL, Reward, SubscriptionHandler } from "@game";

export class YardPlannerExtraSlotsReward extends Reward {
    public static readonly ID: string = "yardPlannerExtraSlots";

    public $ctor(): void {
        super.$ctor();
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    protected override onApplication(): void {
        BasePlanner.slots = (SubscriptionHandler.isEnabledForAll ? 10 : BasePlanner.DEFAULT_NUMBER_OF_SLOTS) >>> 0;
    }

    public override reset(): void {
        this.removed();
    }

    public override removed(): void {
        BasePlanner.slots = BasePlanner.DEFAULT_NUMBER_OF_SLOTS;
    }
}
