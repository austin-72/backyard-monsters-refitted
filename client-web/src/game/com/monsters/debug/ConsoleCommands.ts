import * as as3 from "as3";
import { ASObject, Class, int, uint } from "as3";
import { Shape } from "flash/display";
import { Event } from "flash/events";
import { GlowFilter } from "flash/filters";
import { ColorTransform } from "flash/geom";
import { getDefinitionByName } from "flash/utils";
import { BASE, BFOUNDATION, BUY, BYMConfig, CHAMPIONCAGE, CHAMPIONCAGEPOPUP, CREATURELOCKER, CREATURES, CREEPS, CUSTOMATTACKS, ChampionBase, Console, FrontPageGraphic, FrontPageLibrary, GAME, GLOBAL, KEYS, KOTHHandler, MAP, PLANNER, POPUPS, PlannerDesignView, QUESTS, RasterData, Renderer, ReplayableEvent, ReplayableEventHandler, ReplayableEventLibrary, SPECIALEVENT, SecNum, SubscriptionHandler, TUTORIAL, WMATTACK, com_monsters_frontPage_messages_Message as Message, print } from "@game";

export class ConsoleCommands extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static initialize(): void {
        Console.registerCommand("unlockquest", ConsoleCommands.unlockQuest);
        Console.registerCommand("lockquest", ConsoleCommands.lockQuest);
        Console.registerCommand("lab", ConsoleCommands.creatureLab);
        Console.registerCommand("academy", ConsoleCommands.creatureAcademy);
        Console.registerCommand("setfeedtime", ConsoleCommands.setChampionFeedTime);
        Console.registerCommand("setstarvetime", ConsoleCommands.setChampionStarveTime);
        Console.registerCommand("tut_stage", ConsoleCommands.tutorialGetStage);
        Console.registerCommand("tutorialArrowRotation", ConsoleCommands.tutorialArrowRotation);
        Console.registerCommand("resetfrontpage", ConsoleCommands.resetFrontPageData);
        Console.registerCommand("frontpageShow", ConsoleCommands.showFrontPageMsg);
        Console.registerCommand("removeDP", ConsoleCommands.removeDamageProtection);
        Console.registerCommand("settime", ConsoleCommands.setERSTime);
        Console.registerCommand("gettime", ConsoleCommands.getERSTime);
        Console.registerCommand("setscore", ConsoleCommands.setERSScore);
        Console.registerCommand("getscore", ConsoleCommands.getERSScore);
        Console.registerCommand("startevent", ConsoleCommands.startERSEvent);
        Console.registerCommand("clearers", ConsoleCommands.clearERSData);
        Console.registerCommand("setwmi2level", ConsoleCommands.setWMI2Level);
        Console.registerCommand("kothendin", ConsoleCommands.setKOTHEndDate);
        Console.registerCommand("kothdata", ConsoleCommands.getKOTHdata);
        Console.registerCommand("setKorathLevel", ConsoleCommands.setKorathLevel);
        Console.registerCommand("champCageHasKoth", ConsoleCommands.champCageHasKoth);
        Console.registerCommand("debugChampion", ConsoleCommands.setDebugChampion);
        Console.registerCommand("giveChampion", ConsoleCommands.giveChampion);
        Console.registerCommand("setChampionPL", ConsoleCommands.setChampionPL);
        Console.registerCommand("deletechamps", ConsoleCommands.deleteChampions);
        Console.registerCommand("sam", ConsoleCommands.sam);
        Console.registerCommand("ROFLPWN", ConsoleCommands.roflpwn);
        Console.registerCommand("printMaxResources", ConsoleCommands.printMaxResources);
        Console.registerCommand("showbuffradius", ConsoleCommands.showBuffRadius);
        Console.registerCommand("setkrallenlevel", ConsoleCommands.setKrallenLevel);
        Console.registerCommand("expirationDate", ConsoleCommands.setSubscriptionsExpirationDate);
        Console.registerCommand("renewalDate", ConsoleCommands.setSubscriptionsRenewalDate);
        Console.registerCommand("changeAlpha", ConsoleCommands.changeAlpha);
        Console.registerCommand("forceAFK", ConsoleCommands.forceAFK);
        Console.registerCommand("plannerZoom", ConsoleCommands.plannerZoom);
        Console.registerCommand("plannerTool", ConsoleCommands.plannerTool);
        Console.registerCommand("plannerRedraw", ConsoleCommands.plannerRedraw);
        Console.registerCommand("showbaseresources", ConsoleCommands.showBaseResources);
        Console.registerCommand("getsubscriptiondata", ConsoleCommands.subscriptionsGetSubscriptionData);
        Console.registerCommand("startsubscription", ConsoleCommands.subscriptionsStartSubscription);
        Console.registerCommand("reactivatesubscription", ConsoleCommands.subscriptionsReactivateSubscription);
        Console.registerCommand("changesubscription", ConsoleCommands.subscriptionsChangeSubscription);
        Console.registerCommand("cancelsubscription", ConsoleCommands.subscriptionsCancelSubscription);
        Console.registerCommand("givesubscription", ConsoleCommands.subscriptionsGiveSubscription);
        Console.registerCommand("trojan", ConsoleCommands.spawnTrojan);
        Console.registerCommand("wmattack", ConsoleCommands.spawnWildMonsters);
        Console.registerCommand("showsubscriptiondata", ConsoleCommands.showSubscriptionData);
        Console.registerCommand("toggleBuildingBases", ConsoleCommands.toggleBuildingBases);
        Console.registerCommand("toggleBuildingTops", ConsoleCommands.toggleBuildingTops);
        Console.registerCommand("toggleRenderer", ConsoleCommands.toggleRenderer);
        Console.registerCommand("rendererdebug", ConsoleCommands.showRendererDebug);
        Console.registerCommand("numBuildings", ConsoleCommands.showNumBuildings);
        Console.registerCommand("version", ConsoleCommands.showVersion);
        Console.registerCommand("printJS", ConsoleCommands.printJSCalls);
        Console.registerCommand("fullscreen", ConsoleCommands.toggleFullScreen);
        Console.registerCommand("ncpElligible", ConsoleCommands.fbCNcpElligibility);
    }

    private static setSubscriptionsRenewalDate(param1: any): string {
        let _loc2_: uint = param1 >>> 0;
        if (!_loc2_) {
            return "invalid date";
        }
        SubscriptionHandler.setRenewalDateDEBUG(_loc2_);
        return "renewal date set to " + new Date(_loc2_).toUTCString();
    }

    private static setSubscriptionsExpirationDate(param1: any): string {
        let _loc2_: uint = param1 >>> 0;
        if (!_loc2_) {
            return "invalid date";
        }
        SubscriptionHandler.setExpirationDateDEBUG(_loc2_);
        return "expiration date set to " + new Date(_loc2_).toUTCString();
    }

    private static setKrallenLevel(param1: any): string {
        CREATURES._krallen.levelSet(param1 | 0, 0);
        return "Set KOTH\'s level to " + param1;
    }

    private static showBuffRadius(_param1: any): string {
        let _loc2_: Shape = null;
        if (CREEPS.krallen) {
            _loc2_ = new Shape();
            _loc2_.graphics.beginFill(65280, 0.3);
            _loc2_.graphics.drawEllipse(0, 0, CREEPS.krallen._buffRadius * 2, CREEPS.krallen._buffRadius);
            _loc2_.graphics.endFill();
            _loc2_.x = -_loc2_.width / 2;
            _loc2_.y = -_loc2_.height / 2;
            CREEPS.krallen.addChild(_loc2_);
            return "toggled showing Champion buff radius.";
        }
        return "Must have a Krallen attacking.";
    }

    private static getKOTHdata(_param1: any): string {
        let _loc2_: KOTHHandler = KOTHHandler.instance;
        return "tier: " + _loc2_.tier + ", wins:" + _loc2_.wins + ", server event ends in: " + _loc2_.timeToReset;
    }

    private static sam(_param1: any): string {
        let shape: Shape = null;
        shape = null;
        shape = new Shape();
        shape.graphics.beginFill(16777215);
        shape.graphics.drawRect(GLOBAL._SCREEN.x, GLOBAL._SCREEN.y, GLOBAL._SCREEN.width, GLOBAL._SCREEN.height);
        shape.graphics.endFill();
        shape.filters = [new GlowFilter(0xffffff, 1, 10, 10, 2, 1, true)];
        GAME._instance.stage.addChild(shape);
        shape.addEventListener(Event.ENTER_FRAME, (param1: Event): void => {
            param1.currentTarget.transform.colorTransform = new ColorTransform(Math.random(), Math.random(), Math.random());
            shape.x = GLOBAL._SCREEN.x;
            shape.y = GLOBAL._SCREEN.y;
            shape.width = GLOBAL._SCREEN.width + 100;
            shape.height = GLOBAL._SCREEN.height + 100;
        });
        return "";
    }

    private static roflpwn(_param1: any): string {
        let _loc2_: int = 1;
        while (_loc2_ < CHAMPIONCAGE._guardians.length + 1) {
            CHAMPIONCAGE._guardians["G" + _loc2_].classType = CHAMPIONCAGE.CLASS_TYPE_SPECIAL;
            _loc2_++;
        }
        _loc2_ = 1;
        while (_loc2_ < CHAMPIONCAGE._guardians.length + 1) {
            GLOBAL._bCage.SpawnGuardian(6, 0, 0, _loc2_, 1000000000, "", 0, 3);
            _loc2_++;
        }
        return "  lolol";
    }

    private static printMaxResources(_param1: any): string {
        let _loc3_: int = 0;
        let _loc2_: string = "";
        _loc3_ = 1;
        while (_loc3_ < int.MAX_VALUE) {
            if (!GLOBAL._resources["r" + _loc3_ + "max"]) {
                break;
            }
            _loc2_ += "r" + _loc3_ + ":" + GLOBAL._resources["r" + _loc3_ + "max"] + " ";
            _loc3_++;
        }
        return _loc2_;
    }

    private static setDebugChampion(_param1: any): string {
        let _loc3_: ChampionBase = null;
        let _loc2_: Shape = new Shape();
        switch (true) {
            case CREATURES._guardian instanceof ChampionBase:
                _loc3_ = as3.as(CREATURES._guardian, ChampionBase);
                break;
            case CREEPS._guardian instanceof ChampionBase:
                _loc3_ = as3.as(CREEPS._guardian, ChampionBase);
                break;
            default:
                return "No Champion found.";
        }
        _loc2_.graphics.beginFill(65280);
        _loc2_.graphics.drawCircle(0, 0, 8);
        _loc2_.graphics.endFill();
        _loc3_.addChild(_loc2_);
        return "Champion debug on.";
    }

    private static deleteChampions(param1: any): string {
        if (param1) {
            return "This function is broken";
        }
        let _loc2_: int = 0;
        as3.vsetLength(GLOBAL._playerGuardianData, 0);
        as3.vsetLength(BASE._guardianData, 0);
        if (!BYMConfig.instance.RENDERER_ON) {
            _loc2_ = 0;
            while (_loc2_ < CREATURES._guardianList.length) {
                // MAP._BUILDINGTOPS.removeChild(CREATURES._guardianList[_loc2_]);
                _loc2_++;
            }
        }
        as3.vsetLength(CREATURES._guardianList, 0);
        as3.vsetLength(CREEPS._guardianList, 0);
        return "ALL champs have been destroyed, GLHF";
    }

    private static giveChampion(param1: any): string {
        let _loc3_: BFOUNDATION = null;
        if (!param1) {
            return "Specify a champion type.";
        }
        let _loc2_: any = BASE._buildingsAll;
        for (_loc3_ of as3.values(_loc2_)) {
            if (_loc3_ instanceof CHAMPIONCAGE) {
                break;
            }
        }
        if (_loc3_) {
            (as3.as(_loc3_, CHAMPIONCAGE)).SpawnGuardian(1, 0, 0, param1 | 0, CHAMPIONCAGE.GetGuardianProperty("G" + param1, 1, "health") | 0, "", 0, 1);
            return "Champion " + param1 + " given.";
        }
        return "No champion cage found.";
    }

    private static setChampionPL(param1: any): string {
        let _loc3_: ChampionBase = null;
        if (!param1) {
            return "Specify a powerlevel.";
        }
        for (_loc3_ of (CREATURES._guardianList ?? [])) {
            _loc3_._powerLevel.Set(Number(param1));
        }
        return "Champion powerlevel set to " + param1 + " .";
    }

    private static setKOTHEndDate(param1: any): string {
        let _loc2_: uint = param1 >>> 0;
        let _loc3_: uint = (_loc2_ * 3600) >>> 0;
        KOTHHandler.instance.setDebugTimeToReset(_loc3_);
        return "KOTH event will end in " + _loc3_ + " seconds.";
    }

    private static setWMI2Level(param1: any): string {
        let _loc2_: uint = param1 >>> 0;
        SPECIALEVENT.DEBUGOVERRIDEWAVE(_loc2_);
        return null;
    }

    // These functions are unused, but can serve some imagination to debug stuff
    /*
    private static function deleteTemplate(param1:*):String
    {
    var _loc2_:uint = uint(param1);
    return null;
    }
    
    private static function loadTemplateList(param1:*):String
    {
    return "this method is broken";
    }
    private static function saveCurrentBaseAsTemplate(param1:*):String
    {
    var _loc2_:uint = uint(param1);
    var _loc3_:BaseTemplate = BASE.getTemplate();
    return null;
    }
    
    private static function applyBaseTemplate(param1:*):String
    {
    return "this method is broken";
    }
     */
    private static clearERSData(_param1: any): string {
        ReplayableEventHandler.doesDebugClear = true;
        return "deleting all ers data....";
    }

    private static setERSTime(param1: any): string {
        if (!ReplayableEventHandler.debugDate) {
            ReplayableEventHandler.debugDate = new Date();
        }
        ReplayableEventHandler.debugDate.setTime(as3.as(param1 * 1000, Number));
        return "ERS time is now " + ReplayableEventHandler.debugDate.toUTCString();
    }

    private static getERSTime(_param1: any): string {
        if (!ReplayableEventHandler.debugDate) {
            return "ERS debug time not set. Using real time " + new Date(GLOBAL.Timestamp() * 1000).toUTCString();
        }
        return ReplayableEventHandler.debugDate.toUTCString();
    }

    private static setERSScore(param1: any): string {
        let _loc2_: ReplayableEvent = ReplayableEventHandler.activeEvent;
        if (!_loc2_) {
            return "There is no active event";
        }
        let _loc3_: uint = _loc2_.score >>> 0;
        _loc2_.score = as3.as(param1, uint);
        return _loc2_.name + " score was set from " + _loc3_ + " to " + param1;
    }

    private static getERSScore(_param1: any): string {
        let _loc2_: ReplayableEvent = ReplayableEventHandler.activeEvent;
        if (!_loc2_) {
            return "There is no active event";
        }
        return "score for " + _loc2_.name + " is " + _loc2_.score;
    }

    private static startERSEvent(param1: any): string {
        let _loc2_: ReplayableEvent = ReplayableEventLibrary.getEventByID(param1 >>> 0);
        if (!_loc2_) {
            return "Invalid event ID";
        }
        let _loc3_: number = ReplayableEventHandler.currentTime + 7 * 24 * 60 * 60;
        if (!_loc3_) {
            return "Could not schedule a start date for this event(probably because there\'s a new LIVE event soon";
        }
        ReplayableEventHandler.scheduleNewEvent(_loc2_, _loc3_);
        ReplayableEventHandler.initialize();
        return "Sucessfully scheduled " + _loc2_.name + " for " + new Date(_loc2_.startDate).toUTCString();
    }

    public static setChampionStarveTime(param1: any): string {
        let _loc2_: any = 0;
        if (CREATURES._guardian) {
            _loc2_ = CHAMPIONCAGE.STARVETIMER;
            CHAMPIONCAGE.STARVETIMER = param1 >>> 0;
            CREATURES._guardian._feedTime = new SecNum(GLOBAL.Timestamp());
            return "Champion starve time set to " + CHAMPIONCAGE.STARVETIMER + " from " + _loc2_;
        }
        return "You dont have a champion... idiot";
    }

    public static setChampionFeedTime(param1: any): string {
        let _loc2_: any = 0;
        let _loc3_: any = 0;
        if (CREATURES._guardian) {
            _loc2_ = CREATURES._guardian._feedTime.Get();
            _loc3_ = (GLOBAL.Timestamp() + (param1 >>> 0)) >>> 0;
            CREATURES._guardian._feedTime = new SecNum(Number(_loc3_));
            return "Champion feed time set to " + GLOBAL.ToTime((_loc3_ - GLOBAL.Timestamp()) | 0) + " from " + GLOBAL.ToTime((_loc2_ - GLOBAL.Timestamp()) | 0);
        }
        return "You dont have a champion... idiot";
    }

    public static setKorathLevel(param1: int): string {
        if (GLOBAL.mode != "build") {
            return "ERROR: can only set level in your base!";
        }
        CHAMPIONCAGE._guardians["G4"].props.powerLevel = param1;
        let _loc2_: any = CHAMPIONCAGE.GetGuardianData(4);
        if (_loc2_) {
            _loc2_.pl = new SecNum(param1);
        }
        return "Korath level targeted: " + param1 + " set: " + _loc2_.pl;
    }

    public static creatureAcademy(param1: string = null, param2: uint = 0): string {
        if (param1 == null || param1 == "all") {
            for (let _loc3_ in CREATURELOCKER._creatures) {
                GLOBAL.player.m_upgrades[param1].powerup = param2;
            }
            return null;
        }
        GLOBAL.player.m_upgrades[param1].powerup = param2;
        return KEYS.Get(as3.str(CREATURELOCKER._creatures[param1].name)) + " upgraded to " + param2;
    }

    public static creatureLab(param1: any, param2: uint): string {
        if (param1 == null || param1 == "all") {
            for (let _loc3_ in CREATURELOCKER._creatures) {
                GLOBAL.player.m_upgrades[param1] = { "level": param2 };
            }
            return null;
        }
        GLOBAL.player.m_upgrades[param1] = { "level": param2 };
        return KEYS.Get(as3.str(CREATURELOCKER._creatures[param1].name)) + " upgraded to " + param2;
    }

    public static changeAlpha(param1: number = 1): string {
        MAP._GROUND.alpha = param1;
        return as3.str(param1.toString());
    }

    public static unlockQuest(param1: any): string {
        let _loc2_: any = null;
        if (param1 == null || param1 == "all") {
            for (_loc2_ of as3.values(QUESTS._quests)) {
                QUESTS._completed[_loc2_.id] = 1;
            }
            return null;
        }
        QUESTS._completed[param1] = 1;
        return KEYS.Get(as3.str(QUESTS.GetQuestByID(as3.str(param1)).name));
    }

    public static lockQuest(param1: any): string {
        let _loc2_: any = null;
        if (param1 == null || param1 == "all") {
            for (_loc2_ of as3.values(QUESTS._quests)) {
                delete QUESTS._completed[_loc2_.id];
            }
            return null;
        }
        delete QUESTS._completed[_loc2_.id];
        return KEYS.Get(as3.str(QUESTS.GetQuestByID(as3.str(param1)).name));
    }

    public static tutorialArrowRotation(param1: number = 0): string {
        if (TUTORIAL._mcArrow) {
            TUTORIAL._mcArrow.mcArrow.rotation = param1;
            return "TUTORIAL._mcArrow: Rotation - " + TUTORIAL._mcArrow.rotation;
        }
        return "TUTORIAL._mcArrow is NULL - there is no arrow to manipulate.";
    }

    public static tutorialGetStage(_param1: int = 0): string {
        return "TUTORIAL._stage = " + TUTORIAL._stage;
    }

    public static forceAFK(param1: int = 0): string {
        let _loc2_: string = null;
        if (param1 == 1) {
            POPUPS.AFK();
            _loc2_ = "afk";
        } else {
            POPUPS.Timeout();
            _loc2_ = "timeout";
        }
        return "forcing afk popup type: " + _loc2_;
    }

    public static resetFrontPageData(_param1: any = null): string {
        FrontPageLibrary.initialize();
        GLOBAL.StatSet("CM3", 0);
        return "reset frontpage save data";
    }

    public static showFrontPageMsg(param1: string): string {
        let _loc2_: any = as3.as(getDefinitionByName(param1), Class);
        let _loc3_: Message = as3.cast(new _loc2_(), Message);
        print(param1);
        if (_loc3_ == null) {
            return "ERROR: " + param1 + " is not a valid class.";
        }
        let _loc4_: FrontPageGraphic = new FrontPageGraphic();
        _loc4_.showMessage(_loc3_);
        POPUPS.Push(_loc4_);
        return "CONSOLE: Adding frontpage graphic: " + param1;
    }

    public static printJSCalls(param1: any = null): string {
        if (param1 != 1 && param1 != 0) {
            return "CONSOLE: printJS - ERROR - please provide a 1 or 0 value";
        }
        GLOBAL.debugLogJSCalls = Boolean(param1);
        return "CONSOLE: printJS set to " + GLOBAL.debugLogJSCalls;
    }

    public static toggleFullScreen(_param1: any = null): string {
        GLOBAL.goFullScreen();
        return "CONSOLE: Toggle FullScreen, press ESC to exit";
    }

    public static removeDamageProtection(_param1: any = null): string {
        BASE._isProtected = 0;
        BASE.Save();
        return "CONSOLE: BASE._isProtected set to: " + Boolean(BASE._isProtected);
    }

    public static plannerZoom(param1: any = null): string {
        if (PLANNER.basePlanner && PLANNER.basePlanner.popup && Boolean(PLANNER.basePlanner.popup.designView)) {
            if (Boolean(PLANNER.basePlanner.popup.designView) && param1 > 0) {
                PLANNER.basePlanner.popup.designView.setZoom(Number(param1));
                return "PlannerDesignView Zoomed To: " + PlannerDesignView.zoomValue;
            }
            return "enter a value noob.";
        }
        return "open yard planner 2 before you try anything else.";
    }

    public static plannerTool(param1: any = null): string {
        if (PLANNER.basePlanner && PLANNER.basePlanner.popup && Boolean(PLANNER.basePlanner.popup.designView)) {
            if (Boolean(PLANNER.basePlanner.popup.designView) && param1) {
                if (param1 == "selectmove" || param1 == "storebuilding") {
                    PLANNER.basePlanner.popup.designView.currentTool = as3.str(param1);
                } else {
                    PLANNER.basePlanner.popup.designView.currentTool = "selectmove";
                }
                return "PlannerDesignView Tool Set To: " + PLANNER.basePlanner.popup.designView.currentTool;
            }
            return "enter a value noob.";
        }
        return "open yard planner 2 before you try anything else.";
    }

    public static plannerRedraw(_param1: any = null): string {
        if (PLANNER.basePlanner && PLANNER.basePlanner.popup && Boolean(PLANNER.basePlanner.popup.designView)) {
            if (PLANNER.basePlanner.popup) {
                PLANNER.basePlanner.popup.redraw();
                return "PlannerDesignView Redraw";
            }
            return "enter a value noob.";
        }
        return "open yard planner 2 before you try anything else.";
    }

    public static champCageHasKoth(_param1: any = null): string {
        if (!CHAMPIONCAGEPOPUP._kothEnabled) {
            CHAMPIONCAGEPOPUP._kothEnabled = true;
        }
        return "_kothEnabled is " + CHAMPIONCAGEPOPUP._kothEnabled;
    }

    public static showBaseResources(_param1: any = null): string {
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc2_: any = "BASE RESOURCES:";
        _loc2_ += "\n";
        for (_loc3_ in BASE._resources) {
            _loc4_ = 0;
            if (BASE._resources[_loc3_] instanceof SecNum) {
                _loc4_ = BASE._resources[_loc3_].Get() | 0;
            } else {
                _loc4_ = BASE._resources[_loc3_] | 0;
            }
            _loc2_ += " | " + _loc3_ + ": " + _loc4_;
        }
        _loc2_ += "\n";
        if (BASE._iresources) {
            for (_loc5_ in BASE._iresources) {
                _loc6_ = 0;
                if (BASE._iresources[_loc5_] instanceof SecNum) {
                    _loc6_ = BASE._iresources[_loc5_].Get() | 0;
                } else {
                    _loc6_ = BASE._iresources[_loc5_] | 0;
                }
                _loc2_ += " I " + _loc5_ + ": " + _loc6_;
            }
        }
        return as3.str(_loc2_);
    }

    public static subscriptionsGetSubscriptionData(_param1: any = null): string {
        SubscriptionHandler.instance.service.getSubscriptionData();
        return "SUBSCRIPTIONS> trying to get data";
    }

    public static subscriptionsStartSubscription(_param1: any = null): string {
        SubscriptionHandler.instance.service.getSubscriptionData();
        return "SUBSCRIPTIONS> trying to get data";
    }

    public static subscriptionsReactivateSubscription(_param1: any = null): string {
        SubscriptionHandler.instance.service.getSubscriptionData();
        return "SUBSCRIPTIONS> trying to get data";
    }

    public static subscriptionsChangeSubscription(_param1: any = null): string {
        SubscriptionHandler.instance.service.getSubscriptionData();
        return "SUBSCRIPTIONS> trying to get data";
    }

    public static subscriptionsCancelSubscription(_param1: any = null): string {
        SubscriptionHandler.instance.service.getSubscriptionData();
        return "SUBSCRIPTIONS> trying to get data";
    }

    public static fbCNcpElligibility(_param1: any = null): string {
        BUY.FBCNcpCheckEligibility();
        return "console: trying to check ncp";
    }

    public static subscriptionsGiveSubscription(_param1: any = null): string {
        SubscriptionHandler.ignoreAB = true;
        SubscriptionHandler.instance.initialize();
        SubscriptionHandler.setRenewalDateDEBUG(123456);
        return "SUBSCRIPTIONS> forcing subscription for this session";
    }

    public static spawnTrojan(_param1: any = null): string {
        CUSTOMATTACKS.TrojanHorse();
        return "Creating CUSTOMATTACKS.TrojanHorse";
    }

    public static spawnWildMonsters(_param1: any = null): string {
        WMATTACK.Trigger(true);
        return "Creating Wild Monster attacks via WMATTACK.Trigger.";
    }

    public static toggleBuildingBases(_param1: any = null): string {
        MAP._BUILDINGBASES.visible = !MAP._BUILDINGBASES.visible;
        return "Building Bases Visible:" + MAP._BUILDINGBASES.visible;
    }

    public static toggleBuildingTops(_param1: any = null): string {
        MAP._BUILDINGTOPS.visible = !MAP._BUILDINGTOPS.visible;
        return "Building Tops Visible:" + MAP._BUILDINGTOPS.visible;
    }

    public static toggleRenderer(_param1: any = null): string {
        MAP.instance.canvasContainer.visible = !MAP.instance.canvasContainer.visible;
        return "Renderer set to:" + MAP.instance.canvasContainer.visible.toString();
    }

    public static showSubscriptionData(_param1: any = null): string {
        return "name:" + SubscriptionHandler.instance.name + " exp:" + SubscriptionHandler.instance.expirationDate + " renew:" + SubscriptionHandler.instance.renewalDate + " active:" + SubscriptionHandler.instance.isSubscriptionActive;
    }

    public static showRendererDebug(_param1: any = null): string {
        if (!BYMConfig.instance.RENDERER_ON) {
            return "Renderer disabled";
        }
        Renderer.debug = !Renderer.debug;
        return "RasterData:" + RasterData.rasterData.length + " | " + RasterData.visibleData.length + " | " + ((RasterData.totalMemory / 1024) | 0) + "Kb";
    }

    public static showNumBuildings(_param1: any = null): string {
        let _loc2_: int = 0;
        for (let _loc3_ of as3.values(BASE._buildingsAll)) {
            _loc2_++;
        }
        return "NumBuildings:" + _loc2_.toString();
    }

    public static showVersion(_param1: any = null): string {
        return "version:" + GLOBAL._version.Get() + " " + GLOBAL._softversion;
    }
}
