import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { AIATTACKPOPUP, AOEDamageOnAttackOncePerTarget, ATTACK, BASE, BFOUNDATION, BTOWER, BTRAP, BUILDING27, CREATURELOCKER, CREEPS, CUSTOMATTACKS, Enrage, GLOBAL, GRID, HATCHERY, HATCHERYCC, INFERNO_EMERGENCE_EVENT, INFERNO_EMERGENCE_PROCESS, IPROCESS, ImageCache, InstanceManager, IoAttackLogs, IoChangelog, IoLeaderboards, IoOutpostsPopup, IoQuests, IoTestMode, KEYS, LOGGER, MAP, MONSTERBAITER, MapRoomManager, MonsterBase, PATHING, PLANNER, POPUPS, PROCESS3, PROCESS4, PROCESS5, PROCESS7, PROCESS_INFERNO1, QUESTS, Rndm, SOUNDS, SPECIALEVENT, SPRITES, STORE, Solution, TRIBES, TUTORIAL, Targeting, TemporaryComponent, UI2, WMBASE, WaveObj, frame, popup_attacksettings } from "@game";

export class WMATTACK extends ASObject {
    public static _history: any = null;

    public static _lastClick: int = 0;

    public static _solutions: Vector<Solution> = null;

    private static solsProcessed: int = 0;

    public static _attackResolution: int = 16;

    private static processStepResolution: int = 3;

    public static _isAI: boolean = true;

    public static _inProgress: boolean = false;

    public static _damageBias: int = 200;

    public static _processing: boolean = false;

    public static _monsterKeys: any[] = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15"];

    public static _looters: any[] = ["C3", "C9", "C14"];

    public static _dps: any[] = ["C1", "C4", "C7", "C8", "C11", "C11"];

    public static _tanks: any[] = ["C2", "C6", "C10", "C12"];

    public static _anything: any[] = ["C1", "C4", "C7", "C8", "C12"];

    public static _fodder: any[] = ["C1", "C1", "C1", "C3", "C8", "C9"];

    public static _kamikaze: any[] = ["C5"];

    public static _infernoMonsterKeys: any[] = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8"];

    public static _infernoLooters: any[] = ["IC3", "IC3", "IC3", "IC6"];

    public static _infernoDps: any[] = ["IC1", "IC1", "IC2", "IC3", "IC4", "IC6", "IC7", "IC8"];

    public static _infernoTanks: any[] = ["IC2", "IC2", "IC2", "IC2", "IC7"];

    public static _infernoAnything: any[] = ["IC1", "IC1", "IC1", "IC1", "IC8"];

    public static _infernoHunters: any[] = ["IC1", "IC1", "IC2", "IC5"];

    public static _infernoFodder: any[] = ["IC1", "IC1", "IC1", "IC2", "IC3"];

    public static _infernoKamikaze: any[] = ["IC4"];

    public static _sessionsBetweenAttacks: int = 4;

    public static _minAdvanceWarningTime: int = 30;

    public static _maxAdvanceWarningTime: int = 600;

    public static _attackVolumeAmplifier: number = 1;

    public static _trojanThreshold: number = 2000000;

    public static _hitsPerCreep: number = 30;

    private static attackPreference: int = 0;

    private static intelligence: number = 0.1;

    private static quickly: boolean = false;

    public static _trojan: boolean = false;

    public static _queued: any = null;

    public static warningPopup: AIATTACKPOPUP = null;

    private static t: number = 0;

    private static baseIsRepairing: boolean = true;

    public static readonly TYPE_LOOT: int = 1;

    public static readonly TYPE_DAMAGE: int = 2;

    public static readonly TYPE_TOWERS: int = 3;

    public static readonly TYPE_SWARM: int = 4;

    public static readonly TYPE_KAMIKAZE: int = 5;

    public static readonly TYPE_DAVE: int = 6;

    public static readonly TYPE_NERD: int = 7;

    public static processor: IPROCESS = null;

    public static _type: int = WMATTACK.TYPE_TOWERS;

    public static _attackersBaseID: int = 1;

    public static _rage: int = 0;

    public static _enabled: boolean = false;

    private static _cleanUpFunc: Function = null;

    private static _pointPool: Vector<Point> = new Vector<Point>(0, false, Point);

    private static _poolIndex: int = 0;

    private static _rngCache: any = {};

    // ---------------------------------------------------------------------------------------------
    // Inferno-only wild tribe attacks (server config wildAttacks, flag io_wildattacks): at most one a
    // day per player (io_wildlast: the last start on any of the player's yards), a tribe chosen at
    // random (Moloch by `molochChance`, the others evenly), and a fixed list of monsters per tribe and
    // player-level band, spawned at the listed level. The planner (PROCESS_INFERNO1) still picks the
    // side they come from and where they aim.
    // ---------------------------------------------------------------------------------------------
    /** The attack being planned: {tribe, level, monsters}. Read by PROCESS_INFERNO1.ProcessC. */
    public static _ioPlan: any = null;

    private static _ioSpawnLevel: int = 0;

    private static _ioWildRaw: string = null;

    private static _ioWildParsed: any = null;

    private static readonly IO_TRIBES: any[] = [["legionnaire", 1, WMATTACK.TYPE_TOWERS], ["kozu", 11, WMATTACK.TYPE_SWARM], ["abunakki", 21, WMATTACK.TYPE_KAMIKAZE], ["dreadnaut", 31, WMATTACK.TYPE_NERD]];

    /** When the game started (getTimer), set on the first yard of the session; -1 before that. */
    private static _ioLoginAt: int = -1;

