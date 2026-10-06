import { UnblockUnlockMonsterAward } from "@game";

export class UnlockVorgReward extends UnblockUnlockMonsterAward {
    public static readonly ID: string = "unlockVorg";

    public $ctor(): void {
        super.$ctor("C16");
    }
}
