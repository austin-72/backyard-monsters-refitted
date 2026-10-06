import { UnblockMonsterAward } from "@game";

export class UnblockSlimeattikusReward extends UnblockMonsterAward {
    public static readonly ID: string = "unblockSlimeattikus";

    public $ctor(): void {
        super.$ctor("C17");
    }
}
