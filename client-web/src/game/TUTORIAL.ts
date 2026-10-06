import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { ATTACK, BASE, BFOUNDATION, BUILDING13, BUILDING4, BUILDINGOPTIONS, BUILDINGOPTIONSPOPUP, BUILDINGS, BUILDINGSPOPUP, CREEPS, CUSTOMATTACKS, Console, Elastic, GAME, GLOBAL, GRID, HATCHERY, HOUSING, ImageCache, InstanceManager, KEYS, LOGIN, MAP, MAPROOM, MapRoom3Tutorial, MapRoomManager, POPUPS, QUESTS, QUEUE, SPRITES, STORE, STOREPOPUP, SecNum, TUTORIALARROWMC, TUTORIALPOPUPMC, TweenLite, UI2, UI_BOTTOM, UI_WORKERS, WMATTACK } from "@game";

export class TUTORIAL extends ASObject {
    public static _stage: int;

    public static _currentStage: int;

    public static _endstage: int; // const

    public static _arrowRotation: int;

    public static _isSmallSizeOffset: int;

    public static k_STAGE_SNIPER_SPEEDUP: uint; // const

    public static k_STAGE_DAMAGE_PROTECT: uint; // const

    private static ARROW_STORE_BUY_1: Point; // const

    private static ARROW_STORE_BUY_2: Point; // const

    private static ARROW_STORE_BUY_3: Point; // const

    private static ARROW_STORE_BUY_4: Point; // const

    private static ARROW_BUILDING_UPGRADE: Point; // const

    private static ARROW_BUILDINGS_HOUSING: Point; // const

    private static ARROW_BUILDINGS_FLINGER: Point; // const

    private static ARROW_BUILDINGS_MAPROOM: Point; // const

    private static ARROW_BUILDINGS_HATCHERY: Point; // const

    public static BOBBOTTOMLEFTLOW: Point;

    public static BOBBOTTOMLEFTHIGH: Point;

    public static POINT_QUEST: Point;

    public static POINT_BUILDINGS: Point;

    public static POINT_MAP: Point;

    public static POINT_FULLSCREEN: Point;

    public static _advanceCondition: Function;

    public static _rewindCondition: Function;

    public static _doBob: DisplayObject;

    public static _doArrow: DisplayObject;

    public static _container: any;

    public static _timer: int;

    public static _setupDone: boolean;

    public static _secondWorker: boolean;

    public static _freeSpeedup: boolean;

    public static _mcBob: TUTORIALPOPUPMC;

    public static _mcArrow: MovieClip;

