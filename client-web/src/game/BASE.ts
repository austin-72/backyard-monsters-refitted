import * as as3 from "as3";
import { ASObject, Class, Vector, int, uint } from "as3";
import { DisplayObject, Loader, MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Point } from "flash/geom";
import { URLRequest } from "flash/net";
import { System } from "flash/system";
import { TextField } from "flash/text";
import { Dictionary, getTimer, setTimeout } from "flash/utils";
import { ACADEMY, ACHIEVEMENTS, ALLIANCES, ATTACK, AutoBankManager, BDECORATION, BFOUNDATION, BMUSHROOM, BRESOURCE, BTOTEM, BTOWER, BTRAP, BUILDING1, BUILDING10, BUILDING11, BUILDING112, BUILDING113, BUILDING115, BUILDING117, BUILDING118, BUILDING12, BUILDING13, BUILDING14, BUILDING15, BUILDING16, BUILDING17, BUILDING18, BUILDING19, BUILDING2, BUILDING20, BUILDING21, BUILDING22, BUILDING23, BUILDING24, BUILDING25, BUILDING26, BUILDING27, BUILDING3, BUILDING4, BUILDING5, BUILDING51, BUILDING52, BUILDING6, BUILDING7, BUILDING8, BUILDING9, BUILDINGINFO, BUILDINGS, BUY, BWALL, BYMConfig, BaseBuffHandler, BaseTemplate, BaseTemplateNode, BlackSpurtzCannon, BuildingOverlay, Bunker, CASINO, CHAMPIONCAGE, CHAMPIONCHAMBER, CHECKER, CREATURELOCKER, CREATURES, CREEPS, CUSTOMATTACKS, CellData, ChampionBase, Chat, Console, EFFECTS, Elastic, EnumYardType, FBPROMO_711_CLIP, FIREBALLS, Fire, FrontPageHandler, GAME, GIBLETS, GIFTS, GLOBAL, GRID, GuardTower, HOUSING, HOUSINGBUNKER, ICoreBuilding, IHandler, INFERNOPORTAL, INFERNOQUAKETOWER, INFERNO_CANNON_TOWER, INFERNO_DESCENT_POPUPS, INFERNO_EMERGENCE_EVENT, INFERNO_MAGMA_TOWER, InstanceManager, InventoryManager, IoAttackLogs, IoBugReport, IoChangelog, IoDailyPopup, IoDesigner, IoGauntlet, IoHfo, IoHfoIce, IoHfoWaves, IoLeaderboards, IoOutpostsPopup, IoPets, IoReplayPlayer, IoReplayRecorder, IoTestMode, IoUnderworld, KEYS, LOGGER, LOGIN, MAP, MAPROOM, MAPROOM_DESCENT, MAPROOM_INFERNO, MARKETING, MONSTERBAITER, MONSTERLAB, MUSHROOMS, MapRoom3, MapRoom3OutpostSecured, MapRoom3Tutorial, MapRoomCell, MapRoomManager, MonsterMadness, MouseWheelEnabler, NewPopupSystem, OutpostDefender, PATHING, PLEASEWAIT, POPUPS, POWERUPS, PROJECTILES, ParticleText, PlannerTemplate, Player, PopupLostMainBase, QUESTS, QUEUE, RADIO, RasterData, ReplayableEventHandler, ResourceBombs, ResourceCapacityBaseBuff, ResourceOutpost, ResourcePackages, RewardHandler, SOUNDS, SPECIALEVENT, SPECIALEVENT_WM1, SPRITES, STORE, SecNum, SiegeBuilding, SiegeFactory, SiegeLab, SiegeWeapons, Smoke, SpurtzCannon, TRIBES, TUTORIAL, Targeting, TweenLite, UI2, UPDATES, URLLoaderApi, WMATTACK, WMBASE, WORKERS, com_monsters_maproom_advanced_MapRoom as MapRoom, md5, popup_attackedme, popup_damaged, popup_damagedbase_onvisit, popup_levelup, popup_loot, popup_prefab_help, print } from "@game";

export class BASE extends ASObject {
    public static _baseID: number;

    public static _wmID: int;

    public static _resources: any;

    public static _hpResources: any;

    public static _bankedValue: number;

    public static _bankedTime: int;

    public static _shakeCountdown: int;

    public static _blockSave: boolean;

    public static _attackerArray: any[];

    public static _attackerNameArray: any[];

    public static _currentAttacks: any[];

    public static _attacksModified: boolean;

    public static _deltaResources: any;

    public static _hpDeltaResources: any;

    public static _savedDeltaResources: any;

    public static _GIP: any;

    public static _processedGIP: any;

    public static _rawGIP: any;

    public static _lastProcessedGIP: int;

    public static _credits: SecNum;

    public static _hpCredits: int;

    public static _saveCounterA: int;

    public static _saveCounterB: int;

    public static _saving: boolean;

    public static _paging: boolean;

    public static _lastSaveID: int;

    public static _attackID: int;

    public static _lastSaved: int;

    public static _lastSaveRequest: int;

    public static _saveOver: int;

    public static _returnHome: boolean;

    public static _saveProtect: int;

    public static _saveErrors: int;

    public static _pageErrors: int;

    public static _loadTime: int;

    public static _loading: boolean;

    public static _infernoSaveLoad: boolean;

    public static _lastProcessed: int;

    public static _lastProcessedB: int;

    public static _catchupTime: int;

    public static _currentTime: int;

    public static _baseData: any[];

    public static _upgradeData: any;

    public static _buildingCount: int;

    public static _buildingHealthData: any;

    public static _buildingData: any;

    public static _buildingsAll: any;

    public static _buildingsWalls: any;

    public static _buildingsTowers: any;

    public static _buildingsBunkers: any;

    public static _buildingsHousing: any[];

    public static _buildingsMain: any;

    public static _buildingsMushrooms: any;

    public static _buildingsGifts: any;

    public static _buildingsStored: any;

    public static buildings: Vector<BFOUNDATION>;

    public static _rawMonsters: any;

    public static _mushroomList: any[];

    public static _lastSpawnedMushroom: int;

    /** Inferno-only: the load's io_replay ({key, rec}: an attack to record) and io_replay_view ({key}: a replay's yard). */
    private static _ioReplay: any;

    private static _ioReplayView: any;

    public static _baseName: string;

    public static _baseSeed: int;

    public static _loadedBaseID: number;

    public static _loadedFriendlyBaseID: number;

    public static _loadedFBID: number;

    public static _baseLevel: int;

    public static _baseValue: number;

    public static _basePoints: number;

    public static _outpostValue: number;

    public static _processing: boolean;

    public static _timer: int;

    public static _size: int;

    public static _angle: number;

    public static _buildingCounts: any;

    public static _buildingStatsToggle: boolean;

    public static _lastPaged: int;

    public static _tempLoot: any;

    public static _tempGifts: any[];

    public static _tempSentGifts: any[];

    public static _tempSentInvites: any[];

    public static _isProtected: int;

    public static _isReinforcements: int;

    public static _isSanctuary: int;

    public static _isFan: int;

    public static _isBookmarked: int;

    public static _installsGenerated: int;

    public static _ownerName: string;

    public static _ownerPic: string;

    public static _pendingPurchase: any[];

    public static _pendingPromo: int;

    public static _pendingFBPromo: int;

    public static _pendingFBPromoIDs: any[];

    public static _salePromoTime: int;

    public static _loadBase: any[];

    public static _percentDamaged: int;

    public static _userID: int;

    public static _allianceID: int;

    public static _damagedBaseWarnTime: number;

    public static _takeoverFirstOpen: int;

    public static _takeoverPreviousOwnersName: string;

    private static s_processing: boolean;

    private static _tmpPercent: number;

    private static _oldSiegeData: any;

    public static loadObject: any;

    public static _ideltaResources: any;

    public static _iresources: any;

    public static _allianceArmamentTime: SecNum;

    private static s_resourceCells: any;

    public static _loadedYardType: int;

    private static m_yardType: int;

    protected static _firstBaseLoaded: boolean;

    public static _userDigits: any[];

    public static _guardianData: Vector<any>;

    public static s_eventBases: Vector<number>;

    public static _showingWhatsNew: boolean;

    public static _needCurrentCell: boolean;

    public static _currentCellLoc: Point;

    private static s_levels: any[]; // const

    private static _loadedSomething: boolean;

    private static _addtionalLoadArguments: any[];

    private static _ioWelcomeShown: boolean;

    /** Inferno-only: a yard's load with no answer is asked for again this many times (3, 6, ... 18 s apart). */
    private static IO_LOAD_RETRIES: int; // const

    /** Inferno-only: counts base loads, so an answer to one that a newer load replaced is not used. */
    private static _ioLoadSeq: int;

    /** Inferno-only: the last amounts the server sent and when, for the log line below. */
    private static _ioServerResources: string;

    /**
     * Inferno-only (the Outposts list's buttons): which way LoadNext goes, 1 (Next) or -1 (Previous). It
     * stays set while LoadNext waits for a save to finish, and goes back to 1 once used.
     */
    public static _ioStepDir: int;

    /** Admin test mode: storage without limit and resources always full (IoTestMode). */
    public static IO_TEST_RESOURCES: number; // const

    static {
        as3.lazyStatics(this, { _baseID: NaN, _wmID: 0, _resources: null, _hpResources: null, _bankedValue: NaN, _bankedTime: 0, _shakeCountdown: 0, _blockSave: false, _attackerArray: null, _attackerNameArray: null, _currentAttacks: null, _attacksModified: false, _deltaResources: null, _hpDeltaResources: null, _savedDeltaResources: null, _GIP: null, _processedGIP: null, _rawGIP: null, _lastProcessedGIP: 0, _credits: null, _hpCredits: 0, _saveCounterA: 0, _saveCounterB: 0, _saving: false, _paging: false, _lastSaveID: 0, _attackID: 0, _lastSaved: 0, _lastSaveRequest: 0, _saveOver: 0, _returnHome: false, _saveProtect: 0, _saveErrors: 0, _pageErrors: 0, _loadTime: 0, _loading: false, _infernoSaveLoad: false, _lastProcessed: 0, _lastProcessedB: 0, _catchupTime: 0, _currentTime: 0, _baseData: null, _upgradeData: null, _buildingCount: 0, _buildingHealthData: null, _buildingData: null, _buildingsAll: null, _buildingsWalls: null, _buildingsTowers: null, _buildingsBunkers: null, _buildingsHousing: null, _buildingsMain: null, _buildingsMushrooms: null, _buildingsGifts: null, _buildingsStored: null, buildings: null, _rawMonsters: null, _mushroomList: null, _lastSpawnedMushroom: 0, _ioReplay: null, _ioReplayView: null, _baseName: null, _baseSeed: 0, _loadedBaseID: NaN, _loadedFriendlyBaseID: NaN, _loadedFBID: NaN, _baseLevel: 0, _baseValue: NaN, _basePoints: NaN, _outpostValue: NaN, _processing: false, _timer: 0, _size: 0, _angle: NaN, _buildingCounts: null, _buildingStatsToggle: false, _lastPaged: 0, _tempLoot: null, _tempGifts: null, _tempSentGifts: null, _tempSentInvites: null, _isProtected: 0, _isReinforcements: 0, _isSanctuary: 0, _isFan: 0, _isBookmarked: 0, _installsGenerated: 0, _ownerName: null, _ownerPic: null, _pendingPurchase: null, _pendingPromo: 0, _pendingFBPromo: 0, _pendingFBPromoIDs: null, _salePromoTime: 0, _loadBase: null, _percentDamaged: 0, _userID: 0, _allianceID: 0, _damagedBaseWarnTime: NaN, _takeoverFirstOpen: 0, _takeoverPreviousOwnersName: null, s_processing: false, _tmpPercent: NaN, _oldSiegeData: null, loadObject: null, _ideltaResources: null, _iresources: null, _allianceArmamentTime: null, s_resourceCells: null, _loadedYardType: 0, m_yardType: 0, _firstBaseLoaded: false, _userDigits: null, _guardianData: null, s_eventBases: null, _showingWhatsNew: false, _needCurrentCell: false, _currentCellLoc: null, s_levels: null, _loadedSomething: false, _addtionalLoadArguments: null, _ioWelcomeShown: false, IO_LOAD_RETRIES: 0, _ioLoadSeq: 0, _ioServerResources: null, _ioStepDir: 0, IO_TEST_RESOURCES: NaN }, () => {
            BASE._ioReplay = null;
            BASE._ioReplayView = null;
            BASE._ideltaResources = null;
            BASE._iresources = null;
            BASE._allianceArmamentTime = new SecNum(0);
            BASE.s_resourceCells = {};
            BASE._loadedYardType = 0;
            BASE.m_yardType = EnumYardType.MAIN_YARD;
            BASE._firstBaseLoaded = true;
            BASE._userDigits = [];
            BASE._guardianData = new Vector<any>(0, false, Object);
            BASE.s_eventBases = new Vector<number>(0, false, Number);
            BASE._showingWhatsNew = false;
            BASE._needCurrentCell = false;
            BASE._currentCellLoc = null;
            BASE.s_levels = [0, 900, 3500, 5000, 7500, 10500, 14700, 20580, 28812, 40337, 56472, 79060, 110684, 154958, 216941, 303717, 425204, 595286, 833401, 1166761, 1633465, 2286851, 3201591, 4482228, 6275119, 8785167, 12299234, 17218927, 24106498, 33749097, 47248736, 66148230, 92607522, 129650530, 181510743, 254115040, 355761056, 498065478, 697291669, 976208337, 1366691671, 1913368339, 2678715675, 3750201945, 5250282723, 7350395812, 10290554137, 14406775792, 20169486109, 28237280553, 39532192774, 55345069884, 77483097838, 108476336973, 151866871762, 212613620467, 297659068653, 357190880000, 428629050000, 514354860000, 617225830000, 740670990000, 888805180000, 1066566210000, 1279879450000, 1535853400000, 1843026400000, 2211631680000, 2653958010000, 3184749610000, 3821699530000, 4586039430000, 5503247310000, 6603896770000, 7924676120000, 9509611340000, 11411533600000, 13693840320000, 16432608380000, 19719130050000, 23662956060000, 28395547270000, 34074656720000, 40889588060000, 49067505670000, 58881006800000, 70657208160000, 84788649790000, 101746379740000, 122095655680000, 146514786810000, 175817744170000, 210981293000000, 253177551600000, 303813061920000, 364575674300000, 437490809160000, 524988970990000, 629986765180000, 755984118210000];
            BASE._loadedSomething = false;
            BASE._addtionalLoadArguments = [];
            BASE._ioWelcomeShown = false;
            BASE.IO_LOAD_RETRIES = 6;
            BASE._ioLoadSeq = 0;
            BASE._ioServerResources = "none";
            BASE._ioStepDir = 1;
            BASE.IO_TEST_RESOURCES = 999999999;
        });
    }

    public $ctor(): void {
        super.$ctor();
        BASE._baseID = 0;
        BASE.Setup();
        BASE.Load();
    }

    public static get yardType(): int {
        return BASE.m_yardType;
    }

    public static set yardType(param1: int) {
        BASE.m_yardType = param1;
    }

    public static get firstBaseLoaded(): boolean {
        return BASE._firstBaseLoaded;
    }

    public static get processing(): boolean {
        return BASE.s_processing;
    }

    public static get resourceCells(): any {
        return BASE.s_resourceCells;
    }

    public static Setup(): void {
        BASE._buildingsHousing = [];
        BASE._buildingsBunkers = {};
        BASE._pendingPurchase = [];
        BASE._buildingCount = 0;
        BASE._processing = false;
        BASE._buildingStatsToggle = false;
        BASE._angle = 0.8;
        BASE._lastPaged = 0;
        BASE._blockSave = false;
        BASE._damagedBaseWarnTime = 0;
        BASE._saveCounterA = 0;
        BASE._saveCounterB = 0;
        BASE._saveOver = 0;
        BASE._returnHome = false;
        BASE._saveProtect = 0;
        BASE._saving = false;
        BASE._paging = false;
        BASE._saveErrors = 0;
        BASE._currentAttacks = [];
        BASE._attacksModified = false;
        BASE._pageErrors = 0;
        BASE._lastSaved = 0;
        BASE._infernoSaveLoad = false;
        BASE._isProtected = 0;
        BASE._isReinforcements = 0;
        BASE._isSanctuary = 0;
        BASE._isFan = 0;
        BASE._isBookmarked = 0;
        BASE._installsGenerated = 0;
        BASE._ideltaResources = { "dirty": false, "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "r1max": 0, "r2max": 0, "r3max": 0, "r4max": 0 };
        BASE._iresources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "r1max": 0, "r2max": 0, "r3max": 0, "r4max": 0 };
        BASE._deltaResources = { "dirty": false, "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        BASE._hpDeltaResources = { "dirty": false, "r1": Number(0), "r2": Number(0), "r3": Number(0), "r4": Number(0) };
        BASE._savedDeltaResources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        BASE._loadBase = [];
        GLOBAL.Clear();
    }

    public static Cleanup(): void {
        // Inferno-only: the yard's pets go with it; an attack being recorded sends the rest of its replay; a
        // replay playing stops
        IoPets.Clear();
        IoReplayRecorder.stop(true);
        IoReplayPlayer.Clear();
        // Hell Freezes Over: its things in the yard go with it (a wave left half-fought counts as lost)
        IoHfoWaves.Abandon();
        IoHfo.Cleanup();
        SPECIALEVENT.ClearWildMonsterPowerups();
        SPECIALEVENT_WM1.ClearWildMonsterPowerups();
        BaseBuffHandler.instance.clearBuffs();
        RewardHandler.instance.clear();
        GLOBAL.player.clear();
        if (GLOBAL.attackingPlayer) {
            GLOBAL.attackingPlayer.clear();
        }
        CREATURES.Clear();
        CREEPS.Clear();
        GLOBAL._ROOT.removeChild(GLOBAL._layerMap);
        GLOBAL._ROOT.removeChild(GLOBAL._layerUI);
        GLOBAL._ROOT.removeChild(GLOBAL._layerWindows);
        GLOBAL._ROOT.removeChild(GLOBAL._layerMessages);
        GLOBAL._ROOT.removeChild(GLOBAL._layerTop);
        GLOBAL._layerMap = as3.as(GLOBAL._ROOT.addChild(new Sprite()), Sprite);
        GLOBAL._layerUI = as3.as(GLOBAL._ROOT.addChild(new Sprite()), Sprite);
        GLOBAL._layerWindows = as3.as(GLOBAL._ROOT.addChild(new Sprite()), Sprite);
        GLOBAL._layerMessages = as3.as(GLOBAL._ROOT.addChild(new Sprite()), Sprite);
        GLOBAL._layerTop = as3.as(GLOBAL._ROOT.addChild(new Sprite()), Sprite);
        GLOBAL._layerMap.mouseEnabled = false;
        GLOBAL._layerUI.mouseEnabled = false;
        GLOBAL._layerWindows.mouseEnabled = false;
        GLOBAL._layerMessages.mouseEnabled = false;
        GLOBAL._layerTop.mouseEnabled = false;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        while (_loc1_.length) {
            (as3.as(as3.vget(_loc1_, 0), BFOUNDATION)).clear();
        }
        InstanceManager.clearAll();
        BASE.buildings = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
        BASE._buildingsAll = {};
        BASE._buildingsWalls = {};
        BASE._buildingsTowers = {};
        BASE._buildingsMain = {};
        BASE._buildingsMushrooms = {};
        BASE._buildingsGifts = {};
        BASE._buildingsStored = {};
        GLOBAL.setTownHall(null);
        GLOBAL._bAcademy = null;
        GLOBAL._bBaiter = null;
        GLOBAL._bFlinger = null;
        GLOBAL._bHatchery = null;
        GLOBAL._bHatcheryCC = null;
        GLOBAL._bHousing = null;
        GLOBAL._bJuicer = null;
        GLOBAL._bLocker = null;
        GLOBAL._bMap = null;
        GLOBAL._bStore = null;
        UI2.Hide("warning");
        UI2.Hide("scareAway");
        // Windows of the yard going (their statics would say they are still open), the raid warning
        // (it would stop the next yard's warning from showing) and the blockers of the old layers.
        IoOutpostsPopup.ioCloseOpen();
        IoTestMode.ioCloseOpen();
        IoDesigner.ioCloseOpen();
        IoLeaderboards.CloseOpen();
        IoAttackLogs.CloseOpen();
        IoChangelog.CloseOpen();
        WMATTACK.HideWarning();
        WMATTACK.ioResetSpawnLevel();
        GLOBAL.ioBlockersReset();
        WMATTACK._inProgress = false;
        MONSTERBAITER._scaredAway = false;
        CUSTOMATTACKS._started = false;
        WMATTACK._queued = null;
        if (Boolean(WMATTACK._history) && Boolean(WMATTACK._history._queued)) {
            delete WMATTACK._history.queued;
        }
        if (UI2._wildMonsterBar) {
            UI2.Hide("wmbar");
        }
        GRID.Cleanup();
        PATHING.Cleanup();
        RasterData.clear();
        BASE._showingWhatsNew = false;
        BASE._deltaResources = { "dirty": false, "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        BASE._hpDeltaResources = { "dirty": false, "r1": 0, "r2": 0, "r3": 0, "r4": 0 };
        BASE._savedDeltaResources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
    }

    public static LoadBase(url: string = null, userId: number = 0, baseId: number = 0, baseMode: string = "build", isError: boolean = false, baseType: int = -1, cellId: number = 0, keyValuePairs: any[] = null): boolean {
        if (isNaN(baseId)) {
            baseId = 0;
        }
        if (isNaN(userId)) {
            userId = 0;
        }
        // Inferno-only: there is no separate Inferno yard; the stock game's ways back to it (the end of an
        // attack or its popup when the map is not the current one, the Descent's capture) go home instead.
        // The Inferno yard's load was refused ("You do not have permission ...") and halted (bug #54).
        if (GLOBAL.INFERNO_ONLY && baseMode == GLOBAL.e_BASE_MODE.IBUILD) {
            LOGGER.Log("log", "Inferno yard load sent home (base " + baseId + ", type " + baseType + ", from " + GLOBAL.mode + ")");
            url = null;
            baseMode = GLOBAL.e_BASE_MODE.BUILD;
            if (baseType == EnumYardType.INFERNO_YARD || baseType < 0) {
                baseType = EnumYardType.MAIN_YARD;
            } else if (baseType == EnumYardType.INFERNO_OUTPOST) {
                baseType = EnumYardType.OUTPOST;
            }
        }
        if (MapRoomManager.instance.isInMapRoom2or3 && MapRoomManager.instance.isOpen) {
            MapRoomManager.instance.Hide();
        }
        if (MAPROOM_INFERNO._open) {
            MAPROOM_INFERNO.Hide();
        }
        if (MAPROOM._open) {
            MAPROOM.Hide();
        }
        if (!MapRoomManager.instance.isInMapRoom2or3 && (baseMode == GLOBAL.e_BASE_MODE.ATTACK || baseMode == GLOBAL.e_BASE_MODE.IATTACK) && (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD)) {
            return false;
        }
        if (!BASE._loading) {
            GLOBAL._reloadonerror = isError;
            if (baseId == 0 && userId == 0) {
                if (baseMode != GLOBAL.e_BASE_MODE.IBUILD) {
                    baseMode = GLOBAL.e_BASE_MODE.BUILD;
                }
            }
            if ((baseMode == GLOBAL.e_BASE_MODE.ATTACK || baseMode == GLOBAL.e_BASE_MODE.WMATTACK) && (!MapRoomManager.instance.isInMapRoom2or3 && (!GLOBAL._bFlinger || !GLOBAL._bFlinger._canFunction) && !BASE.isInfernoMainYardOrOutpost)) {
                LOGGER.Log("err", "Impossible fling");
                GLOBAL.ErrorMessage("BASE.LoadBase impossible fling");
                return false;
            }
            BASE._loadBase = [url, userId, baseId, baseMode, baseType, cellId];
            if (!MapRoomManager.instance.isInMapRoom2or3 && (baseMode == GLOBAL.e_BASE_MODE.ATTACK || baseMode == GLOBAL.e_BASE_MODE.WMATTACK || baseMode == GLOBAL.e_BASE_MODE.IATTACK || baseMode == GLOBAL.e_BASE_MODE.IWMATTACK)) {
                PLEASEWAIT.Show(KEYS.Get("msg_preparing"));
                BASE.Save(0, false, true);
            } else if (!BASE._saving) {
                if (keyValuePairs) {
                    BASE._addtionalLoadArguments.push(keyValuePairs);
                }
                BASE.LoadBaseB();
                BASE._addtionalLoadArguments = [];
            }
        }
        return true;
    }

    public static LoadBaseB(): void {
        print("|BASE| - LoadBaseB() _loadBase:" + JSON.stringify(BASE._loadBase));
        GLOBAL._baseURL2 = as3.str(BASE._loadBase[0]);
        let userId: number = Number(BASE._loadBase[1]);
        let baseId: number = Number(BASE._loadBase[2]);
        let baseMode: string = String(BASE._loadBase[3]);
        let baseType: int = BASE._loadBase[4] | 0;
        let cellId: int = BASE._loadBase[5] | 0;
        BASE._loadBase = [];
        GLOBAL.Setup(baseMode);
        BASE.Load(GLOBAL._baseURL2, userId, baseId, baseType, cellId);
    }

    /** Inferno-only: the once-per-login welcome (text from the server, InfernoOnlyConfig.welcome). */
    private static ioWelcome(): void {
        let title: string = GLOBAL._flags && GLOBAL._flags.io_welcome_title ? String(GLOBAL._flags.io_welcome_title) : "";
        let body: string = GLOBAL._flags && GLOBAL._flags.io_welcome_body ? String(GLOBAL._flags.io_welcome_body) : "";
        if (BASE._ioWelcomeShown || body == "") {
            return;
        }
        BASE._ioWelcomeShown = true;
        // (the popup has a frame for a picture: without one it showed an empty box; a server without the
        // io_welcome_image flag gets the two friends)
        let image: string = GLOBAL._flags && GLOBAL._flags.io_welcome_image != null ? String(GLOBAL._flags.io_welcome_image) : "invite-friends.png";
        POPUPS.DisplayGeneric(title, body.split("\n").join("<br>"), KEYS.Get("btn_ok"), image != "" ? image : null, (param1: MouseEvent): void => {
            POPUPS.Next();
        });
    }

    /**
     * Inferno-only daily login reward (server: services/user/dailyLogin.ts), opened from the Daily Reward
     * button (the gift button's place in the top bar; UI_TOP.ioDailyButton). The flag io_streak says
     * whether today's reward is waiting and what it is; Collect claims it and the new shiny total and
     * streak come straight back.
     */
    public static ioOpenDaily(): void {
        let status: any = null;
        let raw: string = GLOBAL._flags && GLOBAL._flags.io_streak ? String(GLOBAL._flags.io_streak) : "";
        try {
            status = raw != "" ? JSON.parse(raw) : null;
        } catch (e) {
            status = null;
        }
        if (!status) {
            GLOBAL.Message("The daily reward is not available right now.");
            return;
        }
        IoDailyPopup.Show(status);
    }

    public static Load(url: string = null, userId: number = 0, baseId: number = 0, baseType: int = -1, cellId: number = 0): void {
        let requestData: any[] = null;
        let seq: int = 0;
        let tries: int = 0;
        let onLoaded: Function = null;
        let loadUrl: string = null;
        let onFailed: Function = null;
        IoBugReport.Screen("yard: " + GLOBAL._loadmode + " base " + baseId + (userId ? " of player " + userId : "") + (baseType >= 0 ? " (type " + baseType + ")" : ""));
        let _loc15_: int = 0;
        GLOBAL._baseLoads += 1;
        let _loc6_: int = getTimer();
        BASE._loading = true;
        BASE._baseID = baseId;
        GLOBAL._ioDesign = null;
        // (a Designer draft says so in its answer: io_design)
        BASE._baseLevel = 0;
        BASE._saveOver = 0;
        BASE._returnHome = false;
        BASE._saveProtect = 0;
        PLEASEWAIT.Hide();
        BASE.Cleanup();
        if (MapRoomManager.instance.isInMapRoom3 && baseType != -1) {
            BASE.m_yardType = baseType;
        } else if (baseType >= EnumYardType.MAIN_YARD) {
            BASE.m_yardType = baseType;
        }
        if (BASE.isMainYardOrInfernoMainYard) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) {
                GLOBAL.attackingPlayer = GLOBAL.player;
            }
        }
        GLOBAL.attackingPlayer.isAttacking = GLOBAL.attackingPlayer != GLOBAL.player;
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        GRID.CreateGrid();
        POPUPS.Setup();
        CREEPS.Clear();
        GLOBAL.Clear();
        MAP.Clear();
        UI2.Clear();
        ResourceBombs.Clear();
        CREATURES.Clear();
        PROJECTILES.Clear();
        ATTACK.Setup();
        ResourcePackages.Clear();
        GIBLETS.Clear();
        CREATURELOCKER.Setup();
        CUSTOMATTACKS.Setup();
        UPDATES.Setup();
        BuildingOverlay.Clear();
        ParticleText.Clear();
        SPRITES.Clear();
        SPRITES.Setup();
        Fire.Clear();
        ResourceBombs.Data();
        ALLIANCES.Setup();
        GLOBAL._catchup = true;
        BASE._mushroomList = [];
        BASE._lastSpawnedMushroom = 0;
        BASE._size = 400;
        let _loc7_: string = GLOBAL._loadmode;
        if (MapRoomManager.instance.isInMapRoom2or3) {
            if (_loc7_ == GLOBAL.e_BASE_MODE.WMATTACK) {
                _loc7_ = GLOBAL.e_BASE_MODE.ATTACK;
            }
            if (_loc7_ == GLOBAL.e_BASE_MODE.WMVIEW) {
                _loc7_ = GLOBAL.e_BASE_MODE.VIEW;
            }
        }
        if (MAPROOM_INFERNO._open) {
            MAPROOM_INFERNO.Hide();
        }
        if (MAPROOM._open) {
            MAPROOM.Hide();
        }
        requestData = [];
        requestData.push(["userid", userId > 0 ? userId : ""]);
        if (cellId) {
            requestData.push(["cellid", cellId]);
        }
        requestData.push(["baseid", BASE._baseID]);
        requestData.push(["type", _loc7_]);
        requestData.push(["mapversion", MapRoomManager.instance.mapRoomVersion]);
        if (MapRoomManager.instance.viewOnly && (GLOBAL.mode == GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW)) {
            requestData.push(["worldid", MapRoomManager.instance.worldID]);
        }
        if (_loc7_ == GLOBAL.e_BASE_MODE.ATTACK || _loc7_ == GLOBAL.e_BASE_MODE.WMATTACK || _loc7_ == GLOBAL.e_BASE_MODE.IATTACK || _loc7_ == GLOBAL.e_BASE_MODE.IWMATTACK) {
            let attackData: string = JSON.stringify(ATTACK.AttackData());
            requestData.push(["attackData", attackData]);
        }
        let _loc9_: int = 0;
        let _loc10_: int = LOGIN._digits[LOGIN._digits.length - 1] | 0;
        let _loc11_: int = LOGIN._digits[LOGIN._digits.length - 2] | 0;
        let _loc12_: int = LOGIN._digits[LOGIN._digits.length - 3] | 0;
        let _loc13_: int = ((_loc12_ + _loc10_) % 10) | 0;
        let _loc14_: int = ((_loc11_ + _loc10_) % 10) | 0;
        if (_loc13_ <= 7) {
            _loc9_ = 0;
        } else if (_loc13_ == 8) {
            if (_loc14_ <= 4) {
                _loc9_ = 1;
            } else {
                _loc9_ = 2;
            }
        } else if (_loc13_ == 9) {
            if (_loc14_ <= 4) {
                _loc9_ = 3;
            } else {
                _loc9_ = 4;
            }
        }
        if (GLOBAL._checkPromo == 1 && _loc9_ != 0) {
            requestData.push(["checkpromotion", 1]);
        }
        if (BASE._addtionalLoadArguments) {
            _loc15_ = 0;
            while (_loc15_ < BASE._addtionalLoadArguments.length) {
                requestData.push(BASE._addtionalLoadArguments[_loc15_]);
                _loc15_++;
            }
        }
        if (!BASE._loadedSomething && ExternalInterface.available) {
            ExternalInterface.call("cc.recordStats", "basestart");
        }
        // Inferno-only: only the answer to the latest load builds a yard. Two loads in flight (a yard opened
        // while another was still loading) built both, one after the other: the first yard's map was left
        // behind, still listening (bug report #47), and the yard on screen could be the wrong one.
        seq = (++BASE._ioLoadSeq) | 0;
        tries = 0;
        onLoaded = (data: any): void => {
            if (seq != BASE._ioLoadSeq) {
                LOGGER.Log("log", "BASE.Load: the answer for base " + baseId + " came after a newer load; not used");
                return;
            }
            if (tries > 0) {
                PLEASEWAIT.Hide();
            }
            BASE.handleBaseLoadSuccessful(data);
        };
        loadUrl = url ? url + "load" : (BASE.usesInfernoBackend || BASE.isEventBaseId(BASE._baseID) && GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK ? GLOBAL._infBaseURL + "load" : GLOBAL._baseURL + "load");
        onFailed = (event: IOErrorEvent = null): void => {
            if (seq != BASE._ioLoadSeq) {
                return;
            }
            // Inferno-only (bug report B26): no answer at all (the server restarting, the connection gone
            // for a moment): asked again a few times, saying so, before "Oops, something broke!"
            if (GLOBAL.INFERNO_ONLY && tries < BASE.IO_LOAD_RETRIES) {
                tries++;
                PLEASEWAIT.Hide();
                // (its words are set when it opens: "Loading..." would stay)
                PLEASEWAIT.Show(KEYS.Get("io_load_retry"));
                setTimeout((): void => {
                    if (seq == BASE._ioLoadSeq) {
                        new URLLoaderApi().load(loadUrl, requestData, onLoaded, onFailed);
                    }
                }, 3000 * tries);
                return;
            }
            BASE.handleBaseLoadError(event);
        };
        new URLLoaderApi().load(loadUrl, requestData, onLoaded, onFailed);
    }

