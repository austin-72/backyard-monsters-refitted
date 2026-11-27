import * as as3 from "as3";
import { ASObject } from "as3";
import { Capabilities } from "flash/system";
import { GLOBAL, IOBuild, IoBugReport, LOGIN } from "@game";

/**
 * Inferno-only (27 November, Goldair1's report #4: "my game screen/tab was frozen, clicking refresh does nothing ...
 * closing the tab then reopening the tab is the only way to fix it"): a freeze recorder. A page whose game is stuck in
 * its own code can't say so (nothing of it runs, not even the browser's reload), so a small worker beside it watches:
 *
 *  - the game sends the worker a beat every second (where the player is, and every 3 s their last clicks, popups,
 *    yards and requests: IoBugReport's trail), and marks its steps as it loads and lays out a yard (mark: BASE, MAP)
 *  - the page shown, and no beat for 10 s: the worker sends the server an automatic bug report itself ("The game
 *    stopped responding"), with what it last heard: the steps, where, the trail; the admin panel's Bugs tab groups
 *    them (POST bugreport, as IoBugReport's)
 *  - the beats coming back after that: a second report, how long it was stuck ("... then carried on")
 *
 * Not while the page is hidden (browsers hold a hidden page's timers back), nor after the computer slept (the worker
 * notices its own gap). At most four reports a page.
 */
export class IoFreezeWatch extends ASObject {
    /** No beat for this long, the page shown: frozen. */
    public static readonly FROZEN_MS: number = 10000;

    private static _worker: any = null;

    private static _started: boolean = false;

    private static _lastTrail: number = 0;

    private static readonly WORKER_SOURCE: string = [
        "var last = 0, shown = true, where = '', trail = '', marks = [], url = '', token = '', build = '', player = '';",
        "var frozenAt = 0, reported = false, sent = 0, tick = Date.now(), FROZEN = 10000;",
        "function ctx(ms) {",
        "  return 'Frozen since ' + new Date(last).toISOString().replace('T', ' ').substr(0, 19) + ' UTC (' + Math.round(ms / 1000) + ' s)\\n' + where +",
        "    '\\n\\nLast steps:\\n' + (marks.join('\\n') || '(none)') + '\\n\\n' + trail;",
        "}",
        "function send(message, ms) {",
        "  if (sent >= 4 || !url || !token) return;",
        "  sent++;",
        "  try {",
        "    fetch(url + 'bugreport', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },",
        "      body: JSON.stringify({ message: message, context: ctx(ms).substr(0, 7900), build: build, player: player }) }).catch(function () {});",
        "  } catch (e) {}",
        "}",
        "onmessage = function (e) {",
        "  var m = e.data || {}, now = Date.now();",
        "  if (m.k === 'beat') {",
        "    if (reported && frozenAt) send('The game stopped responding for a while, then carried on', now - frozenAt);",
        "    reported = false; frozenAt = 0; last = now; shown = !!m.shown;",
        "    if (m.where) where = m.where; if (m.trail) trail = m.trail; if (m.url) url = m.url; if (m.token) token = m.token;",
        "    if (m.build) build = m.build; if (m.player) player = m.player;",
        "  } else if (m.k === 'mark') {",
        "    marks.push(m.s); if (marks.length > 14) marks.shift();",
        "  } else if (m.k === 'shown') {",
        "    shown = !!m.shown; last = now;",
        "  }",
        "};",
        "setInterval(function () {",
        "  var now = Date.now();",
        // (the worker's own timer held back: the computer slept, or the browser froze the whole page): not the game
        "  if (now - tick > 5000) { tick = now; if (!reported) last = now; return; }",
        "  tick = now;",
        "  if (!shown || !last || reported) return;",
        "  if (now - last >= FROZEN) { reported = true; frozenAt = last; send('The game stopped responding', now - last); }",
        "}, 1000);",
    ].join("\n");

    public $ctor(): void {
        super.$ctor();
    }

    /** Starts the worker and the beats (GAME, once). */
    public static Start(): void {
        if (IoFreezeWatch._started || !GLOBAL.INFERNO_ONLY || typeof Worker === "undefined" || typeof document === "undefined") {
            return;
        }
        IoFreezeWatch._started = true;
        try {
            IoFreezeWatch._worker = new Worker(URL.createObjectURL(new Blob([IoFreezeWatch.WORKER_SOURCE], { "type": "text/javascript" })));
        } catch (e) {
            IoFreezeWatch._worker = null;
            return;
        }
        document.addEventListener("visibilitychange", (): void => {
            IoFreezeWatch.post({ "k": "shown", "shown": document.visibilityState == "visible" });
        });
        setInterval(IoFreezeWatch.beat, 1000);
        IoFreezeWatch.beat();
    }

    private static beat(): void {
        let now: number = new Date().getTime();
        let m: any = { "k": "beat", "shown": document.visibilityState == "visible", "url": GLOBAL.serverUrl || "", "token": LOGIN.token || "", "build": String(IOBuild.stamp), "player": Capabilities.version };
        try {
            m.where = IoBugReport.where();
        } catch (e) {
            m.where = "mode: " + GLOBAL._loadmode;
        }
        if (now - IoFreezeWatch._lastTrail >= 3000) {
            IoFreezeWatch._lastTrail = now;
            try {
                m.trail = IoBugReport.trail().substr(0, 5000);
            } catch (e) {
            }
        }
        IoFreezeWatch.post(m);
    }

    /** A step of the game's (a yard loaded, being laid out ...), kept by the worker: the last ones go with a report. */
    public static mark(step: string): void {
        if (!IoFreezeWatch._worker) {
            return;
        }
        let d: Date = new Date();
        let two: Function = (n: number): string => (n < 10 ? "0" : "") + n;
        IoFreezeWatch.post({ "k": "mark", "s": two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()) + ":" + two(d.getUTCSeconds()) + "." + String(1000 + d.getUTCMilliseconds()).substr(1) + " " + step });
    }

    private static post(m: any): void {
        try {
            if (IoFreezeWatch._worker) {
                IoFreezeWatch._worker.postMessage(m);
            }
        } catch (e) {
        }
    }

    /** For tests: the worker is there. */
    public static get running(): boolean {
        return IoFreezeWatch._worker != null;
    }
}
