import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { DisplayObject, DisplayObjectContainer, MovieClip, Sprite, Stage, StageDisplayState } from "flash/display";
import { Event, EventDispatcher, IEventDispatcher, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Point, Rectangle } from "flash/geom";
import { SharedObject, URLLoader, URLRequest, URLRequestMethod, URLVariables, navigateToURL } from "flash/net";
import { TextField, TextFormat } from "flash/text";
import { Capabilities } from "flash/system";
import { getTimer, setTimeout } from "flash/utils";
import { IoShinyLock, IoWin, ABTest, ACADEMY, ArcadeWindow, ATTACK, BASE, BFOUNDATION, BRESOURCE, BTOTEM, BTOWER, BTRAP, BUILDING14, BUILDING16, BUILDING5, BUILDING9, Bunker, BYMConfig, CasinoWindow, CellData, ChampionBase, CHAMPIONCAGE, Chat, Console, CREATURELOCKER, CREATURES, CREEPS, Cubic, EFFECTS, EnumBaseMode, EnumYardType, ERRORMESSAGE, Fire, FIREBALLS, GAME, HATCHERY, HATCHERYCC, HOUSING, ICoreBuilding, ImageCache, IMapRoomCell, INFERNOQUAKETOWER, INFERNOYARDPROPS, InstanceManager, IoBugReport, IOBuild, IoPets, IoShop, IoPinchZoom, IoReplayPlayer, IoReplayRecorder, IoSiege, BUILDINGINFO, IoTilt, IoToast, IoMaintenance, ITickable, KEYS, LOGGER, LOGIN, MAILBOX, MAP, MAPROOM, MapRoom3AssetCache, MapRoom3TileSetManager, MAPROOM_DESCENT, MAPROOM_INFERNO, MapRoomManager, md5, MESSAGE, MONSTERBAITER, MonsterBase, MONSTERBUNKER, OUTPOST_YARD_PROPS, PATHING, Player, PLEASEWAIT, popup_bg, popup_bg2, POPUPS, POPUPSETTINGS, POWERUPS, print, PROJECTILES, PROTIP_CLIP, QUEUE, Rndm, SecNum, SiegeFactory, SiegeLab, SiegeWeapons, Smoke, SOUNDS, STORE, Timekeeper, TUTORIAL, TweenLite, UI2, UI_BOTTOM, UPDATES, URLLoaderApi, WMATTACK, WMBASE, WORKERS, YARD_PROPS, IoSynergy, IoCrucible, SOULCRUCIBLE, IoDevil } from "@game";
import { CONFIG } from "@config";

export class GLOBAL extends ASObject {
    public static serverUrl: string;

    public static cdnUrl: string;

    public static apiVersionSuffix: string;

    public static connectionCounter: int;

    public static connectionLost: boolean;

    public static _local: boolean;

    public static _save: boolean;

    public static textContentLoaded: boolean;

    public static supportedLangsLoaded: boolean;

    public static _localMode: int;

    public static _version: SecNum;

    public static _softversion: int;

    public static _aiDesignMode: boolean;

    public static DOES_USE_SCROLL: boolean; // const

    public static _mapVersion: int;

    public static _mailVersion: int;

    public static _soundVersion: int;

    public static _languageVersion: int;

    /**
     * If set, the game loop is completely halted.
     * Used in fatal error situations. The game must be reloaded to recover from this state.
     */
    private static _halt: boolean;

    public static _frameNumber: int;

    public static _friendCount: int;

    public static _sessionCount: int;

    public static _addTime: int;

    public static _proTip: PROTIP_CLIP;

    public static _checkPromo: int;

    public static _giveTips: int;

    public static _ROOT: MovieClip;

    public static _layerMap: Sprite;

    public static _layerUI: Sprite;

    public static _layerWindows: Sprite;

    public static _layerMessages: Sprite;

    public static _layerProjectiles: Sprite;

    public static _layerTop: Sprite;

    public static _fluidWidthEnabled: boolean;

    public static _SCREENINIT: Rectangle;

    public static _SCREEN: Rectangle;

    public static _SCREENCENTER: Point;

    public static _SCREENHUD: Point;

    public static _SCREENHUDLEFT: Point;

    public static t: int;

    public static _baseURL: string;

    public static _baseURL2: string;

    public static _infBaseURL: string;

    public static _apiURL: string;

    public static _gameURL: string;

    public static _storageURL: string;

    public static languageUrl: string;

    public static _allianceURL: string;

    public static _soundPathURL: string;

    public static _mapURL: string;

    public static _statsURL: string;

    public static _countryCode: string;

    public static _appid: string;

    public static _tpid: string;

    public static _currencyURL: string;

    public static _monetized: int;

    public static _shinyShroomCount: int;

    private static _shinyShrooms: any[];

    public static _shinyShroomValid: boolean;

    public static _allianceConquestTime: SecNum;

    public static _fbdata: any;

    public static _openBase: any;

    public static _degtorad: number; // const

    public static _radtodeg: number; // const

    public static _selectedBuilding: BFOUNDATION;

    public static _newBuilding: BFOUNDATION;

    public static _render: boolean;

    private static _mode: string;

    public static _loadmode: string;

    /**
     * INFERNO-ONLY BUILD
     * When true the whole game is the Inferno: every yard (main yard, outposts, wild
     * monster tribes) is rendered and played with Inferno terrain, buildings, resources
     * and monsters, while networking, saving and the world map stay on the regular
     * Map Room 2 code paths. See BASE.isInfernoMainYardOrOutpost (presentation) versus
     * BASE.usesInfernoBackend (routing). Must match `infernoOnlyConfig.enabled` on the server.
     */
    public static INFERNO_ONLY: boolean; // const

    private static _ioPendingKit: any;

    private static _ioKitRequestSent: boolean;

    private static _ioKitDeadline: int;

    private static _ioOutpostProps: any[];

    private static _ioPropsTuned: boolean;

    public static e_BASE_MODE: EnumBaseMode; // const

    public static _mapWidth: int;

    public static _mapHeight: int;

    public static _resourceNames: any[];

    public static iresourceNames: any[];

    private static _bTownhall: BFOUNDATION;

    public static _bRadio: BFOUNDATION;

    public static _bStore: BFOUNDATION;

    public static _bMap: BFOUNDATION;

    public static _bLocker: BFOUNDATION;

    public static _bAcademy: BFOUNDATION;

    public static _bHousing: BFOUNDATION;

    public static _bHatchery: BFOUNDATION;

    public static _bFlinger: BUILDING5;

    public static _bCatapult: BFOUNDATION;

    public static _bHatcheryCC: BUILDING16;

    public static _bJuicer: BUILDING9;

    public static _bBaiter: BFOUNDATION;

    public static _bYardPlanner: BFOUNDATION;

    public static _bSiegeLab: SiegeLab;

    public static _bSiegeFactory: SiegeFactory;

    public static _bChamber: BFOUNDATION;

    public static _bLab: BFOUNDATION;

    public static _bCage: CHAMPIONCAGE;

    public static _bTower: BFOUNDATION;

    public static _bTotem: BTOTEM;

    public static _bTowerCount: int;

    public static _newThings: boolean;

    public static _reloadonerror: boolean;

    public static _catchup: boolean;

    public static _researchTime: number;

    public static _buildTime: number;

    public static _upgradePacking: number;

    public static _hatcheryOverdrive: int;

    public static _hatcheryOverdrivePower: SecNum;

    public static _harvesterOverdrive: int;

    public static _harvesterOverdrivePower: SecNum;

    public static _extraHousing: int;

    public static _extraHousingPower: SecNum;

    public static _lockerOverdrive: int;

    public static _towerOverdrive: SecNum;

    public static _monsterOverdrive: SecNum;

    public static _attackerMonsterOverdrive: SecNum;

    public static _playerMonsterOverdrive: SecNum;

    public static _monsterDefenseOverdrive: SecNum;

    public static _attackerMonsterDefenseOverdrive: SecNum;

    public static _playerMonsterDefenseOverdrive: SecNum;

    public static _monsterSpeedOverdrive: SecNum;

    public static _attackerMonsterSpeedOverdrive: SecNum;

    public static _playerMonsterSpeedOverdrive: SecNum;

    public static _designSlots: int;

    public static _creepCount: int;

    public static _timekeeper: Timekeeper;

    public static _buildingProps: any[];

    private static _mr2BuildingProps: any[];

    public static k_STAGE_FPS: uint; // const

    public static _fps: int;

    public static _FPSframecount: int;

    public static _FPStimestamp: int;

    public static _FPSarray: any[];

    public static _mapHome: Point;

    public static _mapOutpost: any[];

    public static _mapOutpostIDs: any[];

    public static _wmCreaturePowerups: any[];

    public static _wmCreatureLevels: any[];

    public static _playerGuardianData: Vector<any>;

    public static _playerCatapultLevel: SecNum;

    public static _playerFlingerLevel: SecNum;

    public static _attackersResources: any;

    public static _hpAttackersResources: any;

    public static _attackersCredits: SecNum;

    public static _attackersFlinger: int;

    public static _attackersCatapult: int;

    public static _currentCell: IMapRoomCell;

    public static _empireDestroyed: int;

    public static _empireDestroyedShown: boolean;

    public static _savedAttackersDeltaResources: any;

    public static _attackersDeltaResources: any;

    public static _attackerMapResources: any;

    public static _attackerCellsInRange: Vector<CellData>;

    public static _attackerMapCreaturesStart: any;

    public static _homeBaseID: number;

    public static _showMapWaiting: int;

    public static _nextOutpostWaiting: int;

    public static _toggleYardWaiting: int;

    public static _resources: any;

    public static _hpResources: any;

    public static _yardResources: any;

    public static _loops: int;

    public static _maxLoops: int;

    /** Milliseconds of simulation allowed per rendered frame, and the most steps ever run in one. */
    private static IO_STEP_BUDGET_MS: number; // const

    private static IO_MAX_CATCHUP: int; // const

    private static _ioStepCost: number;

    public static _loopsBanked: int;

    /** Inferno-only: the simulation's speed (1; 2 while Hellgate Defense's fast forward is on, IoTd). */
    public static ioStepScale: number;

    public static lastTime: number;

    public static _zoomed: boolean;

    public static _timePlayed: int;

    public static _flags: any;

    public static _unreadMessages: int;

    public static _promptedInvite: boolean;

    public static _promptedAFK: boolean;

    public static _canInvite: boolean;

    /** Inferno-only: the Invite Friends button has been opened this session (its alert ring is off). */
    public static _ioInviteSeen: boolean;

    public static _canGift: boolean;

    public static _whatsnewid: int;

    public static _lastWhatsNew: int;

    public static _mr2TutorialId: int;

    public static _afktimer: SecNum;

    public static _oldMousePoint: Point;

    public static _otherStats: any;

    public static _baseLoads: int;

    public static _averageAltitude: SecNum;

    public static _outpostCapacity: SecNum;

    public static _displayedPromoNew: boolean;

    public static _fbPromoTimer: number; // const

    public static _fbcncp: int;

    public static _credits: SecNum;

    public static ERROR_OOPS_ONLY: int; // const

    public static ERROR_OOPS_AND_ORANGE_BOX: int; // const

    public static ERROR_ORANGE_BOX_ONLY: int; // const

    public static TIME_ELAPSED_THRESHHOLD: number; // const

    public static eventDispatcher: EventDispatcher;

    public static debugLogJSCalls: boolean;

    public static m_mapRoomFunctional: boolean;

    public static _showStreamlinedSpeedUps: boolean;

    /**
     * Inferno-only: the browser version on a phone (FlashVar iomobile=1, set by the page, client-web Shell.ts).
     * Its menu button sits at the top centre, over the game.
     */
    public static ioOnPhone: boolean;

    public static _magnification: number;

    public static __: uint;

    public static ___: uint;

    /** (public since 13 November: the Devil's Contract's offer waits while one is up: IoDevil) */
    public static _blockerList: any[];

    private static _MAGNIFICATION_BOUNDS: Point; // const

    private static _player: Player;

    private static _attackingPlayer: Player;

    public static k_MAX_NUMBER_OF_OUTPOSTS: uint;

    public static _buildingMousedOver: BFOUNDATION;

    private static tickables: Vector<ITickable>;

    private static fastTickables: Vector<ITickable>;

    public static initError: string;

    public static versionMismatch: boolean;

    /**
     * Inferno-only: the Designer draft on screen (server services/admin/designs.ts, window
     * com/monsters/admin/IoDesigner.ts): {kind, key, title, free}, from the yard's load (io_design); null on
     * any other yard. An outpost kit, a wild tribe level or a Moloch base, built with the game's own tools.
     */
    public static _ioDesign: any;

    /** The yard's size in a wild tribe or Moloch design (the map grid is 2600: GRID._mapWidth). */
    public static IO_DESIGN_YARD: int; // const

    /**
     * Inferno-only: a run of Hellgate Defense, the tower defense minigame, on screen (com/monsters/td/IoTd.ts;
     * server services/td/hellgate.ts): {arena: {half, wall, gap, hall: [X, Y, size], spawn: [X, Y], walls},
     * started}, from the yard's load (io_td); null on any other yard. The arena is a yard of its own, no one's
     * real one: it counts as a design (ioDesignMode, ioDesignFree: no wild attacks, warts, quests or pets; no
     * building limits or yard edge; building is free and at once, the run's gold paying for the towers).
     */
    public static _ioTd: any;

    /**
     * Per-building loot caps sent with the yard being attacked (base load field io_lootcap).
     * 0 means the yard brought none and the stock wild-monster caps apply. Set on every base load.
     */
    public static ioLootCapSilo: number;

    public static ioLootCapHall: number;

    /** What a devil outpost may build, indexed by outpost hall level like OUTPOST_YARD_PROPS. */
    private static IO_OUTPOST_QUANTITY: any; // const

    private static _ioAnnounceSeen: string;

    private static _ioShinyApproved: boolean;

    private static _ioOutdatedShown: boolean;

    /**
     * Inferno-only version control, for a game that was already open when a new client was published:
     * every base load carries the build the server now serves (flag io_build). An older client stops
     * here, at a yard change, before it sends the new server anything it may not understand.
     * (A client that is outdated when it starts is refused at /init, on the login screen.)
     */
    private static _ioSessionEnded: boolean;

    /**
     * Inferno-only flags that belong to the player, not to the yard on screen. A server reply that leaves
     * them out (an older server, a yard the server did not count as theirs) used to wipe them, and the
     * Invite Friends button then said invites were disabled. They are kept until the server sends new ones.
     */
    private static IO_STICKY_FLAGS: any[]; // const

