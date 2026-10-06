import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Event } from "flash/events";
import { AttackDefend, BASE, BFOUNDATION, GLOBAL, InstanceManager, KEYS, LOGGER, ReplayableEvent, SOUNDS, UI2, WMATTACK, WaveObj } from "@game";

export class MonsterInvasion extends ReplayableEvent {
    static {
        as3.fields(this, { _currentAttackers: null, _retreatAllMonsters: false, _randDir: 0, _wavesTotal: 0, _wavesDestroyed: 0, _waitTimer: 0, _internalWaveIndex: 0, _curSend: null, _isActive: false, _numAttempts: 0, _saveTimer: 0 });
    }

    protected static readonly TYPE_CREEP: int = 0;

    protected static readonly TYPE_GUARDIAN: int = 1;
    protected _currentAttackers: any[];
    protected _retreatAllMonsters: boolean;
    protected _randDir: int;
    protected _wavesTotal: uint;
    protected _wavesDestroyed: uint;
    protected _waitTimer: int;
    protected _internalWaveIndex: int;
    protected _curSend: any[];
    protected _isActive: boolean;
    protected _numAttempts: int;
    private _saveTimer: int;

    public $ctor(param1: any /* uint */ = 0): void {
        this._currentAttackers = new Array();
        this._curSend = [];
        super.$ctor();
        this._wavesTotal = param1;
    }

    public override set score(param1: number) {
        super.score = param1;
        this._wavesDestroyed = param1 >>> 0;
        this.progress = this._wavesDestroyed / this._wavesTotal;
    }

    protected set wavesDestroyed(param1: uint) {
        this._wavesDestroyed = param1;
        this.progress = this._wavesDestroyed / this._wavesTotal;
    }

    protected endWave(): void {
        let _loc3_: int = 0;
        let _loc5_: BFOUNDATION = null;
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc5_ of (_loc4_ ?? [])) {
            if (!(_loc5_._class == "trap" && _loc5_._fired || _loc5_._type == 53 && _loc5_._expireTime < GLOBAL.Timestamp())) {
                if (_loc5_._class != "wall") {
                    _loc1_ = (_loc1_ + _loc5_.health) | 0;
                    _loc2_ = (_loc2_ + _loc5_.maxHealth) | 0;
                }
            }
        }
        _loc3_ = (100 - 100 / _loc2_ * _loc1_) | 0;
        if (_loc3_ < 90) {
            LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Wave_Num_" + this._wavesDestroyed, "value": this._numAttempts }, "Attack_Success");
            if (this._score < 0) {
                this._score = 0;
            }
            this.score = this._score + 1;
            this._numAttempts = 0;
        } else {
            LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Wave_Num_" + this._wavesDestroyed, "value": this._numAttempts }, "Attack_Failed");
        }
        this.cleanupWave();
        WMATTACK.CleanUpLite();
    }

    public override exportData(): any {
        let _loc1_: any = super.exportData();
        _loc1_["_wavesDestroyed"] = this._wavesDestroyed;
        _loc1_["_numAttempts"] = this._numAttempts;
        return _loc1_;
    }

    public override importData(param1: any): void {
        super.importData(param1);
        this.wavesDestroyed = param1["_wavesDestroyed"] >>> 0;
        this._numAttempts = param1["_numAttempts"] | 0;
    }

    public override update(): void {
        if (!this._isActive) {
            return;
        }
        ++this._saveTimer;
        if (!(this._saveTimer % 120)) {
            BASE.Save(0, false, true);
        }
        if (this._waitTimer) {
            --this._waitTimer;
        } else {
            this.sendWave();
        }
    }

    protected setupNextWave(): void {
        let _loc1_: any[] = null;
        if (!WMATTACK._inProgress && this.progress < 1) {
            this._isActive = true;
            _loc1_ = this.getWaveArray();
            this._curSend = as3.cast(_loc1_[this._wavesDestroyed % _loc1_.length], Array);
            this._internalWaveIndex = 0;
            this._randDir = (Math.random() * 360) | 0;
            this._currentAttackers = [];
        }
    }

    protected sendWave(): void {
        let _loc1_: any[] = null;
        let _loc2_: any = undefined;
        let _loc3_: int = 0;
        if (this._internalWaveIndex >= this._curSend.length) {
            return;
        }
        _loc1_ = [];
        this._internalWaveIndex;
        while (this._internalWaveIndex < this._curSend.length && !this._waitTimer) {
            if (!(as3.is(this._curSend[this._internalWaveIndex], Number))) {
                _loc1_ = _loc1_.concat(WMATTACK.SpawnWave(as3.cast(this._curSend[this._internalWaveIndex], WaveObj), this._randDir));
            } else {
                this._waitTimer = (this._curSend[this._internalWaveIndex] * 20) | 0;
            }
            ++this._internalWaveIndex;
        }
        this._currentAttackers = this._currentAttackers.concat(_loc1_);
        this.postSend();
    }

    private postSend(): void {
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicipanic");
        } else {
            SOUNDS.PlayMusic("musicpanic");
        }
        WMATTACK.AttackB();
        WMATTACK.AttackC();
        BASE._blockSave = false;
        UI2.Show("surrender");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", as3.bind(this, this.Surrender));
        }
        WMATTACK.setEnd(as3.bind(this, this.endWave));
        WMATTACK._isAI = false;
        WMATTACK._inProgress = true;
    }

    private cleanupWave(): void {
        this._isActive = false;
        this._curSend = [];
        this._internalWaveIndex = 0;
        this._currentAttackers = [];
        WMATTACK.setEnd();
    }

    public Surrender(param1: Event): void {
        let _loc2_: any[] = null;
        let _loc3_: uint = 0;
        this._retreatAllMonsters = true;
        for (_loc2_ of as3.values(this._currentAttackers)) {
            _loc3_ = 0;
            while (_loc3_ < _loc2_.length) {
                _loc2_[_loc3_].changeModeRetreat();
                _loc3_++;
            }
        }
        this.cleanupWave();
        WMATTACK.CleanUpLite();
        LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Wave_Num_" + this._wavesDestroyed, "value": this._numAttempts }, "Attack_Surrender");
    }

    protected StartRepairs(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing == 0) {
                _loc2_.Repair();
            }
        }
    }

    protected override onInitialize(): void {
        super.onInitialize();
        if (this instanceof AttackDefend === false) {
            this.score = this._wavesDestroyed;
        }
        WMATTACK.enabled = false;
        this._isActive = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            this._buttonCopy = KEYS.Get("btn_next");
        } else {
            this._buttonCopy = null;
        }
    }

    protected getWaveArray(): any[] {
        return null;
    }

    public override pressedActionButton(): void {
        this.setupNextWave();
        ++this._numAttempts;
        LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Wave_Num_" + this._wavesDestroyed, "value": this._numAttempts }, "Attack_Start");
    }

    protected override onEventComplete(): void {
    }

    public override reset(): void {
        super.reset();
        this._numAttempts = 0;
        this._wavesDestroyed = 0;
    }

    public override get score(): number {
        return super.score;
    }
}
