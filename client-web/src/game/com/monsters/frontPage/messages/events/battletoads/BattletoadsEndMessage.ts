import { KeywordMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class BattletoadsEndMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event1end");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event1end.v2.jpg";
    }
}
