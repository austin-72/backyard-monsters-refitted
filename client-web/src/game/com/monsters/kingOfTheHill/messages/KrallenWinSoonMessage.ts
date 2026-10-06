import { KeywordMessage } from "@game";

export class KrallenWinSoonMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("krallenwin");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothwin");
    }
}
