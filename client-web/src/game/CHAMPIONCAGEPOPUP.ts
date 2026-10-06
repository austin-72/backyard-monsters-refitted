import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip } from "flash/display";
import { MouseEvent, NetStatusEvent, TimerEvent } from "flash/events";
import { Video } from "flash/media";
import { NetStream } from "flash/net";
import { Timer } from "flash/utils";
import { BASE, CHAMPIONCAGE, CREATURELOCKER, CREATURES, ChampionBase, Circ, GLOBAL, GUARDIANCAGEPOPUP_CLIP, ImageCache, KEYS, KOTHHandler, POPUPS, POPUPSETTINGS, ReplayableEventHandler, TweenLite, VideoUtils, bubblepopupDownBuff } from "@game";

export class CHAMPIONCAGEPOPUP extends GUARDIANCAGEPOPUP_CLIP {
    static {
        as3.fields(this, { guard: null, guardType: 0, guardLevel: 0, guardID: null, foodBonus: 0, totalFeeds: NaN, currFeeds: NaN, koth: null, kothType: 0, kothLevel: 0, kothWins: 0, kothPowerLevel: 0, kothID: null, kothBonus: 0, kothAbilities: 0, kothTimeCurrent: NaN, kothTimeLeft: NaN, kothTimeStart: NaN, kothTimeEnd: NaN, kothTimeLength: 604800, kothLootCurrent: NaN, kothLootMax: NaN, kothLootThresholds: null, _timer: null, _videoStream: null, _currentVideoURL: null, _currentPreviewUrl: null, _kothPreviewURL: "monsters/G5_L6-150.png", _kothVideoURL: "assets/koth/Krallen_200x200.flv", _kothToolTip1: null, _kothToolTip2: null, _kothToolTipAbility1: null, _kothToolTipAbility2: null, _PREVIEW_WIDTH: 200, _PREVIEW_HEIGHT: 200, _DOES_PLAY_VIDEO: false, _KOTH_AWARD_GOAL: 1000000000, _KOTH_AWARD_ABILITY1: 1500000000, _KOTH_AWARD_ABILITY2: 2000000000 });
    }

    public static _page: int = 0;

    public static _kothEnabled: boolean = false;

    public static page1Assets: any[] = null;

    public static page2Assets: any[] = null;

    public static page3Assets: any[] = null;

    public static pagesArr: any[] = null;

    public static statsArr: any[] = null;

    public static buffsArr: any[] = null;

    public static kothStatsArr: any[] = null;

    public static kothArr0: any[] = null;

    public static kothArr1: any[] = null;

    public static kothArr2: any[] = null;

    public static feedIcons: any[] = null;

    private static statsStringsArr: any[] = null;

    private static buffsStringsArr: any[] = null;

    public static _maxSpeed: number = 4;

    public static _maxHealth: number = 250000;

    public static _maxDamage: number = 9600;

    public static _maxBuff: number = 100;

    public static _maxLevel: number = 6;

    public static _isFeed: boolean = false;

    public static _useBonusIndicators: boolean = false;

    public static _bCage: CHAMPIONCAGE = null;
    private guard: ChampionBase;
    private guardType: int;
    private guardLevel: int;
    private guardID: string;
    private foodBonus: int;
    private totalFeeds: number;
    private currFeeds: number;
    private koth: ChampionBase;
    private kothType: int;
    private kothLevel: int;
    private kothWins: int;
    private kothPowerLevel: int;
    private kothID: string;
    private kothBonus: int;
    private kothAbilities: int;
    public kothTimeCurrent: number;
    public kothTimeLeft: number;
    public kothTimeStart: number;
    public kothTimeEnd: number;
    public kothTimeLength: number;
    public kothLootCurrent: number;
    public kothLootMax: number;
    public kothLootThresholds: any[];
    private _timer: Timer;
    private _videoStream: NetStream;
    private _currentVideoURL: string;
    private _currentPreviewUrl: string;
    private _kothPreviewURL: string;
    private _kothVideoURL: string;
    private _kothToolTip1: DisplayObject;
    private _kothToolTip2: DisplayObject;
    private _kothToolTipAbility1: DisplayObject;
    private _kothToolTipAbility2: DisplayObject;
    private _PREVIEW_WIDTH: int;
    private _PREVIEW_HEIGHT: int;
    private _DOES_PLAY_VIDEO: boolean;
    private _KOTH_AWARD_GOAL: int;
    private _KOTH_AWARD_ABILITY1: int;
    private _KOTH_AWARD_ABILITY2: int;

    public $ctor(): void {
        this._timer = new Timer(1000);
        super.$ctor();
        this.tTitle.htmlText = KEYS.Get("gcage_title");
        CHAMPIONCAGEPOPUP._bCage = as3.as(GLOBAL._bCage, CHAMPIONCAGE);
        CHAMPIONCAGEPOPUP.page1Assets = [this.mcImage, this.tEvoStage, this.damage_txt, this.tDamage, this.bDamage, this.health_txt, this.tHealth, this.bHealth, this.speed_txt, this.tSpeed, this.bSpeed, this.buff_txt, this.tBuff, this.bBuff, this.tEvoDesc, this.tHP, this.barHP, this.bHeal];
        CHAMPIONCAGEPOPUP.page2Assets = [this.barDNA, this.barDNA_bg, this.barDNA_mask, this.mcCurrGuardian, this.mcNextGuardian, this.tNextFeed, this.tFeedsFrom, this.mcInstant, this.mcFeed1, this.mcFeed2, this.gFeedBG, this.bEvolve, this.bFeedTimer, this.tNextFeedTitle];
        CHAMPIONCAGEPOPUP.page3Assets = [this.p3_mcImage, this.p3_tDescription, this.p3_tDescription2, this.p3_tKothLevel, this.p3_gRankBG, this.p3_damage_txt, this.p3_health_txt, this.p3_speed_txt, this.p3_buff_txt, this.p3_abilities_txt, this.p3_tDamage, this.p3_tHealth, this.p3_tSpeed, this.p3_tBuff, this.p3_bDamage, this.p3_bHealth, this.p3_bSpeed, this.p3_bBuff, this.p3_mcAbility1, this.p3_bTimeleft, this.p3_tTimeleft, this.p3_tLootLeft, this.p3_bLootLeft, this.p3_bHP, this.p3_tHP, this.p3_bHeal, this.p3_mcLootMark1, this.p3_mcLootMark2, this.p3_timeleft_txt, this.p3_looted_txt];
        CHAMPIONCAGEPOPUP.pagesArr = [CHAMPIONCAGEPOPUP.page1Assets, CHAMPIONCAGEPOPUP.page2Assets, CHAMPIONCAGEPOPUP.page3Assets];
        CHAMPIONCAGEPOPUP.statsArr = [this.damage_txt, this.tDamage, this.bDamage, this.health_txt, this.tHealth, this.bHealth, this.speed_txt, this.tSpeed, this.bSpeed, this.buff_txt, this.tBuff, this.bBuff];
        CHAMPIONCAGEPOPUP.buffsArr = [this.damage_txt2, this.tDamage2, this.bDamage2, this.health_txt2, this.tHealth2, this.bHealth2, this.speed_txt2, this.tSpeed2, this.bSpeed2, this.buff_txt2, this.tBuff2, this.bBuff2, this.tBuffDesc, this.day1, this.day2, this.day3];
        CHAMPIONCAGEPOPUP.kothArr0 = [this.p3_mcImage, this.p3_tDescription, this.p3_gRankBG, this.p3_bTimeleft, this.p3_tTimeleft, this.p3_tLootLeft, this.p3_bLootLeft, this.p3_mcLootMark1, this.p3_mcLootMark2, this.p3_timeleft_txt, this.p3_looted_txt];
        CHAMPIONCAGEPOPUP.kothArr1 = [this.p3_tDescription2];
        CHAMPIONCAGEPOPUP.kothArr2 = [this.p3_tKothLevel, this.p3_damage_txt, this.p3_health_txt, this.p3_speed_txt, this.p3_buff_txt, this.p3_abilities_txt, this.p3_tDamage, this.p3_tHealth, this.p3_tSpeed, this.p3_tBuff, this.p3_bDamage, this.p3_bHealth, this.p3_bSpeed, this.p3_bBuff, this.p3_mcAbility1, this.p3_bHP, this.p3_tHP, this.p3_bHeal];
        CHAMPIONCAGEPOPUP.feedIcons = [this.mcFeed1, this.mcFeed2];
        CHAMPIONCAGEPOPUP.kothStatsArr = [this.p3_damage_txt, this.p3_health_txt, this.p3_speed_txt, this.p3_buff_txt, this.p3_abilities_txt, this.p3_tDamage, this.p3_tHealth, this.p3_tSpeed, this.p3_tBuff, this.p3_bDamage, this.p3_bHealth, this.p3_bSpeed, this.p3_bBuff, this.p3_mcAbility1];
        this.Setup(0);
        this.mcCurrGuardian.stop();
        this.mcNextGuardian.stop();
        this.kothLootThresholds = [];
        this.kothLootThresholds.push(as3.vget(KOTHHandler.instance.lootThresholds, 1) | 0);
        this.kothLootThresholds.push(as3.vget(KOTHHandler.instance.lootThresholds, 0) | 0);
        this.kothLootCurrent = 0;
        this.kothLootMax = Number(this.kothLootThresholds[this.kothLootThresholds.length - 1]);
        this.kothTimeEnd = KOTHHandler.instance.timeToReset + ReplayableEventHandler.currentTime;
        this.kothTimeStart = this.kothTimeEnd - KOTHHandler.instance.timePerRound;
        this.kothTimeLeft = this.kothTimeEnd - ReplayableEventHandler.currentTime;
    }

