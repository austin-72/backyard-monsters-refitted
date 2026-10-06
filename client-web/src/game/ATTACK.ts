import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { Dictionary, getTimer } from "flash/utils";
import { ACHIEVEMENTS, ALLIANCES, AttackEvent, BASE, BFOUNDATION, BMUSHROOM, BUILDING14, BYMConfig, CHAMPIONCAGE, CREATURELOCKER, CREATURES, CREEPS, ChampionBase, DROPZONE, EnumYardType, GLOBAL, IAttackable, INFERNOPORTAL, INFERNO_DESCENT_POPUPS, INFERNO_EMERGENCE_EVENT, INFERNO_EMERGENCE_POPUPS, InstanceManager, IoQuests, IoReplayRecorder, KEYS, Krallen, LOGGER, LOGIN, MAP, MAPROOM, MAPROOM_DESCENT, MapRoom3AttackFinishedPopup, MapRoomManager, MonsterBase, MonsterData, POPUPS, POWERUPS, ParticleDamageItem, ParticleLoot, ParticleText, ParticleVacuumLoot, Player, ResourceBombs, SOUNDS, SPECIALEVENT, STORE, ScrollSet, SecNum, SiegeWeapons, TRIBES, TUTORIAL, UI2, WMATTACK, WMBASE, YARD_PROPS, frame, popup_attack_log, popup_attackend, popup_damaged_ai, popup_defense, popup_taunt_friend } from "@game";

export class ATTACK extends ASObject {
    public static USE_CUMULATIVE_FLINGER_CAPACITY: boolean; // const

    public static _damageGrid: any;

    public static _loot: any;

    public static _hpLoot1: int;

    public static _hpLoot2: int;

    public static _hpLoot3: int;

    public static _hpLoot4: int;

    public static _log: any[];

    public static _dropZone: DROPZONE;

    public static _flingerCooldown: int;

    public static _flingerCooling: int;

    public static _flingerBucket: any;

    public static _bombSize: int;

    public static _countdown: int;

    public static _attackStart: int;

    public static _sentOver: boolean;

    private static m_waitingForSaveToComplete: boolean;

    public static _flingValue: int;

    public static _flingCount: int;

    public static _logOpen: boolean;

    public static _shownLog: boolean;

    public static _acted: boolean;

    public static _healthOnStart: number;

    public static _healthOnComplete: number;

    public static _taunted: boolean;

    public static _tauntThreshold: number;

    public static _attackLog: popup_attack_log;

    public static _shownAIPopup: boolean;

    public static _shownFinal: boolean;

    public static _flungSpace: SecNum;

    public static _deltaLoot: any;

    public static _hpDeltaLoot: any;

    public static _savedDeltaLoot: any;

    public static _creaturesFlung: SecNum;

    public static _creaturesLoaded: SecNum;

    private static m_recentlyAttacked: Dictionary;

    private static m_lastAttackTime: int;

    public static _curCreaturesAvailable: any[];