    static {
        as3.lazyStatics(this, { _stage: 0, _currentStage: 0, _endstage: 0, _arrowRotation: 0, _isSmallSizeOffset: 0, k_STAGE_SNIPER_SPEEDUP: 0, k_STAGE_DAMAGE_PROTECT: 0, ARROW_STORE_BUY_1: null, ARROW_STORE_BUY_2: null, ARROW_STORE_BUY_3: null, ARROW_STORE_BUY_4: null, ARROW_BUILDING_UPGRADE: null, ARROW_BUILDINGS_HOUSING: null, ARROW_BUILDINGS_FLINGER: null, ARROW_BUILDINGS_MAPROOM: null, ARROW_BUILDINGS_HATCHERY: null, BOBBOTTOMLEFTLOW: null, BOBBOTTOMLEFTHIGH: null, POINT_QUEST: null, POINT_BUILDINGS: null, POINT_MAP: null, POINT_FULLSCREEN: null, _advanceCondition: null, _rewindCondition: null, _doBob: null, _doArrow: null, _container: undefined, _timer: 0, _setupDone: false, _secondWorker: false, _freeSpeedup: false, _mcBob: null, _mcArrow: null }, () => {
            TUTORIAL._stage = 0;
            TUTORIAL._currentStage = 0;
            TUTORIAL._endstage = 205;
            TUTORIAL._arrowRotation = 0;
            TUTORIAL._isSmallSizeOffset = 0;
            TUTORIAL.k_STAGE_SNIPER_SPEEDUP = 37;
            TUTORIAL.k_STAGE_DAMAGE_PROTECT = 190;
            TUTORIAL.ARROW_STORE_BUY_1 = new Point(215, 200);
            TUTORIAL.ARROW_STORE_BUY_2 = new Point(225, 200);
            TUTORIAL.ARROW_STORE_BUY_3 = new Point(580, 345);
            TUTORIAL.ARROW_STORE_BUY_4 = new Point(225, 365);
            TUTORIAL.ARROW_BUILDING_UPGRADE = new Point(586, 300);
            TUTORIAL.ARROW_BUILDINGS_HOUSING = new Point(470, 240);
            TUTORIAL.ARROW_BUILDINGS_FLINGER = new Point(250, 300);
            TUTORIAL.ARROW_BUILDINGS_MAPROOM = new Point(510, 300);
            TUTORIAL.ARROW_BUILDINGS_HATCHERY = new Point(610, 240);
            TUTORIAL.BOBBOTTOMLEFTLOW = new Point(10, 560);
            TUTORIAL.BOBBOTTOMLEFTHIGH = new Point(10, 560);
            TUTORIAL.POINT_QUEST = new Point(583, 481 + TUTORIAL._isSmallSizeOffset);
            TUTORIAL.POINT_BUILDINGS = new Point(496, 483 + TUTORIAL._isSmallSizeOffset);
            TUTORIAL.POINT_MAP = new Point(706, 474 + TUTORIAL._isSmallSizeOffset);
            TUTORIAL.POINT_FULLSCREEN = new Point(640, 14 + TUTORIAL._isSmallSizeOffset);
            TUTORIAL._advanceCondition = null;
            TUTORIAL._rewindCondition = null;
            TUTORIAL._secondWorker = false;
            TUTORIAL._freeSpeedup = true;
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static get hasFinished(): boolean {
        return TUTORIAL._stage >= TUTORIAL._endstage;
    }

    public static Setup(): void {
        TUTORIAL._container = GLOBAL._layerMessages;
        TUTORIAL._doBob = null;
        TUTORIAL._doArrow = null;
        TUTORIAL._mcBob = new TUTORIALPOPUPMC();
        TUTORIAL._mcArrow = new TUTORIALARROWMC();
        TUTORIAL._currentStage = 0;
        TUTORIAL._isSmallSizeOffset = GAME._isSmallSize ? -80 : 0;
        if (GAME._isSmallSize) {
            TUTORIAL.BOBBOTTOMLEFTLOW = new Point(10, 560 + TUTORIAL._isSmallSizeOffset);
            TUTORIAL.BOBBOTTOMLEFTHIGH = new Point(10, 560 + TUTORIAL._isSmallSizeOffset);
        }
    }

    public static Process(): void {
        if (TUTORIAL._stage < 200) {
            if (BASE.isInfernoMainYardOrOutpost) {
                TUTORIAL._stage = TUTORIAL._endstage;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                if (TUTORIAL._stage > 1 && TUTORIAL._stage < 31) {
                    TUTORIAL._stage = 31;
                }
                if (Boolean(GLOBAL._bHousing) && TUTORIAL._stage < 57) {
                    TUTORIAL._stage = 57;
                }
                if (TUTORIAL._stage == 102) {
                    TUTORIAL._stage = 101;
                }
                if (QUESTS._completed.WM1 == 1) {
                    TUTORIAL._stage = 130;
                }
                if (QUESTS._completed.WM1 == 2) {
                    TUTORIAL._stage = 140;
                }
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL._stage = 180;
                }
                if (TUTORIAL._stage > 58 && TUTORIAL._stage < 65) {
                    TUTORIAL._stage = 65;
                }
                if (TUTORIAL._stage >= 113 && TUTORIAL._stage <= 116 || TUTORIAL._stage == 120) {
                    TUTORIAL._stage = 130;
                } else if (TUTORIAL._stage >= 110 && TUTORIAL._stage < 130) {
                    TUTORIAL._stage = 99;
                }
                if (TUTORIAL._stage < 150 && Boolean(GLOBAL._bHatchery)) {
                    if (GLOBAL._bHatchery._countdownBuild.Get() > 0) {
                        TUTORIAL._stage = 145;
                    } else {
                        TUTORIAL._stage = 150;
                    }
                }
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                TUTORIAL._stage = 110;
            }
        }
    }

    public static Advance(param1: MouseEvent = null): void {
        if (MapRoomManager.instance.isInMapRoom3 && MapRoom3Tutorial.instance.isStarted && !MapRoom3Tutorial.instance.isHolding && param1 && TUTORIAL._stage < 150) {
            MapRoom3Tutorial.instance.advance();
            return;
        }
        TUTORIAL.clearStage();
        TUTORIAL._stage += 1;
        if (TUTORIAL._stage > 1 && TUTORIAL._stage < 31) {
            TUTORIAL._stage = 31;
        }
        QUESTS.Check();
        TUTORIAL.Tick();
    }

    private static Rewind(): void {
        if (Boolean(TUTORIAL._doBob) && Boolean(TUTORIAL._doBob.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doBob);
        }
        if (Boolean(TUTORIAL._doArrow) && Boolean(TUTORIAL._doArrow.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doArrow);
        }
        TUTORIAL._advanceCondition = null;
        TUTORIAL._rewindCondition = null;
        --TUTORIAL._stage;
        TUTORIAL.Tick();
    }

    public static clearStage(): void {
        if (Boolean(TUTORIAL._doBob) && Boolean(TUTORIAL._doBob.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doBob);
        }
        if (Boolean(TUTORIAL._doArrow) && Boolean(TUTORIAL._doArrow.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doArrow);
        }
        if (TUTORIAL._mcArrow.rotation != 0) {
            TUTORIAL._mcArrow.rotation = 0;
        }
        TUTORIAL._advanceCondition = null;
        TUTORIAL._rewindCondition = null;
    }

    public static set stage(param1: int) {
        if (Boolean(TUTORIAL._doBob) && Boolean(TUTORIAL._doBob.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doBob);
        }
        if (Boolean(TUTORIAL._doArrow) && Boolean(TUTORIAL._doArrow.parent)) {
            TUTORIAL._container.removeChild(TUTORIAL._doArrow);
        }
        if (TUTORIAL._mcArrow.rotation != 0) {
            TUTORIAL._mcArrow.rotation = 0;
        }
        TUTORIAL._advanceCondition = null;
        TUTORIAL._rewindCondition = null;
        TUTORIAL._stage = param1;
        TUTORIAL.Tick();
    }

    public static Tick(): void {
        if (!BASE.isInfernoMainYardOrOutpost && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW)) {
            if (TUTORIAL._stage < 1) {
                TUTORIAL._stage = 1;
            }
            if (TUTORIAL._stage > TUTORIAL._endstage) {
                TUTORIAL._stage = TUTORIAL._endstage;
            }
            if (!GLOBAL._catchup) {
                if (TUTORIAL._currentStage != TUTORIAL._stage) {
                    TUTORIAL._currentStage = TUTORIAL._stage;
                    TUTORIAL.Show();
                }
                if (TUTORIAL._advanceCondition != null) {
                    TUTORIAL._advanceCondition();
                }
                if (TUTORIAL._rewindCondition != null) {
                    TUTORIAL._rewindCondition();
                }
            }
        }
    }

    public static Show(): void {
        let _loc1_: Point = null;
        let _loc2_: BFOUNDATION = null;
        let _loc3_: int = 0;
        let _loc5_: Point = null;
        let _loc6_: number = NaN;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: boolean = false;
        let _loc9_: int = 0;
        let _loc10_: string = null;
        if (BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        Console.print("TUTORIAL STAGE:" + TUTORIAL._stage + " " + TUTORIAL._currentStage);
        _loc1_ = new Point();
        let _loc4_: MovieClip = new MovieClip();
        if (TUTORIAL._stage > 59) {
        }
        switch (TUTORIAL._stage) {
            case 1:
                MAP._canScroll = false;
                for (_loc2_ of as3.values(BASE._buildingsAll)) {
                    if (_loc2_._type == 1) {
                        MAP.Focus(_loc2_.x, _loc2_.y);
                        break;
                    }
                }
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_1b", { "v1": LOGIN._playerName }), new Point(GLOBAL._SCREEN.right - 100, TUTORIAL.POINT_FULLSCREEN.y), ["mc", UI2._top.mcFullscreen, new Point(0, 12)], true, true);
                TUTORIAL._mcBob.showTwoButtons("btn_nothanks", "btn_fullscreen", TUTORIAL.clickedFullScreen);
                TUTORIAL._mcBob.addFullScreenButton(TUTORIAL.clickedFullScreen);
                break;
            case 3:
                TUTORIAL._stage = 31;
                break;
            case 4:
                MAP._canScroll = false;
                BASE._bankedValue = 0;
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_4"), null, null, false, false, TUTORIAL.ConditionBank, TUTORIAL.ConditionDeselectTwig);
                break;
            case 5:
                MAP._canScroll = false;
                TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_5", { "v1": BASE._bankedValue }), null, null, true, true);
                break;
            case 20:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    BASE.BuildingDeselect();
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 1) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_20"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 20), -25], false, false, TUTORIAL.ConditionSelectTwig);
                }
                break;
            case 21:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_21"), null, null, false, false, TUTORIAL.ConditionBuildingOptionsOpen, TUTORIAL.ConditionDeselectTwig);
                }
                break;
            case 22:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    if (BUILDINGOPTIONS._open) {
                        _loc4_ = as3.as((as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP)).mcResources.bAction, MovieClip);
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_22"), TUTORIAL.ARROW_BUILDING_UPGRADE, ["mc", _loc4_, new Point(10, 20), -130], false, false, TUTORIAL.ConditionBuildingOptionsClose);
                    } else {
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_22"), TUTORIAL.ARROW_BUILDING_UPGRADE, null, false, false, TUTORIAL.ConditionBuildingOptionsClose);
                    }
                }
                break;
            case 23:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    BASE.BuildingDeselect();
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 1) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_23"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 20), -35], false, false, TUTORIAL.ConditionSelectTwig, TUTORIAL.ConditionRewindNotUpgrading);
                }
                break;
            case 24:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_24"), null, null, false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionRewindDeselect);
                }
                break;
            case 25:
                if (QUESTS._global.b1lvl == 2) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    if (TUTORIAL._freeSpeedup) {
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_25"), TUTORIAL.ARROW_STORE_BUY_1, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-160, -72)], false, false, TUTORIAL.ConditionStoreClose);
                    } else {
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_25_b"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionStoreClose);
                    }
                }
                break;
            case 26:
                QUESTS.Check();
                if (QUESTS._global.b1lvl < 2) {
                    TUTORIAL._stage = 22;
                    TUTORIAL.Advance();
                } else {
                    BASE.BuildingDeselect();
                    MAP._canScroll = false;
                    if (GLOBAL._flags.viximo) {
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_26"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -25], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectU1);
                    } else {
                        TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_26"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -25], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectU1);
                    }
                }
                break;
            case 27:
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectU1;
                break;
            case 31:
                SPRITES.SetupSprite("C2");
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step2"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                break;
            case 32:
                if (BUILDINGS._open) {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b3, MovieClip);
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step3"), new Point(445, 52), ["mc", _loc4_, new Point(60, 2), -160], false, false, TUTORIAL.ConditionBuildingsDefense, TUTORIAL.ConditionRewindBuildingsClosed);
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step3"), new Point(445, 52), ["percent", new Point(445, 52), -160], false, false, TUTORIAL.ConditionBuildingsDefense, TUTORIAL.ConditionRewindBuildingsClosed);
                }
                break;
            case 33:
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step4"), new Point(166, 242), ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(160, 247), 150], false, false, TUTORIAL.ConditionBuildingsSniper, TUTORIAL.ConditionRewindBuildingsClosed);
                break;
            case 34:
                BASE.Fund(1, Math.max(GLOBAL._buildingProps[20].costs[0].r1.Get() - BASE._resources.r1.Get(), 0), false, null, false, false);
                BASE.Fund(2, Math.max(GLOBAL._buildingProps[20].costs[0].r2.Get() - BASE._resources.r2.Get(), 0), false, null, false, false);
                BASE.Fund(3, Math.max(GLOBAL._buildingProps[20].costs[0].r3.Get() - BASE._resources.r3.Get(), 0), false, null, false, false);
                BASE.Fund(4, Math.max(GLOBAL._buildingProps[20].costs[0].r4.Get() - BASE._resources.r4.Get(), 0), false, null, false, false);
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step5"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -50], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect21);
                break;
            case 35:
                MAP._canScroll = true;
                QUEUE._placed = 0;
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step6"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuilding);
                break;
            case 36:
                if (QUESTS._global.b21lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    let _loc11_: int = 0;
                    let _loc12_: any = BASE._buildingsTowers;
                    for (_loc2_ of as3.values(_loc12_)) {
                        MAP.Focus(_loc2_.x, _loc2_.y);
                        _loc1_.x = _loc2_.x + MAP._GROUND.x;
                        _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                    }
                    TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step7"), _loc1_, ["mc", _loc2_._mcHit, new Point(30, 0), -150], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed21);
                }
                break;
            case TUTORIAL.k_STAGE_SNIPER_SPEEDUP:
                if (TUTORIAL._freeSpeedup) {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step8"), TUTORIAL.ARROW_STORE_BUY_1, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-160, -72), -120], false, false, TUTORIAL.ConditionConstructed21, TUTORIAL.ConditionStoreClose);
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_25_b"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionConstructed21, TUTORIAL.ConditionStoreClose);
                }
                break;
            case 38:
                MAP._canScroll = true;
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step9"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectT1);
                } else {
                    TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step9"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectT1);
                }
                break;
            case 39:
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectT1;
                break;
            case 40:
                CUSTOMATTACKS.TutorialAttack();
                TUTORIAL.Add(4, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step10"), null, null, false, false, TUTORIAL.ConditionAttackOver);
                break;
            case 41:
                for (_loc7_ of as3.values(BASE._buildingsAll)) {
                    if (_loc7_.health < _loc7_.maxHealth && _loc7_._repairing == 0) {
                        _loc7_.Repair();
                    }
                }
                TUTORIAL.Advance();
                break;
            case 42:
                BUILDINGS._buildingID = 0;
                if (!("D1" in QUESTS._completed)) {
                    QUESTS._completed.D1 = 1;
                }
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step11"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectD1);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step11"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectD1);
                }
                break;
            case 43:
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectD1;
                break;
            case 44:
                TUTORIAL.Add(8, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step12"), new Point(TUTORIAL._mcBob.mcButton.x, TUTORIAL._mcBob.mcButton.y), ["mc", TUTORIAL._mcBob.mcButton, new Point(200, 30), 150], true, false);
                break;
            case 50:
                ImageCache.GetImageWithCallBack("buildingbuttons/15.jpg");
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step13"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                break;
            case 51:
                if (BUILDINGS._mc) {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b2, MovieClip);
                }
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step14"), new Point(322, 51), ["mc", _loc4_, new Point(60, 22), 160], false, false, TUTORIAL.ConditionBuildingsBuildings, TUTORIAL.ConditionRewindBuildingsClosedB);
                break;
            case 52:
                BASE.Fund(1, Math.max(GLOBAL._buildingProps[14].costs[0].r1.Get() - BASE._resources.r1.Get(), 0), false, null, false, false);
                BASE.Fund(2, Math.max(GLOBAL._buildingProps[14].costs[0].r2.Get() - BASE._resources.r2.Get(), 0), false, null, false, false);
                BASE.Fund(3, Math.max(GLOBAL._buildingProps[14].costs[0].r3.Get() - BASE._resources.r3.Get(), 0), false, null, false, false);
                BASE.Fund(4, Math.max(GLOBAL._buildingProps[14].costs[0].r4.Get() - BASE._resources.r4.Get(), 0), false, null, false, false);
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step15"), TUTORIAL.ARROW_BUILDINGS_HOUSING, ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(500, 240), -120], false, false, TUTORIAL.ConditionBuildingsHousing, TUTORIAL.ConditionRewindBuildingsClosedB);
                break;
            case 53:
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step16"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -40], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect15);
                break;
            case 54:
                SPRITES.SetupSprite("C1");
                MAP._canScroll = true;
                QUEUE._placed = 0;
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step17"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuildingB);
                break;
            case 55:
                if (QUESTS._global.b15lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc8_ = false;
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 15) {
                            MAP.Focus(_loc2_.x, _loc2_.y + 100);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 200;
                            _loc8_ = true;
                            break;
                        }
                    }
                    if (Boolean(_loc2_) && _loc8_) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step18"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 80), -50], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed15);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step18"), null, null, false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed15);
                    }
                }
                break;
            case 56:
                if (QUESTS._global.b15lvl > 0) {
                    TUTORIAL.Advance();
                } else if (!HOUSING.isHousingBuilding(GLOBAL._selectedBuilding._type)) {
                    TUTORIAL.Rewind();
                } else if (TUTORIAL._freeSpeedup) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step19"), TUTORIAL.ARROW_STORE_BUY_1, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-160, -72), 160], false, false, TUTORIAL.ConditionConstructed15, TUTORIAL.ConditionRewindStoreClosed);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_56_b"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionConstructed15, TUTORIAL.ConditionRewindStoreClosed);
                }
                break;
            case 57:
                BASE.BuildingDeselect();
                _loc5_ = GRID.ToISO(-600, 0, 0);
                _loc6_ = Point.distance(new Point(GLOBAL._bHousing.x, GLOBAL._bHousing.y), _loc5_);
                _loc9_ = 0;
                while (_loc9_ < 15) {
                    HOUSING.HousingStore("C1", new Point(_loc5_.x - 200 + Math.random() * 400, _loc5_.y - 100 + Math.random() * 200), false);
                    _loc9_++;
                }
                MAP.Focus(_loc5_.x, _loc5_.y);
                MAP.FocusTo(GLOBAL._bHousing.x | 0, GLOBAL._bHousing.y | 0, (_loc6_ / 120) | 0, 0, 0, false);
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step20"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectCR3);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step20"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectCR3);
                }
                break;
            case 58:
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectCR3;
                break;
            case 60:
                MAP._canScroll = true;
                if (!TUTORIAL._secondWorker) {
                    TUTORIAL._stage = 64;
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_60"), new Point(300, 30), ["mc", UI2._top.mc.mcR5, new Point(0, 30), -170], true, true);
                }
                break;
            case 61:
                if (!TUTORIAL._secondWorker) {
                    TUTORIAL._stage = 64;
                    TUTORIAL.Advance();
                } else {
                    UI_BOTTOM.Update();
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_61"), new Point(652, 477), ["mc", UI_BOTTOM._mc.bStore, new Point(15, 15), -70], false, false, TUTORIAL.ConditionStoreOpen);
                }
                break;
            case 62:
                if (!TUTORIAL._secondWorker) {
                    TUTORIAL._stage = 64;
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_62"), new Point(225, 200), ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-160, -72), 160], false, false, TUTORIAL.Condition2Workers, TUTORIAL.ConditionRewindStoreClosed);
                }
                break;
            case 63:
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_63"), null, null, true, true);
                break;
            case 65:
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = true;
                    BUILDINGS._buildingID = 0;
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step21"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                }
                break;
            case 66:
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b2, MovieClip);
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_66"), new Point(322, 51), ["mc", _loc4_, new Point(60, 22), -160], false, false, TUTORIAL.ConditionBuildingsBuildings, TUTORIAL.ConditionRewindBuildingsClosedC);
                }
                break;
            case 67:
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    BASE.Fund(1, Math.max(GLOBAL._buildingProps[4].costs[0].r1.Get() - BASE._resources.r1.Get(), 0), false, null, false, false);
                    BASE.Fund(2, Math.max(GLOBAL._buildingProps[4].costs[0].r2.Get() - BASE._resources.r2.Get(), 0), false, null, false, false);
                    BASE.Fund(3, Math.max(GLOBAL._buildingProps[4].costs[0].r3.Get() - BASE._resources.r3.Get(), 0), false, null, false, false);
                    BASE.Fund(4, Math.max(GLOBAL._buildingProps[4].costs[0].r4.Get() - BASE._resources.r4.Get(), 0), false, null, false, false);
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step22"), TUTORIAL.ARROW_BUILDINGS_FLINGER, ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(225, 330), -30], false, false, TUTORIAL.ConditionBuildingsFlinger, TUTORIAL.ConditionRewindBuildingsClosedC);
                }
                break;
            case 68:
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step23"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -150], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect5);
                }
                break;
            case 69:
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    QUEUE._placed = 0;
                    MAP._canScroll = true;
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step24"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuildingC);
                }
                break;
            case 80:
                if (!TUTORIAL._secondWorker) {
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 5) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    if (GAME._isSmallSize) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step25"), _loc1_, ["mc", _loc2_._mcHit, new Point(50, 100), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed11);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step25"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 30), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed11);
                    }
                    break;
                }
                TUTORIAL.Advance();
                break;
            case 81:
                if (!TUTORIAL._secondWorker) {
                    if (TUTORIAL._freeSpeedup) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step26"), TUTORIAL.ARROW_STORE_BUY_4, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-150, 100), -30], false, false, TUTORIAL.ConditionConstructed5);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step26"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionConstructed5);
                    }
                } else {
                    TUTORIAL.Advance();
                }
                break;
            case 90:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    BUILDINGS._buildingID = 0;
                    if (TUTORIAL._secondWorker) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_90"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step27"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                    }
                }
                break;
            case 91:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b2, MovieClip);
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step27"), new Point(322, 51), ["mc", _loc4_, new Point(60, 22), 170], false, false, TUTORIAL.ConditionBuildingsBuildings, TUTORIAL.ConditionRewindBuildingsClosedD);
                }
                break;
            case 92:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    BASE.Fund(1, Math.max(GLOBAL._buildingProps[10].costs[0].r1.Get() - BASE._resources.r1.Get(), 0), false, null, false, false);
                    BASE.Fund(2, Math.max(GLOBAL._buildingProps[10].costs[0].r2.Get() - BASE._resources.r2.Get(), 0), false, null, false, false);
                    BASE.Fund(3, Math.max(GLOBAL._buildingProps[10].costs[0].r3.Get() - BASE._resources.r3.Get(), 0), false, null, false, false);
                    BASE.Fund(4, Math.max(GLOBAL._buildingProps[10].costs[0].r4.Get() - BASE._resources.r4.Get(), 0), false, null, false, false);
                    if (GAME._isSmallSize) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step28"), TUTORIAL.ARROW_BUILDINGS_MAPROOM, ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(480, 340), -30], false, false, TUTORIAL.ConditionBuildingsMapRoom, TUTORIAL.ConditionRewindBuildingsDeselectBuildingsD);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step28"), TUTORIAL.ARROW_BUILDINGS_MAPROOM, ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(480, 330), -30], false, false, TUTORIAL.ConditionBuildingsMapRoom, TUTORIAL.ConditionRewindBuildingsDeselectBuildingsD);
                    }
                }
                break;
            case 93:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step29"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -50], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect11);
                }
                break;
            case 94:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    QUEUE._placed = 0;
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step30"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuildingD);
                }
                break;
            case 95:
                if (QUESTS._global.b5lvl > 0 || !TUTORIAL._secondWorker) {
                    TUTORIAL.Advance();
                } else {
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 5) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    MAP._canScroll = false;
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_95"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 20), -40], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed5);
                }
                break;
            case 96:
                MAP._canScroll = true;
                if (QUESTS._global.b5lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_96"), TUTORIAL.ARROW_STORE_BUY_4, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-150, 100), 80], false, false, TUTORIAL.ConditionConstructed5, TUTORIAL.ConditionRewindStoreClosed);
                }
                break;
            case 97:
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 11) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    if (GAME._isSmallSize) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step31"), _loc1_, ["mc", _loc2_._mcHit, new Point(50, 100), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed11);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step31"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 30), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed11);
                    }
                }
                break;
            case 98:
                MAP._canScroll = true;
                if (QUESTS._global.b11lvl > 0) {
                    TUTORIAL.Advance();
                } else if (TUTORIAL._freeSpeedup) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_98"), TUTORIAL.ARROW_STORE_BUY_4, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-150, 100), 80], false, false, TUTORIAL.ConditionConstructed11, TUTORIAL.ConditionRewindStoreClosed);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_98"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionConstructed11, TUTORIAL.ConditionRewindStoreClosed);
                }
                break;
            case 99:
                MAP._canScroll = true;
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_99"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectBunch);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_99"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectBunch);
                }
                break;
            case 100:
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectBunch;
                TUTORIAL._rewindCondition = TUTORIAL.ConditionRewindQuestsClose;
                break;
            case 101:
                // MR3 tutorial is disabled - skip directly to stage 140 regardless of map room version
                // if(MapRoomManager.instance.isInMapRoom3)
                // {
                // MapRoom3Tutorial.instance.start();
                // }
                // else
                // {
                // Add(6,BOBBOTTOMLEFTLOW,KEYS.Get("tut_101"),POINT_MAP,["mc",UI_BOTTOM._mc.bMap,new Point(15,15),-30],false,false,ConditionMapRoomOpen);
                // }
                BASE.BuildingDeselect();
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_101"), TUTORIAL.POINT_MAP, ["mc", UI_BOTTOM._mc.bMap, new Point(15, 15), -30], false, false, TUTORIAL.ConditionMapRoomOpen);
                break;
            case 102:
                if (!MAPROOM._open) {
                    TUTORIAL.Rewind();
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_102"), TUTORIAL.POINT_MAP, ["mc", MAPROOM._mc, new Point(310, 270), -30], false, false, TUTORIAL.ConditionFightBack, TUTORIAL.ConditionRewindMapClosed);
                    TUTORIAL._mcArrow.alpha = 0;
                    TweenLite.to(TUTORIAL._mcArrow, 0.75, { "autoAlpha": 1, "delay": 1, "overwrite": 1 });
                }
                break;
            case 110:
                MapRoom3Tutorial.instance.advance();
                MAP.Focus(-200, 0);
                MAP.FocusTo(200, 0, 5, 0, 0, false);
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_110"), new Point(TUTORIAL._mcBob.mcButton.x, TUTORIAL._mcBob.mcButton.y), ["mc", TUTORIAL._mcBob.mcButton, new Point(200, 30), 150], true, true);
                break;
            case 111:
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    if (UI2._top._creatureButtons[0]) {
                        _loc4_ = as3.cast(UI2._top._creatureButtons[0], MovieClip);
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_111"), new Point(102, 152), ["mc", _loc4_, new Point(100, 40), 160], false, false, TUTORIAL.ConditionFlingerAdd15, TUTORIAL.ConditionFlung);
                    }
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_111"), new Point(102, 152), null, false, false, TUTORIAL.ConditionFlingerAdd15, TUTORIAL.ConditionFlung);
                }
                break;
            case 112:
                MAP._canScroll = false;
                for (_loc2_ of as3.values(BASE._buildingsAll)) {
                    if (_loc2_._type == 14) {
                        MAP.Focus(_loc2_.x, _loc2_.y);
                        _loc1_.x = _loc2_.x + MAP._GROUND.x;
                        _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                        break;
                    }
                }
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_112"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, -200), -160], false, false, TUTORIAL.ConditionFlung);
                break;
            case 113:
                MapRoom3Tutorial.instance.clear();
                MAP._canScroll = true;
                TUTORIAL._timer = 0;
                _loc3_ = 0;
                for (_loc10_ in ATTACK._curCreaturesAvailable) {
                    _loc3_ = (_loc3_ + ATTACK._curCreaturesAvailable[_loc10_]) | 0;
                }
                if (_loc3_ > 0) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_113_more"), null, null, false, false, TUTORIAL.ConditionTimer10);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_113"), null, null, false, false, TUTORIAL.ConditionTimer5);
                }
                break;
            case 114:
                TUTORIAL._timer = 0;
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_114"), null, null, false, false, TUTORIAL.ConditionTimer5);
                break;
            case 115:
                TUTORIAL._timer = 0;
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_115"), null, null, false, false, TUTORIAL.ConditionTimer5);
                break;
            case 116:
                TUTORIAL._timer = 0;
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_116"), null, null, false, false, TUTORIAL.ConditionCrushedEnemy);
                break;
            case 120:
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_120"), null, null, false, false, TUTORIAL.ConditionReturnToYard);
                break;
            case 130:
                MapRoom3Tutorial.instance.finish();
                QUESTS.Check("destroy_tribe1", 1);
                MAP._canScroll = false;
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_130"), new Point(84, 60), null, false, false, TUTORIAL.ConditionPopupClose);
                break;
            case 131:
                QUESTS.Check("destroy_tribe1", 1);
                MAP._canScroll = false;
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_131"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectWM1);
                } else {
                    TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_131"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], false, false, TUTORIAL.ConditionQuestsOpen, TUTORIAL.ConditionQuestCollectWM1);
                }
                break;
            case 132:
                QUESTS.Check("destroy_tribe1", 1);
                MAP._canScroll = false;
                TUTORIAL._advanceCondition = TUTORIAL.ConditionQuestCollectWM1;
                break;
            case 140:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = true;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_140"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                }
                break;
            case 141:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b2, MovieClip);
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_141"), new Point(322, 51), ["mc", _loc4_, new Point(60, 22), -170], false, false, TUTORIAL.ConditionBuildingsBuildings, TUTORIAL.ConditionRewindBuildingsClosedE);
                }
                break;
            case 142:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_142"), TUTORIAL.ARROW_BUILDINGS_HATCHERY, ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(600, 230), -160], false, false, TUTORIAL.ConditionBuildingsHatchery, TUTORIAL.ConditionRewindBuildingsClosedE);
                }
                break;
            case 143:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_143"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -30], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect13);
                }
                break;
            case 144:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    QUEUE._placed = 0;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_144"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuildingE);
                }
                break;
            case 145:
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    MAP._canScroll = false;
                    for (_loc2_ of as3.values(BASE._buildingsAll)) {
                        if (_loc2_._type == 13) {
                            MAP.Focus(_loc2_.x, _loc2_.y);
                            _loc1_.x = _loc2_.x + MAP._GROUND.x;
                            _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                            break;
                        }
                    }
                    if (GAME._isSmallSize) {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_145"), _loc1_, ["mc", _loc2_._mcHit, new Point(50, 100), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed13);
                    } else {
                        TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_145"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 30), -160], false, false, TUTORIAL.ConditionStoreOpen, TUTORIAL.ConditionConstructed13);
                    }
                }
                break;
            case 146:
                MAP._canScroll = true;
                if (QUESTS._global.b13lvl > 0) {
                    TUTORIAL.Advance();
                } else if (TUTORIAL._freeSpeedup) {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_146"), TUTORIAL.ARROW_STORE_BUY_4, ["mc", as3.as(as3.as(STORE._mc, STOREPOPUP), MovieClip), new Point(-150, 100), 160], false, false, TUTORIAL.ConditionConstructed13, TUTORIAL.ConditionRewindStoreClosed);
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_146"), TUTORIAL.ARROW_STORE_BUY_3, null, false, false, TUTORIAL.ConditionConstructed13, TUTORIAL.ConditionRewindStoreClosed);
                }
                break;
            case 150:
                MAP._canScroll = false;
                for (_loc2_ of as3.values(BASE._buildingsAll)) {
                    if (_loc2_._type == 13) {
                        MAP.Focus(_loc2_.x, _loc2_.y);
                        _loc1_.x = _loc2_.x + MAP._GROUND.x;
                        _loc1_.y = _loc2_.y + MAP._GROUND.y + 20;
                        break;
                    }
                }
                if (GAME._isSmallSize) {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_150"), _loc1_, ["mc", _loc2_._mcHit, new Point(50, 100), -160], false, false, TUTORIAL.ConditionHatcheryOpen);
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_150"), _loc1_, ["mc", _loc2_._mcHit, new Point(0, 30), -160], false, false, TUTORIAL.ConditionHatcheryOpen);
                }
                break;
            case 151:
                MAP._canScroll = true;
                TUTORIAL._timer = 0;
                if (HATCHERY._mc._monsterSlots[0]) {
                    _loc4_ = as3.cast(HATCHERY._mc._monsterSlots[0], MovieClip);
                } else {
                    (_loc4_ = new MovieClip()).x = HATCHERY._mc.x + HATCHERY._mc.monsterCanvas.x;
                    _loc4_.y = HATCHERY._mc.y + HATCHERY._mc.monsterCanvas.y;
                }
                TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_151"), new Point(130, 217), ["mc", _loc4_, new Point(55, 40), 160], false, false, TUTORIAL.ConditionHatcheryProducing, TUTORIAL.ConditionRewindHatcheryClose);
                break;
            case 152:
                TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_152"), new Point(730, 21), ["mc", as3.as(HATCHERY._mc, MovieClip), new Point(346, -240), -120], false, false, TUTORIAL.ConditionHatcheryClose);
                break;
            case 160:
                if (!TUTORIAL._secondWorker) {
                    TUTORIAL._stage = 169;
                    TUTORIAL.Advance();
                } else if (QUESTS._global.b3lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step51"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                }
                break;
            case 161:
                if (QUESTS._global.b3lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b1, MovieClip);
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step52"), new Point(216, 50), ["mc", _loc4_, new Point(60, 22), 170], false, false, TUTORIAL.ConditionBuildingsResources, TUTORIAL.ConditionRewindBuildingsClosedF);
                }
                break;
            case 162:
                if (QUESTS._global.b3lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step53"), new Point(363, 256), ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(356, 253), -155], false, false, TUTORIAL.ConditionBuildingsPutty, TUTORIAL.ConditionRewindBuildingsClosedF);
                }
                break;
            case 163:
                if (QUESTS._global.b3lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step54"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -120], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect3);
                }
                break;
            case 164:
                if (QUESTS._global.b3lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    QUEUE._placed = 0;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step55"), null, null, false, false, TUTORIAL.ConditionPlacedBuilding, TUTORIAL.ConditionRewindNoNewBuildingF);
                }
                break;
            case 170:
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step56"), TUTORIAL.POINT_BUILDINGS, ["mc", UI_BOTTOM._mc.bBuild, new Point(15, 15), -30], false, false, TUTORIAL.ConditionBuildingsOpen);
                }
                break;
            case 171:
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    _loc4_ = as3.as((as3.as(BUILDINGS._mc, BUILDINGSPOPUP)).b1, MovieClip);
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_171"), new Point(300, 300), ["mc", _loc4_, new Point(60, 22), 170], false, false, TUTORIAL.ConditionBuildingsResources, TUTORIAL.ConditionRewindBuildingsClosedG);
                }
                break;
            case 172:
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step57"), new Point(488, 245), ["mc", as3.as(as3.as(BUILDINGS._mc, BUILDINGSPOPUP), MovieClip), new Point(470, 240), -160], false, false, TUTORIAL.ConditionBuildingsGoo, TUTORIAL.ConditionRewindBuildingsClosedG);
                }
                break;
            case 173:
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step58"), new Point(595, 430 + TUTORIAL._isSmallSizeOffset * 0.7), ["mc", as3.as(as3.as(BUILDINGOPTIONS._do, BUILDINGOPTIONSPOPUP), MovieClip), new Point(500, 230), -30], false, false, TUTORIAL.ConditionNewBuilding, TUTORIAL.ConditionRewindBuildingsDeselect4);
                }
                break;
            case 174:
                if (QUESTS._global.b4lvl > 0) {
                    TUTORIAL.Advance();
                } else {
                    QUEUE._placed = 0;
                    TUTORIAL.Add(2, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step59"), null, null, false, false, TUTORIAL.ConditionPlacedGooFactory, TUTORIAL.ConditionRewindNoNewBuildingG);
                }
                break;
            case 180:
                TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step60"), new Point(205, -5), ["mc", TUTORIAL._mcBob.mcButton, new Point(200, 30), 150], true, true);
                break;
            case 181:
                TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step61"), new Point(205, -5), ["mc", TUTORIAL._mcBob.mcButton, new Point(200, 30), 150], true, true);
                break;
            case TUTORIAL.k_STAGE_DAMAGE_PROTECT:
                BASE._isProtected = (GLOBAL.Timestamp() + 604800) | 0;
                UI2.Update();
                TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step62"), new Point(740, 70), ["mc", UI2._top.mcProtected, new Point(5, 20), -160], true, true);
                break;
            case 191:
                TUTORIAL.Advance();
                break;
            case 192:
                if (GLOBAL._flags.viximo) {
                    TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step63"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._mc.bQuests, new Point(15, 15), -30], true, true);
                } else {
                    TUTORIAL.Add(1, TUTORIAL.BOBBOTTOMLEFTHIGH, KEYS.Get("tut_NWM_Step63"), TUTORIAL.POINT_QUEST, ["mc", UI_BOTTOM._missions, new Point(35, -150), -30], true, true);
                }
                break;
            case 193:
                UI_WORKERS.Show();
                BASE.Save();
                TUTORIAL.Advance();
                break;
            default:
                if (TUTORIAL._stage >= TUTORIAL._endstage) {
                    TUTORIAL._stage = TUTORIAL._endstage;
                } else {
                    TUTORIAL.Advance();
                }
        }
        if (STORE._open || BUILDINGS._open) {
            TUTORIAL.ShowStoreCB();
        }
    }

    public static ShowStoreCB(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: int = 0;
        let _loc4_: DisplayObject = null;
        let _loc5_: Point = null;
        let _loc6_: any[] = null;
        let _loc7_: any = undefined;
        let _loc8_: int = 0;
    }

    public static Add(param1: int, param2: Point, param3: string, param4: Point = null, param5: any[] = null, param6: boolean = false, param7: boolean = false, param8: Function = null, param9: Function = null): void {
        param2 = TUTORIAL.AdjustPoint(param2, "bob");
        TUTORIAL._mcBob.SetPos(param2.x | 0, param2.y | 0);
        TUTORIAL._mcBob.Say(param3, param7, param6);
        if (param6) {
            TUTORIAL._advanceCondition = null;
        } else {
            TUTORIAL._advanceCondition = param8;
        }
        TUTORIAL._rewindCondition = param9;
        if (TUTORIAL._stage < 200) {
            TUTORIAL._mcBob.mcButton.SetupKey("tut_next_btn");
        } else {
            TUTORIAL._mcBob.mcButton.SetupKey("tut_finish_btn");
        }
        if (param7) {
            TUTORIAL._mcBob.mcBlocker.visible = true;
        } else {
            TUTORIAL._mcBob.mcBlocker.visible = false;
        }
        TUTORIAL._mcBob.mcArrow.visible = false;
        if (param6) {
            if (TUTORIAL._stage <= 5) {
                TUTORIAL._mcBob.mcArrow.visible = true;
            }
            TUTORIAL._mcBob.mcButton.visible = true;
            TUTORIAL._mcBob.mcBubble.height = TUTORIAL._mcBob.mcText.height + 55;
            TUTORIAL._advanceCondition = null;
        } else {
            TUTORIAL._mcBob.mcButton.visible = false;
            TUTORIAL._mcBob.mcBubble.height = TUTORIAL._mcBob.mcText.height + 15;
            TUTORIAL._advanceCondition = param8;
        }
        TUTORIAL._mcBob.mcText.y = 0 - TUTORIAL._mcBob.mcBubble.height + 10;
        if (param4) {
            if (param5) {
                TUTORIAL._mcArrow.ResizeParams = param5;
                if (param5[0] == "mc" && param5[1] && param5[1] instanceof DisplayObject) {
                    if (param5[2] instanceof Point) {
                        param4 = TUTORIAL.AdjustPoint(param4, "mc", as3.cast(param5[1], DisplayObject), as3.cast(param5[2], Point));
                    } else {
                        param4 = TUTORIAL.AdjustPoint(param4, "mc", as3.cast(param5[1], DisplayObject));
                    }
                } else if (param5[0] == "percent" && param5[1] && param5[1] instanceof Point) {
                    TUTORIAL._mcArrow.SetPos(param4.x, param4.y);
                    param4 = TUTORIAL.AdjustPoint(param4, "percent");
                }
            } else {
                TUTORIAL._mcArrow.SetPos(param4.x, param4.y);
                param4 = TUTORIAL.AdjustPoint(param4, "hand");
                TUTORIAL._mcArrow.ResizeParams = null;
            }
        }
        if (param4) {
            TUTORIAL._mcArrow.x = param4.x;
            TUTORIAL._mcArrow.y = param4.y;
            TUTORIAL._mcArrow.Rotate();
            TUTORIAL._mcArrow.mcArrow.mcArrow.y = -82;
            TweenLite.to(TUTORIAL._mcArrow.mcArrow.mcArrow, 0.6, { "y": -72, "ease": Elastic.easeOut });
            TUTORIAL._doArrow = as3.cast(TUTORIAL._container.addChild(TUTORIAL._mcArrow), DisplayObject);
        }
        TUTORIAL._doBob = as3.cast(TUTORIAL._container.addChild(TUTORIAL._mcBob), DisplayObject);
        TUTORIAL._mcBob.Resize();
    }

    private static clickedFullScreen(param1: MouseEvent): void {
        TUTORIAL._mcBob.removeFullScreenButton();
        if (!GLOBAL.isFullScreen) {
            GLOBAL.goFullScreen(param1);
        }
        TUTORIAL.Advance(param1);
    }

    private static ConditionScroll(): void {
        if (MAP._dragDistance > 100) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionSelectTwig(): void {
        if (Boolean(GLOBAL._selectedBuilding) && GLOBAL._selectedBuilding._type != 1) {
            BASE.BuildingDeselect();
        }
        if (Boolean(GLOBAL._selectedBuilding) && GLOBAL._selectedBuilding._type == 1) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBank(): void {
        if (BASE._bankedValue > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionDeselectTwig(): void {
        if (!GLOBAL._selectedBuilding || GLOBAL._selectedBuilding._type != 1) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionQuestCollectQ1(): void {
        if (QUESTS._completed.Q1 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectQ2(): void {
        if (QUESTS._completed.Q2 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectU1(): void {
        if (QUESTS._completed.U1 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectT1(): void {
        if (QUESTS._completed.T1 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectD1(): void {
        if (QUESTS._completed.D1 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectWM1(): void {
        if (QUESTS._completed.WM1 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectCR3(): void {
        if (QUESTS._completed.CR3 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestCollectBunch(): void {
        if (QUESTS._completed.C17 == 2 && QUESTS._completed.C18 == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionPopupOpen(): void {
        if (POPUPS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionPopupClose(): void {
        if (!POPUPS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingOptionsOpen(): void {
        if (BUILDINGOPTIONS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingOptionsClose(): void {
        if (!BUILDINGOPTIONS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionStoreOpen(): void {
        if (STORE._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionStoreClose(): void {
        if (!STORE._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsOpen(): void {
        if (BUILDINGS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionMapRoomOpen(): void {
        if (MAPROOM._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsDefense(): void {
        if (BUILDINGS._open && BUILDINGS._menuA == 3) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsBuildings(): void {
        if (BUILDINGS._open && BUILDINGS._menuA == 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsResources(): void {
        if (BUILDINGS._open && BUILDINGS._menuA == 1) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsSniper(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 21) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsHatchery(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 13) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsHousing(): void {
        if (BUILDINGS._open && HOUSING.isHousingBuilding(BUILDINGS._buildingID)) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsPutty(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 3) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsGoo(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 4) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsFlinger(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 5) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingsMapRoom(): void {
        if (BUILDINGS._open && BUILDINGS._buildingID == 11) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionHatcheryProducing(): void {
        ++TUTORIAL._timer;
        if (Boolean((as3.as(GLOBAL._bHatchery, BUILDING13))._inProduction) && TUTORIAL._timer > 40 * 2) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionNewBuilding(): void {
        if (GLOBAL._newBuilding) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionPlacedBuilding(): void {
        if (QUEUE._placed > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionPlacedGooFactory(): void {
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING4);
        if (!_loc1_ || _loc1_.length <= 0) {
            return;
        }
        let _loc2_: BUILDING4 = as3.as(as3.vget(_loc1_, 0), BUILDING4);
        if (Boolean(_loc2_) && !_loc2_._placing) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionWorkerBusy(): void {
        if (QUEUE._workingCount > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionConstructed21(): void {
        if (QUESTS._global.b21lvl > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionConstructed15(): void {
        if (QUESTS._global.b15lvl > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionConstructed5(): void {
        if (QUESTS._global.b5lvl > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionConstructed11(): void {
        if (QUESTS._global.b11lvl > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionConstructed13(): void {
        if (QUESTS._global.b13lvl > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionAttackOver(): void {
        if (CREEPS._creepCount == 2) {
            CREEPS.Retreat();
        }
        if (!WMATTACK._inProgress) {
            TUTORIAL.Advance();
        }
    }

    private static Condition2Workers(): void {
        if (QUEUE._workerCount > 1) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingFlinger(): void {
        if (GLOBAL._bFlinger) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionBuildingMapRoom(): void {
        if (GLOBAL._bMap) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingOptionsClose(): void {
        if (!BUILDINGOPTIONS._open) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindNotUpgrading(): void {
        if (QUEUE._workingCount == 0) {
            TUTORIAL._stage = 9;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNotLevel2(): void {
        if (QUESTS._global.blvl < 2) {
            TUTORIAL._stage = 19;
            TUTORIAL.Advance();
        }
    }

    private static ConditionTimer5(): void {
        ++TUTORIAL._timer;
        if (TUTORIAL._timer == 40 * 3) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionTimer10(): void {
        ++TUTORIAL._timer;
        if (TUTORIAL._timer == 40 * 7) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionFightBack(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionReturnToYard(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionFlingerAdd15(): void {
        let _loc2_: SecNum = null;
        let _loc1_: int = 0;
        for (_loc2_ of as3.values(ATTACK._flingerBucket)) {
            _loc1_ = (_loc1_ + _loc2_.Get()) | 0;
        }
        if (_loc1_ >= 15) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionFlung(): void {
        if (CREEPS._creepCount > 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionCrushedEnemy(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        for (_loc3_ of as3.values(BASE._buildingsAll)) {
            if (_loc3_._class != "wall") {
                _loc1_ = (_loc1_ + _loc3_.health) | 0;
                _loc2_ += 1;
            }
        }
        if (_loc1_ <= 0) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionQuestsOpen(): void {
        if (QUESTS._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionHatcheryOpen(): void {
        if (HATCHERY._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionHatcheryClose(): void {
        if (!HATCHERY._open) {
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindDeselect(): void {
        if (!GLOBAL._selectedBuilding) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsClosed(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 30;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedB(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 49;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedC(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 61;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedD(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 89;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedE(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 139;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedF(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 159;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindBuildingsClosedG(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 169;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindQuestsClose(): void {
        if (!QUESTS._open) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindNoNewBuilding(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 31;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingB(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 51;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingC(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 61;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingD(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 89;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingE(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 139;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingF(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 159;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindNoNewBuildingG(): void {
        if (!GLOBAL._newBuilding) {
            TUTORIAL._stage = 169;
            TUTORIAL.Advance();
        }
    }

    private static ConditionRewindHatcheryClose(): void {
        if (!HATCHERY._open) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindStoreClosed(): void {
        if (!STORE._open) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect21(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 30;
            TUTORIAL.Advance();
        }
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect3(): void {
        TUTORIAL.ConditionRewindBuildingsClosedF();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect4(): void {
        TUTORIAL.ConditionRewindBuildingsClosedG();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect5(): void {
        TUTORIAL.ConditionRewindBuildingsClosedC();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect11(): void {
        TUTORIAL.ConditionRewindBuildingsClosedD();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect13(): void {
        TUTORIAL.ConditionRewindBuildingsClosedE();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselect15(): void {
        TUTORIAL.ConditionRewindBuildingsClosedB();
        if (BUILDINGS._buildingID == 0) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselectBuildingsC(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 64;
            TUTORIAL.Advance();
        }
        if (BUILDINGS._open && BUILDINGS._menuA != 2) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindBuildingsDeselectBuildingsD(): void {
        if (!BUILDINGS._open) {
            TUTORIAL._stage = 89;
            TUTORIAL.Advance();
        }
        if (BUILDINGS._open && BUILDINGS._menuA != 2) {
            TUTORIAL.Rewind();
        }
    }

    private static ConditionRewindMapClosed(): void {
        if (!MAPROOM._open) {
            TUTORIAL._stage = 99;
            TUTORIAL.Advance();
        }
    }

    private static AdjustPoint(param1: Point = null, param2: string = "", param3: DisplayObject = null, param4: Point = null): Point {
        let _loc5_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: DisplayObject = null;
        let _loc6_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc7_: Point = param1;
        let _loc8_: Point = param4;
        if (param2 == "percent") {
            if (param1) {
                _loc7_.x = Math.floor(param1.x * (GLOBAL._SCREEN.width / GLOBAL._SCREENINIT.width));
            }
        } else if (param2 == "mc" && Boolean(param3)) {
            _loc9_ = param3.x | 0;
            _loc10_ = param3.y | 0;
            _loc11_ = param3.parent;
            if (_loc11_) {
                while (_loc11_.parent) {
                    _loc9_ = (_loc9_ + _loc11_.x) | 0;
                    _loc10_ = (_loc10_ + _loc11_.y) | 0;
                    if (_loc11_.parent == GLOBAL._ROOT.stage) {
                        break;
                    }
                    _loc11_ = _loc11_.parent;
                }
            }
            if (_loc8_) {
                _loc9_ = (_loc9_ + _loc8_.x) | 0;
                _loc10_ = (_loc10_ + _loc8_.y) | 0;
            }
            _loc7_ = new Point(_loc9_, _loc10_);
        } else if (param1) {
            if (param1.x > 470 && param1.y > 385) {
                _loc5_ = (GLOBAL._SCREEN.width - param1.x) | 0;
                param1.x = GLOBAL._SCREEN.width + (_loc6_ - GLOBAL._SCREEN.width) * 0.5 - _loc5_;
            } else if (param1.x < 465 && param1.y > 358) {
                param1.x -= (_loc6_ - GLOBAL._SCREEN.width) * 0.5;
            } else if (param1.x < 150 && param1.y < 230) {
                param1.x -= (_loc6_ - GLOBAL._SCREEN.width) * 0.5;
            } else if (param1.x > 470 && param1.y > 385) {
                _loc5_ = (GLOBAL._SCREEN.width - param1.x) | 0;
                param1.x = GLOBAL._SCREEN.width + (_loc6_ - GLOBAL._SCREENINIT.width) * 0.5 - _loc5_;
            }
            _loc7_ = param1;
        }
        return _loc7_;
    }

    public static Resize(): void {
        if (TUTORIAL._stage < TUTORIAL._endstage) {
            if (TUTORIAL._mcBob) {
                TUTORIAL._mcBob.Resize();
            }
            if (TUTORIAL._mcArrow) {
                TUTORIAL._mcArrow.Resize();
            }
        }
    }
}
