import * as as3 from "as3";
import { int, uint } from "as3";
import { Category } from "@game";

export class WhatsAvailable extends Category {
    private static readonly _TIME_UNTIL_RESET: uint = 86400;

    public $ctor(): void {
        super.$ctor();
        this.priority = 3;
        this.name = "What\'s Available";
        this._doesViewRepeatedly = false;
    }

    public override setup(param1: any): void {
        super.setup(param1);
        this.markOldMessagesAsUnseen();
    }

    private markOldMessagesAsUnseen(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this._messages.length) {
            as3.vget(this._messages, _loc1_).markAsUnseenIfOlderThan(WhatsAvailable._TIME_UNTIL_RESET);
            _loc1_++;
        }
    }
}
