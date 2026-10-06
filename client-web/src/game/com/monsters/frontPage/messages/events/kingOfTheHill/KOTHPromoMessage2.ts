import { KOTHPromoMessage, KeywordMessage } from "@game";

export class KOTHPromoMessage2 extends KOTHPromoMessage {
    public $ctor(): void {
        super.$ctor("event_kothpromo2");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothpromo3");
    }
}
