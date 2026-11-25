import * as as3 from "as3";
import { ASObject, int } from "as3";
import { GLOBAL, IoTextPrompt, KEYS, LOGIN } from "@game";

/**
 * Inferno-only (15 October, QoL #197): the Shiny lock, set in the page's settings (Account). Spending more than its
 * amount in one go asks for the account's password first: the yard's spends (GLOBAL.ioConfirmShiny) and the Brimstone
 * Pit's bets (CASINO.ioAskBig). After the right password, spends go on without asking for 5 minutes.
 *
 * The amount is the account's (server: controllers/auth/shinyLockSettings.ts), sent with the login (`ioshinylock`,
 * LOGIN.handleUserLogin) and set again by the settings when it is changed; the server checks the password (player/
 * shinylock, rate-limited). It keeps someone else at the player's computer from spending; the server's own spending
 * checks are unchanged.
 */
export class IoShinyLock extends ASObject {
    /** Over this many Shiny in one go the password is asked (0: off). */
    public static above: int = 0;

    /** Until when (Date ms) spends go on without asking, after the right password. */
    private static _openUntil: number = 0;

    /** The question showing, while it is up. */
    private static _prompt: IoTextPrompt = null;

    /** How long the right password lets spends go on without asking. */
    private static readonly OPEN_MS: int = 300000;

    public $ctor(): void {
        super.$ctor();
    }

    /** The account's lock, from its login answer. */
    public static ioFrom(serverData: any): void {
        IoShinyLock.above = Math.max(0, Number(serverData ? serverData.ioshinylock : 0) || 0) | 0;
        IoShinyLock._openUntil = 0;
    }

    /** The settings changed it (0: off). */
    public static ioSet(above: number): void {
        IoShinyLock.above = Math.max(0, Number(above) || 0) | 0;
    }

    /**
     * True when the password is asked for this spend of `amount` Shiny: the caller stops there, and `go` runs once
     * the right password has been typed. False: nothing to ask (the lock off, the amount within it, or the password
     * typed in the last 5 minutes).
     */
    public static ask(amount: int, go: Function): boolean {
        if (!GLOBAL.INFERNO_ONLY || IoShinyLock.above <= 0 || amount <= IoShinyLock.above || new Date().getTime() < IoShinyLock._openUntil || !LOGIN.token) {
            return false;
        }
        if (IoShinyLock._prompt && IoShinyLock._prompt.parent) {
            return true;
        }
        IoShinyLock._prompt = IoTextPrompt.Show(KEYS.Get("io_acc_lock_title"), KEYS.Get("io_acc_lock_ask", { "v1": GLOBAL.FormatNumber(amount), "v2": GLOBAL.FormatNumber(IoShinyLock.above) }), "", 72, KEYS.Get("io_acc_lock_ok"), (typed: string): void => {
            IoShinyLock._prompt = null;
            IoShinyLock.check(typed, go);
        });
        IoShinyLock._prompt.name = "ioShinyLockPrompt";
        // (a password: shown as dots, and any character may be in it)
        let field: any = (IoShinyLock._prompt as any).m_field;
        if (field) {
            field.displayAsPassword = true;
            field.restrict = null;
            field.name = "ioShinyLockPassword";
        }
        return true;
    }

    /** The password checked by the server; right: `go`, and no asking for 5 minutes. */
    private static check(password: string, go: Function): void {
        let w: any = globalThis as any;
        if (!password) {
            return;
        }
        if (!w.fetch || !LOGIN.token) {
            GLOBAL.Message(KEYS.Get("io_acc_lock_failed"));
            return;
        }
        w.fetch(GLOBAL._apiURL + "player/shinylock", { "method": "POST", "headers": { "Authorization": "Bearer " + LOGIN.token, "Content-Type": "application/json" }, "body": JSON.stringify({ "password": password, "check": 1 }) }).then((r: any): any => r.json().catch((): any => ({}))).then((j: any): void => {
            if (j && (j.error === 0 || j.error === "0") && j.ok) {
                IoShinyLock._openUntil = new Date().getTime() + IoShinyLock.OPEN_MS;
                if (j.above != null) {
                    IoShinyLock.ioSet(Number(j.above));
                }
                go();
                return;
            }
            GLOBAL.Message(j && j.error && j.error !== 0 ? String(j.error) : KEYS.Get("io_acc_lock_failed"));
        }).catch((e: any): void => {
            GLOBAL.Message(KEYS.Get("io_acc_lock_failed"));
        });
    }
}
