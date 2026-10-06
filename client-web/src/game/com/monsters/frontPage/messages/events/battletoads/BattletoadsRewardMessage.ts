import * as as3 from "as3";
import { GLOBAL, KEYS, KeywordMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class BattletoadsRewardMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event1reward", "btn_brag");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event1reward.v2.jpg";
    }

    public override get areRequirementsMet(): boolean {
        return false;
    }

    protected override onButtonClick(): void {
        GLOBAL.CallJS("sendFeed", ["event1-reward", KEYS.Get("event1reward_streamtitle"), KEYS.Get("event1reward_streambody"), "event1reward_stream.png"]);
    }
}
