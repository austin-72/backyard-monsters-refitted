import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, Stage } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Capabilities } from "flash/system";
import { TextField } from "flash/text";
import { getQualifiedClassName, getTimer } from "flash/utils";
import { BASE, Button, GLOBAL, IOBuild, MapRoomManager, POPUPS, URLLoaderApi } from "@game";

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
export class IoBugReport extends ASObject {
    private static readonly RECENT_LINES: int = 15;

    private static readonly MAX_PER_ERROR: int = 3;

    private static readonly MAX_PER_SESSION: int = 40;

    private static readonly MIN_GAP_MS: int = 2000;

    private static _recent: any[] = [];

    private static _sentPerError: any = {};

    private static _sent: int = 0;

    private static _lastSent: number = 0;

    private static _sending: boolean = false;

    private static readonly TRAIL: int = 8;

    /** The player's last clicks ("11:03:58 HOUSINGPOPUP > bAscend "Ascend Monsters""). */
    private static _clicks: any[] = [];

    /** Popups, messages and yards shown last. */
    private static _screens: any[] = [];

    /** The last server requests ("11:04:03 /base/save 200 143 ms", repeats counted). */
    private static _requests: any[] = [];

    private static _watching: boolean = false;

    private static stamp(): string {
        // (from the parts: Flash Player's toUTCString is "Sat Oct 3 07:47:59 2026 UTC", the browser's
        // "Sat, 03 Oct 2026 07:47:59 GMT", and a fixed cut gave "9 2026 U" from Flash)
        let d: Date = new Date();
        return IoBugReport.two(d.getUTCHours() | 0) + ":" + IoBugReport.two(d.getUTCMinutes() | 0) + ":" + IoBugReport.two(d.getUTCSeconds() | 0);
    }

    private static two(n: int): string {
        return n < 10 ? "0" + n : String(n);
    }

    private static push(list: any[], line: string, keep: int): void {
        list.push(line);
        if (list.length > keep) {
            list.shift();
        }
    }

