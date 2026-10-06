import * as as3 from "as3";
import { KeywordMessage, POPUPS, ReplayableEventHandler } from "@game";

export class BrukkargWarStartMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarstart", "btn_nextwave");
    }

    protected override onButtonClick(): void {
        ReplayableEventHandler.activeEvent.pressedActionButton();
        POPUPS.Next();
    }
}
