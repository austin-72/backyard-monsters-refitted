package {
    import flash.display.Loader;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.ProgressEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;
    import flash.net.URLRequestMethod;
    import flash.system.ApplicationDomain;
    import flash.system.LoaderContext;
    import flash.system.Security;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.utils.setTimeout;

    /**
     * The launcher: the small SWF players actually open (https://<server>/play.swf).
     *
     * It asks the server which build of the game is current and loads exactly that build, from an
     * address that contains the build (bymr-stable.swf?v=<build>). A new build is a new address, so no
     * cache anywhere (the Flash projector's, Windows', a CDN's) can hand out an old game: there is
     * nothing under the new address to be stale. The question itself is a POST, which is never cached.
     *
     * The launcher has no game code in it and does not change from build to build, so it does not
     * matter if a cached copy of the launcher is used.
     *
     * Same stage size, frame rate and background as the game (asconfig.stable.json): the projector
     * sizes its window from the SWF it opens, which is this one.
     */
    [SWF(width="760", height="670", frameRate="40", backgroundColor="#FFFFFF")]
    public class IOLauncher extends Sprite {
        /** Used when the launcher is opened from disk instead of from the server. */
        private static const DEFAULT_SERVER:String = "https://inferno-mr2.maproom2.com";

        private var _server:String;

        private var _status:TextField;

        private var _loader:Loader;

        private var _tries:int = 0;

        public function IOLauncher() {
            super();
            Security.allowDomain("*");
            var origin:Array = String(loaderInfo.url).match(/^https?:\/\/[^\/?#]+/i);
            _server = origin && origin.length > 0 ? origin[0] : DEFAULT_SERVER;

            _status = new TextField();
            _status.defaultTextFormat = new TextFormat("Verdana", 14, 0x333333, true, null, null, null, null, "center");
            _status.selectable = false;
            _status.multiline = true;
            _status.wordWrap = true;
            _status.width = 600;
            _status.autoSize = TextFieldAutoSize.CENTER;
            _status.x = 80;
            _status.y = 300;
            addChild(_status);

            askForCurrentBuild();
        }

        private function say(text:String):void {
            _status.text = text;
        }

        private function askForCurrentBuild():void {
            _tries++;
            say(_tries == 1 ? "Checking for updates..." : "Checking for updates... (attempt " + _tries + ")");
            var request:URLRequest = new URLRequest(_server + "/client/version");
            request.method = URLRequestMethod.POST;
            request.contentType = "application/json";
            request.data = "{\"t\":" + new Date().time + "}";
            var asker:URLLoader = new URLLoader();
            asker.addEventListener(Event.COMPLETE, onBuildKnown);
            asker.addEventListener(IOErrorEvent.IO_ERROR, onNoAnswer);
            asker.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onNoAnswer);
            asker.load(request);
        }

        private function onNoAnswer(event:Event):void {
            say("Could not reach the server.\nTrying again in a few seconds...");
            setTimeout(askForCurrentBuild, 5000);
        }

        private function onBuildKnown(event:Event):void {
            var answer:Object = null;
            try {
                answer = JSON.parse(String(URLLoader(event.target).data));
            }
            catch (e:Error) {
                onNoAnswer(event);
                return;
            }
            if (!answer || !answer.file) {
                say(answer && answer.error ? String(answer.error) : "The game has not been published on this server yet.");
                return;
            }
            loadGame(_server + "/" + answer.file + "?v=" + encodeURIComponent(String(answer.v)));
        }

        private function loadGame(address:String):void {
            say("Loading the game...");
            _loader = new Loader();
            _loader.contentLoaderInfo.addEventListener(ProgressEvent.PROGRESS, onProgress);
            _loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onGameLoaded);
            _loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onGameFailed);
            _loader.contentLoaderInfo.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onGameFailed);
            // Its own application domain below ours: the launcher defines nothing the game also defines.
            _loader.load(new URLRequest(address), new LoaderContext(false, new ApplicationDomain(ApplicationDomain.currentDomain)));
        }

        private function onProgress(event:ProgressEvent):void {
            if (event.bytesTotal > 0) {
                say("Downloading the game... " + Math.floor(event.bytesLoaded / event.bytesTotal * 100) + "%");
            }
        }

        private function onGameFailed(event:Event):void {
            say("The game could not be downloaded.\nTrying again in a few seconds...");
            setTimeout(askForCurrentBuild, 5000);
        }

        private function onGameLoaded(event:Event):void {
            removeChild(_status);
            // The game starts itself once it is on the stage (GAME.as: ioStartWhenOnStage).
            addChild(_loader);
        }
    }
}
