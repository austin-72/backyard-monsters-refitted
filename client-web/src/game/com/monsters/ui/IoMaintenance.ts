import * as as3 from "as3";
import { int } from "as3";
import { getTimer } from "flash/utils";
import { BASE, GLOBAL, IoToast, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (15 October, QoL #400, #210): maintenance planned from the admin panel, for players already in the game.
 * The server's flag io_maintenance (sent with every poll; never to admins) is either {at, message, now}: planned for
 * `at` (the server's clock, ms): a warning at 15, 5 and 1 minutes before; or {on, message}: maintenance has begun:
 * the yard is saved and the player is told once, with Reload (the login says when it's back).
 */
export class IoMaintenance {
    /** Planned for (the server's ms), or 0. */
    private static _at: number = 0;

    private static _message: string = "";

    /** The server's clock less this one's (ms). */
    private static _offset: number = 0;

    /** The warnings given, by minutes before, for the plan they were for. */
    private static _warned: any = {};

    private static _told: boolean = false;

    private static _lastTick: int = 0;

    public static readonly WARN_MINUTES: any[] = [15, 5, 1];

    /** The flag, after each answer from the server. */
    public static Update(json: string): void {
        let f: any = null;
        try {
            f = JSON.parse(String(json || ""));
        } catch (e) {
            f = null;
        }
        if (!f) {
            IoMaintenance._at = 0;
            return;
        }
        IoMaintenance._message = String(f.message || "");
        if (f.on) {
            IoMaintenance._at = 0;
            IoMaintenance.begun();
            return;
        }
        IoMaintenance._at = Number(f.at) || 0;
        if (f.now) {
            IoMaintenance._offset = Number(f.now) - new Date().getTime();
        }
    }

    /** Every frame (GLOBAL's tick): the warnings, once each, as the time comes. */
    public static Tick(): void {
        if (!IoMaintenance._at || getTimer() - IoMaintenance._lastTick < 1000) {
            return;
        }
        IoMaintenance._lastTick = getTimer();
        let left: number = IoMaintenance._at - (new Date().getTime() + IoMaintenance._offset);
        if (left <= 0) {
            return;
        }
        for (let m of as3.values(IoMaintenance.WARN_MINUTES)) {
            let key: string = IoMaintenance._at + ":" + m;
            if (left <= (m | 0) * 60000 && !IoMaintenance._warned[key]) {
                // (the smaller ones too: one warning only, the nearest)
                for (let n of as3.values(IoMaintenance.WARN_MINUTES)) {
                    if ((n | 0) >= (m | 0)) {
                        IoMaintenance._warned[IoMaintenance._at + ":" + n] = true;
                    }
                }
                let mins: int = Math.max(1, Math.ceil(left / 60000)) | 0;
                SOUNDS.Play("clock1", 0.4);
                IoToast.Show(KEYS.Get(mins == 1 ? "io_maint_soon_one" : "io_maint_soon", { "v1": mins, "v2": IoMaintenance.escape(IoMaintenance._message) }), 20000);
            }
        }
    }

    /** Maintenance has begun: the yard saved, and the player told once. */
    private static begun(): void {
        if (IoMaintenance._told) {
            return;
        }
        IoMaintenance._told = true;
        try {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) {
                BASE.Save();
            }
        } catch (e) {
        }
        SOUNDS.ioStopMusic();
        // (QoL #463: shown at once, never waiting in the popup queue)
        GLOBAL._ioMessageNow = true;
        try {
            GLOBAL.Message(KEYS.Get("io_maint_now", { "v1": IoMaintenance.escape(IoMaintenance._message) }), KEYS.Get("io_maint_reload"), (): void => {
                try {
                    window.location.reload();
                } catch (e) {
                }
            });
        } finally {
            GLOBAL._ioMessageNow = false;
        }
    }

    /** For tests: the plan now (null for none). */
    public static get plan(): any {
        return IoMaintenance._at ? { at: IoMaintenance._at, message: IoMaintenance._message, offset: IoMaintenance._offset } : null;
    }

    private static escape(text: string): string {
        return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
