import { KeywordMessage } from "@game";

export class KOTHQuota2MetMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("kothquota2");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothwin");
    }
}
