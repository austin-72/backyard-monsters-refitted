import { KEYS, KOTHHandler, KeywordMessage } from "@game";

export class KOTHQuota1MetMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor(KOTHHandler.instance.tier >= 1 ? "kothquota1_havekrallen" : "kothquota1_nokrallen");
        this.body = KEYS.Get(KeywordMessage.PREFIX + this._keyword, { "v1": KOTHHandler.instance.wins + 1 });
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothwin");
    }
}
