import * as as3 from "as3";
import { Vector, uint } from "as3";
import { BattletoadsEndMessage, BattletoadsPromoMessage1, BattletoadsPromoMessage2, BattletoadsPromoMessage3, BattletoadsRewardMessage, BattletoadsStartMessage, GLOBAL, RewardHandler, RewardLibrary, UnblockVorgReward, UnlockVorgReward, YardCrawl, com_monsters_frontPage_messages_Message as Message } from "@game";

export class Battletoads extends YardCrawl {
    static {
        as3.fields(this, { _MONSTER_REWARD_ID: "C16" });
    }

    public static readonly ID: uint = 1;
    private _MONSTER_REWARD_ID: string;

    public $ctor(): void {
        this._name = "Creature Carnage";
        this._originalStartDate = 0;
        this._id = Battletoads.ID;
        this._progress = -1;
        this._priority = 100;
        this._yardsToDestroy = 10;
        this._titleImage = "events/creatureCarnage/creatureCarnage_logo.v3.png";
        this._imageURL = "events/creatureCarnage/creatureCarnage_event.v3.png";
        this._messages = Vector.from([new BattletoadsPromoMessage1(), new BattletoadsPromoMessage2(), new BattletoadsPromoMessage3(), new BattletoadsStartMessage(), new BattletoadsEndMessage()], Message);
        this._rewardMessage = new BattletoadsRewardMessage();
        super.$ctor();
    }

    public override doesQualify(): boolean {
        let _loc1_: uint = GLOBAL.townHall._lvl.Get() >>> 0;
        return _loc1_ >= 2 && _loc1_ <= 4;
    }

    public doesAutomaticalyGetReward(): boolean {
        return Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= 5 && !this.startDate;
    }

    protected override onImport(): void {
        if (this.doesAutomaticalyGetReward()) {
            RewardHandler.instance.addAndApplyReward(RewardLibrary.getRewardByID(UnblockVorgReward.ID));
        }
    }

    protected override onEventComplete(): void {
        RewardHandler.instance.addAndApplyReward(RewardLibrary.getRewardByID(UnlockVorgReward.ID));
    }
}
