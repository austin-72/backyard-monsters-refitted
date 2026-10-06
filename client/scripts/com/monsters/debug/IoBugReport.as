package com.monsters.debug {
    import com.monsters.maproom_manager.MapRoomManager;
    import flash.display.DisplayObject;
    import flash.display.Stage;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.system.Capabilities;
    import flash.text.TextField;
    import flash.utils.getQualifiedClassName;
    import flash.utils.getTimer;

    /**
     * Inferno-only automatic bug reports. Every error the game logs (LOGGER.Log "err", which includes every
     * uncaught error: GAME.uncaughtErrorThrown) is sent quietly to the server (POST bugreport), with the
     * game's state and its last log lines, so admins see it in the admin panel's Bugs tab. Players see
     * nothing. Server: services/admin/bugReports.ts groups identical problems and counts them.
     *
     * Limits per session: each distinct error is sent at most 3 times, 40 reports in all, and not more
     * than one every 2 seconds (the server counts repeats anyway).
     *
     * What a report says, besides the error: where the player was (mode, yard and its owner, map cell,
     * the map room, the popup on screen, how long the game has been running), what they did last (their
     * last clicks, with the button or text clicked; the last popups, yards and messages), the server
     * requests just before (path, status, time), and the last log lines. The server adds the account and
     * the program (Flash Player, or the browser from its User-Agent). A failure the server reported itself
     * carries its reference ("[ref 1a2b3c4d]"), and the server adds this report to its own.
     */
    public class IoBugReport {

        private static const RECENT_LINES:int = 15;

        private static const MAX_PER_ERROR:int = 3;

        private static const MAX_PER_SESSION:int = 40;

        private static const MIN_GAP_MS:int = 2000;

        private static var _recent:Array = [];

        private static var _sentPerError:Object = {};

        private static var _sent:int = 0;

        private static var _lastSent:Number = 0;

        private static var _sending:Boolean = false;

        private static const TRAIL:int = 8;

        /** The player's last clicks ("11:03:58 HOUSINGPOPUP > bAscend "Ascend Monsters""). */
        private static var _clicks:Array = [];

        /** Popups, messages and yards shown last. */
        private static var _screens:Array = [];

        /** The last server requests ("11:04:03 /base/save 200 143 ms", repeats counted). */
        private static var _requests:Array = [];

        private static var _watching:Boolean = false;

        private static function stamp():String {
            // (from the parts: Flash Player's toUTCString is "Sat Oct 3 07:47:59 2026 UTC", the browser's
            // "Sat, 03 Oct 2026 07:47:59 GMT", and a fixed cut gave "9 2026 U" from Flash)
            var d:Date = new Date();
            return two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()) + ":" + two(d.getUTCSeconds());
        }

        private static function two(n:int):String {
            return n < 10 ? "0" + n : String(n);
        }

        private static function push(list:Array, line:String, keep:int):void {
            list.push(line);
            if (list.length > keep) {
                list.shift();
            }
        }

        /** Starts noting the player's clicks (GAME, once the stage is there). */
        public static function Watch(stage:Stage):void {
            if (_watching || !stage || !GLOBAL.INFERNO_ONLY) {
                return;
            }
            _watching = true;
            stage.addEventListener(MouseEvent.MOUSE_DOWN, onClick, true, 0, true);
        }

        private static function onClick(e:MouseEvent):void {
            try {
                push(_clicks, stamp() + " " + describe(e.target as DisplayObject), TRAIL);
            }
            catch (err:Error) {
            }
        }

        /** "HOUSINGPOPUP > bAscend "Ascend Monsters"": the named things around what was clicked, and its text. */
        private static function describe(target:DisplayObject):String {
            var parts:Array = [];
            var text:String = "";
            var o:DisplayObject = target;
            var name:String = null;
            var cls:String = null;
            while (o && !(o is Stage) && parts.length < 4) {
                if (!text && o is TextField && TextField(o).text) {
                    text = TextField(o).text;
                }
                if (!text && o is Button && Button(o)._txt && Button(o)._txt.text) {
                    text = Button(o)._txt.text;
                }
                cls = getQualifiedClassName(o);
                cls = cls.substr(cls.lastIndexOf(":") + 1);
                name = o.name && !/^instance\d+$/.test(o.name) ? o.name : "";
                if (!/^(MovieClip|Sprite|Shape|Bitmap|TextField|SimpleButton|Loader|emptyMc|GAME)$/.test(cls)) {
                    parts.unshift(name && name != cls ? cls + "." + name : cls);
                }
                else if (name) {
                    parts.unshift(name);
                }
                o = o.parent;
            }
            return (parts.length ? parts.join(" > ") : "(the map)") + (text ? " \"" + text.replace(/\s+/g, " ").substr(0, 40) + "\"" : "");
        }

        /** A popup, message or yard coming up (POPUPS, GLOBAL.Message, BASE.LoadBase). */
        public static function Screen(what:String):void {
            if (what) {
                push(_screens, stamp() + " " + what.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").substr(0, 120), TRAIL);
            }
        }

        /** A server request finished (URLLoaderApi). Status 0: no answer. Repeats of the last one are counted. */
        public static function Request(path:String, status:int, ms:int):void {
            var line:String = path + " " + (status ? String(status) : "no answer") + " ";
            if (path.indexOf("bugreport") != -1 || path.indexOf("recorddebugdata") != -1) {
                return; // the reporting itself
            }
            var last:String = _requests.length ? _requests[_requests.length - 1] : "";
            var at:int = last.indexOf(" ", 0);
            if (last && last.substr(at + 1, line.length) == line) {
                var times:Array = last.match(/ x(\d+)$/);
                _requests[_requests.length - 1] = stamp() + " " + line + ms + " ms x" + (times ? int(times[1]) + 1 : 2);
                return;
            }
            push(_requests, stamp() + " " + line + ms + " ms", TRAIL + 2);
        }

        /** Where the player is, in a line. */
        private static function where():String {
            var yard:String = "other";
            var cell:String = "";
            var popup:String = "";
            if (BASE.isOutpost) {
                yard = "outpost";
            }
            else if (BASE.isInfernoMainYardOrOutpost) {
                yard = "inferno main";
            }
            yard += " (type " + BASE.yardType + ")";
            if (BASE._ownerName) {
                yard += " of " + BASE._ownerName;
            }
            if (GLOBAL._currentCell) {
                cell = " | cell: " + GLOBAL._currentCell.cellX + "," + GLOBAL._currentCell.cellY;
            }
            popup = POPUPS.ioShowing();
            return "mode: " + GLOBAL._loadmode + " | yard: " + yard + " | baseid: " + BASE._loadedBaseID + cell
                + (MapRoomManager.instance && MapRoomManager.instance.isOpen ? " | map room open" : "")
                + (popup ? " | popup: " + popup : "")
                + " | screen: " + GLOBAL._ROOT.stage.stageWidth + "x" + GLOBAL._ROOT.stage.stageHeight
                + " | running: " + int(getTimer() / 60000) + " min";
        }

        /** Keeps the last few log lines of any kind, sent along with the next report. */
        public static function Record(logType:String, message:String):void {
            _recent.push(stamp() + " [" + logType + "] " + message.substr(0, 300));
            if (_recent.length > RECENT_LINES) {
                _recent.shift();
            }
        }

        public static function Send(message:String):void {
            if (!GLOBAL.INFERNO_ONLY || _sending || !message) {
                return;
            }
            // A failed report logs its own error: never report the reporter.
            if (message.indexOf("bugreport") != -1 || message.indexOf("recorddebugdata") != -1) {
                return;
            }
            // HTTP 4xx replies are the server answering normally (401 a login that has expired, 409 a name or
            // email already taken, ...), not bugs. Server errors (5xx) are still reported.
            if (/^URLLoaderApi HTTP status 4\d\d\b/.test(message)) {
                return;
            }
            // ...and the "Load Error" line that follows such an answer (it carries the status since URLLoaderApi
            // puts it in), and 502/503/504: the server or its proxy restarting during a deploy, not a bug.
            if (/^URLLoader Load Error \(HTTP 4\d\d\)/.test(message) || /^URLLoader(Api HTTP status| Load Error \(HTTP) 50[234]\b/.test(message)) {
                return;
            }
            // The save answer that follows such a 4xx (the game logs it whole: "Base.Save: {...status":409...}"),
            // e.g. test mode switched off elsewhere, or a yard reset during an attack: an answer, not a bug.
            if (/^Base\.(Save|Page): \{/.test(message) && /"status":4\d\d\b/.test(message)) {
                return;
            }
            var key:String = message.replace(/\d+/g, "#").substr(0, 200);
            var now:Number = new Date().time;
            if (_sent >= MAX_PER_SESSION || int(_sentPerError[key]) >= MAX_PER_ERROR || now - _lastSent < MIN_GAP_MS) {
                return;
            }
            _sentPerError[key] = int(_sentPerError[key]) + 1;
            _sent++;
            _lastSent = now;

            var context:String = "";
            try {
                context = where();
            }
            catch (e:Error) {
                context = "mode: " + GLOBAL._loadmode;
            }
            context += "\n\nLast clicks:\n" + (_clicks.join("\n") || "(none)")
                + "\n\nLast popups, messages and yards:\n" + (_screens.join("\n") || "(none)")
                + "\n\nLast requests:\n" + (_requests.join("\n") || "(none)")
                + "\n\nRecent log:\n" + _recent.join("\n");

            _sending = true;
            try {
                new URLLoaderApi().load(GLOBAL.serverUrl + "bugreport", [["message", message.substr(0, 4000)], ["context", context.substr(0, 8000)], ["build", String(IOBuild.stamp)], ["player", Capabilities.version]], done, failed);
            }
            catch (e:Error) {
            }
            _sending = false;
        }

        private static function done(serverData:Object):void {
        }

        private static function failed(e:Event):void {
        }
    }
}
