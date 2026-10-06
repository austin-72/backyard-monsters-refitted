import { ASObject, int } from "as3";
import { Event, IOErrorEvent } from "flash/events";
import { FileFilter, FileReference, URLRequest, navigateToURL } from "flash/net";
import { BASE, BYMChat, Base64, Chat, EnumYardType, GLOBAL, IoReplayPlayer, KEYS, PLEASEWAIT, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only: attack replays, the ways in (server: services/replays/replays.ts). From the attack logs (IoAttackLogs)
 * or a chat link ([replay:key], IoMapShare.RenderChat): Watch, Share in chat, Download; and opening a downloaded
 * file again (Open). Watching loads the replay's recording, then the yard in view mode as it was when the attack
 * began (its load with the key); once it is built, IoReplayPlayer plays the battle over it.
 */
export class IoReplays extends ASObject {
    public static readonly TOKEN_START: string = "[replay:";

    /** [replay:Ab12Cd34Ef56] */
    public static readonly TOKEN: RegExp = /\[replay:([0-9a-zA-Z]{6,24})\]/g;

    public $ctor(): void {
        super.$ctor();
    }

    public static Token(key: string): string {
        return IoReplays.TOKEN_START + key + "]";
    }

    /** Somewhere a replay can't be opened from: in an attack, or with the map up. */
    private static busy(): boolean {
        if (BASE.ioAttackRunning() || GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            GLOBAL.Message("Not during an attack. Watch it when you are back in your yard.");
            return true;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message("Your yard is still saving. Try again in a moment.");
            return true;
        }
        return false;
    }

    /** Watches a replay: its recording, then its yard. */
    public static Watch(key: string): void {
        if (IoReplays.busy()) {
            return;
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/get", [["key", key]], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || (response.error !== 0 && response.error !== "0") || !response.replay) {
                GLOBAL.Message(response && response.error ? String(response.error) : "The replay could not be loaded. Try again.");
                return;
            }
            let replay: any = response.replay;
            if (replay.recording) {
                GLOBAL.Message("That attack is still going on: its replay will be ready when it is over.");
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
            GLOBAL.Message("The replay could not be loaded. Check your connection and try again.");
        });
    }

    /** Posts a replay's link in chat (Global or Alliance), after what the player has typed. */
    public static Share(key: string, mode: string): void {
        let error: string = Chat._bymChat ? Chat._bymChat.ioShareLocation(mode, IoReplays.Token(key)) : "The chat is not connected right now.";
        if (error) {
            GLOBAL.Message(error);
            return;
        }
        SOUNDS.Play("click1");
        GLOBAL.Message("The replay is in " + (mode == BYMChat.IO_ALLIANCE ? "Alliance" : "Global") + " chat: anyone who clicks it can watch it.");
    }

    /** Downloads a replay as a file, to open again later (Open), even after it is gone from the server. */
    public static Download(key: string): void {
        navigateToURL(new URLRequest(GLOBAL.serverUrl + "replays/file?key=" + encodeURIComponent(key)), "_blank");
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
                GLOBAL.Message("That file is empty.");
                return;
            }
            if (file.data.length > 4000000) {
                GLOBAL.Message("That file is too big to be a replay.");
                return;
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            new URLLoaderApi().load(GLOBAL.serverUrl + "replays/import", [["file", Base64.encodeByteArray(file.data)]], (response: any): void => {
                PLEASEWAIT.Hide();
                if (!response || (response.error !== 0 && response.error !== "0") || !response.key) {
                    GLOBAL.Message(response && response.error ? String(response.error) : "That file could not be opened.");
                    return;
                }
                IoReplays.Watch(String(response.key));
            }, (e: IOErrorEvent): void => {
                PLEASEWAIT.Hide();
                GLOBAL.Message("That file could not be sent. Check your connection and try again.");
            });
        });
        try {
            file.browse([new FileFilter("Attack replays (*.bymreplay)", "*.bymreplay")]);
        } catch (e) {
            GLOBAL.Message("Files can't be opened here.");
        }
    }
}
