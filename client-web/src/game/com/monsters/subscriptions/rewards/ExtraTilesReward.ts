import * as as3 from "as3";
import { GLOBAL, MAP, Reward } from "@game";

export class ExtraTilesReward extends Reward {
    public static readonly ID: string = "extraTiles";

    public $ctor(): void {
        super.$ctor();
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    protected override onApplication(): void {
        MAP.swapIntBG(this.value | 0);
    }

    public override removed(): void {
        MAP.swapIntBG(0);
    }
}
