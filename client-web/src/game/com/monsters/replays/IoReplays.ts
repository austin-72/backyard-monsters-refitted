import { ASObject, int } from "as3";
import { Event, IOErrorEvent } from "flash/events";
import { FileFilter, FileReference, URLRequest, navigateToURL } from "flash/net";
import { System } from "flash/system";
import { BASE, BYMChat, Base64, Chat, EnumYardType, GLOBAL, IoReplayPlayer, IoToast, KEYS, PLEASEWAIT, SOUNDS, TUTORIAL, URLLoaderApi } from "@game";

/**
 * Inferno-only: attack replays, the ways in (server: services/replays/replays.ts). From the attack logs (IoAttackLogs)
 * or a chat link ([replay:key], IoMapShare.RenderChat): Watch, Share in chat, Download; and opening a downloaded
 * file again (Open). Watching loads the replay's recording, then the yard in view mode as it was when the attack
 * began (its load with the key); once it is built, IoReplayPlayer plays the battle over it.
 *
 * Inferno-only (QoL #98, 15 October): a replay's link, the game's page with ?replay=KEY (Copy link in the replay's
 * Share), opens the game straight into it once the player's yard is up (ioLinkStep); and a replay shared in chat
 * says who attacked whom and the damage: [replay:KEY|Ann|Bob|87], its pill "▶ Ann vs Bob · 87%" (PillLabel; the
 * plain [replay:KEY] of before is still read). Favourite (QoL #97): the ★ that keeps a replay on the server.
 */
export class IoReplays extends ASObject {
    public static readonly TOKEN_START: string = "[replay:";

    /** [replay:Ab12Cd34Ef56], or (QoL #98) [replay:Ab12Cd34Ef56|Ann|Bob|87]: the key, then attacker, defender, damage. */
    public static readonly TOKEN: RegExp = /\[replay:([0-9a-zA-Z]{6,24})(?:\|([0-9A-Za-z_. -]{1,16})\|([0-9A-Za-z_. -]{1,16})\|(\d{1,3}))?\]/g;

    /** QoL #98: a ?replay=KEY link's key, waiting for the player's yard (ioLinkStep). */
    private static _ioLinkRead: boolean = false;

    private static _ioLinkKey: string = null;

    private static _ioLinkSteps: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Token(key: string, meta: any = null): string {
        // (Inferno-only, QoL #98: with who attacked whom and the damage, for the chat's pill)
        if (GLOBAL.INFERNO_ONLY && meta) {
            let attacker: string = IoReplays.tokenName(meta.attacker);
            let defender: string = IoReplays.tokenName(meta.defender);
            if (attacker && defender) {
                return IoReplays.TOKEN_START + key + "|" + attacker + "|" + defender + "|" + Math.max(0, Math.min(100, Number(meta.damage) | 0)) + "]";
            }
        }
        return IoReplays.TOKEN_START + key + "]";
    }

    /** QoL #98: a name as a chat token holds it (letters, digits, _ . - and spaces, 16 at most); "" if none is left. */
    private static tokenName(name: any): string {
        return String(name == null ? "" : name).replace(/[^0-9A-Za-z_. -]/g, "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").substr(0, 16);
    }

    /**
     * QoL #98: a replay's pill in chat ([replay:KEY|Ann|Bob|87]: "Ann vs Bob · 87%"; the play mark is the pill's own),
     * its spaces non-breaking so it stays on one line. The plain token's: "Attack replay", as before.
     */
    public static PillLabel(attacker: any, defender: any, damage: any): string {
        if (!GLOBAL.INFERNO_ONLY || !attacker || !defender) {
            return KEYS.Get("io_tr_rp_pill_plain");
        }
        return KEYS.Get("io_rp2_pill", { "v1": String(attacker), "v2": String(defender), "v3": String(Number(damage) | 0) }).split(" ").join("\u00A0");
    }

