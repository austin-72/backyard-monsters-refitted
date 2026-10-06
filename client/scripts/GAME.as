package {
    import com.monsters.admin.IoTestMode;
    import com.monsters.debug.IoBugReport;
    import com.flashdynamix.utils.SWFProfiler;
    import com.monsters.maproom_manager.MapRoomManager;
    import com.monsters.marketing.MarketingRecapture;
    import flash.display.*;
    import flash.events.ErrorEvent;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.events.UncaughtErrorEvent;
    import flash.external.ExternalInterface;
    import flash.geom.Rectangle;
    import flash.system.Security;
    import flash.net.SharedObject;
    import flash.events.IOErrorEvent;
    import flash.media.SoundMixer;
    import flash.system.LoaderContext;
    import flash.system.ApplicationDomain;
    import flash.display.Stage;
    import flash.display.LoaderInfo;
    import flash.net.URLRequest;
    import flash.display.Loader;
    import flash.events.TimerEvent;
    import flash.utils.Timer;
    import com.monsters.external_interface.ExternalInterfaceManager;
    public class GAME extends Sprite {

        public static var _instance:GAME;

        public static var _isSmallSize:Boolean = true;

        public static var _firstLoadComplete:Boolean = false;

        public static var sharedObj:SharedObject;

        public static var token:String = "";

        public static var language:String = "";

        private var _checkScreenSize:Boolean = true;

        private var _previousDistance:Number = 0;

        private var _scaleFactor:Number = 1;

        public function GAME() {
            var urls:Object = null;

            // Override server URL if provided as a flash var
            var flashVarServerUrl:* = loaderInfo.parameters["serverUrl"];
            // Inferno-only: on a phone (the browser version's page says so)
            GLOBAL.ioOnPhone = String(loaderInfo.parameters["iomobile"]) == "1";

            if (flashVarServerUrl != undefined && flashVarServerUrl != "") {
                GLOBAL.serverUrl = String(flashVarServerUrl);
            }
            else {
                // Started from a web address (flashplayer.exe https://host/bymr-stable.swf): the server
                // that handed out this client is the server to play on, whatever address was compiled
                // in. A client opened from disk keeps the compiled address.
                var ioOrigin:Array = String(loaderInfo.url).match(/^https?:\/\/[^\/?#]+/i);
                if (ioOrigin && ioOrigin.length > 0) {
                    GLOBAL.serverUrl = ioOrigin[0] + "/";
                    GLOBAL.cdnUrl = ioOrigin[0] + "/";
                }
            }

            var serverUrl:String = GLOBAL.serverUrl;
            var apiVersionSuffix:String = GLOBAL.apiVersionSuffix + "/";
            var cdnUrl:String = GLOBAL.cdnUrl;
            super();
            _instance = this;
            GLOBAL._local = !ExternalInterface.available;
            ReferencedExposedStructures.Include();
            if (this.parent) {
                this.ioStart();
            }
            else {
                // Loaded by the launcher (client/launcher/IOLauncher.as): a loaded SWF's constructor runs
                // before it is anywhere, so there is no stage to start on yet. Start when there is one.
                addEventListener(Event.ADDED_TO_STAGE, this.ioStartWhenOnStage);
            }
        }

        private var _ioStarted:Boolean = false;

        private function ioStartWhenOnStage(param1:Event):void {
            removeEventListener(Event.ADDED_TO_STAGE, this.ioStartWhenOnStage);
            this.ioStart();
        }

        private function ioStart():void {
            var urls:Object = {};
            var serverUrl:String = GLOBAL.serverUrl;
            var apiVersionSuffix:String = GLOBAL.apiVersionSuffix + "/";
            var cdnUrl:String = GLOBAL.cdnUrl;
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
            this.Data(urls, loaderInfo.parameters);
        }

        public static function disableWindowScroll(param1:Event = null):void {
            GLOBAL.CallJS("cc.disableMouseWheel");
        }

        public static function enableWindowScroll(param1:Event = null):void {
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
        public static function ioSwitchAccount():void {
            var deadline:int = GLOBAL.Timestamp() + 6;
            var wait:Timer = new Timer(200);
            // Admin test mode ends with the account: it is switched off (the account put back) first.
            if (GLOBAL.ioTestMode()) {
                IoTestMode.switchOff(function():void {
                        ioReloadGame(false);
                    });
                return;
            }
            PLEASEWAIT.Show("Switching account...");
            try {
                BASE.Save();
            }
            catch (e:Error) {
            }
            wait.addEventListener(TimerEvent.TIMER, function(e:TimerEvent):void {
                    if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving || GLOBAL.Timestamp() > deadline) {
                        wait.stop();
                        ioReloadGame(false);
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
        public static function ioReload(keepLogin:Boolean):void {
            if (_ioReloading) {
                return; // a second Reload press (or a popup closed meanwhile) while the first is under way
            }
            _ioReloading = true;
            GLOBAL.Halt();
            PLEASEWAIT.Show(keepLogin ? "Reloading..." : "Opening the login page...");
            ioReloadGame(keepLogin);
        }

        private static var _ioReloading:Boolean = false;

        private static function ioReloadGame(keepLogin:Boolean):void {
            var handled:Boolean = false;
            if (keepLogin && LOGIN.token) {
                // A login made with the password is not stored anywhere, so hand this one to the next start,
                // once (setLauncherVars takes it and deletes it).
                try {
                    var resume:SharedObject = SharedObject.getLocal("bymr_data", "/");
                    resume.data.ioResumeToken = LOGIN.token;
                    resume.flush();
                }
                catch (e:Error) {
                }
            }
            if (!keepLogin) {
                token = null;
                try {
                    var saved:SharedObject = SharedObject.getLocal("bymr_data", "/");
                    delete saved.data.token;
                    saved.flush();
                }
                catch (e:Error) {
                }
            }
            // 1. The launcher reloads the game.
            try {
                handled = !_instance.loaderInfo.sharedEvents.dispatchEvent(new Event("io_restart", false, true));
            }
            catch (e:Error) {
                LOGGER.Log("err", "Switch account: launcher request failed: " + e.message);
            }
            if (handled) {
                return;
            }
            // 2. Loaded by a launcher (any version): reload through the Loader the game sits in.
            // 3. Opened directly: load a fresh copy of this file onto the stage and retire this one.
            try {
                var info:LoaderInfo = _instance.loaderInfo;
                var address:String = info.url;
                var holder:Loader = null;
                try {
                    holder = info.loader;
                }
                catch (e:Error) {
                    holder = null;
                }
                if (address) {
                    // A fresh code space beside the running game's, not under it: under it, the new copy
                    // would reuse this copy's classes and everything they remember (this session).
                    var fresh:LoaderContext = new LoaderContext(false, new ApplicationDomain(info.applicationDomain.parentDomain));
                    if (holder) {
                        holder.unloadAndStop(true);
                        holder.load(new URLRequest(address), fresh);
                        return;
                    }
                    if (_instance.stage) {
                        ioReplaceOnStage(address, fresh);
                        return;
                    }
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "Switch account: reload failed: " + e.message);
            }
            _ioReloading = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(keepLogin ? "Close the game and start it again to continue." : "Close the game and start it again to get to the login page.");
        }

        /**
         * The game was opened directly (no launcher): this copy is the top of the display list, so it cannot
         * be unloaded. It is halted instead (no more ticks or saves: GLOBAL.Halt), silenced and taken off the
         * stage, and a fresh copy of the same file is loaded onto the stage in its place.
         */
        private static function ioReplaceOnStage(address:String, fresh:LoaderContext):void {
            var theStage:Stage = _instance.stage;
            var loader:Loader = new Loader();
            GLOBAL.Halt();
            SoundMixer.stopAll();
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event):void {
                    // Take the old copy off the stage; if Flash refuses, the new copy still goes on top of it.
                    try {
                        while (theStage.numChildren > 0) {
                            theStage.removeChildAt(0);
                        }
                    }
                    catch (err:Error) {
                    }
                    theStage.addChild(loader);
                });
            loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
                    PLEASEWAIT.Hide();
                    GLOBAL.Message("The game could not be loaded again. Close it and start it again to switch account.");
                });
            loader.load(new URLRequest(address), fresh);
        }

        public function setLauncherVars(params:Object):void {
            try {
                sharedObj = SharedObject.getLocal("bymr_data", "/");

                if (params && params.language) {
                    language = params.language;
                    sharedObj.data.language = language;
                }

                if (params && params.token) {
                    token = params.token;
                    sharedObj.data.token = token;
                }
                else if (sharedObj.data.ioResumeToken) {
                    // Inferno-only: loaded again by GAME.ioReload (Oops "Reload"): log in as before.
                    token = String(sharedObj.data.ioResumeToken);
                    sharedObj.data.token = token;
                }
                delete sharedObj.data.ioResumeToken;
                if (params && params.ref) {
                    // Started from a friend's invite link: kept until an account is registered with it.
                    sharedObj.data.ioReferral = String(params.ref);
                }
                sharedObj.flush();
            }
            catch (e:Error) {
                LOGGER.Log("err", "Error setting token from loader: " + e.message);
            }
        }

        public function Data(urls:Object, loaderParams:Object):void {
            if (this._ioStarted) {
                return;
            }
            this._ioStarted = true;
            loaderInfo.uncaughtErrorEvents.addEventListener(UncaughtErrorEvent.UNCAUGHT_ERROR, this.uncaughtErrorThrown);
            IoBugReport.Watch(stage);
            setLauncherVars(loaderParams);
            SWFProfiler.init(stage, this);
            Security.allowDomain("*");
            GLOBAL.init();
            GLOBAL._baseURL = urls._baseURL;
            GLOBAL._infBaseURL = urls.infbaseurl;
            GLOBAL._apiURL = urls._apiURL;
            GLOBAL._gameURL = urls._gameURL;
            GLOBAL._storageURL = urls._storageURL;
            GLOBAL.languageUrl = urls.languageurl;
            GLOBAL._allianceURL = urls._allianceURL;
            GLOBAL._soundPathURL = urls._soundPathURL;
            GLOBAL._statsURL = urls._statsURL;
            GLOBAL._mapURL = urls._mapURL;
            MapRoomManager.instance.mapRoom3URL = urls.map3url;
            GLOBAL._appid = urls.app_id;
            GLOBAL._tpid = urls.tpid;
            GLOBAL._countryCode = urls._countryCode;
            GLOBAL._currencyURL = urls.currency_url;
            GLOBAL.__ = urls.__;
            GLOBAL.___ = urls.___;
            GLOBAL._softversion = urls.softversion;
            GLOBAL._fbdata = urls;
            GLOBAL._monetized = urls.monetized;
            MarketingRecapture.instance.importData(urls.urlparams);
            GLOBAL._ROOT = new MovieClip();
            addChild(GLOBAL._ROOT);
            GLOBAL._layerMap = GLOBAL._ROOT.addChild(new Sprite()) as Sprite;
            GLOBAL._layerUI = GLOBAL._ROOT.addChild(new Sprite()) as Sprite;
            GLOBAL._layerWindows = GLOBAL._ROOT.addChild(new Sprite()) as Sprite;
            GLOBAL._layerMessages = GLOBAL._ROOT.addChild(new Sprite()) as Sprite;
            GLOBAL._layerTop = GLOBAL._ROOT.addChild(new Sprite()) as Sprite;
            GLOBAL._layerMap.mouseEnabled = false;
            GLOBAL._layerUI.mouseEnabled = false;
            GLOBAL._layerWindows.mouseEnabled = false;
            GLOBAL._layerMessages.mouseEnabled = false;
            GLOBAL._layerTop.mouseEnabled = false;
            GLOBAL.RefreshScreen();
            if (urls.openbase) {
                GLOBAL._openBase = JSON.parse(urls.openbase);
            }
            else {
                GLOBAL._openBase = null;
            }
            addEventListener(Event.ENTER_FRAME, GLOBAL.TickFast);

            LOGIN.Login();
            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.addEventListener(Event.RESIZE, GLOBAL.ResizeGame);
            stage.showDefaultContextMenu = false;
            ExternalInterfaceManager.Initialize();

            if (this._checkScreenSize) {
                GLOBAL._SCREENINIT = new Rectangle(0, 0, stage.stageWidth, stage.stageHeight);
                if (_isSmallSize) {
                    GLOBAL._SCREENINIT = new Rectangle(0, 0, 760, 670);
                }
                else {
                    GLOBAL._SCREENINIT = new Rectangle(0, 0, 760, 750);
                }
            }
        }

        private var _ioErrorCounts:Object = {};

        protected function uncaughtErrorThrown(param1:UncaughtErrorEvent):void {
            var _loc2_:String = null;
            var _loc3_:Error = null;
            if (param1.error is Error) {
                _loc2_ = Error(param1.error).message;
                _loc3_ = param1.error as Error;
            }
            else if (param1.error is ErrorEvent) {
                _loc2_ = ErrorEvent(param1.error).text;
            }
            else {
                _loc2_ = String(param1.error.toString());
            }
            // The release player strips the message down to its number, so add what the game was doing.
            var ioContext:String = "";
            try {
                if (GLOBAL._newBuilding) {
                    ioContext += " | placing building type " + GLOBAL._newBuilding._type;
                }
                if (GLOBAL._selectedBuilding) {
                    ioContext += " | selected building type " + GLOBAL._selectedBuilding._type;
                }
            }
            catch (ctxError:Error) {
            }
            // The logger sends each distinct message once per session. An error that fires on every
            // click would look like a one-off, so repeats are reported at 1, 2, 5, 20 and 100.
            var ioKey:String = _loc2_ + ioContext;
            _ioErrorCounts[ioKey] = int(_ioErrorCounts[ioKey]) + 1;
            var ioN:int = int(_ioErrorCounts[ioKey]);
            if (ioN == 1 || ioN == 2 || ioN == 5 || ioN == 20 || ioN == 100) {
                LOGGER.Log("err", "UncaughtError: " + _loc2_ + (!!_loc3_ ? " | " + _loc3_.getStackTrace() : "") + ioContext + (ioN > 1 ? " | seen " + ioN + " times" : ""));
            }
        }

        public function onStageRollOver(param1:MouseEvent = null):void {
            GAME.disableWindowScroll();
        }

        public function onStageRollOut(param1:MouseEvent = null):void {
            GAME.enableWindowScroll();
        }
    }
}