    static {
        as3.lazyStatics(this, { serverUrl: null, cdnUrl: null, apiVersionSuffix: null, connectionCounter: 0, connectionLost: false, _local: false, _save: false, textContentLoaded: false, supportedLangsLoaded: false, _localMode: 0, _version: null, _softversion: 0, _aiDesignMode: false, DOES_USE_SCROLL: false, _mapVersion: 0, _mailVersion: 0, _soundVersion: 0, _languageVersion: 0, _halt: false, _frameNumber: 0, _friendCount: 0, _sessionCount: 0, _addTime: 0, _proTip: null, _checkPromo: 0, _giveTips: 0, _ROOT: null, _layerMap: null, _layerUI: null, _layerWindows: null, _layerMessages: null, _layerProjectiles: null, _layerTop: null, _fluidWidthEnabled: false, _SCREENINIT: null, _SCREEN: null, _SCREENCENTER: null, _SCREENHUD: null, _SCREENHUDLEFT: null, t: 0, _baseURL: null, _baseURL2: null, _infBaseURL: null, _apiURL: null, _gameURL: null, _storageURL: null, languageUrl: null, _allianceURL: null, _soundPathURL: null, _mapURL: null, _statsURL: null, _countryCode: null, _appid: null, _tpid: null, _currencyURL: null, _monetized: 0, _shinyShroomCount: 0, _shinyShrooms: null, _shinyShroomValid: false, _allianceConquestTime: null, _fbdata: null, _openBase: null, _degtorad: NaN, _radtodeg: NaN, _selectedBuilding: null, _newBuilding: null, _render: false, _mode: null, _loadmode: null, INFERNO_ONLY: false, _ioPendingKit: null, _ioKitRequestSent: false, _ioKitDeadline: 0, _ioOutpostProps: null, _ioPropsTuned: false, e_BASE_MODE: null, _mapWidth: 0, _mapHeight: 0, _resourceNames: null, iresourceNames: null, _bTownhall: null, _bRadio: null, _bStore: null, _bMap: null, _bLocker: null, _bAcademy: null, _bHousing: null, _bHatchery: null, _bFlinger: null, _bCatapult: null, _bHatcheryCC: null, _bJuicer: null, _bBaiter: null, _bYardPlanner: null, _bSiegeLab: null, _bSiegeFactory: null, _bChamber: null, _bLab: null, _bCage: null, _bTower: null, _bTotem: null, _bTowerCount: 0, _newThings: false, _reloadonerror: false, _catchup: false, _researchTime: NaN, _buildTime: NaN, _upgradePacking: NaN, _hatcheryOverdrive: 0, _hatcheryOverdrivePower: null, _harvesterOverdrive: 0, _harvesterOverdrivePower: null, _extraHousing: 0, _extraHousingPower: null, _lockerOverdrive: 0, _towerOverdrive: null, _monsterOverdrive: null, _attackerMonsterOverdrive: null, _playerMonsterOverdrive: null, _monsterDefenseOverdrive: null, _attackerMonsterDefenseOverdrive: null, _playerMonsterDefenseOverdrive: null, _monsterSpeedOverdrive: null, _attackerMonsterSpeedOverdrive: null, _playerMonsterSpeedOverdrive: null, _designSlots: 0, _creepCount: 0, _timekeeper: null, _buildingProps: null, _mr2BuildingProps: null, k_STAGE_FPS: 0, _fps: 0, _FPSframecount: 0, _FPStimestamp: 0, _FPSarray: null, _mapHome: null, _mapOutpost: null, _mapOutpostIDs: null, _wmCreaturePowerups: null, _wmCreatureLevels: null, _playerGuardianData: null, _playerCatapultLevel: null, _playerFlingerLevel: null, _attackersResources: null, _hpAttackersResources: null, _attackersCredits: null, _attackersFlinger: 0, _attackersCatapult: 0, _currentCell: null, _empireDestroyed: 0, _empireDestroyedShown: false, _savedAttackersDeltaResources: null, _attackersDeltaResources: null, _attackerMapResources: null, _attackerCellsInRange: null, _attackerMapCreaturesStart: null, _homeBaseID: NaN, _showMapWaiting: 0, _nextOutpostWaiting: 0, _toggleYardWaiting: 0, _resources: null, _hpResources: null, _yardResources: null, _loops: 0, _maxLoops: 0, IO_STEP_BUDGET_MS: NaN, IO_MAX_CATCHUP: 0, _ioStepCost: NaN, _loopsBanked: 0, ioStepScale: NaN, lastTime: NaN, _zoomed: false, _timePlayed: 0, _flags: null, _unreadMessages: 0, _promptedInvite: false, _promptedAFK: false, _canInvite: false, _ioInviteSeen: false, _canGift: false, _whatsnewid: 0, _lastWhatsNew: 0, _mr2TutorialId: 0, _afktimer: null, _oldMousePoint: null, _otherStats: null, _baseLoads: 0, _averageAltitude: null, _outpostCapacity: null, _displayedPromoNew: false, _fbPromoTimer: NaN, _fbcncp: 0, _credits: null, ERROR_OOPS_ONLY: 0, ERROR_OOPS_AND_ORANGE_BOX: 0, ERROR_ORANGE_BOX_ONLY: 0, TIME_ELAPSED_THRESHHOLD: NaN, eventDispatcher: null, debugLogJSCalls: false, m_mapRoomFunctional: false, _showStreamlinedSpeedUps: false, ioOnPhone: false, _magnification: NaN, __: 0, ___: 0, _blockerList: null, _MAGNIFICATION_BOUNDS: null, _player: null, _attackingPlayer: null, k_MAX_NUMBER_OF_OUTPOSTS: 0, _buildingMousedOver: null, tickables: null, fastTickables: null, initError: null, versionMismatch: false, _ioDesign: null, IO_DESIGN_YARD: 0, _ioTd: null, ioLootCapSilo: NaN, ioLootCapHall: NaN, IO_OUTPOST_QUANTITY: null, _ioAnnounceSeen: null, _ioShinyApproved: false, _ioOutdatedShown: false, _ioSessionEnded: false, IO_STICKY_FLAGS: null }, () => {
            GLOBAL.serverUrl = as3.str(CONFIG.SERVER_URL);
            GLOBAL.cdnUrl = as3.str(CONFIG.CDN_URL);
            GLOBAL.apiVersionSuffix = "v1.7.3-beta";
            GLOBAL.connectionLost = false;
            GLOBAL._local = false;
            GLOBAL._save = true;
            GLOBAL.textContentLoaded = false;
            GLOBAL.supportedLangsLoaded = false;
            GLOBAL._localMode = BYMConfig.k_sLOCAL_MODE_PREVIEW;
            GLOBAL._version = new SecNum(128);
            GLOBAL.DOES_USE_SCROLL = false;
            GLOBAL._checkPromo = 1;
            GLOBAL._giveTips = 1;
            GLOBAL._fluidWidthEnabled = true;
            GLOBAL._SCREENINIT = new Rectangle(0, 0, 760, 670);
            GLOBAL._countryCode = "us";
            GLOBAL._shinyShroomCount = 0;
            GLOBAL._shinyShrooms = [];
            GLOBAL._shinyShroomValid = false;
            GLOBAL._allianceConquestTime = new SecNum(0);
            GLOBAL._openBase = null;
            GLOBAL._degtorad = 0.0174532925;
            GLOBAL._radtodeg = 57.2957795;
            GLOBAL.INFERNO_ONLY = true;
            GLOBAL._ioPendingKit = null;
            GLOBAL._ioKitRequestSent = false;
            GLOBAL._ioKitDeadline = 0;
            GLOBAL._ioOutpostProps = null;
            GLOBAL._ioPropsTuned = false;
            GLOBAL.e_BASE_MODE = new EnumBaseMode();
            GLOBAL.iresourceNames = ["#r_bone#", "#r_coal#", "#r_sulfur#", "#r_magma#", "#r_shiny#", "#r_time#"];
            GLOBAL._hatcheryOverdrivePower = new SecNum(0);
            GLOBAL._harvesterOverdrivePower = new SecNum(0);
            GLOBAL._extraHousingPower = new SecNum(0);
            GLOBAL._towerOverdrive = new SecNum(0);
            GLOBAL._monsterOverdrive = new SecNum(0);
            GLOBAL._attackerMonsterOverdrive = new SecNum(0);
            GLOBAL._playerMonsterOverdrive = new SecNum(0);
            GLOBAL._monsterDefenseOverdrive = new SecNum(0);
            GLOBAL._attackerMonsterDefenseOverdrive = new SecNum(0);
            GLOBAL._playerMonsterDefenseOverdrive = new SecNum(0);
            GLOBAL._monsterSpeedOverdrive = new SecNum(0);
            GLOBAL._attackerMonsterSpeedOverdrive = new SecNum(0);
            GLOBAL._playerMonsterSpeedOverdrive = new SecNum(0);
            GLOBAL._mr2BuildingProps = null;
            GLOBAL.k_STAGE_FPS = 24;
            GLOBAL._FPSframecount = 0;
            GLOBAL._FPSarray = [];
            GLOBAL._mapOutpost = [];
            GLOBAL._mapOutpostIDs = [];
            GLOBAL._wmCreaturePowerups = new Array();
            GLOBAL._wmCreatureLevels = new Array();
            GLOBAL._playerGuardianData = new Vector<any>(0, false, Object);
            GLOBAL._playerCatapultLevel = new SecNum(0);
            GLOBAL._playerFlingerLevel = new SecNum(0);
            GLOBAL._attackerMapResources = {};
            GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
            GLOBAL._attackerMapCreaturesStart = {};
            GLOBAL._showMapWaiting = 0;
            GLOBAL._nextOutpostWaiting = 0;
            GLOBAL._toggleYardWaiting = 0;
            GLOBAL._resources = {};
            GLOBAL._hpResources = {};
            GLOBAL._yardResources = {};
            GLOBAL._loops = 10;
            GLOBAL._maxLoops = 800;
            GLOBAL.IO_STEP_BUDGET_MS = 30;
            GLOBAL.IO_MAX_CATCHUP = 12;
            GLOBAL._ioStepCost = 0;
            GLOBAL._loopsBanked = 0;
            GLOBAL.ioStepScale = 1;
            GLOBAL._zoomed = false;
            GLOBAL._timePlayed = 0;
            GLOBAL._promptedInvite = false;
            GLOBAL._promptedAFK = false;
            GLOBAL._canInvite = false;
            GLOBAL._ioInviteSeen = false;
            GLOBAL._canGift = false;
            GLOBAL._whatsnewid = 0;
            GLOBAL._lastWhatsNew = 1048;
            GLOBAL._afktimer = new SecNum(0);
            GLOBAL._oldMousePoint = new Point(0, 0);
            GLOBAL._otherStats = {};
            GLOBAL._baseLoads = 0;
            GLOBAL._averageAltitude = new SecNum(125);
            GLOBAL._fbPromoTimer = 60 * 60 * 24 * 7;
            GLOBAL.ERROR_OOPS_ONLY = 0;
            GLOBAL.ERROR_OOPS_AND_ORANGE_BOX = 1;
            GLOBAL.ERROR_ORANGE_BOX_ONLY = 2;
            GLOBAL.TIME_ELAPSED_THRESHHOLD = 300000;
            GLOBAL.eventDispatcher = new EventDispatcher();
            GLOBAL.debugLogJSCalls = false;
            GLOBAL.m_mapRoomFunctional = true;
            GLOBAL._showStreamlinedSpeedUps = false;
            GLOBAL.ioOnPhone = false;
            GLOBAL._magnification = 1;
            GLOBAL._blockerList = [];
            GLOBAL._MAGNIFICATION_BOUNDS = new Point(0.6, 2.75);
            GLOBAL.k_MAX_NUMBER_OF_OUTPOSTS = 3500;
            GLOBAL.initError = "";
            GLOBAL.versionMismatch = false;
            GLOBAL._ioDesign = null;
            GLOBAL.IO_DESIGN_YARD = 2400;
            GLOBAL._ioTd = null;
            GLOBAL.ioLootCapSilo = 0;
            GLOBAL.ioLootCapHall = 0;
            GLOBAL.IO_OUTPOST_QUANTITY = { 1: [0, 4], 2: [0, 4], 3: [0, 4], 4: [0, 4], 5: [0, 1], 9: [0, 1], 10: [0, 1], 13: [0, 2], 16: [0, 1], 17: [0, 200], 21: [0, 4], 24: [0, 40], 117: [0, 2], 128: [0, 1], 129: [0, 4], 130: [0, 4], 132: [0, 4], 144: [0, 2], 145: [0, 2] };
            GLOBAL._ioAnnounceSeen = null;
            GLOBAL._ioShinyApproved = false;
            GLOBAL._ioOutdatedShown = false;
            GLOBAL._ioSessionEnded = false;
            GLOBAL.IO_STICKY_FLAGS = ["io_invite", "io_invite_shiny", "io_invite_download", "io_invite_counts", "io_streak", "io_basilisk"];
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    /** Inferno-only (5 October, the user's): an outpost's workers, 2 (the stock game's outposts have 1). */
    public static ioOutpostWorkers(): int {
        return GLOBAL.INFERNO_ONLY ? 2 : 1;
    }

    /*
     * Initializes the game by loading server configuration data.
     * If the server response contains a `debugMode` property, it enables AI design mode
     * and initializes the console.
     *
     * @return void
     */
    public static init(ioAttempt: int = 0): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "init", [["apiVersion", GLOBAL.apiVersionSuffix], ["build", String(IOBuild.stamp)], ["web", "1"]], (serverData: any): void => {
            let stage: Stage = GAME._instance.stage;

            if (serverData.hasOwnProperty("error")) {
                GLOBAL.initError = as3.str(serverData.error);
                GLOBAL.versionMismatch = !(!serverData.versionMismatch);
                GLOBAL.eventDispatcher.dispatchEvent(new Event("initError"));
                return;
            }
            GLOBAL.LanguageSetup();
            if (serverData.hasOwnProperty("debugMode")) {
                GLOBAL._aiDesignMode = Boolean(serverData.debugMode);
                Console.initialize(stage);
            }
        }, (error: IOErrorEvent): void => {
            // Inferno-only: a phone's connection that drops for a moment as the page opens (bug #59)
            // tries again three times, two seconds apart, before "Failed to connect".
            if (GLOBAL.INFERNO_ONLY && ioAttempt < 3) {
                setTimeout((): void => {
                    GLOBAL.init((ioAttempt + 1) | 0);
                }, 2000);
                return;
            }
            GLOBAL.initError = "Failed to connect to the server.";
            GLOBAL.eventDispatcher.dispatchEvent(new Event("initError"));
            return;
        });
    }

    /**
     * Halts the game loop, preventing any further updates or interactions.
     * This should be called in situations where a fatal error has occurred and the game cannot continue functioning properly.
     */
    public static Halt(): void {
        GLOBAL._halt = true;
    }

    /**
     * Returns whether the game is currently halted due to a fatal error.
     */
    public static get isHalted(): boolean {
        return GLOBAL._halt;
    }

    /*
     * Checks the network connection by making a request to the server.
     * Updates the `connectionLost` status based on the response.
     * Displays a "No Connection" popup if the connection is lost.
     *
     * @param event - The TimerEvent that triggers this function.
     * @return void
     */
    /** Inferno-only (QoL #3): failed connection checks in a row, and how many stop the game. */
    public static _ioNetFails: int = 0;
    public static readonly IO_NET_TRIES: int = 3;

    /** Inferno-only (QoL #208): one /connection check, answered or not. */
    public static ioPing(onOk: Function, onFail: Function): void {
        let loader: URLLoader = new URLLoader();
        let request: URLRequest = new URLRequest(GLOBAL.serverUrl + "connection");
        request.method = URLRequestMethod.GET;
        loader.addEventListener(Event.COMPLETE, (e: Event): void => onOk());
        loader.addEventListener(IOErrorEvent.IO_ERROR, (e: IOErrorEvent): void => onFail());
        try {
            loader.load(request);
        } catch (error) {
            onFail();
        }
    }

    public static CheckNetworkConnection(event: TimerEvent): void {
        let loader: URLLoader = null;
        let onComplete: Function = null;
        let onError: Function = null;
        let url: string = GLOBAL.serverUrl + "connection";
        let request: URLRequest = new URLRequest(url);
        request.method = URLRequestMethod.GET;

        loader = new URLLoader();

        onComplete = (event: Event): void => {
            loader.removeEventListener(Event.COMPLETE, onComplete);
            loader.removeEventListener(IOErrorEvent.IO_ERROR, onError);
            GLOBAL.connectionLost = false;
            GLOBAL._ioNetFails = 0;
        };

        onError = (event: IOErrorEvent): void => {
            loader.removeEventListener(Event.COMPLETE, onComplete);
            loader.removeEventListener(IOErrorEvent.IO_ERROR, onError);
            // Inferno-only (14 October, QoL #3): one failed check is a Wi-Fi blip or a phone changing
            // masts, not a lost connection. Ask again after 3 s, then 6 s; stop the game only after three
            // failures in a row (about 10 s without an answer), not on the first one.
            if (GLOBAL.INFERNO_ONLY && !GLOBAL._halt && ++GLOBAL._ioNetFails < GLOBAL.IO_NET_TRIES) {
                setTimeout((): void => {
                    if (!GLOBAL._halt) {
                        GLOBAL.CheckNetworkConnection(null);
                    }
                }, 3000 * GLOBAL._ioNetFails);
                return;
            }
            GLOBAL._ioNetFails = 0;
            GLOBAL.connectionLost = true;
            POPUPS.NoConnection();
        };

        loader.addEventListener(Event.COMPLETE, onComplete);
        loader.addEventListener(IOErrorEvent.IO_ERROR, onError);

        try {
            loader.load(request);
        } catch (error) {
            GLOBAL.connectionLost = true;
            POPUPS.NoConnection();
        }
    }

    /*
     * Configures the game's language settings based on stored user preferences.
     * If a user token and language preference are available, they are applied;
     * otherwise, the default language is set to English.
     *
     * @return void
     */
    public static LanguageSetup(): void {
        let token: string = as3.str(GAME.sharedObj.data.token || GAME.token || GAME.sharedObj.data.ioAutoEmail);
        let language: string = as3.str(GAME.sharedObj.data.language);
        KEYS._storageURL = GLOBAL.languageUrl;
        KEYS.GetSupportedLanguages();

        // A token can be left in the local shared object by an earlier launcher session without a
        // language next to it. Asking the server for "null.json" fails silently and leaves the
        // login screen on "Connecting to the server" forever, so fall back to English.
        // (Inferno-only, QoL #233: the language picked before is kept with or without a login; on a first visit, the
        // browser's own, when the game has it)
        if (GLOBAL.INFERNO_ONLY) {
            KEYS.Setup(language && language != "null" ? language : GLOBAL.ioBrowserLanguage());
            return;
        }
        if (token && language) {
            KEYS.Setup(language);
        } else {
            KEYS.Setup("english");
        }
    }

    /** Inferno-only (QoL #233): the game's language for the browser's (French, Spanish, Portuguese), else English. */
    public static ioBrowserLanguage(): string {
        try {
            let list: any[] = (typeof navigator != "undefined" && navigator.languages && navigator.languages.length) ? navigator.languages.slice() : [typeof navigator != "undefined" ? navigator.language : ""];
            for (let l of list) {
                let code: string = String(l || "").toLowerCase().substr(0, 2);
                if (code == "fr") {
                    return "french";
                }
                if (code == "es") {
                    return "spanish";
                }
                if (code == "pt") {
                    return "portuguese";
                }
                if (code == "en") {
                    return "english";
                }
            }
        } catch (e) {
        }
        return "english";
    }

    public static get townHall(): BFOUNDATION {
        return GLOBAL._bTownhall;
    }

    public static setTownHall(param1: ICoreBuilding): void {
        let _loc2_: BFOUNDATION = as3.as(param1, BFOUNDATION);
        if (Boolean(GLOBAL._bTownhall) && Boolean(_loc2_)) {
        }
        if (Boolean(_loc2_) || !param1) {
            GLOBAL._bTownhall = _loc2_;
        }
    }

    public static get player(): Player {
        return GLOBAL._player;
    }

    public static set player(param1: Player) {
        GLOBAL._player = param1;
    }

    public static get attackingPlayer(): Player {
        return GLOBAL._attackingPlayer;
    }

    public static set attackingPlayer(param1: Player) {
        GLOBAL._attackingPlayer = param1;
        if (Boolean(GLOBAL._attackingPlayer) && GLOBAL._attackingPlayer != GLOBAL.player) {
            GLOBAL._attackingPlayer.isAttacking = true;
        }
    }

    public static get mode(): string {
        return GLOBAL._mode;
    }

    public static setMode(param1: string): void {
        GLOBAL._mode = param1;
    }

    public static get isInAttackMode(): boolean {
        return GLOBAL.mode === GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode === GLOBAL.e_BASE_MODE.IWMATTACK || GLOBAL.mode === GLOBAL.e_BASE_MODE.IATTACK || GLOBAL.mode === GLOBAL.e_BASE_MODE.ATTACK;
    }

    private static copyBuildingProps(param1: any): any {
        let copy: any = {};
        let key: string = null;

        for (key in param1) {
            copy[key] = param1[key];
        }
        return copy;
    }

    private static changeNotMaproom3SpecificBuildings(): void {
        GLOBAL._buildingProps[8].costs = [{ "r1": new SecNum(1000000), "r2": new SecNum(1000000), "r3": new SecNum(1000000), "r4": new SecNum(0), "time": new SecNum(43200), "re": [[14, 1, 3], [15, 1, 1]] }, { "r1": new SecNum(250000), "r2": new SecNum(250000), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(21600), "re": [[14, 1, 3], [15, 1, 1]] }, { "r1": new SecNum(500000), "r2": new SecNum(500000), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(43200), "re": [[14, 1, 3], [15, 1, 1]] }];
        GLOBAL._buildingProps[8].quantity = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1];
        GLOBAL._buildingProps[14].costs = [{ "r1": new SecNum(2160), "r2": new SecNum(2160), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(300), "re": [[14, 1, 1]] }, { "r1": new SecNum(8640), "r2": new SecNum(8640), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(4500), "re": [[14, 1, 3], [8, 1, 1]] }, { "r1": new SecNum(34560), "r2": new SecNum(34560), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(10800), "re": [[14, 1, 4], [8, 1, 1]] }, { "r1": new SecNum(138240), "r2": new SecNum(138240), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(28800), "re": [[14, 1, 5], [8, 1, 1]] }, { "r1": new SecNum(552960), "r2": new SecNum(552960), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(72000), "re": [[14, 1, 6], [8, 1, 1]] }, { "r1": new SecNum(2211840), "r2": new SecNum(2211840), "r3": new SecNum(0), "r4": new SecNum(0), "time": new SecNum(144000), "re": [[14, 1, 6], [8, 1, 1]] }];
        GLOBAL._buildingProps[14].capacity = [200, 260, 320, 380, 450, 540];
        GLOBAL._buildingProps[21].capacity = [380, 450, 540, 660, 800];
        GLOBAL._buildingProps[4].costs = [{ "r1": new SecNum(1000), "r2": new SecNum(1000), "r3": new SecNum(500), "r4": new SecNum(0), "time": new SecNum(900), "re": [[14, 1, 1]] }, { "r1": new SecNum(64300), "r2": new SecNum(64300), "r3": new SecNum(32150), "r4": new SecNum(0), "time": new SecNum(10800), "re": [[14, 1, 3], [11, 1, 1]] }, { "r1": new SecNum(283600), "r2": new SecNum(283600), "r3": new SecNum(141800), "r4": new SecNum(0), "time": new SecNum(32400), "re": [[14, 1, 4], [11, 1, 1]] }, { "r1": new SecNum(1247840), "r2": new SecNum(1247840), "r3": new SecNum(623920), "r4": new SecNum(0), "time": new SecNum(97200), "re": [[14, 1, 4], [11, 1, 1]] }];
        GLOBAL._buildingProps[4].capacity = [500, 1000, 1750, 2250, 3000, 4000];
    }

    /**
     * Inferno-only: a picture URL on the server with its version added, so a replaced picture is not served from a
     * cache (the browser's or the CDN's, which keep a versioned one for good). 23 October (the user's: "something is
     * still wrong with some assets ... Cloudflare caches the assets too"): the picture's own version, its content's
     * hash from the server's list (ioLoadAssetMap, /assetmap: services/assetMap.ts); before the list has come, the
     * version of all of them (flag io_assetmap); from an older server, its single number (io_assetv).
     */
    public static ioVersioned(param1: string): string {
        if (!GLOBAL.INFERNO_ONLY || !param1) {
            return param1;
        }
        let version: string = "";
        let base: string = GLOBAL._storageURL;
        if (GLOBAL._ioAssetMap && base && param1.indexOf(base) == 0) {
            let rel: string = param1.substr(base.length);
            let q: int = rel.indexOf("?");
            if (q >= 0) {
                rel = rel.substr(0, q);
            }
            version = GLOBAL._ioAssetMap[rel] ? String(GLOBAL._ioAssetMap[rel]) : "";
        }
        if (!version && GLOBAL._flags && GLOBAL._flags.io_assetmap) {
            version = String(GLOBAL._flags.io_assetmap);
        }
        if (!version) {
            let n: int = GLOBAL.ioFlag("io_assetv", 0) | 0;
            version = n > 0 ? String(n) : "";
        }
        if (!version) {
            return param1;
        }
        return param1 + (param1.indexOf("?") < 0 ? "?v=" : "&v=") + version;
    }

    /** (23 October) Each picture's version ("shop/drone.png": its hash), from /assetmap; null until it comes. */
    private static _ioAssetMap: any = null;

    /** The list's version asked for (the io_assetmap flag), so it is asked for once. */
    private static _ioAssetMapAsked: string = "";

    /** (23 October) The pictures' list asked for, once for each version the server says there is (SetFlags). */
    public static ioLoadAssetMap(version: string): void {
        if (!GLOBAL.INFERNO_ONLY || !version || version == GLOBAL._ioAssetMapAsked || !GLOBAL.serverUrl) {
            return;
        }
        GLOBAL._ioAssetMapAsked = version;
        try {
            let loader: URLLoader = new URLLoader();
            loader.addEventListener(Event.COMPLETE, (e: Event): void => {
                try {
                    let r: any = JSON.parse(String(loader.data));
                    if (r && r.files && String(r.v) == version) {
                        GLOBAL._ioAssetMap = r.files;
                    }
                } catch (err) {
                }
            });
            loader.addEventListener(IOErrorEvent.IO_ERROR, (e: Event): void => {
                // (asked again with the next flags)
                GLOBAL._ioAssetMapAsked = "";
            });
            loader.load(new URLRequest(GLOBAL.serverUrl + "assetmap?v=" + encodeURIComponent(version)));
        } catch (err) {
            GLOBAL._ioAssetMapAsked = "";
        }
    }

    /**
     * Inferno-only admin test mode (server services/admin/testMode.ts, switch next to the Admin button,
     * com/monsters/admin/IoTestMode.ts): unlimited resources and shiny, instant builds and upgrades,
     * no placement limits, every monster unlocked, practice attacks without limits, test tools.
     */
    public static ioTestMode(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL._flags != null && (GLOBAL._flags.io_testmode | 0) == 1;
    }

    public static ioDesign(): any {
        return GLOBAL.INFERNO_ONLY ? GLOBAL._ioDesign : null;
    }

    /** A Designer draft, or (Inferno-only) a Hellgate Defense run's arena: no one's real yard (see ioTd). */
    public static ioDesignMode(): boolean {
        return GLOBAL.ioDesign() != null || GLOBAL.ioTdMode();
    }

    /** A wild tribe or Moloch design: no building limits and no yard edge (kits keep an outpost's). The arena too. */
    public static ioDesignFree(): boolean {
        return GLOBAL.ioDesign() != null && (GLOBAL._ioDesign.free | 0) == 1 || GLOBAL.ioTdMode();
    }

    public static ioTdMode(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL._ioTd != null;
    }

