import * as as3 from "as3";
import { AttackDefend, ReplayableEventQuota, RewardHandler, SpurtzCannonReward2, SpurtzCannonReward3, SpurtzCannonRewardMessage3 } from "@game";

export class SpurtzCannonQuota3 extends ReplayableEventQuota {
    public $ctor(): void {
        super.$ctor(AttackDefend.SCORE_PER_YARD * 5, "events/brukkargWar/brukkarg_reward_3.png", SpurtzCannonReward3.ID, new SpurtzCannonRewardMessage3());
    }

    public override metQuota(): void {
        super.metQuota();
        RewardHandler.instance.removeRewardByID(SpurtzCannonReward2.ID);
    }
}
