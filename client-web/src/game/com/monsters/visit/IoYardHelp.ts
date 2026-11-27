import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { BASE, BFOUNDATION, GLOBAL, IoToast, KEYS, LOGIN, UPDATES, URLLoaderApi } from "@game";

/**
 * Inferno-only (27 November, 72's suggestion: "When visiting a yard and there are upgrades allow the visiting user to
 * "help out" and speed up their upgrades by 5%. One user can only help speed up each upgrade once ever."):
 *
 *  - A visitor: a building's card (IoVisitUi) has Help out while it is being built, upgraded or calcified; the server
 *    keeps the help (yard/help; services/yard/yardHelp.ts), once a player a job and 5 helpers a job, as the
 *    overworld's Help had it.
 *  - The owner: their game takes 5% off what is left of the job (BFOUNDATION.HelpB, saved) when it has the yard open:
 *    the helps not taken yet come with the yard's load (io_help) and are asked for every 2 minutes after, and who
 *    helped is said. A help whose job is over (done, or another job now) is only marked taken.
 */
export class IoYardHelp extends ASObject {
    /** What a help takes off (the server's). */
    public static share: number = 0.05;

    /** The visitor's helped jobs in the loaded yard ("<building>:<kind>:<level>"). */
    private static _helped: any = {};

    /** The owner's helps that came with the load, taken once the yard is up. */
    private static _pending: any[] = null;

    private static _timer: Timer = null;
    private static _busy: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    /** The yard's load (BASE): what it brought. */
    public static fromLoad(data: any): void {
        IoYardHelp._helped = {};
        IoYardHelp._pending = null;
        if (!GLOBAL.INFERNO_ONLY || !data) {
            return;
        }
        if (as3.is(data.io_helped, Array)) {
            for (let k of as3.values(data.io_helped)) {
                IoYardHelp._helped[String(k)] = true;
            }
        }
        if (as3.is(data.io_help, Array)) {
            IoYardHelp._pending = as3.as(data.io_help, Array);
        }
    }

    /** The player's own yard (main or outpost), being built? */
    private static ownYard(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.ioDesignMode() && String(BASE._userID) == String(LOGIN._playerID) && !!BASE._loadedBaseID;
    }