    public static FeedClick(param1: MouseEvent): void {
        CHAMPIONCAGEPOPUP._bCage.FeedGuardian(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, false);
        CHAMPIONCAGE.Hide(param1);
    }

    public Setup(param1: int = 0): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (GLOBAL._bCage) {
                this.UpdateVars();
                this.b1.SetupKey("btn_champion", false, 0, 0);
                this.b1.addEventListener(MouseEvent.CLICK, this.SwitchClick(0));
                this.b2.SetupKey("btn_evolution", false, 0, 0);
                if (this.guardLevel == 6) {
                    this.b2.SetupKey("btn_dailyfeed", false, 0, 0);
                }
                this.b2.addEventListener(MouseEvent.CLICK, this.SwitchClick(1));
                if (CHAMPIONCAGEPOPUP._kothEnabled) {
                    this.b3.SetupKey("btn_krallen");
                    this.b3.addEventListener(MouseEvent.CLICK, this.SwitchClick(2));
                } else {
                    this.b3.visible = false;
                    this.b3.mouseEnabled = false;
                }
                this.tTitle.mouseEnabled = this.tEvoStage.mouseEnabled = false;
                this._timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTick));
                this._timer.start();
                this.Switch(param1);
            } else {
                GLOBAL.Message(KEYS.Get("cage_notbuilt"));
            }
        }
    }

    public addKothListeners(): void {
        if (!this.p3_mcLootMark2.check.visible) {
            this.p3_mcLootMark2.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onOverKothTooltip));
            this.p3_mcLootMark2.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOutKothTooltip));
        }
        this.p3_bHeal.addEventListener(MouseEvent.CLICK, as3.bind(this, this.kothHealClick));
        this.p3_mcAbility1.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onKothAbilityOver));
        this.p3_mcAbility1.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onKothAbilityOut));
    }

    public removeKothListeners(): void {
        this.p3_mcLootMark1.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onOverKothTooltip));
        this.p3_mcLootMark2.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onOverKothTooltip));
        this.p3_mcLootMark1.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOutKothTooltip));
        this.p3_mcLootMark2.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOutKothTooltip));
        this.p3_bHeal.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.kothHealClick));
        this.p3_mcAbility1.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onKothAbilityOver));
        this.p3_mcAbility1.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onKothAbilityOut));
    }

    public onOverKothTooltip(param1: MouseEvent = null): void {
        this.addKothTooltip(as3.as(param1.target, MovieClip));
    }

    public onOutKothTooltip(param1: MouseEvent = null): void {
        this.removeKothTooltip(as3.as(param1.target, MovieClip));
    }

    public onKothAbilityOver(param1: MouseEvent = null): void {
        this.addKothAbilityTooltip(as3.as(param1.target, MovieClip));
    }

    public onKothAbilityOut(param1: MouseEvent = null): void {
        this.removeKothAbilityTooltip(as3.as(param1.target, MovieClip));
    }

    public addKothTooltip(param1: MovieClip): void {
        let _loc4_: MovieClip = null;
        let _loc5_: bubblepopupDownBuff = null;
        let _loc2_: string = "";
        let _loc3_: string = "";
        switch (param1) {
            case this.p3_mcLootMark1:
                _loc2_ = KEYS.Get("krallenquota1_tooltip", { "v1": GLOBAL.FormatNumber(Number(this.kothLootThresholds[0])) });
                _loc4_ = this.p3_mcLootMark1;
                break;
            case this.p3_mcLootMark2:
                _loc2_ = KEYS.Get("krallenquota2_tooltip", { "v1": GLOBAL.FormatNumber(Number(this.kothLootThresholds[1])) });
                _loc4_ = this.p3_mcLootMark2;
                break;
            default:
                return;
        }
        if (Boolean(this._kothToolTip1) || Boolean(this._kothToolTip2)) {
            this.removeKothTooltip(_loc4_);
        }
        _loc5_ = new bubblepopupDownBuff();
        if (_loc4_ == this.p3_mcLootMark1) {
            this._kothToolTip1 = this.addChild(_loc5_);
        }
        if (_loc4_ == this.p3_mcLootMark2) {
            this._kothToolTip2 = this.addChild(_loc5_);
        }
        _loc5_.Setup((_loc4_.x + _loc4_.width / 2) | 0, (_loc4_.y + _loc4_.height + 4) | 0, _loc2_, _loc3_);
        _loc5_.x = 0 + (_loc4_.x + _loc4_.width / 2) - 2;
        _loc5_.y = 0 + (_loc4_.y - _loc4_.height + 4);
        _loc5_.Resize(60);
    }

    public removeKothTooltip(param1: MovieClip = null): void {
        if (param1 == this.p3_mcLootMark1 && Boolean(this._kothToolTip1)) {
            this.removeChild(this._kothToolTip1);
            this._kothToolTip1 = null;
        } else if (param1 == this.p3_mcLootMark2 && Boolean(this._kothToolTip2)) {
            this.removeChild(this._kothToolTip2);
            this._kothToolTip2 = null;
        } else if (param1 == null) {
            if (this._kothToolTip1) {
                this.removeChild(this._kothToolTip1);
                this._kothToolTip1 = null;
            }
            if (this._kothToolTip2) {
                this.removeChild(this._kothToolTip2);
                this._kothToolTip2 = null;
            }
        }
    }

    public addKothAbilityTooltip(param1: MovieClip): void {
        let _loc4_: MovieClip = null;
        let _loc2_: string = "";
        let _loc3_: string = "";
        switch (param1) {
            case this.p3_mcAbility1:
                if (this.kothPowerLevel >= 2) {
                    _loc2_ = KEYS.Get("krallen_lootbuffactive_tooltip");
                } else {
                    _loc2_ = KEYS.Get("krallen_lootbuff_tooltip", { "v1": GLOBAL.FormatNumber(Number(this.kothLootThresholds[1])) });
                }
                _loc4_ = this.p3_mcAbility1;
                if (Boolean(this._kothToolTipAbility1) || Boolean(this._kothToolTipAbility2)) {
                    this.removeKothAbilityTooltip(_loc4_);
                }
                let _loc5_: bubblepopupDownBuff = new bubblepopupDownBuff();
                if (_loc4_ == this.p3_mcAbility1) {
                    this._kothToolTipAbility1 = this.addChild(_loc5_);
                }
                _loc5_.Setup((_loc4_.x + _loc4_.width / 2) | 0, (_loc4_.y + _loc4_.height + 4) | 0, _loc2_, _loc3_);
                _loc5_.x = 0 + (_loc4_.x + _loc4_.width / 2) - 2;
                _loc5_.y = 0 + (_loc4_.y - _loc4_.height / 4);
                return;
            default:
                return;
        }
    }

    public removeKothAbilityTooltip(param1: MovieClip = null): void {
        if (param1 == this.p3_mcAbility1 && Boolean(this._kothToolTipAbility1)) {
            this.removeChild(this._kothToolTipAbility1);
            this._kothToolTipAbility1 = null;
        } else if (param1 == null) {
            if (this._kothToolTipAbility1) {
                this.removeChild(this._kothToolTipAbility1);
                this._kothToolTipAbility1 = null;
            }
        }
    }

    public onTick(param1: TimerEvent): void {
        this.update();
    }

    public UpdateVars(): void {
        if (CREATURES._guardian) {
            this.guard = CREATURES._guardian;
            this.guardType = CREATURES._guardian._type;
            this.guardLevel = CREATURES._guardian._level.Get() | 0;
            this.foodBonus = CREATURES._guardian._foodBonus.Get() | 0;
            this.guardID = CREATURES._guardian._creatureID;
            this.totalFeeds = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "feedCount"));
            this.currFeeds = CREATURES._guardian._feeds.Get();
        }
        if (CREATURES._krallen) {
            this.koth = CREATURES._krallen;
            this.kothType = CREATURES._krallen._type;
            this.kothLevel = CREATURES._krallen._level.Get() | 0;
            this.kothWins = KOTHHandler.instance.wins;
            this.kothBonus = CREATURES._krallen._powerLevel.Get() | 0;
            this.kothPowerLevel = CREATURES._krallen._powerLevel.Get() | 0;
            this.kothID = CREATURES._krallen._creatureID;
        }
    }

    public Switch(param1: int = 0): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: any = false;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: int = 0;
        CHAMPIONCAGEPOPUP._page = param1;
        this.UpdateVars();
        this.mcInstant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
        this.mcInstant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.EvolveClick));
        this.bEvolve.removeEventListener(MouseEvent.CLICK, CHAMPIONCAGEPOPUP.FeedClick);
        this.bHeal.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.HealClick));
        let _loc2_: int = 0;
        while (_loc2_ < CHAMPIONCAGEPOPUP.pagesArr.length) {
            if (_loc2_ == param1) {
                _loc4_ = 0;
                while (_loc4_ < CHAMPIONCAGEPOPUP.pagesArr[_loc2_].length) {
                    CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc4_].visible = true;
                    if (CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc4_] instanceof MovieClip) {
                        CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc4_].enabled = true;
                    }
                    _loc4_++;
                }
            } else {
                _loc5_ = 0;
                while (_loc5_ < CHAMPIONCAGEPOPUP.pagesArr[_loc2_].length) {
                    CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc5_].visible = false;
                    if (CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc5_] instanceof MovieClip) {
                        CHAMPIONCAGEPOPUP.pagesArr[_loc2_][_loc5_].enabled = false;
                    }
                    _loc5_++;
                }
            }
            _loc2_++;
        }
        let _loc3_: int = 0;
        while (_loc3_ < CHAMPIONCAGEPOPUP.buffsArr.length) {
            CHAMPIONCAGEPOPUP.buffsArr[_loc3_].visible = false;
            if (CHAMPIONCAGEPOPUP.buffsArr[_loc3_] instanceof MovieClip) {
                CHAMPIONCAGEPOPUP.buffsArr[_loc3_].enabled = true;
            }
            _loc3_++;
        }
        _loc2_ = 1;
        while (_loc2_ <= 3) {
            this.bDamage["mcBuff" + _loc2_].width = 0;
            this.bHealth["mcBuff" + _loc2_].width = 0;
            this.bSpeed["mcBuff" + _loc2_].width = 0;
            this.bBuff["mcBuff" + _loc2_].width = 0;
            this.bDamage2["mcBuff" + _loc2_].width = 0;
            this.bHealth2["mcBuff" + _loc2_].width = 0;
            this.bSpeed2["mcBuff" + _loc2_].width = 0;
            this.bBuff2["mcBuff" + _loc2_].width = 0;
            this.p3_bDamage["mcBuff" + _loc2_].width = 0;
            this.p3_bHealth["mcBuff" + _loc2_].width = 0;
            this.p3_bSpeed["mcBuff" + _loc2_].width = 0;
            this.p3_bBuff["mcBuff" + _loc2_].width = 0;
            _loc2_++;
        }
        if (CREATURES._guardian) {
            if (param1 == 0) {
                this.UpdatePortrait();
                this.UpdateStats();
                this.bHeal.SetupKey("btn_healchampion", false, 0, 0);
                if (CREATURES._guardian.health >= CREATURES._guardian.maxHealth) {
                    this.bHeal.Enabled = false;
                    this.bHeal.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.HealClick));
                } else {
                    this.bHeal.Enabled = true;
                    this.bHeal.addEventListener(MouseEvent.CLICK, as3.bind(this, this.HealClick));
                }
            } else if (param1 == 1) {
                this.UpdateDNA();
                this.UpdateStats();
                _loc6_ = CREATURES._guardian._feedTime.Get() < GLOBAL.Timestamp();
                if (CREATURES._guardian._level.Get() < 6) {
                    this.tNextFeedTitle.x = -85;
                    this.tNextFeedTitle.width = 170;
                    this.tNextFeed.x = -80;
                    this.tNextFeed.width = 160;
                    this.bFeedTimer.x = -85;
                    this.bFeedTimer.width = 170;
                    if (_loc6_) {
                        this.mcInstant.visible = true;
                        this.mcInstant.enabled = true;
                        this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("gcage_instantFeed") + "</b>";
                        this.mcInstant.bAction.Highlight = false;
                        _loc7_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedShiny") | 0;
                        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": _loc7_ }), false, 0, 0);
                        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
                        this.bEvolve.SetupKey("btn_feednow", false, 0, 0);
                        this.bEvolve.visible = true;
                        this.bEvolve.Enabled = true;
                        this.bEvolve.Highlight = false;
                        this.bEvolve.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CantFeedClick));
                        this.bEvolve.addEventListener(MouseEvent.CLICK, CHAMPIONCAGEPOPUP.FeedClick);
                    } else {
                        this.mcInstant.visible = true;
                        this.mcInstant.enabled = true;
                        this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("gcage_instantEvolve") + "</b>";
                        this.mcInstant.bAction.Highlight = false;
                        this.mcInstant.bAction.Enabled = true;
                        _loc8_ = ((_loc8_ = ((_loc8_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedShiny") | 0) * 2) | 0) * (CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedCount") - CREATURES._guardian._feeds.Get())) | 0;
                        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": _loc8_ }), false, 0, 0);
                        this.mcInstant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
                        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.EvolveClick));
                        this.bEvolve.SetupKey("btn_feednow", false, 0, 0);
                        this.bEvolve.visible = true;
                        this.bEvolve.Enabled = false;
                        this.bEvolve.Highlight = false;
                        this.bEvolve.removeEventListener(MouseEvent.CLICK, CHAMPIONCAGEPOPUP.FeedClick);
                        this.bEvolve.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CantFeedClick));
                    }
                } else if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel) {
                    _loc4_ = 0;
                    while (_loc4_ < CHAMPIONCAGEPOPUP.buffsArr.length) {
                        CHAMPIONCAGEPOPUP.buffsArr[_loc4_].visible = true;
                        if (CHAMPIONCAGEPOPUP.buffsArr[_loc4_] instanceof MovieClip) {
                            CHAMPIONCAGEPOPUP.buffsArr[_loc4_].enabled = true;
                        }
                        _loc4_++;
                    }
                    this.tFeedsFrom.visible = false;
                    this.tFeedsFrom.htmlText = "<b>" + KEYS.Get("gcage_fullyEvolved") + "</b>";
                    this.tNextFeedTitle.x = -75;
                    this.tNextFeedTitle.width = 315;
                    this.tNextFeed.x = -70;
                    this.tNextFeed.width = 305;
                    this.bFeedTimer.x = -75;
                    this.bFeedTimer.width = 315;
                    this.tBuffDesc.htmlText = KEYS.Get("gcage_feedBuffDesc");
                    if (_loc6_) {
                        this.mcInstant.visible = true;
                        this.mcInstant.enabled = true;
                        this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("gcage_instantBuff") + "</b>";
                        this.mcInstant.bAction.Highlight = false;
                        this.mcInstant.bAction.Enabled = true;
                        _loc7_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusFeedShiny") | 0;
                        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": _loc7_ }), false, 0, 0);
                        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
                        this.bEvolve.SetupKey("btn_feednow", false, 0, 0);
                        this.bEvolve.visible = true;
                        this.bEvolve.Enabled = true;
                        this.bEvolve.Highlight = false;
                        this.bEvolve.addEventListener(MouseEvent.CLICK, CHAMPIONCAGEPOPUP.FeedClick);
                    } else {
                        this.mcInstant.visible = true;
                        this.mcInstant.enabled = true;
                        this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("gcage_instantBuffAdd") + "</b>";
                        this.mcInstant.bAction.Highlight = false;
                        this.mcInstant.bAction.Enabled = true;
                        _loc8_ = ((_loc8_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusFeedShiny") | 0) * 2) | 0;
                        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": _loc8_ }), false, 0, 0);
                        this.mcInstant.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
                        if (CREATURES._guardian._foodBonus.Get() >= 3) {
                            this.mcInstant.bAction.Enabled = false;
                            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CantInstantClick));
                        } else {
                            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.InstantClick));
                        }
                        this.bEvolve.SetupKey("btn_feednow", false, 0, 0);
                        this.bEvolve.visible = true;
                        this.bEvolve.Enabled = false;
                        this.bEvolve.Highlight = false;
                        this.bEvolve.removeEventListener(MouseEvent.CLICK, CHAMPIONCAGEPOPUP.FeedClick);
                        this.bEvolve.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CantFeedClick));
                    }
                    this.mcNextGuardian.visible = false;
                    this.barDNA.visible = false;
                    this.barDNA_bg.visible = false;
                } else {
                    this.bEvolve.visible = false;
                    this.mcInstant.visible = false;
                    this.mcFeed1.visible = false;
                    this.mcFeed2.visible = false;
                    this.mcNextGuardian.visible = false;
                    this.tNextFeed.visible = false;
                    this.barDNA.visible = false;
                    this.barDNA_bg.visible = false;
                    this.tFeedsFrom.htmlText = "<b>" + KEYS.Get("gcage_fullyEvolved") + "</b>";
                }
            }
        }
        if (param1 == 2) {
            _loc9_ = this.getKothThreshold(1);
            _loc10_ = this.getKothThreshold(2);
            this.UpdatePortrait();
            this.UpdateStats();
            _loc11_ = 0;
            _loc11_ = 0;
            while (_loc11_ < CHAMPIONCAGEPOPUP.page3Assets.length) {
                CHAMPIONCAGEPOPUP.page3Assets[_loc11_].visible = false;
                _loc11_++;
            }
            _loc11_ = 0;
            while (_loc11_ < CHAMPIONCAGEPOPUP.kothArr0.length) {
                CHAMPIONCAGEPOPUP.kothArr0[_loc11_].visible = true;
                _loc11_++;
            }
            if (!this.hasKoth()) {
                _loc11_ = 0;
                while (_loc11_ < CHAMPIONCAGEPOPUP.kothArr1.length) {
                    CHAMPIONCAGEPOPUP.kothArr1[_loc11_].visible = true;
                    _loc11_++;
                }
            } else {
                _loc11_ = 0;
                while (_loc11_ < CHAMPIONCAGEPOPUP.kothArr2.length) {
                    CHAMPIONCAGEPOPUP.kothArr2[_loc11_].visible = true;
                    _loc11_++;
                }
            }
            this.p3_looted_txt.htmlText = "<b>" + KEYS.Get("krallen_looted") + "</b>";
            this.p3_timeleft_txt.htmlText = "<b>" + KEYS.Get("krallen_remaining") + "</b>";
            this.p3_tDescription.htmlText = KEYS.Get("mon_krallendesc");
            this.p3_tDescription2.htmlText = KEYS.Get("krallen_desc");
            this.p3_mcLootMark1.visible = !KOTHHandler.instance.hasWonPermanantly;
            if (this.kothPowerLevel >= 2) {
                this.p3_mcAbility1.gotoAndStop("loot_on");
            } else {
                this.p3_mcAbility1.gotoAndStop("loot_off");
            }
            this.p3_tKothLevel.htmlText = "<b>" + KEYS.Get("mon_krallen_level", { "v1": this.kothLevel }) + "</b>";
            if (this.kothWins > 1) {
                this.p3_tKothLevel.htmlText += " " + KEYS.Get("mon_krallen_streak", { "v1": this.kothWins });
            }
            this.p3_bHeal.SetupKey("btn_healkrallen");
        }
        this.b1.Highlight = param1 == 0;
        this.b2.Highlight = param1 == 1;
        this.b3.Highlight = param1 == 2;
        this.window.gotoAndStop(param1 + 1);
        if (param1 == 2) {
            this.addKothListeners();
        } else {
            this.removeKothTooltip();
            this.removeKothAbilityTooltip();
            this.removeKothListeners();
        }
    }

    private hasKoth(): boolean {
        let _loc1_: boolean = false;
        let _loc2_: int = 0;
        while (_loc2_ < GLOBAL._playerGuardianData.length) {
            if (as3.vget(GLOBAL._playerGuardianData, _loc2_).t == 5) {
                _loc1_ = true;
            }
            _loc2_++;
        }
        return _loc1_;
    }

    private getKothThreshold(param1: int = 1): number {
        return this.kothLootThresholds[Math.min(Math.max(param1 - 1, 0), this.kothLootThresholds.length - 1)] | 0;
    }

    private addVideo(): void {
        let _loc1_: Video = new Video(this._PREVIEW_WIDTH, this._PREVIEW_HEIGHT);
        this._videoStream = VideoUtils.getVideoStream(_loc1_, this._kothVideoURL);
        VideoUtils.loopStream(this._videoStream);
        this.p3_mcImage.videoCanvas.addChild(_loc1_);
        _loc1_.x = 25;
        _loc1_.y = -20;
    }

    protected update(): void {
        if (CHAMPIONCAGEPOPUP._page == 2 && CHAMPIONCAGEPOPUP._kothEnabled) {
            if (this._DOES_PLAY_VIDEO) {
                if (this._currentVideoURL != this._kothVideoURL) {
                    if (this._videoStream) {
                        this._videoStream.close();
                    }
                    this._currentVideoURL = this._kothVideoURL;
                    this._videoStream.play(this._kothVideoURL);
                    this.p3_mcImage.videoCanvas.visible = true;
                    this.p3_mcImage.imageCanvas.visible = false;
                }
            } else if (this._currentPreviewUrl != this._kothPreviewURL) {
                this._currentPreviewUrl = this._kothPreviewURL;
                this.p3_mcImage.videoCanvas.visible = false;
                this.p3_mcImage.imageCanvas.visible = true;
                ImageCache.GetImageWithCallBack(this._kothPreviewURL, as3.bind(this, this.onPreviewImageLoaded), true, 1, "", [this.p3_mcImage.imageCanvas]);
            }
            this.UpdateStats();
            this.UpdatePortrait();
        }
    }

    private onPreviewImageLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc5_: Bitmap = null;
        if (param1 != this._currentPreviewUrl) {
            return;
        }
        let _loc4_: MovieClip = null;
        _loc4_ = as3.cast(param3[0], MovieClip);
        if (_loc4_) {
            while (_loc4_.numChildren > 0) {
                _loc4_.removeChildAt(0);
            }
            (_loc5_ = new Bitmap(param2)).x = 50;
            _loc4_.addChild(_loc5_);
            _loc4_.visible = true;
        }
    }

    protected onErrorLoadingVideo(param1: any): void {
    }

    private onStreamNetStatus(param1: NetStatusEvent): void {
        if (param1.info.code == "NetStream.Play.Stop") {
            this._videoStream.seek(0);
        }
    }

    private UpdatePortrait(): void {
        let UpdatePortraitIcon: Function = null;
        if (CREATURES._guardian) {
            UpdatePortraitIcon = (param1: string, param2: BitmapData): void => {
                this.mcImage.addChild(new Bitmap(param2));
            };
            if (this.mcImage) {
                while (this.mcImage.numChildren) {
                    this.mcImage.removeChildAt(0);
                }
            }
            ImageCache.GetImageWithCallBack("monsters/" + "G" + CREATURES._guardian._type + "_L" + CREATURES._guardian._level.Get() + "-250.png", UpdatePortraitIcon);
        }
        if (CHAMPIONCAGEPOPUP._page == 2 && CHAMPIONCAGEPOPUP._kothEnabled) {
            if (this._DOES_PLAY_VIDEO) {
                if (this._videoStream) {
                    if (this._currentVideoURL != this._kothVideoURL) {
                        if (this._videoStream) {
                            this._videoStream.close();
                        }
                        this._currentVideoURL = this._kothVideoURL;
                        this._videoStream.play(this._kothVideoURL);
                    }
                } else if (!this._currentVideoURL) {
                    this.addVideo();
                }
                this.p3_mcImage.videoCanvas.visible = true;
                this.p3_mcImage.imageCanvas.visible = false;
            } else if (this._currentPreviewUrl != this._kothPreviewURL) {
                this._currentPreviewUrl = this._kothPreviewURL;
                this.p3_mcImage.videoCanvas.visible = false;
                this.p3_mcImage.imageCanvas.visible = true;
                ImageCache.GetImageWithCallBack(this._kothPreviewURL, as3.bind(this, this.onPreviewImageLoaded), true, 1, "", [this.p3_mcImage.imageCanvas]);
            }
        }
    }

    private FeedIconLoaded(param1: string, param2: BitmapData): void {
        CHAMPIONCAGEPOPUP.feedIcons[0].mcImage.addChild(new Bitmap(param2));
        CHAMPIONCAGEPOPUP.feedIcons[0].mcImage.width = 30;
        CHAMPIONCAGEPOPUP.feedIcons[0].mcImage.height = 27;
    }

    private FeedIconLoaded2(param1: string, param2: BitmapData): void {
        CHAMPIONCAGEPOPUP.feedIcons[1].mcImage.addChild(new Bitmap(param2));
        CHAMPIONCAGEPOPUP.feedIcons[1].mcImage.width = 30;
        CHAMPIONCAGEPOPUP.feedIcons[1].mcImage.height = 27;
    }

    private UpdateDNA(): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc6_: any = null;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: int = 0;
        let _loc10_: string = null;
        let _loc11_: any = null;
        let _loc1_: int = 1;
        if (CREATURES._guardian) {
            if (this.mcCurrGuardian.numChildren == 0) {
                ImageCache.loadImageAndAddChild("monsters/" + "G" + CREATURES._guardian._type + "_L" + CREATURES._guardian._level.Get() + "-150.png", this.mcCurrGuardian);
                ImageCache.loadImageAndAddChild("monsters/" + "G" + CREATURES._guardian._type + "_L" + (CREATURES._guardian._level.Get() + 1) + "-150G.png", this.mcNextGuardian);
            }
            _loc2_ = -517;
            _loc3_ = 222;
            _loc4_ = this.currFeeds / this.totalFeeds;
            this.barDNA_mask.x = _loc2_ + _loc4_ * _loc3_;
            if ((_loc5_ = CREATURES._guardian._feedTime.Get() | 0) < GLOBAL.Timestamp()) {
                this.tNextFeedTitle.htmlText = "<b>" + KEYS.Get("gcage_hungry") + "</b>";
                this.tNextFeed.htmlText = GLOBAL.ToTime((_loc5_ + CHAMPIONCAGE.STARVETIMER - GLOBAL.Timestamp()) | 0);
            } else {
                this.tNextFeedTitle.htmlText = "<b>" + KEYS.Get("gcage_nextFeedIn") + "</b>";
                this.tNextFeed.htmlText = GLOBAL.ToTime((CREATURES._guardian._feedTime.Get() - GLOBAL.Timestamp()) | 0);
            }
            this.tFeedsFrom.htmlText = Math.max(0, this.totalFeeds - this.currFeeds) + KEYS.Get("gcage_feedsFromEvo");
            CHAMPIONCAGEPOPUP.feedIcons[0].visible = false;
            CHAMPIONCAGEPOPUP.feedIcons[1].visible = false;
            _loc6_ = CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "feeds");
            _loc7_ = 1;
            for (_loc8_ in _loc6_) {
                _loc9_ = _loc6_[_loc8_] | 0;
                _loc10_ = KEYS.Get(CREATURELOCKER.getShortCreatureName(_loc8_));
                _loc11_ = "monsters/" + _loc8_ + "-small.png";
                if (GLOBAL.player.monsterListByID(_loc8_) == null || GLOBAL.player.monsterListByID(_loc8_) && GLOBAL.player.monsterListByID(_loc8_).numHealthyHousedCreeps < _loc9_) {
                    CHAMPIONCAGEPOPUP.feedIcons[_loc7_ - 1].tName.htmlText = "<font color=\"#ff0000\"><b>" + _loc9_ + " " + _loc10_ + "</b></font>";
                } else {
                    CHAMPIONCAGEPOPUP.feedIcons[_loc7_ - 1].tName.htmlText = "<font color=\"#000000\"><b>" + _loc9_ + " " + _loc10_ + "</b></font>";
                }
                if (_loc7_ == 1) {
                    ImageCache.GetImageWithCallBack(as3.str(_loc11_), as3.bind(this, this.FeedIconLoaded));
                } else if (_loc7_ == 2) {
                    ImageCache.GetImageWithCallBack(as3.str(_loc11_), as3.bind(this, this.FeedIconLoaded2));
                }
                CHAMPIONCAGEPOPUP.feedIcons[_loc7_ - 1].visible = true;
                _loc7_++;
                if (_loc7_ >= 3) {
                    break;
                }
            }
        }
    }

    private UpdateStats(): void {
        let _loc1_: number = NaN;
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: number = NaN;
        let _loc17_: string = null;
        let _loc18_: string = null;
        let _loc19_: number = NaN;
        let _loc20_: number = NaN;
        let _loc21_: number = NaN;
        let _loc22_: number = NaN;
        let _loc23_: number = NaN;
        let _loc24_: int = 0;
        let _loc25_: boolean = false;
        let _loc26_: int = 0;
        this.UpdateVars();
        if (CREATURES._guardian) {
            this.tEvoStage.htmlText = "<b>" + KEYS.Get("gcage_evo") + "</b>" + " Stage " + CREATURES._guardian._level.Get();
            this.damage_txt.htmlText = "<b>" + KEYS.Get("gcage_labelDamage") + "</b>";
            this.health_txt.htmlText = "<b>" + KEYS.Get("gcage_labelHealth") + "</b>";
            this.speed_txt.htmlText = "<b>" + KEYS.Get("gcage_labelSpeed") + "</b>";
            this.buff_txt.htmlText = "<b>" + KEYS.Get("gcage_labelBuff") + "</b>";
            this.damage_txt2.htmlText = "<b>" + KEYS.Get("gcage_labelDamage") + "</b>";
            this.health_txt2.htmlText = "<b>" + KEYS.Get("gcage_labelHealth") + "</b>";
            this.speed_txt2.htmlText = "<b>" + KEYS.Get("gcage_labelSpeed") + "</b>";
            this.buff_txt2.htmlText = "<b>" + KEYS.Get("gcage_labelBuff") + "</b>";
            this.tEvoDesc.htmlText = KEYS.Get(as3.str(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].description));
            if (Boolean(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].powerLevel2Desc) && CREATURES._guardian._powerLevel.Get() > 1) {
                this.tEvoDesc.htmlText += "<br/><b>" + KEYS.Get("mon_specialability") + "</b>" + "<br/>* " + KEYS.Get(as3.str(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].powerLevel2Desc));
                if (Boolean(KEYS.Get(as3.str(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].powerLevel3Desc))) && CREATURES._guardian._powerLevel.Get() > 2) {
                    this.tEvoDesc.htmlText += "* " + KEYS.Get(as3.str(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].powerLevel3Desc));
                }
            }
            _loc1_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "damage"));
            _loc2_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "health"));
            _loc3_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "speed"));
            _loc4_ = CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "buffs") * 100;
            if (this.foodBonus > 0) {
                _loc1_ = Number(_loc1_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.foodBonus, "bonusDamage"));
                _loc2_ = Number(_loc2_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.foodBonus, "bonusHealth"));
                _loc3_ = Number(_loc3_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.foodBonus, "bonusSpeed"));
                _loc4_ += CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.foodBonus, "bonusBuffs") * 100;
            }
            _loc5_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "damage"));
            _loc6_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "health"));
            _loc7_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "speed"));
            _loc8_ = CHAMPIONCAGE.GetGuardianProperty(this.guardID, this.guardLevel, "buffs") * 100;
            _loc9_ = ((_loc3_ * 10) | 0) / 10;
            this.tDamage.htmlText = "" + _loc1_;
            this.tHealth.htmlText = "" + _loc2_;
            this.tSpeed.htmlText = "" + _loc9_;
            this.tBuff.htmlText = "" + (_loc4_ | 0) + "%";
            this.tHP.htmlText = Math.floor(this.guard.health) + " / " + Math.floor(this.guard.maxHealth);
            TweenLite.to(this.bDamage.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxDamage * _loc1_, "ease": Circ.easeInOut, "delay": 0 });
            if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel && CHAMPIONCAGEPOPUP._useBonusIndicators) {
                _loc10_ = this.foodBonus;
                while (_loc10_ <= 3) {
                    if (_loc10_ > 0) {
                        (as3.as(this.bDamage["mcBuff" + _loc10_], MovieClip)).gotoAndStop(_loc10_ + 1);
                        TweenLite.to(this.bDamage["mcBuff" + _loc10_], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxDamage * (_loc5_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, _loc10_, "bonusDamage")) + 2, "ease": Circ.easeInOut, "delay": 0 });
                    }
                    _loc10_++;
                }
            }
            TweenLite.to(this.bHealth.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxHealth * _loc2_, "ease": Circ.easeInOut, "delay": 0.05 });
            if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel && CHAMPIONCAGEPOPUP._useBonusIndicators) {
                _loc10_ = this.foodBonus;
                while (_loc10_ <= 3) {
                    if (_loc10_ > 0) {
                        TweenLite.to(this.bHealth["mcBuff" + _loc10_], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxHealth * (_loc6_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, _loc10_, "bonusHealth")) + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.bHealth["mcBuff" + _loc10_].gotoAndStop(1 + _loc10_);
                    }
                    _loc10_++;
                }
            }
            TweenLite.to(this.bSpeed.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxSpeed * _loc3_, "ease": Circ.easeInOut, "delay": 0.1 });
            if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel && CHAMPIONCAGEPOPUP._useBonusIndicators) {
                _loc10_ = this.foodBonus;
                while (_loc10_ <= 3) {
                    if (_loc10_ > 0) {
                        TweenLite.to(this.bSpeed["mcBuff" + _loc10_], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxSpeed * (_loc7_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, _loc10_, "bonusSpeed")) + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.bSpeed["mcBuff" + _loc10_].gotoAndStop(1 + _loc10_);
                    }
                    _loc10_++;
                }
            }
            TweenLite.to(this.bBuff.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxBuff * _loc4_, "ease": Circ.easeInOut, "delay": 0.15 });
            if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel && CHAMPIONCAGEPOPUP._useBonusIndicators) {
                _loc10_ = this.foodBonus;
                while (_loc10_ <= 3) {
                    if (_loc10_ > 0) {
                        TweenLite.to(this.bBuff["mcBuff" + _loc10_], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxBuff * (_loc8_ + CHAMPIONCAGE.GetGuardianProperty(this.guardID, _loc10_, "bonusBuffs")) + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.bBuff["mcBuff" + _loc10_].gotoAndStop(1 + _loc10_);
                    }
                    _loc10_++;
                }
            }
            if (this.guardLevel == CHAMPIONCAGEPOPUP._maxLevel) {
                this.day1.tDay.htmlText = KEYS.Get("gcage_day") + " 1";
                this.day1.bonusDamage.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusDamage")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusDamage")])) + "" : "";
                this.day1.bonusHealth.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusHealth")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusHealth")])) + "" : "";
                this.day1.bonusSpeed.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusSpeed")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusSpeed")]) + "" : "";
                this.day1.bonusBuff.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusBuffs")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusBuffs")]) * 100 + "%" + "" : "";
                this.day2.tDay.htmlText = KEYS.Get("gcage_day") + " 2";
                this.day2.bonusDamage.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusDamage")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusDamage") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusDamage")])) + "" : "";
                this.day2.bonusHealth.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusHealth")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusHealth") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusHealth")])) + "" : "";
                this.day2.bonusSpeed.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusSpeed")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusSpeed") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusSpeed")]) + "" : "";
                this.day2.bonusBuff.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusBuffs")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusBuffs") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 1, "bonusBuffs")]) * 100 + "%" + "" : "";
                this.day3.tDay.htmlText = KEYS.Get("gcage_day") + " 3";
                this.day3.bonusDamage.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusDamage")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusDamage") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusDamage")])) + "" : "";
                this.day3.bonusHealth.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusHealth")) ? "+" + GLOBAL.FormatNumber(Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusHealth") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusHealth")])) + "" : "";
                this.day3.bonusSpeed.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusSpeed")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusSpeed") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusSpeed")]) + "" : "";
                this.day3.bonusBuff.htmlText = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusBuffs")) ? "+" + Number([CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 3, "bonusBuffs") - CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, 2, "bonusBuffs")]) * 100 + "%" + "" : "";
                _loc11_ = 1;
                while (_loc11_ <= 3) {
                    if (_loc11_ < this.foodBonus + 1) {
                        this["day" + _loc11_].alpha = 1;
                        this["day" + _loc11_].mcDivider.alpha = 0;
                        if (_loc11_ <= this.foodBonus) {
                            this["day" + _loc11_].bonusDamage.htmlText = "";
                            this["day" + _loc11_].bonusHealth.htmlText = "";
                            this["day" + _loc11_].bonusSpeed.htmlText = "";
                            this["day" + _loc11_].bonusBuff.htmlText = "";
                        }
                    } else if (_loc11_ == this.foodBonus + 1) {
                        this["day" + _loc11_].alpha = 1;
                        this["day" + _loc11_].mcDivider.alpha = 0.8;
                        this["day" + _loc11_].bonusDamage.htmlText = "<b>" + this["day" + _loc11_].bonusDamage.htmlText + "</b>";
                        this["day" + _loc11_].bonusHealth.htmlText = "<b>" + this["day" + _loc11_].bonusHealth.htmlText + "</b>";
                        this["day" + _loc11_].bonusSpeed.htmlText = "<b>" + this["day" + _loc11_].bonusSpeed.htmlText + "</b>";
                        this["day" + _loc11_].bonusBuff.htmlText = "<b>" + this["day" + _loc11_].bonusBuff.htmlText + "</b>";
                    } else {
                        this["day" + _loc11_].alpha = 0.5;
                        this["day" + _loc11_].mcDivider.alpha = 1;
                    }
                    _loc11_++;
                }
                this.tDamage2.htmlText = "" + _loc1_;
                this.tHealth2.htmlText = "" + _loc2_;
                this.tSpeed2.htmlText = "" + _loc9_;
                this.tBuff2.htmlText = "" + (_loc4_ | 0) + "%";
                _loc12_ = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusDamage")) ? 1 : 0;
                _loc13_ = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusHealth")) ? 1 : 0;
                _loc14_ = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusSpeed")) ? 1 : 0;
                _loc15_ = !(!CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, (CREATURES._guardian._foodBonus.Get() + 1) | 0, "bonusBuffs")) ? 1 : 0;
                _loc16_ = 25.5;
                TweenLite.to(this.bDamage2.mcBar, 0.4, { "width": _loc16_ + this.foodBonus * 25, "ease": Circ.easeInOut, "delay": 0 });
                TweenLite.to(this.bHealth2.mcBar, 0.4, { "width": _loc16_ + this.foodBonus * 25, "ease": Circ.easeInOut, "delay": 0.05 });
                TweenLite.to(this.bSpeed2.mcBar, 0.4, { "width": _loc16_ + this.foodBonus * 25, "ease": Circ.easeInOut, "delay": 0.1 });
                TweenLite.to(this.bBuff2.mcBar, 0.4, { "width": _loc16_ * _loc15_ + this.foodBonus * 25 * _loc15_, "ease": Circ.easeInOut, "delay": 0.15 });
            }
            this.barHP.mcBar.width = 100 / this.guard.maxHealth * Math.max(1, this.guard.health);
            this.bFeedTimer.mcBar.width = 100 / CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedTime") * (CREATURES._guardian._feedTime.Get() - GLOBAL.Timestamp());
        }
        if (CHAMPIONCAGEPOPUP._page == 2 && CHAMPIONCAGEPOPUP._kothEnabled) {
            this.kothLootCurrent = KOTHHandler.instance.totalLoot;
            this.kothTimeCurrent = ReplayableEventHandler.currentTime - this.kothTimeStart;
            this.kothTimeLeft = this.kothTimeEnd - ReplayableEventHandler.currentTime;
            this.p3_bTimeleft.mcFill.width = 400 / KOTHHandler.instance.timePerRound * this.kothTimeCurrent;
            this.p3_bLootLeft.mcFill.width = 400 / this.kothLootMax * KOTHHandler.instance.totalLoot;
            _loc17_ = GLOBAL.ToTime(this.kothTimeLeft | 0);
            _loc18_ = GLOBAL.FormatNumber(KOTHHandler.instance.totalLoot);
            this.p3_tTimeleft.htmlText = "<b>" + _loc17_ + " " + KEYS.Get("koth_bardesc_time") + "</b>";
            this.p3_tLootLeft.htmlText = "<b>" + _loc18_ + " " + KEYS.Get("koth_bardesc_loot") + "</b>";
            this.p3_mcLootMark1.visible = !KOTHHandler.instance.hasWonPermanantly;
            this.p3_mcLootMark1.check.visible = KOTHHandler.instance.totalLoot >= this.kothLootThresholds[0];
            this.p3_mcLootMark2.check.visible = KOTHHandler.instance.totalLoot >= this.kothLootThresholds[1];
            this.p3_mcLootMark1.x = this.p3_bLootLeft.x + this.p3_bLootLeft.mcBG.width / this.kothLootMax * this.kothLootThresholds[0] - this.p3_mcLootMark1.width / 2;
            this.p3_mcLootMark2.x = this.p3_bLootLeft.x + this.p3_bLootLeft.mcBG.width / this.kothLootMax * this.kothLootThresholds[1] - this.p3_mcLootMark2.width;
            if (this.p3_mcLootMark1.check.visible && !this.p3_mcLootMark2.check.visible) {
                this.addKothTooltip(this.p3_mcLootMark2);
            } else if (!this.p3_mcLootMark1.check.visible && !this.p3_mcLootMark2.check.visible) {
                if (this.p3_mcLootMark1.visible) {
                    this.addKothTooltip(this.p3_mcLootMark1);
                } else {
                    this.addKothTooltip(this.p3_mcLootMark2);
                }
            }
            if (CREATURES._krallen) {
                this.p3_damage_txt.htmlText = "<b>" + KEYS.Get("gcage_labelDamage") + "</b>";
                this.p3_health_txt.htmlText = "<b>" + KEYS.Get("gcage_labelHealth") + "</b>";
                this.p3_speed_txt.htmlText = "<b>" + KEYS.Get("gcage_labelSpeed") + "</b>";
                this.p3_buff_txt.htmlText = "<b>" + KEYS.Get("gcage_labelBuff") + "</b>";
                this.p3_abilities_txt.htmlText = "<b>" + KEYS.Get("gcage_labelAbilities") + "</b>";
                _loc19_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "damage"));
                _loc20_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "health"));
                _loc21_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "speed"));
                _loc22_ = CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "buffs") * 100;
                _loc5_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "damage"));
                _loc6_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "health"));
                _loc7_ = Number(CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "speed"));
                _loc8_ = CHAMPIONCAGE.GetGuardianProperty(this.kothID, this.kothLevel, "buffs") * 100;
                _loc23_ = ((_loc21_ * 10) | 0) / 10;
                this.p3_tDamage.htmlText = "" + _loc19_;
                this.p3_tHealth.htmlText = "" + _loc20_;
                this.p3_tSpeed.htmlText = "" + _loc23_;
                this.p3_tBuff.htmlText = "" + (_loc22_ | 0) + "%";
                this.p3_tHP.htmlText = Math.floor(this.koth.health) + " / " + Math.floor(this.koth.maxHealth);
                _loc24_ = 5;
                _loc25_ = true;
                TweenLite.to(this.p3_bDamage.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxDamage * _loc19_, "ease": Circ.easeInOut, "delay": 0 });
                if (this.kothLevel != _loc24_ && _loc25_) {
                    if (this.kothLevel + 1 <= _loc24_) {
                        TweenLite.to(this.p3_bDamage["mcBuff" + 1], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxDamage * CHAMPIONCAGE.GetGuardianProperty(this.kothID, (this.kothLevel + 1) | 0, "damage") + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.p3_bDamage["mcBuff" + 1].gotoAndStop(2);
                    }
                    _loc26_ = 2;
                    while (_loc26_ <= 3) {
                        this.p3_bDamage["mcBuff" + _loc26_].width = 0;
                        _loc26_++;
                    }
                }
                TweenLite.to(this.p3_bHealth.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxHealth * _loc20_, "ease": Circ.easeInOut, "delay": 0.05 });
                if (this.kothLevel != _loc24_ && _loc25_) {
                    if (this.kothLevel + 1 <= _loc24_) {
                        TweenLite.to(this.p3_bHealth["mcBuff" + 1], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxHealth * CHAMPIONCAGE.GetGuardianProperty(this.kothID, (this.kothLevel + 1) | 0, "health") + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.p3_bHealth["mcBuff" + 1].gotoAndStop(2);
                    }
                    _loc26_ = 2;
                    while (_loc26_ <= 3) {
                        this.p3_bHealth["mcBuff" + _loc26_].width = 0;
                        _loc26_++;
                    }
                }
                TweenLite.to(this.p3_bSpeed.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxSpeed * _loc21_, "ease": Circ.easeInOut, "delay": 0.1 });
                if (this.kothLevel != _loc24_ && _loc25_) {
                    if (this.kothLevel + 1 <= _loc24_) {
                        TweenLite.to(this.p3_bSpeed["mcBuff" + 1], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxSpeed * CHAMPIONCAGE.GetGuardianProperty(this.kothID, (this.kothLevel + 1) | 0, "speed") + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.p3_bSpeed["mcBuff" + 1].gotoAndStop(2);
                    }
                    _loc26_ = 2;
                    while (_loc26_ <= 3) {
                        this.p3_bSpeed["mcBuff" + _loc26_].width = 0;
                        _loc26_++;
                    }
                }
                TweenLite.to(this.p3_bBuff.mcBar, 0.4, { "width": 100 / CHAMPIONCAGEPOPUP._maxBuff * _loc22_, "ease": Circ.easeInOut, "delay": 0.15 });
                if (this.kothLevel != _loc24_ && _loc25_) {
                    if (this.kothLevel + 1 <= _loc24_) {
                        TweenLite.to(this.p3_bBuff["mcBuff" + 1], 0, { "width": 100 / CHAMPIONCAGEPOPUP._maxBuff * CHAMPIONCAGE.GetGuardianProperty(this.kothID, (this.kothLevel + 1) | 0, "buff") + 2, "ease": Circ.easeInOut, "delay": 0 });
                        this.p3_bBuff["mcBuff" + 1].gotoAndStop(2);
                    }
                    _loc26_ = 2;
                    while (_loc26_ <= 3) {
                        this.p3_bBuff["mcBuff" + _loc26_].width = 0;
                        _loc26_++;
                    }
                }
                this.p3_bHP.mcBar.width = 100 / this.koth.maxHealth * Math.max(1, this.koth.health);
            }
        }
    }

    public Tick(): void {
        if (!CREATURES._guardian) {
            return;
        }
        let _loc1_: int = CREATURES._guardian._feedTime.Get() | 0;
        if (_loc1_ < GLOBAL.Timestamp()) {
            if (CHAMPIONCAGEPOPUP._page == 1) {
                this.Switch(1);
            }
            this.tNextFeedTitle.htmlText = "<b>" + KEYS.Get("gcage_hungry") + "</b>";
            this.tNextFeed.htmlText = GLOBAL.ToTime((_loc1_ + CHAMPIONCAGE.STARVETIMER - GLOBAL.Timestamp()) | 0);
            this.bFeedTimer.mcBar.width = 0;
        } else {
            this.tNextFeedTitle.htmlText = "<b>" + KEYS.Get("gcage_nextFeedIn") + "</b>";
            this.tNextFeed.htmlText = GLOBAL.ToTime((CREATURES._guardian._feedTime.Get() - GLOBAL.Timestamp()) | 0);
            this.bFeedTimer.mcBar.width = Math.max(100, 100 / CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedTime") * (CREATURES._guardian._feedTime.Get() - GLOBAL.Timestamp()));
        }
        this.UpdateStats();
        if (CREATURES._guardian.health >= CREATURES._guardian.maxHealth) {
            this.bHeal.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.HealClick));
            this.bHeal.Enabled = false;
        }
    }

    public SwitchClick(param1: int): Function {
        let page: int = 0;
        page = param1;
        return (param1: MouseEvent = null): void => {
            this.Switch(page);
        };
    }

    public HealClick(param1: MouseEvent): void {
        if (CREATURES._guardian.health < CREATURES._guardian.maxHealth) {
            CHAMPIONCAGE.HealGuardian();
            this.Switch(0);
        } else {
            this.Switch(0);
        }
    }

    public kothHealClick(param1: MouseEvent = null): void {
        if (Boolean(CREATURES._krallen) && CREATURES._krallen.health < CREATURES._krallen.maxHealth) {
            CHAMPIONCAGE.HealGuardian(5);
            this.Switch(2);
        } else {
            this.Switch(2);
        }
    }

    public EvolveClick(param1: MouseEvent): void {
        let _loc2_: int = 0;
        if (CREATURES._guardian._level.Get() < 6) {
            _loc2_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedShiny") | 0;
            _loc2_ = (_loc2_ * 2) | 0;
            _loc2_ = (_loc2_ * (CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedCount") - CREATURES._guardian._feeds.Get())) | 0;
            this.EvolveClickB();
        } else if (CREATURES._guardian._level.Get() == 6) {
            _loc2_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._foodBonus.Get() | 0, "bonusFeedShiny") | 0;
            _loc2_ = (_loc2_ * 2) | 0;
            this.EvolveClickB();
        }
    }

    public EvolveClickB(): void {
        let _loc1_: int = 0;
        if (CREATURES._guardian._level.Get() < 6) {
            _loc1_ = CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedShiny") | 0;
            _loc1_ = (_loc1_ * 2) | 0;
            _loc1_ = (_loc1_ * (CHAMPIONCAGE.GetGuardianProperty(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, "feedCount") - CREATURES._guardian._feeds.Get())) | 0;
            if (BASE._credits.Get() < _loc1_) {
                POPUPS.DisplayGetShiny();
                return;
            }
            if (!GLOBAL.ioConfirmShiny(_loc1_, "to evolve your champion now", (): void => {
                this.EvolveClickB();
            })) {
                return;
            }
            CREATURES._guardian.levelSet((CREATURES._guardian._level.Get() + 1) | 0, _loc1_);
            BASE.Purchase("IEV", _loc1_, "cage");
            CHAMPIONCAGE.Hide();
            BASE.Save(0, false, true);
        }
    }

    public InstantClick(param1: MouseEvent): void {
        let _loc2_: any = CREATURES._guardian._feedTime.Get() < GLOBAL.Timestamp();
        if (CREATURES._guardian._level.Get() <= 6) {
            CHAMPIONCAGEPOPUP._bCage.FeedGuardian(CREATURES._guardian._creatureID, CREATURES._guardian._level.Get() | 0, true, !_loc2_);
            CHAMPIONCAGE.Hide(param1);
        }
    }

    public CantFeedClick(param1: MouseEvent): void {
        if (CREATURES._guardian._level.Get() <= 6 && CREATURES._guardian._foodBonus.Get() < 3) {
            GLOBAL.Message(KEYS.Get("gcage_msgNotHungry"));
        } else if (CREATURES._guardian._level.Get() == 6 && CREATURES._guardian._foodBonus.Get() >= 3) {
            GLOBAL.Message(KEYS.Get("gcage_msgFullBuff"));
        }
    }

    public CantInstantClick(param1: MouseEvent): void {
        GLOBAL.Message(KEYS.Get("gcage_msgFullBuff"));
    }

    public Hide(param1: MouseEvent = null): void {
        CHAMPIONCAGE.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
