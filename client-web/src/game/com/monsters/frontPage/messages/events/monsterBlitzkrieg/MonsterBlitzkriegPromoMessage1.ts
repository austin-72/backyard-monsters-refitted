import { ReplayableEventPromoMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegPromoMessage1 extends ReplayableEventPromoMessage {
    public $ctor(): void {
        super.$ctor("event2pop1");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2pop1.v2.jpg";
    }
}