    private static readonly IO_LOGIN_GRACE_MS: int = 60000;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: any): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            WMATTACK._enabled = true;
            if (param1 == null) {
                param1 = {};
            }
            WMATTACK._history = param1;
            if (!WMATTACK._history.sessionsSinceLastAttack) {
                WMATTACK._history.sessionsSinceLastAttack = 0;
            }
            if (!WMATTACK._history || WMATTACK._history.currentid != null) {
                WMATTACK._history = {};
            }
            if (!WMATTACK._history.lastattack) {
                WMATTACK._history.lastattack = 0;
            }
            if (!WMATTACK._history.attackPreference) {
                WMATTACK._history.attackPreference = 0;
            }
            WMATTACK._history.sessionsSinceLastAttack += 1;
            if (GLOBAL._aiDesignMode) {
                WMATTACK._sessionsBetweenAttacks = 1;
            }
            WMATTACK._inProgress = false;
            WMATTACK.setEnd();
            if (WMATTACK._history["s1"]) {
                if (WMATTACK._history["s1"].length == 2 && WMATTACK._history["s1"][0] == 1) {
                    WMATTACK._history["s1"][2] = 0;
                }
                if (WMATTACK._history["s1"][0] == 1 && WMATTACK._history["s1"][2] == 0) {
                    WMATTACK._trojan = true;
                }
                if (WMATTACK._history["s1"][0] == 1 && WMATTACK._history.queued != undefined && WMATTACK._history["s1"][2] == 0) {
                    delete WMATTACK._history.queued;
                }
            }
            if (WMATTACK._history.queued != undefined && WMATTACK._history.queued.type != undefined && WMATTACK._history.queued.t != undefined) {
                WMATTACK._queued = WMATTACK._history.queued;
                WMATTACK._type = WMATTACK._queued.type | 0;
                WMATTACK._attackersBaseID = WMATTACK._queued.t | 0;
                if (WMATTACK._queued.warned == undefined) {
                    WMATTACK._queued.warned = 0;
                }
            }
            if (GLOBAL.INFERNO_ONLY && Boolean(WMATTACK._queued) && Boolean(WMATTACK._queued.attack)) {
                // A raid planned before the fix above may be waiting in the save: drop it if it brings
                // anything but Inferno monsters, and a new one is planned in its place.
                for (let ioKey in WMATTACK._queued.attack) {
                    if (!BASE.isInfernoCreep(ioKey)) {
                        WMATTACK._queued = null;
                        delete WMATTACK._history.queued;
                        break;
                    }
                }
            }
            if (Boolean(WMATTACK._queued) && Boolean(WMATTACK._queued.attack)) {
                if (WMATTACK._queued.attack.C100) {
                    WMATTACK._queued.attack.C12 = WMATTACK._queued.attack.C100;
                    delete WMATTACK._queued.attack.C100;
                }
                if (WMATTACK._queued.distances.C100) {
                    WMATTACK._queued.distances.C12 = WMATTACK._queued.distances.C100;
                    delete WMATTACK._queued.distances.C100;
                }
            }
            if (GLOBAL.Timestamp() - WMATTACK._history.lastattack > 345600) {
                if (WMATTACK._history["s1"]) {
                    if (WMATTACK._history["s1"][0] != 1) {
                        WMATTACK._history.nextAttack = new Date().getTime() / 1000 + 60;
                    }
                } else {
                    WMATTACK._history.nextAttack = new Date().getTime() / 1000 + 60;
                }
            } else if (WMATTACK._history.nextAttack == undefined) {
                WMATTACK._attackPreference = WMATTACK._history.attackPreference | 0;
            }
            if (WMATTACK._ioLoginAt < 0) {
                WMATTACK._ioLoginAt = getTimer();
            }
            if (WMATTACK.ioWild() != null) {
                // Inferno: one a day per player; the first check a minute after the yard opens.
                WMATTACK._history.nextAttack = Math.max(WMATTACK.ioNextAttackTime(), GLOBAL.Timestamp() + 60);
                if (WMATTACK._queued != null && !BASE.isMainYardOrInfernoMainYard) {
                    // Only the main yard is attacked: an attack waiting in an outpost's save is dropped.
                    WMATTACK._queued = null;
                    delete WMATTACK._history.queued;
                }
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP) {
            WMATTACK._history = param1;
        }
    }

    public static DoTests(param1: int = -1): void {
        switch (param1) {
            case -1:
                return;
            case 0:
                WMATTACK._history.sessionsSinceLastAttack = 300;
                WMATTACK._history.lastattack = 20;
                WMATTACK._history.queued = { "attack": { "C1": 10 }, "attackTime": GLOBAL.Timestamp() + 10, "degrees": 0, "distances": { "C1": 300 } };
                break;
            case 1:
                WMATTACK._history.sessionsSinceLastAttack = 300;
                WMATTACK._history.lastattack = 20;
                if (WMATTACK._history.queued) {
                    delete WMATTACK._history.queued;
                }
                break;
            case 2:
                WMATTACK._history.sessionsSinceLastAttack = 300;
                WMATTACK._history.lastattack = 20;
                delete WMATTACK._history.nextAttack;
                delete WMATTACK._history["s1"];
                delete WMATTACK._history.queued;
                WMATTACK._trojanThreshold = 0;
                WMATTACK._history.nextAttack = GLOBAL.Timestamp() + 10;
                break;
            case 3:
                WMATTACK._history.sessionsSinceLastAttack = 300;
                WMATTACK._history.lastattack = 20;
                WMATTACK._history.nextAttack = GLOBAL.Timestamp() + 10;
                delete WMATTACK._history.queued;
                break;
            case 4:
                delete WMATTACK._history["s1"];
                break;
            case 5:
                delete WMATTACK._history["s1"];
                WMATTACK._trojanThreshold = 10;
                WMATTACK._history.lastattack = 20;
                WMATTACK._history.sessionsSinceLastAttack = 20;
                break;
            case 6:
                WMATTACK._history = JSON.parse("{\"sessionsSinceLastAttack\":45,\"attackPreference\":0,\"queued\":{\"attack\":{\"C10\":27,\"C7\":13},\"warned\":1,\"degrees\":180,\"attackTime\":1284677486,\"distances\":{\"C10\":275,\"C7\":275}},\"lastattack\":1284676962,\"nextAttack\":1284612571,\"s1\":[1,1284676962,1]}");
        }
    }

    public static set enabled(param1: boolean) {
        WMATTACK._enabled = param1;
    }

    /** Inferno-only: give up on the raid being planned (its planner threw). The next one is planned afresh. */
    public static ioAbandon(): void {
        try {
            WMATTACK.processor = null;
            WMATTACK._queued = null;
            if (WMATTACK._history) {
                delete WMATTACK._history.queued;
                WMATTACK._history.nextAttack = GLOBAL.Timestamp() + 6 * 60 * 60;
            }
        } catch (e) {
        }
    }

    public static Tick(): void {
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let a: int = 0;
        let _loc5_: any = null;
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        // Inferno-only: nothing attacks a Designer draft (GLOBAL.ioDesign).
        if (GLOBAL.ioDesignMode()) {
            return;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            activeEvent.Tick();
            if (WMATTACK.t % 10 == 0) {
                _loc1_ = 0;
                WMATTACK.baseIsRepairing = false;
                _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc3_ of (_loc2_ ?? [])) {
                    if (!(_loc3_ instanceof BTRAP === false || _loc3_ instanceof BTOWER === false)) {
                        _loc1_++;
                        if (_loc3_.health < _loc3_.maxHealth) {
                            WMATTACK.baseIsRepairing = true;
                        }
                    }
                }
                if (!BASE.isMainYard && _loc1_ < 10) {
                    WMATTACK.baseIsRepairing = true;
                }
            }
            WMATTACK.t += 1;

            let isCheckTick: boolean = WMATTACK.t == 100;
            let noTrojanHistory: boolean = !WMATTACK._history["s1"];
            let trojanNotPlaced: boolean = !BUILDING27._exists;
            let meetsLevelReq: boolean = BASE._baseLevel >= 9;
            let meetsPointsReq: boolean = (BASE._basePoints | 0) + (BASE._baseValue | 0) > WMATTACK._trojanThreshold;

            if (isCheckTick && BASE.isMainYard && noTrojanHistory && trojanNotPlaced && meetsLevelReq && meetsPointsReq) {
                CUSTOMATTACKS.TrojanHorse();
                if (BUILDING27._exists) {
                    WMATTACK._history["s1"] = [2, GLOBAL.Timestamp()];
                    BASE.Save();
                }
            }
            if (WMATTACK._queued != null && !WMATTACK._inProgress && WMATTACK.ioSettled()) {
                if (!GLOBAL._catchup && !WMATTACK.warningPopup && !WMATTACK._trojan && WMATTACK._queued.warned == 0 && !WMATTACK.baseIsRepairing && BASE._isSanctuary <= GLOBAL.Timestamp() && WMATTACK._enabled && !activeEvent.EventActive() && !INFERNO_EMERGENCE_EVENT.ShouldRunEvent() && !PLANNER.isOpen()) {
                    WMATTACK.ShowWarning();
                }
                if (!GLOBAL._catchup && !WMATTACK._trojan && WMATTACK._queued.warned == 1 && !UI2._wildMonsterBar && !WMATTACK._inProgress && !WMATTACK.baseIsRepairing && BASE._isSanctuary <= GLOBAL.Timestamp() && WMATTACK._enabled && !activeEvent.EventActive() && !INFERNO_EMERGENCE_EVENT.ShouldRunEvent()) {
                    UI2.Show("wmbar");
                } else if (WMATTACK.baseIsRepairing && !GLOBAL._catchup) {
                    WMATTACK._queued = null;
                    delete WMATTACK._history.queued;
                    if (UI2._wildMonsterBar) {
                        UI2.Hide("wmbar");
                    }
                }
                if (!WMATTACK.baseIsRepairing && WMATTACK._queued.attackTime <= GLOBAL.Timestamp() && WMATTACK._enabled && !PLANNER.isOpen() && BASE._isSanctuary <= GLOBAL.Timestamp()) {
                    if (!WMATTACK._inProgress && !CUSTOMATTACKS._started && !WMATTACK.baseIsRepairing) {
                        WMATTACK.LaunchQueuedAttack();
                    }
                } else if (Boolean(UI2._wildMonsterBar) && !WMATTACK.baseIsRepairing) {
                    UI2._wildMonsterBar.eta_txt.htmlText = KEYS.Get("ai_eta", { "v1": GLOBAL.ToTime((WMATTACK._queued.attackTime - GLOBAL.Timestamp()) | 0) });
                }
            } else if (!WMATTACK._inProgress) {
                if (!GLOBAL._catchup && WMATTACK.ioAttackDue() && !WMATTACK.baseIsRepairing && !WMATTACK._processing && !WMATTACK._trojan && BASE._isSanctuary <= GLOBAL.Timestamp() && WMATTACK._enabled && !PLANNER.isOpen() && !activeEvent.EventActive() && !INFERNO_EMERGENCE_EVENT.ShouldRunEvent()) {
                    WMATTACK._processing = true;
                    WMATTACK.Trigger();
                }
            } else if (WMATTACK._inProgress) {
                if (CREEPS._creepCount == 0 && (!activeEvent.active || activeEvent.AllWavesSpawned())) {
                    WMATTACK._cleanUpFunc();
                } else if (GLOBAL.Timestamp() % 10 == 0) {
                    a = 0;
                    for (_loc5_ of as3.values(CREEPS._creeps)) {
                        if (_loc5_._behaviour == GLOBAL.e_BASE_MODE.ATTACK || _loc5_._behaviour == "bounce" || _loc5_._behaviour == "loot" || _loc5_._behaviour == "heal" || _loc5_._behaviour == "buff" || _loc5_._behaviour == "hunt") {
                            a++;
                        }
                    }
                    if (a == 0 && (!activeEvent.active || activeEvent.AllWavesSpawned())) {
                        WMATTACK._cleanUpFunc();
                    }
                }
            }
        }
    }

    public static ShowWarning(): void {
        if (!WMATTACK.warningPopup) {
            WMATTACK.warningPopup = new AIATTACKPOPUP(WMATTACK._queued.type | 0);
            GLOBAL._layerWindows.addChild(WMATTACK.warningPopup);
            WMATTACK.PreloadAttackers();
            BASE.Save();
        }
    }

    public static PreloadAttackers(): void {
        let _loc1_: string = null;
        for (_loc1_ in WMATTACK._queued.attack) {
            if (WMATTACK._queued.attack[_loc1_] > 0) {
                ImageCache.GetImageWithCallBack(as3.str(SPRITES._sprites[_loc1_].key));
            }
        }
    }

    public static HideWarning(): void {
        if (WMATTACK.warningPopup) {
            if (WMATTACK.warningPopup.parent) {
                WMATTACK.warningPopup.parent.removeChild(WMATTACK.warningPopup);
            }
            WMATTACK.warningPopup = null;
        }
    }

    public static ShowAttackSettings(): void {
        let asp: popup_attacksettings = null;
        asp = null;
        let onImage: Function = null;
        let onMoreDown: Function = null;
        let onSameDown: Function = null;
        let onLessDown: Function = null;
        let closeDown: Function = null;
        onImage = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            asp.mcImage.addChild(_loc3_);
        };
        onMoreDown = (param1: MouseEvent): void => {
            SOUNDS.Play("click1");
            WMATTACK._attackPreference = 1;
            POPUPS.Next();
            BASE.Save();
        };
        onSameDown = (param1: MouseEvent): void => {
            SOUNDS.Play("click1");
            WMATTACK._attackPreference = 0;
            POPUPS.Next();
            BASE.Save();
        };
        onLessDown = (param1: MouseEvent): void => {
            SOUNDS.Play("click1");
            WMATTACK._attackPreference = -1;
            POPUPS.Next();
            BASE.Save();
        };
        closeDown = (param1: MouseEvent = null): void => {
            SOUNDS.Play("close");
            POPUPS.Next();
            BASE.Save();
        };
        asp = new popup_attacksettings();
        asp.title_txt.htmlText = KEYS.Get("ai_settings_title");
        asp.bMore.SetupKey("ai_settings_more_btn");
        asp.bSame.SetupKey("ai_settings_same_btn");
        asp.bLess.SetupKey("ai_settings_less_btn");
        asp.bMore.addEventListener(MouseEvent.CLICK, onMoreDown);
        asp.bLess.addEventListener(MouseEvent.CLICK, onLessDown);
        asp.bSame.addEventListener(MouseEvent.CLICK, onSameDown);
        (as3.as(asp.mcFrame, frame)).Setup(true, closeDown);
        asp.taunt_txt.htmlText = "<b>" + TRIBES.TribeForBaseID(WMATTACK._attackersBaseID).taunt + "</b>";
        ImageCache.GetImageWithCallBack(as3.str(TRIBES.TribeForBaseID(WMATTACK._attackersBaseID).splash), onImage);
        POPUPS.Push(asp);
    }

    public static Export(): any {
        return WMATTACK._history;
    }

    public static TriggerType(param1: int): void {
        let _loc2_: any = null;
        switch (param1) {
            case 1:
                _loc2_ = PROCESS3;
                WMATTACK._type = WMATTACK.TYPE_TOWERS;
                break;
            case 2:
                WMATTACK._type = WMATTACK.TYPE_SWARM;
                _loc2_ = PROCESS4;
                break;
            case 3:
                WMATTACK._type = WMATTACK.TYPE_KAMIKAZE;
                _loc2_ = PROCESS5;
                break;
            case 4:
                WMATTACK._type = WMATTACK.TYPE_NERD;
                _loc2_ = PROCESS7;
                break;
            case INFERNO_EMERGENCE_PROCESS.TYPE:
                WMATTACK._type = WMATTACK.TYPE_TOWERS;
                _loc2_ = INFERNO_EMERGENCE_PROCESS;
        }
        WMATTACK._attackersBaseID = 1;
        WMATTACK.processor = as3.cast(new _loc2_(), IPROCESS);
        WMATTACK.processor.Trigger(1);
    }

    public static Trigger(param1: boolean = false, param2: number = 1): void {
        let _loc3_: any = null;
        let _loc4_: any = null;
        let _loc5_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL._render && POPUPS.Done()) {
            WMATTACK.intelligence = param2;
            WMATTACK.quickly = param1;
            WMATTACK._ioPlan = null;
            if (WMATTACK.ioWild() != null && BASE.isInfernoMainYardOrOutpost && WMATTACK.ioChooseTribe()) {
                _loc3_ = PROCESS_INFERNO1;
            } else if (Boolean(WMBASE._bases) && WMBASE._bases.length > 0) {
                for (_loc4_ of as3.values(WMBASE._bases)) {
                    if (_loc4_.destroyed == 0 && _loc4_.level >= BASE._baseLevel - 10) {
                        WMATTACK._attackersBaseID = _loc4_.baseid | 0;
                        if (BASE.isInfernoMainYardOrOutpost) {
                            WMATTACK._type = WMATTACK.TYPE_SWARM;
                            _loc3_ = PROCESS_INFERNO1;
                        } else {
                            WMATTACK._type = _loc4_.tribe.type | 0;
                            _loc3_ = _loc4_.tribe.process;
                        }
                        break;
                    }
                }
            } else if (BASE.isInfernoMainYardOrOutpost) {
                // Map Room 2 has no list of neighbouring tribe bases, so the stock game falls through
                // to "pick one of the four overworld tribes at random" and an Inferno yard was being
                // raided by Pokeys and Octo-oozes. An Inferno yard is raided from the Inferno: the
                // planner the original Inferno used, under Moloch's name.
                WMATTACK._type = WMATTACK.TYPE_SWARM;
                _loc3_ = PROCESS_INFERNO1;
                WMATTACK._attackersBaseID = TRIBES.M_IDS[0] | 0;
            } else {
                _loc5_ = (((Math.random() * 4) | 0) + 1) | 0;
                WMATTACK._attackersBaseID = (_loc5_ * 10) | 0;
                switch (_loc5_) {
                    case 1:
                        WMATTACK._type = WMATTACK.TYPE_TOWERS;
                        _loc3_ = PROCESS3;
                        break;
                    case 2:
                        WMATTACK._type = WMATTACK.TYPE_SWARM;
                        _loc3_ = PROCESS4;
                        break;
                    case 3:
                        WMATTACK._type = WMATTACK.TYPE_KAMIKAZE;
                        _loc3_ = PROCESS5;
                        break;
                    case 4:
                        WMATTACK._type = WMATTACK.TYPE_NERD;
                        _loc3_ = PROCESS7;
                }
            }
            if (!_loc3_) {
                _loc3_ = PROCESS3;
                WMATTACK._type = WMATTACK.TYPE_TOWERS;
                WMATTACK._attackersBaseID = 1;
            }
            WMATTACK.processor = as3.cast(new _loc3_(), IPROCESS);
            WMATTACK.processor.Trigger(WMATTACK.intelligence);
        }
    }

    public static Queue(param1: Solution): void {
        let _loc2_: int = 0;
        if (!WMATTACK.quickly) {
            _loc2_ = 300;
        } else {
            _loc2_ = 5;
        }
        let _loc3_: int = (BASE._basePoints + BASE._baseValue) | 0;
        WMATTACK._queued = { "type": WMATTACK._type, "attack": param1.attack, "attackTime": GLOBAL.Timestamp() + _loc2_, "degrees": param1.degrees, "distances": param1.distances, "warned": 0, "t": WMATTACK._attackersBaseID };
        if (WMATTACK._ioPlan) {
            WMATTACK._queued.level = WMATTACK._ioPlan.level | 0;
        }
        if (_loc3_ > WMATTACK._trojanThreshold && !WMATTACK._history["s1"] && !BASE.isMainYard) {
            WMATTACK._trojan = true;
            WMATTACK._history["s1"] = [1, GLOBAL.Timestamp(), 0];
            WMATTACK._queued.attackTime = GLOBAL.Timestamp();
        } else {
            WMATTACK._history.queued = WMATTACK._queued;
        }
        WMATTACK._processing = false;
        BASE.Save();
    }

    public static PreemptQueue(): void {
        // (bug report #61: "Send now" pressed again once the attack had started, nothing queued any more)
        if (!WMATTACK._queued) {
            if (UI2._wildMonsterBar) {
                UI2.Hide("wmbar");
            }
            return;
        }
        WMATTACK._queued.attackTime = GLOBAL.Timestamp();
        WMATTACK._type = !(!WMATTACK._queued.type) ? WMATTACK._queued.type | 0 : 1;
        BASE.Save(0, false, true);
        WMATTACK.Tick();
    }

    public static LaunchQueuedAttack(): void {
        if (WMATTACK.ioWild() != null && GLOBAL.Timestamp() < WMATTACK.ioNextAttackTime()) {
            // Another of the player's yards was attacked since this one was planned.
            WMATTACK._queued = null;
            delete WMATTACK._history.queued;
            if (UI2._wildMonsterBar) {
                UI2.Hide("wmbar");
            }
            WMATTACK.HideWarning();
            WMATTACK._history.nextAttack = WMATTACK.ioNextAttackTime();
            return;
        }
        WMATTACK._ioSpawnLevel = WMATTACK._queued && WMATTACK._queued.level ? WMATTACK._queued.level | 0 : 0;
        PATHING.ResetCosts();
        WMATTACK.SendAttack(WMATTACK._queued.attack, Number(WMATTACK._queued.degrees), WMATTACK._queued.distances);
    }

    public static SendAttack(param1: any, param2: number, param3: any): void {
        let _loc8_: string = null;
        let _loc14_: any[] = null;
        let _loc15_: any[] = null;
        let _loc16_: any = undefined;
        if (WMATTACK._history) {
            if (WMATTACK._history["s1"] && WMATTACK._history["s1"][0] == 1 && WMATTACK._history["s1"][2] == 0 && !BASE.isInfernoMainYardOrOutpost) {
                WMATTACK._history["s1"][2] = 1;
                WMATTACK._history.lastattack = GLOBAL.Timestamp();
                WMATTACK._trojan = true;
                WMATTACK._queued = null;
                delete WMATTACK._history.queued;
                CUSTOMATTACKS.TrojanHorse();
                return;
            }
        }
        WMATTACK.AttackB();
        WMATTACK.AttackC();
        WMATTACK._history.lastattack = GLOBAL.Timestamp();
        WMATTACK._isAI = true;
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicipanic");
        } else {
            SOUNDS.PlayMusic("musicpanic");
        }
        let _loc4_: any[] = [];
        let _loc5_: any[] = [];
        let _loc6_: any[] = [];
        let _loc7_: any[] = [];
        let _loc9_: any = {};
        let _loc10_: any = {};
        let _loc11_: any = {};
        let _loc12_: any = {};
        let _loc13_: number = param2;
        _loc13_ = param2;
        for (_loc8_ in param1) {
            _loc7_.push([_loc8_, "bounce", param1[_loc8_], param3[_loc8_], _loc13_, 0, 0]);
        }
        _loc14_ = WMATTACK.SpawnA(_loc7_);
        for (_loc15_ of as3.values(_loc14_)) {
            for (_loc16_ of as3.values(_loc15_)) {
                _loc16_._hitLimit = WMATTACK._hitsPerCreep;
            }
        }
        if (_loc14_.length > 0 && _loc14_[0].length > 0) {
            MAP.FocusTo(_loc14_[0][0].x | 0, _loc14_[0][0].y | 0, 1);
        }
    }

    public static Attack(param1: string = ""): void {
        WMATTACK.PreemptQueue();
    }

    public static SpawnWave(param1: WaveObj, param2: int): any[] {
        let _loc5_: Point = null;
        let _loc6_: Point = null;
        let _loc7_: any[] = null;
        let _loc3_: int = getTimer();
        let _loc4_: any[] = [];
        let _loc8_: int = 3;
        let _loc9_: int = (param1.direction + param2) | 0;
        let _loc10_: int = 250;
        _loc5_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * (800 + _loc10_ / 2), Math.sin(_loc9_ * 0.0174532925) * (800 + _loc10_ / 2), 0);
        _loc6_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * 900, Math.sin(_loc9_ * 0.0174532925) * 900, 0);
        if (param1.powerLevel) {
            GLOBAL._wmCreaturePowerups[param1.creatureID] = param1.powerLevel;
        }
        _loc7_ = WMATTACK.SpawnCreep(_loc5_, _loc10_, param1.creatureID, param1.numCreep, param1.behavior, param1.level);
        _loc4_.push(_loc7_);
        if (param1.cameraFocus) {
            MAP.FocusTo(_loc6_.x | 0, _loc6_.y | 0, 1, 0, 0, true);
        }
        return _loc4_;
    }

    public static SpawnCreep(param1: Point, param2: int, param3: string, param4: int, param5: string, param6: int = 0): any[] {
        let _loc7_: number = NaN;
        let _loc8_: int = 0;
        let _loc9_: Point = null;
        let _loc10_: MonsterBase = null;
        let _loc11_: Rndm = new Rndm(((param1.x + param1.y) | 0) >>> 0);
        param1 = GRID.FromISO(param1.x, param1.y);
        let _loc12_: any[] = [];
        let _loc13_: int = 0;
        while (_loc13_ < param4) {
            _loc7_ = _loc11_.random() * 360 * 0.0174532925;
            _loc8_ = (_loc11_.random() * param2 / 2) | 0;
            _loc9_ = param1.add(new Point(Math.cos(_loc7_) * _loc8_, Math.sin(_loc7_) * _loc8_));
            if (param3.substr(0, 1) == "G") {
                _loc10_ = CREEPS.SpawnGuardian(Number(param3.substr(1)) | 0, MAP._BUILDINGTOPS, "bounce", param6, GRID.ToISO(_loc9_.x, _loc9_.y, 0), _loc11_.random() * 360, int.MAX_VALUE, 0, 3, true);
            } else {
                _loc10_ = CREEPS.Spawn(param3, MAP._BUILDINGTOPS, "bounce", GRID.ToISO(_loc9_.x, _loc9_.y, 0), _loc11_.random() * 360);
            }
            _loc10_._hitLimit = int.MAX_VALUE;
            if (WMATTACK._rage) {
                _loc10_.addComponent(new TemporaryComponent(new Enrage(2, 0), WMATTACK._rage));
            }
            _loc12_.push(_loc10_);
            _loc13_++;
        }
        return _loc12_;
    }

    /*
     * Retrieves a Point object from the object pool, creating new ones only when necessary.
     * This reduces garbage collection overhead during high-volume spawning by reusing
     * Point instances instead of creating new objects.
     *
     * @param x The x coordinate to set on the pooled Point
     * @param y The y coordinate to set on the pooled Point
     * @return A Point object with the specified coordinates (may be recycled from pool)
     *
     */
    private static getPooledPoint(x: number, y: number): Point {
        if (WMATTACK._poolIndex >= WMATTACK._pointPool.length) {
            WMATTACK._pointPool.push(new Point());
        }
        let point: Point = as3.vget(WMATTACK._pointPool, WMATTACK._poolIndex++);
        point.x = x;
        point.y = y;
        return point;
    }

    public static SpawnA(param1: any[]): any[] {
        let _loc4_: Point = null;
        let _loc5_: Point = null;
        let _loc6_: any[] = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc2_: int = getTimer();
        let _loc3_: any[] = [];
        let _loc7_: int = 3;
        let _loc8_: int = 0;

        WMATTACK._poolIndex = 0;

        while (_loc8_ < param1.length) {
            _loc9_ = param1[_loc8_][4] | 0;
            if (WMATTACK._type == WMATTACK.TYPE_SWARM) {
                _loc10_ = 0;
                // Groups of three along an arc. The last group is the remainder: the stock code sent a
                // full group and then the remainder again, so 8 Spurtz came as 11.
                while (_loc10_ < param1[_loc8_][2]) {
                    _loc9_ += 8;
                    _loc4_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), Math.sin(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), 0);
                    _loc5_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * 900, Math.sin(_loc9_ * 0.0174532925) * 900, 0);
                    _loc6_ = WMATTACK.SpawnB(_loc4_, param1[_loc8_][3] | 0, as3.str(param1[_loc8_][0]), Math.min(_loc7_, param1[_loc8_][2] - _loc10_) | 0, as3.str(param1[_loc8_][1]));
                    _loc3_.push(_loc6_);
                    _loc10_ += _loc7_;
                }
                if (false) {
                    _loc4_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), Math.sin(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), 0);
                    _loc5_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * 900, Math.sin(_loc9_ * 0.0174532925) * 900, 0);
                    _loc6_ = WMATTACK.SpawnB(_loc4_, param1[_loc8_][3] | 0, as3.str(param1[_loc8_][0]), (param1[_loc8_][2] % _loc7_) | 0, as3.str(param1[_loc8_][1]));
                    _loc3_.push(_loc6_);
                }
            } else {
                _loc4_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), Math.sin(_loc9_ * 0.0174532925) * (800 + param1[_loc8_][3] / 2), 0);
                _loc5_ = GRID.ToISO(Math.cos(_loc9_ * 0.0174532925) * 900, Math.sin(_loc9_ * 0.0174532925) * 900, 0);
                _loc6_ = WMATTACK.SpawnB(_loc4_, param1[_loc8_][3] | 0, as3.str(param1[_loc8_][0]), param1[_loc8_][2] | 0, as3.str(param1[_loc8_][1]));
                _loc3_.push(_loc6_);
            }
            if (param1[_loc8_][6] == 1) {
                MAP.Focus(_loc5_.x, _loc5_.y);
            }
            _loc8_ += 1;
        }
        return _loc3_;
    }

    public static SpawnB(param1: Point, param2: int, param3: string, param4: int, param5: string): any[] {
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        let _loc8_: Point = null;
        let monster: MonsterBase = null;
        let _loc10_: uint = ((BASE._basePoints >>> 0) + (BASE._baseValue >>> 0)) >>> 0;
        let _loc11_: number = 0.4;

        // We use cached RNG by seed to avoid recreating identical Rndm objects
        let seedValue: int = (param1.x + param1.y) | 0;
        let _loc12_: Rndm = as3.cast(WMATTACK._rngCache[seedValue], Rndm);
        if (!_loc12_) {
            _loc12_ = as3.cast(WMATTACK._rngCache[seedValue] = new Rndm(seedValue >>> 0), Rndm);
        }
        if (_loc10_ > 1000000) {
            _loc11_ = 0.5;
        }
        if (_loc10_ > 3000000) {
            _loc11_ = 0.6;
        }
        if (_loc10_ > 6000000) {
            _loc11_ = 0.7;
        }
        if (_loc10_ > 15000000) {
            _loc11_ = 0.8;
        }
        if (_loc10_ > 50000000) {
            _loc11_ = 0.9;
        }
        param1 = GRID.FromISO(param1.x, param1.y);
        let _loc13_: any[] = [];
        let _loc14_: int = 0;
        while (_loc14_ < param4) {
            _loc6_ = _loc12_.random() * 360 * 0.0174532925;
            _loc7_ = (_loc12_.random() * param2 / 2) | 0;

            let offsetPoint: Point = WMATTACK.getPooledPoint(Math.cos(_loc6_) * _loc7_, Math.sin(_loc6_) * _loc7_);
            _loc8_ = param1.add(offsetPoint);

            if (WMATTACK._ioSpawnLevel > 0) {
                // Inferno wild attack from the config: the listed level, at full strength.
                monster = CREEPS.Spawn(param3, MAP._BUILDINGTOPS, "bounce", GRID.ToISO(_loc8_.x, _loc8_.y, 0), _loc12_.random() * 360, 1, true, false, WMATTACK._ioSpawnLevel);
            } else {
                monster = CREEPS.Spawn(param3, MAP._BUILDINGTOPS, "bounce", GRID.ToISO(_loc8_.x, _loc8_.y, 0), _loc12_.random() * 360, _loc11_, true);
            }
            if (WMATTACK._rage) {
                monster.addComponent(new TemporaryComponent(new Enrage(2, 0), WMATTACK._rage));
            }
            if (param3 == "IC8" && MapRoomManager.instance.isInMapRoom3) {
                let targetFlags: int = Targeting.k_TARGETS_BUILDINGS | Targeting.k_TARGETS_GROUND;
                monster.addComponent(new AOEDamageOnAttackOncePerTarget(100, targetFlags, 4));
            }
            _loc13_.push(monster);
            _loc14_++;
        }
        return _loc13_;
    }

    public static AttackB(): void {
        WMATTACK.HideWarning();
        // Windows that can take the player to another yard (away from the attack) or change this one.
        IoOutpostsPopup.ioCloseOpen();
        IoTestMode.ioCloseOpen();
        IoLeaderboards.CloseOpen();
        IoAttackLogs.CloseOpen();
        IoChangelog.CloseOpen();
        WMATTACK._inProgress = true;
        ATTACK.Setup();
        BASE._blockSave = true;
        UI2.Hide("top");
        UI2.Hide("wmbar");
        UI2.Hide("bottom");
        UI2.Show("warning");
        UI2._warning.Update("<font size=\"28\">" + KEYS.Get("msg_dontpanic") + "</font>");
        PLANNER.Hide();
        STORE.Hide();
        HATCHERY.Hide();
        HATCHERYCC.Hide();
    }

    public static AttackC(): void {
        WMATTACK._queued = null;
    }

    public static setEnd(param1: Function = null): void {
        if (Boolean(param1)) {
            WMATTACK._cleanUpFunc = param1;
        } else {
            WMATTACK._cleanUpFunc = WMATTACK.CleanUp;
        }
    }

    public static CleanUp(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        WMATTACK._inProgress = false;
        UI2.Show("top");
        UI2.Show("bottom");
        UI2.Hide("warning");
        UI2.Hide("scareAway");
        WMATTACK.warningPopup = null;
        WMATTACK._ioSpawnLevel = 0;
        // monster baiter and portal attacks use their own strengths
        if (Boolean(WMATTACK._history["s1"]) && WMATTACK._history["s1"][0] == 1) {
            WMATTACK._history["s1"][0] = 2;
            WMATTACK._trojan = false;
        }
        if (WMATTACK._isAI) {
            WMATTACK.ResetWait();
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicibuild");
        } else {
            SOUNDS.PlayMusic("musicbuild");
        }
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            _loc2_.GridCost(true);
            // if(_loc2_ is BTRAP && _loc2_ is BWALL && _loc2_._repairing != 1) // Revisit this
            if (_loc2_._class != "trap" && _loc2_._class != "wall" && _loc2_._repairing != 1) {
                _loc3_ = (_loc3_ + _loc2_.health) | 0;
                _loc4_ = (_loc4_ + _loc2_.maxHealth) | 0;
            }
            if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing == 0) {
                _loc2_.Repair();
            }
        }
        BASE._blockSave = false;
        BASE.Save();
        if (MONSTERBAITER._scaredAway) {
            MONSTERBAITER._scaredAway = false;
            CUSTOMATTACKS._started = false;
            QUESTS.Check();
            MONSTERBAITER._attacking = 0;
            return;
        }
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent.active) {
            // Check if base took massive damage (90%+ destruction)
            if (CREEPS._creepCount > 0 || !activeEvent.AllWavesSpawned() || _loc3_ <= _loc4_ * 0.1) {
                ATTACK.PoorDefense();
            } else {
                ATTACK.WellDefended(true);
            }
        } else if (_loc3_ < _loc4_ * 0.9 || TUTORIAL._stage < 200) {
            ATTACK.PoorDefense();
        } else if (_loc3_ >= _loc4_ * 0.9) {
            ATTACK.WellDefended(true);
            // Inferno-only quest book: a wild monster attack held off
            if (GLOBAL.INFERNO_ONLY) {
                IoQuests.event("wild_defended");
            }
        }
        CUSTOMATTACKS._started = false;
        QUESTS.Check();
        MONSTERBAITER._attacking = 0;
        if (WMATTACK._isAI && WMATTACK.intelligence > 0) {
            WMATTACK.ShowAttackSettings();
        }
    }

    public static CleanUpLite(): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: BFOUNDATION = null;
        WMATTACK._inProgress = false;
        UI2.Show("top");
        UI2.Show("bottom");
        UI2.Hide("warning");
        UI2.Hide("scareAway");
        WMATTACK.warningPopup = null;
        WMATTACK._ioSpawnLevel = 0;
        // monster baiter and portal attacks use their own strengths
        if (Boolean(WMATTACK._history["s1"]) && WMATTACK._history["s1"][0] == 1) {
            WMATTACK._history["s1"][0] = 2;
            WMATTACK._trojan = false;
        }
        if (WMATTACK._isAI) {
            WMATTACK.ResetWait();
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicibuild");
        } else {
            SOUNDS.PlayMusic("musicbuild");
        }
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc1_ ?? [])) {
            _loc4_.GridCost(true);
            if (_loc4_._repairing != 1) {
                if (_loc4_._class != "trap" && _loc4_._class != "wall") {
                    _loc2_ = (_loc2_ + _loc4_.health) | 0;
                    _loc3_ = (_loc3_ + _loc4_.maxHealth) | 0;
                }
                if (_loc4_.health < _loc4_.maxHealth) {
                    _loc4_.Repair();
                }
            }
        }
        BASE._blockSave = false;
        BASE.Save();
        MONSTERBAITER._scaredAway = false;
        CUSTOMATTACKS._started = false;
        QUESTS.Check();
        MONSTERBAITER._attacking = 0;
    }

    public static End(): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: BFOUNDATION = null;
        WMATTACK.Tick();
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicibuild");
        } else {
            SOUNDS.PlayMusic("musicbuild");
        }
        UI2.Show("top");
        UI2.Show("bottom");
        UI2.Hide("warning");
        UI2.Hide("scareAway");
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc1_ ?? [])) {
            _loc4_.GridCost(true);
            if (_loc4_._repairing != 1) {
                if (_loc4_._class != "trap" && _loc4_._class != "wall") {
                    _loc2_ = (_loc2_ + _loc4_.health) | 0;
                    _loc3_ = (_loc3_ + _loc4_.maxHealth) | 0;
                }
                if (_loc4_.health < _loc4_.maxHealth) {
                    _loc4_.Repair();
                }
            }
        }
        BASE._blockSave = false;
        BASE.Save();
        if (MONSTERBAITER._scaredAway && _loc2_ < _loc3_) {
            ATTACK.PoorDefense();
        } else if (_loc2_ < _loc3_ * 0.9 || TUTORIAL._stage < 200) {
            ATTACK.PoorDefense();
        } else if (_loc2_ >= _loc3_ * 0.9) {
            if (!MONSTERBAITER._scaredAway) {
                ATTACK.WellDefended(true);
            }
        }
        MONSTERBAITER._scaredAway = false;
        QUESTS.Check();
        MONSTERBAITER._attacking = 0;
    }

    public static ResetWait(): void {
        if (WMATTACK._history.nextAttack) {
            delete WMATTACK._history.nextAttack;
        }
        if (WMATTACK._history.queued) {
            delete WMATTACK._history.queued;
        }
        WMATTACK._history.sessionsSinceLastAttack = 0;
    }

    public static get _attackPreference(): int {
        return WMATTACK.attackPreference;
    }

    public static set _attackPreference(param1: int) {
        switch (param1) {
            case -1:
                WMATTACK._history.nextAttack = WMATTACK._history.lastattack + 345600;
                WMATTACK._attackVolumeAmplifier = 0.5;
                WMATTACK._hitsPerCreep = 20;
                WMATTACK._history.attackPreference = -1;
                if (BASE.isInfernoMainYardOrOutpost) {
                    LOGGER.Stat([89, "slow"]);
                }
                break;
            case 0:
            default:
                WMATTACK._history.nextAttack = WMATTACK._history.lastattack + 259200;
                WMATTACK._attackVolumeAmplifier = 1;
                WMATTACK._hitsPerCreep = 30;
                WMATTACK._history.attackPreference = 0;
                if (BASE.isInfernoMainYardOrOutpost) {
                    LOGGER.Stat([89, "med"]);
                }
                break;
            case 1:
                WMATTACK._history.nextAttack = WMATTACK._history.lastattack + 172800;
                WMATTACK._attackVolumeAmplifier = 1.3;
                WMATTACK._hitsPerCreep = 50;
                WMATTACK._history.attackPreference = 1;
                if (BASE.isInfernoMainYardOrOutpost) {
                    LOGGER.Stat([89, "fast"]);
                }
        }
        if (WMATTACK.ioWild() != null) {
            WMATTACK._history.nextAttack = WMATTACK.ioNextAttackTime();
        }
        BASE.Save();
    }

    public static ioResetSpawnLevel(): void {
        WMATTACK._ioSpawnLevel = 0;
    }

    /** The wild attack settings from the server, or null (not the Inferno, or switched off). */
    public static ioWild(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_wildattacks ? String(GLOBAL._flags.io_wildattacks) : "";
        if (raw != WMATTACK._ioWildRaw) {
            WMATTACK._ioWildRaw = raw;
            WMATTACK._ioWildParsed = null;
            if (raw != "") {
                try {
                    WMATTACK._ioWildParsed = JSON.parse(raw);
                } catch (e) {
                    WMATTACK._ioWildParsed = null;
                }
            }
        }
        return WMATTACK._ioWildParsed;
    }

    /** The earliest time the next wild attack may start: `minHours` after the last on any yard. */
    public static ioNextAttackTime(): number {
        let wild: any = WMATTACK.ioWild();
        let last: number = Math.max(Number(WMATTACK._history && WMATTACK._history.lastattack ? WMATTACK._history.lastattack : 0), GLOBAL.ioFlag("io_wildlast", 0));
        return last + Number(wild && wild.minHours ? wild.minHours : 23) * 3600;
    }

    private static ioAttackDue(): boolean {
        let wild: any = WMATTACK.ioWild();
        if (wild == null || !BASE.isInfernoMainYardOrOutpost) {
            return WMATTACK._history.sessionsSinceLastAttack >= WMATTACK._sessionsBetweenAttacks && GLOBAL.Timestamp() > WMATTACK._history.nextAttack && BASE._baseLevel >= 9;
        }
        return GLOBAL.Timestamp() >= WMATTACK.ioNextAttackTime() && BASE._baseLevel >= (wild.minLevel | 0) && BASE.isMainYardOrInfernoMainYard && WMATTACK.ioSettled();
    }

    /**
     * Inferno: nothing about a wild attack happens in the first minute after logging in (a new
     * session: logging in, or a reload): no planning, no warning, no attack, even one planned in an
     * earlier session and due already.
     */
    private static ioSettled(): boolean {
        if (WMATTACK.ioWild() == null) {
            return true;
        }
        return WMATTACK._ioLoginAt >= 0 && getTimer() - WMATTACK._ioLoginAt >= WMATTACK.IO_LOGIN_GRACE_MS;
    }

    /**
     * Admin test mode (com/monsters/admin/IoTestMode.as): a wild attack now, on the yard on screen, whatever
     * the one-a-day limit, the first minute after logging in and the player's level. tribe: legionnaire,
     * kozu, abunakki, dreadnaut or moloch; band: the level band's attack (0-4). `custom` ({id: count}, at
     * `customLevel`) sends those monsters instead, in the tribe's formation. Returns "" or why not.
     */
    public static ioAdminAttack(tribe: string, band: int, custom: any = null, customLevel: int = 1): string {
        if (!GLOBAL.ioTestMode()) {
            return "Admin test mode is off.";
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isInfernoMainYardOrOutpost) {
            return "Open one of your own yards first.";
        }
        if (WMATTACK._inProgress) {
            return "An attack is already under way.";
        }
        let wild: any = WMATTACK.ioWild();
        let key: string = tribe;
        let id: int = TRIBES.M_IDS[0] | 0;
        let type: int = WMATTACK.TYPE_NERD;
        if (tribe != "moloch") {
            let found: boolean = false;
            for (let pick of as3.values(WMATTACK.IO_TRIBES)) {
                if (pick[0] == tribe) {
                    id = pick[1] | 0;
                    type = pick[2] | 0;
                    found = true;
                }
            }
            if (!found) {
                return "Unknown tribe " + tribe + ".";
            }
        }
        let level: int = customLevel;
        let monsters: any = custom;
        if (!monsters) {
            let list: any[] = wild && wild.tribes ? as3.as(wild.tribes[key], Array) : null;
            if (!list || list.length == 0) {
                return "The server has no wild attack for that tribe.";
            }
            let entry: any = list[Math.max(0, Math.min(list.length - 1, band))];
            monsters = entry.monsters;
            level = entry.level | 0;
        }
        let attack: any = {};
        let distances: any = {};
        let any: boolean = false;
        for (let mid in monsters) {
            if (CREATURELOCKER._creatures[mid] && (monsters[mid] | 0) > 0) {
                attack[mid] = monsters[mid] | 0;
                distances[mid] = 100;
                any = true;
            }
        }
        if (!any) {
            return "No monsters to send.";
        }
        WMATTACK.HideWarning();
        if (UI2._wildMonsterBar) {
            UI2.Hide("wmbar");
        }
        WMATTACK._attackersBaseID = id;
        WMATTACK._type = type;
        WMATTACK._ioPlan = { "tribe": key, "level": level, "monsters": attack };
        WMATTACK._queued = { "type": WMATTACK._type, "attack": attack, "attackTime": GLOBAL.Timestamp(), "degrees": Math.random() * 360, "distances": distances, "warned": 1, "t": WMATTACK._attackersBaseID, "level": level };
        WMATTACK._ioSpawnLevel = Math.max(1, level) | 0;
        PATHING.ResetCosts();
        WMATTACK.SendAttack(attack, Number(WMATTACK._queued.degrees), distances);
        return "";
    }

    /** Which band of the level list the player is in: 0 for levels up to bands[0], and so on. */
    public static ioBand(level: int): int {
        let bands: any[] = WMATTACK.ioWild() && as3.is(WMATTACK.ioWild().bands, Array) ? as3.as(WMATTACK.ioWild().bands, Array) : [10, 20, 30, 40];
        let i: int = 0;
        while (i < bands.length && level > (bands[i] | 0)) {
            i++;
        }
        return i;
    }

    /** Picks the tribe and its attack for the player's level. False if the config has no attack for it. */
    public static ioChooseTribe(roll: number = -1): boolean {
        let wild: any = WMATTACK.ioWild();
        let key: string = null;
        let id: int = 0;
        let type: int = WMATTACK.TYPE_NERD;
        if (roll < 0) {
            roll = Math.random();
        }
        if (roll < Number(wild.molochChance)) {
            key = "moloch";
            id = TRIBES.M_IDS[0] | 0;
        } else {
            let pick: any[] = as3.cast(WMATTACK.IO_TRIBES[Math.min(WMATTACK.IO_TRIBES.length - 1, ((roll - Number(wild.molochChance)) / (1 - Number(wild.molochChance)) * WMATTACK.IO_TRIBES.length) | 0)], Array);
            key = as3.str(pick[0]);
            id = pick[1] | 0;
            type = pick[2] | 0;
        }
        let list: any[] = wild.tribes ? as3.as(wild.tribes[key], Array) : null;
        if (!list || list.length == 0) {
            return false;
        }
        let entry: any = list[Math.min(list.length - 1, WMATTACK.ioBand(BASE.BaseLevel().level | 0))];
        if (!entry || !entry.monsters) {
            return false;
        }
        WMATTACK._attackersBaseID = id;
        WMATTACK._type = type;
        WMATTACK._ioPlan = { "tribe": key, "level": entry.level | 0, "monsters": entry.monsters };
        return true;
    }

    public static dpsAtPoint(param1: Solution, param2: Point): number {
        let _loc3_: BTOWER = null;
        let _loc4_: number = NaN;
        let _loc5_: Point = null;
        let _loc7_: BTOWER = null;
        let _loc6_: number = 0;
        param2 = GRID.FromISO(param2.x, param2.y);
        let _loc8_: Vector<any> = InstanceManager.getInstancesByClass(BTOWER);
        for (_loc3_ of (_loc8_ ?? [])) {
            if (_loc3_._countdownUpgrade.Get() == 0 && _loc3_._countdownBuild.Get() == 0 && Boolean(_loc3_._countdownFortify.Get())) {
                (_loc5_ = GRID.FromISO(_loc3_.x, _loc3_.y)).add(new Point(_loc3_._footprint[0].width * 0.5, _loc3_._footprint[0].height * 0.5));
                if ((_loc4_ = Point.distance(_loc5_, param2)) < _loc3_._range) {
                    _loc7_ = _loc3_;
                    _loc6_ += _loc3_.damage / _loc3_._rate;
                    param1.towersInPath.push(_loc3_);
                }
            }
        }
        return _loc6_;
    }
}
