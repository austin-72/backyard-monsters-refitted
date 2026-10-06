import * as as3 from "as3";
import { GLOBAL, KeywordMessage } from "@game";

export class SpurtzCannonRewardMessage3 extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarreward3", "btn_brag");
    }

    protected override onButtonClick(): void {
        GLOBAL.Brag("event5-reward", "event_bruwarreward3_streamtitle", "event_bruwarreward3_streamdesc", "event_bruwarreward3_stream.png");
    }
}
