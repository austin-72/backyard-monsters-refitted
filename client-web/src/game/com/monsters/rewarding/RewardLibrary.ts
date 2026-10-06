import * as as3 from "as3";
import { ASObject } from "as3";
import { Console, DAVEStatueReward, ExtraTilesReward, GoldenDAVEReward, ImprovedHCCReward, KorathReward, KrallenBuffReward, KrallenReward, Reward, SpurtzCannonReward1, SpurtzCannonReward2, SpurtzCannonReward3, UnblockSlimeattikusReward, UnblockVorgReward, UnlockMagmaTowerInOutposts, UnlockRezghulReward, UnlockSlimeattikusReward, UnlockVorgReward, YardPlannerExtraSlotsReward } from "@game";

export class RewardLibrary extends ASObject {
    public static rewardTypes: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static initialize(): void {
        RewardLibrary.rewardTypes = {};
        RewardLibrary.addRewardType(UnlockVorgReward.ID, UnlockVorgReward);
        RewardLibrary.addRewardType(UnlockSlimeattikusReward.ID, UnlockSlimeattikusReward);
        RewardLibrary.addRewardType(UnblockSlimeattikusReward.ID, UnblockSlimeattikusReward);
        RewardLibrary.addRewardType(UnblockVorgReward.ID, UnblockVorgReward);
        RewardLibrary.addRewardType(UnlockMagmaTowerInOutposts.ID, UnlockMagmaTowerInOutposts);
        RewardLibrary.addRewardType(KrallenReward.ID, KrallenReward);
        RewardLibrary.addRewardType(KrallenBuffReward.ID, KrallenBuffReward);
        RewardLibrary.addRewardType(DAVEStatueReward.ID, DAVEStatueReward);
        RewardLibrary.addRewardType(ExtraTilesReward.ID, ExtraTilesReward);
        RewardLibrary.addRewardType(GoldenDAVEReward.ID, GoldenDAVEReward);
        RewardLibrary.addRewardType(ImprovedHCCReward.ID, ImprovedHCCReward);
        RewardLibrary.addRewardType(YardPlannerExtraSlotsReward.ID, YardPlannerExtraSlotsReward);
        RewardLibrary.addRewardType(SpurtzCannonReward1.ID, SpurtzCannonReward1);
        RewardLibrary.addRewardType(SpurtzCannonReward2.ID, SpurtzCannonReward2);
        RewardLibrary.addRewardType(SpurtzCannonReward3.ID, SpurtzCannonReward3);
        RewardLibrary.addRewardType(KorathReward.k_REWARD_ID, KorathReward);
        RewardLibrary.addRewardType(UnlockRezghulReward.k_REWARD_ID, UnlockRezghulReward);
    }

    public static addRewardType(param1: string, param2: any): void {
        if (RewardLibrary.rewardTypes[param1]) {
            Console.warning("You tried to add the reward(" + param1 + ") that already exists");
        }
        RewardLibrary.rewardTypes[param1] = param2;
    }

    public static getRewardByID(param1: string): Reward {
        let _loc3_: Reward = null;
        // RewardHandler.initialize() is what normally fills this table, and it is skipped in
        // Inferno yards. Anything else that asks for a reward must not crash on a null table.
        if (!RewardLibrary.rewardTypes) {
            RewardLibrary.initialize();
        }
        let _loc2_: any = RewardLibrary.rewardTypes[param1];
        if (_loc2_) {
            _loc3_ = as3.as(new _loc2_(), Reward);
            _loc3_.id = param1;
            return _loc3_;
        }
        return null;
    }
}
