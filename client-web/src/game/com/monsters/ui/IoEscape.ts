import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, DisplayObjectContainer } from "flash/display";
import { KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { TextField, TextFieldType } from "flash/text";
import { ATTACK, ArcadeWindow, BASE, BFOUNDATION, BRESOURCE, Chat, GLOBAL, IoHotkeys, IoReplayPlayer, IoTakeoverBar, IoTd, KEYS, LOGIN, MESSAGE, WMATTACK, frame } from "@game";

/**
 * Inferno-only (14 October, QoL #36 and #216): Esc in the yard, and the browser's Back button (and R in an attack:
 * the last fling's load again, QoL #79).
 *
 * Esc cancels placing or moving a building; otherwise it closes the window on top (its close button, as a click
 * on it would: a window's own close, the stock frames' X, or a button named ...Close). Esc in a text field is
 * left to the field. Back does the same, and when nothing is open asks "Leave the Inferno?" (one press used to
 * close the page and end the session).
 */
export class IoEscape {
    private static _on: boolean = false;

    private static _asking: boolean = false;

    public static Setup(stage: any): void {
        if (IoEscape._on || !GLOBAL.INFERNO_ONLY || !stage) {
            return;
        }
        IoEscape._on = true;
        stage.addEventListener(KeyboardEvent.KEY_DOWN, (e: KeyboardEvent): void => {
            if (e.keyCode == 82 && !e.ctrlKey && !e.altKey) {
                // (R in an attack: the Flinger loaded as for the last fling; QoL #79)
                let typing: any = stage.focus;
                if (!(typing instanceof TextField && (typing as TextField).type == TextFieldType.INPUT)) {
                    ATTACK.ioReloadLast();
                }
                return;
            }
            if ((e.keyCode == 219 || e.keyCode == 221) && !e.ctrlKey && !e.altKey && ATTACK.ioDropAdjustable()) {
                // ([ and ] in a test mode attack: the Flinger's drop circle smaller or bigger)
                let typingB: any = stage.focus;
                if (!(typingB instanceof TextField && (typingB as TextField).type == TextFieldType.INPUT)) {
                    ATTACK.ioDropStep(e.keyCode == 219 ? -1 : 1);
                }
                return;
            }
            if (e.keyCode == 67 && !e.ctrlKey && !e.altKey) {
                // (C in the yard: every harvester banked; QoL #21)
                let typingC: any = stage.focus;
                // (not while a game or the Pit is open: Magma Stack's C is its own)
                if (!(typingC instanceof TextField && (typingC as TextField).type == TextFieldType.INPUT) && !WMATTACK.ioQuiet()) {
                    BRESOURCE.ioBankAll(0);
                }
                return;
            }
            if (e.keyCode == 13 && LOGIN._playerID > 0) {
                // (Enter closes a message on top that only says something; QoL #37. Not while typing, nor on the
                // login form, which has its own Enter)
                let typingE: any = stage.focus;
                if (!(typingE instanceof TextField && (typingE as TextField).type == TextFieldType.INPUT)) {
                    IoEscape.confirmTop();
                }
                return;
            }
            if (e.keyCode != 27) {
                return;
            }
            // (QoL #375: on a result or a game's page, Esc goes back one step)
            if (ArcadeWindow.isOpen && ArcadeWindow.ioEscBack()) {
                return;
            }
            // (an arcade game in play has its own keys)
            if (ArcadeWindow.isOpen && (ArcadeWindow as any)._open && (ArcadeWindow as any)._open._game) {
                return;
            }
            let focus: any = stage.focus;
            if (focus instanceof TextField && (focus as TextField).type == TextFieldType.INPUT) {
                return;
            }
            if (!IoEscape.close()) {
                // (QoL #80: nothing to close in an attack: the Flinger emptied)
                IoHotkeys.escNothing();
            }
        });
        IoEscape.watchBack();
        IoEscape.keepAwake();
        // (QoL #82: the 90% bar in map attacks)
        IoTakeoverBar.Setup(stage);
    }

    /** Cancels placing or moving, or closes the window on top. False when there was nothing to close. */
    public static close(): boolean {
        if (GLOBAL._newBuilding) {
            try {
                GLOBAL._newBuilding.Cancel();
            } catch (e) {
            }
            return true;
        }
        let moving: BFOUNDATION = GLOBAL._selectedBuilding;
        if (moving && moving._moving) {
            moving.ioCancelMove();
            return true;
        }
        for (let layer of [GLOBAL._layerTop, GLOBAL._layerWindows]) {
            let hit: DisplayObject = IoEscape.closerIn(as3.as(layer, DisplayObjectContainer));
            if (hit) {
                if (hit instanceof frame) {
                    (hit as any).BtnClose();
                } else {
                    hit.dispatchEvent(new MouseEvent(MouseEvent.CLICK, true, false));
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Enter: the message on top of everything is closed, when closing is all its button does (OK, or no button).
     * A message whose button does something (spends Shiny, recycles...) is left for a click.
     */
    public static confirmTop(): boolean {
        let layer: DisplayObjectContainer = GLOBAL._layerTop;
        if (!layer || layer.numChildren == 0) {
            return false;
        }
        let top: any = layer.getChildAt(layer.numChildren - 1);
        if (!(top instanceof MESSAGE)) {
            return false;
        }
        let m: MESSAGE = as3.cast(top, MESSAGE);
        if ((m as any)._action || (m.bAction2 && m.bAction2.visible && (m as any)._action2)) {
            return false;
        }
        m.Hide();
        return true;
    }

    // ---- QoL #217: the screen kept on while something plays (an attack, a replay, Hellgate, the Arcade, the Pit)
    private static _wake: any = null;
    private static _wakeAsking: boolean = false;

    private static _title: string = null;

    /**
     * QoL #194: the browser tab's title says what waits: "(2) Inferno Map Room 2" for mentions and mail not seen
     * yet, "⚔ Under attack · ..." while the yard is.
     */
    private static tabTitle(): void {
        if (typeof document === "undefined") {
            return;
        }
        if (IoEscape._title == null) {
            IoEscape._title = document.title;
        }
        let n: int = (GLOBAL._unreadMessages | 0) + (Chat._bymChat ? Chat._bymChat.ioMentionsWaiting() : 0);
        let title: string = (BASE.ioAttackRunning() ? "⚔ " + KEYS.Get("io_tab_attacked") + " · " : "") + (n > 0 ? "(" + n + ") " : "") + IoEscape._title;
        if (document.title != title) {
            document.title = title;
        }
    }

    private static keepAwake(): void {
        let nav: any = typeof navigator !== "undefined" ? navigator : null;
        let t: Timer = new Timer(5000);
        t.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            IoEscape.tabTitle();
            if (!nav || !nav.wakeLock) {
                return;
            }
            let mode: string = String(GLOBAL.mode);
            let busy: boolean = mode == GLOBAL.e_BASE_MODE.ATTACK || mode == GLOBAL.e_BASE_MODE.WMATTACK || IoTd.on || IoReplayPlayer.playing || WMATTACK.ioQuiet();
            let hidden: boolean = typeof document !== "undefined" && document.hidden;
            if (busy && !hidden && !IoEscape._wake && !IoEscape._wakeAsking) {
                IoEscape._wakeAsking = true;
                nav.wakeLock.request("screen").then((lock: any): void => {
                    IoEscape._wakeAsking = false;
                    IoEscape._wake = lock;
                    lock.addEventListener("release", (): void => {
                        if (IoEscape._wake == lock) {
                            IoEscape._wake = null;
                        }
                    });
                }, (): void => {
                    IoEscape._wakeAsking = false;
                });
            } else if (!busy && IoEscape._wake) {
                let lock: any = IoEscape._wake;
                IoEscape._wake = null;
                try {
                    lock.release();
                } catch (err) {
                }
            }
        });
        t.start();
    }

    /** The close of the top-most window in `c` (children on top first), or null. */
    private static closerIn(c: DisplayObjectContainer): DisplayObject {
        if (!c || !c.visible) {
            return null;
        }
        for (let i: int = (c.numChildren - 1) | 0; i >= 0; i--) {
            let d: DisplayObject = c.getChildAt(i);
            if (!d) {
                continue;
            }
            // (a stock frame hides itself and draws its rim and X in a holder beside it: that holder is what shows)
            if (d instanceof frame) {
                let rim: any = (d as any)._frameMC;
                if ((d as any)._buttonClose && rim && rim.parent && rim.visible) {
                    return d;
                }
                continue;
            }
            if (!d.visible) {
                continue;
            }
            if (d.name && /(^|[a-z_])(close|Close|CLOSE)$/.test(d.name) && d.hasEventListener(MouseEvent.CLICK)) {
                return d;
            }
            if (d instanceof DisplayObjectContainer) {
                let inner: DisplayObject = IoEscape.closerIn(d as DisplayObjectContainer);
                if (inner) {
                    return inner;
                }
            }
        }
        return null;
    }

    // ---- Back
    private static watchBack(): void {
        if (typeof window == "undefined" || !window.history || !window.history.pushState) {
            return;
        }
        try {
            window.history.pushState({ "ioGuard": 1 }, "");
        } catch (e) {
            return;
        }
        window.addEventListener("popstate", (e: PopStateEvent): void => {
            if (IoEscape._asking) {
                return;
            }
            // (the guard back in place: Back closes what's open, or asks)
            window.history.pushState({ "ioGuard": 1 }, "");
            if (IoEscape.close()) {
                return;
            }
            IoEscape._asking = true;
            GLOBAL.Message(KEYS.Get("io_leave_ask"), KEYS.Get("io_leave_yes"), (): void => {
                IoEscape._asking = false;
                window.history.go(-2);
            }, null, KEYS.Get("io_leave_no"), (): void => {
                IoEscape._asking = false;
            });
        });
    }
}
