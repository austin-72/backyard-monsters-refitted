import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { AttackDefend, BASE, BrukkargWarEndMessage, BrukkargWarFinalAttackMessage, BrukkargWarFirstAttackMessage, BrukkargWarPromoMessage1, BrukkargWarPromoMessage2, BrukkargWarPromoMessage3, BrukkargWarRewardMessage, BrukkargWarStartMessage, IReplayableEventUI, KEYS, MultiRewardReplayableEventUI, ReplayableEventHandler, ReplayableEventQuota, ReplayableEventUI, SpurtzCannonQuota1, SpurtzCannonQuota2, SpurtzCannonQuota3, TRIBES, WaveObj, com_monsters_frontPage_messages_Message as Message } from "@game";

export class BrukkargWarEvent extends AttackDefend {
    static {
        as3.fields(this, { _BUILDING_REWARD_ID: "C17", _WAVES_TOTAL: 25 });
    }

    private static WAVES: any[]; // const

    static {
        as3.lazyStatics(this, { WAVES: null }, () => {
            BrukkargWarEvent.WAVES = [[new WaveObj("C2", "bounce", 50, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C6", "bounce", 50, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("IC1", "bounce", 20, WaveObj.DIR.N | 0, 6, 3, true), 3, new WaveObj("C5", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C5", "bounce", 10, WaveObj.DIR.S | 0, 6, 3)], [new WaveObj("C10", "bounce", 30, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C17", "bounce", 30, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C6", "bounce", 40, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C2", "bounce", 40, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C9", "bounce", 40, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C3", "bounce", 40, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("G1", "bounce", 1, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C16", "bounce", 10, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C8", "bounce", 40, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C16", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("C8", "bounce", 40, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C16", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), 4, new WaveObj("IC6", "bounce", 30, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C16", "bounce", 10, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C11", "bounce", 70, WaveObj.DIR.N | 0, 6, 3, true)], [new WaveObj("C7", "bounce", 30, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C10", "bounce", 30, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC4", "bounce", 20, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C12", "bounce", 5, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C6", "bounce", 10, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C5", "bounce", 8, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C5", "bounce", 8, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C5", "bounce", 8, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C5", "bounce", 8, WaveObj.DIR.W | 0, 6, 3), 5, new WaveObj("G5", "bounce", 3, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("G5", "bounce", 3, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C5", "bounce", 5, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C5", "bounce", 5, WaveObj.DIR.W | 0, 6, 3)], [new WaveObj("C17", "bounce", 25, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("IC1", "bounce", 25, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C1", "bounce", 25, WaveObj.DIR.N | 0, 6, 3), 30, new WaveObj("C17", "bounce", 25, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC1", "bounce", 25, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C1", "bounce", 25, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("IC4", "bounce", 20, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C13", "bounce", 30, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C6", "bounce", 50, WaveObj.DIR.N | 0, 6, 3, true), 2, new WaveObj("C3", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC7", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C16", "bounce", 20, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C5", "bounce", 6, WaveObj.DIR.N | 0, 6, 3, true), 1, new WaveObj("C9", "bounce", 50, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C15", "bounce", 1, WaveObj.DIR.N | 0, 6, 3), 1, new WaveObj("C5", "bounce", 6, WaveObj.DIR.N | 0, 6, 3), 1, new WaveObj("C3", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 1, WaveObj.DIR.N | 0, 6, 3), 1, new WaveObj("C5", "bounce", 6, WaveObj.DIR.N | 0, 6, 3), 1, new WaveObj("C12", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 1, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C5", "bounce", 6, WaveObj.DIR.N | 0, 6, 3), 1, new WaveObj("C5", "bounce", 6, WaveObj.DIR.S | 0, 6, 3), 1, new WaveObj("C5", "bounce", 6, WaveObj.DIR.E | 0, 6, 3), 1, new WaveObj("C5", "bounce", 6, WaveObj.DIR.W | 0, 6, 3), 1, new WaveObj("G2", "bounce", 1, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C15", "bounce", 5, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC2", "bounce", 40, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C11", "bounce", 20, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C12", "bounce", 1, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C16", "bounce", 5, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C11", "bounce", 20, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C12", "bounce", 1, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C16", "bounce", 5, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C11", "bounce", 20, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C12", "bounce", 1, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C16", "bounce", 5, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C11", "bounce", 20, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C12", "bounce", 1, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C16", "bounce", 5, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.W | 0, 6, 3)], [new WaveObj("C17", "bounce", 10, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C17", "bounce", 10, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C17", "bounce", 10, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C1", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C1", "bounce", 20, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C1", "bounce", 20, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C1", "bounce", 20, WaveObj.DIR.W | 0, 6, 3), new WaveObj("IC1", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC1", "bounce", 20, WaveObj.DIR.S | 0, 6, 3), new WaveObj("IC1", "bounce", 20, WaveObj.DIR.E | 0, 6, 3), new WaveObj("IC1", "bounce", 20, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C12", "bounce", 6, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C12", "bounce", 6, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C12", "bounce", 6, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C12", "bounce", 6, WaveObj.DIR.W | 0, 6, 3)], [new WaveObj("C5", "bounce", 20, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C7", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C8", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C10", "bounce", 60, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 5, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("IC4", "bounce", 40, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C14", "bounce", 50, WaveObj.DIR.N | 0, 6, 3), 5, new WaveObj("C16", "bounce", 5, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("G3", "bounce", 1, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C10", "bounce", 60, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C6", "bounce", 60, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C5", "bounce", 11, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C12", "bounce", 16, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C12", "bounce", 16, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C12", "bounce", 16, WaveObj.DIR.E | 0, 6, 3), new WaveObj("C12", "bounce", 16, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.W | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.E | 0, 6, 3)], [new WaveObj("C14", "bounce", 10, WaveObj.DIR.N | 0, 6, 3, true), 2, new WaveObj("IC5", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C14", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("C14", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("IC5", "bounce", 10, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("C14", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("IC5", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("C14", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), 2, new WaveObj("IC5", "bounce", 20, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("IC4", "bounce", 15, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C13", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC8", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), 30, new WaveObj("IC4", "bounce", 15, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C13", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), new WaveObj("IC8", "bounce", 15, WaveObj.DIR.N | 0, 6, 3)], [new WaveObj("C12", "bounce", 25, WaveObj.DIR.N | 0, 6, 3, true), new WaveObj("C12", "bounce", 25, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.S | 0, 6, 3), 10, new WaveObj("C12", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C12", "bounce", 15, WaveObj.DIR.S | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 2, WaveObj.DIR.S | 0, 6, 3)], [new WaveObj("C5", "bounce", 10, WaveObj.DIR.N | 0, 6, 3, true), 3, new WaveObj("C12", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C14", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 5, WaveObj.DIR.N | 0, 6, 3), 5, new WaveObj("G4", "bounce", 1, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 5, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C14", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C12", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), 30, new WaveObj("G4", "bounce", 1, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 5, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C14", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C12", "bounce", 15, WaveObj.DIR.N | 0, 6, 3), 10, new WaveObj("C12", "bounce", 20, WaveObj.DIR.N | 0, 6, 3), new WaveObj("C15", "bounce", 3, WaveObj.DIR.N | 0, 6, 3)]];
        });
    }
    private _BUILDING_REWARD_ID: string;
    private _WAVES_TOTAL: uint;

    public $ctor(): void {
        this._name = "Brukkarg War";
        this._progress = -1;
        this._priority = 500;
        this._id = 5;
        this._yardsToDestroy = 5;
        this._wavesTotal = this._WAVES_TOTAL;
        this._wavesBeforeAttack = 5;
        this._maxWaves = 25;
        this._titleImage = "events/brukkargWar/brukkarg_countdown_title_v2.png";
        this._imageURL = "events/brukkargWar/brukkarg_countdown_image_v2.png";
        this._messages = Vector.from([new BrukkargWarPromoMessage1(), new BrukkargWarPromoMessage2(), new BrukkargWarPromoMessage3(), new BrukkargWarStartMessage(), new BrukkargWarEndMessage()], Message);
        this._rewardMessage = new BrukkargWarRewardMessage();
        super.$ctor(this._WAVES_TOTAL);
        this._duration = 432000;
        this._originalStartDate = 1342724400;
        this.m_mustBeInsideBase = true;
        this._quotas.push(new SpurtzCannonQuota1());
        this._quotas.push(new SpurtzCannonQuota2());
        this._quotas.push(new SpurtzCannonQuota3());
        this._quotas.push(new ReplayableEventQuota(AttackDefend.SCORE_PER_WAVE * 5, null, null, new BrukkargWarFirstAttackMessage()));
        this._quotas.push(new ReplayableEventQuota(AttackDefend.SCORE_PER_YARD * 4 + AttackDefend.SCORE_PER_WAVE * 25, null, null, new BrukkargWarFinalAttackMessage()));
    }

    public override set score(param1: number) {
        super.score = param1;
        if (this._score == 4025 && this._intactBaseList && this._intactBaseList.length < 5) {
            ReplayableEventHandler.callServerMethod("copybase", [["eventid", 5]], as3.bind(this, this.copyBaseCallback));
        }
    }

    public override get imageURL(): string {
        return this.hasEventStarted ? "events/brukkargWar/brukkarg_running_image.png" : this._imageURL;
    }

    public override get titleImage(): string {
        return this.hasEventStarted ? "events/brukkargWar/brukkarg_logo.png" : this._titleImage;
    }

    public override get buttonCopy(): string {
        if (this.readyToAttackNextYard()) {
            this._buttonCopy = KEYS.Get("btn_attack");
        } else {
            this._buttonCopy = KEYS.Get("btn_next");
        }
        return this._buttonCopy;
    }

    public override createNewUI(): IReplayableEventUI {
        if (this.hasEventStarted) {
            return new MultiRewardReplayableEventUI();
        }
        return new ReplayableEventUI();
    }

    protected override onInitialize(): void {
        super.onInitialize();
    }

    public override pressedActionButton(): void {
        super.pressedActionButton();
    }

    protected override setupNextWave(): void {
        super.setupNextWave();
        if (this._score >= 4024) {
            ReplayableEventHandler.callServerMethod("copybase", [["eventid", 5]], as3.bind(this, this.copyBaseCallback));
        }
    }

    protected copyBaseCallback(param1: any): void {
        if ((as3.is(param1.baseid, int) || as3.is(param1.baseid, Number)) && this._intactBaseList.length < 5) {
            this._intactBaseList.push({ "id": param1.baseid, "destroyed": false, "level": 0 });
            TRIBES.B_IDS.push(param1.baseid);
            BASE.addEventBaseException(Number(param1.baseid));
        }
    }

    protected override getWaveArray(): any[] {
        return BrukkargWarEvent.WAVES;
    }

    public override doesQualify(): boolean {
        return false;
    }

    protected override loadedBaseList(param1: any): void {
        super.loadedBaseList(param1);
        if (this._score == 4025 && this._intactBaseList.length < 5) {
            ReplayableEventHandler.callServerMethod("copybase", [["eventid", 5]], as3.bind(this, this.copyBaseCallback));
        }
    }
}
