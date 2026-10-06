import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { RewardLayerMask, RewardRibbon } from "@game";

export class EventRewardRibbon extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "EventRewardRibbon" });
        as3.fields(this, { rewardLayerMask1: null, rewardRibbon0: null, rewardImage0: null });
    }

    public rewardLayerMask1: RewardLayerMask;
    public rewardRibbon0: RewardRibbon;
    public rewardImage0: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
