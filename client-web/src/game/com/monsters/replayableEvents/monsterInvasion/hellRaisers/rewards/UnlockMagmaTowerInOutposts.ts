import * as as3 from "as3";
import { BASE, GLOBAL, INFERNO_MAGMA_TOWER, Reward } from "@game";

export class UnlockMagmaTowerInOutposts extends Reward {
    public static readonly ID: string = "magmaTowersInOutpostsReward";

    public $ctor(): void {
        super.$ctor();
    }

    protected override onApplication(): void {
        GLOBAL._buildingProps[INFERNO_MAGMA_TOWER.ID - 1].block = false;
        GLOBAL._buildingProps[INFERNO_MAGMA_TOWER.ID - 1].quantity = [this.value];
    }

    public override removed(): void {
        GLOBAL._buildingProps[INFERNO_MAGMA_TOWER.ID - 1].block = false;
    }

    public override reset(): void {
        if (this.canBeApplied()) {
            this.removed();
        }
    }

    public override canBeApplied(): boolean {
        return GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isOutpost;
    }
}
