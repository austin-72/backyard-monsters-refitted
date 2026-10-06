import { AttackDefend, ReplayableEventQuota, SpurtzCannonReward1, SpurtzCannonRewardMessage1 } from "@game";

export class SpurtzCannonQuota1 extends ReplayableEventQuota {
    public $ctor(): void {
        super.$ctor(AttackDefend.SCORE_PER_YARD * 3, "events/brukkargWar/brukkarg_reward_1.png", SpurtzCannonReward1.ID, new SpurtzCannonRewardMessage1());
    }
}
