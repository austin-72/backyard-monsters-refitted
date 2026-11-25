import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, com_monsters_maproom_advanced_MapRoom as MapRoom, EnumYardType, GLOBAL, IoReplayPlayer, IoReplayRecorder, IoSiege, IoTd, IoWatch, KEYS, LOGGER, LOGIN, MapRoomManager, PLEASEWAIT, URLLoaderApi } from "@game";

/**
 * Inferno-only (18 October, the user's): attacks on the player's yards while they play, watched as they happen
 * (server: services/replays/liveAttacks.ts, InfernoOnlyConfig.liveAttacks; flag io_liveattacks).
 *
 * - Every POLL_MS the game asks which of the player's yards are being attacked (attackwatch/status). In the yard
 *   being attacked, it goes straight to watching it; anywhere else (another yard, the map) it says so once, with
 *   Watch.
 * - Opening a yard under attack (its load says io_watch), a save of it refused (io_refused "watching") and the
 *   regular page of it (io_watch) go to watching it too: the yard is the attacker's until the attack is over.
 * - Watching is the attack's recording so far (replays/live), played over the yard as it was when the attack began
 *   (the yard loaded in view mode with the replay's key), and each new part as it comes: IoReplayPlayer's live mode,
 *   whose bar has the Map Room only; when the attack is over, Return home.
 */
export class IoLiveWatch extends ASObject {
    private static readonly POLL_MS: number = 5000;

    private static _timer: any = null;

    private static _busy: boolean = false;

    /** Attacks already told of, or watched (key, or yard and start). */
    private static _told: any = {};

    /** A watch waiting for a save on its way to be answered. */
    private static _waiting: any = null;

    private static _waitingSpectator: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static get on(): boolean {
        return GLOBAL.INFERNO_ONLY && Boolean(GLOBAL._flags) && (GLOBAL._flags.io_liveattacks | 0) == 1;
    }

    private static idOf(a: any): string {
        return a && a.key ? String(a.key) : String(a ? a.baseid : "") + ":" + String(a ? a.since : "");
    }

    /** The game's yard is up: the regular look starts (once). */
    public static start(): void {
        if (!IoLiveWatch.on || IoLiveWatch._timer != null) {
            return;
        }
        IoLiveWatch._timer = setInterval((): void => {
            IoLiveWatch.poll();
        }, IoLiveWatch.POLL_MS);
    }

    /** Busy elsewhere: attacking, in an arena, loading. */
    private static busy(): boolean {
        if (BASE._loading || !LOGIN._playerID) {
            return true;
        }
        if (BASE.ioAttackRunning() || GLOBAL.isInAttackMode) {
            return true;
        }
        return IoTd.on || IoSiege.attacking || GLOBAL.ioTestMode();
    }

    private static inYard(a: any): boolean {
        return (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "ibuild") && String(BASE._loadedBaseID) == String(a.baseid);
    }

    public static poll(): void {
        if (!IoLiveWatch.on || IoLiveWatch._busy || BASE._loading || !LOGIN._playerID) {
            return;
        }
        IoLiveWatch._busy = true;
        // (a field sent, so it goes as a POST: with none the loader asks with a GET; and what the player is doing, for
        // the Watch menu: IoWatch)
        let fields: any[] = [["t", GLOBAL.Timestamp()]];
        let act: any = null;
        try {
            act = IoWatch.activity();
        } catch (e) {
            act = null;
        }
        if (act) {
            fields.push(["act", JSON.stringify(act)]);
            // (something that can be watched as pictures: the Watch socket is opened, so they go the moment someone watches)
            IoWatch.watchable(act);
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "attackwatch/status", fields, (r: any): void => {
            IoLiveWatch._busy = false;
            if (!r || (r.error !== 0 && r.error !== "0")) {
                return;
            }
            // (18 October: who is watching this player, shown to them while anyone does)
            IoWatch.showWatchers(r.watchers || null);
            // (someone watches: pictures of the game, or the attack's recording in short parts)
            if ((r.stream | 0) == 1) {
                IoWatch.castWanted();
            }
            if ((r.recWatched | 0) == 1) {
                IoReplayRecorder.watched();
            }
            if (!IoLiveWatch.busy()) {
                IoLiveWatch.seen(as3.as(r.attacks, Array) || []);
            }
        }, (e: IOErrorEvent): void => {
            IoLiveWatch._busy = false;
        });
    }

    /** The attacks on the player's yards now. */
    public static seen(attacks: any[]): void {
        for (let a of as3.values(attacks)) {
            if (!a || IoLiveWatch.busy()) {
                continue;
            }
            if (a.key && IoReplayPlayer.liveKey == String(a.key)) {
                continue;
            }
            if (IoLiveWatch.inYard(a)) {
                IoLiveWatch.watch(a);
                return;
            }
            let id: string = IoLiveWatch.idOf(a);
            if (IoLiveWatch._told[id]) {
                continue;
            }
            IoLiveWatch._told[id] = true;
            IoLiveWatch.tell(a);
        }
    }