    /** The yard is up (BASE): the owner's helps taken, and asked for again every 2 minutes. */
    public static afterLoad(): void {
        if (!IoYardHelp.ownYard()) {
            return;
        }
        if (IoYardHelp._pending && IoYardHelp._pending.length) {
            IoYardHelp.take(IoYardHelp._pending);
        }
        IoYardHelp._pending = null;
        if (!IoYardHelp._timer) {
            IoYardHelp._timer = new Timer(120000);
            IoYardHelp._timer.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                IoYardHelp.ask(null);
            });
            IoYardHelp._timer.start();
        }
    }

    /** Asks for the helps not taken (after marking `ack` taken). */
    private static ask(ack: any[]): void {
        if (IoYardHelp._busy || !IoYardHelp.ownYard() || !GLOBAL.serverUrl) {
            return;
        }
        IoYardHelp._busy = true;
        let base: string = String(BASE._loadedBaseID);
        new URLLoaderApi().load(GLOBAL.serverUrl + "yard/helps", [["baseid", base], ["ack", ack ? ack.join(",") : ""]], (r: any): void => {
            IoYardHelp._busy = false;
            if (!r || r.error || !as3.is(r.helps, Array) || String(BASE._loadedBaseID) != base) {
                return;
            }
            if (Number(r.share) > 0) {
                IoYardHelp.share = Number(r.share);
            }
            if (r.helps.length) {
                IoYardHelp.take(as3.as(r.helps, Array));
            }
        }, (e: IOErrorEvent): void => {
            IoYardHelp._busy = false;
        });
    }

    /** A building's job now: [kind, the level it leads to], or null (the server's jobOf). */
    public static jobOf(b: BFOUNDATION): any[] {
        if (!b) {
            return null;
        }
        let lvl: int = Math.max(0, b._lvl ? b._lvl.Get() | 0 : 0) | 0;
        if (b._countdownBuild && b._countdownBuild.Get() > 0) {
            return ["build", Math.max(1, lvl)];
        }
        if (b._countdownUpgrade && b._countdownUpgrade.Get() > 0) {
            return ["upgrade", lvl + 1];
        }
        if (b._countdownFortify && b._countdownFortify.Get() > 0) {
            return ["fortify", (b._fortification ? b._fortification.Get() | 0 : 0) + 1];
        }
        return null;
    }

    private static keyOf(b: BFOUNDATION): string {
        let job: any[] = IoYardHelp.jobOf(b);
        return job ? b._id + ":" + job[0] + ":" + job[1] : null;
    }

    /** The owner: each help taken off its job (if it's still that job), who helped said, all marked taken. */
    private static take(list: any[]): void {
        let ack: any[] = [];
        let said: any[] = [];
        for (let h of as3.values(list)) {
            if (!h) {
                continue;
            }
            ack.push(h.id | 0);
            let b: BFOUNDATION = UPDATES.GetBuilding(h.bid | 0);
            let job: any[] = IoYardHelp.jobOf(b);
            if (!job || job[0] != h.kind || (job[1] | 0) != (h.lvl | 0)) {
                continue;
            }
            if (b._helpList.indexOf(h.from | 0) >= 0 || b._helpList.indexOf(String(h.from)) >= 0) {
                continue;
            }
            b._helpList.push(h.from | 0);
            let off: int = b.HelpB();
            if (off > 0) {
                said.push(KEYS.Get("io_help_got", { "v1": String(h.name || "?"), "v2": KEYS.Get(as3.str(b._buildingProps.name)), "v3": GLOBAL.ioDuration(off) }));
            }
        }
        if (said.length) {
            IoToast.Show(said.slice(0, 3).join("<br>") + (said.length > 3 ? "<br>" + KEYS.Get("io_help_got_more", { "v1": said.length - 3 }) : ""), 6000);
        }
        if (ack.length) {
            // (marked taken now, with the next ask's answer as well)
            IoYardHelp.ask(ack);
        }
    }

    // ---- the visitor
    /** Can the visitor help with this building now (a player's yard, not theirs, a job on it, not helped yet)? */
    public static canHelp(b: BFOUNDATION): boolean {
        let m: string = GLOBAL.mode;
        let modes: any = GLOBAL.e_BASE_MODE;
        if (!GLOBAL.INFERNO_ONLY || !b || (m != modes.VIEW && m != modes.IVIEW && m != modes.HELP && m != modes.IHELP) || (BASE._userID | 0) <= 0 || String(BASE._userID) == String(LOGIN._playerID)) {
            return false;
        }
        return IoYardHelp.keyOf(b) != null;
    }

    /** Has the visitor helped with this building's job already? */
    public static helped(b: BFOUNDATION): boolean {
        let k: string = IoYardHelp.keyOf(b);
        if (!k) {
            return false;
        }
        return IoYardHelp._helped[k] === true || b._helpList.indexOf(LOGIN._playerID | 0) >= 0 || b._helpList.indexOf(String(LOGIN._playerID)) >= 0;
    }

    /** Helps out: the server's answer, then the 5% taken off here too (as the owner's game will), and `done`. */
    public static help(b: BFOUNDATION, done: Function = null): void {
        if (IoYardHelp._busy || !IoYardHelp.canHelp(b) || IoYardHelp.helped(b)) {
            return;
        }
        IoYardHelp._busy = true;
        let key: string = IoYardHelp.keyOf(b);
        new URLLoaderApi().load(GLOBAL.serverUrl + "yard/help", [["baseid", String(BASE._loadedBaseID)], ["bid", b._id]], (r: any): void => {
            IoYardHelp._busy = false;
            if (!r || (r.error !== 0 && r.error !== "0")) {
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_t3t_srv_try"));
                return;
            }
            IoYardHelp._helped[key] = true;
            let share: number = Number(r.share) > 0 ? Number(r.share) : IoYardHelp.share;
            let off: int = 0;
            for (let c of [b._countdownBuild, b._countdownUpgrade, b._countdownFortify]) {
                if (c && c.Get() > 0) {
                    off = (c.Get() * share) | 0;
                    c.Add(-off);
                    break;
                }
            }
            IoToast.Show(KEYS.Get("io_help_done", { "v1": KEYS.Get(as3.str(b._buildingProps.name)), "v2": GLOBAL.ioDuration(off) }), 4000);
            if (done != null) {
                done();
            }
        }, (e: IOErrorEvent): void => {
            IoYardHelp._busy = false;
            GLOBAL.Message(KEYS.Get("io_t3t_srv_conn"));
        });
    }
}
