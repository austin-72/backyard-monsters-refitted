import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { AttackEvent, BASE, CREATURES, GLOBAL, HOUSING, LOGGER, LOGIN, MapRoomManager, MonsterInvasion, ReplayableEventHandler, ReplayableEventQuota, TRIBES } from "@game";

export class AttackDefend extends MonsterInvasion {
    static {
        as3.fields(this, { _yardsToDestroy: 0, _yardsDestroyed: 0, _intactBaseList: null, _wavesBeforeAttack: 0, _maxWaves: 0 });
    }

    public static readonly SCORE_PER_WAVE: int = 1;

    public static readonly SCORE_PER_YARD: int = 1000;
    protected _yardsToDestroy: uint;
    protected _yardsDestroyed: uint;
    protected _intactBaseList: Vector<any>;
    protected _wavesBeforeAttack: uint;
    protected _maxWaves: uint;

    public $ctor(param1: uint = 0): void {
        super.$ctor(param1);
    }

    protected override set wavesDestroyed(param1: uint) {
    }

    protected set yardsDestroyed(param1: uint) {
    }

    public override set score(param1: number) {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: ReplayableEventQuota = null;
        if (this._score >= 0 && param1 - this._score > 0) {
            ReplayableEventHandler.callServerMethod("updatescore", [["eventid", this._id], ["delta", param1 - this._score]], as3.bind(this, this.verifyScoreFromServer));
        }
        this._score = param1;
        if (!this.m_mustBeInsideBase || this.m_mustBeInsideBase && GLOBAL.isAtHome() === true) {
            _loc2_ = this._quotas.length | 0;
            _loc3_ = 0;
            while (_loc3_ < _loc2_) {
                _loc4_ = as3.vget(this._quotas, _loc3_);
                if (this._score >= _loc4_.quota && !_loc4_.hasBeenAwarded) {
                    _loc4_.metQuota();
                }
                _loc3_++;
            }
        }
        this._yardsDestroyed = Math.floor(Math.max(this._score, 0) / AttackDefend.SCORE_PER_YARD) >>> 0;
        this._wavesDestroyed = (Math.max(this._score, 0) % AttackDefend.SCORE_PER_YARD) >>> 0;
        this.progress = (this._wavesDestroyed + this._yardsDestroyed) / (this._wavesTotal + this._yardsToDestroy);
    }

    protected override onInitialize(): void {
        super.onInitialize();
        ReplayableEventHandler.callServerMethod("loadbases", [["eventid", this._id]], as3.bind(this, this.loadedBaseList));
    }

    public override pressedActionButton(): void {
        let _loc1_: boolean = false;
        let _loc2_: string = null;
        let _loc3_: uint = 0;
        if (!this.readyToAttackNextYard()) {
            this.setupNextWave();
            ++this._numAttempts;
            LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Wave_Num_" + this._wavesDestroyed, "value": this._numAttempts }, "Attack_Start");
        } else if (Boolean(this._intactBaseList) && this._intactBaseList.length > 0) {
            _loc1_ = HOUSING._housingUsed.Get() > 0 || CREATURES._guardian != null;
            if (!GLOBAL._bMap || !GLOBAL._bFlinger || !GLOBAL._bFlinger._canFunction || !GLOBAL._bHousing || !_loc1_) {
                GLOBAL.Message("You need a working Maproom, Flinger, Housing and some monsters to participate in this next phase.");
                return;
            }
            if (MapRoomManager.instance.isInMapRoom2or3) {
                MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
                _loc2_ = GLOBAL._infBaseURL;
            }
            _loc3_ = as3.vget(this._intactBaseList, this._yardsDestroyed).id >>> 0;
            if (as3.vget(this._intactBaseList, this._yardsDestroyed).destroyed == true) {
            }
            LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Attack_Num_" + _loc3_, "value": _loc3_ }, "Attack_Start");
            GLOBAL.eventDispatcher.addEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.finishedAttack));
            BASE.LoadBase(_loc2_, LOGIN._playerID, _loc3_, "wmattack");
        } else if (this._wavesDestroyed >= this._maxWaves && this._yardsDestroyed >= this._yardsToDestroy) {
            this.progress = 1;
        }
    }

    protected finishedAttack(param1: AttackEvent): void {
        GLOBAL.eventDispatcher.removeEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.finishedAttack));
        if (param1.wasBaseDestroyed) {
            this.score = this._score + AttackDefend.SCORE_PER_YARD;
        }
    }

    protected override onEventComplete(): void {
    }

    public override importData(param1: any): void {
        super.importData(param1);
        this.yardsDestroyed = param1["_yardsDestroyed"] >>> 0;
        if (this._isActive) {
            ReplayableEventHandler.callServerMethod("geteventscore", [["eventid", this._id]], as3.bind(this, this.serverScoreCallback));
        }
    }

    public override exportData(): any {
        let _loc1_: any = super.exportData();
        _loc1_["_yardsDestroyed"] = this._yardsDestroyed;
        return _loc1_;
    }

    protected serverScoreCallback(param1: any): void {
        let _loc2_: int = param1.score | 0;
        if (_loc2_) {
            this._score = _loc2_;
            this.score = _loc2_;
        }
    }

    public override reset(): void {
        super.reset();
        this._numAttempts = 0;
        this._wavesDestroyed = 0;
    }

    protected loadedBaseList(param1: any): void {
        let _loc2_: any = null;
        this._intactBaseList = new Vector<any>(0, false, Object);
        for (_loc2_ of as3.values(param1)) {
            if (!(as3.is(_loc2_, Number))) {
                this._intactBaseList.push(_loc2_);
                BASE.addEventBaseException(Number(_loc2_.id));
                TRIBES.B_IDS.push(_loc2_.id);
            }
        }
    }

    protected override verifyScoreFromServer(param1: any): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        super.verifyScoreFromServer(param1);
        let _loc2_: number = as3.as(param1.score, Number);
        if (this._score != _loc2_ && (as3.is(param1.score, Number) || as3.is(param1.score, int))) {
            _loc3_ = 0;
            _loc4_ = Math.floor(_loc2_ / AttackDefend.SCORE_PER_YARD) | 0;
            _loc5_ = Math.floor(this._score / AttackDefend.SCORE_PER_YARD) | 0;
            _loc6_ = Math.floor(this._wavesDestroyed / this._wavesBeforeAttack) | 0;
            if (_loc4_ < this._yardsDestroyed && _loc5_ == this._yardsDestroyed && _loc5_ >= _loc6_ - 1) {
                _loc3_ = (_loc3_ + AttackDefend.SCORE_PER_YARD * (_loc5_ - _loc4_)) | 0;
            }
            _loc7_ = (_loc2_ % AttackDefend.SCORE_PER_YARD) | 0;
            if ((_loc8_ = (this._score % AttackDefend.SCORE_PER_YARD) | 0) > _loc7_) {
                _loc3_ = (_loc3_ + (_loc8_ - _loc7_)) | 0;
            }
            if (_loc3_ > 0) {
                ReplayableEventHandler.callServerMethod("updatescore", [["eventid", this._id], ["delta", _loc3_]], as3.bind(this, this.verifyScoreFromServer));
            }
        }
    }

    protected readyToAttackNextYard(): boolean {
        return Math.floor(this._wavesDestroyed / this._wavesBeforeAttack) > this._yardsDestroyed;
    }
}
