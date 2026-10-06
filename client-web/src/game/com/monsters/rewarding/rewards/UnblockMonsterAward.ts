import * as as3 from "as3";
import { BASE, CREATURELOCKER, GLOBAL, Reward } from "@game";

export class UnblockMonsterAward extends Reward {
    static {
        as3.fields(this, { _monsterID: null });
    }

    protected _monsterID: string;

    public $ctor(param1?: string): void {
        super.$ctor();
        this._monsterID = param1;
    }

    public override canBeApplied(): boolean {
        return GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.isInfernoMainYardOrOutpost;
    }

    protected override onApplication(): void {
        CREATURELOCKER._creatures[this._monsterID].blocked = false;
    }

    public override reset(): void {
        CREATURELOCKER._creatures[this._monsterID].blocked = true;
    }
}
