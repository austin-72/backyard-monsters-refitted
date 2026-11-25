import { int } from "as3";
import { netHooks } from "flash/net";
import { getTimer, setTimeout } from "flash/utils";
import { GLOBAL, IoToast, KEYS, LOGGER } from "@game";

/**
 * Inferno-only (16 October, the user's: "let the client know when the server is restarting so it holds off for 60
 * seconds"; bug reports #92-#95: saves, quests, bookmarks and chat that failed while the server restarted, with
 * Cloudflare's 520 / 525 or no answer, each reported).
 *
 * The server says a restart is coming on every answer (`X-Io-Restart: <seconds>`, server services/admin/restartNotice.ts:
 * a stopping server goes on answering a few seconds to say it), and Cloudflare answers 502-504 / 520-530 for a server
 * that isn't there. Hearing either (the header once, the proxy's twice in a row), the game holds: every request to
 * the server waits (the runtime's netHooks.gate: they go in the order they were made, once it is over), chat stops
 * polling, and a line says so with a countdown. From 2 s on the server is asked every 3 s (/connection, not held):
 * an answer without the header ends the hold; HOLD_S at most, then everything goes as before (what still fails is
 * handled as it always was: saves try again, "Reconnecting…").
 *
 * What fails because of it (requests already on their way when it stopped, the polls of a server that was away) is
 * not reported as a bug while holding and for a short while after (LOGGER).
 */
export class IoServerHold {
    public static readonly HOLD_S: int = 60;

    /** The first check of the server after the hold began, then every... (ms) */
    private static readonly FIRST_CHECK_MS: int = 2000;

    private static readonly CHECK_MS: int = 3000;

    /** How long after the hold failures are still the restart's (ms). */
    private static readonly AFTER_MS: int = 30000;

    private static _on: boolean = false;

    private static _installed: boolean = false;

    /** The hold: began (getTimer), ends at the latest (getTimer); said by the server, or guessed from the proxy. */
    private static _began: int = 0;

    private static _until: int = 0;

    private static _said: boolean = false;

    private static _ended: int = -1000000;

    /** After a hold that ran out, the server's header is not heeded again for a while (getTimer). */
    private static _deafUntil: int = 0;

    /** The proxy's "the server isn't there" in a row. */
    private static _proxyDown: int = 0;

    private static _release: Function = null;

    private static _wait: Promise<void> = null;

    private static _later: Function[] = [];

    private static _lastToast: int = -1;

    /** For a test: holds begun, requests held, how the last one ended ("back", "timeout"). */
    public static holds: int = 0;

    public static held: int = 0;

    public static lastEnd: string = "";

    /** From the game's start: every request asked about, every answer heard. */
    public static Install(): void {
        if (!GLOBAL.INFERNO_ONLY || IoServerHold._installed) {
            return;
        }
        IoServerHold._installed = true;
        netHooks.gate = (url: string): Promise<void> => IoServerHold.gate(url);
        netHooks.onAnswer = (url: string, status: number, headers: Headers): void => IoServerHold.answer(url, status, headers);
    }

    public static get holding(): boolean {
        return IoServerHold._on;
    }

    /** A failure now is the restart's (holding, or just after). */
    public static get excused(): boolean {
        return IoServerHold._on || getTimer() - IoServerHold._ended < IoServerHold.AFTER_MS;
    }

    /** The proxy's answer for a server that isn't there (restarting, or down): 502-504, Cloudflare's 520-530. */
    public static proxyDown(status: number): boolean {
        return (status >= 502 && status <= 504) || (status >= 520 && status <= 530);
    }

    /** The lines a restart makes (said as "log" while it is the restart's, not reported). */
    public static connectivity(line: string): boolean {
        return /^(HTTP (0|5\d\d) on |No answer from the server|HttpChatSystem: chat polling keeps failing|URLLoaderApi: the answer is not JSON|Base\.Save HTTP|BASE\.Save HTTP|MapRoom\.BookmarksSave HTTP)/.test(String(line || ""));
    }

    /** `fn` once the hold is over (now if there is none). */
    public static later(fn: Function): void {
        if (!IoServerHold._on) {
            fn();
            return;
        }
        if (IoServerHold._later.indexOf(fn) < 0) {
            IoServerHold._later.push(fn);
        }
    }

