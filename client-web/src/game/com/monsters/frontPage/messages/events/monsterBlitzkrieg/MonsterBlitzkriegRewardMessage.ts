import * as as3 from "as3";
import { GLOBAL, KEYS, KeywordMessage, POPUPS, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkriegRewardMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event2reward", "btn_brag");
        this.imageURL = Message._IMAGE_DIRECTORY + "fp_event2start.v2.jpg";
    }

    public override get areRequirementsMet(): boolean {
        return false;
    }

    protected override onButtonClick(): void {
        GLOBAL.CallJS("sendFeed", ["event2-reward", KEYS.Get("event2reward_streamtitle"), KEYS.Get("event2reward_streambody"), "event2reward_stream.v2.png"]);
        POPUPS.Next();
    }
}