    /**
     * Inferno-only (22 October): what harvesters make, times: Production Overdrive (POD) or the alliance's Harvest Moon,
     * whichever is the more (they never add up); 1 for neither.
     */
    public static ioHarvestMul(): number {
        let mul: number = 1;
        if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
            mul = GLOBAL._harvesterOverdrivePower.Get();
        }
        if (GLOBAL.INFERNO_ONLY && POWERUPS.ioActive(POWERUPS.ALLIANCE_HARVESTMOON)) {
            mul = Math.max(mul, POWERUPS.HARVEST_MOON_MUL);
        }
        return mul;
    }

    /**
     * Inferno-only (13 November): what harvesters of resource `r` (1-4) make, times: ioHarvestMul and the Devil's
     * Contract (IoDevil.production: Furnace Pact, Second Shift).
     */
    public static ioHarvestMulFor(r: int): number {
        let mul: number = GLOBAL.ioHarvestMul();
        if (GLOBAL.INFERNO_ONLY) {
            mul *= IoDevil.production(r);
        }
        return mul;
    }

    /**
     * What an upgrade's (or a fortification's) time is, times: Sharper Tools (BST, GLOBAL._buildTime) or the alliance's
     * Builders' Guild (Inferno-only, 22 October), whichever takes off more (they never add up).
     */
    public static ioBuildTime(): number {
        let t: number = GLOBAL._buildTime;
        if (GLOBAL.INFERNO_ONLY && POWERUPS.ioActive(POWERUPS.ALLIANCE_BUILDERSGUILD)) {
            t = Math.min(t, POWERUPS.BUILDERS_GUILD_MUL);
        }
        return t;
    }

    /** Building costs nothing and finishes at once, with no requirements: admin test mode, or any design. */
    public static ioFreeBuild(): boolean {
        return GLOBAL.ioTestMode() || GLOBAL.ioDesignMode();
    }

    /**
     * Inferno-only: a one-line text that doesn't fit its field is drawn smaller until it does, instead of
     * wrapping its end under the field where it can't be seen (a counter at 50,000,000, "Magma remaining").
     */
    public static ioFitText(field: TextField, smallest: int = 8, scale: number = 1): void {
        if (!GLOBAL.INFERNO_ONLY || !field) {
            return;
        }
        field.wordWrap = false;
        let f: TextFormat = field.getTextFormat();
        let size: int = f.size | 0;
        // (scale: a button stretched to its width stretches its label's field; the room is the stretched one)
        while (size > smallest && field.textWidth > field.width * scale - 4) {
            size--;
            f.size = size;
            field.setTextFormat(f);
        }
    }

    /** Inferno-only: a wrapped field's text drawn smaller until it fits the field's height. */
    public static ioFitHeight(field: TextField, smallest: int = 9): void {
        if (!GLOBAL.INFERNO_ONLY || !field) {
            return;
        }
        let f: TextFormat = field.getTextFormat();
        let size: int = f.size | 0;
        while (size > smallest && field.textHeight > field.height - 4) {
            size--;
            f.size = size;
            field.setTextFormat(f);
        }
    }

    /**
     * Inferno-only (27 November, the Strongbox's, the Academy's and the Incubation Control Station's descriptions cut
     * off): ioFitHeight, then, when the text still doesn't fit, a small arrow at the field's foot (in its parent):
     * a click scrolls it on (back to the top at the end), and the mouse wheel over the field scrolls it. Called again
     * whenever the field's text changes: the arrow is made once, moved, and shown only while there's more.
     */
    public static ioScrollMore(field: TextField, smallest: int = 9): void {
        if (!GLOBAL.INFERNO_ONLY || !field) {
            return;
        }
        let f: any = field;
        // (27 November: the same text again keeps where it was scrolled to: the Academy writes its monster's text
        // every second, and took it back to the top each time; a countdown in it changing is still the same text)
        let shape: string = String(field.htmlText).replace(/[0-9]+/g, "#");
        let keepAt: int = shape == f.ioMoreShape ? Math.max(1, f.ioMoreAt | 0) | 0 : 1;
        f.ioMoreShape = shape;
        f.ioMoreAt = keepAt;
        field.scrollV = 1;
        GLOBAL.ioFitHeight(field, smallest);
        if (keepAt > 1) {
            field.scrollV = Math.min(keepAt, field.maxScrollV);
        }
        let host: DisplayObjectContainer = field.parent;
        let more: boolean = field.maxScrollV > 1;
        let arrow: Sprite = f.ioMore;
        if (!arrow && host && more) {
            arrow = new Sprite();
            arrow.name = "ioDescMore";
            arrow.buttonMode = true;
            let g: any = arrow.graphics;
            g.beginFill(0xffffff, 0.92);
            g.drawRoundRect(-11, -9, 22, 18, 6, 6);
            g.endFill();
            g.beginFill(0x8a5a00);
            g.moveTo(-5, -3);
            g.lineTo(5, -3);
            g.lineTo(0, 4);
            g.endFill();
            let flip = (): void => {
                arrow.scaleY = field.scrollV >= field.maxScrollV ? -1 : 1;
                f.ioMoreAt = field.scrollV;
            };
            f.ioMoreFlip = flip;
            arrow.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                field.scrollV = field.scrollV >= field.maxScrollV ? 1 : field.scrollV + 3;
                flip();
                e.stopPropagation();
            });
            host.addEventListener(MouseEvent.MOUSE_WHEEL, (e: MouseEvent): void => {
                if (field.maxScrollV > 1 && field.stage && field.hitTestPoint(e.stageX, e.stageY, false)) {
                    field.scrollV = field.scrollV + (e.delta > 0 ? -1 : 1);
                    flip();
                    (e as any).$ioWheeled = true;
                }
            });
            // (27 November: on a phone, a finger dragging the text scrolls it too, a line every 12 pixels)
            let moved: number = 0;
            IoPinchZoom.swipe(field, (d: number): void => {
                moved += d;
                while (Math.abs(moved) >= 12) {
                    field.scrollV = field.scrollV + (moved > 0 ? -1 : 1);
                    moved += moved > 0 ? -12 : 12;
                }
                flip();
            });
            f.ioMore = arrow;
        }
        if (!arrow) {
            return;
        }
        if (host && arrow.parent != host) {
            host.addChild(arrow);
        }
        arrow.x = field.x + field.width - 14;
        arrow.y = field.y + field.height - 9;
        arrow.visible = more && field.visible;
        if (f.ioMoreFlip) {
            f.ioMoreFlip();
        }
    }

    /** Any number of any building: admin test mode, or a wild tribe / Moloch design. */
    public static ioNoLimits(): boolean {
        return GLOBAL.ioTestMode() || GLOBAL.ioDesignFree();
    }

    public static ioFlag(param1: string, param2: number): number {
        if (GLOBAL._flags && GLOBAL._flags.hasOwnProperty(param1) && Number(GLOBAL._flags[param1]) > 0) {
            return Number(GLOBAL._flags[param1]);
        }
        return param2;
    }

    /** Bone / coal / sulfur harvester output multiplier (server flag io_resmult). */
    public static get ioResourceMultiplier(): number {
        return GLOBAL.ioFlag("io_resmult", 2);
    }

    /** Magma harvester output multiplier (server flag io_magmamult). */
    public static get ioMagmaMultiplier(): number {
        return GLOBAL.ioFlag("io_magmamult", 4);
    }

    /** Build and upgrade timers are divided by this (server flag io_timediv). */
    public static get ioTimeDivisor(): number {
        return GLOBAL.ioFlag("io_timediv", 4);
    }

    /**
     * Inferno-only: how the map prints a world coordinate. Plain numbers, 0 to 399 (the user's, 4 October;
     * they were shown as negatives, "depths below the surface", until then). The Depths of Hell print their
     * own numbers, 0 to 9 (IoUnderworld.label).
     */
    public static ioCoord(param1: int): string {
        return String(param1);
    }

    /**
     * Stock outposts cannot recycle buildings or cancel construction. Only in the Designer (an admin's
     * outpost kit draft, IoDesigner) can they, so kit layouts can be reworked; never in a player's outpost.
     * (It was a server switch, io_outpostrecycle / outpostRecycling, until 29 September.)
     * The outpost hall itself can never be recycled either way.
     */
    public static get outpostRecycling(): boolean {
        return GLOBAL.ioDesignMode();
    }

    /**
     * Test switch (server flag io_kitpagetest = 1): while no custom kits exist, the kit popup
     * shows the three stock kits on two pages, so paging can be checked before any kit is made.
     */
    public static get kitPagingTest(): boolean {
        return Boolean(Boolean(GLOBAL._flags) && GLOBAL._flags.hasOwnProperty("io_kitpagetest") && (GLOBAL._flags.io_kitpagetest | 0) == 1);
    }

    /**
     * Outpost kits are applied by the server (POST worldmapv2/applykit): it wipes the outpost and
     * writes the kit's buildings into it. Called once the kit has been paid for; GLOBAL.Tick waits
     * for that payment to be saved, sends the request with saving blocked, and ioKitApplied then
     * loads the outpost again from the server.
     */
    public static ioApplyKit(param1: any, pay: any = null): void {
        GLOBAL._ioPendingKit = param1;
        // (18 October) the kit's price, paid by the server with the build (it was paid in the save before it, so a
        // kit could be built without paying): {r: [bone, coal, sulfur], s: Shiny agreed to, n: this payment, o: 1
        // resources only}. Its name keeps a build sent again ("Try again", a lost answer) from paying twice.
        GLOBAL._ioPendingKitPay = pay ? JSON.stringify({ "r": pay.r, "s": pay.s | 0, "n": GLOBAL.ioPayName(), "o": pay.o | 0 }) : null;
        GLOBAL._ioKitRequestSent = false;
        GLOBAL._ioKitDeadline = (GLOBAL.Timestamp() + 30) | 0;
        // (QoL #235: in the player's language)
        PLEASEWAIT.Show(KEYS.Get("io_tr_glb_kit_building"));
        BASE.Save();
    }

    private static ioKitApplied(param1: any): void {
        let kit: any = GLOBAL._ioPendingKit;
        GLOBAL._ioPendingKit = null;
        GLOBAL._ioKitRequestSent = false;
        if (param1 && param1.error == 0) {
            GLOBAL._ioKitTries = 0;
            GLOBAL._ioPendingKitPay = null;
            // _blockSave stays on: BASE.Setup clears it once the fresh yard is loading.
            BASE.LoadBase(null, 0, BASE._loadedBaseID, GLOBAL.e_BASE_MODE.BUILD, false, BASE.yardType);
        } else {
            GLOBAL._ioPendingKit = kit;
            GLOBAL.ioKitFailed(param1);
        }
    }

    /** (18 October) the pending kit's price, as sent with its build (worldmapv2/applykit `pay`). */
    public static _ioPendingKitPay: string = null;

    /** A name for one payment (a kit's): the server charges each name once. */
    public static ioPayName(): string {
        return "k" + GLOBAL.Timestamp().toString(36) + Math.floor(Math.random() * 2176782336).toString(36) + Math.floor(Math.random() * 2176782336).toString(36);
    }

    /** Inferno-only (QoL #425): tries of the kit's build request so far (it is sent again by itself twice). */
    public static _ioKitTries: int = 0;

    /**
     * Inferno-only (14 October, QoL #425): the kit is paid before it is built (two requests). When the build was
     * refused or got no answer, the old message said "reload and try again": the payment had been saved, so the
     * player paid and got nothing. Now a lost answer is sent again (twice, by itself: building a kit twice gives
     * the same yard), and then the reason is shown with "Try again", which builds what was paid for without
     * charging again.
     */
    private static ioKitFailed(param1: any = null): void {
        let kit: any = GLOBAL._ioPendingKit;
        GLOBAL._ioKitRequestSent = false;
        let reason: string = param1 && param1.error ? String(param1.error) : "";
        LOGGER.Log("err", "applykit failed" + (reason ? ": " + reason : ""));
        if (kit && !reason && ++GLOBAL._ioKitTries < 3) {
            GLOBAL._ioKitDeadline = (GLOBAL.Timestamp() + 30) | 0;
            return;
        }
        GLOBAL._ioPendingKit = null;
        GLOBAL._ioKitTries = 0;
        BASE._blockSave = false;
        PLEASEWAIT.Hide();
        if (!kit) {
            GLOBAL.Message(KEYS.Get("io_tr_glb_kit_failed")); // (QoL #235)
            return;
        }
        GLOBAL.Message(KEYS.Get(reason ? "io_kit_failed_reason" : "io_kit_failed", { "v1": reason }), KEYS.Get("io_kit_retry"), (): void => {
            GLOBAL._ioPendingKit = kit;
            GLOBAL._ioKitRequestSent = false;
            GLOBAL._ioKitDeadline = (GLOBAL.Timestamp() + 30) | 0;
            PLEASEWAIT.Show(KEYS.Get("io_tr_glb_kit_building")); // (QoL #235)
        });
    }

    /**
     * The Wild Monster Invasions switched off (server flag io_invasions = 0: infernoOnlyConfig.invasions; 9 October):
     * no invasion popups, countdown, next-wave bar or waves. SPECIALEVENT (WMI 2) and SPECIALEVENT_WM1 (WMI 1) stay
     * whole, for an Inferno-styled invasion later.
     */
    public static get ioInvasionsOff(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && Boolean(GLOBAL._flags) && GLOBAL._flags.hasOwnProperty("io_invasions") && (GLOBAL._flags.io_invasions | 0) == 0);
    }

    /** Rezghul in the Inferno (server flag io_rezghul = 1). */
    public static get ioRezghul(): boolean {
        return Boolean(GLOBAL.INFERNO_ONLY && Boolean(GLOBAL._flags) && GLOBAL._flags.hasOwnProperty("io_rezghul") && (GLOBAL._flags.io_rezghul | 0) == 1);
    }

    /** A shiny price set on the server (InfernoOnlyConfig.prices, flags io_price_*); the stock value otherwise. */
    /**
     * The main yard's Map Room can open the map: built, and working; Inferno-only (18 October, the user's): or wrecked
     * (an attack can leave it so, and the map is the way to everything else meanwhile), once it has been built.
     */
    public static ioMapRoomWorks(): boolean {
        return Boolean(GLOBAL._bMap) && (GLOBAL._bMap._canFunction || GLOBAL.INFERNO_ONLY && GLOBAL._bMap._lvl.Get() > 0);
    }

    public static ioPrice(param1: string, param2: number): number {
        return GLOBAL.INFERNO_ONLY ? Number(GLOBAL.ioFlag("io_price_" + param1, param2)) : param2;
    }

    /** A list of shiny prices from the server, or null. */
    public static ioPriceList(param1: string): any[] {
        let raw: any = GLOBAL.INFERNO_ONLY && GLOBAL._flags ? GLOBAL._flags["io_price_" + param1] : null;
        if (as3.is(raw, Array)) {
            return as3.as(raw, Array);
        }
        if (as3.is(raw, String) && String(raw) != "") {
            try {
                return as3.as(JSON.parse(String(raw)), Array);
            } catch (e) {
            }
        }
        return null;
    }

    /**
     * Inferno-only (QoL #311): on a phone, the chat and the quest dock (`chatmin`, `missionmin`) start folded (at
     * 844x390 together they hid about 40% of the screen) and are then as the player leaves them on that phone: the
     * phone keeps its own (in the browser), so folding them there doesn't fold them on the computer: StatGet and
     * StatSet answer from the phone's own for those two.
     */
    private static ioPhoneStat(stat: string): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.ioOnPhone && (stat == "chatmin" || stat == "missionmin");
    }

    /** The phone's own value of `stat` (folded, 1, until the player opens it there), or null to set it. */
    private static ioPhoneValue(stat: string, value: any = null): int {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let key: string = "ioPhone_" + stat;
            if (value != null) {
                so.data[key] = value | 0;
                so.flush();
                return value | 0;
            }
            return so.data[key] != null ? so.data[key] | 0 : 1;
        } catch (e) {
        }
        return 1;
    }

    /**
     * Inferno-only (14 October, QoL #571): one short duration format: the two largest units in the
     * language's own letters ("2d 5h", "3h 12m", "4m 05s", "12s"); seconds only under 10 minutes.
     */
    /** Inferno-only (QoL #551, #557): a touch screen with no mouse (a test sets ioTouchOverride: 1 touch, 0 not). */
    public static ioTouchOverride: number = -1;

    public static get ioTouch(): boolean {
        if (GLOBAL.ioTouchOverride >= 0) {
            return GLOBAL.ioTouchOverride == 1;
        }
        return Capabilities.touchscreenType == "finger" || GLOBAL.ioOnPhone;
    }

    /** Inferno-only (QoL #567): the next UTC midnight, on the player's clock ("09:00"). */
    public static ioNewDayAt(): string {
        let next: number = (Math.floor(GLOBAL.Timestamp() / 86400) + 1) * 86400;
        let at: Date = new Date(next * 1000);
        return (at.getHours() < 10 ? "0" : "") + at.getHours() + ":" + (at.getMinutes() < 10 ? "0" : "") + at.getMinutes();
    }

    /** Inferno-only (QoL #567): "New day in 5h 12m (at 09:00 your time)", wherever "today" is the UTC day. */
    public static ioNewDayLine(): string {
        let now: number = GLOBAL.Timestamp();
        let next: number = (Math.floor(now / 86400) + 1) * 86400;
        return KEYS.Get("io_newday", { "v1": GLOBAL.ioDuration(next - now), "v2": GLOBAL.ioNewDayAt() });
    }

    /**
     * Inferno-only (22 October): a moment (seconds) in the player's own clock and language, "Sat 8:00 PM", or with the
     * date when it is a week or more away.
     */
    public static ioClock(seconds: number, withDay: boolean = true): string {
        let lang: string = ({ "english": "en", "french": "fr", "spanish": "es", "portuguese": "pt-BR" } as any)[String(KEYS.ioLanguage)] || "en";
        let o: any = { "hour": "numeric", "minute": "2-digit" };
        if (withDay) {
            o.weekday = "short";
        }
        try {
            return new Intl.DateTimeFormat(lang, o).format(new Date(seconds * 1000));
        } catch (e) {
            return new Date(seconds * 1000).toLocaleString();
        }
    }

    public static ioDuration(seconds: number): string {
        let s: int = Math.max(0, Math.floor(seconds)) | 0;
        let d: int = Math.floor(s / 86400) | 0;
        let h: int = Math.floor((s % 86400) / 3600) | 0;
        let m: int = Math.floor((s % 3600) / 60) | 0;
        let sec: int = s % 60;
        let D: string = KEYS.Get("global_days_short"), H: string = KEYS.Get("global_hours_short");
        let M: string = KEYS.Get("global_minutes_short"), S: string = KEYS.Get("global_seconds_short");
        if (d > 0) {
            return d + D + (h > 0 ? " " + h + H : "");
        }
        if (h > 0) {
            return h + H + (m > 0 ? " " + m + M : "");
        }
        if (m >= 10) {
            return m + M;
        }
        if (m > 0) {
            return m + M + " " + (sec < 10 ? "0" : "") + sec + S;
        }
        return sec + S;
    }

    /** Seconds under which a timer finishes for free ("Close enough"). */
    public static get ioCloseEnough(): int {
        return GLOBAL.ioPrice("closeenough", 300) | 0;
    }

    /** What one Rezghul costs to hatch, in magma (server flag io_rezghulcost). */
    public static get ioRezghulCost(): int {
        return GLOBAL.ioFlag("io_rezghulcost", 500000) | 0;
    }

    /**
     * Which store item enlarges this yard, and how often it has been bought. The overworld uses ENL
     * (6 steps); the Inferno, and so every yard of an inferno-only build, uses ENLI (5 steps).
     * The Yard Planner asked for ENL only, so Inferno expansions never showed up in it.
     */
    public static get yardExpansionItem(): string {
        return BASE.isInfernoMainYardOrOutpost ? "ENLI" : "ENL";
    }

    public static get yardExpansionsBought(): int {
        let _loc1_: any = STORE._storeData ? STORE._storeData[GLOBAL.yardExpansionItem] : null;
        return _loc1_ ? _loc1_.q | 0 : 0;
    }

    public static get yardExpansionsMax(): int {
        let _loc1_: any = STORE._storeItems ? STORE._storeItems[GLOBAL.yardExpansionItem] : null;
        return _loc1_ && _loc1_.c ? _loc1_.c.length | 0 : 6;
    }

    /** Whether the server asked for a piece of UI to be hidden (flag io_hideui, comma separated names). */
    public static ioUiHidden(param1: string): boolean {
        if (!GLOBAL._flags || !GLOBAL._flags.hasOwnProperty("io_hideui") || !GLOBAL._flags.io_hideui) {
            return false;
        }
        return ("," + String(GLOBAL._flags.io_hideui) + ",").indexOf("," + param1 + ",") != -1;
    }

    /** Alliances can be switched off by the server (flag io_alliances = 0). On when the flag is absent. */
    public static get alliancesEnabled(): boolean {
        return !(GLOBAL._flags && GLOBAL._flags.hasOwnProperty("io_alliances") && (GLOBAL._flags.io_alliances | 0) == 0);
    }

    /** Seconds needed to hatch any monster (server flag io_hatch). */
    public static get ioHatchSeconds(): number {
        // Admin test mode (and the Designer): hatched at once.
        if (GLOBAL.ioFreeBuild()) {
            return 0;
        }
        return GLOBAL.ioFlag("io_hatch", 1);
    }

    /** Divides a plain array of durations (repairTime) in place. */
    private static ioScaleDurations(param1: any[], param2: number): void {
        let _loc3_: int = 0;
        if (!param1 || param2 <= 1) {
            return;
        }
        while (_loc3_ < param1.length) {
            param1[_loc3_] = Math.max(1, Math.ceil(Number(param1[_loc3_]) / param2));
            _loc3_++;
        }
    }

    private static ioScaleCosts(param1: any[], param2: number): void {
        let _loc3_: any = null;
        if (!param1 || param2 <= 1) {
            return;
        }
        for (_loc3_ of as3.values(param1)) {
            if (_loc3_ && _loc3_.time instanceof SecNum) {
                (as3.as(_loc3_.time, SecNum)).Set(Math.max(1, Math.ceil((as3.as(_loc3_.time, SecNum)).Get() / param2)));
            }
        }
    }

    /**
     * One-time tuning of the Inferno prop tables: faster build timers, boosted harvesters,
     * and the Map Room + Yard Planner made buildable. Runs on the first base load, after
     * the server flags have arrived.
     */
    private static ioTuneProps(): void {
        let _loc1_: any = null;
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        if (GLOBAL._ioPropsTuned) {
            return;
        }
        GLOBAL._ioPropsTuned = true;
        let _loc4_: any[] = INFERNOYARDPROPS._infernoYardProps;
        // What each Inferno defence hits, as the overworld table records it (1 ground, 2 air, 3 both).
        // The Inferno table left it out, so the Yard Planner drew no range circle for any Inferno
        // tower (only traps, which it finds another way). Taken from the towers' own targeting:
        // BTOWER._targetFlyerMode, and the Compound's defenders go after ground, then air.
        let ioAttackTypes: any = { "21": 3, "128": 3, "129": 1, "130": 1, "132": 3, "144": 3, "145": 3 };
        let ioAttackId: string = null;
        for (ioAttackId in ioAttackTypes) {
            if (_loc4_[(Number(ioAttackId) | 0) - 1] && !_loc4_[(Number(ioAttackId) | 0) - 1].attackType) {
                _loc4_[(Number(ioAttackId) | 0) - 1].attackType = ioAttackTypes[ioAttackId];
            }
        }
        // (11 November) The Soul Crucible is offered only where the server has it (it sends the flag io_crucible): a
        // game published before its server is updated would otherwise offer a building that server does not know.
        if (_loc4_[SOULCRUCIBLE.ID - 1] && !IoCrucible.config) {
            _loc4_[SOULCRUCIBLE.ID - 1].block = true;
        }
        // Decorations. The Inferno table carries the overworld decorations but blocks every one of
        // them. Swap in the overworld entries (same ids, same art, and the same few event-only
        // pieces still blocked), so the Decorations tab works in the main yard and, because the
        // outpost table is derived from this one, in outposts too. The server can switch single
        // decorations off again: flag io_decooff, a comma separated list of building ids.
        let _loc5_: any[] = YARD_PROPS._yardProps;
        let _loc6_: any[] = GLOBAL._flags && GLOBAL._flags.io_decooff ? String(GLOBAL._flags.io_decooff).split(",") : [];
        _loc2_ = 0;
        while (_loc2_ < _loc4_.length && _loc2_ < _loc5_.length) {
            if (_loc4_[_loc2_] && _loc5_[_loc2_] && _loc4_[_loc2_].type == "decoration" && _loc5_[_loc2_].type == "decoration" && _loc4_[_loc2_].id == _loc5_[_loc2_].id) {
                _loc4_[_loc2_] = _loc5_[_loc2_];
                if (_loc6_.indexOf(String(_loc4_[_loc2_].id)) != -1) {
                    _loc4_[_loc2_].block = true;
                }
            }
            _loc2_++;
        }
        for (_loc1_ of as3.values(_loc4_)) {
            GLOBAL.ioScaleCosts(as3.cast(_loc1_.costs, Array), GLOBAL.ioTimeDivisor);
            GLOBAL.ioScaleCosts(as3.cast(_loc1_.fortify_costs, Array), GLOBAL.ioTimeDivisor);
            // Decorations go up at once (3 October): scaling made every 0 s decoration 1 s (and one of
            // them took 5 s), so placing one took a worker for a moment.
            if (_loc1_.type == "decoration" && as3.is(_loc1_.costs, Array)) {
                for (let ioDecoCost of as3.values(_loc1_.costs)) {
                    if (ioDecoCost && ioDecoCost.time instanceof SecNum) {
                        (as3.as(ioDecoCost.time, SecNum)).Set(0);
                    }
                }
            }
            // Repairs: BFOUNDATION heals maxHealth / min(3600, repairTime) per tick, so this
            // is the single place repair speed comes from. The server keeps no repair table.
            GLOBAL.ioScaleDurations(as3.cast(_loc1_.repairTime, Array), GLOBAL.ioTimeDivisor);
            if (_loc1_.type == "resource" && _loc1_.produce) {
                _loc3_ = _loc1_.id == 4 ? GLOBAL.ioMagmaMultiplier : GLOBAL.ioResourceMultiplier;
                _loc2_ = 0;
                while (_loc2_ < _loc1_.produce.length) {
                    _loc1_.produce[_loc2_] = Math.round(_loc1_.produce[_loc2_] * _loc3_);
                    _loc2_++;
                }
            }
        }
        // Flinger (5): Map Room 2 attack range comes from the flinger level (client
        // BUILDING5.getFlingerRange, server validateRange), so it must be buildable.
        _loc4_[4].block = false;
        // General Store (12): on an inferno-only build the yard counts as a main yard, and the
        // store only opens in a main yard that has one (STORE.ShowB). Buildable from Under Hall 1.
        _loc4_[11].block = false;
        // Hatchery Control Center (16): one, from Under Hall 3 (its own requirements also ask for two
        // level 3 hatcheries). Its monster list comes from CREATURELOCKER.GetSortedCreatures, which
        // leaves overworld monsters out of Inferno yards, so only Inferno monsters are offered.
        _loc4_[15].block = false;
        _loc4_[15].quantity = [0, 0, 0, 1, 1, 1, 1];
        // Map Room (11): buildable from Under Hall 1. Yard Planner (10): from Under Hall 1.
        _loc4_[10].block = false;
        _loc4_[9].block = false;
        _loc4_[9].quantity = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        _loc4_[9].costs[0].re = [[14, 1, 1]];
        // Catapult (51): one, from Under Hall 3 (its own level requirements ask for Under Hall 3-6 and
        // a Flinger). In the Inferno it fires Chaos weapons and Sulfur Bombs: see ResourceBombs.
        _loc4_[50].block = false;
        _loc4_[50].quantity = [0, 0, 0, 1, 1, 1, 1];
        // (QoL #235: a key, read where it is shown (KEYS.Get of the description), in the player's language)
        _loc4_[50].description = "io_t3k_catapult_desc";
        // (20 October: 20 more walls (17) at every Under Hall level: 30, 70, 110, 180, 280, 320, from 10, 50, 90, 160,
        // 260, 300)
        if (_loc4_[16] && _loc4_[16].id == 17 && _loc4_[16].quantity) {
            _loc4_[16].quantity = (_loc4_[16].quantity as any[]).map((q: any, lvl: int): int => (lvl >= 1 ? (Number(q) | 0) + 20 : Number(q) | 0) | 0);
        }
        // The cavern exit (127) leads nowhere on an inferno-only server.
        _loc4_[126].block = true;
        _loc4_[126].quantity = [0, 0, 0, 0, 0, 0];
        // Outpost hall, taken from the overworld outpost table (the Inferno table has a stub).
        GLOBAL.ioScaleCosts(as3.cast(OUTPOST_YARD_PROPS._outpostProps[111].costs, Array), GLOBAL.ioTimeDivisor);
        GLOBAL.ioScaleDurations(as3.cast(OUTPOST_YARD_PROPS._outpostProps[111].repairTime, Array), GLOBAL.ioTimeDivisor);
    }

    /**
     * Inferno-only: an announcement from the admin panel ({id, text}), shown once. The id is kept on
     * this computer so it is not shown again after a restart.
     */
    private static ioShowAnnouncement(param1: string): void {
        let announcement: any = null;
        let saved: SharedObject = null;
        try {
            announcement = JSON.parse(param1);
        } catch (e) {
            return;
        }
        if (!announcement || !announcement.id || !announcement.text) {
            return;
        }
        // (QoL #485: remembered for each account: another account in this browser sees it too)
        let seenKey: string = "ioAnnounceSeen" + (LOGIN._playerID ? ":" + LOGIN._playerID : "");
        try {
            saved = SharedObject.getLocal("bymr_data", "/");
            GLOBAL._ioAnnounceSeen = saved.data[seenKey] ? String(saved.data[seenKey]) : "";
        } catch (e) {
            GLOBAL._ioAnnounceSeen = "";
        }
        if (GLOBAL._ioAnnounceSeen == String(announcement.id)) {
            return;
        }
        GLOBAL._ioAnnounceSeen = String(announcement.id);
        try {
            saved = SharedObject.getLocal("bymr_data", "/");
            saved.data[seenKey] = GLOBAL._ioAnnounceSeen;
            delete saved.data.ioAnnounceSeen;
            saved.flush();
        } catch (e) {
        }
        GLOBAL.Message("<b>" + KEYS.Get("io_tr_glb_announcement") + "</b><br><br>" + String(announcement.text)); // (QoL #235)
        // (QoL #485: shown to this account: the server doesn't send it again, on this device or another)
        try {
            let w: any = window as any;
            if (LOGIN.token && w.fetch) {
                w.fetch(GLOBAL._apiURL + "player/announcementseen", { method: "POST", headers: { "Authorization": "Bearer " + LOGIN.token, "Content-Type": "application/json" }, body: JSON.stringify({ "id": String(announcement.id) }) }).catch((): void => {
                });
            }
        } catch (e) {
        }
    }

    /**
     * Inferno-only: "Spend N Shiny ...? Yes / No" before anything spends shiny.
     *
     *     if (!GLOBAL.ioConfirmShiny(cost, "to finish this now", function():void { sameAction(sameArgs); })) {
     *         return;
     *     }
     *
     * Returns true when the caller may go ahead now: no shiny involved, or it is the approved repeat. Else
     * it shows the question and returns false; the caller stops, and Yes runs the same action again with
     * approval, so each action keeps its own checks and effects exactly as they were.
     */
    /**
     * Inferno-only: the page's own settings (client-web/src/player/Shell.ts, localStorage "bymr-web-settings"), read
     * again at most once a second: Reduce motion (#229), Ask before spending Shiny (#20), Music and Effects (#231).
     */
    public static get ioPageSettings(): any {
        let now: number = getTimer();
        if (GLOBAL._ioPageAt > 0 && now - GLOBAL._ioPageAt < 1000 && GLOBAL._ioPage) {
            return GLOBAL._ioPage;
        }
        GLOBAL._ioPageAt = now;
        try {
            GLOBAL._ioPage = JSON.parse(localStorage.getItem("bymr-web-settings") || "{}") || {};
        } catch (e) {
            GLOBAL._ioPage = {};
        }
        return GLOBAL._ioPage;
    }

    private static _ioPage: any = null;

    private static _ioPageAt: number = 0;

    /**
     * Inferno-only (QoL #229): no screen shakes, nods or popup zooms: the page's settings (Game: Reduce motion), "As my
     * system" following prefers-reduced-motion.
     */
    public static get ioReduceMotion(): boolean {
        let v: string = String(GLOBAL.ioPageSettings.reduceMotion || "auto");
        return v == "on" || (v != "off" && typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    /** Inferno-only (QoL #231): the music's and the effects' own volumes (the page's settings, Sound), 0 to 1. */
    public static ioVolume(which: string): number {
        let v: any = GLOBAL.ioPageSettings[which == "music" ? "musicVolume" : "effectsVolume"];
        let f: number = v == null || isNaN(Number(v)) ? 1 : Math.max(0, Math.min(1, Number(v)));
        // (QoL #632: the slider's half sounds half as loud: the gain is its square)
        return f * f;
    }

    /** Inferno-only (QoL #20): Shiny spent without the question up to this (the page's settings; 0: always asked). */
    public static get ioShinyAskAbove(): number {
        return Math.max(0, Number(GLOBAL.ioPageSettings.shinyAskAbove) || 0);
    }

    public static ioConfirmShiny(param1: int, param2: string, param3: Function): boolean {
        if (!GLOBAL.INFERNO_ONLY || param1 <= 0 || GLOBAL.ioFreeBuild()) {
            return true;
        }
        if (GLOBAL._ioShinyApproved) {
            GLOBAL._ioShinyApproved = false;
            return true;
        }
        // (QoL #197: the account's Shiny lock (the page's settings, Account): over its amount, the password first, and
        // then the spend goes on without the question below)
        if (IoShinyLock.ask(param1, (): void => {
            GLOBAL._ioShinyApproved = true;
            try {
                param3();
            } finally {
                GLOBAL._ioShinyApproved = false;
            }
        })) {
            return false;
        }
        // (QoL #20: up to the amount set in the page's settings, Game: "Ask before spending Shiny", not asked)
        if (param1 <= GLOBAL.ioShinyAskAbove) {
            return true;
        }
        // (QoL #20: and what it leaves: "You have 1,491; 291 after.")
        let have: number = BASE._credits ? BASE._credits.Get() : 0;
        let after: string = have >= param1 ? "<br><br>" + KEYS.Get("io_shiny_have_after", { "v1": GLOBAL.FormatNumber(have), "v2": GLOBAL.FormatNumber(have - param1) }) : "";
        // (QoL #235: the question in the player's language; param2, what it is for, comes in it already)
        GLOBAL.Message(KEYS.Get("io_t3k_spend_shiny", { "v1": GLOBAL.FormatNumber(param1), "v2": param2 }) + after, KEYS.Get("btn_yes"), (): void => {
            GLOBAL._ioShinyApproved = true;
            try {
                param3();
            } finally {
                GLOBAL._ioShinyApproved = false;
            }
        }, null, KEYS.Get("btn_no"), (): void => {
        });
        return false;
    }

    /** Whether a devil outpost can build this building type (the outpost hall aside). */
    public static ioOutpostBuildable(param1: int): boolean {
        return GLOBAL.IO_OUTPOST_QUANTITY[param1] != null;
    }

    /**
     * Inferno outposts never existed in the original game, so there is no prop table for
     * them. This derives one from the Inferno main yard table: same buildings and art, but
     * requirements point at the outpost hall (112) and quantities follow the overworld
     * outpost rules. Entries are copied so the main yard table is left untouched.
     */
    private static ioBuildOutpostProps(): any[] {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        let _loc4_: any[] = null;
        let _loc5_: any = null;
        let _loc6_: any = null;
        let _loc1_: any[] = INFERNOYARDPROPS._infernoYardProps.slice();
        _loc2_ = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = GLOBAL.copyBuildingProps(_loc1_[_loc2_]);
            if (_loc3_.type != "decoration" && _loc3_.type != "mushroom" && _loc3_.type != "taunt" && _loc3_.type != "immovable" && _loc3_.type != "enemy") {
                if (GLOBAL.IO_OUTPOST_QUANTITY[_loc3_.id]) {
                    _loc3_.quantity = GLOBAL.IO_OUTPOST_QUANTITY[_loc3_.id];
                    _loc3_.block = false;
                } else {
                    _loc3_.quantity = [0, 0];
                    _loc3_.block = true;
                }
                // (12 November, the user's: calcifying in outposts too, asking for the outpost's own hall only, as its
                // upgrades do, in place of the Under Hall levels the main yard asks for)
                if (_loc3_.can_fortify && _loc3_.fortify_costs) {
                    _loc4_ = [];
                    for (_loc5_ of as3.values(_loc3_.fortify_costs)) {
                        _loc6_ = GLOBAL.copyBuildingProps(_loc5_);
                        _loc6_.re = [[112, 1, 1]];
                        _loc4_.push(_loc6_);
                    }
                    _loc3_.fortify_costs = _loc4_;
                }
                if (_loc3_.costs) {
                    _loc4_ = [];
                    for (_loc5_ of as3.values(_loc3_.costs)) {
                        _loc6_ = GLOBAL.copyBuildingProps(_loc5_);
                        _loc6_.re = [[112, 1, 1]];
                        _loc4_.push(_loc6_);
                    }
                    _loc3_.costs = _loc4_;
                }
            }
            _loc1_[_loc2_] = _loc3_;
            _loc2_++;
        }
        _loc1_[111] = GLOBAL.copyBuildingProps(OUTPOST_YARD_PROPS._outpostProps[111]);
        // Inferno-only: the outpost hall draws the Inferno's own (animated) art
        if (INFERNOYARDPROPS._infernoYardProps[111] && INFERNOYARDPROPS._infernoYardProps[111].imageData) {
            _loc1_[111].imageData = INFERNOYARDPROPS._infernoYardProps[111].imageData;
        }
        // (12 November: the outpost hall could always be fortified; its ring is the Under Hall's ring of bone now)
        if (_loc1_[111].can_fortify && INFERNOYARDPROPS._infernoYardProps[13] && INFERNOYARDPROPS._infernoYardProps[13].fortImgData) {
            _loc1_[111].fortImgData = INFERNOYARDPROPS._infernoYardProps[13].fortImgData;
        }
        return _loc1_;
    }

    /**
     * Prop table describing outposts, for code that inspects outposts without having one
     * loaded (auto-banking reads harvester output from it).
     */
    public static get outpostPropsTable(): any[] {
        if (!GLOBAL.INFERNO_ONLY) {
            return OUTPOST_YARD_PROPS._outpostProps;
        }
        GLOBAL.ioTuneProps();
        if (GLOBAL._ioOutpostProps == null) {
            GLOBAL._ioOutpostProps = GLOBAL.ioBuildOutpostProps();
        }
        return GLOBAL._ioOutpostProps;
    }

    public static SetBuildingProps(): void {
        if (GLOBAL.INFERNO_ONLY) {
            GLOBAL.ioTuneProps();
            // Rezghul first: his Strongbox unlock time is then scaled with the others.
            CREATURELOCKER.ioApplyRezghul();
            CREATURELOCKER.ioScaleTimes(GLOBAL.ioTimeDivisor);
            if (BASE.isOutpost) {
                if (GLOBAL._ioOutpostProps == null) {
                    GLOBAL._ioOutpostProps = GLOBAL.ioBuildOutpostProps();
                }
                GLOBAL._buildingProps = GLOBAL._ioOutpostProps;
            } else {
                GLOBAL._buildingProps = INFERNOYARDPROPS._infernoYardProps;
            }
            return;
        }
        switch (BASE.yardType) {
            case EnumYardType.INFERNO_YARD:
                GLOBAL._buildingProps = INFERNOYARDPROPS._infernoYardProps;
                break;
            case EnumYardType.OUTPOST:
                GLOBAL._buildingProps = OUTPOST_YARD_PROPS._outpostProps;
                break;
            default:
                if (!MapRoomManager.instance.isInMapRoom3) {
                    if (GLOBAL._mr2BuildingProps == null) {
                        // Shallow-copy the array and each entry that changeNotMaproom3SpecificBuildings()
                        // will mutate, so YARD_PROPS._yardProps originals are never modified. This ensures
                        // a same-session MR2 to MR3 upgrade sees pristine MR3 values in YARD_PROPS.
                        // NOTE: if you add a new index to changeNotMaproom3SpecificBuildings(), add a
                        // copyBuildingProps() for it here too, otherwise the original will be mutated.
                        GLOBAL._mr2BuildingProps = YARD_PROPS._yardProps.slice();
                        GLOBAL._mr2BuildingProps[4] = GLOBAL.copyBuildingProps(YARD_PROPS._yardProps[4]);
                        GLOBAL._mr2BuildingProps[8] = GLOBAL.copyBuildingProps(YARD_PROPS._yardProps[8]);
                        GLOBAL._mr2BuildingProps[14] = GLOBAL.copyBuildingProps(YARD_PROPS._yardProps[14]);
                        GLOBAL._mr2BuildingProps[21] = GLOBAL.copyBuildingProps(YARD_PROPS._yardProps[21]);

                        GLOBAL._buildingProps = GLOBAL._mr2BuildingProps;
                        GLOBAL.changeNotMaproom3SpecificBuildings();
                    } else {
                        GLOBAL._buildingProps = GLOBAL._mr2BuildingProps;
                    }
                } else {
                    GLOBAL._buildingProps = YARD_PROPS._yardProps;
                }
        }
        if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
            YARD_PROPS._yardProps[112].block = true;
            OUTPOST_YARD_PROPS._outpostProps[112].block = true;
        }
    }

    public static isInfernoMode(param1: string): boolean {
        return param1 == GLOBAL.e_BASE_MODE.IBUILD || param1 == GLOBAL.e_BASE_MODE.IVIEW || param1 == GLOBAL.e_BASE_MODE.IATTACK || param1 == GLOBAL.e_BASE_MODE.IHELP || param1 == GLOBAL.e_BASE_MODE.IWMVIEW || param1 == GLOBAL.e_BASE_MODE.IWMATTACK;
    }

    public static isValidMode(param1: string): boolean {
        return param1 == GLOBAL.e_BASE_MODE.BUILD || param1 == GLOBAL.e_BASE_MODE.ATTACK || param1 == GLOBAL.e_BASE_MODE.WMATTACK || param1 == GLOBAL.e_BASE_MODE.VIEW || param1 == GLOBAL.e_BASE_MODE.WMVIEW || param1 == GLOBAL.e_BASE_MODE.HELP || param1 == GLOBAL.e_BASE_MODE.IBUILD || param1 == GLOBAL.e_BASE_MODE.IVIEW || param1 == GLOBAL.e_BASE_MODE.IATTACK || param1 == GLOBAL.e_BASE_MODE.IHELP || param1 == GLOBAL.e_BASE_MODE.IWMVIEW || param1 == GLOBAL.e_BASE_MODE.IWMATTACK;
    }

    public static infernoToDefaultMode(param1: string): string {
        switch (param1) {
            case GLOBAL.e_BASE_MODE.IBUILD:
                return GLOBAL.e_BASE_MODE.BUILD;
            case GLOBAL.e_BASE_MODE.IVIEW:
                return GLOBAL.e_BASE_MODE.VIEW;
            case GLOBAL.e_BASE_MODE.IATTACK:
                return GLOBAL.e_BASE_MODE.ATTACK;
            case GLOBAL.e_BASE_MODE.IHELP:
                return GLOBAL.e_BASE_MODE.HELP;
            case GLOBAL.e_BASE_MODE.IWMVIEW:
                return GLOBAL.e_BASE_MODE.WMVIEW;
            case GLOBAL.e_BASE_MODE.IWMATTACK:
                return GLOBAL.e_BASE_MODE.WMATTACK;
            default:
                return param1;
        }
    }

    public static Setup(baseMode: string = "build"): void {
        GLOBAL.player = new Player();
        GLOBAL._loadmode = baseMode;
        GLOBAL.connectionCounter = 0;
        if (GLOBAL.isValidMode(baseMode)) {
            GLOBAL.setMode(GLOBAL.infernoToDefaultMode(baseMode));
        }
        GLOBAL._fps = 40;
        GLOBAL._FPSframecount = 0;
        GLOBAL._FPSarray = [];
        GLOBAL._FPStimestamp = 0;
        ImageCache.prependImagePath = GLOBAL._storageURL;
        MapRoom3AssetCache.instance.Load();
        let tileSet: any[] = MapRoom3TileSetManager.DEFAULT_TILE_SET;
        MapRoom3TileSetManager.instance.SetCurrentTileSet(tileSet);
        if (!GLOBAL._timekeeper) {
            GLOBAL._timekeeper = new Timekeeper();
        }
        GLOBAL._timekeeper.startTicking();
        GLOBAL._halt = false;
        GLOBAL._mapWidth = 800;
        GLOBAL._mapHeight = 800;
        GLOBAL._zoomed = false;
        GLOBAL._averageAltitude = new SecNum(125);
        GLOBAL._outpostCapacity = new SecNum(GLOBAL.ioFlag("io_outpost_capacity", 2000000));
        GLOBAL._attackersCatapult = 0;
        GLOBAL._attackersFlinger = 0;
        GLOBAL._savedAttackersDeltaResources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0) };
        GLOBAL._attackersDeltaResources = { "dirty": false };
        GLOBAL._attackerMonsterOverdrive = new SecNum(0);
        if (GLOBAL._mode != GLOBAL.e_BASE_MODE.BUILD) {
            HOUSING.Cull();
            GLOBAL._attackersResources = GLOBAL._resources;
            GLOBAL._hpAttackersResources = GLOBAL._hpResources;
            GLOBAL._attackerMonsterOverdrive = new SecNum(GLOBAL._playerMonsterOverdrive.Get());
            GLOBAL._attackerMonsterDefenseOverdrive = new SecNum(GLOBAL._playerMonsterDefenseOverdrive.Get());
            GLOBAL._attackerMonsterSpeedOverdrive = new SecNum(GLOBAL._playerMonsterSpeedOverdrive.Get());
            if (BASE._credits) {
                GLOBAL._attackersCredits = new SecNum(BASE._credits.Get());
            } else {
                GLOBAL._attackersCredits = new SecNum(0);
            }
            if (GLOBAL._bFlinger != null) {
                GLOBAL._attackersFlinger = GLOBAL._bFlinger._lvl.Get() | 0;
            }
            if (GLOBAL._bCatapult != null) {
                GLOBAL._attackersCatapult = GLOBAL._bCatapult._lvl.Get() | 0;
            }
            if (BASE.isInfernoMainYardOrOutpost && GLOBAL._bHousing != null) {
                GLOBAL._attackersFlinger = GLOBAL._bHousing._lvl.Get() | 0;
            }
            ATTACK._countdown = (60 * 5) | 0;
            if (MapRoomManager.instance.isInMapRoom2or3 && Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL"))) {
                ATTACK._countdown = (60 * 7) | 0;
            }
            // Admin test mode: no time limit worth the name (a day).
            if (GLOBAL.ioTestMode()) {
                ATTACK._countdown = (60 * 60 * 24) | 0;
            }
            if (MapRoomManager.instance.isInMapRoom3 && (baseMode == GLOBAL.e_BASE_MODE.ATTACK || baseMode == GLOBAL.e_BASE_MODE.WMATTACK || baseMode == GLOBAL.e_BASE_MODE.VIEW || baseMode == GLOBAL.e_BASE_MODE.WMVIEW)) {
                GLOBAL._attackersResources = { "r1": new SecNum(Number(GLOBAL._resources.r1.Get())), "r2": new SecNum(Number(GLOBAL._resources.r2.Get())), "r3": new SecNum(Number(GLOBAL._resources.r3.Get())), "r4": new SecNum(Number(GLOBAL._resources.r4.Get())), "catapult": new SecNum(0), "flinger": new SecNum(0) };
                GLOBAL._attackersResources.catapult.Set(GLOBAL._playerCatapultLevel.Get());
                GLOBAL._attackersCatapult = GLOBAL._playerCatapultLevel.Get() | 0;
                GLOBAL._attackersResources.flinger.Set(GLOBAL._playerFlingerLevel.Get());
                GLOBAL._attackersFlinger = GLOBAL._playerFlingerLevel.Get() | 0;
            } else if (GLOBAL._mode == GLOBAL._loadmode) {
                if (MapRoomManager.instance.isInMapRoom2 && (baseMode == GLOBAL.e_BASE_MODE.ATTACK || baseMode == GLOBAL.e_BASE_MODE.WMATTACK || baseMode == GLOBAL.e_BASE_MODE.VIEW || baseMode == GLOBAL.e_BASE_MODE.WMVIEW)) {
                    if (GLOBAL._attackerMapResources.catapult) {
                        GLOBAL._attackersCatapult = GLOBAL._attackerMapResources.catapult.Get() | 0;
                    }
                }
                // Inferno-only: attack capacity follows the Compound level, as it did in the
                // original Inferno (the Inferno flinger entry's capacity table is indexed
                // by it: 200-1820). Falls back to 4 when no Compound is loaded, e.g. when
                // the attack is launched while an outpost is on screen.
                if (!(GLOBAL.INFERNO_ONLY && GLOBAL._bHousing != null && GLOBAL._attackersFlinger >= 1 && GLOBAL._attackersFlinger <= 6)) {
                    GLOBAL._attackersFlinger = 4;
                }
            }
            // Admin test mode: every catapult shot available.
            if (GLOBAL.ioTestMode()) {
                GLOBAL._attackersCatapult = 4;
            }
            // Inferno-only Siege (the Devil's Arcade): its own flinger and clock, no catapult
            IoSiege.setupAttack();
        }
        let musicMode: string = GLOBAL._loadmode;
        if (GLOBAL.INFERNO_ONLY) {
            musicMode = GLOBAL._mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._mode == GLOBAL.e_BASE_MODE.WMATTACK ? GLOBAL.e_BASE_MODE.IATTACK : GLOBAL.e_BASE_MODE.IBUILD;
        }
        switch (musicMode) {
            case GLOBAL.e_BASE_MODE.IATTACK:
            case GLOBAL.e_BASE_MODE.IWMATTACK:
                SOUNDS.PlayMusic("musiciattack");
                break;
            case GLOBAL.e_BASE_MODE.IBUILD:
            case GLOBAL.e_BASE_MODE.IHELP:
            case GLOBAL.e_BASE_MODE.IVIEW:
                SOUNDS.PlayMusic("musicibuild");
                break;
            case GLOBAL.e_BASE_MODE.ATTACK:
            case GLOBAL.e_BASE_MODE.WMATTACK:
                SOUNDS.PlayMusic("musicattack");
                break;
            case GLOBAL.e_BASE_MODE.BUILD:
            case GLOBAL.e_BASE_MODE.HELP:
            case GLOBAL.e_BASE_MODE.VIEW:
            default:
                SOUNDS.PlayMusic("musicbuild");
        }
        GLOBAL._render = false;
        GLOBAL._creepCount = 0;
        GLOBAL._timePlayed = 0;
        if (GLOBAL._loadmode == GLOBAL._mode && !GLOBAL.INFERNO_ONLY) {
            GLOBAL._resourceNames = ["#r_twigs#", "#r_pebbles#", "#r_putty#", "#r_goo#", "#r_shiny#", "#r_time#"];
        } else {
            GLOBAL._resourceNames = GLOBAL.iresourceNames;
        }
        BASE.Setup();
    }

    public static getResourceFrame(param1: string, param2: boolean = false): string {
        if (param2 || BASE.isInfernoMainYardOrOutpost) {
            switch (param1) {
                case "r1":
                    return "bone";
                case "r2":
                    return "coal";
                case "r3":
                    return "sulfur";
                case "r4":
                    return "magma";
                case "shiny":
                    return "shiny2";
                case "time":
                    return "time2";
            }
        } else {
            switch (param1) {
                case "r1":
                    return "twig";
                case "r2":
                    return "pebble";
                case "r3":
                    return "putty";
                case "r4":
                    return "goo";
                case "shiny":
                    return "shiny";
                case "time":
                    return "time";
            }
        }
        return "unknown";
    }

    public static getResourceName(param1: string, param2: boolean = false): string {
        let _loc3_: any[] = param2 ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
        switch (param1) {
            case "r1":
                return KEYS.Get(as3.str(_loc3_[0]));
            case "r2":
                return KEYS.Get(as3.str(_loc3_[1]));
            case "r3":
                return KEYS.Get(as3.str(_loc3_[2]));
            case "r4":
                return KEYS.Get(as3.str(_loc3_[3]));
            case "shiny":
                return KEYS.Get(as3.str(_loc3_[4]));
            case "time":
                return KEYS.Get(as3.str(_loc3_[5]));
            default:
                return "???";
        }
    }

    public static Clear(): void {
        GLOBAL._bBaiter = null;
        GLOBAL._bFlinger = null;
        GLOBAL._bCatapult = null;
        GLOBAL._bHatchery = null;
        GLOBAL._bHatcheryCC = null;
        GLOBAL._bHousing = null;
        GLOBAL._bJuicer = null;
        GLOBAL._bLocker = null;
        GLOBAL._bTower = null;
        GLOBAL._bMap = null;
        GLOBAL._bStore = null;
        GLOBAL._bTotem = null;
        GLOBAL._bTownhall = null;
        GLOBAL._bRadio = null;
        GLOBAL._bSiegeLab = null;
        GLOBAL._bSiegeFactory = null;
        GLOBAL._bCage = null;
        GLOBAL.tickables = new Vector<ITickable>(0, false, ITickable);
        GLOBAL.fastTickables = new Vector<ITickable>(0, false, ITickable);
    }

    public static WaitShow(param1: string = ""): void {
        PLEASEWAIT.Show(KEYS.Get("wait_processing"));
    }

    public static WaitHide(): void {
        PLEASEWAIT.Hide();
    }

    public static getNumNormalPlayerGuardianDataChamps(): int {
        let _loc1_: int = GLOBAL._playerGuardianData.length | 0;
        let _loc2_: int = _loc1_;
        while (_loc2_ >= 0) {
            if (as3.vget(GLOBAL._playerGuardianData, _loc2_).status != ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                _loc1_--;
            }
            _loc2_--;
        }
        return _loc1_;
    }

    public static get isFullScreen(): boolean {
        return GLOBAL._ROOT.stage.displayState === StageDisplayState.FULL_SCREEN || GLOBAL._ROOT.stage.displayState === StageDisplayState.FULL_SCREEN_INTERACTIVE;
    }

    public static goFullScreen(param1: MouseEvent = null): void {
        if (GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
            GLOBAL._ROOT.stage.displayState = StageDisplayState.FULL_SCREEN;
            let ioZoomFrame: int = (GLOBAL.INFERNO_ONLY ? 1 : 3) | 0;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                UI2._top.mcZoom.gotoAndStop(ioZoomFrame + 3);
            } else {
                UI2._top.mcZoom.gotoAndStop(ioZoomFrame);
            }
            MAP._GROUND.scaleX = 1;
            MAP._GROUND.scaleY = IoTilt.groundScaleY(1);
        } else {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                UI2._top.mcZoom.gotoAndStop(1 + 3);
            } else {
                UI2._top.mcZoom.gotoAndStop(1);
            }
            GLOBAL._ROOT.stage.displayState = StageDisplayState.NORMAL;
            print("leaving fullscreen: " + Console.getStackTrace());
        }
        GLOBAL._zoomed = false;
        GLOBAL.magnification = 1;
        if (MapRoomManager.instance.isOpen) {
            MapRoomManager.instance.ResizeHandler();
        }
    }

    /** Inferno-only (QoL #32): the yard's point in the middle of the screen when the zoom button zoomed out. */
    private static _ioZoomFrom: Point = null;

    /** Inferno-only (QoL #32): where the zoomed-out view was put (to tell whether the player moved it since). */
    private static _ioZoomOutAt: Point = null;

    public static Zoom(param1: MouseEvent = null): void {
        // (Inferno-only, QoL #33: zoom works in full screen too; it was a Flash limit)
        if (GLOBAL.INFERNO_ONLY || GLOBAL._ROOT.stage.displayState != StageDisplayState.FULL_SCREEN) {
            // Inferno-only: the zoom button with the yard magnified by a pinch (IoPinchZoom's lens) first
            // brings it back to normal size
            if (IoPinchZoom.lens > 1) {
                IoPinchZoom.resetLens();
                return;
            }
            // (Inferno-only, QoL #32: a building being placed or moved stays in hand, and zooming back in keeps the
            // part of the yard that was in the middle of the screen; it went back to the yard's centre, and the
            // building held was put back)
            let held: boolean = GLOBAL.INFERNO_ONLY && (GLOBAL._newBuilding != null || (GLOBAL._selectedBuilding != null && GLOBAL._selectedBuilding._moving));
            if (held) {
                BUILDINGINFO.Hide();
            } else {
                BASE.BuildingDeselect();
            }
            if (GLOBAL.INFERNO_ONLY && MAP._GROUND && MAP._GROUND.scaleX > 0) {
                let s: number = MAP._GROUND.scaleX;
                let k: number = IoTilt.canvasK > 0 ? IoTilt.canvasK : 1;
                let here: Point = new Point(((380 - MAP._GROUND.x) / s) | 0, ((340 - MAP._GROUND.y) / (k * s)) | 0);
                if (GLOBAL._zoomed) {
                    // back in: where the player was before zooming out, unless they moved the zoomed-out view
                    let moved: boolean = !GLOBAL._ioZoomOutAt || Math.abs(MAP._GROUND.x - GLOBAL._ioZoomOutAt.x) > 4 || Math.abs(MAP._GROUND.y - GLOBAL._ioZoomOutAt.y) > 4;
                    let to: Point = moved || !GLOBAL._ioZoomFrom ? here : GLOBAL._ioZoomFrom;
                    MAP.FocusTo(to.x | 0, to.y | 0, 0.4);
                } else {
                    GLOBAL._ioZoomFrom = here;
                    MAP.FocusTo(0, 0, 0.4);
                    GLOBAL._ioZoomOutAt = new Point(MAP.tx, MAP.ty);
                }
            } else {
                MAP.FocusTo(0, 0, 0.4);
            }
            if (GLOBAL._zoomed) {
                GLOBAL._zoomed = false;
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcZoom.gotoAndStop(1 + 3);
                } else {
                    UI2._top.mcZoom.gotoAndStop(1);
                }
                TweenLite.to(MAP._GROUND, 0.1, { "scaleX": 1, "scaleY": 1, "ease": Cubic.easeInOut, "overwrite": false });
            } else {
                GLOBAL._zoomed = true;
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcZoom.gotoAndStop(2 + 3);
                } else {
                    UI2._top.mcZoom.gotoAndStop(2);
                }
                TweenLite.to(MAP._GROUND, 0.4, { "scaleX": 0.5, "scaleY": 0.5, "ease": Cubic.easeInOut, "overwrite": false });
            }
        }
    }

    public static Tick(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: Vector<any> = null;
        let _loc4_: BFOUNDATION = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: any = false;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;

        // Poll the server every 5 ticks to check for network connection
        GLOBAL.connectionCounter += 1;
        if (GLOBAL.connectionCounter % 30 == 0) {
            GLOBAL.CheckNetworkConnection(null);
        }
        if (!GLOBAL.isHalted && !GLOBAL._catchup) {
            GLOBAL.t += 1;
            if (MapRoomManager.instance.isOpen) {
                MapRoomManager.instance.Tick();
                LOGGER.Tick();
                MAILBOX.Tick();
                GLOBAL.AFK();
            } else {
                // Comment: This function call is used to force upgrade to map room 3 when the game first loads
                MapRoomManager.instance.CheckForAndForceUpgradeFromMapRoom1();
                ++GLOBAL._timePlayed;
                _loc1_ = (GLOBAL.tickables.length - 1) | 0;
                if (GLOBAL.INFERNO_ONLY) {
                    // (18 October, SUSPECTED-BUGS.md: the loop stopped one short, so the last one (a lone acid pool)
                    // was never ticked; and one taking itself out skipped the next) every one, from the last down
                    _loc2_ = _loc1_;
                    while (_loc2_ >= 0) {
                        if (_loc2_ < GLOBAL.tickables.length) {
                            as3.vget(GLOBAL.tickables, _loc2_).tick();
                        }
                        _loc2_--;
                    }
                } else {
                    _loc2_ = 0;
                    while (_loc2_ < _loc1_) {
                        as3.vget(GLOBAL.tickables, _loc2_).tick();
                        _loc2_++;
                    }
                }
                _loc3_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                _loc5_ = 0;
                _loc6_ = 0;
                for (_loc4_ of (_loc3_ ?? [])) {
                    _loc7_ = _loc4_ instanceof BRESOURCE;
                    if (_loc7_) {
                        _loc5_ = _loc4_._stored.Get();
                        _loc6_ = _loc4_._countdownProduce.Get();
                    }
                    _loc4_.Tick(1);
                    if (_loc7_) {
                        if (_loc6_ > 1 && _loc5_ != _loc4_._stored.Get()) {
                            LOGGER.Log("log", "BRESOURCE.StoredB " + _loc5_ + " - " + _loc4_._stored.Get());
                            GLOBAL.ErrorMessage("BRESOURCE.StoredB");
                            return;
                        }
                    }
                }
                HOUSING.catchupTick(1);
                // Admin test mode: housed monsters are always at full health (not during a wild attack,
                // so defences are tested as they are).
                // Only in the admin's own yard: while attacking, GLOBAL.player is the yard's owner (the
                // defenders), who must stay killable in a practice attack.
                if (GLOBAL.ioTestMode() && GLOBAL.player && !WMATTACK._inProgress && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) {
                    GLOBAL.player.healInstantAll();
                }
                UPDATES.Check();
                CREATURELOCKER.Tick();
                HATCHERY.Tick();
                HATCHERYCC.Tick();
                STORE.ProcessPurchases();
                BASE.Tick();
                HOUSING.Update();
                ACADEMY.Tick();
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    ATTACK.Tick();
                }
                QUEUE.Tick();
                UI2.Update();
                LOGGER.Tick();
                MAILBOX.Tick();
                GLOBAL.AFK();
                MONSTERBAITER.Tick();
                MONSTERBUNKER.Tick();
                if (GLOBAL._mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._mode == GLOBAL.e_BASE_MODE.WMVIEW) {
                    WMBASE.Tick();
                }
            }
            if (GLOBAL.INFERNO_ONLY) {
                GLOBAL._toggleYardWaiting = 0;
            }
            if (GLOBAL._ioPendingKit && !GLOBAL._ioKitRequestSent) {
                if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading) {
                    // The last save has finished (the server charges the kit with its build, 18 October). From here
                    // on nothing may be saved until the yard has been loaded again, or the old yard would be written
                    // over the kit.
                    GLOBAL._ioKitRequestSent = true;
                    BASE._blockSave = true;
                    new URLLoaderApi().load(GLOBAL._mapURL + "applykit", [["baseid", BASE._loadedBaseID], ["buildings", JSON.stringify(GLOBAL._ioPendingKit)], ["pay", GLOBAL._ioPendingKitPay || ""]], GLOBAL.ioKitApplied, GLOBAL.ioKitFailed);
                } else if (GLOBAL.Timestamp() > GLOBAL._ioKitDeadline) {
                    GLOBAL.ioKitFailed(null);
                }
            }
            if (GLOBAL._toggleYardWaiting && BASE._saveCounterA == BASE._saveCounterB && !BASE._saving) {
                GLOBAL._toggleYardWaiting = 0;
                GLOBAL._nextOutpostWaiting = 0;
                GLOBAL._showMapWaiting = 0;
                MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
                if (MAPROOM_INFERNO._open) {
                    MAPROOM_INFERNO.Hide();
                }
                if (MAPROOM._open) {
                    MAPROOM.Hide();
                }
                if (BASE.isInfernoMainYardOrOutpost) {
                    _loc8_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
                    BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc8_);
                } else {
                    BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, GLOBAL.e_BASE_MODE.IBUILD, false, EnumYardType.INFERNO_YARD);
                }
            } else if (GLOBAL._nextOutpostWaiting && BASE._saveCounterA == BASE._saveCounterB && !BASE._saving) {
                GLOBAL._nextOutpostWaiting = 0;
                GLOBAL._showMapWaiting = 0;
                BASE.LoadNext();
            } else if (GLOBAL._showMapWaiting && BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading && MapRoomManager.instance.ReadyToShow()) {
                _loc9_ = GLOBAL._showMapWaiting;
                GLOBAL._showMapWaiting = 0;
                PLEASEWAIT.Hide();
                MapRoomManager.instance.ShowDelayed();
            }
            if (BASE._needCurrentCell && GLOBAL._currentCell && !MapRoomManager.instance.isInMapRoom3 && BASE._saveCounterA == BASE._saveCounterB && !BASE._saving) {
                PLEASEWAIT.Hide();
                BASE._needCurrentCell = false;
                _loc10_ = GLOBAL._currentCell.baseType == EnumYardType.INFERNO_OUTPOST ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
                BASE.LoadBase(null, 0, GLOBAL._currentCell.baseID, GLOBAL.e_BASE_MODE.BUILD, false, _loc10_);
            }
        }
    }

    public static addTickable(param1: ITickable): void {
        GLOBAL.tickables.push(param1);
    }

    public static removeTickable(param1: ITickable): void {
        let _loc2_: int = GLOBAL.tickables.indexOf(param1) | 0;
        if (_loc2_ >= 0) {
            GLOBAL.tickables.splice(_loc2_, 1);
        }
    }

    public static addFastTickable(param1: ITickable): void {
        GLOBAL.fastTickables.push(param1);
    }

    public static removeFastTickable(param1: ITickable): void {
        let _loc2_: int = GLOBAL.fastTickables.indexOf(param1) | 0;
        if (_loc2_ >= 0) {
            GLOBAL.fastTickables.splice(_loc2_, 1);
        }
    }

    public static TickFast(param1: Event): void {
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: Vector<any> = null;
        let _loc11_: Vector<any> = null;
        let _loc12_: Vector<any> = null;
        let _loc13_: Bunker = null;
        let _loc14_: BTRAP = null;
        let _loc15_: BFOUNDATION = null;
        if (!GLOBAL.isHalted) {
            _loc2_ = getTimer();
            SOUNDS.Tick();
            MapRoomManager.instance.TickFast();
            if (GLOBAL._render) {
                _loc3_ = Number(getTimer());
                if ((_loc4_ = _loc3_ - GLOBAL.lastTime) > GLOBAL.TIME_ELAPSED_THRESHHOLD && !GLOBAL._aiDesignMode) {
                    if (GLOBAL.INFERNO_ONLY) {
                        // Inferno-only: the game did not run for over 5 minutes. Nearly always a phone that
                        // was locked or switched to another app (browsers freeze the page then), not a
                        // cheat. The stop itself stays: the yard may have changed on the server meanwhile
                        // (attacks, other devices), so this copy must not play on or save. But it is
                        // explained, its Reload button works (ERRORMESSAGE), and it is not a bug report.
                        print("TimeHax: " + ((_loc4_ / 1000) | 0) + " s without a frame");
                        // (19 October, the user's: never stopped for being away: the yard is brought up to date by
                        // itself instead: ioBackAfterAway)
                        GLOBAL.ioBackAfterAway();
                    } else {
                        LOGGER.Log("err", "TimeHax");
                        GLOBAL.ErrorMessage("Time Threshold Exceeded");
                    }
                }
                if (GLOBAL.lastTime) {
                    GLOBAL._loopsBanked -= GLOBAL._loops;
                    if (GLOBAL._loopsBanked < 0) {
                        GLOBAL._loopsBanked = 0;
                    }
                    // (Inferno-only: Hellgate Defense's fast forward runs it at ioStepScale times the speed)
                    GLOBAL._loopsBanked = (GLOBAL._loopsBanked + 2 / 25 * (_loc3_ - GLOBAL.lastTime) * GLOBAL.ioStepScale) | 0;
                    GLOBAL._loops = GLOBAL._loopsBanked;
                    if (GLOBAL._loops > GLOBAL._maxLoops) {
                        GLOBAL._loops = GLOBAL._maxLoops;
                    }
                    // The simulation runs at a fixed 80 steps a second and "banks" the steps a slow
                    // frame missed, to run them on the next one. With a cap of 800 that feeds on
                    // itself: a slow frame owes more steps, which makes the next frame slower, which
                    // owes more again, until the game is showing one frame every few seconds. That is
                    // the slowdown that builds up during big attacks.
                    // So: only run as many steps as fit a time budget, judged by what a step has been
                    // costing lately, and forget debt that could never be repaid. Under heavy load the
                    // battle runs in slow motion at a steady frame rate instead of seizing up.
                    _loc5_ = GLOBAL._ioStepCost > 0 ? (GLOBAL.IO_STEP_BUDGET_MS / GLOBAL._ioStepCost) | 0 : GLOBAL.IO_MAX_CATCHUP;
                    if (_loc5_ < 2) {
                        _loc5_ = 2;
                    } else if (_loc5_ > GLOBAL.IO_MAX_CATCHUP) {
                        _loc5_ = GLOBAL.IO_MAX_CATCHUP;
                    }
                    if (GLOBAL._loops > _loc5_) {
                        GLOBAL._loops = _loc5_;
                    }
                    if (GLOBAL._loopsBanked > _loc5_ * 4) {
                        GLOBAL._loopsBanked = (_loc5_ * 4) | 0;
                    }
                } else {
                    GLOBAL._loops = 2;
                }
                GLOBAL.lastTime = _loc3_;
                _loc5_ = getTimer();
                if (!MapRoomManager.instance.isOpen) {
                    _loc7_ = 0;
                    while (_loc7_ < GLOBAL._loops) {
                        GLOBAL._render = false;
                        if (_loc7_ == GLOBAL._loops - 1) {
                            GLOBAL._render = true;
                        }
                        if (CREEPS._creepCount > 0 || Boolean(SiegeWeapons.activeWeapon)) {
                            CREEPS.Tick();
                            _loc10_ = InstanceManager.getInstancesByClass(BTOWER);
                            _loc11_ = InstanceManager.getInstancesByClass(BTRAP);
                            _loc12_ = InstanceManager.getInstancesByClass(Bunker);
                            for (_loc15_ of (_loc10_ ?? [])) {
                                // (Hell Freezes Over: a tower iced over by an ice monster waits: BTOWER.ioIceTick)
                                if (!(_loc15_ instanceof BTOWER && as3.cast(_loc15_, BTOWER).ioIceTick())) {
                                    _loc15_.TickAttack();
                                }
                            }
                            for (_loc14_ of (_loc11_ ?? [])) {
                                _loc14_.TickAttack();
                            }
                            for (_loc13_ of (_loc12_ ?? [])) {
                                _loc13_.TickAttack();
                            }
                        }
                        CREATURES.Tick();
                        // Inferno-only (11 November): monster synergies, once the monsters have moved
                        IoSynergy.tick();
                        IoDevil.battleTick();
                        _loc9_ = _loc8_ = (GLOBAL.fastTickables.length - 1) | 0;
                        while (_loc9_ >= 0) {
                            as3.vget(GLOBAL.fastTickables, _loc9_).tick();
                            _loc9_--;
                        }
                        _loc6_ = 0;
                        while (_loc6_ < CREATURES._guardianList.length) {
                            if (Boolean(as3.vget(CREATURES._guardianList, _loc6_)) && as3.vget(CREATURES._guardianList, _loc6_).tick(1)) {
                                if (!BYMConfig.instance.RENDERER_ON) {
                                    MAP._BUILDINGTOPS.removeChild(as3.vget(CREATURES._guardianList, _loc6_).graphic);
                                }
                                as3.vget(CREATURES._guardianList, _loc6_).clearRasterData();
                                if (as3.vget(CREATURES._guardianList, _loc6_) == CREATURES._guardian) {
                                    CREATURES._guardian = null;
                                } else {
                                    CREATURES._guardianList.splice(_loc6_, 1);
                                }
                                _loc6_--;
                            }
                            _loc6_++;
                        }
                        PROJECTILES.Tick();
                        FIREBALLS.Tick();
                        // Inferno-only: attack replays, recorded and played a step at a time
                        if (GLOBAL.INFERNO_ONLY) {
                            IoReplayRecorder.step();
                            IoReplayPlayer.step();
                        }
                        _loc7_++;
                    }
                    if (GLOBAL._loops > 0) {
                        // Running average of what one simulation step costs, in milliseconds.
                        GLOBAL._ioStepCost = GLOBAL._ioStepCost * 0.8 + (getTimer() - _loc5_) / GLOBAL._loops * 0.2;
                    }
                    if (BYMConfig.instance.RENDERER_ON) {
                        GLOBAL._ROOT.stage.invalidate();
                    }
                }
                ++GLOBAL._frameNumber;
                _loc2_ = getTimer();
                if (!MapRoomManager.instance.isOpen) {
                    WORKERS.Tick();
                    // Inferno-only: pets wander the yard (IoPets); the Harvest Drone's rounds (IoShop, 22 October)
                    IoPets.Tick();
                    IoShop.Tick();
                    // (13 November) the Devil's Contract: its offer, ends, lent worker and pill (IoDevil)
                    IoDevil.Tick();
                    EFFECTS.Tick();
                    try {
                        WMATTACK.Tick();
                    } catch (ioRaidError) {
                        // A raid that cannot be planned is dropped, not allowed to break every frame.
                        LOGGER.Log("err", "Raid planning failed: " + ioRaidError + " | " + ioRaidError.getStackTrace());
                        WMATTACK.ioAbandon();
                    }
                    MAPROOM.Tick();
                    PATHING.Tick();
                    Smoke.Tick();
                    Fire.Tick();
                    BASE.ShakeB();
                    GLOBAL._player.tick();
                }
                if (!TUTORIAL.hasFinished) {
                    TUTORIAL.Tick();
                }
                if (GLOBAL._flags.logfps) {
                    if (GLOBAL._FPSframecount == 40 * 60) {
                        GLOBAL.LogFPS();
                    } else if (GLOBAL._FPSframecount > 80 && GLOBAL._FPSframecount % 40 == 0) {
                        GLOBAL._fps = (1000 / ((_loc2_ - GLOBAL._FPStimestamp) / 40)) | 0;
                        if (GLOBAL._FPStimestamp > 0) {
                            GLOBAL._FPSarray.push({ "fps": GLOBAL._fps });
                        }
                        GLOBAL._FPStimestamp = _loc2_;
                    }
                } else if (GLOBAL._FPSframecount % 40 == 0) {
                    GLOBAL._fps = (1000 / ((_loc2_ - GLOBAL._FPStimestamp) / 40)) | 0;
                    GLOBAL._FPStimestamp = _loc2_;
                }
                GLOBAL._FPSframecount += 1;
                if (GLOBAL._frameNumber % 3 == 0 && !BYMConfig.instance.RENDERER_ON) {
                    MAP.SortDepth();
                }
            } else {
                GLOBAL._loops = 4;
            }
        } else {
            GLOBAL.lastTime = 0;
            GLOBAL._loops = 4;
        }
    }

    public static LogFPS(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (GLOBAL._flags.logfps) {
            as3.sortOn(GLOBAL._FPSarray, "fps", Array.NUMERIC);
            _loc1_ = GLOBAL._FPSarray[0].fps | 0;
            _loc2_ = GLOBAL._FPSarray[GLOBAL._FPSarray.length - 1].fps | 0;
            _loc3_ = GLOBAL._FPSarray[GLOBAL._FPSarray.length * 0.5].fps | 0;
            LOGGER.Log("fr" + GLOBAL.mode.substr(0, 1), GLOBAL.dd(_loc1_) + "," + GLOBAL.dd(_loc2_) + "," + GLOBAL.dd(_loc3_));
        }
    }

    public static Timestamp(): int {
        return GLOBAL.t;
    }

    private static _ioMapWait: Sprite = null;

    public static ShowMap(param1: MouseEvent = null): void {
        // Inferno-only (10 October): a save still to go (a monster just hatched, a building just placed) goes first:
        // with the map open the yard isn't saved (BASE.SaveB: opening the map unloads it), and the map reads the yards
        // from their last save, so monsters hatched a moment ago were missing from it and from attacks.
        // (11 October, the user's: "players are unable to open their map while their yard is saving, so if they
        // have monsters hatching they're locked until it's done". The wait was for every change to be saved, and
        // with hatcheries working a new monster asked for a new save every few seconds, so it never settled. Now
        // it waits for one save only: the yard as it is at the click. A save already on its way finishes, one more
        // is sent if anything changed since, and the map opens when that one is back, or after IO_MAP_WAIT_MS at
        // most. Monsters hatched after the click are the map's own to count: it keeps the hatcheries going.)
        if (GLOBAL.INFERNO_ONLY && !BASE._loading && !GLOBAL.isMapOpen() && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && (BASE._saving || BASE._saveCounterA != BASE._saveCounterB)) {
            if (GLOBAL._ioMapWait) {
                return;
            }
            let started: number = getTimer();
            // the change count the map's save must cover (anything after this the map doesn't wait for)
            let want: int = BASE._saveCounterA | 0;
            let sent: boolean = false;
            if (!BASE._saving) {
                sent = BASE.SaveB();
            }
            PLEASEWAIT.Show(KEYS.Get("io_tr_glb_saving_yard")); // (QoL #235)
            GLOBAL._ioMapWait = new Sprite();
            let waiting: (e: Event) => void = (e: Event): void => {
                let late: boolean = getTimer() - started >= GLOBAL.IO_MAP_WAIT_MS;
                if (!late) {
                    if (BASE._saving) {
                        return;
                    }
                    // (the save that was out when the player clicked is back: the one for the click goes now, if
                    // that one didn't cover it)
                    if (!sent && (BASE._saveCounterB | 0) < want) {
                        sent = true;
                        if (BASE.SaveB()) {
                            return;
                        }
                    }
                }
                GLOBAL._ioMapWait.removeEventListener(Event.ENTER_FRAME, waiting);
                GLOBAL._ioMapWait = null;
                PLEASEWAIT.Hide();
                GLOBAL.ioOpenMap();
            };
            GLOBAL._ioMapWait.addEventListener(Event.ENTER_FRAME, waiting);
            return;
        }
        GLOBAL.ioOpenMap();
    }

    /**
     * The map is opening: open already, or waiting for the yard's save (ShowMap's own wait, or the map room's
     * older one). Its callers keep where it should open (MapRoom.ioFocus) only while this is true. (12 October:
     * they asked only the older wait, so while a save was out the place was dropped and the map opened at home:
     * the leaderboards' Jump, a place shared in chat, the Outposts list's Map.)
     */
    public static ioMapOpening(): boolean {
        return Boolean(GLOBAL._showMapWaiting) || GLOBAL._ioMapWait != null || GLOBAL.isMapOpen();
    }

    /** The longest the map waits for the yard's save when it is opened (ShowMap). */
    public static readonly IO_MAP_WAIT_MS: int = 5000;

    /** Opens the map now (ShowMap, once the yard is saved). */
    private static ioOpenMap(): void {
        if (!BASE._loading) {
            if (BASE.usesInfernoBackend) {
                BASE._needCurrentCell = false;
                MAPROOM_INFERNO.Setup();
                MAPROOM_INFERNO.Show();
            } else if (MapRoomManager.instance.isInMapRoom2or3) {
                BASE._needCurrentCell = false;
                MapRoomManager.instance.SetupAndShow();
            } else {
                MAPROOM.Setup();
                MAPROOM.Show();
            }
        }
    }

    public static isMapOpen(): boolean {
        return MAPROOM_INFERNO._open || MapRoomManager.instance.isOpen || MAPROOM._open;
    }

    public static OpenMap(param1: string): void {
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.status) {
            if (_loc2_.status == "open") {
                GLOBAL.ShowMap();
            } else {
                GLOBAL.ErrorMessage(as3.str(_loc2_.error_message), GLOBAL.ERROR_ORANGE_BOX_ONLY);
            }
        } else {
            LOGGER.Log("err", "OpenMap " + param1);
        }
    }

    public static ToTime(totalSeconds: int, includeDays: boolean = false, includeHours: boolean = true, includeMinutes: boolean = true, includeSeconds: boolean = false): string {
        let days: int = 0;
        let hours: int = 0;
        let minutes: int = 0;
        let seconds: int = 0;
        if (totalSeconds < 0) {
            totalSeconds = 0;
        }
        if (totalSeconds >= 86400) {
            days = Math.floor(totalSeconds / 86400) | 0;
            totalSeconds = (totalSeconds - days * 86400) | 0;
        }
        if (totalSeconds >= 3600) {
            hours = Math.floor(totalSeconds / 3600) | 0;
            totalSeconds = (totalSeconds - hours * 3600) | 0;
        }
        if (totalSeconds >= 60) {
            minutes = Math.floor(totalSeconds / 60) | 0;
            totalSeconds = (totalSeconds - minutes * 60) | 0;
        }
        seconds = totalSeconds;
        let formattedDuration: string = "";
        if (includeDays) {
            if (days) {
                formattedDuration = days + KEYS.Get("global_days_short") + " ";
            }
            if (Boolean(hours) || Boolean(days) || includeSeconds) {
                formattedDuration += GLOBAL.DoubleDigit(hours) + KEYS.Get("global_hours_short") + " ";
            }
            if (Boolean(minutes) || Boolean(hours) || Boolean(days) || includeSeconds) {
                formattedDuration += GLOBAL.DoubleDigit(minutes) + KEYS.Get("global_minutes_short") + " ";
            }
            if (includeHours || days + hours + minutes == 0 || includeSeconds) {
                formattedDuration += GLOBAL.DoubleDigit(seconds) + KEYS.Get("global_seconds_short");
            }
        } else {
            if (days) {
                if (days > 1) {
                    formattedDuration += days + KEYS.Get("global_days") + " ";
                } else {
                    formattedDuration += days + KEYS.Get("global_day") + " ";
                }
            }
            if (Boolean(hours) || Boolean(days) || includeSeconds) {
                if (hours > 1) {
                    formattedDuration += hours + KEYS.Get("global_hours") + " ";
                } else {
                    formattedDuration += hours + KEYS.Get("global_hour") + " ";
                }
            }
            if (Boolean(minutes) || Boolean(hours) || Boolean(days) || includeSeconds) {
                if (minutes > 1) {
                    formattedDuration += minutes + KEYS.Get("global_minutes") + " ";
                } else {
                    formattedDuration += minutes + KEYS.Get("global_minute") + " ";
                }
            }
            if (minutes > 0 || hours > 0 || days == 0 || includeSeconds) {
                if (seconds > 0 && (includeHours || days + hours + minutes == 0)) {
                    formattedDuration += GLOBAL.dd(seconds) + KEYS.Get("global_seconds_short");
                }
            }
        }
        return formattedDuration;
    }

    public static ToTimeVague(param1: int): string {
        let _loc4_: string = null;
        let _loc5_: number = NaN;
        let _loc2_: number = param1;
        let _loc3_: number = Math.ceil(_loc2_ / 86400);
        if (_loc3_ > 1) {
            _loc4_ = _loc3_ + " " + KEYS.Get("global_days");
        } else if ((_loc5_ = Math.ceil(_loc2_ / 3600)) > 1) {
            _loc4_ = _loc5_ + " " + KEYS.Get("global_hours");
        } else {
            _loc4_ = "&lt; 1 " + KEYS.Get("global_hour");
        }
        return _loc4_;
    }

    public static dd(param1: int): string {
        if (param1 < 10) {
            return "0" + param1;
        }
        return as3.str(param1.toString());
    }

    public static ErrorMessage(param1: string = "", param2: int = 0, ioQuiet: boolean = false, ioKeepLogin: boolean = true): Function {
        let em: ERRORMESSAGE = null;
        let err: string = param1;
        let errortype: int = param2;
        // (Inferno-only, QoL #446: a failure the server reported itself says its ref in small print)
        if (GLOBAL.INFERNO_ONLY) {
            err = IoWin.withRef(err, URLLoaderApi.ioRefFor(err));
        }
        print(err + "@ " + Console.getSource(3));
        // (Inferno-only, QoL #626: no music behind the Oops window)
        if (GLOBAL.INFERNO_ONLY) {
            SOUNDS.ioStopMusic();
        }
        em = new ERRORMESSAGE();
        em.Show(err, errortype, ioQuiet, ioKeepLogin);
        return (param1: MouseEvent = null): void => {
        };
    }

    /** Inferno-only (QoL #463): a message that must not wait in the popup queue (the maintenance notice). */
    public static _ioMessageNow: boolean = false;

    public static Message(param1: string, param2: string = null, param3: Function = null, param4: any[] = null, param5: string = null, param6: Function = null, param7: any[] = null, param8: int = 1, param9: boolean = true): MESSAGE {
        let _loc10_: MESSAGE = null;
        IoBugReport.Screen("message: " + param1);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #446: a failure the server reported itself says its ref in small print)
            param1 = IoWin.withRef(param1, URLLoaderApi.ioRefFor(param1));
        }
        _loc10_ = new MESSAGE();
        // (Inferno-only, QoL #463: while a yard loads, it waits its turn in the popup queue instead of stacking on it)
        _loc10_.ioQueued = GLOBAL.INFERNO_ONLY && !GLOBAL._ioMessageNow && POPUPS.ioQueueing();
        return _loc10_.Show(param1, param2, param3, param4, param5, param6, param7, param8, param9);
    }

    /**
     * Inferno-only (QoL #486): the one confirmation for things that can't be taken back (recycle, stop, cancel,
     * relocate, sacrifice, leave, kick, disband): a safe button that only closes ("Keep" or `keep`), and the verb in
     * red, which takes no click for its first 0.4 s (a double click or a stray tap on the panel's button no longer
     * goes straight through). Enter doesn't press either (QoL #37); Esc and the X close it. Elsewhere: a plain
     * GLOBAL.Message with the verb.
     */
    public static ioDanger(text: string, verb: string, onYes: Function, args: any[] = null, keep: string = null): MESSAGE {
        if (!GLOBAL.INFERNO_ONLY) {
            return GLOBAL.Message(text, verb, onYes, args);
        }
        let m: MESSAGE = GLOBAL.Message(text, keep || KEYS.Get("io_keep"), null, null, verb, onYes, args);
        let armedAt: int = (getTimer() + 400) | 0;
        let b: any = m.bAction2;
        if (b) {
            b.name = "ioDangerVerb";
            if (b._txt) {
                b._txt.htmlText = "<b><font color=\"#B00000\">" + verb + "</font></b>";
            }
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (getTimer() < armedAt) {
                    e.stopImmediatePropagation();
                }
            }, false, 1000);
        }
        if (m.bAction) {
            m.bAction.name = "ioDangerKeep";
        }
        return m;
    }

    public static Confirm(param1: string, param2: string = null, param3: Function = null, param4: any[] = null, param5: int = 1): void {
        let _loc6_: MESSAGE = null;
        (_loc6_ = new MESSAGE()).Show(param1, param2, param3, param4, as3.str(param5.toString()));
    }

    /** Inferno-only (QoL #575): a big number short: 999, 12.3K, 123K, 1.96M, 19.6M, 196M, 1.96B. */
    public static ioShort(n: number): string {
        let a: number = Math.abs(n);
        let sign: string = n < 0 ? "-" : "";
        let cut: Function = (v: number, unit: string): string => {
            let d: int = v < 10 ? 2 : (v < 100 ? 1 : 0);
            let t: string = v.toFixed(d);
            if (d > 0) {
                t = t.replace(/\.?0+$/, "");
            }
            return sign + t + unit;
        };
        if (a < 1000) {
            return sign + Math.floor(a);
        }
        if (a < 1e6) {
            return cut(Math.floor(a / 100) / 10, "K");
        }
        if (a < 1e9) {
            return cut(Math.floor(a / 1e4) / 100, "M");
        }
        return cut(Math.floor(a / 1e7) / 100, "B");
    }

    public static FormatNumber(param1: number): string {
        let _loc4_: number = NaN;
        // (Inferno-only, QoL #577: the language's thousands separator (io_fmt_group: "comma", "space", "dot"; English
        // keeps its commas), and a negative number grouped after its sign: "-123,456", it was "-,123,456")
        if (GLOBAL.INFERNO_ONLY) {
            let whole: number = Math.floor(param1);
            if (!isFinite(whole) || Math.abs(whole) >= 1e21) {
                return String(whole);
            }
            let group: string = KEYS.Get("io_fmt_group");
            let sep: string = group == "space" ? "\u00A0" : (group == "dot" ? "." : ",");
            let digits: string = String(Math.abs(whole));
            let parts: any[] = [];
            let end: int = digits.length;
            while (end > 0) {
                let start: int = Math.max(end - 3, 0) | 0;
                parts.unshift(digits.slice(start, end));
                end = start;
            }
            return (whole < 0 ? "-" : "") + parts.join(sep);
        }
        param1 = Math.floor(param1);
        let _loc2_: string = as3.str(param1.toString());
        let _loc3_: any[] = new Array();
        let _loc5_: int = _loc2_.length;
        while (_loc5_ > 0) {
            _loc4_ = Math.max(_loc5_ - 3, 0);
            _loc3_.unshift(_loc2_.slice(_loc4_, _loc5_));
            _loc5_ = _loc4_ | 0;
        }
        return _loc3_.join(",");
    }

    public static DoubleDigit(param1: int): string {
        if (param1 < 10) {
            return "0" + param1;
        }
        return as3.str(param1.toString());
    }

    public static NextCreepID(): int {
        ++GLOBAL._creepCount;
        return GLOBAL._creepCount;
    }

    public static DataCheck(param1: string): boolean {
        let _loc3_: any = null;
        let _loc2_: string = param1;
        _loc3_ = JSON.parse(_loc2_);
        let _loc4_: string = String(_loc3_.h);
        let _loc5_: int = _loc3_.hid | 0;
        _loc2_ = _loc2_.split(",\"h\":\"" + _loc4_ + "\"").join("");
        _loc2_ = _loc2_.split(",\"hid\":" + _loc5_).join("");
        let _loc6_: string = null;
        if ((_loc6_ = String(md5("ilevbioghv890347ho3nrkljebv" + _loc2_ + _loc5_ * (_loc5_ % 11)))) == _loc4_) {
            return true;
        }
        GLOBAL.ErrorMessage("Hash in Fail");
        return false;
    }

    public static Check(): string {
        let tmpArray: any[] = null;
        tmpArray = null;
        let Push: Function = (param1: int): void => {
            let _loc3_: int = 0;
            let _loc4_: any[] = null;
            let _loc5_: any[] = null;
            let _loc2_: any = GLOBAL._buildingProps[param1];
            if (_loc2_.group != 999) {
                tmpArray.push([_loc2_.id, _loc2_.type, _loc2_.size, _loc2_.cycle, _loc2_.attackgroup, _loc2_.quantity, _loc2_.produce, _loc2_.cycleTime, _loc2_.hp, _loc2_.repairTime]);
                if (_loc2_.capacity) {
                    tmpArray.push(_loc2_.capacity);
                }
                if (_loc2_.costs) {
                    _loc4_ = as3.cast(_loc2_.costs, Array);
                    _loc3_ = 0;
                    while (_loc3_ < _loc4_.length) {
                        tmpArray.push(_loc4_[_loc3_].r1.Get());
                        tmpArray.push(_loc4_[_loc3_].r2.Get());
                        tmpArray.push(_loc4_[_loc3_].r3.Get());
                        tmpArray.push(_loc4_[_loc3_].r4.Get());
                        tmpArray.push(_loc4_[_loc3_].r5);
                        tmpArray.push(_loc4_[_loc3_].time.Get());
                        tmpArray.push(_loc4_[_loc3_].re);
                        _loc3_++;
                    }
                }
                if (_loc2_.fortify_costs) {
                    _loc5_ = as3.cast(_loc2_.fortify_costs, Array);
                    _loc3_ = 0;
                    while (_loc3_ < _loc5_.length) {
                        tmpArray.push(_loc5_[_loc3_].r1.Get());
                        tmpArray.push(_loc5_[_loc3_].r2.Get());
                        tmpArray.push(_loc5_[_loc3_].r3.Get());
                        tmpArray.push(_loc5_[_loc3_].r4.Get());
                        tmpArray.push(_loc5_[_loc3_].r5);
                        tmpArray.push(_loc5_[_loc3_].time.Get());
                        tmpArray.push(_loc5_[_loc3_].re);
                        _loc3_++;
                    }
                }
            }
        };
        tmpArray = [];
        let i: int = 0;
        while (i < GLOBAL._buildingProps.length) {
            Push(i);
            i++;
        }
        return md5(JSON.stringify(tmpArray));
    }

    public static Brag(param1: string, param2: string, param3: string, param4: string): void {
        GLOBAL.CallJS("sendFeed", [param1, KEYS.Get(param2), KEYS.Get(param3), param4]);
    }

    public static CallJS(param1: string, param2: any[] = null, param3: boolean = true): void {
        if (GLOBAL.debugLogJSCalls) {
            print("CallJS> func: " + param1 + " \n     args: " + JSON.stringify(param2) + " \n     exitFS: " + param3);
        }
        if (GLOBAL.INFERNO_ONLY && param1 == "reloadPage") {
            // Inferno-only: "reloadPage" was a function on the old Facebook page, which the projector and
            // the browser client don't have, so every "reload" that went through here did nothing (closing
            // a popup once the game had stopped, for one). Load the game again, still logged in.
            GAME.ioReload(true);
            return;
        }
        if (GLOBAL._local) {
            return;
        }
        if (ExternalInterface.available) {
            if (param2 == null) {
                ExternalInterface.call("callFunc", param1);
            } else {
                ExternalInterface.call("callFunc", param1, param2);
            }
        }
    }

    public static CallJSWithClient(param1: string, param2: string = "", param3: any[] = null, param4: boolean = true): void {
        if (GLOBAL.debugLogJSCalls) {
            print("CallJS> func: " + param1 + " \n     args: " + JSON.stringify(param3) + " \n     exitFS: " + param4);
        }
        if (GLOBAL._local) {
            return;
        }
        if (ExternalInterface.available) {
            if (param3 == null) {
                ExternalInterface.call("clientCallWithCallback", param1, param2);
            } else {
                ExternalInterface.call("clientCallWithCallback", param1, param2, param3);
            }
        }
    }

    public static Array2String(param1: any[]): string {
        let _loc2_: any = "";
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            _loc2_ += GLOBAL.FormatNumber(Number(param1[_loc3_][0])) + " " + param1[_loc3_][1];
            if (_loc3_ < param1.length - 2) {
                _loc2_ += ", ";
            }
            if (_loc3_ == param1.length - 2) {
                _loc2_ += GLOBAL.INFERNO_ONLY ? KEYS.Get("io_word_and") : " and ";
            }
            _loc3_++;
        }
        return as3.str(_loc2_);
    }

    public static Array2StringB(param1: any[]): string {
        let _loc2_: any = "";
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            _loc2_ += param1[_loc3_][1];
            if (_loc3_ < param1.length - 2) {
                _loc2_ += ", ";
            }
            if (_loc3_ == param1.length - 2) {
                _loc2_ += GLOBAL.INFERNO_ONLY ? KEYS.Get("io_word_and") : " and ";
            }
            _loc3_++;
        }
        return as3.str(_loc2_);
    }

    public static getShinyCostFromResourceAmt(param1: number): int {
        return Math.ceil(Math.pow(Math.sqrt(param1 / 2), 0.75)) | 0;
    }

    public static ABTestHealingTimeShinyMod(): number {
        let _loc1_: number = 1;
        if (ABTest.isInTestGroup("healcosts", 84)) {
            _loc1_ = 0.8625;
        } else if (ABTest.isInTestGroup("healcosts", 168)) {
            _loc1_ = 1.4375;
        } else if (ABTest.isInTestGroup("healcosts", 256)) {
            _loc1_ = 1.15;
        }
        return _loc1_;
    }

    public static GetGameHeight(): int {
        return GLOBAL._ROOT.stage.stageHeight;
    }

    /**
     * Inferno-only (19 October, the user's: "Do not time the user out for being afk anymore for any reason"). The game
     * didn't run for over 5 minutes: a phone locked or a tab put away (the browser froze the page). It used to stop
     * there ("You were away...", Reload). The yard may have changed on the server meanwhile (attacks, another device),
     * so this copy still mustn't play on or save as it was: at home (a yard being built) the yard is loaded again where
     * it is, nothing saved till then (BASE.Setup lets saves go again); anywhere else (an attack long over, a replay, a
     * minigame) the game reloads by itself, still logged in. No stop, and no button to press.
     */
    public static ioBackAfterAway(): void {
        let home: boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && !BASE._loading && !IoReplayPlayer.playing && !GLOBAL.ioTdMode() && !GLOBAL._ioDesign;
        if (home) {
            GLOBAL._ioBackToast = true;
            BASE._blockSave = true;
            if (BASE.LoadBase(null, 0, BASE._loadedBaseID, GLOBAL.mode, false, BASE.yardType)) {
                return;
            }
            BASE._blockSave = false;
            GLOBAL._ioBackToast = false;
        }
        GAME.ioReload(true);
    }

    /** (19 October) The yard is being loaded again after a long time away: a word once it is up (BASE). */
    public static _ioBackToast: boolean = false;

    public static AFK(): void {
        if (!GLOBAL._catchup) {
            // Inferno-only (10 October): the Brimstone Pit's and the Devil's Arcade's games are played with clicks in
            // one place and with the keys, which the mouse rule below doesn't see: while either window is open the
            // player is there ("Anyone home?" and the timeout never come from a game).
            if (GLOBAL.INFERNO_ONLY && (CasinoWindow.isOpen || ArcadeWindow.isOpen)) {
                GLOBAL.UpdateAFKTimer();
            }
            if (Math.abs(GLOBAL._ROOT.mouseX - GLOBAL._oldMousePoint.x) > 50 || (GLOBAL.INFERNO_ONLY && Math.abs(GLOBAL._ROOT.mouseY - GLOBAL._oldMousePoint.y) > 50) || GLOBAL._afktimer.Get() == 0) {
                GLOBAL._oldMousePoint = new Point(GLOBAL._ROOT.mouseX, GLOBAL._ROOT.mouseY);
                GLOBAL.UpdateAFKTimer();
            }
            if (GLOBAL.INFERNO_ONLY) {
                IoMaintenance.Tick();
                // (19 October, the user's: "Do not time the user out for being afk anymore for any reason": no
                // "Still there?" a minute before, and no stop after 10 idle minutes; the timer is still kept)
                return;
            }
            let ioIdle: number = GLOBAL.Timestamp() - GLOBAL._afktimer.Get();
            if (GLOBAL.INFERNO_ONLY && ioIdle >= 60 * 9 && ioIdle < 60 * 10 && GLOBAL._ioAfkWarnedAt != GLOBAL._afktimer.Get()) {
                // (QoL #636: a minute before the game stops, a soft chime and a word)
                GLOBAL._ioAfkWarnedAt = GLOBAL._afktimer.Get();
                SOUNDS.Play("clock1", 0.3);
                IoToast.Show(KEYS.Get("io_afk_soon"), 15000);
            }
            if (GLOBAL.Timestamp() - GLOBAL._afktimer.Get() == 60 * 6 && !MapRoomManager.instance.isOpen) {
                POPUPS.AFK();
            } else if (GLOBAL.Timestamp() - GLOBAL._afktimer.Get() > 60 * 10) {
                POPUPS.Timeout();
            }
        }
    }

    public static StatGet(param1: string): int {
        if (GLOBAL.ioPhoneStat(param1)) {
            return GLOBAL.ioPhoneValue(param1);
        }
        let _loc2_: int = 0;
        if (GLOBAL._otherStats[param1]) {
            _loc2_ = GLOBAL._otherStats[param1] | 0;
        }
        return _loc2_;
    }

    public static StatSet(param1: string, param2: int, param3: boolean = true): void {
        let _loc4_: boolean = false;
        if (MapRoomManager.instance.isInMapRoom3 && param1 === "mrl" && param2 !== 3) {
            return;
        }
        if (GLOBAL.ioPhoneStat(param1)) {
            GLOBAL.ioPhoneValue(param1, param2);
            return;
        }
        if (!GLOBAL._otherStats) {
            GLOBAL._otherStats = {};
        }
        if (param2 == 0 && Boolean(GLOBAL._otherStats[param1])) {
            delete GLOBAL._otherStats[param1];
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        } else if (!GLOBAL._otherStats[param1]) {
            GLOBAL._otherStats[param1] = param2;
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        } else if (GLOBAL._otherStats[param1] != param2) {
            GLOBAL._otherStats[param1] = param2;
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        }
    }

    public static StatGetStr(param1: string): string {
        let _loc2_: string = "";
        if (GLOBAL._otherStats[param1]) {
            _loc2_ = String(GLOBAL._otherStats[param1]);
        }
        return _loc2_;
    }

    public static StatSetStr(param1: string, param2: string, param3: boolean = true): void {
        let _loc4_: boolean = false;
        if (!GLOBAL._otherStats) {
            GLOBAL._otherStats = {};
        }
        if (param2.length > 0 && Boolean(GLOBAL._otherStats[param1])) {
            delete GLOBAL._otherStats[param1];
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        } else if (!GLOBAL._otherStats[param1]) {
            GLOBAL._otherStats[param1] = param2;
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        } else if (GLOBAL._otherStats[param1] != param2) {
            GLOBAL._otherStats[param1] = param2;
            if (param3) {
                BASE.Save();
            }
            _loc4_ = true;
        }
    }

    public static BlockerAdd(param1: Sprite = null): void {
        let _loc2_: DisplayObject = null;
        GLOBAL.RefreshScreen();
        if (!param1) {
            param1 = GLOBAL._layerWindows;
        }
        _loc2_ = param1.addChild(new popup_bg());
        _loc2_.width = GLOBAL._ROOT.stage.stageWidth;
        _loc2_.height = GLOBAL._ROOT.stage.stageHeight;
        _loc2_.x = GLOBAL._SCREEN.x;
        _loc2_.y = GLOBAL._SCREEN.y;
        GLOBAL._blockerList.push(_loc2_);
    }

    /** Inferno-only (QoL #470): a building being placed, kept (hidden) while a window is open over the yard. */
    private static _ioHeld: any = null;

    /**
     * QoL #470: a window opens over the yard while a building from the build menu is in the hand: it is hidden, not
     * dropped, and comes back when the window closes (ioHoldBack). Elsewhere (not Inferno-only) it is cancelled as before.
     */
    public static ioHoldPut(): void {
        let b: any = GLOBAL._newBuilding;
        if (!b) {
            return;
        }
        if (!GLOBAL.INFERNO_ONLY) {
            b.Cancel();
            return;
        }
        GLOBAL._ioHeld = b;
        GLOBAL.ioHeldShown(b, false);
    }

    /** The held building's pictures (the building and its footprint) shown or hidden. */
    private static ioHeldShown(b: any, on: boolean): void {
        for (let k of ["_mc", "_mcFootprint", "_mcBase"]) {
            try {
                if (b[k] && b[k].visible !== undefined) {
                    b[k].visible = on;
                }
            } catch (e) {
            }
        }
        // (a stand-in, or anything else that is a picture itself)
        if (b.visible !== undefined) {
            b.visible = on;
        }
    }

    /** The building put away by ioHoldPut, back in the hand (if it is still the one being placed). */
    public static ioHoldBack(): void {
        let b: any = GLOBAL._ioHeld;
        GLOBAL._ioHeld = null;
        if (b && GLOBAL._newBuilding == b) {
            GLOBAL.ioHeldShown(b, true);
        }
    }

    /**
     * Inferno-only (QoL #464): a click on the dark backdrop last added (BlockerAdd) calls `close`, for a window
     * that is only read (the Change Log, Leaderboards, Attack Log, Quest Book, Who's Online, Outposts, Alliances;
     * not Mail, where a letter may be half written). Not while a message or another window with its own backdrop
     * is over it.
     */
    public static ioBackdropCloses(close: Function): void {
        if (!GLOBAL.INFERNO_ONLY || !GLOBAL._blockerList || GLOBAL._blockerList.length == 0) {
            return;
        }
        let blocker: Sprite = as3.as(GLOBAL._blockerList[GLOBAL._blockerList.length - 1], Sprite);
        if (!blocker) {
            return;
        }
        blocker.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            let layer: DisplayObjectContainer = blocker.parent;
            if (!layer || e.target != blocker) {
                return;
            }
            // (nothing over the window that asks something: another backdrop, a message; a toast or a tip is fine)
            for (let i: int = (layer.getChildIndex(blocker) + 1) | 0; i < layer.numChildren; i++) {
                let above: DisplayObject = layer.getChildAt(i);
                if (above instanceof popup_bg || above instanceof MESSAGE) {
                    return;
                }
            }
            close();
        });
    }

    /** BASE.Cleanup: the layers the blockers were on are gone; a later BlockerRemove must not pop one of those. */
    public static ioBlockersReset(): void {
        GLOBAL._blockerList = [];
    }

    /** Inferno-only (QoL #38): a window's dark backdrop is showing (something modal is open). */
    public static get ioBlocked(): boolean {
        for (let b of GLOBAL._blockerList ? GLOBAL._blockerList : []) {
            if (b && b.stage && b.visible) {
                return true;
            }
        }
        return false;
    }

    public static BlockerRemove(): void {
        let _loc1_: DisplayObject = null;
        if (GLOBAL._blockerList) {
            _loc1_ = as3.cast(GLOBAL._blockerList.pop(), DisplayObject);
            if (_loc1_) {
                _loc1_.parent.removeChild(_loc1_);
            }
        }
    }

    public static SaveAttackersDeltaResources(): void {
        let _loc1_: int = 0;
        if (GLOBAL._attackersDeltaResources.dirty) {
            _loc1_ = 1;
            while (_loc1_ < 5) {
                if (GLOBAL._attackersDeltaResources["r" + _loc1_]) {
                    if (GLOBAL._savedAttackersDeltaResources["r" + _loc1_]) {
                        GLOBAL._savedAttackersDeltaResources["r" + _loc1_].Add(GLOBAL._attackersDeltaResources["r" + _loc1_].Get());
                    } else {
                        GLOBAL._savedAttackersDeltaResources["r" + _loc1_] = new SecNum(Number(GLOBAL._attackersDeltaResources["r" + _loc1_].Get()));
                    }
                }
                _loc1_++;
            }
        }
        GLOBAL._attackersDeltaResources = { "dirty": false };
    }

    public static CleanAttackersDeltaResources(): void {
        GLOBAL._savedAttackersDeltaResources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "dirty": false };
    }

    /**
     * Inferno-only: the server refused the login during play (HTTP 401 from URLLoaderApi): the account
     * logged in somewhere else (the server keeps one login per account), the login expired, or the
     * player was banned. Every later request would fail too, so stop once, say why, and offer the login
     * page. Before this, the first failed poll showed "Base.Page: Could not authenticate" (bug report #19).
     */
    /** Inferno-only: the server no longer takes this game's login (ioSessionEnded has run). */
    public static get ioSessionIsOver(): boolean {
        return GLOBAL._ioSessionEnded;
    }

    public static ioSessionEnded(error: string = null): void {
        if (GLOBAL._ioSessionEnded || GLOBAL._halt) {
            return;
        }
        GLOBAL._ioSessionEnded = true;
        print("Login no longer valid (HTTP 401)");
        // (the saved login is no good any more: Reload opens the login page)
        LOGIN.ioForgetLogin();
        LOGIN.token = null;
        if (error && error.indexOf("Banned: ") == 0) {
            // (QoL #201: banned while playing: said, with the reason)
            GLOBAL.ErrorMessage(KEYS.Get("io_t3k_banned", { "v1": error.substr(8) }), GLOBAL.ERROR_OOPS_ONLY, true, false);
            return;
        }
        if (error && error.indexOf("another device") >= 0) {
            // (13 October) a newer session of this account, here or elsewhere, was let in ("Play here")
            // (QoL #524: where and when, in the player's own time, when the server says)
            let where: any = /\[where: ([^;\]]*); at: ([^\]]*)\]/.exec(error);
            let detail: string = "";
            if (where) {
                let at: Date = new Date(String(where[2]));
                let clock: string = isNaN(at.getTime()) ? "" : ("0" + at.getHours()).slice(-2) + ":" + ("0" + at.getMinutes()).slice(-2);
                // (QoL #235: one sentence per case, in the player's language)
                let whereHtml: string = where[1] ? String(where[1]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
                detail = "<br><br>" + KEYS.Get(where[1] ? (clock ? "io_t3k_began_on_at" : "io_t3k_began_on") : clock ? "io_t3k_began_at" : "io_t3k_began", { "v1": whereHtml, "v2": clock }) + " " + KEYS.Get("io_t3k_began_notyou");
            }
            GLOBAL.ErrorMessage(KEYS.Get("io_t3k_signed_out_other", { "v1": detail }), GLOBAL.ERROR_OOPS_ONLY, true, false);
            return;
        }
        if (error && (error.indexOf("another browser") >= 0 || error.indexOf("network") >= 0)) {
            GLOBAL.ErrorMessage(KEYS.Get("io_t3k_logged_out_browser"), GLOBAL.ERROR_OOPS_ONLY, true, false);
            return;
        }
        GLOBAL.ErrorMessage(KEYS.Get("io_t3k_logged_out"), GLOBAL.ERROR_OOPS_ONLY, true, false);
    }

    private static ioCheckBuild(): void {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL._ioOutdatedShown || !GLOBAL._flags || !GLOBAL._flags.io_build) {
            return;
        }
        if (Number(GLOBAL._flags.io_build) > IOBuild.stamp) {
            GLOBAL._ioOutdatedShown = true;
            GLOBAL.ErrorMessage(KEYS.Get("io_t3k_new_version"), GLOBAL.ERROR_OOPS_ONLY, true);
        }
    }

    public static SetFlags(serverFlags: any): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let ioKey: string = null;
        if (GLOBAL.INFERNO_ONLY && GLOBAL._flags && serverFlags) {
            for (const $value of as3.values(GLOBAL.IO_STICKY_FLAGS)) {
                ioKey = as3.str($value);
                if (!serverFlags[ioKey] && GLOBAL._flags[ioKey]) {
                    serverFlags[ioKey] = GLOBAL._flags[ioKey];
                }
            }
        }
        GLOBAL._flags = serverFlags;
        GLOBAL.ioCheckBuild();
        // (Inferno-only, 23 October: each picture's own version)
        if (GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_assetmap) {
            GLOBAL.ioLoadAssetMap(String(GLOBAL._flags.io_assetmap));
        }
        if (GLOBAL.INFERNO_ONLY) {
            // Storage each captured outpost adds, per resource (InfernoOnlyConfig.outpostCapacity).
            GLOBAL._outpostCapacity = new SecNum(GLOBAL.ioFlag("io_outpost_capacity", 2000000));
        }
        if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_announce) {
            GLOBAL.ioShowAnnouncement(String(GLOBAL._flags.io_announce));
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #400, #210: maintenance planned, or begun)
            IoMaintenance.Update(GLOBAL._flags.io_maintenance ? String(GLOBAL._flags.io_maintenance) : "");
        }
        if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_notice) {
            // A one-time notice from the server (a referral paid out, for instance).
            GLOBAL.Message(String(GLOBAL._flags.io_notice));
            GLOBAL._flags.io_notice = "";
        }
        if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
            _loc2_ = LOGIN._digits[LOGIN._digits.length - 1] | 0;
            _loc3_ = LOGIN._digits[LOGIN._digits.length - 2] | 0;
            _loc4_ = LOGIN._digits[LOGIN._digits.length - 3] | 0;
            GLOBAL._flags.midgameIncentive = 0;
        }
        if (LOGIN._sumdigit != 0) {
            GLOBAL._flags.plinko = 0;
        }
        GLOBAL._flags.showProgressBar = 0;
    }

    public static ResizeGame(param1: Event): void {
        let _loc2_: int = 0;
        if (GLOBAL._fluidWidthEnabled && GAME._firstLoadComplete) {
            GLOBAL.RefreshScreen();
            UI2.ResizeHandler(param1);
            _loc2_ = 0;
            GLOBAL.ResizeLayer(GLOBAL._layerUI);
            GLOBAL.ResizeLayer(GLOBAL._layerWindows);
            GLOBAL.ResizeLayer(GLOBAL._layerMessages);
            GLOBAL.ResizeLayer(GLOBAL._layerTop);
            if (GLOBAL.INFERNO_ONLY) {
                POPUPSETTINGS.ioRecenter();
            }
            if (TUTORIAL._stage < TUTORIAL._endstage) {
                TUTORIAL.Resize();
            }
        } else {
            UI2.ResizeHandler(param1);
        }
    }

    public static RefreshScreen(): void {
        let _loc3_: Rectangle = null;
        let _loc1_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc2_: int = GLOBAL.GetGameHeight();
        let _loc4_: int = UI2._wildMonsterBar != null ? 40 : 0;
        if (!GLOBAL._SCREEN || !GLOBAL._SCREEN.x || !GLOBAL._SCREEN.y || !GLOBAL._SCREEN.width || !GLOBAL._SCREEN.height) {
            GLOBAL._SCREEN = new Rectangle(0 - (_loc1_ - GLOBAL._SCREENINIT.width) / 2, 0 - (_loc2_ - (GLOBAL._SCREENINIT.height + _loc4_)) / 2, _loc1_, _loc2_);
        } else {
            GLOBAL._SCREEN.x = 0 - (_loc1_ - GLOBAL._SCREENINIT.width) / 2;
            GLOBAL._SCREEN.y = 0 - (_loc2_ - (GLOBAL._SCREENINIT.height + _loc4_)) / 2;
            GLOBAL._SCREEN.width = _loc1_;
            GLOBAL._SCREEN.height = _loc2_;
        }
        GLOBAL._SCREENCENTER = new Point(GLOBAL._SCREEN.x + GLOBAL._SCREEN.width / 2, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height / 2);
        if (Boolean(GLOBAL._flags) && Boolean(GLOBAL._flags.viximo)) {
            GLOBAL._SCREENHUD = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 0);
            GLOBAL._SCREENHUDLEFT = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 0);
        } else {
            GLOBAL._SCREENHUD = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 208);
            GLOBAL._SCREENHUDLEFT = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 208);
        }
        if (UI_BOTTOM && UI_BOTTOM._missions && !UI_BOTTOM._missions._open) {
            GLOBAL._SCREENHUD = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 30 - 0);
        }
        if (Chat._chatInited && Chat._bymChat && !Chat._bymChat._open) {
            GLOBAL._SCREENHUDLEFT = new Point(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 30 - 0);
        }
        if (MAP._GROUND) {
            MAP.instance.resizeViewRect();
            BFOUNDATION.updateAllRasterData();
        }
    }

    public static ResizeLayer(param1: Sprite): void {
        let _loc3_: any = null;
        let _loc4_: int = 0;
        let _loc2_: int = param1.numChildren;
        while (_loc2_--) {
            _loc3_ = param1.getChildAt(_loc2_);
            if (_loc3_.hasOwnProperty("Resize")) {
                _loc3_.Resize();
            } else if (_loc3_ instanceof popup_bg) {
                _loc3_.width = GLOBAL._SCREEN.width;
                _loc3_.height = GLOBAL._SCREEN.height;
                _loc3_.x = GLOBAL._SCREEN.x;
                _loc3_.y = GLOBAL._SCREEN.y;
                _loc4_ = 0;
                while (_loc4_ < GLOBAL._blockerList.length) {
                    GLOBAL._blockerList[_loc4_].width = GLOBAL._SCREEN.width;
                    GLOBAL._blockerList[_loc4_].height = GLOBAL._SCREEN.height;
                    GLOBAL._blockerList[_loc4_].x = GLOBAL._SCREEN.x;
                    GLOBAL._blockerList[_loc4_].y = GLOBAL._SCREEN.y;
                    _loc4_++;
                }
            } else if (_loc3_ instanceof popup_bg2) {
                _loc3_.width = GLOBAL._SCREEN.width;
                _loc3_.height = GLOBAL._SCREEN.height;
                _loc3_.x = GLOBAL._SCREEN.x;
                _loc3_.y = GLOBAL._SCREEN.y;
                _loc4_ = 0;
                while (_loc4_ < GLOBAL._blockerList.length) {
                    GLOBAL._blockerList[_loc4_].width = GLOBAL._SCREEN.width;
                    GLOBAL._blockerList[_loc4_].height = GLOBAL._SCREEN.height;
                    GLOBAL._blockerList[_loc4_].x = GLOBAL._SCREEN.x;
                    GLOBAL._blockerList[_loc4_].y = GLOBAL._SCREEN.y;
                    _loc4_++;
                }
            }
        }
    }

    public static DistanceFromRoot(param1: MovieClip): Point {
        let _loc2_: int = param1.x | 0;
        let _loc3_: int = param1.y | 0;
        let _loc4_: DisplayObjectContainer = param1.parent;
        while (_loc4_.parent) {
            _loc2_ = (_loc2_ + _loc4_.x) | 0;
            _loc3_ = (_loc3_ + _loc4_.y) | 0;
            if (_loc4_.parent == GLOBAL._ROOT.stage) {
                break;
            }
            _loc4_ = _loc4_.parent;
        }
        return new Point(_loc2_, _loc3_);
    }

    public static ThrowStackTrace(param1: string): void {
    }

    public static gotoURL(param1: string, param2: URLVariables = null, param3: boolean = true, param4: any[] = null): void {
        let _loc5_: string = null;
        let _loc6_: URLVariables = new URLVariables();
        let _loc7_: URLRequest = new URLRequest(param1);
        let _loc8_: string = "_blank";
        if (param1) {
            _loc5_ = param1;
            if (param2) {
                _loc7_.data = param2;
            }
            if (param3) {
                _loc8_ = "_blank";
            } else {
                _loc8_ = "_parent";
            }
            navigateToURL(_loc7_, _loc8_);
            if (param4) {
                LOGGER.Stat(param4);
            }
            return;
        }
    }

    public static ValidateMushroomPick(param1: BFOUNDATION): void {
        let _loc2_: Rndm = new Rndm(((param1.x * param1.y) | 0) >>> 0);
        if (((_loc2_.random() * 16) | 0) >> 2) {
            LOGGER.Log("log", "Invalid shinyshroom");
            GLOBAL.ErrorMessage("GLOBAL mushroom hack 1");
            GLOBAL._shinyShroomValid = false;
            return;
        }
        let _loc3_: int = GLOBAL._shinyShrooms.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            if (param1.x == GLOBAL._shinyShrooms[_loc4_].x && param1.y == GLOBAL._shinyShrooms[_loc4_].y) {
                LOGGER.Log("log", "Shinyshroom multi-pick");
                GLOBAL.ErrorMessage("GLOBAL mushroom hack 2");
                GLOBAL._shinyShroomValid = false;
                return;
            }
            _loc4_++;
        }
        GLOBAL._shinyShrooms.push({ "x": param1.x, "y": param1.y });
        GLOBAL._shinyShroomValid = true;
    }

    public static QuickDistance(param1: Point, param2: Point): number {
        let _loc3_: number = param1.x - param2.x;
        let _loc4_: number = param1.y - param2.y;
        return Math.sqrt(_loc3_ * _loc3_ + _loc4_ * _loc4_);
    }

    public static QuickDistanceSquared(param1: Point, param2: Point): number {
        let _loc3_: number = param1.x - param2.x;
        let _loc4_: number = param1.y - param2.y;
        return _loc3_ * _loc3_ + _loc4_ * _loc4_;
    }

    public static getEnemyCreepsInRange(param1: number, param2: Point, param3: boolean = false, param4: int = 2147483647): any[] {
        let _loc6_: any = null;
        let _loc7_: ChampionBase = null;
        let _loc9_: MonsterBase = null;
        let _loc10_: number = NaN;
        let _loc5_: any[] = [];
        let _loc8_: Point = new Point(0, 0);
        param1 *= param1;
        if (GLOBAL.isAtHomeOrInOutpost()) {
            _loc6_ = CREEPS._creeps;
            _loc7_ = CREEPS._guardian;
        } else {
            _loc6_ = CREATURES._creatures;
            _loc7_ = CREATURES._guardian;
        }
        if (_loc7_) {
            if (CREATURES._guardian != CREEPS._guardian) {
                _loc8_.x = _loc7_._mc.x;
                _loc8_.y = _loc7_._mc.y;
                if (GLOBAL.QuickDistanceSquared(_loc8_, param2) <= param1) {
                    _loc5_.push(_loc7_);
                }
            }
        }
        for (_loc9_ of as3.values(_loc6_)) {
            _loc8_.x = _loc9_._mc.x;
            _loc8_.y = _loc9_._mc.y;
            if ((_loc10_ = Number(GLOBAL.QuickDistanceSquared(_loc8_, param2))) <= param1 && (param3 || _loc9_._movement != "flying")) {
                _loc5_.push(_loc9_);
                if (_loc5_.length >= param4) {
                    return _loc5_;
                }
            }
        }
        return _loc5_;
    }

    /** Inferno-only (QoL #636): the idle time the one-minute warning was given for. */
    public static _ioAfkWarnedAt: number = -1;

    public static UpdateAFKTimer(): void {
        GLOBAL._afktimer.Set(GLOBAL.Timestamp());
    }

    public static DisplayObjectPath(param1: DisplayObject): string {
        let _loc2_: string = "";
        do {
            if (param1.name) {
                _loc2_ = param1.name + (_loc2_ == "" ? "" : "." + _loc2_);
            }
            param1 = param1.parent;
        } while (param1);

        return _loc2_;
    }

    public static GetABTestHash(param1: string, param2: int = 1): int {
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc3_: string = as3.str(LOGIN._playerID.toString());
        let _loc4_: string = String(md5(param1 + _loc3_));
        let _loc5_: int = param2;
        let _loc6_: int = 0;
        while (_loc5_ > 0) {
            _loc7_ = _loc4_.substr(_loc4_.length - 1, 1);
            _loc8_ = 0;
            _loc6_ = (_loc6_ * 16) | 0;
            switch (_loc7_) {
                case "a":
                    _loc8_ = 10;
                case "b":
                    _loc8_ = 11;
                case "c":
                    _loc8_ = 12;
                case "d":
                    _loc8_ = 13;
                case "e":
                    _loc8_ = 14;
                case "f":
                    _loc8_ = 15;
                    break;
            }
            _loc8_ = Number(_loc7_) | 0;
            _loc6_ += _loc8_;
            _loc5_--;
        }
        return _loc6_;
    }

    public static InfernoMode(param1: string = null): boolean {
        if (GLOBAL.INFERNO_ONLY && !param1) {
            return true;
        }
        let _loc2_: string = GLOBAL._loadmode;
        if (param1) {
            _loc2_ = param1;
        }
        let _loc3_: boolean = false;
        switch (_loc2_) {
            case "ibuild":
            case "iattack":
            case "iview":
            case "ihelp":
            case "iwmattack":
            case "iwmview":
                _loc3_ = true;
                break;
            case GLOBAL.e_BASE_MODE.BUILD:
            case GLOBAL.e_BASE_MODE.ATTACK:
            case "view":
            case "help":
            case "wmattack":
            case "wmview":
            default:
                _loc3_ = false;
        }
        return _loc3_;
    }

    public static GetBuildingTownHallLevel(param1: any): int {
        if (GLOBAL._bTownhall) {
            if (Boolean(param1.costs[0].re) && Boolean(param1.costs[0].re[0])) {
                return param1.costs[0].re[0][0] == INFERNOQUAKETOWER.UNDERHALL_ID ? (MAPROOM_DESCENT.DescentPassed ? GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) : (!(!param1.rewarded) ? 9 : 0)) : GLOBAL._bTownhall._lvl.Get() | 0;
            }
            return GLOBAL._bTownhall._lvl.Get() | 0;
        }
        return 0;
    }

    public static getDerps(param1: any): int {
        let _loc3_: any = null;
        let _loc2_: int = 0;
        for (_loc3_ in param1) {
            _loc2_++;
        }
        return _loc2_;
    }

    public static get magnification(): number {
        return GLOBAL._magnification;
    }

    public static set magnification(param1: number) {
        if (param1 == GLOBAL._magnification) {
            return;
        }
        print("zoom " + param1);
        param1 = Math.max(GLOBAL._MAGNIFICATION_BOUNDS.x, param1);
        param1 = Math.min(GLOBAL._MAGNIFICATION_BOUNDS.y, param1);
        TweenLite.to(GLOBAL, 0.25, { "_magnification": param1, "onUpdate": GLOBAL.onMagnificationUpdate });
    }

    private static onMagnificationUpdate(): void {
        print(GLOBAL._magnification);
        MAP._GROUND.scaleX = GLOBAL._magnification;
        // (14 October: a tilted yard's ground is k times as tall: IoTilt)
        MAP._GROUND.scaleY = IoTilt.groundScaleY(GLOBAL._magnification);
        MAP.Focus(0, 0);
        GLOBAL.RefreshScreen();
        UI_BOTTOM.Resize();
    }

    public static getPlayerGuardianIndex(param1: int): int {
        let _loc2_: int = 0;
        while (_loc2_ < GLOBAL._playerGuardianData.length) {
            if (as3.vget(GLOBAL._playerGuardianData, _loc2_).t == param1) {
                return _loc2_;
            }
            _loc2_++;
        }
        return -1;
    }

    public static isAtHome(): boolean {
        return GLOBAL._mode == "build" && BASE.isMainYardOrInfernoMainYard;
    }

    public static isAtHomeOrInOutpost(): boolean {
        return GLOBAL._mode == "build" && (BASE.isMainYard || BASE.isOutpost);
    }

    public static isDefending(): boolean {
        return GLOBAL._mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL._mode == GLOBAL.e_BASE_MODE.IBUILD;
    }

    public static isNoob(): boolean {
        return TUTORIAL._stage <= 200 && GLOBAL._sessionCount < 5;
    }

    public static handleLoadError(param1: IOErrorEvent): void {
        as3.cast(param1.target, IEventDispatcher).removeEventListener(IOErrorEvent.IO_ERROR, GLOBAL.handleLoadError);
        let _loc2_: string = "Error loading: " + param1.text;
        LOGGER.Log("log", _loc2_);
        Console.warning(_loc2_, true);
    }

    public static get StageX(): int {
        return Math.ceil((760 - GLOBAL._ROOT.stage.stageWidth) / 2) | 0;
    }

    public static get StageY(): int {
        return Math.ceil((670 - GLOBAL._ROOT.stage.stageHeight) / 2) | 0;
    }

    public static get StageWidth(): int {
        return GLOBAL._ROOT.stage.stageWidth;
    }

    public static get StageHeight(): int {
        return GLOBAL._ROOT.stage.stageHeight;
    }
}
