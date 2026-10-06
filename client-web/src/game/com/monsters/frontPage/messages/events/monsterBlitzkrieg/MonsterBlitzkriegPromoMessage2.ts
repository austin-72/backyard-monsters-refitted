import { ReplayableEventPromoMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegPromoMessage2 extends ReplayableEventPromoMessage {
    public $ctor(): void {
        super.$ctor("event2pop2");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2pop2.v2.jpg";
    }
}
