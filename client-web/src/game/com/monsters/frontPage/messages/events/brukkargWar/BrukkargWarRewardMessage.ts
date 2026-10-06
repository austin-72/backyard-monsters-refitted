import * as as3 from "as3";
import { GLOBAL, KeywordMessage, POPUPS } from "@game";

export class BrukkargWarRewardMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarreward3", "btn_brag");
    }

    public override get areRequirementsMet(): boolean {
        return false;
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        GLOBAL.Brag("event5-reward", "event_bruwarreward3_streamtitle", "event_bruwarreward3_streamdesc", "event_bruwarreward3_stream.png");
    }
}
