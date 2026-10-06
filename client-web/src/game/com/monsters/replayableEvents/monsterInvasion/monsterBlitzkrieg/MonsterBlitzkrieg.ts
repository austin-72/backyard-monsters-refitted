import * as as3 from "as3";
import { Vector, uint } from "as3";
import { GLOBAL, MonsterBlitzkriegEndMessage, MonsterBlitzkriegPromoMessage1, MonsterBlitzkriegPromoMessage2, MonsterBlitzkriegPromoMessage3, MonsterBlitzkriegRewardMessage, MonsterBlitzkriegStartMessage, MonsterInvasion, RewardHandler, RewardLibrary, UnblockSlimeattikusReward, UnlockSlimeattikusReward, WaveObj, com_monsters_frontPage_messages_Message as Message } from "@game";

export class MonsterBlitzkrieg extends MonsterInvasion {
    static {
        as3.fields(this, { _WAVES_TOTAL: 10, _CREATURE_REWARD_ID: "C17" });
    }

    private static WAVES: any[]; // const

    static {
        as3.lazyStatics(this, { WAVES: null }, () => {
            MonsterBlitzkrieg.WAVES = [[new WaveObj("C2", "bounce", 8, WaveObj.DIR.N | 0, 0, 0, true)], [new WaveObj("C2", "bounce", 10, WaveObj.DIR.N | 0, 0, 0, true), 1, new WaveObj("C3", "bounce", 5, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C2", "bounce", 5, WaveObj.DIR.N | 0, 0, 0, true), 1, new WaveObj("C1", "bounce", 10, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C1", "bounce", 20, WaveObj.DIR.N | 0, 0, 0, true), 1, new WaveObj("C3", "bounce", 15, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C17", "bounce", 3, WaveObj.DIR.N | 0, 0, 0, true), new WaveObj("C4", "bounce", 5, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C2", "bounce", 6, WaveObj.DIR.N | 0, 0, 0, true), 2, new WaveObj("C4", "bounce", 8, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C6", "bounce", 10, WaveObj.DIR.N | 0, 0, 0, true), 5, new WaveObj("C3", "bounce", 50, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C1", "bounce", 40, WaveObj.DIR.N | 0, 0, 0, true), 2, new WaveObj("C4", "bounce", 8, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C2", "bounce", 10, WaveObj.DIR.N | 0, 0, 0, true), 1, new WaveObj("C1", "bounce", 10, WaveObj.DIR.N | 0, 0, 0), new WaveObj("C4", "bounce", 10, WaveObj.DIR.N | 0, 0, 0), 5, new WaveObj("C3", "bounce", 10, WaveObj.DIR.N | 0, 0, 0)], [new WaveObj("C17", "bounce", 8, WaveObj.DIR.N | 0, 0, 0, true)]];
        });
    }
    private _WAVES_TOTAL: uint;
    private _CREATURE_REWARD_ID: string;

    public $ctor(): void {
        this._name = "Monster Blitzkrieg";
        this._originalStartDate = 0;
        this._progress = -1;
        this._priority = 200;
        this._id = 2;
        this._titleImage = "events/monblitz/monblitz_logo.v3.png";
        this._imageURL = "events/monblitz/monblitz_event.png";
        this._messages = Vector.from([new MonsterBlitzkriegPromoMessage1(), new MonsterBlitzkriegPromoMessage2(), new MonsterBlitzkriegPromoMessage3(), new MonsterBlitzkriegStartMessage(), new MonsterBlitzkriegEndMessage()], Message);
        this._wavesTotal = this._WAVES_TOTAL;
        this._rewardMessage = new MonsterBlitzkriegRewardMessage();
        super.$ctor(this._WAVES_TOTAL);
    }

    protected override getWaveArray(): any[] {
        return MonsterBlitzkrieg.WAVES;
    }

    public override doesQualify(): boolean {
        let _loc1_: uint = GLOBAL.townHall._lvl.Get() >>> 0;
        return _loc1_ >= 3 && _loc1_ <= 4;
    }

    protected override onEventComplete(): void {
        RewardHandler.instance.addAndApplyReward(RewardLibrary.getRewardByID(UnlockSlimeattikusReward.ID));
    }

    public doesAutomaticalyGetReward(): boolean {
        return Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= 5 && !this.startDate;
    }

    protected override onImport(): void {
        if (this.doesAutomaticalyGetReward()) {
            RewardHandler.instance.addAndApplyReward(RewardLibrary.getRewardByID(UnblockSlimeattikusReward.ID));
        }
    }
}
