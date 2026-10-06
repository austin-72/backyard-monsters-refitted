import * as as3 from "as3";
import { KeywordMessage, POPUPS, ReplayableEventHandler, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegStartMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event2start", "btn_nextwave");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2start.v2.jpg";
    }

    protected override onButtonClick(): void {
        ReplayableEventHandler.activeEvent.pressedActionButton();
        POPUPS.Next();
    }
}