    /** Starts noting the player's clicks (GAME, once the stage is there). */
    public static Watch(stage: Stage): void {
        if (IoBugReport._watching || !stage || !GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoBugReport._watching = true;
        stage.addEventListener(MouseEvent.MOUSE_DOWN, IoBugReport.onClick, true, 0, true);
    }

    private static onClick(e: MouseEvent): void {
        try {
            IoBugReport.push(IoBugReport._clicks, IoBugReport.stamp() + " " + IoBugReport.describe(as3.as(e.target, DisplayObject)), IoBugReport.TRAIL);
        } catch (err) {
        }
    }

    /** "HOUSINGPOPUP > bAscend "Ascend Monsters"": the named things around what was clicked, and its text. */
    private static describe(target: DisplayObject): string {
        let parts: any[] = [];
        let text: string = "";
        let o: DisplayObject = target;
        let name: string = null;
        let cls: string = null;
        while (o && !(o instanceof Stage) && parts.length < 4) {
            if (!text && o instanceof TextField && as3.cast(o, TextField).text) {
                text = as3.cast(o, TextField).text;
            }
            if (!text && o instanceof Button && as3.cast(o, Button)._txt && as3.cast(o, Button)._txt.text) {
                text = as3.cast(o, Button)._txt.text;
            }
            cls = getQualifiedClassName(o);
            cls = cls.substr(cls.lastIndexOf(":") + 1);
            name = o.name && !/^instance\d+$/.test(o.name) ? o.name : "";
            if (!/^(MovieClip|Sprite|Shape|Bitmap|TextField|SimpleButton|Loader|emptyMc|GAME)$/.test(cls)) {
                parts.unshift(name && name != cls ? cls + "." + name : cls);
            } else if (name) {
                parts.unshift(name);
            }
            o = o.parent;
        }
        return (parts.length ? parts.join(" > ") : "(the map)") + (text ? " \"" + text.replace(/\s+/g, " ").substr(0, 40) + "\"" : "");
    }

    /** A popup, message or yard coming up (POPUPS, GLOBAL.Message, BASE.LoadBase). */
    public static Screen(what: string): void {
        if (what) {
            IoBugReport.push(IoBugReport._screens, IoBugReport.stamp() + " " + what.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").substr(0, 120), IoBugReport.TRAIL);
        }
    }

    /** A server request finished (URLLoaderApi). Status 0: no answer. Repeats of the last one are counted. */
    public static Request(path: string, status: int, ms: int): void {
        let line: string = path + " " + (status ? String(status) : "no answer") + " ";
        if (path.indexOf("bugreport") != -1 || path.indexOf("recorddebugdata") != -1) {
            return;
        }
        let last: string = as3.str(IoBugReport._requests.length ? IoBugReport._requests[IoBugReport._requests.length - 1] : "");
        let at: int = last.indexOf(" ", 0);
        if (last && last.substr(at + 1, line.length) == line) {
            let times: any[] = last.match(/ x(\d+)$/);
            IoBugReport._requests[IoBugReport._requests.length - 1] = IoBugReport.stamp() + " " + line + ms + " ms x" + (times ? (times[1] | 0) + 1 : 2);
            return;
        }
        IoBugReport.push(IoBugReport._requests, IoBugReport.stamp() + " " + line + ms + " ms", (IoBugReport.TRAIL + 2) | 0);
    }

    /** Where the player is, in a line. */
    private static where(): string {
        let yard: string = "other";
        let cell: string = "";
        let popup: string = "";
        if (BASE.isOutpost) {
            yard = "outpost";
        } else if (BASE.isInfernoMainYardOrOutpost) {
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
        return "mode: " + GLOBAL._loadmode + " | yard: " + yard + " | baseid: " + BASE._loadedBaseID + cell + (MapRoomManager.instance && MapRoomManager.instance.isOpen ? " | map room open" : "") + (popup ? " | popup: " + popup : "") + " | screen: " + GLOBAL._ROOT.stage.stageWidth + "x" + GLOBAL._ROOT.stage.stageHeight + " | running: " + ((getTimer() / 60000) | 0) + " min";
    }

    /** Keeps the last few log lines of any kind, sent along with the next report. */
    public static Record(logType: string, message: string): void {
        IoBugReport._recent.push(IoBugReport.stamp() + " [" + logType + "] " + message.substr(0, 300));
        if (IoBugReport._recent.length > IoBugReport.RECENT_LINES) {
            IoBugReport._recent.shift();
        }
    }

    public static Send(message: string): void {
        if (!GLOBAL.INFERNO_ONLY || IoBugReport._sending || !message) {
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
        let key: string = message.replace(/\d+/g, "#").substr(0, 200);
        let now: number = new Date().getTime();
        if (IoBugReport._sent >= IoBugReport.MAX_PER_SESSION || (IoBugReport._sentPerError[key] | 0) >= IoBugReport.MAX_PER_ERROR || now - IoBugReport._lastSent < IoBugReport.MIN_GAP_MS) {
            return;
        }
        IoBugReport._sentPerError[key] = (IoBugReport._sentPerError[key] | 0) + 1;
        IoBugReport._sent++;
        IoBugReport._lastSent = now;

        let context: string = "";
        try {
            context = IoBugReport.where();
        } catch (e) {
            context = "mode: " + GLOBAL._loadmode;
        }
        context += "\n\nLast clicks:\n" + (IoBugReport._clicks.join("\n") || "(none)") + "\n\nLast popups, messages and yards:\n" + (IoBugReport._screens.join("\n") || "(none)") + "\n\nLast requests:\n" + (IoBugReport._requests.join("\n") || "(none)") + "\n\nRecent log:\n" + IoBugReport._recent.join("\n");

        IoBugReport._sending = true;
        try {
            new URLLoaderApi().load(GLOBAL.serverUrl + "bugreport", [["message", message.substr(0, 4000)], ["context", context.substr(0, 8000)], ["build", String(IOBuild.stamp)], ["player", Capabilities.version]], IoBugReport.done, IoBugReport.failed);
        } catch (e) {
        }
        IoBugReport._sending = false;
    }

    private static done(serverData: any): void {
    }

    private static failed(e: Event): void {
    }
}
