import * as as3 from "as3";
import { GLOBAL, Reward, SpurtzCannon } from "@game";

export class SpurtzCannonReward1 extends Reward {
    public static readonly ID: string = "spurtzCannonReward";

    public $ctor(): void {
        super.$ctor();
    }

    protected override onApplication(): void {
        GLOBAL._buildingProps[SpurtzCannon.TYPE - 1].block = false;
        GLOBAL._buildingProps[SpurtzCannon.TYPE - 1].quantity = [1];
    }

    public override removed(): void {
        GLOBAL._buildingProps[SpurtzCannon.TYPE - 1].block = true;
    }

    public override reset(): void {
        if (this.canBeApplied()) {
            this.removed();
        }
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }
}
