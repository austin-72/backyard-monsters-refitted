import * as as3 from "as3";
import { KeywordMessage, ReplayableEventHandler, com_monsters_frontPage_messages_Message as Message } from "@game";

export class BattletoadsStartMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event1start", "btn_attack");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event1start.v2.jpg";
    }

    protected override onButtonClick(): void {
        ReplayableEventHandler.activeEvent.pressedActionButton();
    }
}
