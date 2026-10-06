import * as as3 from "as3";
import { KeywordMessage, ReplayableEvent, ReplayableEventHandler } from "@game";

export class BrukkargWarFinalAttackMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarfinal", "btn_attack");
    }

    protected override onButtonClick(): void {
        let _loc1_: ReplayableEvent = ReplayableEventHandler.activeEvent;
        if (_loc1_) {
            _loc1_.pressedActionButton();
        }
    }
}
