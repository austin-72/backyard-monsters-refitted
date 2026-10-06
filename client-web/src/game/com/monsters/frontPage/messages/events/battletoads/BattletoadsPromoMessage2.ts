import { ReplayableEventPromoMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class BattletoadsPromoMessage2 extends ReplayableEventPromoMessage {
    public $ctor(): void {
        super.$ctor("event1pop2");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event1pop2.v2.jpg";
    }
}
