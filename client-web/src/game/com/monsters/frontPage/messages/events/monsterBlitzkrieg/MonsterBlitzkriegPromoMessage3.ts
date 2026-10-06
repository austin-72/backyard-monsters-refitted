import { ReplayableEventPromoMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegPromoMessage3 extends ReplayableEventPromoMessage {
    public $ctor(): void {
        super.$ctor("event2pop3");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2pop3.v2.jpg";
    }
}
