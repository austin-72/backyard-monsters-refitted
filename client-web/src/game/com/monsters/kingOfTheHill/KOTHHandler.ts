import * as as3 from "as3";
import { ASObject, Class, Vector, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { AttackEvent, BASE, BuildingEvent, CHAMPIONCAGE, CHAMPIONCAGEPOPUP, CREATURES, FrontPageGraphic, GLOBAL, IHandler, KOTHEndMessage, KOTHHUDGraphic, KOTHQuota1MetMessage, KOTHQuota2MetMessage, KOTHRewardMessage, KingOfTheHill, KrallenAtRiskMessage, KrallenBuffReward, KrallenReward, KrallenWinSoonMessage, LOGGER, POPUPS, ReplayableEventHandler, Reward, RewardHandler, RewardLibrary, TUTORIAL, UI2, com_monsters_frontPage_messages_Message as Message } from "@game";

export class KOTHHandler extends ASObject implements IHandler {
    static {
        as3.implement(this, [IHandler]);
        as3.fields(this, { k_CONSECUTIVE_WINS_TO_PERMAKRALLEN: 5, _WARNING_DURATION: 86400, _LAST_LOOT_SCORE_LABEL: "lastKOTHScore", _LAST_TIER_LABEL: "lastKOTHTier", _lootingDuration: 604800, _lootThresholds: null, _tierChangeMessages: null, _lootChangeMessages: null, _wins: 0, _totalLoot: NaN, _timeToReset: 0, _tier: 0, _hudGraphic: null, _lastShownTier: 0 });
    }

    private static _instance: KOTHHandler = null;
    private k_CONSECUTIVE_WINS_TO_PERMAKRALLEN: int;
    private _WARNING_DURATION: uint;
    private _LAST_LOOT_SCORE_LABEL: string;
    private _LAST_TIER_LABEL: string;
    private _lootingDuration: uint;
    private _lootThresholds: Vector<uint>;
    private _tierChangeMessages: Vector<any>;
    private _lootChangeMessages: Vector<any>;
    private _wins: uint;
    private _totalLoot: number;
    private _timeToReset: uint;
    private _tier: uint;
    private _hudGraphic: KOTHHUDGraphic;
    private _lastShownTier: uint;

    public $ctor(): void {
        this._lootThresholds = new Vector<uint>(0, false, uint);
        this._tierChangeMessages = Vector.from([KOTHQuota1MetMessage, KOTHQuota2MetMessage], Class);
        this._lootChangeMessages = Vector.from([KOTHQuota1MetMessage, KOTHQuota2MetMessage], Class);
        super.$ctor();
    }

    public static get instance(): KOTHHandler {
        if (!KOTHHandler._instance) {
            KOTHHandler._instance = new KOTHHandler();
        }
        return KOTHHandler._instance;
    }

    public initialize(param1: any = null): void {
        // King of the Hill (the Krallen event) is an overworld feature: it hands out a champion, and the
        // Inferno has no champion cage. Inferno yards never ran it; an inferno-only main yard must not either.
        if (GLOBAL.INFERNO_ONLY || !GLOBAL._flags[this.name] || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard) {
            return;
        }
        if (param1) {
            this.importData(param1);
        }
        as3.vsetLength(this._lootThresholds, 0);
        if (this.hasWonPermanantly) {
            this._lootThresholds.push(GLOBAL._flags["krallen_special1_award_threshold"] - GLOBAL._flags["krallen_award_threshold"]);
        } else {
            this._lootThresholds.push(GLOBAL._flags["krallen_special1_award_threshold"]);
        }
        this._lootThresholds.push(GLOBAL._flags["krallen_award_threshold"]);
        this._lootThresholds.push(0);
        this._lootingDuration = (GLOBAL._flags["krallen_duration"] * 86400) >>> 0;
        if (this.doesQualify) {
            CHAMPIONCAGEPOPUP._kothEnabled = true;
        }
        GLOBAL.eventDispatcher.addEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.endedAttack));
        this.updtateEvent();
        this.checkWarnings();
        this.checkEventReset();
        this.checkQuotaPopups();
        this.updateRewards();
        this.addHUDGraphic();
    }

    private checkEventReset(): void {
        let _loc2_: Message = null;
        let _loc1_: number = GLOBAL.StatGet(this._LAST_LOOT_SCORE_LABEL);
        if (this._totalLoot < _loc1_) {
            if (this._wins) {
                if (!this.hasWonPermanantly) {
                    _loc2_ = new KOTHRewardMessage(this._wins > 1);
                }
            } else {
                _loc2_ = new KOTHEndMessage(GLOBAL.StatGet(this._LAST_TIER_LABEL) >= 1);
            }
            if (_loc2_) {
                POPUPS.Push(new FrontPageGraphic(_loc2_));
            }
        }
    }

    private checkQuotaPopups(): void {
        let _loc3_: Message = null;
        let _loc1_: uint = this._lastShownTier;
        let _loc2_: uint = this.getTier(this._totalLoot);
        if (_loc2_ > _loc1_ && _loc2_ <= this._lootChangeMessages.length) {
            _loc3_ = as3.cast(new (as3.vget(this._lootChangeMessages, _loc2_ - 1))(), Message);
            POPUPS.Push(new FrontPageGraphic(_loc3_));
            this._lastShownTier = _loc2_;
        }
    }

    protected endedAttack(param1: AttackEvent): void {
        let _loc2_: any = param1.loot;
        let _loc3_: uint = (_loc2_.r1.Get() + _loc2_.r2.Get() + _loc2_.r3.Get() + _loc2_.r4.Get()) >>> 0;
        LOGGER.StatB({ "st1": "KOTH", "value": _loc3_.toString() }, "Loot");
    }

    protected destroyedMaproom(param1: BuildingEvent): void {
        CHAMPIONCAGEPOPUP._kothEnabled = false;
        let _loc2_: any = {};
        _loc2_.tier = 0;
        _loc2_.wins = 0;
        _loc2_.loot = 0;
        _loc2_.countdown = 0;
        this.initialize(_loc2_);
    }

    private checkWarnings(): void {
        if (this._timeToReset <= this._WARNING_DURATION) {
            if (this._tier && this._totalLoot < this.minimumLootRequiredToUnlockKrallen() && !this.hasWonPermanantly) {
                POPUPS.Push(new FrontPageGraphic(new KrallenAtRiskMessage()));
            } else if (!this._tier && this._totalLoot >= this.minimumLootRequiredToUnlockKrallen() * 0.9) {
                POPUPS.Push(new FrontPageGraphic(new KrallenWinSoonMessage()));
            }
        }
    }

    private updtateEvent(): void {
        let _loc1_: KingOfTheHill = null;
        if (Boolean(ReplayableEventHandler.activeEvent) && ReplayableEventHandler.activeEvent instanceof KingOfTheHill) {
            _loc1_ = as3.as(ReplayableEventHandler.activeEvent, KingOfTheHill);
            _loc1_.score = this._totalLoot;
        }
    }

    private updateRewards(): void {
        this.updateReward(KrallenReward.ID, this.tier, true);
        this.updateReward(KrallenBuffReward.ID, this._wins);
    }

    private updateReward(param1: string, param2: number, param3: boolean = false): void {
        let _loc4_: Reward = null;
        _loc4_ = RewardHandler.instance.getRewardByID(param1);
        if (_loc4_) {
            if (!param2) {
                RewardHandler.instance.removeReward(_loc4_);
                _loc4_ = null;
                if (param3) {
                    LOGGER.StatB({ "st1": "KOTH", "st2": "Champion", "st3": "Removed" }, this.tier + "_" + (this.wins - 1));
                }
            }
        } else if (param2) {
            _loc4_ = RewardLibrary.getRewardByID(param1);
            if (param3) {
                LOGGER.StatB({ "st1": "KOTH", "st2": "Champion", "st3": "Awarded" }, this.tier + "_" + (this.wins - 1));
            }
        }
        if (_loc4_) {
            RewardHandler.instance.addReward(_loc4_);
            _loc4_.value = param2;
            RewardHandler.instance.applyReward(_loc4_);
        }
    }

    private addHUDGraphic(): void {
        let _loc1_: uint = 0;
        if (!this.doesQualify || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard) {
            return;
        }
        if (CREATURES._krallen) {
            _loc1_ = CREATURES._krallen._level.Get() >>> 0;
        }
        this._hudGraphic = new KOTHHUDGraphic(Boolean(this.tier), _loc1_);
        UI2._top.addIcon(this._hudGraphic);
        this._hudGraphic.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedHUDGraphic));
    }

    private removeHUDGraphic(): void {
        if (!this._hudGraphic) {
            return;
        }
        UI2._top.removeIcon(this._hudGraphic);
        this._hudGraphic.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedHUDGraphic));
    }

    protected clickedHUDGraphic(param1: MouseEvent): void {
        CHAMPIONCAGE.ShowKrallenTab();
    }

    public get name(): string {
        return "krallen";
    }

    public importData(param1: any): void {
        this._tier = param1.tier >>> 0;
        this._wins = param1.wins >>> 0;
        this._totalLoot = Number(param1.loot);
        this._timeToReset = param1.countdown >>> 0;
        this._lastShownTier = (param1.lastShownTier || 0) >>> 0;
    }

    public minimumLootRequiredToUnlockKrallen(): uint {
        if (this._lootThresholds.length >= 2) {
            return as3.vget(this._lootThresholds, this._lootThresholds.length - 2);
        }
        return uint.MAX_VALUE;
    }

    public setDebugTimeToReset(param1: uint): void {
        this._timeToReset = param1;
        this.checkWarnings();
    }

    public get timePerRound(): uint {
        return this._lootingDuration;
    }

    public get timeEnd(): uint {
        return (ReplayableEventHandler.currentTime + this._timeToReset) >>> 0;
    }

    public get timeStart(): uint {
        return (this.timeEnd - this._lootingDuration) >>> 0;
    }

    public get doesQualify(): boolean {
        return TUTORIAL.hasFinished && Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= 6;
    }

    public exportData(): any {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard) {
            return null;
        }
        if (!this._tier && !this._wins && !this._totalLoot && !this._lastShownTier) {
            return null;
        }
        return { "tier": this._tier, "wins": this._wins, "loot": isNaN(this._totalLoot) ? 0 : this._totalLoot, "countdown": this._timeToReset, "lastShownTier": this._lastShownTier };
    }

    public get totalLoot(): number {
        return this._totalLoot;
    }

    public get timeToReset(): uint {
        return this._timeToReset;
    }

    public get wins(): uint {
        return this._wins;
    }

    public get hasWonPermanantly(): boolean {
        return this._wins >= this.k_CONSECUTIVE_WINS_TO_PERMAKRALLEN;
    }

    public get lootThresholds(): Vector<uint> {
        return this._lootThresholds;
    }

    public get tier(): uint {
        return this._tier;
    }

    public getTier(param1: number): uint {
        let _loc2_: int = 0;
        while (_loc2_ < this._lootThresholds.length) {
            if (param1 >= as3.vget(this._lootThresholds, _loc2_)) {
                return (this._lootThresholds.length - 1 - _loc2_) >>> 0;
            }
            _loc2_++;
        }
        return 0;
    }
}
