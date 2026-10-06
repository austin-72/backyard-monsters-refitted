import * as as3 from "as3";
import { int } from "as3";
import { CREEPS, GLOBAL, KEYS, KeywordMessage, POPUPS } from "@game";

export class KOTHRewardMessage extends KeywordMessage {
    public $ctor(param1?: any /* boolean */): void {
        let _loc2_: int = 1;
        if (CREEPS.krallen) {
            _loc2_ = CREEPS.krallen._level.Get() | 0;
        }
        super.$ctor(param1 ? "kothendkeep" : "kothendwin", "btn_brag");
        this.body = KEYS.Get(KeywordMessage.PREFIX + this._keyword, { "v1": _loc2_ });
        this.imageURL = KeywordMessage.getImageURLFromKeyword("event_kothwin");
    }

    protected override onButtonClick(): void {
        GLOBAL.CallJS("sendFeed", ["event4-reward", KEYS.Get("fb_kothstream_title"), KEYS.Get("fb_kothstream_desc"), "fb_kothstream.png"]);
        POPUPS.Next();
    }
}
