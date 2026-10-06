import * as as3 from "as3";
import { UnblockUnlockMonsterAward } from "@game";

export class UnlockRezghulReward extends UnblockUnlockMonsterAward {
    public static readonly k_REWARD_ID: string = "unlockRezghul";

    public $ctor(): void {
        super.$ctor("C19");
    }

    protected override onApplication(): void {
        super.onApplication();
    }
}