    private static continueFromBaseLoadError(): void {
        GLOBAL.CallJS("cc.reloadParent");
    }

    private static parseBaseLoadMessages(param1: any): boolean {
        if (param1.hasOwnProperty("ownershipchanged")) {
            GLOBAL.Message("mr3_baseoccupied_message", "btn_ok", BASE.handleBaseLoadError, null, null, null, null, 1, false);
            return true;
        }
        if (param1.hasOwnProperty("baseoccupied")) {
            GLOBAL.Message("mr3_baseoccupied_message", "btn_ok", BASE.handleBaseLoadError, null, null, null, null, 1, false);
            return true;
        }
        return false;
    }

    /** Inferno-only: a message once the player's own yard has loaded (loading a yard clears the messages). */
    private static ioSayAtHome(text: string, tries: int): void {
        if ((BASE._loading || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) && tries < 120) {
            setTimeout((): void => {
                BASE.ioSayAtHome(text, (tries + 1) | 0);
            }, 500);
            return;
        }
        GLOBAL.Message(text);
    }

    /** Inferno-only: the server's mark on a refused attack (errorDetails.data.io_refused: "protected", "range" ...). */
    private static ioRefusal(serverData: any): string {
        let details: any = serverData ? serverData.errorDetails : null;
        return details && details.data && details.data.io_refused ? String(details.data.io_refused) : null;
    }

