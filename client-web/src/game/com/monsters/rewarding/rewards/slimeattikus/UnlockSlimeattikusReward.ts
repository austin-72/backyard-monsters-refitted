import { UnblockUnlockMonsterAward } from "@game";

export class UnlockSlimeattikusReward extends UnblockUnlockMonsterAward {
    public static readonly ID: string = "unlockSlimeattikus";

    public $ctor(): void {
        super.$ctor("C17");
    }
}
