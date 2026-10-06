import * as as3 from "as3";
import { AttackDefend, ReplayableEventQuota, RewardHandler, SpurtzCannonReward1, SpurtzCannonReward2, SpurtzCannonRewardMessage2 } from "@game";

export class SpurtzCannonQuota2 extends ReplayableEventQuota {
    public $ctor(): void {
        super.$ctor(AttackDefend.SCORE_PER_YARD * 4, "events/brukkargWar/brukkarg_reward_2.png", SpurtzCannonReward2.ID, new SpurtzCannonRewardMessage2());
    }

    public override metQuota(): void {
        super.metQuota();
        RewardHandler.instance.removeRewardByID(SpurtzCannonReward1.ID);
    }
}