    /** Somewhere a replay can't be opened from: in an attack, or with the map up. */
    private static busy(): boolean {
        if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            GLOBAL.Message(KEYS.Get("io_tr_rp_busy_attack"));
            return true;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message(KEYS.Get("io_tr_rp_busy_saving"));
            return true;
        }
        return false;
    }

    /** Inferno-only (QoL #95): the replay showing was opened from the Attack Log, whose Close goes back to it. */
    public static ioFromLogs: boolean = false;

    /** Watches a replay: its recording, then its yard. From the Attack Log, its Close goes back there (QoL #95). */
    public static Watch(key: string, fromLogs: boolean = false): void {
        if (IoReplays.busy()) {
            return;
        }
        IoReplays.ioFromLogs = fromLogs;
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/get", [["key", key]], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || (response.error !== 0 && response.error !== "0") || !response.replay) {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_tr_rp_load_failed"));
                return;
            }
            let replay: any = response.replay;
            if (replay.recording) {
                GLOBAL.Message(KEYS.Get("io_tr_rp_still_going"));
                return;
            }
            if (IoReplays.busy()) {
                return;
            }
            IoReplayPlayer.prepare(replay);
            let meta: any = replay.meta || {};
            let yardType: int = String(meta.yard_type) == "outpost" ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, Number(meta.baseid), GLOBAL.e_BASE_MODE.VIEW, false, yardType, 0, ["replay", String(meta.key || key)]);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_tr_rp_load_offline"));
        });
    }

    /**
     * Posts a replay's link in chat (Global or Alliance), after what the player has typed. Inferno-only (QoL #98):
     * with who attacked whom and the damage (meta: the replay's; without it, asked of the server first).
     */
    public static Share(key: string, mode: string, meta: any = null): void {
        if (GLOBAL.INFERNO_ONLY && !meta) {
            new URLLoaderApi().load(GLOBAL.serverUrl + "replays/get", [["key", key], ["meta", 1]], (response: any): void => {
                let got: any = response && (response.error === 0 || response.error === "0") && response.replay ? response.replay.meta : null;
                IoReplays.Share(key, mode, got || { "plain": true });
            }, (e: IOErrorEvent): void => {
                IoReplays.Share(key, mode, { "plain": true });
            });
            return;
        }
        let token: string = GLOBAL.INFERNO_ONLY && meta && !meta.plain ? IoReplays.Token(key, meta) : IoReplays.Token(key);
        let error: string = Chat._bymChat ? Chat._bymChat.ioShareLocation(mode, token) : KEYS.Get("io_tr_rp_no_chat");
        if (error) {
            GLOBAL.Message(error);
            return;
        }
        SOUNDS.Play("click1");
        GLOBAL.Message(KEYS.Get(mode == BYMChat.IO_ALLIANCE ? "io_tr_rp_shared_alliance" : "io_tr_rp_shared_global"));
    }

    /** QoL #98: the game's page that opens straight into this replay (?replay=KEY). */
    public static LinkOf(key: string): string {
        try {
            let w: any = window as any;
            return String(w.location.origin) + String(w.location.pathname) + "?replay=" + encodeURIComponent(key);
        } catch (e) {
        }
        return "?replay=" + key;
    }

    /** QoL #98: copies the replay's link (LinkOf), to paste anywhere. */
    public static CopyLink(key: string): void {
        let link: string = IoReplays.LinkOf(key);
        try {
            System.setClipboard(link);
            IoToast.Show(KEYS.Get("io_rp2_link_copied"), 4000);
        } catch (e) {
            GLOBAL.Message(KEYS.Get("io_rp2_link_manual", { "v1": link }));
        }
    }

    /**
     * QoL #98: every game step while no replay plays (IoReplayPlayer.step): a ?replay=KEY in the page's address is
     * read once (and taken off it, so a reload doesn't open it again), then watched once the player's own yard has
     * been up two seconds (its tutorial done).
     */
    public static ioLinkStep(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (!IoReplays._ioLinkRead) {
            IoReplays._ioLinkRead = true;
            IoReplays._ioLinkKey = IoReplays.linkInAddress();
        }
        if (!IoReplays._ioLinkKey) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE._loading || !TUTORIAL.hasFinished) {
            IoReplays._ioLinkSteps = 0;
            return;
        }
        if (++IoReplays._ioLinkSteps < 160) {
            return;
        }
        // (21 October: the yard's first save still going: waited for, not "Your yard is still saving", the link lost)
        if (BASE._saving || BASE._saveCounterA != BASE._saveCounterB) {
            return;
        }
        let key: string = IoReplays._ioLinkKey;
        IoReplays._ioLinkKey = null;
        IoReplays.Watch(key);
    }

    /** QoL #98: test hook: a link's key as if the page had been opened with ?replay=KEY. */
    public static ioOpenLink(key: string): void {
        IoReplays._ioLinkRead = true;
        IoReplays._ioLinkKey = /^[0-9a-zA-Z]{6,24}$/.test(String(key)) ? String(key) : null;
        IoReplays._ioLinkSteps = 0;
    }

    private static linkInAddress(): string {
        try {
            let w: any = window as any;
            let u: any = new w.URL(w.location.href);
            if (!u.searchParams.has("replay")) {
                return null;
            }
            let key: string = String(u.searchParams.get("replay") || "");
            u.searchParams.delete("replay");
            w.history.replaceState(w.history.state, "", u.pathname + (u.search || "") + (u.hash || ""));
            return /^[0-9a-zA-Z]{6,24}$/.test(key) ? key : null;
        } catch (e) {
        }
        return null;
    }

    /**
     * QoL #97: puts the player's ★ on a replay (on) or takes it off: a favourite is kept on the server however old
     * (10 at most, the server's FAV_MAX). done(fav) with what it is now.
     */
    public static Favourite(key: string, on: boolean, done: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/favourite", [["key", key], ["on", on ? 1 : 0]], (response: any): void => {
            if (!response || (response.error !== 0 && response.error !== "0")) {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_rp2_fav_failed"));
                return;
            }
            if (response.full) {
                GLOBAL.Message(KEYS.Get("io_rp2_fav_full", { "v1": String(Number(response.max) | 0) }));
                done(false);
                return;
            }
            if (response.fav) {
                IoToast.Show(KEYS.Get("io_rp2_fav_on", { "v1": String(Number(response.count) | 0), "v2": String(Number(response.max) | 0) }), 4000);
            }
            done(Boolean(response.fav));
        }, (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("io_rp2_fav_failed"));
        });
    }

    /** Downloads a replay as a file, to open again later (Open), even after it is gone from the server. */
    public static Download(key: string): void {
        let url: string = GLOBAL.serverUrl + "replays/file?key=" + encodeURIComponent(key);
        // (Inferno-only, QoL #456: asked about first: a replay gone from the server opened a bare "not found" page)
        if (GLOBAL.INFERNO_ONLY && typeof fetch == "function" && typeof document != "undefined") {
            fetch(url, { "method": "HEAD", "credentials": "include" }).then((r: any): void => {
                if (!r.ok) {
                    GLOBAL.Message(r.status == 404 ? KEYS.Get("io_replay_gone") : KEYS.Get("io_replay_dl_failed"));
                    return;
                }
                let a: any = document.createElement("a");
                a.href = url;
                a.download = "";
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                a.remove();
            }).catch((e: any): void => {
                GLOBAL.Message(KEYS.Get("io_replay_dl_failed"));
            });
            return;
        }
        navigateToURL(new URLRequest(url), "_blank");
    }

    /** Opens a downloaded replay file: it is sent to the server (kept for a day) and watched. */
    public static Open(): void {
        let file: FileReference = null;
        if (IoReplays.busy()) {
            return;
        }
        file = new FileReference();
        file.addEventListener(Event.SELECT, (e: Event): void => {
            file.load();
        });
        file.addEventListener(Event.COMPLETE, (e: Event): void => {
            if (!file.data || file.data.length == 0) {
                GLOBAL.Message(KEYS.Get("io_tr_rp_file_empty"));
                return;
            }
            if (file.data.length > 4000000) {
                GLOBAL.Message(KEYS.Get("io_tr_rp_file_big"));
                return;
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            new URLLoaderApi().load(GLOBAL.serverUrl + "replays/import", [["file", Base64.encodeByteArray(file.data)]], (response: any): void => {
                PLEASEWAIT.Hide();
                if (!response || (response.error !== 0 && response.error !== "0") || !response.key) {
                    GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_tr_rp_file_failed"));
                    return;
                }
                IoReplays.Watch(String(response.key));
            }, (e: IOErrorEvent): void => {
                PLEASEWAIT.Hide();
                GLOBAL.Message(KEYS.Get("io_tr_rp_file_offline"));
            });
        });
        try {
            file.browse([new FileFilter(KEYS.Get("io_tr_rp_file_kind"), "*.bymreplay")]);
        } catch (e) {
            GLOBAL.Message(KEYS.Get("io_tr_rp_file_none"));
        }
    }
}