    /** The game's server (not another site's). */
    private static ours(url: string): boolean {
        try {
            let host: string = new URL(url, String(globalThis.location ? globalThis.location.href : GLOBAL.serverUrl)).host;
            for (let base of [GLOBAL.serverUrl, GLOBAL._apiURL, globalThis.location ? globalThis.location.href : ""]) {
                if (base && new URL(String(base)).host == host) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    private static gate(url: string): Promise<void> {
        if (!IoServerHold._on || !IoServerHold._wait || !IoServerHold.ours(url)) {
            return null;
        }
        ++IoServerHold.held;
        return IoServerHold._wait;
    }

    private static answer(url: string, status: number, headers: Headers): void {
        if (!IoServerHold.ours(url)) {
            return;
        }
        let said: number = headers ? Number(headers.get("X-Io-Restart")) || 0 : 0;
        if (said > 0) {
            IoServerHold._proxyDown = 0;
            if (getTimer() >= IoServerHold._deafUntil) {
                IoServerHold.begin(said, true);
            }
            return;
        }
        if (IoServerHold.proxyDown(status)) {
            // (18 October, SUSPECTED-BUGS.md: the same cool-down as the server's own word after a hold ran out: two
            // error pages straight after one began another, so the game was held almost all the time)
            if (++IoServerHold._proxyDown >= 2 && getTimer() >= IoServerHold._deafUntil) {
                IoServerHold.begin(IoServerHold.HOLD_S, false);
            }
        } else if (status > 0) {
            IoServerHold._proxyDown = 0;
        }
    }

    /** The hold begun (or, already holding, said by the server now). */
    public static begin(seconds: number, said: boolean): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (IoServerHold._on) {
            if (said && !IoServerHold._said) {
                IoServerHold._said = true;
                IoServerHold.toast(true);
            }
            return;
        }
        IoServerHold._on = true;
        IoServerHold._said = said;
        IoServerHold._began = getTimer();
        IoServerHold._until = (IoServerHold._began + Math.min(IoServerHold.HOLD_S, Math.max(5, seconds)) * 1000) | 0;
        IoServerHold._wait = new Promise<void>((resolve) => {
            IoServerHold._release = resolve;
        });
        ++IoServerHold.holds;
        LOGGER.Log("log", "The server " + (said ? "says it is restarting" : "is not there (the proxy's " + "answers)") + ": requests held for up to " + Math.round((IoServerHold._until - IoServerHold._began) / 1000) + " s");
        IoServerHold.toast(true);
        // (18 October, SUSPECTED-BUGS.md: each hold started another check loop and the old ones kept going, so after a
        // long outage about ten polled every 3 s) each loop is this hold's, and stops when another hold has begun
        let mine: int = IoServerHold.holds;
        setTimeout((): void => IoServerHold.check(mine), IoServerHold.FIRST_CHECK_MS);
        IoServerHold.tick(mine);
    }

    /** The line, each second. */
    private static tick(mine: int = -1): void {
        if (!IoServerHold._on || (mine >= 0 && mine != IoServerHold.holds)) {
            return;
        }
        if (getTimer() >= IoServerHold._until) {
            IoServerHold.end("timeout");
            return;
        }
        IoServerHold.toast(false);
        setTimeout((): void => IoServerHold.tick(mine), 1000);
    }

    private static toast(now: boolean): void {
        if (!GLOBAL._layerTop) {
            return;
        }
        let left: int = Math.max(1, Math.ceil((IoServerHold._until - getTimer()) / 1000)) | 0;
        if (!now && left == IoServerHold._lastToast) {
            return;
        }
        IoServerHold._lastToast = left;
        IoToast.Show(KEYS.Get(IoServerHold._said ? "io_restart_hold" : "io_server_away_hold", { "v1": left }), 1500);
    }

    /** Is the new server there? (asked directly: not held) */
    private static check(mine: int = -1): void {
        if (!IoServerHold._on || (mine >= 0 && mine != IoServerHold.holds)) {
            return;
        }
        let again = (): void => {
            if (IoServerHold._on) {
                setTimeout((): void => IoServerHold.check(mine), IoServerHold.CHECK_MS);
            }
        };
        let w: any = globalThis as any;
        if (!w.fetch) {
            again();
            return;
        }
        let abort: any = w.AbortController ? new w.AbortController() : null;
        let timer: any = abort ? w.setTimeout(() => abort.abort(), 4000) : null;
        w.fetch(String(GLOBAL.serverUrl) + "connection?ioHold=" + getTimer(), { method: "GET", cache: "no-store", credentials: "same-origin", signal: abort ? abort.signal : undefined }).then((res: Response): void => {
            if (timer) {
                w.clearTimeout(timer);
            }
            let said: number = Number(res.headers.get("X-Io-Restart")) || 0;
            if (res.ok && said <= 0) {
                IoServerHold.end("back");
                return;
            }
            if (said > 0 && !IoServerHold._said) {
                IoServerHold._said = true;
                IoServerHold.toast(true);
            }
            again();
        }, (): void => {
            if (timer) {
                w.clearTimeout(timer);
            }
            again();
        });
    }

    /** Over: the requests held go (in order), chat polls again. */
    private static end(how: string): void {
        if (!IoServerHold._on) {
            return;
        }
        IoServerHold._on = false;
        IoServerHold._ended = getTimer();
        IoServerHold._proxyDown = 0;
        IoServerHold.lastEnd = how;
        if (how == "timeout") {
            // (a server still saying so after HOLD_S: what it says is not heeded again for a while)
            IoServerHold._deafUntil = (getTimer() + IoServerHold.HOLD_S * 1000) | 0;
        }
        LOGGER.Log("log", "The server hold is over (" + how + ", after " + Math.round((getTimer() - IoServerHold._began) / 1000) + " s, " + IoServerHold.held + " request(s) held)");
        let release: Function = IoServerHold._release;
        IoServerHold._release = null;
        IoServerHold._wait = null;
        if (release != null) {
            release();
        }
        let later: Function[] = IoServerHold._later;
        IoServerHold._later = [];
        for (let fn of later) {
            try {
                fn();
            } catch (e) {
                LOGGER.Log("log", "IoServerHold: " + e);
            }
        }
        if (GLOBAL._layerTop) {
            IoToast.Show(KEYS.Get(how == "back" ? "io_restart_back" : "io_restart_timeout"), how == "back" ? 2500 : 4000);
        }
    }
}
