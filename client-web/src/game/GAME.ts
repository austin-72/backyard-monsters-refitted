import * as as3 from "as3";
import { int } from "as3";
import { Loader, LoaderInfo, MovieClip, Sprite, Stage, StageScaleMode } from "flash/display";
import { ErrorEvent, Event, IOErrorEvent, MouseEvent, TimerEvent, UncaughtErrorEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Rectangle } from "flash/geom";
import { SoundMixer } from "flash/media";
import { SharedObject, URLRequest } from "flash/net";
import { ApplicationDomain, LoaderContext, Security } from "flash/system";
import { Timer } from "flash/utils";
import { BASE, ExternalInterfaceManager, GLOBAL, IoBugReport, IoTestMode, LOGGER, LOGIN, MapRoomManager, MarketingRecapture, PLEASEWAIT, ReferencedExposedStructures, SWFProfiler } from "@game";

export class GAME extends Sprite {
    static {
        as3.fields(this, { _checkScreenSize: true, _previousDistance: 0, _scaleFactor: 1, _ioStarted: false, _ioErrorCounts: null });
    }

    public static _instance: GAME = null;

    public static _isSmallSize: boolean = true;

    public static _firstLoadComplete: boolean = false;

    public static sharedObj: SharedObject = null;

    public static token: string = "";

    public static language: string = "";

    private static _ioReloading: boolean = false;
    private _checkScreenSize: boolean;
    private _previousDistance: number;
    private _scaleFactor: number;
    private _ioStarted: boolean;
    private _ioErrorCounts: any;

    public $ctor(): void {
        this._ioErrorCounts = {};
        let urls: any = null;

        // Override server URL if provided as a flash var
        let flashVarServerUrl: any = this.loaderInfo.parameters["serverUrl"];
        // Inferno-only: on a phone (the browser version's page says so)
        GLOBAL.ioOnPhone = String(this.loaderInfo.parameters["iomobile"]) == "1";

        if (flashVarServerUrl != undefined && flashVarServerUrl != "") {
            GLOBAL.serverUrl = String(flashVarServerUrl);
        } else {
            // Started from a web address (flashplayer.exe https://host/bymr-stable.swf): the server
            // that handed out this client is the server to play on, whatever address was compiled
            // in. A client opened from disk keeps the compiled address.
            let ioOrigin: any[] = String(this.loaderInfo.url).match(/^https?:\/\/[^\/?#]+/i);
            if (ioOrigin && ioOrigin.length > 0) {
                GLOBAL.serverUrl = ioOrigin[0] + "/";
                GLOBAL.cdnUrl = ioOrigin[0] + "/";
            }
        }

        let serverUrl: string = GLOBAL.serverUrl;
        let apiVersionSuffix: string = GLOBAL.apiVersionSuffix + "/";
        let cdnUrl: string = GLOBAL.cdnUrl;
        super.$ctor();
        GAME._instance = this;
        GLOBAL._local = !ExternalInterface.available;
        ReferencedExposedStructures.Include();
        if (this.parent) {
            this.ioStart();
        } else {
            // Loaded by the launcher (client/launcher/IOLauncher.as): a loaded SWF's constructor runs
            // before it is anywhere, so there is no stage to start on yet. Start when there is one.
            this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.ioStartWhenOnStage));
        }
    }

