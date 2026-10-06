import { KeywordMessage } from "@game";

export class KrallenAtRiskMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("krallenrisk");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothlose");
    }
}
