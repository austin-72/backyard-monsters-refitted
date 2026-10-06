import { KeywordMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegEndMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event2end");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2start.v2.jpg";
    }
}