    private ioStartWhenOnStage(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.ioStartWhenOnStage));
        this.ioStart();
    }

    private ioStart(): void {
        let urls: any = {};
        let serverUrl: string = GLOBAL.serverUrl;
        let apiVersionSuffix: string = GLOBAL.apiVersionSuffix + "/";
        let cdnUrl: string = GLOBAL.cdnUrl;
        if (this._ioStarted) {
            return;
        }
        if (serverUrl) {
            urls._baseURL = serverUrl + "base/";
            urls._apiURL = serverUrl + "api/" + apiVersionSuffix;
            urls.infbaseurl = urls._apiURL + "bm/base/";
            urls._statsURL = serverUrl + "recordstats.php";
            urls._mapURL = serverUrl + "worldmapv2/";
            urls.map3url = serverUrl + "worldmapv3/";
            urls._allianceURL = serverUrl + "alliance/";
            urls.languageurl = cdnUrl + "gamestage/assets/";
            urls._storageURL = cdnUrl + "assets/";
            urls._soundPathURL = cdnUrl + "assets/sounds/";
            urls._gameURL = serverUrl + "";
            urls._appid = serverUrl + "";
            urls._tpid = serverUrl + "";
            urls._currencyURL = serverUrl + "";
            urls._countryCode = serverUrl + "us";
        }
        this.Data(urls, this.loaderInfo.parameters);
    }

    public static disableWindowScroll(param1: Event = null): void {
        GLOBAL.CallJS("cc.disableMouseWheel");
    }

    public static enableWindowScroll(param1: Event = null): void {
        GLOBAL.CallJS("cc.enableMouseWheel");
    }

    /**
     * Inferno-only: Switch account (top-bar button). Saves the yard (up to a few seconds), forgets the
     * stored login token and loads the game SWF again from scratch, which opens on the login page with
     * its account list. The reload is done by, in order:
     *   1. the launcher (client/launcher/IOLauncher.as), asked with an "io_restart" request on the
     *      game's LoaderInfo.sharedEvents; it answers by cancelling the request;
     *   2. the Loader the game sits in (an older launcher): the game unloads itself and loads its own
     *      address again into it;
     *   3. otherwise (a game opened on its own) the player is told to restart it.
     */
    public static ioSwitchAccount(): void {
        let deadline: int = 0;
        let wait: Timer = null;
        deadline = (GLOBAL.Timestamp() + 6) | 0;
        wait = new Timer(200);
        // Admin test mode ends with the account: it is switched off (the account put back) first.
        if (GLOBAL.ioTestMode()) {
            IoTestMode.switchOff((): void => {
                GAME.ioReloadGame(false);
            });
            return;
        }
        PLEASEWAIT.Show("Switching account...");
        try {
            BASE.Save();
        } catch (e) {
        }
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving || GLOBAL.Timestamp() > deadline) {
                wait.stop();
                GAME.ioReloadGame(false);
            }
        });
        wait.start();
    }

    /**
     * Inferno-only: loads the game again without saving first (the yard on screen is out of date or the
     * login is gone), the same way as Switch account. keepLogin: true opens straight on the yard again
     * with the stored login (Oops "Reload", back after a long time away); false forgets the login and
     * opens on the login page (the login was replaced or ended on the server).
     */
    public static ioReload(keepLogin: boolean): void {
        if (GAME._ioReloading) {
            return;
        }
        GAME._ioReloading = true;
        GLOBAL.Halt();
        PLEASEWAIT.Show(keepLogin ? "Reloading..." : "Opening the login page...");
        GAME.ioReloadGame(keepLogin);
    }

    private static ioReloadGame(keepLogin: boolean): void {
        let handled: boolean = false;
        if (keepLogin && LOGIN.token) {
            // A login made with the password is not stored anywhere, so hand this one to the next start,
            // once (setLauncherVars takes it and deletes it).
            try {
                let resume: SharedObject = SharedObject.getLocal("bymr_data", "/");
                resume.data.ioResumeToken = LOGIN.token;
                resume.flush();
            } catch (e) {
            }
        }
        if (!keepLogin) {
            GAME.token = null;
            try {
                let saved: SharedObject = SharedObject.getLocal("bymr_data", "/");
                delete saved.data.token;
                saved.flush();
            } catch (e) {
            }
        }
        // 1. The launcher reloads the game.
        try {
            handled = !GAME._instance.loaderInfo.sharedEvents.dispatchEvent(new Event("io_restart", false, true));
        } catch (e) {
            LOGGER.Log("err", "Switch account: launcher request failed: " + e.message);
        }
        if (handled) {
            return;
        }
        // 2. Loaded by a launcher (any version): reload through the Loader the game sits in.
        // 3. Opened directly: load a fresh copy of this file onto the stage and retire this one.
        try {
            let info: LoaderInfo = GAME._instance.loaderInfo;
            let address: string = info.url;
            let holder: Loader = null;
            try {
                holder = info.loader;
            } catch (e) {
                holder = null;
            }
            if (address) {
                // A fresh code space beside the running game's, not under it: under it, the new copy
                // would reuse this copy's classes and everything they remember (this session).
                let fresh: LoaderContext = new LoaderContext(false, new ApplicationDomain(info.applicationDomain.parentDomain));
                if (holder) {
                    holder.unloadAndStop(true);
                    holder.load(new URLRequest(address), fresh);
                    return;
                }
                if (GAME._instance.stage) {
                    GAME.ioReplaceOnStage(address, fresh);
                    return;
                }
            }
        } catch (e) {
            LOGGER.Log("err", "Switch account: reload failed: " + e.message);
        }
        GAME._ioReloading = false;
        PLEASEWAIT.Hide();
        GLOBAL.Message(keepLogin ? "Close the game and start it again to continue." : "Close the game and start it again to get to the login page.");
    }

    /**
     * The game was opened directly (no launcher): this copy is the top of the display list, so it cannot
     * be unloaded. It is halted instead (no more ticks or saves: GLOBAL.Halt), silenced and taken off the
     * stage, and a fresh copy of the same file is loaded onto the stage in its place.
     */
    private static ioReplaceOnStage(address: string, fresh: LoaderContext): void {
        let theStage: Stage = null;
        let loader: Loader = null;
        theStage = GAME._instance.stage;
        loader = new Loader();
        GLOBAL.Halt();
        SoundMixer.stopAll();
        loader.contentLoaderInfo.addEventListener(Event.COMPLETE, (e: Event): void => {
            // Take the old copy off the stage; if Flash refuses, the new copy still goes on top of it.
            try {
                while (theStage.numChildren > 0) {
                    theStage.removeChildAt(0);
                }
            } catch (err) {
            }
            theStage.addChild(loader);
        });
        loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message("The game could not be loaded again. Close it and start it again to switch account.");
        });
        loader.load(new URLRequest(address), fresh);
    }

    public setLauncherVars(params: any): void {
        try {
            GAME.sharedObj = SharedObject.getLocal("bymr_data", "/");

            if (params && params.language) {
                GAME.language = as3.str(params.language);
                GAME.sharedObj.data.language = GAME.language;
            }

            if (params && params.token) {
                GAME.token = as3.str(params.token);
                GAME.sharedObj.data.token = GAME.token;
            } else if (GAME.sharedObj.data.ioResumeToken) {
                // Inferno-only: loaded again by GAME.ioReload (Oops "Reload"): log in as before.
                GAME.token = String(GAME.sharedObj.data.ioResumeToken);
                GAME.sharedObj.data.token = GAME.token;
            }
            delete GAME.sharedObj.data.ioResumeToken;
            if (params && params.ref) {
                // Started from a friend's invite link: kept until an account is registered with it.
                GAME.sharedObj.data.ioReferral = String(params.ref);
            }
            GAME.sharedObj.flush();
        } catch (e) {
            LOGGER.Log("err", "Error setting token from loader: " + e.message);
        }
    }

    public Data(urls: any, loaderParams: any): void {
        if (this._ioStarted) {
            return;
        }
        this._ioStarted = true;
        this.loaderInfo.uncaughtErrorEvents.addEventListener(UncaughtErrorEvent.UNCAUGHT_ERROR, as3.bind(this, this.uncaughtErrorThrown));
        IoBugReport.Watch(this.stage);
        this.setLauncherVars(loaderParams);
        SWFProfiler.init(this.stage, this);
        Security.allowDomain("*");
        GLOBAL.init();
        GLOBAL._baseURL = as3.str(urls._baseURL);
        GLOBAL._infBaseURL = as3.str(urls.infbaseurl);
        GLOBAL._apiURL = as3.str(urls._apiURL);
        GLOBAL._gameURL = as3.str(urls._gameURL);
        GLOBAL._storageURL = as3.str(urls._storageURL);
        GLOBAL.languageUrl = as3.str(urls.languageurl);
        GLOBAL._allianceURL = as3.str(urls._allianceURL);
        GLOBAL._soundPathURL = as3.str(urls._soundPathURL);
        GLOBAL._statsURL = as3.str(urls._statsURL);
        GLOBAL._mapURL = as3.str(urls._mapURL);
        MapRoomManager.instance.mapRoom3URL = as3.str(urls.map3url);
        GLOBAL._appid = as3.str(urls.app_id);
        GLOBAL._tpid = as3.str(urls.tpid);
        GLOBAL._countryCode = as3.str(urls._countryCode);
        GLOBAL._currencyURL = as3.str(urls.currency_url);
        GLOBAL.__ = urls.__ >>> 0;
        GLOBAL.___ = urls.___ >>> 0;
        GLOBAL._softversion = urls.softversion | 0;
        GLOBAL._fbdata = urls;
        GLOBAL._monetized = urls.monetized | 0;
        MarketingRecapture.instance.importData(as3.str(urls.urlparams));
        GLOBAL._ROOT = new MovieClip();
        this.addChild(GLOBAL._ROOT);
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
        GLOBAL.RefreshScreen();
        if (urls.openbase) {
            GLOBAL._openBase = JSON.parse(as3.str(urls.openbase));
        } else {
            GLOBAL._openBase = null;
        }
        this.addEventListener(Event.ENTER_FRAME, GLOBAL.TickFast);

        LOGIN.Login();
        this.stage.scaleMode = StageScaleMode.NO_SCALE;
        this.stage.addEventListener(Event.RESIZE, GLOBAL.ResizeGame);
        this.stage.showDefaultContextMenu = false;
        ExternalInterfaceManager.Initialize();

        if (this._checkScreenSize) {
            GLOBAL._SCREENINIT = new Rectangle(0, 0, this.stage.stageWidth, this.stage.stageHeight);
            if (GAME._isSmallSize) {
                GLOBAL._SCREENINIT = new Rectangle(0, 0, 760, 670);
            } else {
                GLOBAL._SCREENINIT = new Rectangle(0, 0, 760, 750);
            }
        }
    }

    protected uncaughtErrorThrown(param1: UncaughtErrorEvent): void {
        let _loc2_: string = null;
        let _loc3_: Error = null;
        if (param1.error instanceof Error) {
            _loc2_ = as3.str(Error(param1.error).message);
            _loc3_ = as3.as(param1.error, Error);
        } else if (param1.error instanceof ErrorEvent) {
            _loc2_ = as3.cast(param1.error, ErrorEvent).text;
        } else {
            _loc2_ = String(param1.error.toString());
        }
        // The release player strips the message down to its number, so add what the game was doing.
        let ioContext: string = "";
        try {
            if (GLOBAL._newBuilding) {
                ioContext += " | placing building type " + GLOBAL._newBuilding._type;
            }
            if (GLOBAL._selectedBuilding) {
                ioContext += " | selected building type " + GLOBAL._selectedBuilding._type;
            }
        } catch (ctxError) {
        }
        // The logger sends each distinct message once per session. An error that fires on every
        // click would look like a one-off, so repeats are reported at 1, 2, 5, 20 and 100.
        let ioKey: string = _loc2_ + ioContext;
        this._ioErrorCounts[ioKey] = (this._ioErrorCounts[ioKey] | 0) + 1;
        let ioN: int = this._ioErrorCounts[ioKey] | 0;
        if (ioN == 1 || ioN == 2 || ioN == 5 || ioN == 20 || ioN == 100) {
            LOGGER.Log("err", "UncaughtError: " + _loc2_ + (!(!_loc3_) ? " | " + _loc3_.getStackTrace() : "") + ioContext + (ioN > 1 ? " | seen " + ioN + " times" : ""));
        }
    }

    public onStageRollOver(param1: MouseEvent = null): void {
        GAME.disableWindowScroll();
    }

    public onStageRollOut(param1: MouseEvent = null): void {
        GAME.enableWindowScroll();
    }
}
