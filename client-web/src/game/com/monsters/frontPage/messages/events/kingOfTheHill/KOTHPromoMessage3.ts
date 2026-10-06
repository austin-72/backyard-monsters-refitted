import { KOTHPromoMessage, KeywordMessage } from "@game";

export class KOTHPromoMessage3 extends KOTHPromoMessage {
    public $ctor(): void {
        super.$ctor("event_kothpromo3");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothpromo2");
    }
}
