import { KeywordMessage } from "@game";

export class KOTHEndMessage extends KeywordMessage {
    public $ctor(param1?: any /* boolean */): void {
        super.$ctor(param1 ? "kothendlosekrallen" : "kothendlose");
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothlose");
    }
}