    /** Said once: an attack on a yard the player isn't in. */
    private static tell(a: any): void {
        let outpost: boolean = String(a.type) == "outpost";
        let text: string = outpost ? KEYS.Get("io_live_alert_outpost", { "v1": IoLiveWatch.esc(a.attacker), "v2": a.x != null ? a.x + "," + a.y : "?" }) : KEYS.Get("io_live_alert_yard", { "v1": IoLiveWatch.esc(a.attacker) });
        if (!a.key) {
            GLOBAL.Message(text);
            return;
        }
        GLOBAL.Message(text, KEYS.Get("io_live_watch"), (): void => {
            IoLiveWatch.watch(a);
        });
    }

    /**
     * Watches an attack on one of the player's yards: its recording so far, then the yard as it was when it began
     * (view mode), the rest coming as it goes (IoReplayPlayer live).
     */
    public static watch(a: any, spectator: boolean = false): void {
        if (!a || !IoLiveWatch.on) {
            return;
        }
        if (!spectator) {
            IoLiveWatch._told[IoLiveWatch.idOf(a)] = true;
        }
        if (!spectator && IoLiveWatch.inYard(a)) {
            // (its saves would be refused: the yard is the attacker's until the attack is over)
            BASE._blockSave = true;
        }
        if (!a.key) {
            GLOBAL.Message(KEYS.Get("io_live_norecord", { "v1": IoLiveWatch.esc(a.attacker) }));
            return;
        }
        if (IoReplayPlayer.liveKey == String(a.key) || BASE.ioAttackRunning() || GLOBAL.isInAttackMode) {
            return;
        }
        // (a save on its way first: a yard's load waits for it, and would lose the replay's key)
        if (BASE._saving || BASE._loading) {
            if (IoLiveWatch._waiting == null) {
                IoLiveWatch._waiting = a;
                IoLiveWatch._waitingSpectator = spectator;
                let tries: int = 0;
                let again: Function = (): void => {
                    if ((BASE._saving || BASE._loading) && ++tries < 40) {
                        setTimeout(again, 250);
                        return;
                    }
                    let w: any = IoLiveWatch._waiting;
                    IoLiveWatch._waiting = null;
                    if (!BASE._saving && !BASE._loading) {
                        IoLiveWatch.watch(w, IoLiveWatch._waitingSpectator);
                    }
                };
                setTimeout(again, 250);
            }
            return;
        }
        let key: string = String(a.key);
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/live", [["key", key], ["after", -1], ["t", -1], ["defs", 0]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (!r || (r.error !== 0 && r.error !== "0") || !r.replay) {
                if (spectator) {
                    // (the Watch menu goes on to what's next)
                    IoWatch.ended();
                    return;
                }
                GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("io_live_cant"));
                return;
            }
            let got: any = r.replay;
            let meta: any = got.meta || {};
            meta.key = key;
            if (spectator) {
                // (the Watch menu: someone else's attack, as the list says it: who attacks what)
                meta.watchTitle = String(a.title || meta.defender || "");
                meta.watchAttacker = String(a.attacker || meta.attacker || "");
            }
            let replay: any = { "meta": meta, "rate": 4, "defs": [], "samples": [], "live": true, "liveSeq": -1, "liveDone": false, "spectator": spectator };
            for (let part of as3.values(as3.as(got.parts, Array) || [])) {
                for (let d of as3.values(as3.as(part.d, Array) || [])) {
                    replay.defs.push(d);
                }
                for (let s of as3.values(as3.as(part.s, Array) || [])) {
                    replay.samples.push(s);
                }
                replay.rate = Number(part.rate) || 4;
                replay.liveSeq = Math.max(replay.liveSeq, part.seq | 0);
            }
            if (got.done) {
                replay.defs = as3.as(got.defs, Array) || [];
                replay.samples = as3.as(got.samples, Array) || [];
                replay.rate = Number(got.rate) || 4;
                replay.liveDone = true;
            } else if (got.recording && got.active === false) {
                replay.liveDone = true;
            }
            if (BASE.ioAttackRunning() || GLOBAL.isInAttackMode || (spectator && !IoWatch.mode)) {
                return;
            }
            LOGGER.Log("log", "Live attack " + key + " on " + meta.baseid + " watched (" + replay.samples.length + " samples so far)");
            IoReplayPlayer.prepare(replay);
            let yardType: int = String(meta.yard_type) == "outpost" ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, Number(meta.baseid), GLOBAL.e_BASE_MODE.VIEW, false, yardType, 0, ["replay", key]);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_tr_rp_load_offline"));
        });
    }

    /** The live view's Map Room button: the only thing to do while the attack goes on (the map at the yard attacked). */
    public static openMap(): void {
        let at: any = IoReplayPlayer.liveWhere;
        if (at && MapRoomManager.instance.isInMapRoom2) {
            MapRoom.ioFocus = new Point(at.x | 0, at.y | 0);
        }
        MapRoomManager.instance.Show();
    }

    /** The attack watched is over (shown). */
    public static ended(key: string): void {
        if (key) {
            IoLiveWatch._told[key] = true;
        }
    }

    /** A load or a page of the player's own yard said it is under attack (io_watch). */
    public static fromServer(watch: any): void {
        if (!watch || !IoLiveWatch.on) {
            return;
        }
        IoLiveWatch.start();
        setTimeout((): void => {
            IoLiveWatch.watch(watch);
        }, 0);
    }

    private static esc(text: any): string {
        return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
