import * as as3 from "as3";
import { uint } from "as3";
import { GLOBAL, HATCHERYCC, MAPROOM_DESCENT, Reward } from "@game";

export class ImprovedHCCReward extends Reward {
    static {
        as3.fields(this, { _QUEUE_LIMIT: 30 });
    }

    public static readonly ID: string = "improvedHCC";
    private _QUEUE_LIMIT: uint;

    public $ctor(): void {
        super.$ctor();
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    protected override onApplication(): void {
        HATCHERYCC.queueLimit = this._QUEUE_LIMIT;
        if (MAPROOM_DESCENT.DescentPassed) {
            HATCHERYCC.doesShowInfernoCreeps = true;
        }
    }

    public override reset(): void {
        this.removed();
    }

    public override removed(): void {
        HATCHERYCC.queueLimit = HATCHERYCC.DEFAULT_QUEUE_LIMIT;
        HATCHERYCC.doesShowInfernoCreeps = false;
    }
}