    static {
        as3.lazyStatics(this, { USE_CUMULATIVE_FLINGER_CAPACITY: false, _damageGrid: null, _loot: null, _hpLoot1: 0, _hpLoot2: 0, _hpLoot3: 0, _hpLoot4: 0, _log: null, _dropZone: null, _flingerCooldown: 0, _flingerCooling: 0, _flingerBucket: null, _bombSize: 0, _countdown: 0, _attackStart: 0, _sentOver: false, m_waitingForSaveToComplete: false, _flingValue: 0, _flingCount: 0, _logOpen: false, _shownLog: false, _acted: false, _healthOnStart: NaN, _healthOnComplete: NaN, _taunted: false, _tauntThreshold: NaN, _attackLog: null, _shownAIPopup: false, _shownFinal: false, _flungSpace: null, _deltaLoot: null, _hpDeltaLoot: null, _savedDeltaLoot: null, _creaturesFlung: null, _creaturesLoaded: null, m_recentlyAttacked: null, m_lastAttackTime: 0, _curCreaturesAvailable: null }, () => {
            ATTACK.USE_CUMULATIVE_FLINGER_CAPACITY = true;
            ATTACK._taunted = false;
            ATTACK._tauntThreshold = 0.1;
            ATTACK._shownFinal = false;
            ATTACK._creaturesFlung = new SecNum(0);
            ATTACK._creaturesLoaded = new SecNum(0);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static get waitingForSaveToComplete(): boolean {
        return ATTACK.m_waitingForSaveToComplete;
    }

    public static get hasCreaturesToAttackWith(): boolean {
        let _loc5_: any = null;
        let _loc6_: string = null;
        let _loc1_: any = CREATURELOCKER._creatures;
        let _loc2_: any = ATTACK._curCreaturesAvailable;
        let _loc3_: int = GLOBAL._playerGuardianData.length | 0;
        let _loc4_: Vector<any> = GLOBAL._playerGuardianData;
        if (GLOBAL._loadmode == GLOBAL.mode || GLOBAL._loadmode != GLOBAL.mode && !MAPROOM_DESCENT.DescentPassed) {
            for (_loc5_ of (_loc4_ ?? [])) {
                if (_loc5_ && _loc5_.hp.Get() > 0 && _loc5_.status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                    return true;
                }
            }
        }
        for (_loc6_ in _loc2_) {
            if (_loc2_[_loc6_] && _loc2_[_loc6_] > 0 && Boolean(_loc1_[_loc6_])) {
                return true;
            }
        }
        return false;
    }

    public static Setup(): void {
        let _loc1_: Player = null;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let creatureID: string = null;
        let _loc4_: string = null;
        ATTACK.m_recentlyAttacked = new Dictionary();
        ATTACK._flingerCooldown = 5;
        ATTACK._flingerCooling = 0;
        ATTACK._creaturesFlung.Set(0);
        ATTACK._creaturesLoaded.Set(0);
        ATTACK._flingerBucket = {};
        ATTACK._flingCount = 0;
        ATTACK._log = [];
        ATTACK._attackStart = GLOBAL.Timestamp();
        ATTACK._flungSpace = new SecNum(0);
        ATTACK._loot = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        ATTACK._savedDeltaLoot = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        ATTACK._deltaLoot = { "dirty": false };
        ATTACK._hpDeltaLoot = { "dirty": false };
        ATTACK._hpLoot1 = 0;
        ATTACK._hpLoot2 = 0;
        ATTACK._hpLoot3 = 0;
        ATTACK._hpLoot4 = 0;
        ATTACK._dropZone = null;
        ATTACK._sentOver = false;
        ATTACK.m_waitingForSaveToComplete = false;
        ATTACK._logOpen = false;
        ATTACK._shownLog = false;
        ATTACK._shownAIPopup = false;
        ATTACK._acted = false;
        ATTACK._flingValue = 0;
        if (Boolean(GLOBAL._attackersCatapult) && (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW)) {
            ResourceBombs.Setup();
        }
        if (!MapRoomManager.instance.isInMapRoom2) {
            ATTACK._curCreaturesAvailable = new Array();
            _loc1_ = !(!GLOBAL.attackingPlayer) ? GLOBAL.attackingPlayer : GLOBAL.player;
            _loc2_ = _loc1_.monsterList.length | 0;
            _loc3_ = 0;
            while (_loc3_ < _loc2_) {
                ATTACK._curCreaturesAvailable[as3.vget(_loc1_.monsterList, _loc3_).m_creatureID] = as3.vget(_loc1_.monsterList, _loc3_).numHealthyHousedCreeps;
                _loc3_++;
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            GLOBAL._attackerMapCreaturesStart = {};
            for (_loc4_ in ATTACK._curCreaturesAvailable) {
                GLOBAL._attackerMapCreaturesStart[_loc4_] = new SecNum(Number(ATTACK._curCreaturesAvailable[_loc4_]));
            }
        }
    }

    public static AttackData(): any {
        let attackPayload: any = { champions: [], monsters: [] };

        // Loop through attack champions
        for (let i: int = 0; i < GLOBAL._playerGuardianData.length; i++) {
            let guardianData: any = as3.vget(GLOBAL._playerGuardianData, i);
            let guardianKey: string = "G" + guardianData.t;

            attackPayload.champions.push({ type: guardianKey, stats: CHAMPIONCAGE._guardians[guardianKey].props });
        }

        if (GLOBAL.INFERNO_ONLY) {
            CREATURELOCKER.ioApplyRezghul();
        }
        // Loop through attack monsters
        for (let creatureID in ATTACK._curCreaturesAvailable) {
            attackPayload.monsters.push({ id: creatureID, count: ATTACK._curCreaturesAvailable[creatureID], stats: CREATURELOCKER._creatures[creatureID].props });
        }
        return attackPayload;
    }

    public static Tick(): void {
        let _loc4_: string = null;
        let _loc5_: boolean = false;
        let _loc6_: any = null;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: SecNum = null;
        let _loc10_: boolean = false;
        let _loc11_: Vector<any> = null;
        let _loc12_: BFOUNDATION = null;
        if (ATTACK._flingerCooling > 0) {
            --ATTACK._flingerCooling;
        }
        --ATTACK._countdown;
        if (ATTACK._countdown == -120) {
            ATTACK.RetreatAll();
        }
        let _loc1_: any = false;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        while (_loc3_ < GLOBAL._playerGuardianData.length) {
            if (as3.vget(GLOBAL._playerGuardianData, _loc3_) && as3.vget(GLOBAL._playerGuardianData, _loc3_).hp.Get() > 0 && as3.vget(GLOBAL._playerGuardianData, _loc3_).status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                _loc2_++;
            }
            _loc3_++;
        }
        for (_loc4_ in ATTACK._curCreaturesAvailable) {
            _loc2_ = (_loc2_ + ATTACK._curCreaturesAvailable[_loc4_]) | 0;
        }
        _loc5_ = false;
        for (_loc6_ of as3.values(ResourceBombs._bombs)) {
            if (_loc6_.catapultLevel <= GLOBAL._attackersCatapult) {
                if (_loc6_.group == 2) {
                    if (!_loc6_.used && _loc2_ > 0) {
                        _loc5_ = true;
                    }
                } else if (!_loc6_.used) {
                    _loc5_ = true;
                }
            }
        }
        _loc7_ = 0;
        for (_loc8_ in ResourceBombs._activeBombs) {
            _loc7_++;
        }
        _loc5_ ||= _loc7_ > 0;
        for (_loc9_ of as3.values(ATTACK._flingerBucket)) {
            _loc2_ = (_loc2_ + _loc9_.Get()) | 0;
        }
        _loc1_ = _loc2_ > 0;
        _loc10_ = false;
        _loc11_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc12_ of (_loc11_ ?? [])) {
            if (_loc12_ instanceof BMUSHROOM === false && _loc12_._class != "wall" && _loc12_._class != "trap" && _loc12_._class != "enemy" && _loc12_._class != "decoration" && _loc12_._class != "cage" && _loc12_.health > 0) {
                _loc10_ = true;
                break;
            }
        }
        if (!ATTACK._sentOver && (!_loc10_ || !CREEPS._creepCount)) {
            if (ATTACK._countdown < 0 || !_loc10_ || !_loc1_ && !_loc5_) {
                ATTACK._sentOver = true;
                if (BASE._saveOver != 1) {
                    BASE.Save(1, false, true);
                }
                ATTACK.m_waitingForSaveToComplete = true;
            }
        }
    }

    public static ShowLog(param1: int = 0): void {
        let onActionDown: Function = null;
        let b: BUILDING14 = null;
        let logLength: int = 0;
        let i: string = null;
        let str: string = null;
        let ss: ScrollSet = null;
        let delay: int = param1;
        let shouldShowTaunt: boolean = BASE._isProtected > 0;
        let townHallInstances: Vector<any> = InstanceManager.getInstancesByClass(BUILDING14);
        for (b of (townHallInstances ?? [])) {
            if (b.health == 0) {
                shouldShowTaunt = true;
            }
        }
        ATTACK._shownLog = false;
        if (!ATTACK._logOpen && GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
            ATTACK._logOpen = true;
            ATTACK._shownLog = true;
            logLength = 0;
            for (i in ATTACK._log) {
                logLength++;
            }
            if (logLength > 0) {
                onActionDown = (param1: MouseEvent): void => {
                    if (param1.target.label == "Next" || param1.target.labelKey == "btn_returnhome" || param1.target.labelKey == "btn_skip") {
                        ATTACK._logOpen = false;
                        ATTACK._attackLog.parent.removeChild(ATTACK._attackLog);
                        ATTACK.EndB();
                    }
                    if (param1.target.labelKey == "btn_talktrash") {
                        ATTACK.ShowTaunt();
                    }
                };
                ATTACK._attackLog = new popup_attack_log();
                ATTACK._attackLog.Resize = (): void => {
                    ATTACK._attackLog.x = 0;
                    ATTACK._attackLog.y = 0;
                };
                (as3.as(ATTACK._attackLog.mcFrame, frame)).Setup(false);
                ATTACK._attackLog.title_txt.htmlText = "<b>" + KEYS.Get("attack_log_title") + "</b>";
                GLOBAL._layerMessages.addChild(ATTACK._attackLog);
                if (shouldShowTaunt && !ATTACK._taunted && MAPROOM._visitingFriend) {
                    ATTACK._attackLog.bAction.SetupKey("btn_talktrash");
                    ATTACK._attackLog.bAction.addEventListener(MouseEvent.CLICK, onActionDown);
                    ATTACK._attackLog.bAction.Highlight = true;
                    if (MapRoomManager.instance.isInMapRoom2) {
                        ATTACK._attackLog.b2.Setup(KEYS.Get("btn_next"));
                    } else {
                        ATTACK._attackLog.b2.SetupKey("btn_returnhome");
                    }
                    ATTACK._attackLog.b2.addEventListener(MouseEvent.CLICK, onActionDown);
                } else {
                    ATTACK._attackLog.removeChild(ATTACK._attackLog.b2);
                    ATTACK._attackLog.bAction.Highlight = false;
                    if (MapRoomManager.instance.isInMapRoom2) {
                        ATTACK._attackLog.bAction.Setup(KEYS.Get("btn_next"));
                    } else {
                        ATTACK._attackLog.bAction.SetupKey("btn_returnhome");
                    }
                    ATTACK._attackLog.bAction.addEventListener(MouseEvent.CLICK, onActionDown);
                }
                str = ATTACK.LogRead();
                str += "<br><br>";
                ATTACK._attackLog.shell.body_txt.htmlText = str;
                ATTACK._attackLog.shell.body_txt.autoSize = TextFieldAutoSize.LEFT;
                ss = new ScrollSet();
                ATTACK._attackLog.addChild(ss);
                ss.x = 613;
                ss.y = 115;
                ss.Init(ATTACK._attackLog.shell, ATTACK._attackLog.maskMC, 0, ATTACK._attackLog.maskMC.y, 270);
                ATTACK._attackLog.shell.mask = ATTACK._attackLog.maskMC;
            } else {
                ATTACK.EndB();
            }
        } else {
            ATTACK.EndB();
        }
    }

    public static ShowTaunt(param1: MouseEvent = null): void {
        let taunt: popup_taunt_friend = null;
        let i: int = 0;
        let imgNumber: int = 0;
        let onClose: Function = null;
        let SwitchB: Function = null;
        taunt = null;
        i = 0;
        imgNumber = 0;
        onClose = null;
        let onShare: Function = null;
        let e: MouseEvent = param1;
        let Switch: Function = (param1: int): Function => {
            let n: int = 0;
            n = param1;
            return (param1: MouseEvent = null): void => {
                SwitchB(n);
            };
        };
        SwitchB = (param1: int): void => {
            imgNumber = param1;
            i = 1;
            while (i < 4) {
                taunt["mcIcon" + i].alpha = 0.4;
                ++i;
            }
            taunt["mcIcon" + param1].alpha = 1;
        };
        onClose = (param1: MouseEvent = null): void => {
            if (taunt.parent) {
                taunt.parent.removeChild(taunt);
            }
            ATTACK.End();
        };
        onShare = (param1: MouseEvent): void => {
            ATTACK._taunted = true;
            GLOBAL.CallJS("sendFeed", ["taunt", KEYS.Get("attack_taunt_streamtitle"), KEYS.Get("attack_taunt_streambody"), "taunt" + imgNumber + ".png", BASE._loadedFBID]);
            onClose();
        };
        try {
            ATTACK._attackLog.parent.removeChild(ATTACK._attackLog);
        } catch (e) {
        }
        taunt = new popup_taunt_friend();
        taunt.tTitle.htmlText = KEYS.Get("popup_title_tauntfriend");
        taunt.Resize = (): void => {
            taunt.x = 0;
            taunt.y = 0;
        };
        taunt.bShare.SetupKey("btn_talktrash");
        GLOBAL._layerMessages.addChild(taunt);
        taunt.bShare.addEventListener(MouseEvent.CLICK, onShare);
        taunt.bShare.Highlight = true;
        (as3.as(taunt.mcFrame, frame)).Setup(true, onClose);
        i = 1;
        while (i < 4) {
            taunt["mcIcon" + i].buttonMode = true;
            taunt["mcIcon" + i].gotoAndStop(i);
            taunt["mcIcon" + i].addEventListener(MouseEvent.CLICK, Switch(i));
            i++;
        }
        SwitchB(1);
    }

    public static DropZone(param1: int, param2: int = 1): void {
        if (!ATTACK._dropZone) {
            ATTACK._dropZone = as3.as(MAP._BUILDINGBASES.addChild(new DROPZONE(param1, param2)), DROPZONE);
        } else {
            ATTACK._dropZone.Update(param1, param2);
        }
    }

    public static Log(param1: string, param2: string): void {
        ATTACK._acted = true;
        let _loc3_: int = 0;
        while (_loc3_ < ATTACK._log.length) {
            if (ATTACK._log[_loc3_].id == param1) {
                ATTACK._log[_loc3_].event = param2;
                ATTACK._log[_loc3_].time = (GLOBAL.Timestamp() - ATTACK._attackStart) | 0;
                return;
            }
            _loc3_++;
        }
        ATTACK._log.push({ "id": param1, "time": GLOBAL.Timestamp() - ATTACK._attackStart, "event": param2 });
    }

    public static LogRead(): string {
        let _loc5_: int = 0;
        let _loc6_: any[] = null;
        let _loc1_: any = "";
        let _loc2_: string = "";
        let _loc3_: string = "";
        let _loc4_: any[] = [];
        if (ATTACK._log.length > 0) {
            _loc1_ = "<ul>";
            as3.sortOn(ATTACK._log, "time", Array.NUMERIC);
            _loc5_ = 0;
            while (_loc5_ < ATTACK._log.length) {
                _loc1_ += "<li><font color=\"#999999\">" + GLOBAL.ToTime(ATTACK._log[_loc5_].time | 0, true) + "</font>: " + ATTACK._log[_loc5_].event + "</li>";
                _loc5_++;
            }
            _loc1_ += "</ul>";
            if (ATTACK._loot.r1.Get() + ATTACK._loot.r2.Get() + ATTACK._loot.r3.Get() + ATTACK._loot.r4.Get() > 0) {
                _loc1_ += "<br>" + KEYS.Get("attack_log_resourceslooted") + ":<br>";
                _loc6_ = [];
                if (ATTACK._loot.r1.Get() > 0) {
                    _loc6_.push([ATTACK._loot.r1.Get(), KEYS.Get(as3.str(GLOBAL._resourceNames[0]))]);
                }
                if (ATTACK._loot.r2.Get() > 0) {
                    _loc6_.push([ATTACK._loot.r2.Get(), KEYS.Get(as3.str(GLOBAL._resourceNames[1]))]);
                }
                if (ATTACK._loot.r3.Get() > 0) {
                    _loc6_.push([ATTACK._loot.r3.Get(), KEYS.Get(as3.str(GLOBAL._resourceNames[2]))]);
                }
                if (ATTACK._loot.r4.Get() > 0) {
                    _loc6_.push([ATTACK._loot.r4.Get(), KEYS.Get(as3.str(GLOBAL._resourceNames[3]))]);
                }
                _loc1_ += GLOBAL.Array2String(_loc6_);
            }
        }
        return as3.str(_loc1_);
    }

    public static RemoveDropZone(): void {
        if (ATTACK._dropZone) {
            ATTACK._dropZone.Destroy();
            MAP._BUILDINGBASES.removeChild(ATTACK._dropZone);
        }
        ATTACK._dropZone = null;
    }

    public static Spawn(param1: Point, param2: int): void {
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        let _loc5_: Point = null;
        let _loc7_: string = null;
        let _loc8_: string = null;
        let _loc9_: boolean = false;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc13_: int = 0;
        let _loc14_: MonsterBase = null;
        let _loc6_: any[] = [];
        for (_loc8_ in ATTACK._flingerBucket) {
            if (ATTACK._flingerBucket[_loc8_].Get() > 0) {
                _loc9_ = false;
                if (_loc8_.substr(0, 1) == "G") {
                    _loc10_ = GLOBAL.getPlayerGuardianIndex(Number(_loc8_.substr(1)) | 0);
                    _loc11_ = as3.vget(GLOBAL._playerGuardianData, _loc10_).l.Get() | 0;
                    _loc3_ = Math.random() * 360 * 0.0174532925;
                    _loc4_ = (Math.random() * param2 / 2) | 0;
                    _loc5_ = param1.add(new Point(Math.sin(_loc3_) * _loc4_, Math.cos(_loc3_) * _loc4_));
                    CREEPS.SpawnGuardian(as3.vget(GLOBAL._playerGuardianData, _loc10_).t | 0, MAP._BUILDINGTOPS, "bounce", _loc11_, _loc5_, Math.random() * 360, as3.vget(GLOBAL._playerGuardianData, _loc10_).hp.Get() | 0, as3.vget(GLOBAL._playerGuardianData, _loc10_).fb.Get() | 0, as3.vget(GLOBAL._playerGuardianData, _loc10_).pl.Get() | 0);
                    if (!MapRoomManager.instance.isInMapRoom3) {
                        ATTACK._flungSpace.Add(Number(CHAMPIONCAGE.GetGuardianProperty(_loc8_, _loc11_, "bucket")));
                    }
                    _loc12_ = "Level " + as3.vget(GLOBAL._playerGuardianData, _loc10_).l.Get() + " " + CHAMPIONCAGE._guardians["G" + as3.vget(GLOBAL._playerGuardianData, _loc10_).t].name;
                    _loc6_.push([1, _loc12_]);
                    CREEPS._flungGuardian[_loc10_] = true;
                } else {
                    ATTACK._flungSpace.Add(CREATURES.GetProperty(_loc8_, "bucket") * ATTACK._flingerBucket[_loc8_].Get());
                    _loc7_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc8_].name));
                    _loc6_.push([ATTACK._flingerBucket[_loc8_].Get(), _loc7_]);
                    _loc13_ = 0;
                    while (_loc13_ < ATTACK._flingerBucket[_loc8_].Get()) {
                        _loc3_ = Math.random() * 360 * 0.0174532925;
                        _loc4_ = (Math.random() * param2 / 2) | 0;
                        _loc5_ = param1.add(new Point(Math.sin(_loc3_) * _loc4_, Math.cos(_loc3_) * _loc4_));
                        (_loc14_ = CREEPS.Spawn(_loc8_, MAP._BUILDINGTOPS, "bounce", _loc5_, Math.random() * 360))._hitLimit = int.MAX_VALUE;
                        if (!MapRoomManager.instance.isInMapRoom2or3) {
                            GLOBAL.attackingPlayer.monsterListByID(_loc8_).add(-1);
                        } else if (MapRoomManager.instance.isInMapRoom3) {
                            GLOBAL.attackingPlayer.monsterListByID(_loc8_).linkCreepToData(_loc14_);
                        }
                        _loc13_++;
                    }
                    if (ALLIANCES._myAlliance) {
                        LOGGER.Stat([28, _loc8_, ATTACK._flingerBucket[_loc8_].Get(), ALLIANCES._allianceID]);
                    } else {
                        LOGGER.Stat([28, _loc8_, ATTACK._flingerBucket[_loc8_].Get()]);
                    }
                    ATTACK._flingValue = (ATTACK._flingValue + CREATURES.GetProperty(_loc8_, "cResource")) | 0;
                }
            }
        }
        ATTACK._creaturesFlung.Add(ATTACK._creaturesLoaded.Get());
        ATTACK._creaturesLoaded.Set(0);
        if (_loc6_.length == 1 && _loc6_[0][0] == 1) {
            ATTACK.Log("fling" + ATTACK._flingCount, "<font color=\"#0000FF\">" + KEYS.Get("attack_log_flungin", { "v1": GLOBAL.Array2String(_loc6_) }) + "</font>");
        } else {
            ATTACK.Log("fling" + ATTACK._flingCount, "<font color=\"#0000FF\">" + KEYS.Get("attack_log_flungin_pl", { "v1": GLOBAL.Array2String(_loc6_) }) + "</font>");
        }
        // Inferno-only quest book: an attack's first fling
        if (GLOBAL.INFERNO_ONLY && ATTACK._flingCount == 0) {
            IoQuests.event("fling");
        }
        ++ATTACK._flingCount;
        ATTACK._flingerBucket = {};
        ATTACK._flingerCooling = ATTACK._flingerCooldown;
        UI2.Update();
        if (BASE._saveOver != 1) {
            BASE.Save();
        }
        ATTACK.RemoveDropZone();
    }

