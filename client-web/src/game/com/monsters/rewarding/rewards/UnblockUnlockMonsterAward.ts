import * as as3 from "as3";
import { CREATURELOCKER, UnblockMonsterAward } from "@game";

export class UnblockUnlockMonsterAward extends UnblockMonsterAward {
    public $ctor(param1?: string): void {
        super.$ctor(param1);
    }

    protected override onApplication(): void {
        CREATURELOCKER._lockerData[this._monsterID] = { "t": 2 };
        super.onApplication();
    }

    public override reset(): void {
        delete CREATURELOCKER._lockerData[this._monsterID];
        super.reset();
    }
}
