package {
    import flash.display.MovieClip;
    import flash.display.StageDisplayState;
    import flash.events.*;
    import gs.*;
    import gs.easing.*;

    public class ERRORMESSAGE extends ERRORMESSAGE_CLIP {

        public var _mc:MovieClip;

        public var _blocker:popup_bg;

        public function ERRORMESSAGE() {
            super();
        }

        /**
         * ioQuiet (Inferno-only): an expected stop (new version published, login ended, back after a long
         * time away), not a bug: shown the same, but not logged as an error, so it is not sent as a bug report.
         * ioKeepLogin (Inferno-only): whether the Reload button logs in again with the stored login (true) or
         * opens the login page (false: the login is no longer valid).
         */
        public function Show(param1:String, param2:int = 0, ioQuiet:Boolean = false, ioKeepLogin:Boolean = true):void {
            var Resume:Function;
            var _message:String = param1;
            var errortype:int = param2;
            if (GLOBAL.INFERNO_ONLY && errortype == GLOBAL.ERROR_ORANGE_BOX_ONLY) {
                // Inferno-only: the orange bar alone stopped the game with no button on it, a dead end.
                // Shown in the Oops window instead, whose Reload button works.
                errortype = GLOBAL.ERROR_OOPS_ONLY;
            }
            if (GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN) {
                GLOBAL._ROOT.stage.displayState = StageDisplayState.NORMAL;
            }
            if (errortype != GLOBAL.ERROR_OOPS_ONLY) {
                this._mc = GLOBAL._layerTop.addChild(this) as MovieClip;
                tMessage.autoSize = "left";
                if (_message) {
                    tMessage.htmlText = _message;
                }
                else {
                    tMessage.htmlText = "No message???";
                }
                bg.height = tMessage.height + 20;
                if (ioQuiet) {
                    print("HALT: " + _message);
                }
                else {
                    LOGGER.Log("err", "HALT: " + _message);
                }
            }
            if (errortype != GLOBAL.ERROR_ORANGE_BOX_ONLY) {
                Resume = function(param1:MouseEvent = null):void {
                    if (GLOBAL.INFERNO_ONLY) {
                        // Inferno-only: "reloadPage" is a call to the old Facebook page, which the projector and
                        // the browser client don't have, so this button did nothing. Load the game again,
                        // still logged in unless the login itself is gone (GAME.ioReload).
                        GAME.ioReload(ioKeepLogin);
                        return;
                    }
                    GLOBAL.CallJS("reloadPage");
                };
                print(" *** ERRORMESSAGE SHOWING OOPS " + _message);
                GLOBAL.RefreshScreen();
                try {
                    throw new Error(_message);
                }
                catch (e:Error) {
                    if (ioQuiet) {
                        print("HALT " + _message);
                    }
                    else {
                        LOGGER.Log("err", "HALT " + _message + " | " + e.getStackTrace());
                    }
                    this._mc = GLOBAL._ROOT.addChild(new popup_error()) as MovieClip;
                    (this._mc.mcFrame as frame).Setup(false);
                    if (KEYS._setup) {
                        // Inferno-only: an expected stop is not "something broke".
                        this._mc.tA.htmlText = "<b>" + (ioQuiet ? "Please reload" : KEYS.Get("pop_oops_title")) + "</b>";
                        this._mc.tB.htmlText = KEYS.Get("pop_oops_body");
                        this._mc.tB.htmlText = KEYS.Get(_message);
                    }
                    this._blocker = this._mc.blocker;
                    this._blocker.x = GLOBAL._SCREENCENTER.x - 1400;
                    this._blocker.y = GLOBAL._SCREENCENTER.y - 1400;
                    this._blocker.width = 2800;
                    this._blocker.height = 2800;
                    this._mc.bAction.Setup("Reload");
                    this._mc.bAction.addEventListener(MouseEvent.CLICK, Resume);
                }
            }
            this._mc.x -= 50;
            TweenLite.to(this._mc, 0.5, {
                        "x": this._mc.x + 50,
                        "ease": Elastic.easeOut
                    });
            if (!ioQuiet) {
                LOGGER.Log("err", "OOPS");
            }
            GLOBAL.Halt();
        }

        public function Resize():void {
            GLOBAL.RefreshScreen();
            this.x = GLOBAL._SCREEN.x;
            this.y = GLOBAL._SCREEN.y;
            if (this._blocker) {
                this._blocker.width = GLOBAL._SCREEN.width;
                this._blocker.height = GLOBAL._SCREEN.height;
            }
        }
    }
}