    public static BucketAdd(param1: string): boolean {
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc2_: int = GLOBAL._buildingProps[4].capacity[GLOBAL._attackersFlinger - 1] | 0;
        if (MAPROOM_DESCENT.InDescent) {
            _loc2_ = YARD_PROPS._yardProps[4].capacity[GLOBAL._attackersFlinger - 1] | 0;
        }
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "OFFENSE")) {
            _loc2_ = (_loc2_ + Math.floor(_loc2_ * 0.25)) | 0;
        }
        // Admin test mode: fling as much as you like.
        if (GLOBAL.ioTestMode()) {
            _loc2_ = 99999999;
        }
        if (MapRoomManager.instance.isInMapRoom3 && ATTACK.USE_CUMULATIVE_FLINGER_CAPACITY) {
            _loc2_ = (_loc2_ - ATTACK._flungSpace.Get()) | 0;
        }
        if (param1.substr(0, 1) == "G") {
            _loc4_ = GLOBAL.getPlayerGuardianIndex(Number(param1.substr(1)) | 0);
            if (!MapRoomManager.instance.isInMapRoom3) {
                _loc2_ = (_loc2_ - CHAMPIONCAGE.GetGuardianProperty(param1.substr(0, 2), as3.vget(GLOBAL._playerGuardianData, _loc4_).l.Get() | 0, "bucket")) | 0;
            }
            ATTACK._flingerBucket[param1] = new SecNum(1);
            ATTACK._creaturesLoaded.Add(1);
            SOUNDS.Play("click1");
        } else if (ATTACK._curCreaturesAvailable[param1] > 0) {
            for (_loc3_ in ATTACK._flingerBucket) {
                _loc2_ = (_loc2_ - CREATURES.GetProperty(_loc3_, "bucket") * ATTACK._flingerBucket[_loc3_].Get()) | 0;
            }
            if (_loc2_ >= CREATURES.GetProperty(param1, "bucket")) {
                ATTACK._curCreaturesAvailable[param1] = ATTACK._curCreaturesAvailable[param1] - 1;
                ATTACK._creaturesLoaded.Add(1);
                if (!ATTACK._flingerBucket[param1]) {
                    ATTACK._flingerBucket[param1] = new SecNum(0);
                }
                ATTACK._flingerBucket[param1].Add(1);
                SOUNDS.Play("click1");
            }
        }
        return false;
    }

    public static BucketRemove(param1: string): boolean {
        if (Boolean(ATTACK._flingerBucket[param1]) && ATTACK._flingerBucket[param1].Get() > 0) {
            ATTACK._flingerBucket[param1].Add(-1);
            if (param1.substr(0, 1) == "G") {
                delete ATTACK._flingerBucket[param1];
            } else {
                ATTACK._curCreaturesAvailable[param1] += 1;
            }
            ATTACK._creaturesLoaded.Add(-1);
            SOUNDS.Play("click1");
            return true;
        }
        return false;
    }

    public static BucketUpdate(): void {
        let _loc2_: string = null;
        let _loc3_: int = 0;
        let _loc1_: int = 0;
        for (_loc2_ in ATTACK._flingerBucket) {
            if (_loc2_.substr(0, 1) == "G") {
                _loc3_ = 0;
                while (_loc3_ < GLOBAL._playerGuardianData.length) {
                    if (_loc2_.substr(1) == as3.vget(GLOBAL._playerGuardianData, _loc3_).t) {
                        break;
                    }
                    _loc3_++;
                }
                _loc1_ = (_loc1_ + CHAMPIONCAGE.GetGuardianProperty(_loc2_.substr(0, 2), as3.vget(GLOBAL._playerGuardianData, _loc3_).l.Get() | 0, "bucket")) | 0;
            } else {
                _loc1_ = (_loc1_ + CREATURES.GetProperty(_loc2_, "bucket") * ATTACK._flingerBucket[_loc2_].Get()) | 0;
            }
        }
        ResourceBombs.BombRemove();
        if (Boolean(UI2._top) && Boolean(UI2._top._siegeweapon)) {
            UI2._top._siegeweapon.Cancel();
        }
        if (_loc1_ == 0) {
            ATTACK.RemoveDropZone();
        } else {
            _loc1_ = (_loc1_ / 4) | 0;
            if (_loc1_ < 200) {
                _loc1_ = 200;
            }
            ATTACK.DropZone(_loc1_, 1);
        }
        UI2.Update();
    }

    public static Loot(param1: int, param2: int, param3: int, param4: int, param5: int = 10, param6: BFOUNDATION = null, param7: boolean = false): int {
        if (LOGIN._playerLevel < 20) {
            param2 = (param2 + param2 * Math.max(0, (20 - LOGIN._playerLevel) * 0.03)) | 0;
        }
        ATTACK._loot["r" + param1].Add(param2);
        switch (param1) {
            case 1:
                ATTACK._hpLoot1 += param2;
                break;
            case 2:
                ATTACK._hpLoot2 += param2;
                break;
            case 3:
                ATTACK._hpLoot3 += param2;
                break;
            case 4:
                ATTACK._hpLoot4 += param2;
        }
        let _loc8_: number = param2;
        let _loc9_: number = Number(GLOBAL._resources["r" + param1 + "max"]);
        let _loc10_: number = Number(GLOBAL._resources["r" + param1].Get());
        let _loc11_: Krallen = null;
        _loc11_ = CREEPS.krallen;
        if (_loc11_) {
            _loc9_ += _loc9_ * _loc11_._buff;
        }
        if (_loc10_ + param2 > _loc9_) {
            if (BASE.isInfernoMainYardOrOutpost && MAPROOM_DESCENT.DescentPassed || GLOBAL.mode == GLOBAL._loadmode) {
                if ((_loc8_ = _loc9_ - _loc10_) < 0) {
                    _loc8_ = 0;
                }
            }
        }
        GLOBAL._resources["r" + param1].Add(_loc8_);
        GLOBAL._hpResources["r" + param1] += _loc8_;
        if (ATTACK._deltaLoot["r" + param1]) {
            ATTACK._deltaLoot["r" + param1].Add(_loc8_);
            ATTACK._hpDeltaLoot["r" + param1] += _loc8_;
        } else {
            ATTACK._deltaLoot["r" + param1] = new SecNum(_loc8_);
            ATTACK._hpDeltaLoot["r" + param1] = _loc8_;
        }
        ATTACK._deltaLoot.dirty = true;
        ATTACK._hpDeltaLoot.dirty = true;
        if (GLOBAL._render && Boolean(param6)) {
            if (BASE.isInfernoMainYardOrOutpost) {
                param1 += 4;
            }
            if (param7) {
                new ParticleVacuumLoot(param6, param2, param1);
            } else {
                new ParticleLoot(param6, param2, param1);
            }
            ParticleText.Create(new Point(param3, param4 - 35), param2, param1 >>> 0);
        }
        return param2;
    }

    public static SaveDeltaLoot(): void {
        let _loc1_: int = 0;
        if (ATTACK._deltaLoot.dirty) {
            _loc1_ = 1;
            while (_loc1_ < 5) {
                if (ATTACK._deltaLoot["r" + _loc1_]) {
                    if (ATTACK._savedDeltaLoot["r" + _loc1_]) {
                        ATTACK._savedDeltaLoot["r" + _loc1_].Add(ATTACK._deltaLoot["r" + _loc1_].Get());
                    } else {
                        ATTACK._savedDeltaLoot["r" + _loc1_] = new SecNum(Number(ATTACK._deltaLoot["r" + _loc1_].Get()));
                    }
                    if (ATTACK._deltaLoot["r" + _loc1_].Get() != ATTACK._hpDeltaLoot["r" + _loc1_]) {
                        LOGGER.Log("log", "ATTACK.SaveDeltaLoot delta loot mismatch secure " + ATTACK._deltaLoot.Get() + " unsecure " + ATTACK._hpDeltaLoot[_loc1_]);
                        GLOBAL.ErrorMessage("ATTACK.SaveDeltaLoot");
                    }
                }
                _loc1_++;
            }
        }
        ATTACK._deltaLoot = { "dirty": false };
        ATTACK._hpDeltaLoot = { "dirty": false };
    }

    public static CleanLoot(): void {
        ATTACK._savedDeltaLoot = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
    }

    public static Miss(param1: number, param2: number): void {
    }

    public static damage(amount: int, damagedTarget: IAttackable = null, amountModified: number = 0): void {
        if (getTimer() - ATTACK.m_lastAttackTime > 400) {
            ATTACK.m_recentlyAttacked = new Dictionary();
            ATTACK.m_lastAttackTime = getTimer();
        }
        let particleType: uint = (amount < 0) ? ParticleText.TYPE_HEAL : ParticleText.TYPE_DAMAGE;
        let particleSpawn: Point = new Point(damagedTarget.x, damagedTarget.y);
        if (damagedTarget instanceof MonsterBase) {
            particleSpawn.y -= as3.cast(damagedTarget, MonsterBase)._altitude;
        }
        let recentAttacks: int = ATTACK.m_recentlyAttacked.get(damagedTarget) | 0;
        ATTACK.m_recentlyAttacked.set(damagedTarget, recentAttacks + 1);
        if (recentAttacks > 2) {
            return;
        }
        if (recentAttacks == 1) {
            particleSpawn.x += 10 * amount.toString().length;
        } else if (recentAttacks == 2) {
            particleSpawn.x -= 10 * amount.toString().length;
        }
        let damageParticle: ParticleDamageItem = ParticleText.Create(particleSpawn, amount, particleType);
        if (amountModified != 0 && Boolean(damageParticle)) {
            let modifier: string = amountModified < 0 ? "-" : "+";
            damageParticle._mc.tLootA.htmlText += "(" + modifier + Math.abs(Math.round(amountModified)) + ")";
            damageParticle._mc.tLootB.htmlText += "(" + modifier + Math.abs(Math.round(amountModified)) + ")";
        }
    }

    public static Damage(param1: number, param2: number, param3: int, param4: boolean = true, param5: boolean = false): void {
    }

    public static ProcessDamageGrid(): void {
    }

    public static RetreatAll(): void {
        let _loc1_: any = undefined;
        for (_loc1_ of as3.values(CREEPS._creeps)) {
            _loc1_.changeModeRetreat();
        }
        if (BASE._saveOver != 1) {
            BASE.Save(1, false, true);
        }
        GLOBAL.Message(KEYS.Get("attack_msg_attackover"));
    }

    private static BucketClear(): void {
        let _loc1_: string = null;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        for (_loc1_ in ATTACK._flingerBucket) {
            _loc2_ = ATTACK._flingerBucket[_loc1_].Get() | 0;
            _loc3_ = 0;
            while (_loc3_ <= _loc2_) {
                ATTACK.BucketRemove(_loc1_);
                _loc3_++;
            }
        }
        ATTACK.BucketUpdate();
    }

    private static updateCreepAttackToPlayerSavingFunction(): void {
        let _loc1_: MonsterData = null;
        let _loc2_: int = 0;
        let _loc3_: int = CREEPS.m_attackingCreeps.length | 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc3_) {
            if (!as3.vget(CREEPS.m_attackingCreeps, _loc5_).isDisposable) {
                _loc1_ = GLOBAL.attackingPlayer.monsterListByID(as3.vget(CREEPS.m_attackingCreeps, _loc5_)._creatureID);
                if (_loc1_) {
                    _loc2_ = 0;
                    while (_loc2_ < _loc1_.m_creeps.length && as3.vget(_loc1_.m_creeps, _loc2_).health < (as3.as(as3.vget(CREEPS.m_attackingCreeps, _loc5_), MonsterBase)).maxHealth) {
                        _loc2_++;
                    }
                    if ((_loc4_ = (as3.as(as3.vget(CREEPS.m_attackingCreeps, _loc5_), MonsterBase)).health | 0) > 0) {
                        as3.vget(_loc1_.m_creeps, _loc2_).health = _loc4_;
                    } else {
                        as3.vget(_loc1_.m_creeps, _loc2_).health = 1;
                    }
                }
            }
            _loc5_++;
        }
        BASE.SaveB();
    }

    public static End(): void {
        let _loc1_: MonsterBase = null;
        ATTACK.m_waitingForSaveToComplete = false;
        // Inferno-only: the attack is over: its replay's recording ends here (one more sample: how it ended)
        if (GLOBAL.INFERNO_ONLY && IoReplayRecorder.recording) {
            IoReplayRecorder.stop(true);
        }
        ATTACK.BucketClear();
        if (!ATTACK._sentOver) {
            if (BASE._saveOver != 1) {
                BASE.Save(1, false, true);
            }
            ATTACK._sentOver = true;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IATTACK) {
            if (Boolean(CREEPS._guardian) && CREEPS._guardian.health > 0) {
                LOGGER.Stat([53, CREEPS._guardian._creatureID, 1]);
            }
            if (Boolean(CREATURES._guardian) && CREATURES._guardian.health > 0) {
                LOGGER.Stat([55, CREATURES._guardian._creatureID, 1]);
            }
        }
        for (_loc1_ of as3.values(CREEPS._creeps)) {
            _loc1_.changeModeRetreat();
        }
        SiegeWeapons.deactivateWeapon();
        if (MapRoomManager.instance.isInMapRoom2or3 && BASE.isMainYardOrInfernoMainYard && (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK)) {
            ATTACK._logOpen = false;
            ATTACK.ShowLog();
            ATTACK._shownFinal = false;
        } else if (Boolean(MAPROOM_DESCENT.DescentLevel) && MAPROOM_DESCENT.InDescent) {
            ATTACK.ShowComplete();
        } else {
            ATTACK.EndB();
        }
        let _loc2_: number = Number(ATTACK._loot.r1.Get() + ATTACK._loot.r2.Get() + ATTACK._loot.r3.Get() + ATTACK._loot.r4.Get());
        LOGGER.KongStat([3, _loc2_]);
    }

    public static ShowComplete(): void {
        ATTACK.EndB();
    }

    private static EndBForMapRoom3(): void {
        let _loc1_: int = 0;
        _loc1_ = ATTACK.CalculateBaseDamagePercent() | 0;
        let _loc2_: any = _loc1_ >= BYMConfig.k_sVICTORY_THRESHOLD;
        if (BASE.isMainYard) {
            GLOBAL.ShowMap();
        } else if (BASE.isOutpost) {
            if (!_loc2_) {
                MapRoom3AttackFinishedPopup.instance.Show(Boolean(_loc2_));
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            WMBASE._destroyed = Boolean(_loc2_);
            MapRoom3AttackFinishedPopup.instance.Show(Boolean(_loc2_));
        }
    }

    public static EndB(): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: Vector<any> = null;
        let _loc9_: BUILDING14 = null;
        let _loc10_: popup_attackend = null;
        let _loc1_: boolean = false;
        let _loc2_: int = 0;
        ATTACK._shownFinal = true;
        let _loc3_: boolean = INFERNO_DESCENT_POPUPS.isInDescent();
        let _loc6_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc7_ of (_loc6_ ?? [])) {
            if (_loc7_._class != "wall" && (_loc7_._class == "trap" && _loc7_._class == "enemy" && _loc7_._fired) === false && (_loc7_._type == 53 && _loc7_._expireTime < GLOBAL.Timestamp()) === false) {
                _loc4_ = (_loc4_ + _loc7_.health) | 0;
                _loc5_ = (_loc5_ + _loc7_.maxHealth) | 0;
            }
        }
        _loc2_ = (100 - 100 / _loc5_ * _loc4_) | 0;
        if (MapRoomManager.instance.isInMapRoom3 && !_loc3_ && !BASE.isInfernoMainYardOrOutpost) {
            ATTACK.EndBForMapRoom3();
            return;
        }
        if (MapRoomManager.instance.isInMapRoom2 && !_loc3_) {
            if ((BASE.isOutpostMapRoom2Only || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK) && _loc2_ >= BYMConfig.k_sVICTORY_THRESHOLD) {
                _loc1_ = true;
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    WMBASE._destroyed = true;
                }
            } else if ((BASE.isMainYardInfernoOnly || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK) && _loc2_ >= BYMConfig.k_sVICTORY_THRESHOLD) {
                _loc1_ = true;
                if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK) {
                    WMBASE._destroyed = true;
                }
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK) {
            _loc8_ = InstanceManager.getInstancesByClass(BUILDING14);
            for (_loc9_ of (_loc8_ ?? [])) {
                if (_loc9_.health == 0 && _loc9_._repairing == 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK)) {
                    if (TRIBES.TribeForBaseID(BASE._wmID).id == 2) {
                        ACHIEVEMENTS.Check("wm2hall", 1);
                    }
                    if (!MAPROOM_DESCENT.InDescent) {
                        _loc1_ = true;
                    }
                    break;
                }
            }
            if (_loc2_ >= BYMConfig.k_sVICTORY_THRESHOLD && MAPROOM_DESCENT.InDescent) {
                _loc1_ = true;
            }
            if (INFERNO_DESCENT_POPUPS.isInDescent()) {
                INFERNO_DESCENT_POPUPS.ShowPostAttackPopup(MAPROOM_DESCENT._descentLvl >>> 0, _loc1_, Vector.from([ATTACK._loot.r1.Get(), ATTACK._loot.r2.Get(), ATTACK._loot.r3.Get(), ATTACK._loot.r4.Get()], uint), Vector.from([MAPROOM_DESCENT._loot.r1.Get(), MAPROOM_DESCENT._loot.r2.Get(), MAPROOM_DESCENT._loot.r3.Get(), MAPROOM_DESCENT._loot.r4.Get()], uint));
                ACHIEVEMENTS.Check(ACHIEVEMENTS.DESCENT_LEVEL, MAPROOM_DESCENT.DescentLevel);
            }
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicibuild");
        } else {
            SOUNDS.PlayMusic("musicbuild");
        }
        // Inferno-only quest book: a win, and on whom
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.attackEnded(_loc1_);
        }
        GLOBAL.eventDispatcher.dispatchEvent(new AttackEvent(AttackEvent.ATTACK_OVER, _loc1_, BASE._wmID, ATTACK._loot));
        if (MapRoomManager.instance.isInMapRoom2 && BASE.isOutpostMapRoom2Only || (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK)) {
            (_loc10_ = new popup_attackend(_loc1_)).mcFrame.Setup(false);
            POPUPS.Push(_loc10_);
            if (MapRoomManager.instance.isInMapRoom2 && !GLOBAL.m_mapRoomFunctional) {
                GLOBAL.Message(KEYS.Get("map_msg_damaged"));
            }
        } else if (MapRoomManager.instance.isInMapRoom2) {
            GLOBAL.ShowMap();
        } else if (GLOBAL._loadmode == GLOBAL.mode) {
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        } else if (MAPROOM_DESCENT.InDescent) {
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        } else {
            BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
        }
    }

    public static WellDefended(param1: boolean = true, param2: string = ""): void {
        let tribe: any = null;
        let wildMonsters: boolean = false;
        let attackersName: string = null;
        let Post: Function = null;
        let popupMC: popup_defense = null;
        tribe = null;
        wildMonsters = param1;
        attackersName = param2;
        Post = (): void => {
            if (wildMonsters) {
                GLOBAL.CallJS("sendFeed", ["defense-wild", KEYS.Get("ai_gooddefense_streamtitle", { "v1": tribe.name }), KEYS.Get("ai_gooddefense", { "v1": tribe.name }), tribe.streampostpic]);
            } else {
                GLOBAL.CallJS("sendFeed", ["defense-human", KEYS.Get("attack_gooddefense_streamtitle", { "v1": attackersName }), KEYS.Get("attack_gooddefense_streambody"), "defense2.png"]);
            }
            POPUPS.Next();
        };
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent.active) {
            activeEvent.EndRound(true);
            return;
        }
        if (INFERNO_EMERGENCE_EVENT.isAttackActive) {
            INFERNO_EMERGENCE_POPUPS.ShowStagePassed(INFERNOPORTAL.building._lvl.Get() | 0);
            return;
        }
        popupMC = new popup_defense();
        tribe = TRIBES.TribeForBaseID(WMATTACK._attackersBaseID);
        if (wildMonsters) {
            popupMC.tText.htmlText = "<b>" + KEYS.Get("ai_gooddefense", { "v1": tribe.name }) + "</b>";
        } else {
            popupMC.tText.htmlText = "<b>" + KEYS.Get("attack_gooddefense", { "v1": attackersName }) + "</b>";
        }
        popupMC.bAction.SetupKey("btn_brag");
        popupMC.bAction.addEventListener(MouseEvent.CLICK, Post);
        popupMC.bAction.Highlight = true;
        if (wildMonsters) {
            POPUPS.Push(popupMC, null, null, null, as3.str(tribe.splash.split("popups/").join("")));
        } else {
            // Inferno-only: defense2.png is not on the server (an empty frame): the Magma Tower instead
            POPUPS.Push(popupMC, null, null, null, GLOBAL.INFERNO_ONLY ? "building-magma_tower.png" : "defense2.png");
        }
    }

    public static PoorDefense(): void {
        let mc: popup_damaged_ai = null;
        let RepairAll: Function = null;
        let RepairNow: Function = null;
        mc = null;
        RepairAll = null;
        RepairNow = null;
        if (INFERNO_EMERGENCE_EVENT.isAttackActive) {
            INFERNO_EMERGENCE_POPUPS.ShowStagePassed(INFERNOPORTAL.building._lvl.Get() | 0);
            return;
        }
        if (TUTORIAL._stage > 40) {
            RepairAll = (param1: MouseEvent = null): void => {
                let _loc3_: BFOUNDATION = null;
                mc.bAction.removeEventListener(MouseEvent.CLICK, RepairAll);
                mc.bAction2.removeEventListener(MouseEvent.CLICK, RepairNow);
                let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc3_ of (_loc2_ ?? [])) {
                    if (_loc3_.health < _loc3_.maxHealth && _loc3_._repairing == 0) {
                        _loc3_.Repair();
                    }
                }
                SOUNDS.Play("repair1", 0.25);
                POPUPS.Next();
            };
            RepairNow = (param1: MouseEvent = null): void => {
                let _loc3_: BFOUNDATION = null;
                mc.bAction.removeEventListener(MouseEvent.CLICK, RepairAll);
                mc.bAction2.removeEventListener(MouseEvent.CLICK, RepairNow);
                let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc3_ of (_loc2_ ?? [])) {
                    if (_loc3_.health < _loc3_.maxHealth && _loc3_._repairing == 0) {
                        _loc3_.Repair();
                    }
                }
                STORE.ShowB(3, 1, ["FIX"], true);
                POPUPS.Next();
            };
            mc = new popup_damaged_ai();
            (as3.as(mc.mcFrame, frame)).Setup(false);
            mc.tA.htmlText = "<b>" + KEYS.Get("ai_poordefense_ta") + "</b>";
            mc.tB.htmlText = "<b>" + KEYS.Get("ai_poordefense_tb") + "</b>";
            mc.tC.htmlText = KEYS.Get("ai_poordefense_tc");
            mc.bAction.SetupKey("ai_repairdamage_btn");
            mc.bAction.addEventListener(MouseEvent.CLICK, RepairAll);
            mc.bAction2.SetupKey("pop_damaged_repairnow_btn");
            mc.bAction2.addEventListener(MouseEvent.CLICK, RepairNow);
            mc.bAction2.Highlight = true;
            POPUPS.Push(mc, null, null, "shotgun", "military.png");
        }
    }

    protected static CalculateBaseDamagePercent(param1: uint = 100): number {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: BFOUNDATION = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc5_ of (_loc2_ ?? [])) {
            if (_loc5_._class != "wall" && (_loc5_._class == "trap" && _loc5_._class == "enemy" && _loc5_._fired) === false && (_loc5_._type == 53 && _loc5_._expireTime < GLOBAL.Timestamp()) === false) {
                _loc4_ = (_loc4_ + _loc5_.health) | 0;
                _loc3_ = (_loc3_ + _loc5_.maxHealth) | 0;
            }
        }
        return param1 - _loc4_ / _loc3_ * param1;
    }
}
