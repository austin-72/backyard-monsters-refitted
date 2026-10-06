import { UnblockMonsterAward } from "@game";

export class UnblockVorgReward extends UnblockMonsterAward {
    public static readonly ID: string = "unblockVorg";

    public $ctor(): void {
        super.$ctor("C16");
    }
}