    private static handleBaseLoadSuccessful(data: any): void {
        let TauntB: Function = null;
        let attackObj: any = null;
        let loader: Loader = null;
        let onImageLoad: Function = null;
        let LoadImageError: Function = null;
        let firstLoad: boolean = false;
        let idstr: string = null;
        let ix: int = 0;
        let resources: any = null;
        let building: any = null;
        let researchdata: string = null;
        let iresources: any = null;
        let kx: int = 0;
        let champion: any[] = null;
        let existingGuardians: Dictionary = null;
        let playerGuardianIndex: int = 0;
        let guardianIndex: int = 0;
        let addedGuardian: boolean = false;
        let unfrozenFound: boolean = false;
        let j: int = 0;
        let attacksArr: any[] = null;
        let attackCount: int = 0;
        attackObj = null;
        let found: boolean = false;
        let listed: any = null;
        let popupMC: popup_attackedme = null;
        loader = null;
        let promoTimer: int = 0;
        let promoItemsArr: any[] = null;
        let promoID: any[] = null;
        let promoGifts: any[] = null;
        let serverData: any = data;
        try {
            if (serverData.error == 0) {
                if (BASE.parseBaseLoadMessages(serverData)) {
                    return;
                }
                BASE.loadObject = serverData;
                // Inferno-only: the player's own yard is the kind the server says it is (its save's type).
                // A load that gave no kind, or the wrong one, kept the last yard's: the main yard opened
                // after a run of outposts came up as an outpost and stopped on "outpost w TH" (bug #53).
                if (GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !MapRoomManager.instance.isInMapRoom3) {
                    if (serverData.type == "main" && BASE.m_yardType != EnumYardType.MAIN_YARD) {
                        BASE.m_yardType = EnumYardType.MAIN_YARD;
                    } else if (serverData.type == "outpost" && BASE.m_yardType != EnumYardType.OUTPOST) {
                        BASE.m_yardType = EnumYardType.OUTPOST;
                    }
                }
                if (serverData && serverData.player && Boolean(serverData.player.buffs)) {
                    BASE.s_resourceCells = serverData.player.buffs.resources;
                }
                if (MapRoomManager.instance.isInMapRoom3) {
                    BASE._baseID = Number(BASE.loadObject.baseid);
                }
                firstLoad = false;
                if (!BASE._loadedSomething) {
                    if (ExternalInterface.available) {
                        ExternalInterface.call("cc.recordStats", "baseend");
                    }
                    firstLoad = true;
                    BASE._loadedSomething = true;
                    GAME._firstLoadComplete = true;
                } else {
                    BASE._firstBaseLoaded = false;
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) {
                    GLOBAL._openBase = null;
                }
                MapRoomManager.instance.worldID = 0;
                GLOBAL.SetFlags(serverData.flags);
                // Loot caps the yard brings with it (Moloch strongholds); none for every other yard.
                GLOBAL.ioLootCapSilo = Number(serverData.io_lootcap ? Number(serverData.io_lootcap.silo) : 0);
                GLOBAL.ioLootCapHall = Number(serverData.io_lootcap ? Number(serverData.io_lootcap.hall) : 0);
                QUESTS.Setup();
                GLOBAL._reloadonerror = false;
                if (TUTORIAL.hasFinished) {
                    BASE._isProtected = serverData["protected"] | 0;
                }
                BASE._isFan = serverData.fan | 0;
                BASE._isFan = 0;
                BASE._isBookmarked = serverData.bookmarked | 0;
                BASE._isBookmarked = 0;
                BASE._installsGenerated = 42069;
                if (serverData.fan) {
                    QUESTS._global.bonus_fan = 1;
                }
                if (serverData.bookmarked) {
                    QUESTS._global.bonus_bookmark = 1;
                }
                if (serverData.giftsentcount) {
                    QUESTS._global.bonus_gifts = serverData.giftsentcount;
                }
                QUESTS._global.bonus_invites = BASE._installsGenerated;
                BASE._lastProcessed = serverData.savetime | 0;
                GLOBAL.t = BASE._lastProcessed;
                BASE._currentTime = serverData.currenttime | 0;
                if (BASE._lastProcessed < BASE._currentTime - 60 * 60 * 24 * 30) {
                    // Limits the last known save time to 30 days ago at most, as this affects load times.
                    // Practically, no single time-based action in a base will take longer than this.
                    BASE._lastProcessed = (BASE._currentTime - 60 * 60 * 24 * 30) | 0;
                }
                if (serverData.chatservers != null) {
                    Chat._chatServers = as3.cast(serverData.chatservers, Array);
                } else {
                    Chat._chatServers = new Array();
                }
                if (serverData.chattoken != null) {
                    Chat._chatToken = as3.str(serverData.chattoken);
                }
                if (serverData.chatchannel != null) {
                    Chat._chatChannel = as3.str(serverData.chatchannel);
                } else {
                    Chat._chatChannel = null;
                }
                BASE._lastSaveID = serverData.id | 0;
                BASE._baseSeed = serverData.baseseed | 0;
                BASE._loadedBaseID = Number(serverData.baseid);
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    BASE._loadedFriendlyBaseID = Number(serverData.baseid);
                    BASE._loadedYardType = BASE.m_yardType;
                }
                BASE._loadedFBID = Number(serverData.fbid);
                BASE._userID = serverData.userid | 0;
                idstr = as3.str(BASE._userID.toString());
                BASE._userDigits = [];
                ix = 0;
                while (ix < idstr.length) {
                    BASE._userDigits.push(Number(idstr.charAt(ix)) | 0);
                    ix++;
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    if (serverData.alliancedata) {
                        BASE._allianceID = serverData.alliancedata.alliance_id | 0;
                        if (BASE._userID == LOGIN._playerID) {
                            ALLIANCES._allianceID = serverData.alliancedata.alliance_id | 0;
                            ALLIANCES._myAlliance = ALLIANCES.SetAlliance(serverData.alliancedata);
                            ALLIANCES._isLeader = Boolean(serverData.alliancedata.is_leader);
                            ACHIEVEMENTS.Check("alliance", 1);
                        }
                    } else if (BASE._userID == LOGIN._playerID && (ALLIANCES._allianceID || ALLIANCES._myAlliance)) {
                        ALLIANCES.Clear();
                    }
                }
                if (serverData.powerups) {
                    POWERUPS.Setup(as3.cast(serverData.powerups, Array), null, true);
                }
                if (serverData.attpowerups) {
                    POWERUPS.Setup(null, as3.cast(serverData.attpowerups, Array), true);
                }
                BASE._attackID = serverData.attackid | 0;
                // Inferno-only: a Designer draft (GLOBAL.ioDesign, com/monsters/admin/IoDesigner.as).
                GLOBAL._ioDesign = GLOBAL.INFERNO_ONLY && serverData.io_design && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD ? serverData.io_design : null;
                if (serverData.worldsize) {
                    MapRoomManager.instance.mapWidth = serverData.worldsize[0] | 0;
                    MapRoomManager.instance.mapHeight = serverData.worldsize[1] | 0;
                }
                if (serverData.usemap) {
                    if (BASE.usesInfernoBackend) {
                        MapRoomManager.instance.mapRoomVersion = MapRoomManager.instance.currentMapRoom instanceof MapRoom3 ? MapRoomManager.MAP_ROOM_VERSION_3 : MapRoomManager.MAP_ROOM_VERSION_1;
                    } else {
                        MapRoomManager.instance.mapRoomVersion = MapRoomManager.instance.currentMapRoom instanceof MapRoom3 ? MapRoomManager.MAP_ROOM_VERSION_3 : MapRoomManager.MAP_ROOM_VERSION_2;
                    }
                }
                if (MapRoomManager.instance.isInMapRoom2) {
                    if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                        if (serverData.homebaseid) {
                            GLOBAL._homeBaseID = Number(serverData.homebaseid);
                        }
                        if (serverData.homebase) {
                            if (serverData.homebase.length == 2 && serverData.homebase[0] > -1 && serverData.homebase[1] > -1) {
                                if (serverData.outposts) {
                                    GLOBAL._mapOutpost = [];
                                    GLOBAL._mapOutpostIDs = [];
                                    ix = 0;
                                    while (ix < serverData.outposts.length) {
                                        if (serverData.outposts[ix].length == 3) {
                                            GLOBAL._mapOutpost.push(new Point(serverData.outposts[ix][0], serverData.outposts[ix][1]));
                                            GLOBAL._mapOutpostIDs.push(serverData.outposts[ix][2]);
                                        }
                                        ix++;
                                    }
                                }
                                GLOBAL._mapHome = new Point(serverData.homebase[0], serverData.homebase[1]);
                            } else {
                                LOGGER.Log("err", "BASE.Process Invalid home base coordinate. " + serverData.homebase);
                            }
                        }
                        if (serverData.empiredestroyed) {
                            GLOBAL._empireDestroyed = serverData.empiredestroyed | 0;
                        } else {
                            GLOBAL._empireDestroyed = 0;
                        }
                    }
                } else if (MapRoomManager.instance.isInMapRoom3 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && Boolean(serverData.homebase)) {
                    GLOBAL._mapHome = new Point(serverData.homebase[0], serverData.homebase[1]);
                }
                GLOBAL._unreadMessages = serverData.unreadmessages | 0;
                resources = serverData.resources;
                BASE.ioNoteServerResources("load", resources);
                if (resources == null) {
                    BASE._resources.r1 = 1000;
                    BASE._resources.r2 = 1000;
                    BASE._resources.r3 = 1000;
                    BASE._resources.r4 = 1000;
                    BASE._resources.r1max = 10000;
                    BASE._resources.r2max = 10000;
                    BASE._resources.r3max = 10000;
                    BASE._resources.r4max = 10000;
                } else {
                    BASE._resources = BASE._resources || {};
                    BASE._resources.r1 = new SecNum(Math.floor(Number(resources.r1)));
                    BASE._resources.r2 = new SecNum(Math.floor(Number(resources.r2)));
                    BASE._resources.r3 = new SecNum(Math.floor(Number(resources.r3)));
                    BASE._resources.r4 = new SecNum(Math.floor(Number(resources.r4)));
                    BASE._resources.r1bonus = resources.r1bonus;
                    BASE._resources.r2bonus = resources.r2bonus;
                    BASE._resources.r3bonus = resources.r3bonus;
                    BASE._resources.r4bonus = resources.r4bonus;
                }
                if (serverData.iresources) {
                    iresources = serverData.iresources;
                    BASE._iresources.r1 = new SecNum(Math.floor(Number(iresources.r1)));
                    BASE._iresources.r2 = new SecNum(Math.floor(Number(iresources.r2)));
                    BASE._iresources.r3 = new SecNum(Math.floor(Number(iresources.r3)));
                    BASE._iresources.r4 = new SecNum(Math.floor(Number(iresources.r4)));
                    BASE._iresources.r1max = iresources.r1max | 0;
                    BASE._iresources.r2max = iresources.r2max | 0;
                    BASE._iresources.r3max = iresources.r3max | 0;
                    BASE._iresources.r4max = iresources.r4max | 0;
                }
                if (Boolean(serverData.updates) && serverData.updates.length > 0) {
                    UPDATES.Process(as3.cast(serverData.updates, Array));
                } else if (serverData.lastupdate) {
                    UPDATES._lastUpdateID = Number(serverData.lastupdate);
                } else {
                    UPDATES._lastUpdateID = 0;
                }
                if (serverData.mushrooms.l) {
                    BASE._mushroomList = as3.cast(serverData.mushrooms.l, Array);
                }
                if (serverData.mushrooms.s) {
                    BASE._lastSpawnedMushroom = serverData.mushrooms.s | 0;
                }
                // Inferno-only: a main yard's pets (IoPets), put in the yard once it is built
                IoPets.setData(GLOBAL.INFERNO_ONLY ? serverData.io_pets : null);
                if (GLOBAL.INFERNO_ONLY && serverData.io_petinfo) {
                    IoPets.apply(serverData.io_petinfo);
                }
                // Inferno-only: an attack to record for its replay, or a replay's yard to play one over
                BASE._ioReplay = GLOBAL.INFERNO_ONLY ? serverData.io_replay : null;
                BASE._ioReplayView = GLOBAL.INFERNO_ONLY ? serverData.io_replay_view : null;
                BASE._buildingHealthData = serverData.buildinghealthdata;
                BASE._buildingData = serverData.buildingdata;
                if (!MapRoomManager.instance.isInMapRoom3) {
                    for (building of as3.values(BASE._buildingData)) {
                        if (building.t == 14) {
                            if (BASE.isOutpost && (GLOBAL._currentCell && GLOBAL._currentCell.baseType == EnumYardType.INFERNO_OUTPOST)) {
                                LOGGER.Log("err", "Base ID " + BASE._loadedBaseID + " outpost w TH bdg");
                                GLOBAL.ErrorMessage("BASE.Process outpost w TH");
                            }
                            break;
                        }
                        if (building.t == 112) {
                            if (BASE.isMainYardOrInfernoMainYard && (GLOBAL._currentCell && GLOBAL._currentCell.baseType != EnumYardType.INFERNO_OUTPOST)) {
                                LOGGER.Log("err", "Base ID " + BASE._loadedBaseID + " yard w OP bdg");
                                GLOBAL.ErrorMessage("BASE.Process yard w outpost");
                            }
                            break;
                        }
                    }
                }
                BASE._rawGIP = serverData.buildingresources;
                BASE._processedGIP = {};
                BASE._GIP = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
                BASE._lastProcessedGIP = AutoBankManager.updateLoadData(BASE._rawGIP, BASE._GIP, BASE._processedGIP, BASE._lastProcessed, BASE._lastProcessedGIP) | 0;
                BASE._baseName = as3.str(serverData.basename);
                BASE._baseValue = Number(serverData.basevalue);
                BASE._basePoints = Number(serverData.points);
                if (!BASE._outpostValue) {
                    BASE._outpostValue = 0;
                }
                if (!BASE._basePoints) {
                    BASE._basePoints = 0;
                }
                BASE._credits = new SecNum(serverData.credits | 0);
                GLOBAL._credits = new SecNum(serverData.credits | 0);
                BASE._hpCredits = serverData.credits | 0;
                BASE._tempLoot = serverData.loot;
                GLOBAL.SetBuildingProps();
                BASE._buildingsStored = {};
                for (researchdata in serverData.researchdata) {
                    if (serverData.researchdata[researchdata]) {
                        BASE._buildingsStored[researchdata] = new SecNum(Number(serverData.researchdata[researchdata]));
                    }
                }
                BASE._hpResources = { "r1": BASE._resources.r1.Get(), "r2": BASE._resources.r2.Get(), "r3": BASE._resources.r3.Get(), "r4": BASE._resources.r4.Get() };
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    kx = 1;
                    while (kx < 5) {
                        GLOBAL._resources["r" + kx] = new SecNum(Number(BASE._resources["r" + kx].Get()));
                        GLOBAL._hpResources["r" + kx] = BASE._resources["r" + kx].Get();
                        kx++;
                    }
                }
                if (serverData.stats.mp) {
                    QUESTS._global.mushroomspicked = serverData.stats.mp;
                }
                if (serverData.stats.mg) {
                    QUESTS._global.goldmushroomspicked = serverData.stats.mg;
                }
                if (serverData.stats.mob) {
                    QUESTS._global.monstersblended = serverData.stats.mob;
                }
                if (serverData.stats.mobg) {
                    QUESTS._global.monstersblendedgoo = serverData.stats.mobg;
                }
                if (serverData.stats.moga) {
                    QUESTS._global.gift_accept = serverData.stats.moga;
                }
                NewPopupSystem.instance.Setup(serverData.stats.popupdata);
                if (serverData.stats.updateid) {
                    GLOBAL._whatsnewid = serverData.stats.updateid | 0;
                }
                if (serverData.stats.updateid_mr2 != null) {
                    GLOBAL._mr2TutorialId = Math.max(GLOBAL._mr2TutorialId, Number(serverData.stats.updateid_mr2)) | 0;
                } else {
                    GLOBAL._mr2TutorialId = Math.max(GLOBAL._mr2TutorialId, MapRoomManager.instance.isInMapRoom2 ? 1 : 0) | 0;
                }
                MapRoom3Tutorial.instance.importData(serverData);
                GLOBAL._otherStats = { "s": 1 };
                if (serverData.stats.other) {
                    GLOBAL._otherStats = serverData.stats.other;
                }
                if (GLOBAL.StatGet(BUILDING11.CHANGED_TO_MR2) == 1) {
                    LOGGER.StatB({ "st1": "world_map", "st2": "enter" }, MapRoomManager.instance.worldID);
                    GLOBAL.StatSet(BUILDING11.CHANGED_TO_MR2, 2);
                }
                if (serverData.wmid) {
                    BASE._wmID = serverData.wmid | 0;
                }
                if (GLOBAL._otherStats && GLOBAL._otherStats.descentLvl && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    if (Boolean(WMBASE._descentBases) && WMBASE._descentBases.length > 0) {
                        if (MAPROOM_DESCENT.DescentLevel > 1) {
                            MAPROOM_DESCENT._descentLvl = MAPROOM_DESCENT.DescentLevel;
                            GLOBAL.StatSet("descentLvl", MAPROOM_DESCENT._descentLvl);
                        }
                    } else if (MAPROOM_DESCENT._descentLvl < serverData.stats.other.descentLvl) {
                        MAPROOM_DESCENT._descentLvl = serverData.stats.other.descentLvl | 0;
                    }
                }
                GLOBAL.player.importAcademyData(serverData.academy);
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
                    SiegeWeapons.importWeapons(serverData.siege);
                } else {
                    BASE._oldSiegeData = serverData.siege;
                }
                EFFECTS.Setup(as3.cast(serverData.effects, Array));
                if (Boolean(serverData.monsters) && Boolean(serverData.monsters.housed)) {
                    GLOBAL.player.fillMonsterData(serverData.monsters.housed);
                } else if (serverData.monsters) {
                    GLOBAL.player.fillMonsterData(serverData.monsters);
                }
                BASE._rawMonsters = serverData.monsters;
                TRIBES.Setup();
                if (serverData.wmstatus) {
                    WMBASE.Data(as3.cast(serverData.wmstatus, Array));
                } else {
                    WMBASE.Clear();
                }
                WMATTACK.Setup(serverData.aiattacks);
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK) {
                    WMBASE.Setup();
                }
                TUTORIAL.Setup();
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    if (BASE.isInfernoMainYardOrOutpost) {
                        TUTORIAL._stage = TUTORIAL._endstage;
                    } else {
                        TUTORIAL._stage = serverData.tutorialstage | 0;
                    }
                    TUTORIAL.Tick();
                }
                WORKERS.Setup();
                QUEUE.Setup();
                STORE.Data(serverData.storeitems, serverData.storedata, serverData.inventory);
                CREATURELOCKER.Data(serverData.lockerdata);
                QUESTS.Data(serverData.quests);
                MONSTERBAITER.Setup(serverData.monsterbaiter);
                if (serverData.chatenabled != null) {
                    Chat._chatEnabled = Boolean(serverData.chatenabled);
                    if (Chat.flagsShouldChatExist()) {
                        Chat.initChat();
                    }
                }
                if (serverData.stats.achievements) {
                    ACHIEVEMENTS.Data(serverData.stats.achievements);
                    ACHIEVEMENTS.CheckRetroactiveAchievments();
                } else if (serverData.quests) {
                    if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                        ACHIEVEMENTS._stats.upgrade_champ1 = QUESTS._global.upgrade_champ1;
                        ACHIEVEMENTS._stats.upgrade_champ2 = QUESTS._global.upgrade_champ2;
                        ACHIEVEMENTS._stats.upgrade_champ3 = QUESTS._global.upgrade_champ3;
                        ACHIEVEMENTS._stats.monstersblended = QUESTS._global.monstersblended;
                        ACHIEVEMENTS._stats.wm2hall = QUESTS._global.destroy_tribe2;
                        if (serverData.alliancedata) {
                            if (serverData.alliancedata.alliance_id) {
                                ACHIEVEMENTS._stats.alliance = 1;
                            }
                        }
                        ACHIEVEMENTS.Check();
                    }
                }
                as3.vsetLength(BASE._guardianData, 0);
                if (serverData.champion) {
                    champion = as3.cast(serverData.champion, Array);
                    if (champion.length > 0) {
                        existingGuardians = new Dictionary();
                        playerGuardianIndex = 0;
                        guardianIndex = 0;
                        addedGuardian = false;
                        unfrozenFound = false;
                        j = 0;
                        while (j < champion.length) {
                            if (Boolean(champion[j].t) && !existingGuardians.get(champion[j].t)) {
                                existingGuardians.set(champion[j].t, true);
                                as3.vset(BASE._guardianData, guardianIndex, {});
                                addedGuardian = true;
                                if (champion[j].nm) {
                                    as3.vget(BASE._guardianData, guardianIndex).nm = champion[j].nm;
                                }
                                as3.vget(BASE._guardianData, guardianIndex).t = champion[j].t;
                                if (champion[j].ft) {
                                    as3.vget(BASE._guardianData, guardianIndex).ft = champion[j].ft;
                                }
                                if (champion[j].fd) {
                                    as3.vget(BASE._guardianData, guardianIndex).fd = champion[j].fd;
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).fd = 0;
                                }
                                if (champion[j].l) {
                                    as3.vget(BASE._guardianData, guardianIndex).l = new SecNum(Number(champion[j].l));
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).l = new SecNum(0);
                                }
                                if (champion[j].hp) {
                                    as3.vget(BASE._guardianData, guardianIndex).hp = new SecNum(Number(champion[j].hp));
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).hp = new SecNum(0);
                                }
                                if (champion[j].fb) {
                                    as3.vget(BASE._guardianData, guardianIndex).fb = new SecNum(Number(champion[j].fb));
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).fb = new SecNum(0);
                                }
                                if (champion[j].pl) {
                                    as3.vget(BASE._guardianData, guardianIndex).pl = new SecNum(Number(champion[j].pl));
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).pl = new SecNum(0);
                                }
                                if (as3.is(champion[j].status, int)) {
                                    as3.vget(BASE._guardianData, guardianIndex).status = champion[j].status;
                                } else {
                                    as3.vget(BASE._guardianData, guardianIndex).status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
                                }
                                if (as3.vget(BASE._guardianData, guardianIndex).t != 5) {
                                    if (unfrozenFound && as3.vget(BASE._guardianData, guardianIndex).status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                                        as3.vget(BASE._guardianData, guardianIndex).status = ChampionBase.k_CHAMPION_STATUS_FROZEN;
                                    } else if (!unfrozenFound && as3.vget(BASE._guardianData, guardianIndex).status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                                        unfrozenFound = true;
                                    }
                                }
                            }
                            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && Boolean(as3.vget(BASE._guardianData, j))) {
                                as3.vset(GLOBAL._playerGuardianData, j, as3.vget(BASE._guardianData, j));
                            }
                            if (addedGuardian) {
                                guardianIndex++;
                            }
                            addedGuardian = false;
                            j++;
                        }
                    }
                }
                BASE._attackerArray = [];
                BASE._attackerNameArray = [];
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMVIEW && Boolean(serverData.attacks)) {
                    BASE._currentAttacks = as3.cast(serverData.attacks, Array);
                    TauntB = (param1: int, param2: int): Function => {
                        let n: int = 0;
                        let fbid: int = 0;
                        n = param1;
                        fbid = param2;
                        return (param1: MouseEvent): void => {
                            GLOBAL.CallJS("sendFeed", ["tauntB", KEYS.Get("js_attackedmyyard"), KEYS.Get("js_tauned"), "taunt" + n + ".png", fbid]);
                            POPUPS.Next();
                        };
                    };
                    attacksArr = as3.cast(serverData.attacks, Array);
                    attackCount = 0;
                    for (attackObj of as3.values(attacksArr)) {
                        if (attackObj.seen) {
                            continue;
                        }

                        attackCount++;
                        found = false;
                        for (listed of as3.values(BASE._attackerArray)) {
                            if (listed.fbid == attackObj.fbid) {
                                found = true;
                                ++listed.count;
                                listed.lastTime = attackObj.starttime;
                            }
                        }
                        if (!found) {
                            BASE._attackerNameArray.push([0, attackObj.name]);
                            BASE._attackerArray.push({ "fbid": attackObj.fbid, "name": attackObj.name, "pic": attackObj.pic_square, "friend": attackObj.friend, "count": 1, "lastTime": attackObj.starttime });
                        }
                    }
                    for (attackObj of as3.values(BASE._attackerArray)) {
                        popupMC = new popup_attackedme();
                        popupMC.gotoAndStop(1);
                        if (attackObj.count == 1) {
                            popupMC.tA.htmlText = KEYS.Get("pop_attackedyou", { "v1": attackObj.name, "v2": GLOBAL.ToTime((BASE._currentTime - (attackObj.lastTime | 0)) | 0, true) });
                        } else {
                            popupMC.tA.htmlText = KEYS.Get("pop_attackedyouxtimes", { "v1": attackObj.name, "v2": attackObj.count, "v3": GLOBAL.ToTime((BASE._currentTime - (attackObj.lastTime | 0)) | 0, true) });
                        }
                        if (attackObj.pic) {
                            onImageLoad = (param1: Event): void => {
                                loader.height = 50;
                                loader.width = 50;
                            };
                            LoadImageError = (param1: IOErrorEvent): void => {
                            };
                            loader = new Loader();
                            loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                            loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                            popupMC.mcPic.mcBG.addChild(loader);
                            loader.load(new URLRequest(attackObj.pic));
                        }
                        if (attackObj.friend == 1) {
                            popupMC.bShare.SetupKey("btn_talktrash");
                            popupMC.bShare.Highlight = true;
                            popupMC.bShare.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
                                let _loc2_: MovieClip = as3.cast(param1.target.parent, MovieClip);
                                _loc2_.gotoAndStop(2);
                                let _loc3_: int = 1;
                                while (_loc3_ < 4) {
                                    _loc2_["b" + _loc3_].gotoAndStop(_loc3_);
                                    _loc2_["b" + _loc3_].buttonMode = true;
                                    _loc2_["b" + _loc3_].addEventListener(MouseEvent.CLICK, TauntB(_loc3_, attackObj.fbid));
                                    _loc3_++;
                                }
                            });
                        } else {
                            popupMC.bShare.visible = false;
                        }
                        POPUPS.Push(popupMC);
                    }
                }
                BASE._ownerName = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW ? String(TRIBES.TribeForBaseID(BASE._wmID).name) : String(serverData.name);
                BASE._ownerPic = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW ? String(TRIBES.TribeForBaseID(BASE._wmID).profilepic) : String(serverData.pic_square);
                if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
                    if (serverData.promotiontimer) {
                        if (as3.is(serverData.promotiontimer, int)) {
                            promoTimer = serverData.promotiontimer | 0;
                            GLOBAL._flags.hasPromo = 1;
                        } else if (as3.is(serverData.promotiontimer, String) && serverData.promotiontimer == "purchasereceive") {
                            if (serverData.purchasereceive) {
                                promoItemsArr = as3.cast(serverData.purchasereceive, Array);
                                BUY.purchaseProcess(promoItemsArr);
                                BUY.purchaseComplete(as3.str(serverData.promotiontimer));
                                GLOBAL._flags.hasPromo = 1;
                            }
                        }
                    }
                }
                if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
                    if (serverData.fbpromos) {
                        promoID = [];
                        promoGifts = [];
                        if (serverData.fbpromos) {
                            if (serverData.fbpromos.ids) {
                                promoID = as3.cast(serverData.fbpromos.ids, Array);
                            }
                            if (promoGifts) {
                                promoGifts = as3.cast(serverData.fbpromos.items, Array);
                            }
                            if (Boolean(promoID) && Boolean(promoGifts)) {
                                BASE._pendingFBPromo = 1;
                                GLOBAL._flags.hasFBPromo = 1;
                                if (promoGifts) {
                                    BUY.purchaseProcess(promoGifts);
                                    BUY.purchaseComplete("biggulp");
                                }
                                if (promoID) {
                                    BASE._pendingFBPromoIDs = promoID;
                                }
                            }
                            GLOBAL._flags.hasPromo = 1;
                        }
                    }
                }
                BASE._tempGifts = as3.cast(serverData.gifts, Array);
                if (serverData.sentgifts) {
                    BASE._tempSentGifts = as3.cast(serverData.sentgifts, Array);
                }
                if (serverData.sentinvites) {
                    BASE._tempSentInvites = as3.cast(serverData.sentinvites, Array);
                } else {
                    BASE._tempSentInvites = [];
                }
                BASE.Build();
                WMBASE.CheckQuests();
            } else if (GLOBAL._reloadonerror && !GLOBAL.INFERNO_ONLY) {
                // (Inferno-only: the error is shown, with a Reload button, not a reload without a word.)
                GLOBAL.CallJS("reloadPage");
            } else if (GLOBAL._local && serverData.error == "Incorrect map version") {
                switch (GLOBAL._localMode) {
                    case 1:
                        if (GLOBAL._baseURL == "http://bym-fb-trunk.dev.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-fb-trunk.dev.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-fb-trunk.dev.kixeye.com/base/";
                        break;
                    case 2:
                        if (GLOBAL._baseURL == "http://bym-ko-halbvip1.dc.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-ko-halbvip1.dc.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-ko-halbvip1.dc.kixeye.com/base/";
                        break;
                    case 3:
                        if (GLOBAL._baseURL == "http://bmdev.vx.casualcollective.com/base/") {
                            GLOBAL._baseURL = "http://bmdev.vx.casualcollective.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bmdev.vx.casualcollective.com/base/";
                        break;
                    case 4:
                        if (GLOBAL._baseURL == "http://bym-vx2-vip.sjc.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-vx2-vip.sjc.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-vx2-vip.sjc.kixeye.com/base/";
                        break;
                    case 5:
                        if (GLOBAL._baseURL == "http://bym-fb-inferno.dev.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-fb-inferno.dev.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-fb-inferno.dev.kixeye.com/base/";
                        break;
                    case 6:
                        if (GLOBAL._baseURL == "https://bym-fb-lbns.dc.kixeye.com/base/") {
                            GLOBAL._baseURL = "https://bym-fb-lbns.dc.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "https://bym-fb-lbns.dc.kixeye.com/base/";
                        break;
                    case 7:
                        if (GLOBAL._baseURL == "http://bym-vx-web.stage.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-vx-web.stage.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-vx-web.stage.kixeye.com/base/";
                        break;
                    case 8:
                        if (GLOBAL._baseURL == "http://bym-fb-alex.dev.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-fb-alex.dev.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-fb-alex.dev.kixeye.com/base/";
                        break;
                    case 9:
                        if (GLOBAL._baseURL == "http://bym-fb-nmoore.dev.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-fb-nmoore.dev.kixeye.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-fb-nmoore.dev.kixeye.com/base/";
                        break;
                    case 10:
                        if (GLOBAL._baseURL == "http://bm-kg-web2.dev.casualcollective.com/base/") {
                            GLOBAL._baseURL = "http://bm-kg-web2.dev.casualcollective.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bm-kg-web2.dev.casualcollective.com/base/";
                        break;
                    case 11:
                        if (GLOBAL._baseURL == "http://bym-ko-web1.stage.com/base/") {
                            GLOBAL._baseURL = "http://bym-ko-web1.stage.com/api/bm/base/";
                            break;
                        }
                        GLOBAL._baseURL = "http://bym-ko-web1.stage.kixeye.com/api/bm/base/";
                        break;
                    default:
                        if (GLOBAL._baseURL == "http://bym-fb-web1.stage.kixeye.com/base/") {
                            GLOBAL._baseURL = "http://bym-fb-web1.stage.kixeye.com/api/bm/base/";
                        } else {
                            GLOBAL._baseURL = "http://bym-fb-web1.stage.kixeye.com/base/";
                        }
                }
                BASE.Load();
            } else if (GLOBAL.INFERNO_ONLY && (BASE.ioRefusal(serverData) || serverData.error && (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK))) {
                // Inferno-only (bug report 66): an attack the server refuses (the yard is protected, under
                // attack, its player online or out of range, e.g. attacked again straight after the attack
                // that protected it) is a message, and the player goes home; it was the Oops window with
                // Reload. (data.io_refused marks the refusals; any other answer to an attack is taken so too.)
                PLEASEWAIT.Hide();
                BASE._loading = false;
                // (this load is over: LoadBase starts no other while it is set)
                BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                BASE.ioSayAtHome(String(serverData.error || serverData.message), 0);
            } else {
                GLOBAL.ErrorMessage(as3.str(serverData.error), GLOBAL.ERROR_ORANGE_BOX_ONLY);
                PLEASEWAIT.Hide();
            }
            LOGGER.StatB({ "st1": MapRoomManager.instance.mapRoomVersion + "_loadmode", "st2": BASE.yardType }, GLOBAL.mode);
            if (Boolean(LOGIN._playerID) && ((LOGIN._playerID % 100) | 0) == 0) {
                LOGGER.Stat([LOGGER.STAT_MEM, "loadbase", (System.totalMemory / 1024 / 1024).toString(), ((getTimer() * 0.001) | 0).toString()]);
            }
        } catch (error) {
            GLOBAL.Message(KEYS.Get("err_loading_base"));
            LOGGER.Log("err", "Failed to load user base with error: " + error.getStackTrace());
        }
    }

    private static handleBaseLoadError(param1: IOErrorEvent): void {
        if (GLOBAL._reloadonerror && !GLOBAL.INFERNO_ONLY) {
            GLOBAL.CallJS("reloadPage");
        } else {
            LOGGER.Log("err", "BASE.Load HTTP");
            PLEASEWAIT.Hide();
            GLOBAL.ErrorMessage("BASE.Load HTTP");
        }
    }

    public static Build(): void {
        let buildingFoundation: BFOUNDATION = null;
        let counter: int = 0;
        let building: any = null;
        let displayObject: DisplayObject = null;
        let rawMonstersHidLength: int = 0;
        let rawMonstersHLength: int = 0;
        let rawMonsterIndex: int = 0;
        let townHallLevel: int = 0;
        let buildingTypeCount: int = 0;
        let props: any = null;
        let foundationIndex: int = 0;
        let propCount: int = 0;
        PLEASEWAIT.Update(KEYS.Get("msg_building"));
        if (MAPROOM_INFERNO._open) {
            MAPROOM_INFERNO.Hide();
        }
        if (MAPROOM._open) {
            MAPROOM.Hide();
        }
        let mapIndex: int = (GLOBAL._layerMap.numChildren - 1) | 0;
        while (mapIndex >= 0) {
            displayObject = GLOBAL._layerMap.getChildAt(mapIndex);
            if (displayObject.parent) {
                displayObject.parent.removeChild(displayObject);
            }
            mapIndex--;
        }
        UI2.Setup();
        GLOBAL.ResizeGame(null);
        GLOBAL._render = false;
        PATHING.Setup();
        let timer: int = getTimer();
        let terrainType: string = "grass";
        if (!MapRoomManager.instance.isInMapRoom3 && GLOBAL._currentCell && (BASE.isOutpostOrInfernoOutpost || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW)) {
            // Inferno-only: a current cell that isn't a Map Room 2 cell made this a null and the yard failed to load
            if (!GLOBAL.INFERNO_ONLY || GLOBAL._currentCell instanceof MapRoomCell) {
                terrainType = (as3.as(GLOBAL._currentCell, MapRoomCell)).terrain;
            }
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            terrainType = "lava";
            // Inferno-only (hell-yard-grounds): outposts and wild monster yards stand on the ground of their map
            // cell's height (bone fields, netherrack, black rock); main yards keep the lava ground
            if (GLOBAL.INFERNO_ONLY && !MapRoomManager.instance.isInMapRoom3 && GLOBAL._currentCell instanceof MapRoomCell && (BASE.isOutpostOrInfernoOutpost || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW)) {
                terrainType = (as3.as(GLOBAL._currentCell, MapRoomCell)).ioYardGround || "lava";
            }
            // Hell Freezes Over: from Day 3 until the curse breaks, the player's main yard is frozen over
            if (IoHfo.frozenGround()) {
                terrainType = "hfo_frozen";
            }
        }
        let map: MAP = new MAP(terrainType);
        let targeting: Targeting = new Targeting();
        QUEUE.Spawn(0);
        Smoke.Setup();
        let currentBuilding: any = {};
        let buildingCount: int = 0;
        let foundationType: int = 0;
        let isCoreBuilding: boolean = false;
        if (MapRoom3Tutorial.instance.isStarted && (MapRoom3Tutorial.instance.tutorialStep === MapRoom3Tutorial.k_STEP_SCOUTWM || MapRoom3Tutorial.instance.tutorialStep === MapRoom3Tutorial.k_STEP_ATTACKWM)) {
            BASE._buildingData = null;
        }

        // Client guards to ensure the main building on each yard is always the correct type
        if (BASE.isMainYard && BASE._buildingData.hasOwnProperty("0") && BASE._buildingData["0"].t !== 14) {
            BASE._buildingData["0"].t = 14;
        }

        if (BASE.isOutpostMapRoom2Only && BASE._buildingData.hasOwnProperty("0") && BASE._buildingData["0"].t !== 112) {
            BASE._buildingData["0"].t = 112;
        }

        if (BASE.isOutpostStronghold && BASE._buildingData.hasOwnProperty("0") && BASE._buildingData["0"].t !== GuardTower.k_TYPE) {
            BASE._buildingData["0"].t = GuardTower.k_TYPE;
        }

        if (BASE.isOutpostResource && BASE._buildingData.hasOwnProperty("0") && BASE._buildingData["0"].t !== ResourceOutpost.k_TYPE) {
            BASE._buildingData["0"].t = ResourceOutpost.k_TYPE;
        }

        if (BASE.isOutpostFortification && BASE._buildingData.hasOwnProperty("0") && BASE._buildingData["0"].t !== OutpostDefender.k_TYPE) {
            BASE._buildingData["0"].t = OutpostDefender.k_TYPE;
        }

        let buildingTypeCounts: Dictionary = new Dictionary();
        for (building of as3.values(BASE._buildingData)) {
            if (building) {
                if (building.t) {
                    buildingTypeCounts.set(building.t, buildingTypeCounts.get(building.t) || 0);
                    buildingTypeCounts.set(building.t, buildingTypeCounts.get(building.t) + 1);
                }
                if (!(building.t == 53 || building.t == 54)) {
                    currentBuilding = building;
                    if (building.t == 18) {
                        building.t = 17;
                        building.l = 2;
                    }
                    if (building.t == 14) {
                    }
                    if (building.t == 7) {
                        counter++;
                    }
                    buildingFoundation = BASE.addBuildingC(building.t | 0);
                    if (buildingFoundation) {
                        foundationType = buildingFoundation._type;
                    }
                    if (building.t == 16 && BASE._rawMonsters && Boolean(BASE._rawMonsters.hcc)) {
                        building.mq = BASE._rawMonsters.hcc;
                    }
                    if (building.t == 13 && BASE._rawMonsters && Boolean(BASE._rawMonsters.h) && Boolean(BASE._rawMonsters.hid)) {
                        rawMonstersHidLength = BASE._rawMonsters.hid.length | 0;
                        rawMonstersHLength = BASE._rawMonsters.h.length | 0;
                        rawMonsterIndex = 0;
                        while (rawMonsterIndex < rawMonstersHidLength && rawMonsterIndex < rawMonstersHLength) {
                            if (BASE._rawMonsters.hid[rawMonsterIndex] == building.id) {
                                if (BASE._rawMonsters.h[rawMonsterIndex].length > 0) {
                                    building.rIP = BASE._rawMonsters.h[rawMonsterIndex][0];
                                    building.rCP = BASE._rawMonsters.h[rawMonsterIndex][1];
                                } else {
                                    building.rIP = "";
                                    building.rCP = 0;
                                }
                                if (Boolean(BASE._rawMonsters.hstage) && BASE._rawMonsters.hstage.length > rawMonsterIndex) {
                                    building.rPS = BASE._rawMonsters.hstage[rawMonsterIndex];
                                }
                                if (building.id == BASE._rawMonsters.hid[rawMonsterIndex] && BASE._rawMonsters.h[rawMonsterIndex].length > 2) {
                                    building.mq = BASE._rawMonsters.h[rawMonsterIndex][2];
                                } else {
                                    building.mq = [];
                                }
                                building.saved = BASE._rawMonsters.saved;
                                break;
                            }
                            rawMonsterIndex++;
                        }
                    }
                    if (buildingFoundation) {
                        if (Boolean(BASE._buildingHealthData) && building.id in BASE._buildingHealthData) {
                            building.hp = BASE._buildingHealthData[building.id];
                        } else if (MapRoomManager.instance.isInMapRoom3 && !BASE.isInfernoMainYardOrOutpost) {
                            delete building.hp;
                        }
                        buildingFoundation.Setup(building);
                        if (buildingFoundation._id > BASE._buildingCount) {
                            BASE._buildingCount = buildingFoundation._id;
                        }
                        if (as3.is(buildingFoundation, ICoreBuilding)) {
                            isCoreBuilding = true;
                        }
                        buildingCount++;
                    }
                }
            }
        }
        BFOUNDATION.redrawAllShadowData();
        BASE._buildingHealthData = null;
        BASE._buildingData = null;
        if (buildingCount == 0) {
            if (BASE.isOutpost && !MapRoom3Tutorial.instance.isStarted) {
                buildingFoundation = BASE.addBuildingC(112);
                buildingFoundation.Setup({ "X": 0, "Y": -50, "id": buildingCount++, "t": 112, "l": 1 });
            } else if (BASE.isInfernoMainYardOrOutpost) {
                buildingFoundation = BASE.addBuildingC(14);
                buildingFoundation.Setup({ "X": -100, "Y": 0, "id": buildingCount++, "t": 14, "l": 1 });
                buildingFoundation = BASE.addBuildingC(1);
                buildingFoundation.Setup({ "X": 60, "Y": 0, "id": buildingCount++, "t": 1, "l": 1 });
                buildingFoundation = BASE.addBuildingC(2);
                buildingFoundation.Setup({ "X": 60, "Y": 70, "id": buildingCount++, "t": 2, "l": 1 });
                buildingFoundation = BASE.addBuildingC(6);
                buildingFoundation.Setup({ "X": 130, "Y": 0, "id": buildingCount++, "t": 6, "l": 3 });
                buildingFoundation = BASE.addBuildingC(6);
                buildingFoundation.Setup({ "X": 130, "Y": 80, "id": buildingCount++, "t": 6, "l": 3 });
                BASE._basePoints = 0;
            } else {
                buildingFoundation = BASE.addBuildingC(14);
                buildingFoundation.Setup({ "X": -70, "Y": 0, "id": buildingCount++, "t": 14, "l": 1 });
                buildingFoundation = BASE.addBuildingC(1);
                buildingFoundation.Setup({ "X": 60, "Y": 0, "id": buildingCount++, "t": 1, "l": 1 });
                buildingFoundation._stored.Set(200);
                buildingFoundation._hpStored = 200;
                buildingFoundation = BASE.addBuildingC(2);
                buildingFoundation.Setup({ "X": 60, "Y": 70, "id": buildingCount++, "t": 2, "l": 1 });
                buildingFoundation = BASE.addBuildingC(12);
                buildingFoundation.Setup({ "X": 60, "Y": -70, "id": buildingCount++, "t": 12, "l": 1 });
                BASE._resources.r1.Set(1600);
                BASE._resources.r2.Set(1600);
                BASE._hpResources.r1 = 1600;
                BASE._hpResources.r2 = 1600;
                BASE._deltaResources.r1.Set(1600);
                BASE._deltaResources.r2.Set(1600);
                BASE._hpDeltaResources.r1 = 1600;
                BASE._hpDeltaResources.r2 = 1600;
                BASE._basePoints = 0;
                BASE._deltaResources.dirty = true;
                BASE._hpDeltaResources.dirty = true;
                SOUNDS.TutorialStopMusic();
            }
        } else if (BASE.isMainYard && !isCoreBuilding) {
            LOGGER.Log("err", "Town Hall Missing");
        }
        // Comment: RebuildTH() is commented out as it's a dangerous bad-practice implementation from
        // the original game, causing unintended behavior.
        // RebuildTH();
        let bFoundation: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        // (not in admin test mode or a wild tribe / Moloch design: no building limits there)
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL.townHall && BASE.isMainYardOrInfernoMainYard && !GLOBAL._aiDesignMode && !GLOBAL.ioNoLimits()) {
            townHallLevel = GLOBAL.townHall._lvl.Get() | 0;
            buildingTypeCount = 0;
            for (props of as3.values(GLOBAL._buildingProps)) {
                if (props.type != "decoration") {
                    buildingTypeCount = 0;
                    foundationIndex = (bFoundation.length - 1) | 0;
                    while (foundationIndex >= 0) {
                        buildingFoundation = as3.as(as3.vget(bFoundation, foundationIndex), BFOUNDATION);
                        if (buildingFoundation) {
                            if (buildingFoundation._type == props.id) {
                                buildingTypeCount += 1;
                            }
                            propCount = townHallLevel < props.quantity.length ? props.quantity[townHallLevel] | 0 : props.quantity[props.quantity.length - 1] | 0;
                            if (buildingTypeCount > propCount) {
                                Console.print("BASE::Build:too many buildings " + buildingTypeCount + "/" + propCount + " type:" + buildingFoundation._type);
                                LOGGER.Log("log", "Too many buildings of type " + buildingFoundation._type + " th " + townHallLevel + " count " + buildingTypeCount);
                                BASE.BuildingDeselect();
                                buildingFoundation.clear();
                                buildingTypeCount--;
                            }
                        }
                        foundationIndex--;
                    }
                }
            }
        }
        let _loc15_: int = 0;
        let _loc16_: int = 0;
        bFoundation = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (buildingFoundation of (bFoundation ?? [])) {
            // (a building past x 1000 is off the yard and is given a free spot; Inferno-only: a Designer draft
            // is 2400 across, and the wild tribes' and Moloch's yards made from designs may use all of it, so
            // the limit is that edge there, else their buildings out east were moved to the top corner on
            // every load)
            if (GRID.FromISO(buildingFoundation.x, buildingFoundation.y).x > (GLOBAL.INFERNO_ONLY ? Math.max(1000, GLOBAL._mapWidth * 0.5, GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD ? 0 : GLOBAL.IO_DESIGN_YARD * 0.5) : 1000)) {
                GRID.FindSpace(buildingFoundation);
            }
            if (buildingFoundation instanceof BTRAP === false && buildingFoundation instanceof BWALL === false) {
                _loc15_ = (_loc15_ + buildingFoundation.health) | 0;
                _loc16_ = (_loc16_ + buildingFoundation.maxHealth) | 0;
            }
        }
        LOGGER.Stat([17, 1, BASE._tempLoot.r1 | 0]);
        if (BASE._attackerNameArray.length > 0) {
            if (_loc15_ > _loc16_ * 0.8) {
                ATTACK.WellDefended(false, GLOBAL.Array2StringB(BASE._attackerNameArray));
            }
        }
        GRID.Clear();
        MAP.SortDepth();
        HOUSING.HousingSpace();
        MONSTERBAITER.Update();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            BASE._lastProcessed = BASE._currentTime;
        }
        BASE.Process();
        RADIO.Setup();
    }

    public static Process(): void {
        let lootString: string = null;
        let hatqueue2: any[] = null;
        let hatcount2: int = 0;
        let hatcheryInstances: Vector<any> = null;
        let Post: Function = null;
        let building: BFOUNDATION = null;
        let hatchery: BUILDING13 = null;
        let lootArray: any[] = null;
        lootString = null;
        let popupMC: popup_loot = null;
        PLEASEWAIT.Update(KEYS.Get("msg_processing"));
        BASE._tmpPercent = 0;
        HOUSING.Cull();
        BASE.CalcResources();
        if (BASE._tempLoot) {
            lootArray = [];
            if (Boolean(BASE._tempLoot.r1) && BASE._tempLoot.r1 > 0) {
                BASE.PointsAdd(BASE._tempLoot.r1 >>> 0);
                lootArray.push([BASE._tempLoot.r1, GLOBAL._resourceNames[0]]);
            }
            if (Boolean(BASE._tempLoot.r2) && BASE._tempLoot.r2 > 0) {
                BASE.PointsAdd(BASE._tempLoot.r2 >>> 0);
                lootArray.push([BASE._tempLoot.r2, GLOBAL._resourceNames[1]]);
            }
            if (Boolean(BASE._tempLoot.r3) && BASE._tempLoot.r3 > 0) {
                BASE.PointsAdd(BASE._tempLoot.r3 >>> 0);
                lootArray.push([BASE._tempLoot.r3, GLOBAL._resourceNames[2]]);
            }
            if (Boolean(BASE._tempLoot.r4) && BASE._tempLoot.r4 > 0) {
                BASE.PointsAdd(BASE._tempLoot.r4 >>> 0);
                lootArray.push([BASE._tempLoot.r4, GLOBAL._resourceNames[3]]);
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && lootArray.length > 0 && (BASE.isInfernoMainYardOrOutpost || !BASE._tempLoot.isInferno)) {
                Post = (param1: MouseEvent): void => {
                    GLOBAL.CallJS("sendFeed", ["loot", KEYS.Get("pop_youlooted_streamtitle", { "v1": lootString, "v2": BASE._tempLoot.name }), KEYS.Get("pop_youlooted_streambody"), "loot.png"]);
                    POPUPS.Next();
                };
                lootString = GLOBAL.Array2String(lootArray);
                popupMC = new popup_loot();
                popupMC.tB.htmlText = "<b>" + KEYS.Get("pop_youlooted_title") + "</b>";
                popupMC.tA.htmlText = KEYS.Get("pop_youlooted", { "v1": BASE._tempLoot.name, "v2": lootString });
                popupMC.bAction.SetupKey("btn_brag");
                popupMC.bAction.addEventListener(MouseEvent.CLICK, Post);
                popupMC.bAction.Highlight = true;
                POPUPS.Push(popupMC, null, null, null, "loot.png");
                if (BASE._tempLoot.r1) {
                    LOGGER.Stat([17, 1, BASE._tempLoot.r1 | 0]);
                    LOGGER.Stat([18, 1, Math.floor(100 / BASE._resources.r1max * (BASE._tempLoot.r1 | 0))]);
                }
                if (BASE._tempLoot.r2) {
                    LOGGER.Stat([17, 2, BASE._tempLoot.r2 | 0]);
                    LOGGER.Stat([18, 2, Math.floor(100 / BASE._resources.r2max * (BASE._tempLoot.r2 | 0))]);
                }
                if (BASE._tempLoot.r3) {
                    LOGGER.Stat([17, 3, BASE._tempLoot.r3 | 0]);
                    LOGGER.Stat([18, 3, Math.floor(100 / BASE._resources.r3max * (BASE._tempLoot.r3 | 0))]);
                }
                if (BASE._tempLoot.r4) {
                    LOGGER.Stat([17, 4, BASE._tempLoot.r4 | 0]);
                    LOGGER.Stat([18, 4, Math.floor(100 / BASE._resources.r4max * (BASE._tempLoot.r4 | 0))]);
                }
            }
        }
        BASE._baseLevel = BASE.BaseLevel().level | 0;
        BASE._bankedValue = 0;
        GLOBAL.t = BASE._lastProcessed;
        BASE._lastProcessedB = BASE._lastProcessed;
        BASE._catchupTime = (BASE._currentTime - BASE._lastProcessed) | 0;
        if (!BASE.usesInfernoBackend && !MapRoomManager.instance.isInMapRoom3) {
            AutoBankManager.autobank((MapRoomManager.instance.isInMapRoom3 ? BASE._currentTime : BASE._currentTime - BASE._lastProcessedGIP) | 0, true);
        }
        hatqueue2 = [];
        hatcount2 = 0;
        hatcheryInstances = InstanceManager.getInstancesByClass(BUILDING13);
        for (hatchery of (hatcheryInstances ?? [])) {
            hatqueue2[hatcount2] = [hatchery._inProduction, hatchery._countdownProduce.Get()];
            if (hatchery._monsterQueue) {
                hatqueue2[hatcount2].push(hatchery._monsterQueue);
            }
            hatcount2++;
        }
        BASE._timer = getTimer();
        BASE.HideFootprints();
        GLOBAL._ROOT.addEventListener(Event.ENTER_FRAME, BASE.ProcessB);
    }

    public static ProcessB(param1: Event): void {
        let _loc2_: int = getTimer();
        while (getTimer() - _loc2_ < 10) {
            BASE.ProcessC((BASE._currentTime + (getTimer() - BASE._timer) / 1000) | 0);
        }
        if (BASE._lastProcessed >= BASE._currentTime) {
            BASE._currentTime = (BASE._currentTime + (getTimer() - BASE._timer) / 1000) | 0;
            GLOBAL._ROOT.removeEventListener(Event.ENTER_FRAME, BASE.ProcessB);
            GLOBAL.t = BASE._currentTime;
            BASE.ProcessD();
        }
    }

    public static ProcessC(param1: int): void {
        let allBuildings: Vector<any> = null;
        let tickDelta: int = 0;
        let building: BFOUNDATION = null;
        let storeProcessAmount: int = 0;
        let guardianIndex: int = 0;
        let allTowers: Vector<any> = null;
        let allTraps: Vector<any> = null;
        let allBunkers: Vector<any> = null;
        let tower: BFOUNDATION = null;
        let trap: BTRAP = null;
        let bunker: Bunker = null;
        let tickIteration: int = 0;
        let progress: number = NaN;
        if (BASE._lastProcessed < param1) {
            GLOBAL.t = BASE._lastProcessed;
            tickDelta = (param1 - BASE._lastProcessed) | 0;
            if (CREEPS._creepCount > 0) {
                tickDelta = 1;
            } else {
                allBuildings ||= InstanceManager.getInstancesByClass(BFOUNDATION);
                for (building of (allBuildings ?? [])) {
                    tickDelta = Math.min(tickDelta, building.tickLimit) | 0;
                }
                if (CREATURES._guardian) {
                    tickDelta = Math.min(tickDelta, CREATURES._guardian.tickLimit) | 0;
                }
                if (tickDelta < 1) {
                    tickDelta = 1;
                }
            }
            WMATTACK.Tick();
            if (WMATTACK._inProgress) {
                tickDelta = 1;
            }
            storeProcessAmount = (((BASE._lastProcessed / 60) | 0) - (((BASE._lastProcessed + tickDelta) / 60) | 0)) | 0;
            while (storeProcessAmount >= 0) {
                STORE.ProcessPurchases();
                storeProcessAmount--;
            }
            allBuildings ||= InstanceManager.getInstancesByClass(BFOUNDATION);
            for (building of (allBuildings ?? [])) {
                building.Tick(tickDelta);
            }
            HOUSING.catchupTick(tickDelta);
            guardianIndex = 0;
            while (guardianIndex < CREATURES._guardianList.length) {
                if (Boolean(as3.vget(CREATURES._guardianList, guardianIndex)) && as3.vget(CREATURES._guardianList, guardianIndex).tick(tickDelta)) {
                    if (!BYMConfig.instance.RENDERER_ON) {
                        MAP._BUILDINGTOPS.removeChild(as3.vget(CREATURES._guardianList, guardianIndex).graphic);
                    }
                    as3.vget(CREATURES._guardianList, guardianIndex).clearRasterData();
                    if (as3.vget(CREATURES._guardianList, guardianIndex) == CREATURES._guardian) {
                        CREATURES._guardian = null;
                    } else {
                        CREATURES._guardianList.splice(guardianIndex, 1);
                    }
                }
                guardianIndex++;
            }
            if (BASE.isMainYard) {
                CREATURELOCKER.Tick();
                ACADEMY.Tick();
            }
            if (CREEPS._creepCount > 0) {
                GLOBAL._render = true;
                PATHING.Tick();
                allTowers = InstanceManager.getInstancesByClass(BTOWER);
                allTraps = InstanceManager.getInstancesByClass(BTRAP);
                allBunkers = InstanceManager.getInstancesByClass(Bunker);
                tickIteration = 0;
                while (tickIteration < 80) {
                    CREEPS.Tick();
                    CREATURES.Tick();
                    for (tower of (allTowers ?? [])) {
                        // (Hell Freezes Over: a tower iced over by an ice monster waits: BTOWER.ioIceTick)
                        if (!(tower instanceof BTOWER && as3.cast(tower, BTOWER).ioIceTick())) {
                            tower.TickAttack();
                        }
                    }
                    for (trap of (allTraps ?? [])) {
                        trap.TickAttack();
                    }
                    for (bunker of (allBunkers ?? [])) {
                        bunker.TickAttack();
                    }
                    PROJECTILES.Tick();
                    FIREBALLS.Tick();
                    EFFECTS.Tick();
                    tickIteration++;
                }
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW) {
                WMBASE.Tick();
            }
            UPDATES.Check();
            BASE._lastProcessed += tickDelta;
        }
        if (CREEPS._creepCount == 0) {
            progress = (BASE._lastProcessed - BASE._lastProcessedB) / (param1 - BASE._lastProcessedB);
            PLEASEWAIT.Update(KEYS.Get("msg_rendering") + ((100 * progress) | 0) + "% ");
        } else {
            if (BASE._tmpPercent < 100) {
                BASE._tmpPercent += 0.5;
            }
            PLEASEWAIT.Update(KEYS.Get("msg_crunching") + (BASE._tmpPercent | 0) + "%");
        }
    }

    public static ProcessD(): void {
        let popupMCDamaged: popup_damaged = null;
        let RepairAll: Function = null;
        let RepairNow: Function = null;
        let popupMCCreepDamaged: popup_damaged = null;
        let StartHealAll: Function = null;
        let HealShinyNow: Function = null;
        let damageCount: int = 0;
        let bb: int = 0;
        let upgradeCount: int = 0;
        let helpedCount: int = 0;
        let MoreInfo711: Function = null;
        let Action: Function = null;
        let BragA: Function = null;
        let BragB: Function = null;
        let building: BFOUNDATION = null;
        let buildingInstances: Vector<any> = null;
        let helper: int = 0;
        let needToHealCreeps: boolean = false;
        let length: int = 0;
        let i: int = 0;
        popupMCDamaged = null;
        RepairAll = null;
        RepairNow = null;
        let numCreepsDamaged: int = 0;
        popupMCCreepDamaged = null;
        StartHealAll = null;
        HealShinyNow = null;
        let hasBigGulp: boolean = false;
        let fbPromoTimer: number = NaN;
        let fbPromoPopup: MovieClip = null;
        let promptSPost: boolean = false;
        let b: BFOUNDATION = null;
        let popupMCdamaged: MovieClip = null;
        let hp: int = 0;
        let hpMax: int = 0;
        let popupMCDestroyed: PopupLostMainBase = null;
        let t: int = getTimer();
        BASE.s_processing = true;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            ATTACK.Setup();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (CREEPS._creepCount == 0) {
                buildingInstances = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (building of (buildingInstances ?? [])) {
                    building.GridCost(true);
                }
            }
        }
        EFFECTS.Process(BASE._catchupTime);
        if (BASE.isMainYard) {
            CREATURELOCKER.Tick();
        }
        if (BASE._tempGifts) {
            GIFTS.Process(BASE._tempGifts);
        }
        if (BASE._tempSentGifts) {
            GIFTS.ProcessAcceptedGifts(BASE._tempSentGifts);
        }
        if (BASE._tempSentInvites) {
            GIFTS.ProcessAcceptedInvites(BASE._tempSentInvites);
        }
        UPDATES.Catchup();
        HOUSING.Cull();
        HOUSING.Populate();
        SOUNDS.Setup();
        GLOBAL._render = true;
        GLOBAL._catchup = false;
        damageCount = 0;
        buildingInstances ||= InstanceManager.getInstancesByClass(BFOUNDATION);
        for (building of (buildingInstances ?? [])) {
            building.Update(true);
            if (building.health < building.maxHealth && building._repairing == 0) {
                damageCount++;
            }
            if (building._countdownBuild.Get() + building._countdownUpgrade.Get() + building._countdownFortify.Get() > 0) {
                upgradeCount++;
                for (const $value of as3.values(building._helpList)) {
                    helper = $value | 0;
                    if (helper == LOGIN._playerID) {
                        helpedCount++;
                    }
                }
            }
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !WMATTACK._inProgress) {
            if (damageCount > 0) {
                RepairAll = (param1: MouseEvent = null): void => {
                    let _loc3_: BFOUNDATION = null;
                    if (MapRoomManager.instance.isInMapRoom3 && BASE.isOutpost) {
                        BASE.repairAllBuildingsToMinimumPercentage(0.25);
                    }
                    popupMCDamaged.bAction.removeEventListener(MouseEvent.CLICK, RepairAll);
                    popupMCDamaged.bAction2.removeEventListener(MouseEvent.CLICK, RepairNow);
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
                    if (MapRoomManager.instance.isInMapRoom3 && BASE.isOutpost) {
                        BASE.repairAllBuildingsToMinimumPercentage(0.25);
                    }
                    popupMCDamaged.bAction.removeEventListener(MouseEvent.CLICK, RepairAll);
                    popupMCDamaged.bAction2.removeEventListener(MouseEvent.CLICK, RepairNow);
                    let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
                    for (_loc3_ of (_loc2_ ?? [])) {
                        if (_loc3_.health < _loc3_.maxHealth && _loc3_._repairing == 0) {
                            _loc3_.Repair();
                        }
                    }
                    STORE.ShowB(3, 1, ["FIX"], true);
                    POPUPS.Next();
                };
                popupMCDamaged = new popup_damaged();
                popupMCDamaged.mcFrame.Setup(false);
                popupMCDamaged.title.htmlText = "<b>" + KEYS.Get("pop_damaged_title") + "</b>";
                popupMCDamaged.tA.htmlText = KEYS.Get("pop_damaged", { "v1": damageCount });
                popupMCDamaged.bAction.SetupKey("pop_damaged_repairall_btn");
                popupMCDamaged.bAction.addEventListener(MouseEvent.CLICK, RepairAll);
                popupMCDamaged.bAction2.SetupKey("pop_damaged_repairnow_btn");
                popupMCDamaged.bAction2.addEventListener(MouseEvent.CLICK, RepairNow);
                popupMCDamaged.bAction2.Highlight = true;
                POPUPS.Push(popupMCDamaged, null, null, null, "duct-tape.png");
                if (damageCount > 30) {
                    MARKETING.Show("catapult");
                }
            }
            needToHealCreeps = false;
            length = GLOBAL.player.monsterList.length | 0;
            i = 0;
            while (i < length && !needToHealCreeps) {
                if (as3.vget(GLOBAL.player.monsterList, i).needsHeals()) {
                    needToHealCreeps = true;
                }
                i++;
            }
            if (needToHealCreeps) {
                StartHealAll = (param1: MouseEvent = null): void => {
                    popupMCCreepDamaged.bAction.removeEventListener(MouseEvent.CLICK, StartHealAll);
                    popupMCCreepDamaged.bAction2.removeEventListener(MouseEvent.CLICK, HealShinyNow);
                    BASE.startHealAllHelper();
                };
                HealShinyNow = (param1: MouseEvent = null): void => {
                    popupMCCreepDamaged.bAction.removeEventListener(MouseEvent.CLICK, StartHealAll);
                    popupMCCreepDamaged.bAction2.removeEventListener(MouseEvent.CLICK, HealShinyNow);
                    BASE.healShinyNowHelper();
                };
                numCreepsDamaged = GLOBAL.player.getNumDamagedCreeps();
                popupMCCreepDamaged = new popup_damaged();
                popupMCCreepDamaged.mcFrame.Setup(false);
                popupMCCreepDamaged.title.htmlText = "<b>" + KEYS.Get("pop_injured_title") + "</b>";
                popupMCCreepDamaged.tA.htmlText = KEYS.Get("pop_injured", { "1": numCreepsDamaged });
                popupMCCreepDamaged.bAction.SetupKey("btn_startheal");
                popupMCCreepDamaged.bAction.addEventListener(MouseEvent.CLICK, StartHealAll);
                popupMCCreepDamaged.bAction2.SetupKey("btn_healnow");
                popupMCCreepDamaged.bAction2.addEventListener(MouseEvent.CLICK, HealShinyNow);
                popupMCCreepDamaged.bAction2.Highlight = true;
                POPUPS.Push(popupMCCreepDamaged, null, null, null, "duct-tape.png");
            }
        }
        INFERNO_EMERGENCE_EVENT.Initialize();
        if (INFERNO_DESCENT_POPUPS.isInDescent() && MAPROOM_DESCENT._descentLvl < MAPROOM_DESCENT._descentLvlMax && MAPROOM_DESCENT._descentLvl > 0) {
            INFERNO_DESCENT_POPUPS.ShowTauntDialog(MAPROOM_DESCENT._descentLvl >>> 0);
        }
        FrontPageHandler.initialize();
        MonsterMadness.initialize();
        GLOBAL.player.initializeHandlers(BASE.loadObject);
        GLOBAL.player.importPlayerSpecificHandlers(BASE.loadObject);
        if (Boolean(GLOBAL.attackingPlayer) && GLOBAL.attackingPlayer != GLOBAL.player) {
            GLOBAL.attackingPlayer.importPlayerSpecificHandlers(BASE.loadObject);
        }
        if (!BASE.isInfernoMainYardOrOutpost) {
            MonsterMadness.updateKorathStats();
        }
        FrontPageHandler.setup(BASE.loadObject["frontpage"]);
        if (!GLOBAL.INFERNO_ONLY) {
            // The "front page": the stock game's news and promotion popups at login ("Prepare for
            // Invasion", the 7-Eleven promo, feature nags). None of it applies here.
            FrontPageHandler.showPopup();
        }
        if (GLOBAL.DOES_USE_SCROLL) {
            MouseWheelEnabler.init(MAP.stage);
        }
        bb = 0;
        upgradeCount = 0;
        helpedCount = 0;
        if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
        }
        if (BASE.is711Valid()) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && TUTORIAL._stage > 200 && GLOBAL._sessionCount >= 5) {
                if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate && !GLOBAL._displayedPromoNew && !BASE._showingWhatsNew) {
                    hasBigGulp = Boolean(BASE._buildingsStored["b120"]);
                    if (!hasBigGulp) {
                        buildingInstances ||= InstanceManager.getInstancesByClass(BDECORATION);
                        for (building of (buildingInstances ?? [])) {
                            if (building._type == 120) {
                                hasBigGulp = true;
                                break;
                            }
                        }
                    }
                    if (!hasBigGulp) {
                        fbPromoTimer = GLOBAL.Timestamp() + GLOBAL.StatGet("fbpromotimer");
                        if (GLOBAL.StatGet("fbpromotimer") == 0 || GLOBAL.StatGet("fbpromotimer") > 0 && GLOBAL.Timestamp() > GLOBAL.StatGet("fbpromotimer") + GLOBAL._fbPromoTimer) {
                            if (GLOBAL._countryCode == "us") {
                                MoreInfo711 = (param1: MouseEvent): void => {
                                    GLOBAL.gotoURL("http://on.fb.me/mTMRnd", null, true, null);
                                    POPUPS.Next();
                                };
                                fbPromoPopup = new FBPROMO_711_CLIP();
                                fbPromoPopup.bAction3.buttonMode = true;
                                fbPromoPopup.bAction3.useHandCursor = true;
                                fbPromoPopup.bAction3.mouseChildren = false;
                                fbPromoPopup.bAction3.txt.htmlText = KEYS.Get("btn_goldenbiggulp");
                                fbPromoPopup.bAction3.bg.visible = false;
                                fbPromoPopup.bAction3.addEventListener(MouseEvent.CLICK, MoreInfo711);
                                fbPromoPopup.bAction4.buttonMode = true;
                                fbPromoPopup.bAction4.useHandCursor = true;
                                fbPromoPopup.bAction4.mouseChildren = false;
                                fbPromoPopup.bAction4.txt.htmlText = KEYS.Get("btn_hatcheryoverdrives");
                                fbPromoPopup.bAction4.addEventListener(MouseEvent.CLICK, MoreInfo711);
                                fbPromoPopup.bAction4.bg.visible = false;
                                fbPromoPopup.bInfo.useHandCursor = true;
                                fbPromoPopup.bInfo.buttonMode = true;
                                fbPromoPopup.bInfo.mouseChildren = false;
                                fbPromoPopup.bInfo.addEventListener(MouseEvent.CLICK, MoreInfo711);
                                POPUPS.Push(fbPromoPopup, BUY.logFB711PromoShown, null, null, null, false);
                                GLOBAL.StatSet("fbpromotimer", GLOBAL.Timestamp());
                                GLOBAL._displayedPromoNew = true;
                            }
                        }
                    }
                }
            }
        }
        if (GLOBAL._flags && GLOBAL._flags.fbcncpshow == 2 && GLOBAL._fbcncp > 0) {
            BUY.FBCNcpCheckEligibility();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP && !(MapRoomManager.instance.isInMapRoom3 && BASE.isOutpost)) {
            if (upgradeCount > 0) {
                if (upgradeCount - helpedCount == 1) {
                    GLOBAL.Message(KEYS.Get("base_pleasehelp"));
                }
                if (upgradeCount - helpedCount > 1) {
                    GLOBAL.Message(KEYS.Get("base_pleasehelpx", { "v1": upgradeCount - helpedCount }));
                }
            } else {
                GLOBAL.Message(KEYS.Get("base_nohelpneeded"));
            }
        }
        UI2.Update();
        PLEASEWAIT.Hide();
        BASE.CalcResources();
        UI2._scrollMap = true;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (!WMATTACK._inProgress) {
                UI2.Show("top");
                UI2.Show("bottom");
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            UI2.Show("top");
        } else if (!WMATTACK._inProgress) {
            UI2.Show("top");
        }
        BASE._baseLevel = BASE.BaseLevel().level | 0;
        BASE._loadTime = GLOBAL.Timestamp();
        BASE._lastSaved = GLOBAL.Timestamp();
        BASE.Save();
        buildingInstances ||= InstanceManager.getInstancesByClass(BFOUNDATION);
        for (building of (buildingInstances ?? [])) {
            if (!building._repairing && building.health > 0 && building.health <= building.maxHealth * 0.5) {
                Smoke.CreateStream(new Point(building.x, building.y + building._middle));
            }
        }
        QUESTS.TutorialCheck();
        QUESTS.Check();
        PATHING.ResetCosts();
        TUTORIAL.Process();
        MUSHROOMS.Setup();
        // Inferno-only: a main yard's pets come out (IoPets); an attack's replay starts recording (a player's
        // yard), or a replay plays over its yard (IoReplayRecorder, IoReplayPlayer)
        if (GLOBAL.INFERNO_ONLY) {
            IoPets.Setup();
            if (BASE._ioReplay && BASE._ioReplay.rec && GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                IoReplayRecorder.begin(String(BASE._ioReplay.key));
            }
            if (BASE._ioReplayView) {
                IoReplayPlayer.Setup(BASE._ioReplayView);
            }
        }
        // Hell Freezes Over: the event's ice, the tomb and its popups (the player's own main yard only)
        IoHfo.Setup();
        NewPopupSystem.instance.CheckAll(true);
        if (GLOBAL.mode == "help" && !(MapRoomManager.instance.isInMapRoom3 && BASE.isOutpost)) {
            promptSPost = false;
            for (b of (buildingInstances ?? [])) {
                if (b.health < b.maxHealth && b._repairing == 0) {
                    promptSPost = true;
                }
            }
            if (GLOBAL.Timestamp() - 24 * 3600 < BASE._damagedBaseWarnTime) {
                promptSPost = false;
            }
            if (promptSPost) {
                Action = (param1: MouseEvent = null): void => {
                    GLOBAL.CallJS("sendFeed", ["warn-damaged", KEYS.Get("base_damaged_streamtitle"), KEYS.Get("base_damaged_streambody", { "v1": BASE._ownerName }), "monstersatwork.png", BASE._loadedFBID]);
                    UPDATES.Create(["DBU"]);
                    POPUPS.Next();
                };
                popupMCdamaged = new popup_damagedbase_onvisit();
                popupMCdamaged.title_txt.htmlText = "<b>" + KEYS.Get("base_damaged_title") + "</b>";
                popupMCdamaged.body_txt.htmlText = KEYS.Get("base_damaged_body", { "v1": BASE._ownerName });
                popupMCdamaged.bAction.SetupKey("base_damaged_alert_btn");
                popupMCdamaged.bAction.Highlight = true;
                popupMCdamaged.bAction.addEventListener(MouseEvent.CLICK, Action);
                POPUPS.Push(popupMCdamaged);
            }
        }
        LOGGER.Stat([29, GLOBAL.mode]);
        LOGGER.Stat([88, GLOBAL._loadmode, BASE.m_yardType]);
        BASE._loading = false;
        if (BASE._takeoverFirstOpen) {
            WMATTACK._history.lastAttack = GLOBAL.Timestamp() + 12 * 60 * 60;
            WMATTACK._history.sessionsSinceLastAttack = 0;
            if (WMATTACK._history.nextAttack) {
                delete WMATTACK._history.nextAttack;
            }
            if (WMATTACK._history.queued) {
                delete WMATTACK._history.queued;
            }
            if (BASE._takeoverFirstOpen == 1) {
                BragA = (): void => {
                    GLOBAL.CallJS("sendFeed", ["upgrade-mr", KEYS.Get("conqueredbase", { "v1": BASE._takeoverPreviousOwnersName }), KEYS.Get("newmap_destroyed3"), "build-outpost.png"]);
                    POPUPS.Next();
                };
                ACHIEVEMENTS.Check("wmoutpost", 1);
                POPUPS.DisplayGeneric(KEYS.Get("venividivici"), KEYS.Get("destroyedbase_takeover", { "v1": BASE._takeoverPreviousOwnersName }), KEYS.Get("btn_brag"), "building-outpost.png", BragA);
            } else if (BASE._takeoverFirstOpen == 2) {
                BragB = (): void => {
                    GLOBAL.CallJS("sendFeed", ["upgrade-mr", KEYS.Get("conqueredoutpost", { "v1": BASE._takeoverPreviousOwnersName }), KEYS.Get("venividivici"), "build-outpost.png"]);
                    POPUPS.Next();
                };
                ++ACHIEVEMENTS._stats.playeroutpost;
                ACHIEVEMENTS.Check();
                POPUPS.DisplayGeneric(KEYS.Get("venividivici"), KEYS.Get("destroyedoutpost_takeover", { "v1": BASE._takeoverPreviousOwnersName }), KEYS.Get("btn_brag"), "building-outpost.png", BragB);
            }
        }
        BASE._takeoverFirstOpen = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (BASE.isOutpostMapRoom2Only || BASE.isOutpostInfernoOnly) {
                if (BASE._buildingCount == 1) {
                    POPUPS.Push(new popup_prefab_help());
                }
            } else {
                if (GLOBAL.INFERNO_ONLY) {
                    // The stock login nags (unlock a monster, build a catapult, upgrade it) are
                    // replaced by one welcome about invites, once per login (flags io_welcome_*).
                    BASE.ioWelcome();
                    // Back from a Moloch's Gauntlet attack: its window again, with what the attack did.
                    IoGauntlet.AfterHome();
                } else {
                    MARKETING.Process();
                }
                if (GLOBAL._flags.trialpayDealspot == 1 && (TUTORIAL._stage > 200 && GLOBAL._sessionCount > 10)) {
                    UI2._top.InitDealspot();
                }
                hp = 0;
                hpMax = 0;
                buildingInstances ||= InstanceManager.getInstancesByClass(BFOUNDATION);
                for (building of (buildingInstances ?? [])) {
                    if (building._class != "trap" && building._class != "wall") {
                        hp = (hp + building.health) | 0;
                        hpMax = (hpMax + building.maxHealth) | 0;
                    }
                }
                if (!ALLIANCES._myAlliance) {
                    if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL._empireDestroyedShown && MapRoomManager.instance.isInMapRoom2 && BASE.isMainYard && !WMATTACK._inProgress && (GLOBAL._mapOutpost.length == 0 || GLOBAL._empireDestroyed == 1) && hp < hpMax * 0.1) {
                        GLOBAL._empireDestroyedShown = true;
                        popupMCDestroyed = new PopupLostMainBase();
                        popupMCDestroyed.Setup();
                        POPUPS.Push(popupMCDestroyed, null, null, null, "base-destroyed.png");
                    }
                }
            }
        }
        GLOBAL.CallJS("cc.injectFriendsSwf", null, false);
        BASE.s_processing = false;
        BASE.HideFootprints();
    }

    public static repairAllBuildingsToMinimumPercentage(param1: number): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: number = NaN;
        param1 = Math.max(0, param1);
        param1 = Math.min(1, param1);
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            _loc4_ = _loc3_.maxHealth * param1;
            if (_loc3_.health < _loc4_) {
                _loc3_.setHealth(_loc4_);
            }
        }
    }

    public static startHealAllHelper(): void {
        let _loc17_: any = undefined;
        let _loc7_: string = null;
        let _loc11_: Vector<any> = null;
        let _loc12_: int = 0;
        let _loc13_: number = NaN;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: string = null;
        let _loc1_: Player = GLOBAL.player;
        let _loc2_: Vector<string> = new Vector<string>(0, false, String);
        let _loc3_: int = GLOBAL.player.monsterList.length | 0;
        let _loc4_: number = 0;
        let _loc5_: number = 0;
        let _loc6_: number = 0;
        let _loc8_: int = 0;
        let _loc9_: boolean = BASE.isInfernoMainYardOrOutpost;
        let _loc10_: int = 0;
        while (_loc10_ < _loc3_) {
            _loc7_ = as3.vget(_loc1_.monsterList, _loc10_).m_creatureID;
            _loc4_ = _loc1_.getResourceCostByID(_loc7_) - _loc1_.getResourceCostByID(_loc7_, true);
            if (_loc4_) {
                as3.vset(_loc2_, _loc8_, _loc7_);
                _loc8_++;
                if (!_loc9_ && _loc7_.substr(0, 1) == "I") {
                    _loc6_ += _loc4_;
                } else {
                    _loc5_ += _loc4_;
                }
            }
            _loc10_++;
        }
        if (!_loc9_) {
            _loc3_ = (_loc11_ = InstanceManager.getInstancesByClass(Bunker)).length | 0;
            _loc10_ = 0;
            while (_loc10_ < _loc3_) {
                _loc7_ = "B" + as3.vget(_loc11_, _loc10_)._id;
                _loc4_ = GLOBAL.player.getResourceCostByID(_loc7_) - GLOBAL.player.getResourceCostByID(_loc7_, true);
                if (_loc4_) {
                    as3.vset(_loc2_, _loc17_ = _loc8_++, _loc7_);
                    _loc5_ += _loc4_;
                }
                _loc10_++;
            }
        }
        if ((!_loc5_ || BASE.Charge(4, _loc5_, true, _loc9_)) && (!_loc6_ || BASE.Charge(4, _loc6_, true, !_loc9_))) {
            BASE.Charge(4, _loc5_, false, _loc9_);
            BASE.Charge(4, _loc6_, false, !_loc9_);
            _loc3_ = _loc2_.length | 0;
            _loc12_ = 0;
            while (_loc12_ < _loc3_) {
                GLOBAL.player.queueHeal(as3.vget(_loc2_, _loc12_), true);
                _loc12_++;
            }
            BASE.Save();
        } else {
            _loc13_ = 0;
            _loc14_ = BASE._resources.r4.Get() | 0;
            if (_loc5_ > _loc14_) {
                _loc13_ = _loc5_ - _loc14_;
                _loc5_ = Number(BASE._resources.r4.Get());
            }
            _loc14_ = BASE._iresources.r4.Get() | 0;
            if (_loc6_ > _loc14_) {
                _loc13_ += _loc6_ - _loc14_;
                _loc6_ = Number(BASE._iresources.r4.Get());
            }
            _loc15_ = Math.ceil(Math.pow(Math.sqrt(_loc13_ / 2), 0.75)) | 0;
            _loc16_ = _loc9_ ? "msg_moremagmaheal" : "msg_moreresourcesheal";
            GLOBAL.Message(KEYS.Get(_loc16_, { "v1": GLOBAL.FormatNumber(_loc13_), "v2": GLOBAL.FormatNumber(_loc15_) }), KEYS.Get("buildoptions_shiny", { "v1": _loc15_ }), BASE.startHealWithShiny, [_loc15_, _loc5_, _loc6_, _loc2_]);
        }
        POPUPS.Next();
    }

    public static startHealWithShiny(param1: int, param2: number, param3: number, param4: Vector<string>): void {
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc5_: boolean = Boolean(BASE.isInfernoMainYardOrOutpost);
        if (BASE._pendingPurchase.length == 0) {
            if (param1 > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
            } else if (!GLOBAL.ioConfirmShiny(param1, "to make up the missing resources and heal", (): void => {
                BASE.startHealWithShiny(param1, param2, param3, param4);
            })) {
                return;
            } else {
                BASE.Charge(4, param2, false, _loc5_);
                BASE.Charge(4, param3, false, !_loc5_);
                _loc6_ = param4.length | 0;
                _loc7_ = 0;
                while (_loc7_ < _loc6_) {
                    GLOBAL.player.queueHeal(as3.vget(param4, _loc7_));
                    _loc7_++;
                }
                if (param1 > 0) {
                    BASE.Purchase("MHTOPUP", param1, "BASE.startHealWithShiny");
                }
            }
        }
    }

    public static healShinyNowHelper(): void {
        let _loc1_: int = STORE.GetHealAllShinyCost();
        STORE.ShowB(3, 1, ["HAMS"], true);
        POPUPS.Next();
    }

    public static ShowSiegeWeaponWhatsNew(param1: MovieClip, param2: string): void {
        let weaponID: string = null;
        let ShowLab: Function = null;
        let popup: MovieClip = param1;
        weaponID = param2;
        popup.tTitle.htmlText = "<b>" + KEYS.Get("whatsnew_title") + "</b>";
        if (BASE.isInfernoMainYardOrOutpost || !INFERNOPORTAL.isAboveMaxLevel() || !MAPROOM_DESCENT.DescentPassed) {
            popup.bAction.visible = false;
        } else if (GLOBAL._bSiegeLab) {
            ShowLab = (param1: MouseEvent): void => {
                BUILDINGS._buildingID = SiegeLab.ID;
                SiegeBuilding.Show("lab", weaponID);
                POPUPS.Next();
            };
            popup.bAction.SetupKey("btn_unlocknow");
            popup.bAction.addEventListener(MouseEvent.CLICK, ShowLab);
        } else {
            popup.bAction.SetupKey("btn_buildnow");
            popup.bAction.addEventListener(MouseEvent.CLICK, BASE.ShowBuildLab);
        }
    }

    private static ShowBuildLab(param1: MouseEvent): void {
        BUILDINGS._buildingID = SiegeLab.ID;
        BUILDINGS.Show();
        POPUPS.Next();
    }

    public static Tick(): void {
        let saveDelay: int = 2;
        if (GLOBAL._flags.savedelay) {
            saveDelay = GLOBAL._flags.savedelay | 0;
        }
        if (BASE._saveCounterA != BASE._saveCounterB) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK && BASE._saveOver != 1) {
                if (GLOBAL.Timestamp() - BASE._lastSaveRequest > saveDelay * 2 || GLOBAL.Timestamp() - BASE._lastSaved > 15) {
                    BASE.SaveB();
                }
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK && BASE._saveOver != 1) {
                if (GLOBAL.Timestamp() - BASE._lastSaveRequest > saveDelay * 2 || GLOBAL.Timestamp() - BASE._lastSaved > 20) {
                    BASE.SaveB();
                }
            } else if (GLOBAL.Timestamp() - BASE._lastSaveRequest >= saveDelay || BASE._pendingPurchase.length > 0 || BASE._loadBase.length > 0 && BASE._saveOver != 1) {
                BASE.SaveB();
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                UI2._top.mcSave.gotoAndStop(2 + 2);
            } else {
                UI2._top.mcSave.gotoAndStop(2);
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            UI2._top.mcSave.gotoAndStop(1 + 2);
        } else {
            UI2._top.mcSave.gotoAndStop(1);
        }
        if (GLOBAL.Timestamp() % 10 == 0) {
            CHECKER.Check();
            if (!BASE.usesInfernoBackend) {
                AutoBankManager.autobank();
            }
        }
        let _loc2_: int = (((Math.random() * 10) | 0) + 25) | 0;
        if (GLOBAL._flags.pageinterval) {
            _loc2_ = GLOBAL._flags.pageinterval | 0;
        }
        if (BASE._lastPaged >= _loc2_ && !BASE._paging && !BASE._saving && GLOBAL.Timestamp() - BASE._lastSaved >= _loc2_) {
            let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
            if (activeEvent.active) {
                BASE._blockSave = false;
                BASE.Save(0, false, true);
                BASE._lastSaved = GLOBAL.Timestamp();
            } else {
                BASE.Page();
            }
        }
        ++BASE._lastPaged;
        if (GLOBAL._extraHousing < GLOBAL.Timestamp() && HOUSING._housingUsed.Get() > HOUSING._housingCapacity.Get()) {
            HOUSING.Cull(false);
            GLOBAL._extraHousing = 0;
            GLOBAL._extraHousingPower.Set(0);
            BASE.Save();
        }
        BASE.ShakeB();
    }

    public static Purchase(param1: string, param2: int, param3: string, param4: boolean = false): boolean {
        if (BASE._pendingPurchase.length > 0) {
            GLOBAL.ErrorMessage(KEYS.Get("msg_err_purchase"), GLOBAL.ERROR_ORANGE_BOX_ONLY);
            return false;
        }
        if (!param2) {
            return false;
        }
        if (param2 <= 0) {
            GLOBAL.ErrorMessage("BASE.Purchase zero quantity");
            LOGGER.Log("err", "BASE.Purchase Id " + param1 + ", illegal quantity " + param2 + ", possible hack");
            return false;
        }
        BASE._pendingPurchase = [param1, param2, BASE._saveCounterA + 1, param3, param4];
        if (param3 != "store") {
            LOGGER.Stat([61, param1, param2]);
        }
        BASE.Save();
        return true;
    }

    public static Save(param1: int = 0, param2: boolean = false, param3: boolean = false, param4: boolean = false): void {
        if (Boolean(UI2._top) && Boolean(UI2._top.mcSave)) {
            UI2._top.mcSave.gotoAndStop(2);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                UI2._top.mcSave.gotoAndStop(2 + 2);
            } else {
                UI2._top.mcSave.gotoAndStop(2);
            }
        }
        if (param1 > 0) {
            BASE._saveOver = param1;
        }
        if (param2) {
            BASE._returnHome = true;
        }
        BASE._lastSaveRequest = GLOBAL.Timestamp();
        ++BASE._saveCounterA;
        if (param3 || BASE._pendingPurchase.length > 0) {
            BASE.SaveB();
        }
        if (BASE.usesInfernoBackend || param4 || GLOBAL._loadmode != GLOBAL.mode) {
            BASE._infernoSaveLoad = true;
        }
    }

    public static saveBLite(): boolean {
        return true;
    }

    private static getStatsSaveData(): any {
        let _loc1_: any = {};
        _loc1_.mp = QUESTS._global.mushroomspicked | 0;
        _loc1_.mg = QUESTS._global.goldmushroomspicked | 0;
        _loc1_.mob = QUESTS._global.monstersblended | 0;
        _loc1_.mobg = QUESTS._global.monstersblendedgoo | 0;
        _loc1_.moga = QUESTS._global.gift_accept | 0;
        _loc1_.updateid = GLOBAL._whatsnewid;
        _loc1_.updateid_mr2 = GLOBAL._mr2TutorialId;
        _loc1_.updateid_mr3 = MapRoom3Tutorial.instance.tutorialId;
        _loc1_.other = GLOBAL._otherStats;
        _loc1_.achievements = ACHIEVEMENTS.Export();
        _loc1_.popupdata = NewPopupSystem.instance.Export();
        if (BASE.usesInfernoBackend && GLOBAL._otherStats.descentLvl >= MAPROOM_DESCENT._descentLvlMax) {
            _loc1_.inferno = 1;
        } else {
            _loc1_.inferno = 0;
        }
        return _loc1_;
    }

    private static getResourceSaveData(): any {
        return { "r1": BASE._savedDeltaResources.r1.Get(), "r2": BASE._savedDeltaResources.r2.Get(), "r3": BASE._savedDeltaResources.r3.Get(), "r4": BASE._savedDeltaResources.r4.Get(), "r1max": BASE._resources.r1max, "r2max": BASE._resources.r2max, "r3max": BASE._resources.r3max, "r4max": BASE._resources.r4max };
    }

    private static getHousingSaveData(): any {
        let _loc1_: int = 0;
        let _loc8_: BUILDING13 = null;
        let _loc9_: any = null;
        let _loc2_: any = {};
        let _loc3_: int = 0;
        let _loc4_: any[] = [];
        let _loc5_: any[] = [];
        let _loc6_: any[] = [];
        if (WORKERS._workers && WORKERS._workers.length > 0 && Boolean(WORKERS._workers[0].task)) {
            _loc1_ = (GLOBAL.Timestamp() + WORKERS._workers[0].task._countdownBuild.Get() + WORKERS._workers[0].task._countdownUpgrade.Get() + WORKERS._workers[0].task._countdownFortify.Get()) | 0;
        }
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING13);
        for (_loc8_ of (_loc7_ ?? [])) {
            _loc4_[_loc3_] = [_loc8_._inProduction, _loc8_._countdownProduce.Get()];
            _loc5_[_loc3_] = _loc8_._productionStage.Get();
            _loc6_[_loc3_] = _loc8_._id;
            if (_loc8_._monsterQueue) {
                _loc4_[_loc3_].push(_loc8_._monsterQueue);
            }
            _loc3_++;
        }
        _loc2_ = GLOBAL.player.exportMonsters();
        if (GLOBAL._bHatcheryCC) {
            _loc9_ = { "saved": GLOBAL.Timestamp(), "housed": _loc2_, "space": HOUSING._housingCapacity.Get(), "hcount": _loc3_, "hcc": GLOBAL._bHatcheryCC._monsterQueue, "h": _loc4_, "hid": _loc6_, "hstage": _loc5_, "overdrivepower": GLOBAL._hatcheryOverdrivePower.Get(), "overdrivetime": GLOBAL._hatcheryOverdrive, "finishtime": _loc1_ };
        } else {
            _loc9_ = { "saved": GLOBAL.Timestamp(), "housed": _loc2_, "space": HOUSING._housingCapacity.Get(), "hcount": _loc3_, "hcc": [], "h": _loc4_, "hid": _loc6_, "hstage": _loc5_, "overdrivepower": GLOBAL._hatcheryOverdrivePower.Get(), "overdrivetime": GLOBAL._hatcheryOverdrive, "finishtime": _loc1_ };
        }
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only: when each worker is free again (0: idle now), for the Map Room's idle workers by an
            // outpost (an outpost has 2: MapRoomCell.ioIdleWorkers)
            let ioTimes: any[] = [];
            for (let ioWorker of as3.values(WORKERS._workers)) {
                let ioTask: BFOUNDATION = ioWorker ? as3.as(ioWorker.task, BFOUNDATION) : null;
                ioTimes.push(ioTask ? GLOBAL.Timestamp() + ioTask._countdownBuild.Get() + ioTask._countdownUpgrade.Get() + ioTask._countdownFortify.Get() : 0);
            }
            _loc9_.finishtimes = ioTimes;
        }
        return _loc9_;
    }

    private static getStoredBuildingsSaveData(): any {
        let _loc2_: string = null;
        let _loc1_: any = {};
        for (_loc2_ in BASE._buildingsStored) {
            if (BASE._buildingsStored[_loc2_].Get()) {
                _loc1_[_loc2_] = BASE._buildingsStored[_loc2_].Get();
            }
        }
        return _loc1_;
    }

    private static getInfernoResourcesSaveData(): any {
        let _loc2_: string = null;
        let _loc1_: any = { "r1": BASE._ideltaResources.r1.Get(), "r2": BASE._ideltaResources.r2.Get(), "r3": BASE._ideltaResources.r3.Get(), "r4": BASE._ideltaResources.r4.Get(), "r1max": BASE._iresources.r1max, "r2max": BASE._iresources.r2max, "r3max": BASE._iresources.r3max, "r4max": BASE._iresources.r4max };
        for (_loc2_ in _loc1_) {
            if (!_loc1_[_loc2_]) {
                delete _loc1_[_loc2_];
            }
        }
        if (Boolean(_loc1_.r1) || Boolean(_loc1_.r2) || Boolean(_loc1_.r3) || Boolean(_loc1_.r4)) {
            return _loc1_;
        }
        return null;
    }

    private static getMushroomSaveData(): any {
        let _loc1_: BFOUNDATION = null;
        let _loc2_: any = null;
        BASE._mushroomList = [];
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BMUSHROOM);
        for (_loc1_ of (_loc3_ ?? [])) {
            // (Hell Freezes Over's ice is kept by the server, not with the warts)
            if (_loc1_ instanceof IoHfoIce) {
                continue;
            }
            _loc2_ = _loc1_.Export();
            BASE._mushroomList.push([_loc2_.frame, _loc2_.X, _loc2_.Y]);
        }
        return { "l": BASE._mushroomList, "s": BASE._lastSpawnedMushroom };
    }

    private static getLootReportSaveData(): any {
        return { "r1": ATTACK._loot.r1.Get(), "r2": ATTACK._loot.r2.Get(), "r3": ATTACK._loot.r3.Get(), "r4": ATTACK._loot.r4.Get(), "isInferno": BASE.isInfernoMainYardOrOutpost, "name": BASE._ownerName };
    }

    private static getChampionSaveData(): any[] {
        let _loc5_: int = 0;
        let _loc7_: Vector<any> = null;
        let _loc8_: int = 0;
        let _loc1_: Dictionary = new Dictionary();
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: any[] = new Array();
        let _loc6_: boolean = false;
        _loc5_ = 0;
        while (_loc5_ < BASE._guardianData.length) {
            if (Boolean(as3.vget(BASE._guardianData, _loc5_)) && _loc1_.get(as3.vget(BASE._guardianData, _loc5_).t) === undefined) {
                _loc1_.set(as3.vget(BASE._guardianData, _loc5_).t, _loc5_);
                _loc4_.push(new Object());
                if (as3.vget(BASE._guardianData, _loc5_).nm) {
                    _loc4_[_loc3_].nm = as3.vget(BASE._guardianData, _loc5_).nm;
                }
                if (as3.vget(BASE._guardianData, _loc5_).t) {
                    _loc4_[_loc3_].t = as3.vget(BASE._guardianData, _loc5_).t;
                }
                if (as3.vget(BASE._guardianData, _loc5_).hp) {
                    _loc4_[_loc3_].hp = as3.vget(BASE._guardianData, _loc5_).hp.Get();
                } else {
                    _loc4_[_loc3_].hp = 0;
                }
                if (as3.vget(BASE._guardianData, _loc5_).l) {
                    _loc4_[_loc3_].l = as3.vget(BASE._guardianData, _loc5_).l.Get();
                }
                if (as3.vget(BASE._guardianData, _loc5_).ft) {
                    _loc4_[_loc3_].ft = as3.vget(BASE._guardianData, _loc5_).ft;
                }
                if (as3.vget(BASE._guardianData, _loc5_).fd) {
                    _loc4_[_loc3_].fd = as3.vget(BASE._guardianData, _loc5_).fd;
                } else {
                    _loc4_[_loc3_].fd = 0;
                }
                if (as3.vget(BASE._guardianData, _loc5_).fb) {
                    _loc4_[_loc3_].fb = as3.vget(BASE._guardianData, _loc5_).fb.Get();
                } else {
                    _loc4_[_loc3_].fb = 0;
                }
                if (as3.vget(BASE._guardianData, _loc5_).pl) {
                    if (as3.vget(BASE._guardianData, _loc5_).pl instanceof SecNum) {
                        _loc4_[_loc3_].pl = as3.vget(BASE._guardianData, _loc5_).pl.Get();
                    } else {
                        _loc4_[_loc3_].pl = as3.vget(BASE._guardianData, _loc5_).pl;
                    }
                } else {
                    _loc4_[_loc3_].pl = 0;
                }
                if (as3.vget(BASE._guardianData, _loc5_).status == ChampionBase.k_CHAMPION_STATUS_NORMAL && as3.vget(BASE._guardianData, _loc5_).t != 5) {
                    if (_loc2_) {
                        as3.vget(BASE._guardianData, _loc5_).status = ChampionBase.k_CHAMPION_STATUS_FROZEN;
                    }
                    _loc2_ = true;
                }
                if (as3.vget(BASE._guardianData, _loc5_).status) {
                    _loc4_[_loc3_].status = as3.vget(BASE._guardianData, _loc5_).status;
                } else {
                    _loc4_[_loc3_].status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
                }
                _loc3_++;
            } else {
                _loc6_ = true;
            }
            _loc5_++;
        }
        if (_loc6_) {
            _loc7_ = new Vector<any>(0, false, Object);
            for (const $value of (_loc1_?.values() ?? [])) {
                _loc8_ = $value | 0;
                _loc7_.push(as3.vget(BASE._guardianData, _loc8_));
            }
            BASE._guardianData = _loc7_;
        }
        if (_loc4_.length) {
            return _loc4_;
        }
        return null;
    }

    private static getAttackerDeltaResourcesSaveData(): any {
        return { "r1": ATTACK._savedDeltaLoot.r1.Get() + GLOBAL._savedAttackersDeltaResources.r1.Get(), "r2": ATTACK._savedDeltaLoot.r2.Get() + GLOBAL._savedAttackersDeltaResources.r2.Get(), "r3": ATTACK._savedDeltaLoot.r3.Get() + GLOBAL._savedAttackersDeltaResources.r3.Get(), "r4": ATTACK._savedDeltaLoot.r4.Get() + GLOBAL._savedAttackersDeltaResources.r4.Get() };
    }

    public static getGuardianIndex(param1: int): int {
        let _loc2_: int = 0;
        while (_loc2_ < BASE._guardianData.length) {
            if (as3.vget(BASE._guardianData, _loc2_).t == param1) {
                return _loc2_;
            }
            _loc2_++;
        }
        return -1;
    }

    /*
     * Builds the attacking player's champion list for the save payload.
     *
     * Entries are pushed rather than written at the index they occupy in
     * GLOBAL._playerGuardianData. A skipped guardian would otherwise leave a
     * hole in the array, which serialises to null and reaches the server as
     * [null,{...}] - the base loader dereferences champion[j].t without a null
     * check, so those holes come back as a runtime error on the next load.
     *
     * Keeping it dense also makes the length check below meaningful, so a
     * player with no champions omits the field instead of sending [null,null].
     */
    private static getAttackingPlayerGuardianSaveData(): any[] {
        let championData: any[] = new Array();
        let unfrozenFound: boolean = false;
        let guardian: any = null;
        let champion: any = null;
        let i: int = 0;
        while (i < GLOBAL._playerGuardianData.length) {
            guardian = as3.vget(GLOBAL._playerGuardianData, i);
            if (Boolean(guardian) && guardian.t > 0) {
                champion = new Object();
                if (guardian.nm) {
                    champion.nm = guardian.nm;
                }
                if (guardian.t) {
                    champion.t = guardian.t;
                }
                if (guardian.hp) {
                    champion.hp = guardian.hp.Get();
                }
                if (guardian.l) {
                    champion.l = guardian.l.Get();
                }
                if (guardian.ft) {
                    champion.ft = guardian.ft;
                }
                if (guardian.fd) {
                    champion.fd = guardian.fd;
                } else {
                    champion.fd = 0;
                }
                if (guardian.fb) {
                    champion.fb = guardian.fb.Get();
                } else {
                    champion.fb = 0;
                }
                if (guardian.pl) {
                    champion.pl = guardian.pl.Get();
                } else {
                    champion.pl = 0;
                }
                if (guardian.status == ChampionBase.k_CHAMPION_STATUS_NORMAL && guardian.t != 5) {
                    if (unfrozenFound) {
                        guardian.status = ChampionBase.k_CHAMPION_STATUS_FROZEN;
                    }
                    unfrozenFound = true;
                }
                if (guardian.status) {
                    champion.status = guardian.status;
                } else {
                    champion.status = 0;
                }
                championData.push(champion);
            }
            i++;
        }
        if (championData.length) {
            return championData;
        }
        return null;
    }

    public static _guardianDataNumNormal(): int {
        let _loc1_: int = BASE._guardianData.length | 0;
        let _loc2_: int = (_loc1_ - 1) | 0;
        while (_loc2_ >= 0) {
            if (as3.vget(BASE._guardianData, _loc2_).status != ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                _loc1_--;
            }
            _loc2_--;
        }
        return _loc1_;
    }

    private static getMR2MonsterUpdateSaveData(): any {
        let attackerCellData: CellData = null;
        let attackerHomeCell: MapRoomCell = null;
        let attackerCell: MapRoomCell = null;
        let flingerRange: number = NaN;
        let monsterId: string = null;
        let amtAllCells: number = NaN;
        let amtCurCell: number = NaN;
        let amtAvailable: number = NaN;
        let amtUsed: number = NaN;
        let attackerCellUpdates: any = null;
        let homeCellUpdates: any = null;
        let cellUpdates: any = [];
        let resourceLoot: any = { "r1": ATTACK._loot.r1.Get(), "r2": ATTACK._loot.r2.Get(), "r3": ATTACK._loot.r3.Get(), "r4": ATTACK._loot.r4.Get() };
        for (attackerCellData of (GLOBAL._attackerCellsInRange ?? [])) {
            attackerCell = attackerCellData.cell;
            if (attackerCell && attackerCell.mine && Boolean(attackerCell.resources)) {
                if (attackerCell.flingerRange.Get()) {
                    flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [attackerCell.flingerRange.Get()]);
                    if (flingerRange >= attackerCellData.range) {
                        for (monsterId in GLOBAL._attackerMapCreaturesStart) {
                            if (Boolean(attackerCell.monsters[monsterId]) && attackerCell.monsters[monsterId].Get() > 0) {
                                amtAllCells = Number(GLOBAL._attackerMapCreaturesStart[monsterId].Get());
                                amtCurCell = Number(attackerCell.monsters[monsterId].Get());
                                amtAvailable = Number(ATTACK._curCreaturesAvailable[monsterId]);
                                if (ATTACK._flingerBucket[monsterId]) {
                                    // Monsters in the flinger's bucket have not been used yet, thus shouldn't be removed from cells.
                                    amtAvailable = Number(amtAvailable + ATTACK._flingerBucket[monsterId].Get());
                                }
                                amtUsed = amtAllCells - amtAvailable;
                                if (amtAllCells > amtAvailable) {
                                    if (amtUsed >= amtCurCell) {
                                        GLOBAL._attackerMapCreaturesStart[monsterId].Add(-amtCurCell);
                                        attackerCell.monsterData.saved = GLOBAL.Timestamp();
                                        delete attackerCell.monsters[monsterId];
                                        delete attackerCell.hpMonsters[monsterId];
                                        attackerCell.isDirty = true;
                                    } else {
                                        attackerCell.monsters[monsterId].Add(-amtUsed);
                                        attackerCell.hpMonsters[monsterId] -= amtUsed;
                                        attackerCell.monsterData.saved = GLOBAL.Timestamp();
                                        GLOBAL._attackerMapCreaturesStart[monsterId].Set(amtAvailable);
                                        attackerCell.isDirty = true;
                                    }
                                }
                            }
                        }
                    }
                }
                if (attackerCell.isDirty) {
                    if (attackerCell.Check()) {
                        attackerCell.monsterData["housed"] = attackerCell.monsters;
                        attackerCell.hpMonsterData["housed"] = attackerCell.hpMonsters;
                        attackerCell.monsterData.saved = GLOBAL.Timestamp();
                        attackerCell.hpMonsterData.saved = GLOBAL.Timestamp();
                        attackerCellUpdates = { "baseid": attackerCell.baseID, "m": attackerCell.hpMonsterData };
                        if (attackerCell.isProtected) {
                            attackerCellUpdates.p = 1;
                            attackerCell.isProtected = 0;
                        }
                        cellUpdates.push(attackerCellUpdates);
                        attackerCell.isDirty = false;
                    } else {
                        LOGGER.Log("err", "BASE.Save:  Dirty Cell " + attackerCell.cellX + "," + attackerCell.cellY + "does not check out before doing map update!  " + JSON.stringify(attackerCell.hpResources));
                    }
                }
            }
        }
        attackerHomeCell = as3.as(MapRoom.homeCell, MapRoomCell);
        if (attackerHomeCell && attackerHomeCell.isProtected && (BASE.guardianFlung() || SiegeWeapons.didActivatWeapon || ResourceBombs.launchedBomb)) {
            attackerHomeCell.isProtected = 0;
            homeCellUpdates = { "baseid": GLOBAL._homeBaseID, "m": attackerHomeCell.hpMonsterData, "p": 1 };
            cellUpdates.push(homeCellUpdates);
        }
        if (GLOBAL._attackerCellsInRange.length == 0 && GLOBAL.mode === GLOBAL.e_BASE_MODE.ATTACK) {
            LOGGER.Log("err", "BASE.Save: No Cells in Range.");
        }
        return cellUpdates;
    }

    private static getPurchaseSaveData(): any {
        let _loc1_: any[] = [BASE._pendingPurchase[0], BASE._pendingPurchase[1]];
        if (BASE._pendingPurchase[0].substr(0, 8) == "MUSHROOM") {
            if (BASE._pendingPurchase[1] > 1) {
                LOGGER.Log("log", "HACK " + BASE._pendingPurchase[0] + " " + BASE._pendingPurchase[1]);
                GLOBAL.ErrorMessage("BASE.Save Mushroom hack 1");
                return false;
            }
            ++GLOBAL._shinyShroomCount;
            if (GLOBAL._shinyShroomCount > 30) {
                LOGGER.Log("log", "Too many shiny shrooms in session");
                GLOBAL.ErrorMessage("BASE.Save Mushroom hack 2");
                return false;
            }
            if (!GLOBAL._shinyShroomValid) {
                LOGGER.Log("log", "Shiny shroom not validated");
                GLOBAL.ErrorMessage("BASE.Save Mushroom hack 3");
                return false;
            }
            GLOBAL._shinyShroomValid = false;
        }
        if (BASE._pendingPurchase[4]) {
            _loc1_.push("inv=1");
        }
        return _loc1_;
    }

    public static ioNoteServerResources(where: string, resources: any): void {
        try {
            BASE._ioServerResources = where + " " + (resources.r1 | 0) + "/" + (resources.r2 | 0) + "/" + (resources.r3 | 0) + "/" + (resources.r4 | 0) + " at " + GLOBAL.Timestamp();
        } catch (e) {
        }
    }

    private static fixNegativeResourceValues(): void {
        // The line says what the server last sent (a negative there points at the server, not the game).
        let ioFrom: string = GLOBAL.INFERNO_ONLY ? " (server last sent " + BASE._ioServerResources + ", now " + GLOBAL.Timestamp() + ")" : "";
        if (BASE._resources.r1.Get() < 0) {
            LOGGER.Log("err", "Negative twigs reset: " + BASE._resources.r1.Get() + ioFrom);
            BASE.Fund(1, BASE._resources.r1.Get() * -1, true);
        }
        if (BASE._resources.r2.Get() < 0) {
            LOGGER.Log("err", "Negative pebbles reset: " + BASE._resources.r2.Get() + ioFrom);
            BASE.Fund(2, BASE._resources.r2.Get() * -1, true);
        }
        if (BASE._resources.r3.Get() < 0) {
            LOGGER.Log("err", "Negative putty reset: " + BASE._resources.r3.Get() + ioFrom);
            BASE.Fund(3, BASE._resources.r3.Get() * -1, true);
        }
        if (BASE._resources.r4.Get() < 0) {
            LOGGER.Log("err", "Negative goo reset: " + BASE._resources.r4.Get() + ioFrom);
            BASE.Fund(4, BASE._resources.r4.Get() * -1, true);
        }
    }

    private static getOrderedSaveVariablesFromObject(param1: any): any[] {
        let _loc2_: any[] = ["baseid", "lastupdate", "resources", "academy", "stats", "mushrooms", "basename", "baseseed", "buildingdata", "researchdata", "lockerdata", "quests", "basevalue", "points", "tutorialstage", "basesaveid", "clienttime", "monsters", "attacks", "monsterbaiter", "version", "attackreport", "over", "protect", "monsterupdate", "attackid", "aiattacks", "effects", "catapult", "flinger", "gifts", "sentgifts", "sentinvites", "purchase", "inventory", "timeplayed", "destroyed", "damage", "type", "attackcreatures", "attackloot", "lootreport", "empirevalue", "champion", "attackerchampion", "attackersiege", "purchasecomplete", "achieved", "fbpromos", "iresources", "siege", "buildingresources", "frontpage", "events", "buildinghealthdata", "healtime", "lootbonus", "iotest"];
        let _loc3_: int = GLOBAL.player.handlers.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            _loc2_.push(as3.vget(GLOBAL.player.handlers, _loc4_).name);
            _loc4_++;
        }
        let _loc5_: any[] = [];
        let _loc6_: uint = _loc2_.length;
        let _loc7_: uint = 0;
        while (_loc7_ < _loc6_) {
            if (param1.hasOwnProperty(_loc2_[_loc7_])) {
                _loc5_.push([_loc2_[_loc7_], param1[_loc2_[_loc7_]]]);
            }
            _loc7_++;
        }
        return _loc5_;
    }

    public static SaveB(): boolean {
        let handler: IHandler = null;
        let exportedData: any = null;
        let updateAutoBank: any = null;
        let champion: any[] = null;
        let attackerChampion: any[] = null;
        if (GLOBAL.isHalted) {
            return false;
        }
        if (BASE._blockSave || GLOBAL.mode == GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW || BASE._loading || GLOBAL.mode == GLOBAL.e_BASE_MODE.IVIEW || GLOBAL.mode == GLOBAL.e_BASE_MODE.IHELP || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMVIEW) {
            BASE._saveCounterB = BASE._saveCounterA;
            return false;
        }
        if (BASE._saving) {
            return false;
        }
        if (GLOBAL._catchup) {
            BASE._saveCounterB = BASE._saveCounterA;
            return false;
        }
        // Never save an own yard that isn't in memory: opening the map runs BASE.Cleanup, and a save
        // after that (a purchase, a tool, a timer) wrote the yard back with no buildings at all. The
        // yard is loaded again from the server when the map closes.
        if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && (GLOBAL.isMapOpen() || (BASE.isMainYardOrInfernoMainYard && (!BASE.buildings || BASE.buildings.length == 0)))) {
            BASE._saveCounterB = BASE._saveCounterA;
            return false;
        }
        BASE._saving = true;
        BASE._saveCounterB = BASE._saveCounterA;
        BASE.fixNegativeResourceValues();
        BASE.CalcBaseValue();
        BASE.CalcResources();
        BASE.SaveDeltaResources();
        let saveData: any = {};
        // Admin test mode: the server refuses saves from a game still in test mode after it was switched off.
        if (GLOBAL.ioTestMode()) {
            saveData["iotest"] = 1;
        }
        if (MapRoomManager.instance.isInMapRoom3 && !BASE.isInfernoMainYardOrOutpost) {
            saveData["healtime"] = BASE.getEstimatedRepairDuration();
        }
        let buildingSaveData: Vector<any> = BFOUNDATION.getBuildingSaveData();
        if (!MapRoomManager.instance.isInMapRoom3 || !GLOBAL.isInAttackMode || BASE.isInfernoMainYardOrOutpost) {
            saveData["buildingdata"] = JSON.stringify(as3.vget(buildingSaveData, 0));
        }
        // Old implementation - was specific to MapRoom3, should have been for every map room.
        // if(MapRoomManager.instance.isInMapRoom3 && !BASE.isInfernoMainYardOrOutpost)
        // {
        // saveData["buildinghealthdata"] = JSON.stringify(buildingSaveData[1]);
        // saveData["buildingkeydata"] = JSON.stringify(buildingSaveData[2]);
        // }
        saveData["buildinghealthdata"] = JSON.stringify(as3.vget(buildingSaveData, 1));
        saveData["buildingkeydata"] = JSON.stringify(as3.vget(buildingSaveData, 2));
        saveData["stats"] = JSON.stringify(BASE.getStatsSaveData());
        saveData["resources"] = JSON.stringify(BASE.getResourceSaveData());
        if (MapRoomManager.instance.isInMapRoom2) {
            saveData["monsters"] = JSON.stringify(BASE.getHousingSaveData());
        } else {
            saveData["monsters"] = JSON.stringify(GLOBAL.player.exportMonsters());
        }
        saveData["catapult"] = !(!GLOBAL._bCatapult) ? GLOBAL._bCatapult._lvl.Get() : 0;
        saveData["flinger"] = !(!GLOBAL._bFlinger) ? GLOBAL._bFlinger._lvl.Get() : 0;
        saveData["researchdata"] = JSON.stringify(BASE.getStoredBuildingsSaveData());
        if (!MapRoomManager.instance.isInMapRoom3 || !GLOBAL.isInAttackMode) {
            saveData["mushrooms"] = JSON.stringify(BASE.getMushroomSaveData());
        }
        saveData["quests"] = JSON.stringify(QUESTS._completed);
        saveData["basename"] = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK ? TRIBES.TribeForBaseID(BASE._wmID).name : BASE._baseName;
        saveData["siege"] = JSON.stringify(GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard ? SiegeWeapons.exportWeapons() : BASE._oldSiegeData);
        saveData["attackersiege"] = JSON.stringify(GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard ? null : SiegeWeapons.exportWeapons());
        saveData["baseid"] = BASE._baseID;
        saveData["lastupdate"] = !(!isNaN(UPDATES._lastUpdateID)) ? 0 : UPDATES._lastUpdateID;
        saveData["academy"] = JSON.stringify(GLOBAL.player.exportAcademyData());
        saveData["baseseed"] = BASE._baseSeed;
        saveData["lockerdata"] = JSON.stringify(CREATURELOCKER._lockerData);
        saveData["basevalue"] = BASE._baseValue;
        saveData["points"] = BASE._basePoints;
        saveData["tutorialstage"] = !(!BASE.isInfernoMainYardOrOutpost) ? TUTORIAL._endstage : TUTORIAL._stage;
        saveData["basesaveid"] = BASE._lastSaveID;
        saveData["clienttime"] = GLOBAL.Timestamp();
        saveData["lootbonus"] = md5(GAME._instance.loaderInfo.bytes);
        saveData["monsterbaiter"] = JSON.stringify(MONSTERBAITER.Export());
        saveData["version"] = GLOBAL._version.Get();
        saveData["aiattacks"] = JSON.stringify(WMATTACK.Export());
        if (BASE._attacksModified) {
            saveData["attacks"] = JSON.stringify(BASE._currentAttacks);
            BASE._attacksModified = false;
        }
        saveData["effects"] = EFFECTS._effectsJSON;
        saveData["empirevalue"] = BASE.CalcBaseValue();
        saveData["inventory"] = STORE.InventoryExport();
        saveData["achieved"] = JSON.stringify(ACHIEVEMENTS.Report());
        let frontpageData: any = FrontPageHandler.export();
        if (frontpageData) {
            saveData["frontpage"] = JSON.stringify(frontpageData);
        }
        frontpageData = ReplayableEventHandler.exportData();
        if (frontpageData) {
            saveData["events"] = JSON.stringify(frontpageData);
        }
        let counter: int = 0;
        while (counter < GLOBAL.player.handlers.length) {
            handler = as3.vget(GLOBAL.player.handlers, counter);
            exportedData = handler.exportData();
            if (exportedData) {
                saveData[handler.name] = JSON.stringify(exportedData);
            }
            counter++;
        }
        frontpageData = BASE.getInfernoResourcesSaveData();
        if (frontpageData) {
            saveData["iresources"] = JSON.stringify(frontpageData);
        }
        if (MapRoomManager.instance.isInMapRoom2or3) {
            updateAutoBank = AutoBankManager.updateSaveData();
            if (updateAutoBank) {
                updateAutoBank = JSON.stringify(updateAutoBank);
            }
            if (MapRoomManager.instance.isInMapRoom2) {
                saveData["buildingresources"] = updateAutoBank;
            }
        }
        if (BASE._saveOver) {
            saveData["over"] = BASE._saveOver;
        }
        if (!BASE.isOutpost) {
            champion = BASE.getChampionSaveData();
            if (champion) {
                saveData.champion = JSON.stringify(champion);
            }
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) {
            BASE._saveProtect = 0;
            if (BASE.isMainYardOrInfernoMainYard) {
                if (BFOUNDATION.totalBuildingHP < BFOUNDATION.totalBuildingMaxHP * 0.65) {
                    BASE._saveProtect = 1;
                }
                if (BFOUNDATION.totalBuildingHP < BFOUNDATION.totalBuildingMaxHP * 0.45) {
                    BASE._saveProtect = 2;
                }
            }
            ATTACK.SaveDeltaLoot();
            GLOBAL.SaveAttackersDeltaResources();
            saveData.attackreport = ATTACK.LogRead();
            saveData.protect = BASE._saveProtect;
            saveData.attackid = BASE._attackID;
            saveData.lootreport = JSON.stringify(BASE.getLootReportSaveData());
            if (!MapRoomManager.instance.isInMapRoom2or3 || BASE.usesInfernoBackend) {
                saveData.attackcreatures = JSON.stringify(GLOBAL.attackingPlayer.exportMonsters());
            }
            saveData.attackloot = JSON.stringify(BASE.getAttackerDeltaResourcesSaveData());
            attackerChampion = BASE.getAttackingPlayerGuardianSaveData();
            if (attackerChampion) {
                saveData.attackerchampion = JSON.stringify(attackerChampion);
            }
        }
        if (MapRoomManager.instance.isInMapRoom2 && !GLOBAL.InfernoMode(GLOBAL._loadmode)) {
            saveData.monsterupdate = JSON.stringify(BASE.getMR2MonsterUpdateSaveData());
        } else if (MapRoomManager.instance.isInMapRoom3 && !BASE.isInfernoMainYardOrOutpost) {
            if (GLOBAL.attackingPlayer) {
                saveData.monsterupdate = JSON.stringify(GLOBAL.attackingPlayer.exportMonsters());
            }
        }
        if (GIFTS._giftsAccepted.length > 0) {
            saveData.gifts = JSON.stringify(GIFTS._giftsAccepted);
        }
        if (GIFTS._sentGiftsAccepted.length > 0) {
            saveData.sentgifts = JSON.stringify(GIFTS._sentGiftsAccepted);
        }
        if (GIFTS._sentInvitesAccepted.length > 0) {
            saveData.sentinvites = JSON.stringify(GIFTS._sentInvitesAccepted);
        }
        if (BASE._pendingPurchase.length > 0) {
            saveData.purchase = JSON.stringify(BASE.getPurchaseSaveData());
            BASE._pendingPurchase = [];
        }
        saveData.timeplayed = GLOBAL._timePlayed;
        if (GLOBAL.mode == "wmattack" || GLOBAL.mode == "iwmattack") {
            if (!MapRoomManager.instance.isInMapRoom2or3 || MapRoomManager.instance.isInMapRoom3 && BASE.isInfernoMainYardOrOutpost) {
                saveData.type = GLOBAL._loadmode == "iwmattack" || BASE.isInfernoMainYardOrOutpost && GLOBAL.mode == "wmattack" ? "iwm" : "wm";
                saveData.destroyed = BASE._percentDamaged >= 90 ? 1 : 0;
            } else {
                saveData.destroyed = BASE._percentDamaged >= 90 ? 1 : 0;
            }
        } else if (BASE.isOutpostOrInfernoOutpost && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            saveData.destroyed = BASE._percentDamaged >= 90 ? 1 : 0;
        } else if (BASE.usesInfernoBackend || GLOBAL._loadmode != GLOBAL.mode) {
            saveData.type = "inferno";
        }
        saveData.damage = BASE._percentDamaged;
        if (BASE._pendingPromo) {
            saveData.purchasecomplete = 1;
            BASE._pendingPromo = 0;
        }
        if (BASE._pendingFBPromo) {
            saveData.fbpromos = JSON.stringify(BASE._pendingFBPromoIDs);
            BASE._pendingFBPromo = 0;
            GLOBAL._displayedPromoNew = true;
            GLOBAL.StatSet("fbpromotimer", GLOBAL.Timestamp());
        }
        GLOBAL._timePlayed = 0;
        let saveDataList: any[] = BASE.getOrderedSaveVariablesFromObject(saveData);
        if (!GLOBAL._save) {
            BASE._saving = false;
            BASE._lastSaved = GLOBAL.Timestamp();
            return false;
        }
        if (BASE.usesInfernoBackend || BASE._infernoSaveLoad && saveData.type == "inferno" || BASE.isEventBaseId(BASE._baseID) && GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            new URLLoaderApi().load(GLOBAL._infBaseURL + "save", saveDataList, BASE.handleLoadSuccessful, BASE.handleLoadError);
        } else {
            new URLLoaderApi().load(GLOBAL._baseURL + "save", saveDataList, BASE.handleLoadSuccessful, BASE.handleLoadError);
        }
        if (BASE._saveOver) {
            BASE._blockSave = true;
        }
        return true;
    }

    private static handleLoadSuccessful(serverData: any): void {
        let yardType: int = 0;
        let resourceIndex: int = 0;
        let securedOutpost: MapRoom3OutpostSecured = null;
        if (serverData.error == 0) {
            GLOBAL.CleanAttackersDeltaResources();
            BASE.CleanDeltaResources();
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != "ibuild") {
                ATTACK.CleanLoot();
            }
            if (BASE._returnHome && serverData.over == 1) {
                if (BASE.usesInfernoBackend) {
                    BASE.LoadBase(null, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
                } else {
                    yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
                    BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, yardType);
                }
                return;
            }
            BASE._saveErrors = 0;
            BASE._lastSaved = GLOBAL.Timestamp();
            BASE._lastSaveID = serverData.basesaveid | 0;
            // (not while the Brimstone Pit is showing a result: the game shows the Shiny as it lands)
            if (!CASINO.holdsCredits()) {
                BASE._credits.Set(serverData.credits | 0);
                BASE._hpCredits = serverData.credits | 0;
                GLOBAL._credits.Set(serverData.credits | 0);
            }
            if (serverData.resources) {
                BASE.ioNoteServerResources("save", serverData.resources);
                if (BASE._saveCounterA == BASE._saveCounterB) {
                    resourceIndex = 1;
                    while (resourceIndex < 5) {
                        if (serverData.resources["r" + resourceIndex]) {
                            BASE._resources["r" + resourceIndex].Set(serverData.resources["r" + resourceIndex]);
                            BASE._hpResources["r" + resourceIndex] = BASE._resources["r" + resourceIndex].Get();
                            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
                                GLOBAL._resources["r" + resourceIndex].Set(serverData.resources["r" + resourceIndex]);
                                GLOBAL._hpResources["r" + resourceIndex] = GLOBAL._resources["r" + resourceIndex].Get();
                            }
                        }
                        resourceIndex++;
                    }
                }
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != "ibuild") {
                    ATTACK.CleanLoot();
                    GLOBAL.CleanAttackersDeltaResources();
                }
                BASE.CleanDeltaResources();
            }
            BASE._isProtected = serverData["protected"] | 0;
            BASE._isFan = serverData.fan | 0;
            BASE._isBookmarked = serverData.bookmarked | 0;
            BASE._installsGenerated = serverData.installsgenerated | 0;
            if (serverData.fan) {
                QUESTS._global.bonus_fan = 1;
            }
            if (serverData.bookmarked) {
                QUESTS._global.bonus_bookmark = 1;
            }
            if (Boolean(serverData.updates) && serverData.updates.length > 0) {
                UPDATES.Process(as3.cast(serverData.updates, Array));
            }
            if (BASE._loadBase.length > 0) {
                BASE.LoadBaseB();
            }
            if (ATTACK.waitingForSaveToComplete) {
                ATTACK.End();
            }
            if (serverData.takeover) {
                securedOutpost = new MapRoom3OutpostSecured(BASE.yardType, serverData.takeover);
                POPUPS.Push(securedOutpost);
            }
        } else {
            LOGGER.Log("err", "Base.Save: " + JSON.stringify(serverData));
            GLOBAL.ErrorMessage("BASE.SaveB 2: " + serverData.error);
        }
        BASE._saving = false;
    }

    private static handleLoadError(param1: IOErrorEvent): void {
        ++BASE._saveErrors;
        --BASE._saveCounterB;
        BASE._saving = false;
        if (BASE._saveErrors >= 5) {
            LOGGER.Log("err", "Base.Save HTTP");
            GLOBAL.ErrorMessage("BASE.Save HTTP");
        }
    }

    private static guardianFlung(): boolean {
        let _loc1_: string = null;
        for (_loc1_ in CREEPS._flungGuardian) {
            if (CREEPS._flungGuardian[_loc1_]) {
                return true;
            }
        }
        return false;
    }

    public static Page(): void {
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        handleLoadSuccessful = (serverData: any): void => {
            let resourceIndex: int = 0;
            let resourceDelta: int = 0;
            let _loc4_: string = null;
            let _loc5_: any = null;
            let _loc6_: int = 0;
            let _loc7_: any = null;
            let _loc8_: int = 0;
            BASE._lastPaged = (Math.random() * 5) | 0;
            if (serverData.error == 0) {
                BASE._paging = false;
                GLOBAL.SetFlags(serverData.flags);
                GLOBAL._unreadMessages = !(!serverData.unreadmessages) ? serverData.unreadmessages | 0 : 0;
                BASE._pageErrors = 0;
                if (!CASINO.holdsCredits()) {
                    BASE._credits.Set(serverData.credits | 0);
                    BASE._hpCredits = serverData.credits | 0;
                    GLOBAL._credits.Set(serverData.credits | 0);
                }
                BASE._isProtected = serverData["protected"] | 0;
                BASE._isFan = serverData.fan | 0;
                BASE._isBookmarked = serverData.bookmarked | 0;
                BASE._installsGenerated = serverData.installsgenerated | 0;
                if (serverData.resources) {
                    BASE.ioNoteServerResources("update", serverData.resources);
                }
                if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && serverData.resources && BASE._saveCounterA == BASE._saveCounterB) {
                    if (serverData.resources.r1 != BASE._resources.r1.Get() || serverData.resources.r2 != BASE._resources.r2.Get() || serverData.resources.r3 != BASE._resources.r3.Get() || serverData.resources.r4 != BASE._resources.r4.Get()) {
                    }
                    resourceIndex = 1;
                    while (resourceIndex < 5) {
                        if (serverData.resources["r" + resourceIndex]) {
                            resourceDelta = 0;
                            if (BASE._deltaResources && BASE._deltaResources["r" + resourceIndex] && BASE._deltaResources["r" + resourceIndex].Get() > 0) {
                                resourceDelta = BASE._deltaResources["r" + resourceIndex].Get() | 0;
                            }
                            BASE._resources["r" + resourceIndex].Set(serverData.resources["r" + resourceIndex] + resourceDelta);
                            BASE._hpResources["r" + resourceIndex] = BASE._resources["r" + resourceIndex].Get();
                            GLOBAL._resources["r" + resourceIndex].Set(serverData.resources["r" + resourceIndex] + resourceDelta);
                            GLOBAL._hpResources["r" + resourceIndex] = GLOBAL._resources["r" + resourceIndex].Get();
                        }
                        resourceIndex++;
                    }
                }
                if (serverData.fan) {
                    QUESTS._global.bonus_fan = 1;
                }
                if (serverData.bookmarked) {
                    QUESTS._global.bonus_bookmark = 1;
                }
                if (serverData.giftsentcount) {
                    QUESTS._global.bonus_gifts = serverData.giftsentcount;
                }
                if (Boolean(serverData.updates) && serverData.updates.length > 0) {
                    UPDATES.Process(as3.cast(serverData.updates, Array));
                }
                if (serverData.buildingresources) {
                    BASE._rawGIP = serverData.buildingresources;
                    BASE._processedGIP = {};
                    BASE._GIP = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
                    if (BASE._rawGIP) {
                        if (BASE._rawGIP["b" + GLOBAL._homeBaseID]) {
                            delete BASE._rawGIP["b" + GLOBAL._homeBaseID];
                        }
                        if (BASE._rawGIP["t"]) {
                            BASE._lastProcessedGIP = BASE._rawGIP["t"] | 0;
                            delete BASE._rawGIP["t"];
                        }
                        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                            for (_loc4_ in BASE._rawGIP) {
                                _loc5_ = BASE._rawGIP[_loc4_];
                                if (_loc4_ == "t") {
                                    BASE._lastProcessedGIP = BASE._rawGIP[_loc4_] | 0;
                                } else {
                                    if (as3.is(_loc5_, String)) {
                                        break;
                                    }
                                    if (_loc5_["r1"] != undefined) {
                                        BASE._processedGIP[_loc4_] = { "r1": new SecNum(Number(_loc5_["r1"])), "r2": new SecNum(Number(_loc5_["r2"])), "r3": new SecNum(Number(_loc5_["r3"])), "r4": new SecNum(Number(_loc5_["r4"])) };
                                    } else {
                                        _loc6_ = BASE._rawGIP[_loc4_]["height"] | 0;
                                        if (_loc6_) {
                                            delete _loc5_["height"];
                                        } else {
                                            _loc6_ = 100;
                                        }
                                        BASE._processedGIP[_loc4_] = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
                                        for (_loc7_ of as3.values(_loc5_)) {
                                            if (_loc7_.t >= 1 && _loc7_.t <= 4) {
                                                if (_loc7_.l) {
                                                    _loc8_ = GLOBAL.outpostPropsTable[_loc7_.t - 1].produce[_loc7_.l - 1] | 0;
                                                } else {
                                                    _loc8_ = GLOBAL.outpostPropsTable[_loc7_.t - 1].produce[0] | 0;
                                                }
                                                _loc8_ = Math.max((_loc8_ * GLOBAL._averageAltitude.Get() / _loc6_) | 0, 1) | 0;
                                                BASE._processedGIP[_loc4_]["r" + _loc7_.t].Add(_loc8_);
                                            }
                                        }
                                        BASE._rawGIP[_loc4_] = { "r1": BASE._processedGIP[_loc4_].r1.Get(), "r2": BASE._processedGIP[_loc4_].r2.Get(), "r3": BASE._processedGIP[_loc4_].r3.Get(), "r4": BASE._processedGIP[_loc4_].r4.Get() };
                                    }
                                    BASE._GIP["r1"].Add(BASE._processedGIP[_loc4_]["r1"].Get());
                                    BASE._GIP["r2"].Add(BASE._processedGIP[_loc4_]["r2"].Get());
                                    BASE._GIP["r3"].Add(BASE._processedGIP[_loc4_]["r3"].Get());
                                    BASE._GIP["r4"].Add(BASE._processedGIP[_loc4_]["r4"].Get());
                                }
                            }
                            if (!BASE._rawGIP["t"]) {
                                BASE._lastProcessedGIP = BASE._lastProcessed;
                            }
                            if (GLOBAL.Timestamp() - BASE._lastProcessedGIP > 3600 * 24) {
                                BASE._lastProcessedGIP = (GLOBAL.Timestamp() - 3600 * 24) | 0;
                            }
                            BASE._processedGIP["t"] = BASE._lastProcessedGIP;
                        }
                    }
                }
                if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    if (serverData.alliancedata) {
                        BASE._allianceID = serverData.alliancedata.alliance_id | 0;
                        if (BASE._userID == LOGIN._playerID) {
                            ALLIANCES._allianceID = serverData.alliancedata.alliance_id | 0;
                            ALLIANCES._myAlliance = ALLIANCES.SetAlliance(serverData.alliancedata);
                            ALLIANCES._isLeader = Boolean(serverData.alliancedata.is_leader);
                        }
                    } else if (BASE._userID == LOGIN._playerID && (ALLIANCES._allianceID || ALLIANCES._myAlliance)) {
                        ALLIANCES.Clear();
                        POWERUPS.Validate();
                    }
                }
                if (serverData.powerups) {
                    POWERUPS.Setup(as3.cast(serverData.powerups, Array), null, false);
                }
                if (serverData.attpowerups) {
                    POWERUPS.Setup(null, as3.cast(serverData.attpowerups, Array), false);
                }
                QUESTS.Check();
            } else {
                LOGGER.Log("err", "Base.Page: " + JSON.stringify(serverData));
                GLOBAL.ErrorMessage("Base.Page: " + serverData.error);
            }
        };
        handleLoadError = (param1: IOErrorEvent): void => {
            ++BASE._pageErrors;
            BASE._paging = false;
            Console.warning("BASE.Page ERROR", Boolean(BASE._pageErrors));
            BASE._lastPaged = (10 + ((Math.random() * 5) | 0)) | 0;
            if (BASE._pageErrors >= 6) {
                LOGGER.Log("err", "Base.Page HTTP");
                GLOBAL.ErrorMessage("BASE.Page HTTP");
            }
        };
        let t: int = getTimer();
        let tmpMode: string = GLOBAL._loadmode;
        switch (tmpMode) {
            case GLOBAL.e_BASE_MODE.WMATTACK:
                tmpMode = GLOBAL.e_BASE_MODE.ATTACK;
                break;
            case GLOBAL.e_BASE_MODE.WMVIEW:
                tmpMode = GLOBAL.e_BASE_MODE.VIEW;
                break;
            case GLOBAL.e_BASE_MODE.IWMATTACK:
                tmpMode = GLOBAL.e_BASE_MODE.IATTACK;
                break;
            case GLOBAL.e_BASE_MODE.IWMVIEW:
                tmpMode = GLOBAL.e_BASE_MODE.IVIEW;
        }
        BASE._paging = true;
        let mapVersion: int = MapRoomManager.instance.mapRoomVersion;
        if (BASE.usesInfernoBackend || BASE.isEventBaseId(BASE._baseID) && GLOBAL.mode == "wmattack") {
            new URLLoaderApi().load(GLOBAL._infBaseURL + "updatesaved", [["baseid", BASE._loadedBaseID], ["version", GLOBAL._version.Get()], ["lastupdate", UPDATES._lastUpdateID], ["type", tmpMode], ["mapversion", mapVersion]], handleLoadSuccessful, handleLoadError);
        } else {
            new URLLoaderApi().load(GLOBAL._baseURL + "updatesaved", [["baseid", BASE._loadedBaseID], ["version", GLOBAL._version.Get()], ["lastupdate", UPDATES._lastUpdateID], ["type", tmpMode], ["mapversion", mapVersion]], handleLoadSuccessful, handleLoadError);
        }
    }

    /** Inferno-only: the yard loaded is an outpost in the underworld (its baseid ends in its x and y: 500-509). */
    public static ioInUnderworldOutpost(): boolean {
        if (!BASE.isOutpost || !BASE._loadedBaseID) {
            return false;
        }
        let cellX: int = (Math.floor(BASE._loadedBaseID / 1000) % 1000) | 0;
        let cellY: int = (BASE._loadedBaseID % 1000) | 0;
        return IoUnderworld.isUnder(cellX, cellY);
    }

    public static CanBuild(param1: int, param2: boolean = false): any {
        let _loc7_: string = null;
        let _loc8_: Vector<any> = null;
        let _loc9_: any[] = null;
        let _loc10_: int = 0;
        let _loc11_: boolean = false;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: BFOUNDATION = null;
        let _loc17_: any[] = null;
        let _loc18_: int = 0;
        let _loc19_: int = 0;
        let _loc20_: int = 0;
        let _loc21_: int = 0;
        let _loc22_: int = 0;
        let _loc23_: int = 0;
        let _loc24_: int = 0;
        let _loc25_: int = 0;
        let _loc26_: boolean = false;
        let _loc27_: any = null;
        let _loc28_: any[] = null;
        let _loc3_: any = {};
        let _loc4_: boolean = false;
        let _loc5_: string = "";
        let _loc6_: int = 0;
        // Admin test mode (and a wild tribe / Moloch design): any building, any number of it, whatever the
        // Town Hall level. (An outpost kit's design keeps an outpost's limits.)
        if (GLOBAL._aiDesignMode || GLOBAL.ioNoLimits()) {
            return { "error": false };
        }
        // Inferno-only: an underworld outpost has no Flinger (com/monsters/maproom_advanced/IoUnderworld)
        if (param1 == 5 && GLOBAL.INFERNO_ONLY && BASE.ioInUnderworldOutpost()) {
            return { "error": true, "errorMessage": "Outposts in the Depths of Hell have no Flinger: they always reach the cells next to them." };
        }
        for (_loc7_ in GLOBAL._buildingProps) {
            if (GLOBAL._buildingProps[_loc7_].id == param1) {
                if (GLOBAL._buildingProps[_loc7_].rewarded) {
                    return { "error": false };
                }
                _loc3_ = GLOBAL._buildingProps[_loc7_];
                break;
            }
        }
        if (TUTORIAL._stage < 200 && _loc3_.tutstage > TUTORIAL._stage) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_builderr_locked");
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && (_loc3_.type == "taunt" || _loc3_.type == "gift")) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_builderr_ownyard1");
        } else if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && _loc3_.type != "taunt" && _loc3_.type != "gift") {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_builderr_ownyard2");
        } else {
            _loc9_ = as3.cast(_loc3_.quantity, Array);
            _loc10_ = 0;
            _loc11_ = BASE.isInfernoMainYardOrOutpost;
            if (GLOBAL.townHall) {
                _loc10_ = GLOBAL.townHall._lvl.Get() | 0;
                if (Boolean(_loc3_.costs[0].re[0]) && _loc3_.costs[0].re[0][0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                    if (!MAPROOM_DESCENT.DescentPassed) {
                        _loc4_ = true;
                        _loc5_ = KEYS.Get("inferno_building_requirement");
                        return { "error": _loc4_, "errorMessage": _loc5_ };
                    }
                    _loc10_ = GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL);
                    _loc11_ = true;
                    if (!_loc10_) {
                        _loc4_ = true;
                        _loc5_ = KEYS.Get("base_builderr_noinfstate", { "v1": _loc10_ });
                        return { "error": _loc4_, "errorMessage": _loc5_ };
                    }
                }
            }
            _loc12_ = _loc10_ < _loc9_.length ? _loc10_ : (_loc9_.length - 1) | 0;
            _loc13_ = _loc9_[_loc12_] | 0;
            if (_loc3_.type == "decoration") {
                _loc14_ = _loc13_ = _loc9_[0] | 0;
            } else {
                _loc14_ = _loc13_;
                if (_loc9_.length > _loc10_) {
                    _loc14_ = _loc9_[_loc10_ + 1] | 0;
                }
            }
            if (_loc13_ == 0) {
                _loc15_ = 0;
                while (_loc15_ < _loc9_.length) {
                    if (_loc9_[_loc15_] > 0) {
                        _loc4_ = true;
                        _loc5_ = KEYS.Get(_loc11_ ? "base_builderr_uhlevelreqd" : "base_builderr_thlevelreqd", { "v1": _loc15_ });
                        break;
                    }
                    _loc15_++;
                }
            } else if (_loc3_.type != "decoration" || _loc3_.type == "decoration" && _loc3_.quantity[0] != 0) {
                _loc6_ = 0;
                _loc8_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc16_ of (_loc8_ ?? [])) {
                    if (_loc16_._type == param1 && GLOBAL._newBuilding !== _loc16_) {
                        _loc6_++;
                    }
                }
                if (_loc6_ >= _loc13_) {
                    _loc4_ = true;
                    if (_loc14_ > _loc13_) {
                        _loc5_ = KEYS.Get(BASE.isInfernoBuilding(param1 >>> 0) || BASE.isInfernoMainYardOrOutpost ? "base_builderr_uuh" : "base_builderr_uth");
                    } else {
                        _loc5_ = KEYS.Get("base_builderr_onlybuildx", { "v1": _loc13_ });
                    }
                }
            }
        }
        if (!_loc4_) {
            _loc17_ = as3.cast(_loc3_.costs[0].re, Array);
            _loc18_ = 0;
            _loc15_ = 0;
            while (_loc15_ < _loc17_.length) {
                _loc6_ = 0;
                if (_loc17_[_loc15_][0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                    if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= _loc17_[_loc15_][2]) {
                        _loc6_++;
                    }
                } else {
                    _loc8_ ||= InstanceManager.getInstancesByClass(BFOUNDATION);
                    for (_loc16_ of (_loc8_ ?? [])) {
                        if (_loc16_._type == _loc17_[_loc15_][0] && _loc16_._lvl.Get() >= _loc17_[_loc15_][2]) {
                            _loc6_++;
                        }
                    }
                }
                if (_loc6_ >= _loc17_[_loc15_][1]) {
                    _loc18_++;
                }
                _loc15_++;
            }
            if (_loc18_ < _loc17_.length) {
                _loc4_ = true;
                _loc5_ = KEYS.Get("requirements_notmet");
            }
        }
        if (!_loc4_ && !param2) {
            _loc19_ = _loc3_.costs[0].r1.Get() | 0;
            _loc20_ = _loc3_.costs[0].r2.Get() | 0;
            _loc21_ = _loc3_.costs[0].r3.Get() | 0;
            _loc22_ = _loc3_.costs[0].r4.Get() | 0;
            _loc23_ = 0;
            _loc25_ = 0;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
                _loc26_ = Boolean(BASE.isInfernoBuilding(param1 >>> 0));
                _loc27_ = _loc26_ ? BASE._iresources : BASE._resources;
                if (_loc19_ > _loc27_.r1.Get()) {
                    _loc24_ = 1;
                    _loc25_ = (_loc19_ - _loc27_.r1.Get()) | 0;
                }
                if (_loc20_ > _loc27_.r2.Get()) {
                    _loc24_ = 2;
                    _loc25_ = (_loc20_ - _loc27_.r2.Get()) | 0;
                }
                if (_loc21_ > _loc27_.r3.Get()) {
                    _loc24_ = 3;
                    _loc25_ = (_loc21_ - _loc27_.r3.Get()) | 0;
                }
                if (_loc22_ > _loc27_.r4.Get()) {
                    _loc24_ = 4;
                    _loc25_ = (_loc22_ - _loc27_.r4.Get()) | 0;
                }
                if (_loc24_ > 0) {
                    _loc4_ = true;
                    _loc28_ = _loc26_ ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
                    _loc5_ = "You need " + GLOBAL.FormatNumber(_loc25_) + " more " + KEYS.Get(as3.str(_loc28_[_loc24_ - 1]));
                }
            }
        }
        return { "error": _loc4_, "errorMessage": _loc5_, "needResource": _loc24_ };
    }

    /* Inferno-only: why this building can't be upgraded now, or null: the Strongbox while it unlocks a monster,
     * an Academy while it trains one (each Academy its own). */
    public static ioBusyForUpgrade(param1: BFOUNDATION): string {
        let unlocking: string = null;
        if (param1._type == 8 && param1 == GLOBAL._bLocker) {
            unlocking = CREATURELOCKER.ioUnlockingID();
            if (unlocking != null && CREATURELOCKER._creatures[unlocking]) {
                return KEYS.Get("cloc_err_cantupgrade", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[unlocking].name)) });
            }
        }
        if (param1._type == ACADEMY.ID && ACADEMY.ioAcademyBusy(param1)) {
            return KEYS.Get("acad_err_cantupgrade");
        }
        return null;
    }

    public static CanUpgrade(param1: BFOUNDATION): any {
        let _loc7_: string = null;
        let _loc8_: any[] = null;
        let _loc9_: any[] = null;
        let _loc10_: any[] = null;
        let _loc11_: boolean = false;
        let _loc12_: int = 0;
        let _loc13_: string = null;
        let _loc14_: Vector<any> = null;
        let _loc15_: BFOUNDATION = null;
        let _loc16_: any[] = null;
        let _loc17_: int = 0;
        let _loc18_: int = 0;
        let _loc19_: any = null;
        if (param1._class == "mushroom") {
            return { "error": false };
        }
        let _loc2_: any = {};
        let _loc3_: any = { "r1": 0, "r2": 0, "r3": 0, "r4": 0, "time": new SecNum(0) };
        let _loc4_: boolean = false;
        let _loc5_: string = "";
        let _loc6_: int = param1._lvl.Get() | 0;
        for (_loc7_ in GLOBAL._buildingProps) {
            if (GLOBAL._buildingProps[_loc7_].id == param1._type) {
                _loc2_ = GLOBAL._buildingProps[_loc7_];
                break;
            }
        }
        _loc8_ = as3.cast(_loc2_.costs, Array);
        if (!GLOBAL.townHall) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_uperr_th");
        } else if (_loc6_ >= _loc8_.length) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_uperr_fully");
        } else if (param1._countdownBuild.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_uperr_stillbuilding");
        } else if (param1._countdownUpgrade.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_uperr_alreadyupgrading");
        } else if (param1._countdownFortify.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_uperr_stillfortifying");
        } else if (GLOBAL.INFERNO_ONLY && BASE.ioBusyForUpgrade(param1)) {
            // Inferno-only: here rather than in BUILDING8/BUILDING26.Upgrade only, so the instant upgrade (shiny)
            // and an upgrade that waited for a worker are refused too
            _loc4_ = true;
            _loc5_ = BASE.ioBusyForUpgrade(param1);
        } else {
            _loc9_ = [];
            for (_loc10_ of as3.values((GLOBAL.ioFreeBuild() ? [] : _loc8_[_loc6_].re))) {
                _loc12_ = 0;
                if (_loc10_[0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                    _loc13_ = "#bi_townhall#";
                    if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= _loc10_[2]) {
                        _loc12_++;
                    }
                } else {
                    _loc13_ = String(GLOBAL._buildingProps[_loc10_[0] - 1].name);
                    _loc14_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                    for (_loc15_ of (_loc14_ ?? [])) {
                        if (_loc15_._type == _loc10_[0] && _loc15_._lvl.Get() >= _loc10_[2]) {
                            _loc12_++;
                        }
                    }
                }
                if (_loc12_ < _loc10_[1]) {
                    if (_loc10_[1] == 1) {
                        if (_loc10_[2] == 1) {
                            _loc9_.push([0, KEYS.Get("base_uperr_bdgpart1", { "v1": KEYS.Get(_loc13_) })]);
                        } else {
                            _loc9_.push([0, KEYS.Get("base_uperr_bdgpart2", { "v1": _loc10_[2], "v2": KEYS.Get(_loc13_) })]);
                        }
                    } else if (_loc10_[2] == 1) {
                        _loc9_.push([0, KEYS.Get("base_uperr_bdgpart3", { "v1": KEYS.Get(_loc13_), "v2": _loc10_[1] })]);
                    } else {
                        _loc9_.push([0, KEYS.Get("base_uperr_bdgpart4", { "v1": _loc10_[2], "v2": KEYS.Get(_loc13_), "v3": _loc10_[1] })]);
                    }
                }
            }
            if (_loc9_.length > 0) {
                _loc4_ = true;
                _loc5_ = KEYS.Get("base_uperr_buildings", { "v1": GLOBAL.Array2StringB(_loc9_) });
            }
            _loc11_ = Boolean(BASE.isInfernoBuilding(param1._type >>> 0));
            if (_loc17_ > 0) {
                _loc4_ = true;
                _loc16_ = _loc11_ ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
                _loc5_ = "You need " + GLOBAL.FormatNumber(_loc18_) + " more " + KEYS.Get(as3.str(_loc16_[_loc17_ - 1]));
            }
            if (!_loc4_) {
                if (_loc6_ < _loc8_.length) {
                    _loc3_ = _loc8_[_loc6_];
                    if (!_loc4_) {
                        _loc18_ = 0;
                        _loc19_ = _loc11_ ? BASE._iresources : BASE._resources;
                        if (_loc3_.r1.Get() > _loc19_.r1.Get()) {
                            _loc17_ = 1;
                            _loc18_ = (_loc3_.r1.Get() - _loc19_.r1.Get()) | 0;
                        }
                        if (_loc3_.r2.Get() > _loc19_.r2.Get()) {
                            _loc17_ = 2;
                            _loc18_ = (_loc3_.r2.Get() - _loc19_.r2.Get()) | 0;
                        }
                        if (_loc3_.r3.Get() > _loc19_.r3.Get()) {
                            _loc17_ = 3;
                            _loc18_ = (_loc3_.r3.Get() - _loc19_.r3.Get()) | 0;
                        }
                        if (_loc3_.r4.Get() > _loc19_.r4.Get()) {
                            _loc17_ = 4;
                            _loc18_ = (_loc3_.r4.Get() - _loc19_.r4.Get()) | 0;
                        }
                        if (_loc17_ > 0) {
                            _loc4_ = true;
                            _loc5_ = KEYS.Get("base_uperr_resources", { "v1": GLOBAL.FormatNumber(_loc18_), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[_loc17_ - 1])) });
                        }
                    }
                }
            }
        }
        return { "error": _loc4_, "errorMessage": _loc5_, "costs": _loc3_, "needResource": _loc17_ };
    }

    public static CanFortify(param1: BFOUNDATION): any {
        let _loc2_: any = null;
        let _loc3_: any = null;
        let _loc4_: boolean = false;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: any[] = null;
        let _loc9_: any[] = null;
        let _loc10_: any[] = null;
        let _loc11_: int = 0;
        let _loc12_: Vector<any> = null;
        let _loc13_: BFOUNDATION = null;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        if (param1._class == "mushroom") {
            return { "error": false };
        }
        _loc2_ = {};
        _loc3_ = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(0) };
        _loc4_ = false;
        _loc5_ = "";
        _loc6_ = param1._fortification.Get() | 0;
        for (_loc7_ in GLOBAL._buildingProps) {
            if (GLOBAL._buildingProps[_loc7_].id == param1._type) {
                _loc2_ = GLOBAL._buildingProps[_loc7_];
                break;
            }
        }
        if (!_loc2_.can_fortify) {
            return { "error": true };
        }
        _loc8_ = as3.cast(_loc2_.fortify_costs, Array);
        if (!GLOBAL.townHall) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_forterr_th");
        } else if (_loc6_ >= _loc8_.length) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_forterr_fully");
        } else if (param1._countdownBuild.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_forterr_stillbuilding");
        } else if (param1._countdownUpgrade.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_forterr_stillupgrading");
        } else if (param1._countdownFortify.Get()) {
            _loc4_ = true;
            _loc5_ = KEYS.Get("base_forterr_stillfortifying");
        } else {
            _loc9_ = [];
            for (_loc10_ of as3.values((GLOBAL.ioFreeBuild() ? [] : _loc8_[_loc6_].re))) {
                _loc11_ = 0;
                _loc12_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc13_ of (_loc12_ ?? [])) {
                    if (_loc13_._type == _loc10_[0] && _loc13_._lvl.Get() >= _loc10_[2]) {
                        _loc11_++;
                    }
                }
                if (_loc11_ < _loc10_[1]) {
                    if (_loc10_[1] == 1) {
                        if (_loc10_[2] == 1) {
                            _loc9_.push([0, KEYS.Get("base_forterr_bdgpart1", { "v1": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc10_[0] - 1].name)) })]);
                        } else {
                            _loc9_.push([0, KEYS.Get("base_forterr_bdgpart2", { "v1": _loc10_[2], "v2": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc10_[0] - 1].name)) })]);
                        }
                    } else if (_loc10_[2] == 1) {
                        _loc9_.push([0, KEYS.Get("base_forterr_bdgpart3", { "v1": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc10_[0] - 1].name)), "v2": _loc10_[1] })]);
                    } else {
                        _loc9_.push([0, KEYS.Get("base_forterr_bdgpart4", { "v1": _loc10_[2], "v2": KEYS.Get(as3.str(GLOBAL._buildingProps[_loc10_[0] - 1].name)), "v3": _loc10_[1] })]);
                    }
                }
            }
            if (_loc9_.length > 0) {
                _loc4_ = true;
                _loc5_ = KEYS.Get("base_forterr_buildings", { "v1": GLOBAL.Array2StringB(_loc9_) });
            }
            if (!_loc4_) {
                if (_loc6_ < _loc8_.length) {
                    _loc3_ = _loc8_[_loc6_];
                    if (!_loc4_) {
                        _loc15_ = 0;
                        if (_loc3_.r1.Get() > BASE._resources.r1.Get()) {
                            _loc14_ = 1;
                            _loc15_ = (_loc3_.r1.Get() - BASE._resources.r1.Get()) | 0;
                        }
                        if (_loc3_.r2.Get() > BASE._resources.r2.Get()) {
                            _loc14_ = 2;
                            _loc15_ = (_loc3_.r2.Get() - BASE._resources.r2.Get()) | 0;
                        }
                        if (_loc3_.r3.Get() > BASE._resources.r3.Get()) {
                            _loc14_ = 3;
                            _loc15_ = (_loc3_.r3.Get() - BASE._resources.r3.Get()) | 0;
                        }
                        if (_loc3_.r4.Get() > BASE._resources.r4.Get()) {
                            _loc14_ = 4;
                            _loc15_ = (_loc3_.r4.Get() - BASE._resources.r4.Get()) | 0;
                        }
                        if (_loc14_ > 0) {
                            _loc4_ = true;
                            _loc5_ = KEYS.Get("base_forterr_resources", { "v1": GLOBAL.FormatNumber(_loc15_), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[_loc14_ - 1])) });
                        }
                    }
                }
            }
        }
        return { "error": _loc4_, "errorMessage": _loc5_, "costs": _loc3_, "needResource": _loc14_ };
    }

    public static is711Valid(): boolean {
        let _loc1_: Date = null;
        _loc1_ = new Date();
        return _loc1_.getUTCFullYear() == 2011;
    }

    public static addBuilding(param1: MouseEvent): BFOUNDATION {
        let _loc2_: int = 0;
        _loc2_ = param1.target.name.split("b")[1] | 0;
        return BASE.addBuildingB(_loc2_);
    }

    public static addBuildingB(param1: int, param2: boolean = false): BFOUNDATION {
        let _loc3_: any = false;
        let _loc4_: any = null;
        BASE.BuildingDeselect();
        _loc3_ = GLOBAL._buildingProps[param1 - 1].costs[0].time.Get() == 0;
        if (!_loc3_) {
            _loc3_ = QUEUE.CanDo().error == false;
        }
        if (InventoryManager.buildingStorageCount(param1) > 0) {
            _loc3_ = true;
        }
        if (_loc3_) {
            _loc4_ = BASE.CanBuild(param1, param2);
            if (!_loc4_.error) {
                BASE.BuildingDeselect();
                BASE.ShowFootprints();
                GLOBAL._newBuilding = BASE.addBuildingC(param1);
                if (GLOBAL._newBuilding) {
                    GLOBAL._newBuilding._mc.alpha = 0.5;
                    GLOBAL._newBuilding.FollowMouse();
                } else {
                    BASE.BuildingDeselect();
                }
                return GLOBAL._newBuilding;
            }
            GLOBAL.Message(as3.str(_loc4_.errorMessage));
        } else {
            POPUPS.DisplayWorker(0, param1);
        }
        return null;
    }

    private static ConvertToInfernoBuilding(param1: int): int {
        switch (param1) {
            case 15:
                param1 = 128;
                break;
            case 23:
                param1 = 129;
                break;
            case 25:
                param1 = 132;
        }
        return param1;
    }

    public static addBuildingC(buildingNum: int): BFOUNDATION {
        let buildingFoundation: BFOUNDATION = null;
        let buildingProperties: any = null;
        buildingProperties = GLOBAL._buildingProps[buildingNum - 1] || {};
        if (buildingProperties.type == "decoration") {
            if (BTOTEM.IsTotem(buildingNum) || BTOTEM.IsTotem2(buildingNum)) {
                buildingFoundation = new BTOTEM(buildingNum);
            } else {
                buildingFoundation = new BDECORATION(buildingNum);
            }
            return buildingFoundation;
        }
        if (buildingProperties.cls) {
            return as3.cast(new ((as3.as(buildingProperties.cls, Class)))(), BFOUNDATION);
        }
        if (buildingNum == 1) {
            buildingFoundation = new BUILDING1();
        } else if (buildingNum == 2) {
            buildingFoundation = new BUILDING2();
        } else if (buildingNum == 3) {
            buildingFoundation = new BUILDING3();
        } else if (buildingNum == 4) {
            buildingFoundation = new BUILDING4();
        } else if (buildingNum == 5) {
            buildingFoundation = new BUILDING5();
        } else if (buildingNum == 6) {
            buildingFoundation = new BUILDING6();
        } else if (buildingNum == 7) {
            buildingFoundation = new BUILDING7();
        } else if (buildingNum == 8) {
            buildingFoundation = new BUILDING8();
        } else if (buildingNum == 9) {
            buildingFoundation = new BUILDING9();
        } else if (buildingNum == 10) {
            buildingFoundation = new BUILDING10();
        } else if (buildingNum == 11) {
            buildingFoundation = new BUILDING11();
        } else if (buildingNum == 12) {
            buildingFoundation = new BUILDING12();
        } else if (buildingNum == 13) {
            buildingFoundation = new BUILDING13();
        } else if (buildingNum == 14) {
            buildingFoundation = new BUILDING14();
        } else if (buildingNum == 15) {
            buildingFoundation = new BUILDING15();
        } else if (buildingNum == 16) {
            buildingFoundation = new BUILDING16();
        } else if (buildingNum == 17) {
            buildingFoundation = new BUILDING17();
        } else if (buildingNum == 18) {
            buildingFoundation = new BUILDING18();
        } else if (buildingNum == 19) {
            buildingFoundation = new BUILDING19();
        } else if (buildingNum == 20) {
            buildingFoundation = new BUILDING20();
        } else if (buildingNum == 21) {
            buildingFoundation = new BUILDING21();
        } else if (buildingNum == 22) {
            buildingFoundation = new BUILDING22();
        } else if (buildingNum == 23) {
            buildingFoundation = new BUILDING23();
        } else if (buildingNum == 24) {
            buildingFoundation = new BUILDING24();
        } else if (buildingNum == 25) {
            buildingFoundation = new BUILDING25();
        } else if (buildingNum == 26) {
            buildingFoundation = new BUILDING26();
        } else if (buildingNum == 27) {
            buildingFoundation = new BUILDING27();
        } else if (buildingNum == 51) {
            buildingFoundation = new BUILDING51();
        } else if (buildingNum == 52) {
            buildingFoundation = new BUILDING52();
        } else if (buildingNum == 112) {
            buildingFoundation = new BUILDING112();
        } else if (buildingNum == 113) {
            buildingFoundation = new BUILDING113();
        } else if (buildingNum == 114) {
            buildingFoundation = new CHAMPIONCAGE();
        } else if (buildingNum == 115) {
            buildingFoundation = new BUILDING115();
        } else if (buildingNum == 116) {
            buildingFoundation = new MONSTERLAB();
        } else if (buildingNum == 117) {
            buildingFoundation = new BUILDING117();
        } else if (buildingNum == 118) {
            buildingFoundation = new BUILDING118();
        } else if (buildingNum == 119) {
            buildingFoundation = new CHAMPIONCHAMBER();
        } else if (buildingNum == 128) {
            buildingFoundation = new HOUSINGBUNKER();
        } else if (buildingNum == 127) {
            buildingFoundation = new INFERNOPORTAL();
        } else if (buildingNum == 129) {
            buildingFoundation = new INFERNOQUAKETOWER();
        } else if (buildingNum == 130) {
            buildingFoundation = new INFERNO_CANNON_TOWER();
        } else if (buildingNum == 132) {
            buildingFoundation = new INFERNO_MAGMA_TOWER();
        }
        return as3.cast(!(!buildingProperties.cls) ? new ((as3.as(buildingProperties.cls, Class)))() : buildingFoundation, BFOUNDATION);
    }

    public static ShowFootprints(): void {
        let _loc1_: BFOUNDATION = null;
        let _loc2_: Vector<any> = null;
        _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc1_ of (_loc2_ ?? [])) {
            _loc1_.showFootprint(true);
        }
    }

    public static HideFootprints(): void {
        let _loc1_: BFOUNDATION = null;
        let _loc2_: boolean = false;
        let _loc3_: Vector<any> = null;
        _loc2_ = GLOBAL.mode !== GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode !== "wmattack" && GLOBAL.mode !== "iattack";
        _loc3_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc1_ of (_loc3_ ?? [])) {
            _loc1_.hideFootprint(_loc2_ || _loc1_._senderid == LOGIN._playerID);
        }
        BFOUNDATION.redrawAllShadowData();
    }

    public static BuildingSelect(param1: BFOUNDATION, param2: boolean = false): void {
        if (GLOBAL._selectedBuilding) {
            BASE.BuildingDeselect();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
            if (UI2._showBottom || TUTORIAL._stage == 3 || TUTORIAL._stage == 4 || TUTORIAL._stage == 20 || TUTORIAL._stage == 21 || TUTORIAL._stage == 23) {
                GLOBAL._selectedBuilding = param1;
                if (param1._class != "mushroom") {
                    GLOBAL._selectedBuilding.showFootprint(false, true);
                }
                param1.Update();
                if (!param2) {
                    if (param1._type == 127 && GLOBAL.StatGet("p_id") != 1 && !MAPROOM_DESCENT.DescentPassed && !BASE.isInfernoMainYardOrOutpost) {
                        INFERNO_DESCENT_POPUPS.ShowEnticePopup();
                    } else {
                        BUILDINGINFO.Show(param1);
                    }
                }
            }
        } else if (GLOBAL.mode == "help" || GLOBAL.mode == "ihelp" || LOGIN._playerID == param1._senderid) {
            GLOBAL._selectedBuilding = param1;
            GLOBAL._selectedBuilding.showFootprint(false);
            param1.Update();
            if (!param2) {
                BUILDINGINFO.Show(param1);
            }
        }
    }

    public static BuildingDeselect(): void {
        let _loc1_: BFOUNDATION = null;
        BUILDINGINFO.Hide();
        BASE.HideFootprints();
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        if (Boolean(GLOBAL._selectedBuilding) && GLOBAL._selectedBuilding._moving) {
            GLOBAL._selectedBuilding.StopMoveB();
        }
        if (GLOBAL._selectedBuilding) {
            _loc1_ = GLOBAL._selectedBuilding;
            GLOBAL._selectedBuilding = null;
            if (Boolean(_loc1_) && Boolean(_loc1_._mc)) {
                _loc1_.Update();
                _loc1_.hideFootprint(false);
            }
            BUILDINGINFO.Hide();
        }
    }

    public static Shake(param1: int): void {
        BASE._shakeCountdown = param1;
    }

    public static ShakeB(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        if (BASE._shakeCountdown > 0) {
            --BASE._shakeCountdown;
            _loc1_ = (BASE._shakeCountdown / 10 - Math.random() * (BASE._shakeCountdown / 5)) | 0;
            _loc2_ = (BASE._shakeCountdown / 10 - Math.random() * (BASE._shakeCountdown / 5)) | 0;
            MAP._GROUND.x += _loc1_;
            MAP._GROUND.y += _loc2_;
        }
    }

    public static Charge(param1: int, param2: number, param3: boolean = false, param4: boolean = false): int {
        let _loc5_: any = null;
        let _loc6_: any = null;
        let _loc7_: any = null;
        param2 = Math.floor(param2);
        // Admin test mode (and the Designer): everything is affordable and nothing is taken.
        if (GLOBAL.ioFreeBuild()) {
            return param2 | 0;
        }
        if (param4 && BASE.isInfernoMainYardOrOutpost) {
            param4 = false;
        }
        _loc5_ = param4 ? BASE._ideltaResources : BASE._deltaResources;
        _loc6_ = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild" ? (param4 ? BASE._iresources : BASE._resources) : GLOBAL._attackersResources;
        _loc7_ = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild" ? BASE._hpResources : GLOBAL._hpAttackersResources;
        if (param2 <= _loc6_["r" + param1].Get()) {
            if (!param3) {
                _loc6_["r" + param1].Add(-param2);
                if (!param4) {
                    _loc7_["r" + param1] -= param2;
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
                    if (param4) {
                        if (_loc5_["r" + param1]) {
                            _loc5_["r" + param1].Add(Math.floor(-param2));
                        } else {
                            _loc5_["r" + param1] = new SecNum(Math.floor(-param2));
                        }
                        _loc5_.dirty = true;
                        GLOBAL._resources["r" + param1].Add(-param2);
                        GLOBAL._hpResources["r" + param1] -= param2;
                    } else {
                        if (_loc5_["r" + param1]) {
                            _loc5_["r" + param1].Add(Math.floor(-param2));
                            BASE._hpDeltaResources["r" + param1] += Math.floor(-param2);
                        } else {
                            _loc5_["r" + param1] = new SecNum(Math.floor(-param2));
                            BASE._hpDeltaResources["r" + param1] = Math.floor(-param2);
                        }
                        _loc5_.dirty = true;
                        BASE._hpDeltaResources.dirty = true;
                        GLOBAL._resources["r" + param1].Add(-param2);
                        GLOBAL._hpResources["r" + param1] -= param2;
                    }
                } else {
                    if (GLOBAL._attackersDeltaResources["r" + param1]) {
                        GLOBAL._attackersDeltaResources["r" + param1].Add(Math.floor(-param2));
                    } else {
                        GLOBAL._attackersDeltaResources["r" + param1] = new SecNum(Math.floor(-param2));
                    }
                    GLOBAL._attackersDeltaResources.dirty = true;
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
                }
                BASE.CalcResources();
            }
            return param2 | 0;
        }
        return 0;
    }

    public static Fund(param1: int, param2: number, param3: boolean = false, param4: BFOUNDATION = null, param5: boolean = false, param6: boolean = true): number {
        let _loc7_: any = null;
        let _loc8_: any = null;
        let _loc9_: any = null;
        let _loc10_: string = null;
        let _loc11_: any = null;
        let _loc12_: number = NaN;
        param2 = Math.floor(param2);
        if (param5 && BASE.isInfernoMainYardOrOutpost) {
            param5 = false;
        }
        if (param1 < 5) {
            _loc7_ = param5 ? BASE._iresources : BASE._resources;
            _loc8_ = param5 ? BASE._ideltaResources : BASE._deltaResources;
            _loc9_ = param5 ? {} : BASE._hpDeltaResources;
            _loc10_ = "r" + param1;
            _loc11_ = "r" + param1 + "max";
            _loc12_ = 0;
            if (_loc7_[_loc10_].Get() < _loc7_[_loc11_] || param3) {
                if (_loc7_[_loc10_].Get() + param2 < _loc7_[_loc11_] || param3) {
                    _loc7_[_loc10_].Add(param2);
                    if (!param5) {
                        BASE._hpResources[_loc10_] += param2;
                    }
                    if (_loc8_[_loc10_]) {
                        _loc8_[_loc10_].Add(param2);
                        _loc9_[_loc10_] += param2;
                    } else {
                        _loc8_[_loc10_] = new SecNum(param2);
                        _loc9_[_loc10_] = param2;
                    }
                    if (GLOBAL.mode === GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode === GLOBAL.e_BASE_MODE.IBUILD) {
                        GLOBAL._resources[_loc10_].Add(param2);
                        GLOBAL._hpResources[_loc10_] += param2;
                    }
                    _loc8_.dirty = true;
                    _loc9_.dirty = true;
                    _loc12_ = param2;
                } else {
                    _loc12_ = _loc7_[_loc11_] - _loc7_[_loc10_].Get();
                    _loc7_[_loc10_].Set(_loc7_[_loc11_]);
                    if (!param5) {
                        BASE._hpResources[_loc10_] = _loc7_[_loc11_];
                    }
                    if (_loc8_[_loc10_]) {
                        _loc8_[_loc10_].Add(Math.floor(_loc12_));
                        _loc9_[_loc10_] += Math.floor(_loc12_);
                    } else {
                        _loc8_[_loc10_] = new SecNum(Math.floor(_loc12_));
                        _loc9_[_loc10_] = Math.floor(_loc12_);
                    }
                    if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode === GLOBAL.e_BASE_MODE.IBUILD) {
                        GLOBAL._resources[_loc10_].Add(Math.floor(_loc12_));
                        GLOBAL._hpResources[_loc10_] += Math.floor(_loc12_);
                    }
                    _loc8_.dirty = true;
                    _loc9_.dirty = true;
                }
                BASE._bankedValue += _loc12_;
                BASE._bankedTime = GLOBAL.Timestamp();
                if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode === GLOBAL.e_BASE_MODE.IBUILD) && !param5) {
                }
            } else if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode === GLOBAL.e_BASE_MODE.IBUILD) && !param5 && !WMATTACK._inProgress && param6) {
                UI2._top.OverchargeShow(param1);
            }
            if (param4) {
                param4._stored.Add(-_loc12_);
                if (!param4._producing) {
                    param4.StartProduction();
                }
                param4.Update();
            }
            if (_loc12_ > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode === GLOBAL.e_BASE_MODE.IBUILD) && param6) {
                BASE.Save();
            }
        }
        UI2.Update();
        return _loc12_;
    }

    private static JiggleResource(param1: int, param2: number): void {
        let _loc3_: MovieClip = null;
        let _loc4_: TextField = null;
        let _loc5_: string = null;
        let _loc6_: string = null;
        if (param2 == 0) {
            return;
        }
        _loc3_ = as3.cast(UI2._top.mc["mcR" + param1], MovieClip);
        _loc3_.x = -15;
        TweenLite.to(_loc3_, 0.6, { "x": 0, "ease": Elastic.easeOut });
        if (BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        _loc4_ = as3.cast(_loc3_.mcPoints.txt, TextField);
        if (param2 >= 0) {
            _loc5_ = "00FF00";
            _loc6_ = "+";
        } else {
            _loc5_ = "FF0000";
            _loc6_ = "-";
        }
        _loc4_.y = 0;
        _loc4_.x = 0;
        _loc3_.mcPoints.alpha = 1;
        _loc4_.alpha = 1;
        _loc4_.htmlText = "<font color=\"#" + _loc5_ + "\">" + _loc6_ + GLOBAL.FormatNumber(param2) + "</font>";
        TweenLite.to(_loc4_, 3 + Math.random(), { "y": _loc4_.y - (15 + Math.random() * 10), "x": Math.random() * 10, "alpha": 0 });
    }

    public static SaveDeltaResources(): void {
        let _loc1_: int = 0;
        if (BASE._deltaResources.dirty) {
            _loc1_ = 1;
            while (_loc1_ < 5) {
                if (BASE._deltaResources["r" + _loc1_]) {
                    if (BASE._deltaResources["r" + _loc1_].Get() != BASE._hpDeltaResources["r" + _loc1_]) {
                        LOGGER.Log("log", "Delta resources r" + _loc1_ + " secure " + BASE._deltaResources["r" + _loc1_] + " unsecure " + BASE._hpDeltaResources["r" + _loc1_]);
                        GLOBAL.ErrorMessage("BASE.SaveDeltaResources");
                    }
                    if (BASE._savedDeltaResources["r" + _loc1_]) {
                        BASE._savedDeltaResources["r" + _loc1_].Add(BASE._deltaResources["r" + _loc1_].Get());
                    } else {
                        BASE._savedDeltaResources["r" + _loc1_] = new SecNum(Number(BASE._deltaResources["r" + _loc1_].Get()));
                    }
                }
                _loc1_++;
            }
        }
        BASE._deltaResources = { "dirty": false };
        BASE._hpDeltaResources = { "dirty": false };
    }

    public static CleanDeltaResources(): void {
        BASE._savedDeltaResources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        BASE._ideltaResources.r1.Set(0);
        BASE._ideltaResources.r2.Set(0);
        BASE._ideltaResources.r3.Set(0);
        BASE._ideltaResources.r4.Set(0);
    }

    public static BuildBlockers(param1: BFOUNDATION, param2: boolean = false): string {
        if (GRID.FootprintBlocked(param1._footprint, new Point(param1._mc.x, param1._mc.y), true, param2)) {
            return "overlap";
        }
        return "";
    }

    public static CountBuildings(): void {
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        BASE._buildingCounts = {};
        _loc1_ = 0;
        while (_loc1_ < GLOBAL._buildingProps.length) {
            BASE._buildingCounts["b" + (_loc1_ + 1)] = 0;
            _loc1_++;
        }
        _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            BASE._buildingCounts["b" + _loc3_._type] = (BASE._buildingCounts["b" + _loc3_._type] | 0) + 1;
        }
    }

    /**
     * Inferno-only (Outposts list): opens the outpost at (x, y), as "Next outpost" opens the next one:
     * the map cell is loaded first, then the yard (GLOBAL tick, _needCurrentCell).
     */
    /** A wild monster or baiter attack on the yard is running: the player can't leave it (or change it) now. */
    public static ioAttackRunning(): boolean {
        return WMATTACK._inProgress || CUSTOMATTACKS._started;
    }

    public static ioLoadOutpost(x: int, y: int): void {
        if (BASE.ioAttackRunning() || GLOBAL.isMapOpen()) {
            return;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message("Your yard is still saving. Try again in a moment.");
            return;
        }
        if (BASE.isMainYard && GLOBAL._bMap && !GLOBAL._bMap._canFunction) {
            GLOBAL.Message(KEYS.Get("map_msg_damaged"));
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        BASE._currentCellLoc = new Point(x, y);
        GLOBAL._currentCell = null;
        BASE._needCurrentCell = true;
        MapRoomManager.instance.LoadCell(x, y, true);
        PLEASEWAIT.Show(KEYS.Get("process_outpost"));
    }

    /** Inferno-only: the Outposts list's Previous: the outpost before this one (from the main yard, the last). */
    public static ioLoadPrevious(): void {
        BASE._ioStepDir = -1;
        BASE.LoadNext();
    }

    /** Inferno-only: the Outposts list's Next (as the old button: LoadNext, forwards). */
    public static ioLoadNextOutpost(): void {
        BASE._ioStepDir = 1;
        BASE.LoadNext();
    }

    /** Inferno-only: the Outposts list's Home: back to the main yard from an outpost. */
    public static ioGoHome(): void {
        if (BASE.ioAttackRunning() || GLOBAL.isMapOpen() || BASE.isMainYardOrInfernoMainYard) {
            return;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message("Your yard is still saving. Try again in a moment.");
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != "ibuild") {
            return;
        }
        BASE._needCurrentCell = false;
        GLOBAL._currentCell = null;
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /**
     * Inferno-only: the outpost LoadNext goes to, as an index in GLOBAL._mapOutpost (in the order they
     * were taken): one on from this one (or back, _ioStepDir -1), round from the last to the first; from
     * the main yard (or an outpost not in the list) the first, or the last going back.
     */
    private static ioStepIndex(): int {
        let count: int = GLOBAL._mapOutpostIDs.length | 0;
        let here: int = -1;
        if (!BASE.isMainYardOrInfernoMainYard) {
            for (let i: int = 0; i < count; i++) {
                if (GLOBAL._mapOutpostIDs[i] == BASE._loadedBaseID) {
                    here = i;
                    break;
                }
            }
        }
        let dir: int = BASE._ioStepDir < 0 ? -1 : 1;
        BASE._ioStepDir = 1;
        if (here < 0) {
            return (dir > 0 ? 0 : count - 1) | 0;
        }
        return ((here + dir + count) % count) | 0;
    }

    public static LoadNext(param1: MouseEvent = null): void {
        let _loc2_: number = NaN;
        let _loc3_: int = 0;
        if (BASE.ioAttackRunning()) {
            GLOBAL._nextOutpostWaiting = 0;
            BASE._ioStepDir = 1;
            return;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL._nextOutpostWaiting = 1;
            return;
        }
        if (MapRoomManager.instance.isInMapRoom2) {
            // (as ioLoadOutpost: a main yard without a Map Room yet crashed here)
            if (BASE.isMainYard && GLOBAL._bMap && !GLOBAL._bMap._canFunction) {
                GLOBAL.Message(KEYS.Get("map_msg_damaged"));
                return;
            }
            if (Boolean(GLOBAL._mapOutpostIDs) && GLOBAL._mapOutpostIDs.length > 0) {
                if (GLOBAL.INFERNO_ONLY && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild")) {
                    // Inferno-only: forwards or back (_ioStepDir), round from the last outpost to the first
                    _loc3_ = BASE.ioStepIndex();
                    BASE._currentCellLoc = as3.cast(GLOBAL._mapOutpost[_loc3_], Point);
                    GLOBAL._currentCell = null;
                    BASE._needCurrentCell = true;
                    MapRoomManager.instance.LoadCell(GLOBAL._mapOutpost[_loc3_].x | 0, GLOBAL._mapOutpost[_loc3_].y | 0, true);
                    PLEASEWAIT.Show(KEYS.Get("process_outpost"));
                    return;
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") {
                    if (BASE.isMainYardOrInfernoMainYard) {
                        BASE._currentCellLoc = as3.cast(GLOBAL._mapOutpost[0], Point);
                        GLOBAL._currentCell = null;
                        BASE._needCurrentCell = true;
                        MapRoomManager.instance.LoadCell(GLOBAL._mapOutpost[0].x | 0, GLOBAL._mapOutpost[0].y | 0, true);
                        PLEASEWAIT.Show(KEYS.Get("process_outpost"));
                    } else {
                        _loc2_ = 0;
                        _loc3_ = 0;
                        while (_loc3_ < GLOBAL._mapOutpostIDs.length) {
                            if (GLOBAL._mapOutpostIDs[_loc3_] == BASE._loadedBaseID) {
                                if (_loc3_ < GLOBAL._mapOutpostIDs.length - 1) {
                                    BASE._currentCellLoc = as3.cast(GLOBAL._mapOutpost[_loc3_ + 1], Point);
                                    GLOBAL._currentCell = null;
                                    BASE._needCurrentCell = true;
                                    MapRoomManager.instance.LoadCell(GLOBAL._mapOutpost[_loc3_ + 1].x | 0, GLOBAL._mapOutpost[_loc3_ + 1].y | 0, true);
                                    PLEASEWAIT.Show(KEYS.Get("process_outpost"));
                                    break;
                                }
                                BASE._needCurrentCell = false;
                                GLOBAL._currentCell = null;
                                BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                                break;
                            }
                            _loc3_++;
                        }
                    }
                }
            }
        }
    }

    public static CalcResources(): void {
        let _loc1_: number = NaN;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: Vector<any> = null;
        let _loc6_: BFOUNDATION = null;
        let _loc7_: ResourceCapacityBaseBuff = null;
        let _loc8_: int = 0;
        if (BASE.isOutpostOrInfernoOutpost) {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || MapRoomManager.instance.isInMapRoom3) {
                return;
            }
        } else {
            BASE._resources.r1max = 10000;
            BASE._resources.r2max = 10000;
            BASE._resources.r3max = 10000;
            BASE._resources.r4max = 10000;
        }
        if (BASE._resources.r1.Get() > 25000000 && BASE._resources.r2.Get() > 25000000 && BASE._resources.r3.Get() > 25000000 && BASE._resources.r4.Get() > 25000000) {
            ACHIEVEMENTS.Check("stockpile", 1);
        }
        BASE._resources.r1Rate = 0;
        BASE._resources.r2Rate = 0;
        BASE._resources.r3Rate = 0;
        BASE._resources.r4Rate = 0;
        _loc5_ = InstanceManager.getInstancesByClass(BRESOURCE);
        for (_loc6_ of (_loc5_ ?? [])) {
            _loc3_ = _loc6_._type;
            _loc4_ = _loc6_._lvl.Get() | 0;
            if (BASE.isOutpost && Boolean(GLOBAL._currentCell)) {
                if (Boolean(_loc6_._countdownUpgrade) && _loc6_._countdownUpgrade.Get() > 0) {
                    _loc4_++;
                }
            }
            switch (_loc3_) {
                case 1:
                    if (BASE.isOutpost && Boolean(GLOBAL._currentCell)) {
                        BASE._resources.r1Rate += (BRESOURCE.AdjustProduction(GLOBAL._currentCell, GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] | 0) / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    } else {
                        BASE._resources.r1Rate += (GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    }
                    break;
                case 2:
                    if (BASE.isOutpost && Boolean(GLOBAL._currentCell)) {
                        BASE._resources.r2Rate += (BRESOURCE.AdjustProduction(GLOBAL._currentCell, GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] | 0) / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    } else {
                        BASE._resources.r2Rate += (GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    }
                    break;
                case 3:
                    if (BASE.isOutpost && Boolean(GLOBAL._currentCell)) {
                        BASE._resources.r3Rate += (BRESOURCE.AdjustProduction(GLOBAL._currentCell, GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] | 0) / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    } else {
                        BASE._resources.r3Rate += (GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    }
                    break;
                case 4:
                    if (BASE.isOutpost && Boolean(GLOBAL._currentCell)) {
                        BASE._resources.r4Rate += (BRESOURCE.AdjustProduction(GLOBAL._currentCell, GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] | 0) / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    } else {
                        BASE._resources.r4Rate += (GLOBAL._buildingProps[_loc3_ - 1].produce[_loc4_ - 1] / GLOBAL._buildingProps[_loc3_ - 1].cycleTime[_loc4_ - 1] * 60 * 60) | 0;
                    }
                    break;
            }
        }
        _loc5_ = InstanceManager.getInstancesByClass(BUILDING6);
        for (_loc6_ of (_loc5_ ?? [])) {
            if (_loc6_._lvl.Get() >= 1 && BASE.isMainYardOrInfernoMainYard) {
                _loc3_ = _loc6_._type;
                BASE._resources.r1max += GLOBAL._buildingProps[_loc3_ - 1].capacity[_loc6_._lvl.Get() - 1];
                BASE._resources.r2max += GLOBAL._buildingProps[_loc3_ - 1].capacity[_loc6_._lvl.Get() - 1];
                BASE._resources.r3max += GLOBAL._buildingProps[_loc3_ - 1].capacity[_loc6_._lvl.Get() - 1];
                BASE._resources.r4max += GLOBAL._buildingProps[_loc3_ - 1].capacity[_loc6_._lvl.Get() - 1];
            }
        }
        if (MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard && BaseBuffHandler.instance.isInitialized) {
            _loc7_ = as3.as(BaseBuffHandler.instance.getBuffByName(ResourceCapacityBaseBuff.k_NAME), ResourceCapacityBaseBuff);
            if (_loc7_) {
                _loc2_ = 1;
                while (_loc2_ < 5) {
                    BASE._resources["r" + _loc2_ + "max"] += _loc7_.value;
                    _loc2_++;
                }
            }
        }
        if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
            BASE._resources.r1Rate *= GLOBAL._harvesterOverdrivePower.Get();
            BASE._resources.r2Rate *= GLOBAL._harvesterOverdrivePower.Get();
            BASE._resources.r3Rate *= GLOBAL._harvesterOverdrivePower.Get();
            BASE._resources.r4Rate *= GLOBAL._harvesterOverdrivePower.Get();
        }
        if (BASE.isMainYardOrInfernoMainYard) {
            _loc2_ = 1;
            while (_loc2_ < 5) {
                BASE._resources["r" + _loc2_ + "max"] *= GLOBAL._upgradePacking;
                BASE._resources["r" + _loc2_ + "max"] = Math.floor(Number(BASE._resources["r" + _loc2_ + "max"]));
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
                    GLOBAL._yardResources["r" + _loc2_ + "max"] = BASE._resources["r" + _loc2_ + "max"];
                    GLOBAL._yardResources["r" + _loc2_ + "Rate"] = BASE._resources["r" + _loc2_ + "Rate"];
                }
                _loc2_++;
            }
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc8_ = 1;
            while (_loc8_ < 5) {
                if (MapRoomManager.instance.isInMapRoom2 && !BASE.usesInfernoBackend) {
                    GLOBAL._resources["r" + _loc8_ + "max"] = GLOBAL._yardResources["r" + _loc8_ + "max"] + GLOBAL._mapOutpost.length * GLOBAL._outpostCapacity.Get();
                    BASE._resources["r" + _loc8_ + "max"] = GLOBAL._resources["r" + _loc8_ + "max"];
                } else {
                    GLOBAL._resources["r" + _loc8_ + "max"] = GLOBAL._yardResources["r" + _loc8_ + "max"];
                }
                _loc8_++;
            }
        }
        BASE.ioTestResources();
        UI2.Update();
    }

    public static ioTestResources(): void {
        // The admin's own yards only (not a yard being viewed or attacked in practice: its loot).
        if (!GLOBAL.ioFreeBuild() || (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD)) {
            return;
        }
        for (let r: int = 1; r < 5; r++) {
            BASE._resources["r" + r + "max"] = BASE.IO_TEST_RESOURCES;
            if (GLOBAL._resources) {
                GLOBAL._resources["r" + r + "max"] = BASE.IO_TEST_RESOURCES;
            }
            if (BASE._resources["r" + r] && BASE._resources["r" + r].Get() < BASE.IO_TEST_RESOURCES) {
                BASE._resources["r" + r].Set(BASE.IO_TEST_RESOURCES);
                BASE._hpResources["r" + r] = BASE.IO_TEST_RESOURCES;
            }
            if (GLOBAL._resources && GLOBAL._resources["r" + r] && GLOBAL._resources["r" + r].Get() < BASE.IO_TEST_RESOURCES) {
                GLOBAL._resources["r" + r].Set(BASE.IO_TEST_RESOURCES);
                GLOBAL._hpResources["r" + r] = BASE.IO_TEST_RESOURCES;
            }
        }
    }

    public static CalcBaseValue(): number {
        let _loc1_: boolean = false;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc6_: any = null;
        let _loc7_: any = null;
        _loc1_ = BASE.isOutpost;
        _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        _loc4_ = 0;
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._class != "decoration" && _loc3_._class != "enemy" && _loc3_._class != "immovable" && _loc3_._class != "trap" && _loc3_ !== GLOBAL._newBuilding && (_loc1_ || _loc3_._countdownBuild.Get() <= 0)) {
                _loc5_ = _loc3_._lvl.Get() | 0;
                if (_loc5_ <= 0) {
                    _loc5_ = 1;
                }
                // Some prop entries have no cost table at all (the Inferno table's mushroom, for one).
                if (Boolean(_loc6_ = GLOBAL._buildingProps[_loc3_._type - 1]) && Boolean(_loc6_.costs) && Boolean(_loc6_.costs[_loc5_ - 1])) {
                    _loc7_ = _loc6_.costs[_loc5_ - 1];
                    _loc4_ = Number(_loc4_ + (_loc7_.time.Get() + _loc7_.r1.Get() + _loc7_.r2.Get() + _loc7_.r3.Get() + _loc7_.r4.Get()));
                }
            }
        }
        _loc4_ = Math.ceil(_loc4_ * 0.1);
        if (BASE.isOutpostOrInfernoOutpost) {
            BASE._outpostValue = _loc4_;
        }
        if (_loc4_ > BASE._baseValue && BASE.isMainYardOrInfernoMainYard) {
            BASE._baseValue = _loc4_;
        }
        return _loc4_;
    }

    public static PointsAdd(param1: uint): void {
        BASE._basePoints = Math.floor(BASE._basePoints + param1);
    }

    public static BaseLevel(): any {
        let lvl: any = null;
        let title: string = null;
        let body: string = null;
        let points: number = NaN;
        lvl = null;
        let length: int = 0;
        let i: int = 0;
        let mc: popup_levelup = null;
        title = null;
        body = null;
        let StreamPost: Function = null;
        BASE.CalcBaseValue();
        points = BASE._basePoints + Number(BASE._baseValue);
        lvl = { "level": 0, "lower": 0, "upper": 0, "leveled": false };
        length = (BASE.s_levels.length - 1) | 0;
        lvl.points = points;
        while (i < length) {
            if (points >= BASE.s_levels[i]) {
                lvl.level = i + 1;
                lvl.lower = BASE.s_levels[i];
                lvl.upper = BASE.s_levels[i + 1];
                lvl.needed = lvl.upper - points;
            }
            i++;
        }
        if (GLOBAL._render && lvl.level > BASE._baseLevel && lvl.level > 1 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (BASE._baseLevel > 0) {
                lvl.leveled = true;
                if (TUTORIAL._stage > 200) {
                    StreamPost = (param1: MouseEvent): void => {
                        GLOBAL.CallJS("sendFeed", ["levelup" + lvl.level, KEYS.Get(title, { "v1": lvl.level }), KEYS.Get(body), "levelup/levelup" + lvl.level + ".v2.png"]);
                        POPUPS.Next();
                    };
                    mc = new popup_levelup();
                    title = "pop_levelup_streamtitle";
                    body = "pop_levelup_body";
                    if (BASE.isInfernoMainYardOrOutpost) {
                        title = "inf_pop_levelup_streamtitle";
                        body = "inf_pop_levelup_body";
                    }
                    mc.title_txt.htmlText = "<b>" + KEYS.Get("pop_levelup_title") + "</b>";
                    mc.headline_txt.htmlText = KEYS.Get("pop_levelup_headline", { "v1": lvl.level });
                    mc.body_txt.htmlText = KEYS.Get("pop_levelup_body");
                    mc.bPost.SetupKey("btn_brag");
                    mc.bPost.addEventListener(MouseEvent.CLICK, StreamPost);
                    mc.bPost.Highlight = true;
                    POPUPS.Push(mc, null, null, "levelup", "levelup.v2.png");
                }
            }
            BASE._baseLevel = lvl.level | 0;
            LOGGER.Stat([33, BASE._baseLevel]);
        }
        if (lvl.leveled) {
            BASE.Save();
            if (Chat._bymChat) {
                Chat._bymChat.broadcastDisplayNameUpdate(lvl.level | 0);
            }
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            LOGIN._playerLevel = lvl.level | 0;
        }
        return lvl;
    }

    public static GetBuildingOverlap(param1: number, param2: number, param3: number, param4: Vector<BFOUNDATION>): void {
        let _loc5_: Point = null;
        let _loc6_: Vector<any> = null;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: Point = null;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: number = NaN;
        let _loc14_: number = NaN;
        _loc5_ = new Point(param1, param2);
        _loc6_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc7_ of (_loc6_ ?? [])) {
            if (!(_loc7_ instanceof BMUSHROOM)) {
                _loc8_ = new Point(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                _loc9_ = Math.atan2(_loc5_.y - _loc8_.y, _loc5_.x - _loc8_.x);
                _loc10_ = BASE.EllipseEdgeDistance(_loc9_, param3 | 0, (param3 * BASE._angle) | 0);
                _loc9_ = Math.atan2(_loc8_.y - _loc5_.y, _loc8_.x - _loc5_.x);
                _loc11_ = BASE.EllipseEdgeDistance(_loc9_, (_loc7_._size * 0.5) | 0, (_loc7_._size * 0.5 * BASE._angle) | 0);
                _loc12_ = _loc5_.x - _loc8_.x;
                _loc13_ = _loc5_.y - _loc8_.y;
                _loc14_ = Math.sqrt(_loc12_ * _loc12_ + _loc13_ * _loc13_) | 0;
                if (_loc14_ < _loc10_ + _loc11_) {
                    param4.push(_loc7_);
                }
            }
        }
    }

    public static BuildingOverlap(param1: Point, param2: int, param3: boolean, param4: boolean = false, param5: boolean = false, param6: boolean = false): boolean {
        let _loc7_: Vector<any> = null;
        let _loc8_: BFOUNDATION = null;
        let _loc9_: Point = null;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: number = NaN;
        let _loc14_: number = NaN;
        let _loc15_: int = 0;
        _loc7_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc8_ of (_loc7_ ?? [])) {
            if (!(_loc8_ instanceof BMUSHROOM)) {
                _loc9_ = new Point(_loc8_._mc.x, _loc8_._mc.y + _loc8_._middle);
                if (!(param3 && _loc8_._class == "trap" || param4 && _loc8_.health <= 0 || param5 && _loc8_._class == "decoration" || param6 && (_loc8_._class == "immovable" || _loc8_._class == "enemy"))) {
                    _loc10_ = Math.atan2(param1.y - _loc9_.y, param1.x - _loc9_.x);
                    _loc11_ = BASE.EllipseEdgeDistance(_loc10_, param2, (param2 * BASE._angle) | 0);
                    _loc10_ = Math.atan2(_loc9_.y - param1.y, _loc9_.x - param1.x);
                    _loc12_ = BASE.EllipseEdgeDistance(_loc10_, (_loc8_._size * 0.5) | 0, (_loc8_._size * 0.5 * BASE._angle) | 0);
                    _loc13_ = param1.x - _loc9_.x;
                    _loc14_ = param1.y - _loc9_.y;
                    _loc15_ = Math.sqrt(_loc13_ * _loc13_ + _loc14_ * _loc14_) | 0;
                    if (_loc15_ < _loc11_ + _loc12_) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static EllipseEdgeDistance(param1: number, param2: int, param3: int): number {
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        _loc4_ = Math.pow(Math.pow(param2 / 2, -2) + Math.pow(Math.tan(param1), 2) * Math.pow(param3 / 2, -2), -0.5);
        _loc5_ = param1 * 180 / Math.PI;
        if (_loc5_ < -90 || _loc5_ > 90) {
            _loc4_ *= -1;
        }
        _loc6_ = Math.tan(param1) * _loc4_;
        return Math.sqrt(_loc4_ * _loc4_ + _loc6_ * _loc6_);
    }

    public static EllipseEdgeDistanceSqrd(param1: number, param2: int, param3: int): number {
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        _loc4_ = Math.pow(Math.pow(param2 / 2, -2) + Math.pow(Math.tan(param1), 2) * Math.pow(param3 / 2, -2), -0.5);
        _loc5_ = param1 * 180 / Math.PI;
        if (_loc5_ < -90 || _loc5_ > 90) {
            _loc4_ *= -1;
        }
        _loc6_ = Math.tan(param1) * _loc4_;
        return _loc4_ * _loc4_ + _loc6_ * _loc6_;
    }

    public static InsideCircle(param1: Point, param2: int): boolean {
        return true;
    }

    public static applyTemplate(param1: BaseTemplate): void {
        let _loc2_: int = 0;
        let _loc3_: BaseTemplateNode = null;
        let _loc4_: Point = null;
        let _loc5_: BFOUNDATION = null;
        _loc2_ = 0;
        while (_loc2_ < param1.nodes.length) {
            _loc3_ = as3.vget(param1.nodes, _loc2_);
            _loc4_ = GRID.ToISO(_loc3_.x, _loc3_.y, 0);
            _loc5_ = BASE.getBuildingFromNode(_loc3_);
            if (_loc5_) {
                _loc5_.moveTo(_loc4_.x | 0, _loc4_.y | 0);
            }
            _loc2_++;
        }
        BASE.Save();
    }

    private static getBuildingFromNode(param1: BaseTemplateNode): BFOUNDATION {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc2_: Point = GRID.ToISO(param1.x, param1.y, 0);
        if (param1.id == PlannerTemplate._DECORATION_ID) {
            _loc4_ = param1.type | 0;
            _loc3_ = BASE.addBuildingC(_loc4_);
            _loc5_ = { "X": param1.x, "Y": param1.y, "t": _loc4_, "id": (BASE._buildingCount + 1) };
            if (BASE._buildingsStored["bl" + _loc4_]) {
                _loc5_.l = BASE._buildingsStored["bl" + _loc4_].Get();
            }
            _loc3_.Setup(_loc5_);
            param1.id = _loc3_._id >>> 0;
            BASE._buildingsStored["b" + _loc4_].Set(BASE._buildingsStored["b" + _loc4_].Get() - 1);
        } else {
            _loc3_ = BASE.getBuildingByID(param1.id);
        }
        return _loc3_;
    }

    public static getTemplate(): BaseTemplate {
        let _loc1_: BaseTemplate = null;
        let _loc2_: Vector<BFOUNDATION> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: Point = null;
        _loc1_ = new BaseTemplate();
        _loc1_.name = BASE._baseName;
        _loc2_ = BASE.getYardPlannerBuildings();
        for (_loc3_ of (_loc2_ ?? [])) {
            _loc4_ = GRID.FromISO(_loc3_.x, _loc3_.y);
            _loc1_.addNode(new BaseTemplateNode(_loc4_.x | 0, _loc4_.y | 0, _loc3_._id >>> 0, _loc3_._type >>> 0));
        }
        return _loc1_;
    }

    public static getYardPlannerBuildings(): Vector<BFOUNDATION> {
        let _loc1_: Vector<any> = null;
        let _loc2_: Vector<BFOUNDATION> = null;
        let _loc3_: BFOUNDATION = null;
        _loc1_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        _loc2_ = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
        for (_loc3_ of (_loc1_ ?? [])) {
            if (_loc3_._type != 7) {
                _loc2_.push(_loc3_);
            }
        }
        return _loc2_;
    }

    public static isBuildingIgnoredInYardPlannerSave(param1: BFOUNDATION): boolean {
        return param1._class == "enemy";
    }

    public static getBuildingByID(param1: uint): BFOUNDATION {
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._id == param1) {
                return _loc3_;
            }
        }
        return null;
    }

    public static RebuildTH(param1: boolean = false): void {
        let _loc2_: Point = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        if (!BASE.isMainYard && BASE.m_yardType !== EnumYardType.INFERNO_YARD) {
            return;
        }
        if (!param1 && (GLOBAL.townHall instanceof ResourceOutpost || GLOBAL.townHall instanceof GuardTower || GLOBAL.townHall instanceof OutpostDefender)) {
            return;
        }
        BASE.CalcBaseValue();
        if (BASE._basePoints + BASE._baseValue >= 2000000) {
            _loc4_ = BASE.CaluclateExpectedTownHallLevel();
            if (GLOBAL.townHall) {
                if (GLOBAL.townHall._lvl.Get() < _loc4_) {
                    if (GLOBAL.townHall._countdownUpgrade.Get() > 0) {
                        GLOBAL.townHall.Upgraded();
                        _loc4_ = BASE.CaluclateExpectedTownHallLevel();
                    }
                    if (GLOBAL.townHall._lvl.Get() < _loc4_) {
                        GLOBAL.townHall._lvl.Set(_loc4_ - 1);
                        GLOBAL.townHall.Upgraded();
                    }
                }
            } else {
                _loc2_ = new Point(-800, -40);
                _loc3_ = BASE.addBuildingC(14);
                ++BASE._buildingCount;
                _loc3_.Setup({ "t": 14, "X": _loc2_.x, "Y": _loc2_.y, "id": BASE._buildingCount, "l": _loc4_ });
                _loc2_ = GRID.ToISO(_loc2_.x, _loc2_.y, 0);
                MAP.FocusTo(_loc2_.x | 0, _loc2_.y | 0, 2);
                GLOBAL.Message(KEYS.Get("msg_rebuildTH"));
            }
        } else if (!GLOBAL.townHall || param1) {
            _loc2_ = new Point(-800, -40);
            _loc3_ = BASE.addBuildingC(14);
            ++BASE._buildingCount;
            _loc4_ = BASE.CaluclateExpectedTownHallLevel();
            _loc3_.Setup({ "t": 14, "X": _loc2_.x, "Y": _loc2_.y, "id": BASE._buildingCount, "l": _loc4_ });
            _loc2_ = GRID.ToISO(_loc2_.x, _loc2_.y, 0);
            MAP.FocusTo(_loc2_.x | 0, _loc2_.y | 0, 2);
            GLOBAL.Message(KEYS.Get("msg_rebuildTH"));
        }
    }

    private static CaluclateExpectedTownHallLevel(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: int = 0;
        let _loc17_: int = 0;
        let _loc18_: int = 0;
        let _loc19_: int = 0;
        let _loc20_: int = 0;
        let _loc21_: int = 0;
        let _loc22_: int = 0;
        let _loc23_: int = 0;
        let _loc24_: int = 0;
        let _loc25_: int = 0;
        let _loc26_: int = 0;
        let _loc27_: int = 0;
        let _loc28_: boolean = false;
        let _loc29_: int = 0;
        let _loc30_: int = 0;
        let _loc31_: int = 0;
        let _loc32_: int = 0;
        let _loc33_: Vector<any> = null;
        let _loc34_: BFOUNDATION = null;
        _loc1_ = 1;
        _loc6_ = 0;
        _loc16_ = 0;
        _loc27_ = 0;
        _loc28_ = false;
        _loc32_ = 0;
        _loc33_ = InstanceManager.getInstancesByClass(BTOWER);
        for (_loc34_ of (_loc33_ ?? [])) {
            if (_loc34_._type == 20) {
                _loc3_++;
            }
            if (_loc34_._type == 21) {
                _loc2_++;
            }
            if (_loc34_._type == 129) {
                _loc5_++;
            }
            if (_loc34_._type == 130) {
                _loc4_++;
            }
            if (_loc34_._type == 132) {
                _loc6_++;
            }
        }
        for (_loc7_ of (BASE.buildings ?? [])) {
            if ((_loc7_._type == 1 || _loc7_._type == 2 || _loc7_._type == 3 || _loc7_._type == 4) && _loc26_ < _loc7_._hpLvl) {
                _loc26_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 5) {
                _loc17_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 6 && _loc27_ < _loc7_._hpLvl) {
                _loc27_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 8) {
                _loc19_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 9) {
                _loc8_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 10) {
                _loc10_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 13 && _loc20_ < _loc7_._hpLvl) {
                _loc20_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 15 && _loc21_ < _loc7_._hpLvl) {
                _loc21_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 16) {
                _loc12_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 17 && _loc25_ < _loc7_._hpLvl) {
                _loc25_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 19) {
                _loc13_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 20 && _loc24_ < _loc7_._hpLvl) {
                _loc24_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 21 && _loc18_ < _loc7_._hpLvl) {
                _loc18_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 22) {
                _loc11_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 23) {
                _loc15_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 24) {
                _loc28_ = true;
            } else if (_loc7_._type == 25) {
                _loc14_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 26 && _loc23_ < _loc7_._hpLvl) {
                _loc23_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 51) {
                _loc9_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 115) {
                _loc16_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 116) {
                _loc22_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 128 && _loc29_ < _loc7_._hpLvl) {
                _loc29_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 129 && _loc31_ < _loc7_._hpLvl) {
                _loc31_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 130 && _loc30_ < _loc7_._hpLvl) {
                _loc30_ = _loc7_._hpLvl;
            } else if (_loc7_._type == 132 && _loc32_ < _loc7_._hpLvl) {
                _loc32_ = _loc7_._hpLvl;
            }
        }
        if (!BASE.isInfernoMainYardOrOutpost) {
            if (QUESTS._global.brlvl >= 4 || QUESTS._global.b6lvl >= 2 || _loc8_ >= 2 || _loc28_ || _loc17_ >= 2 || _loc19_ > 0) {
                _loc1_ = 2;
            }
            if (QUESTS._global.brlvl >= 6 || QUESTS._global.b6lvl >= 4 || QUESTS._global.b15lvl >= 2 || _loc20_ >= 2 || _loc21_ >= 2 || _loc17_ >= 3 || _loc3_ >= 4 || _loc2_ >= 4 || _loc19_ > 0 || _loc12_ > 0 || _loc9_ > 0 || _loc10_ > 0 || _loc11_ > 0 || _loc19_ >= 2 || _loc21_ >= 2 || _loc23_ > 0 || _loc11_ > 0) {
                _loc1_ = 3;
            }
            if (QUESTS._global.brlvl >= 8 || QUESTS._global.b6lvl >= 7 || QUESTS._global.b15lvl >= 3 || QUESTS._global.b23lvl >= 1 || QUESTS._global.b25lvl >= 1 || _loc21_ >= 3 || _loc23_ >= 2 || _loc11_ >= 2 || QUESTS._global.b19lvl > 0 || _loc3_ >= 5 || _loc2_ >= 5 || _loc13_ > 0 || _loc14_ > 0 || _loc16_ > 0 || _loc15_ > 0 || _loc20_ >= 3 || _loc19_ >= 4 || _loc17_ >= 4) {
                _loc1_ = 4;
            }
            if (_loc19_ >= 4 || _loc17_ >= 5 || _loc21_ >= 4 || _loc13_ >= 4 || _loc23_ >= 3 || _loc11_ >= 3) {
                _loc1_ = 5;
            }
            if (_loc21_ >= 5 || _loc13_ >= 5 || _loc23_ >= 4) {
                _loc1_ = 6;
            }
            if ((_loc21_ >= 7 || _loc13_ >= 6 || _loc23_ >= 5 || _loc18_ >= 7) && !BASE.isInfernoMainYardOrOutpost) {
                _loc1_ = 7;
            }
            if ((_loc21_ >= 8 || _loc13_ >= 7) && !BASE.isInfernoMainYardOrOutpost) {
                _loc1_ = 8;
            }
            if ((_loc21_ >= 9 || _loc11_ >= 4) && !BASE.isInfernoMainYardOrOutpost) {
                _loc1_ = 9;
            }
            if ((_loc21_ >= 10 || _loc11_ >= 5) && !BASE.isInfernoMainYardOrOutpost) {
                _loc1_ = 10;
            }
        } else if (BASE.isInfernoMainYardOrOutpost) {
            if (_loc29_ >= 2 || _loc19_ >= 2 || _loc28_ || _loc18_ >= 2 || _loc30_ >= 2 || _loc25_ > 0 || _loc26_ >= 4 || _loc27_ >= 4 || _loc2_ >= 3 || _loc4_ >= 3) {
                _loc1_ = 2;
            }
            if (_loc29_ >= 3 || _loc19_ >= 3 || _loc23_ > 0 || _loc20_ >= 2 || _loc18_ >= 3 || _loc30_ >= 3 || _loc31_ > 0 || _loc32_ > 0 || _loc25_ >= 2 || _loc26_ >= 6 || _loc27_ >= 5) {
                _loc1_ = 3;
            }
            if (_loc29_ >= 4 || _loc19_ >= 4 || _loc23_ >= 2 || _loc20_ >= 3 || _loc18_ >= 4 || _loc30_ >= 4 || _loc31_ >= 2 || _loc32_ >= 2 || _loc25_ >= 3 || _loc26_ >= 8 || _loc27_ >= 7 || _loc2_ >= 4 || _loc4_ >= 4) {
                _loc1_ = 4;
            }
            if (_loc29_ >= 5 || _loc23_ >= 3 || _loc18_ >= 6 || _loc30_ >= 6 || _loc31_ >= 4 || _loc32_ >= 4 || _loc26_ >= 10 || _loc27_ >= 9 || _loc5_ >= 4) {
                _loc1_ = 5;
            }
            if (_loc29_ >= 6 || _loc23_ >= 4 || _loc18_ >= 7 || _loc30_ >= 7 || _loc31_ >= 6 || _loc32_ >= 6 || _loc27_ >= 10 || _loc2_ >= 6 || _loc4_ >= 6 || _loc6_ >= 3) {
                _loc1_ = 6;
            }
        }
        return _loc1_;
    }

    public static addEventBaseException(param1: number): void {
        if (BASE.s_eventBases.indexOf(param1) == -1) {
            BASE.s_eventBases.push(param1);
        }
    }

    public static isEventBaseId(param1: number): boolean {
        return BASE.s_eventBases.indexOf(param1) != -1;
    }

    /**
     * PRESENTATION: should this yard look and play like the Inferno (lava, Inferno props,
     * bone/coal/sulfur/magma, Inferno monsters, stone UI)? Always true on inferno-only builds.
     */
    public static get isInfernoMainYardOrOutpost(): boolean {
        return GLOBAL.INFERNO_ONLY || BASE.m_yardType == EnumYardType.INFERNO_OUTPOST || BASE.m_yardType == EnumYardType.INFERNO_YARD;
    }

    /**
     * ROUTING: is this yard served by the legacy Inferno backend (separate inferno save,
     * api/bm/base endpoints, MR1-style inferno map, "inferno" save type)? Never true on
     * inferno-only builds, where the Inferno yard is the regular Map Room 2 main yard.
     */
    public static get usesInfernoBackend(): boolean {
        return !GLOBAL.INFERNO_ONLY && (BASE.m_yardType == EnumYardType.INFERNO_OUTPOST || BASE.m_yardType == EnumYardType.INFERNO_YARD);
    }

    public static get isMainYard(): boolean {
        return BASE.m_yardType == EnumYardType.MAIN_YARD || BASE.m_yardType == EnumYardType.PLAYER;
    }

    public static get isMainYardInfernoOnly(): boolean {
        return BASE.m_yardType == EnumYardType.INFERNO_YARD;
    }

    public static get isMainYardOrInfernoMainYard(): boolean {
        return BASE.m_yardType == EnumYardType.MAIN_YARD || BASE.m_yardType == EnumYardType.INFERNO_YARD || BASE.m_yardType == EnumYardType.PLAYER;
    }

    public static get isOutpost(): boolean {
        return BASE.m_yardType == EnumYardType.OUTPOST || BASE.m_yardType == EnumYardType.RESOURCE || BASE.m_yardType == EnumYardType.STRONGHOLD || BASE.m_yardType == EnumYardType.FORTIFICATION;
    }

    public static get isOutpostMapRoom2Only(): boolean {
        return BASE.m_yardType == EnumYardType.OUTPOST;
    }

    public static get isOutpostInfernoOnly(): boolean {
        return BASE.m_yardType == EnumYardType.INFERNO_OUTPOST;
    }

    public static get isOutpostOrInfernoOutpost(): boolean {
        return BASE.m_yardType == EnumYardType.OUTPOST || BASE.m_yardType == EnumYardType.INFERNO_OUTPOST || BASE.m_yardType == EnumYardType.RESOURCE || BASE.m_yardType == EnumYardType.STRONGHOLD || BASE.m_yardType == EnumYardType.FORTIFICATION;
    }

    public static get isOutpostResource(): boolean {
        return BASE.m_yardType == EnumYardType.RESOURCE;
    }

    public static get isOutpostStronghold(): boolean {
        return BASE.m_yardType == EnumYardType.STRONGHOLD;
    }

    public static get isOutpostFortification(): boolean {
        return BASE.m_yardType == EnumYardType.FORTIFICATION;
    }

    public static getEmpireResources(param1: int): number {
        let _loc2_: int = 0;
        _loc2_ = 1;
        if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
            _loc2_ = GLOBAL._harvesterOverdrivePower.Get() | 0;
        }
        return BASE._GIP["r" + param1].Get() * 360 * _loc2_;
    }

    public static HasRequirements(param1: any): boolean {
        let _loc2_: any[] = null;
        let _loc3_: int = 0;
        let _loc4_: Vector<any> = null;
        let _loc5_: BFOUNDATION = null;
        if (GLOBAL.ioFreeBuild()) {
            return true;
        }
        for (_loc2_ of as3.values(param1.re)) {
            _loc3_ = 0;
            if (_loc2_[0] == INFERNOQUAKETOWER.UNDERHALL_ID) {
                if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= _loc2_[2] && MAPROOM_DESCENT.DescentPassed) {
                    _loc3_ = 1;
                }
            } else {
                _loc4_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc5_ of (_loc4_ ?? [])) {
                    if (_loc5_._type == _loc2_[0] && _loc5_._lvl.Get() >= _loc2_[2]) {
                        _loc3_++;
                    }
                }
            }
            if (_loc3_ < _loc2_[1]) {
                return false;
            }
        }
        return true;
    }

    public static isInfernoBuilding(param1: uint): boolean {
        return (param1 == INFERNOQUAKETOWER.TYPE || param1 == INFERNO_MAGMA_TOWER.ID || param1 == SiegeFactory.ID || param1 == SiegeLab.ID || param1 == SpurtzCannon.TYPE || param1 == BlackSpurtzCannon.TYPE) && !BASE.isInfernoMainYardOrOutpost;
    }

    public static hasNumBuildings(param1: int, param2: int = 0, param3: boolean = false): int {
        let _loc4_: any = null;
        let _loc5_: Vector<any> = null;
        let _loc6_: int = 0;
        let _loc7_: BFOUNDATION = null;
        _loc4_ = GLOBAL._buildingProps[param1 - 1];
        _loc5_ = InstanceManager.getInstancesByClass(!(!_loc4_.cls) ? _loc4_.cls : BFOUNDATION);
        _loc6_ = 0;
        for (_loc7_ of (_loc5_ ?? [])) {
            if (_loc7_._type == param1 && _loc7_._lvl.Get() >= param2) {
                _loc6_++;
                if (param3) {
                    break;
                }
            }
        }
        return _loc6_;
    }

    public static findBuilding(param1: int): BFOUNDATION {
        let _loc2_: any = null;
        let _loc3_: Vector<any> = null;
        let _loc4_: BFOUNDATION = null;
        _loc2_ = GLOBAL._buildingProps[param1];
        _loc3_ = InstanceManager.getInstancesByClass(!(!_loc2_.cls) ? _loc2_.cls : BFOUNDATION);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (_loc4_._type === param1) {
                return _loc4_;
            }
        }
        return null;
    }

    public static isInfernoCreep(param1: string): boolean {
        // Rezghul (C19) is part of the Inferno roster on inferno-only servers: he is housed in the
        // Compound, listed with the Inferno monsters and hatched with magma like the rest of them.
        if (param1 == CREATURELOCKER.REZGHUL_ID && GLOBAL.ioRezghul) {
            return true;
        }
        return param1.substring(0, 1) == "I";
    }

    public static getEstimatedRepairDuration(): number {
        let _loc1_: number = NaN;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: number = NaN;
        _loc1_ = 0;
        _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            _loc4_ = _loc3_.getEstimatedRepairTimeRemaining();
            if (_loc4_ > _loc1_) {
                _loc1_ = _loc4_;
            }
        }
        return _loc1_;
    }

    public static getNumHousingHealsPerTick(): int {
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        _loc1_ = 0;
        _loc2_ = InstanceManager.getInstancesByClass(!(!BASE.isInfernoMainYardOrOutpost) ? HOUSINGBUNKER : BUILDING15);
        if (BASE.isInfernoMainYardOrOutpost) {
            if (as3.vget(_loc2_, 0)) {
                _loc1_ = Math.min(4, Number(as3.vget(_loc2_, 0)._lvl.Get())) | 0;
            }
        } else {
            for (_loc3_ of (_loc2_ ?? [])) {
                _loc1_++;
            }
        }
        return _loc1_;
    }

    public static FindClosestHousingToPoint(param1: int, param2: int, param3: BFOUNDATION = null, param4: boolean = true, param5: boolean = true): BFOUNDATION {
        let _loc6_: any[] = null;
        let _loc7_: Vector<any> = null;
        let _loc8_: BFOUNDATION = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        _loc6_ = [];
        _loc7_ = InstanceManager.getInstancesByClass(!(!BASE.isInfernoMainYardOrOutpost) ? HOUSINGBUNKER : BUILDING15);
        for (_loc8_ of (_loc7_ ?? [])) {
            if (_loc8_ != param3) {
                if (!(param4 == true && _loc8_._countdownBuild.Get() > 0)) {
                    if (!(param5 == true && _loc8_.health <= 0)) {
                        _loc9_ = (_loc8_.x - param1) | 0;
                        _loc10_ = (_loc8_.y - param2) | 0;
                        _loc11_ = Math.sqrt(_loc9_ * _loc9_ + _loc10_ * _loc10_) | 0;
                        _loc6_.push({ "house": _loc8_, "dist": _loc11_ });
                    }
                }
            }
        }
        if (_loc6_.length == 0) {
            return null;
        }
        as3.sortOn(_loc6_, ["dist"], Array.NUMERIC);
        return as3.cast(_loc6_[0].house, BFOUNDATION);
    }
}
