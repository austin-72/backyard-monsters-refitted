import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, DisplayObjectContainer, Sprite, Stage } from "flash/display";
import { TextField, TextFieldType } from "flash/text";
import { setInterval } from "flash/utils";
import { BYMChat, Chat, GLOBAL, IoAttackLogs, IoChangelog, IoLeaderboards, IoQuestBook, MESSAGE, popup_bg } from "@game";

/**
 * Inferno-only (7 October, the user's): the chat stays usable while a minigame's window is up (the Devil's
 * Arcade, the Brimstone Pit). Those windows sit on the top layer behind a blocker that covers the whole screen,
 * the chat included; lift() moves the chat onto the top layer above them, drop() puts it back where it was.
 * typing() says whether a text field has the keyboard (a game's keys are left alone then).
 *
 * (QoL #469) The same for the reading windows: the Quest Book, the Leaderboards, the Attack Log and the Change Log (on
 * the top layer, as the minigames). ioWatch() starts a check four times a second: while one of them is open the chat
 * is lifted out from under the backdrop that covers the screen, and back where it was when the last one closes. A
 * minigame's lift() takes over from it. The chat goes just above the window's backdrop, under the window itself, so
 * it never hides the window's own buttons. (Not the Alliance window: it leaves the chat usable outside its frame, and the
 * chat over it hid its Edit and Leave buttons.)
 */
export class IoChatLift extends ASObject {
    private static _index: int = -1;

    private static _lifted: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    /** A minigame's window has opened: the chat goes above it. */
    public static lift(): void {
        let c: BYMChat = Chat._bymChat;
        if (!c || !GLOBAL._layerTop) {
            return;
        }
        if (IoChatLift._readLifted) {
            // (QoL #469: lifted over a reading window already: where it was before that is where it goes back to)
            IoChatLift._index = IoChatLift._readIndex;
            IoChatLift._readLifted = false;
            IoChatLift._readSig = "";
        } else if (!IoChatLift._lifted || c.parent != GLOBAL._layerTop) {
            IoChatLift._index = c.parent ? c.parent.getChildIndex(c) : -1;
        }
        GLOBAL._layerTop.addChild(c);
        IoChatLift._lifted = true;
    }

    /** The window has closed: the chat goes back into the interface's layer, where it was. */
    public static drop(): void {
        if (!IoChatLift._lifted) {
            return;
        }
        IoChatLift._lifted = false;
        let c: BYMChat = Chat._bymChat;
        if (!c || !GLOBAL._layerUI || c.parent == GLOBAL._layerUI) {
            return;
        }
        // (only if it is still where lift put it: a yard loaded since has its own layers and its own chat place)
        if (c.parent != GLOBAL._layerTop) {
            return;
        }
        if (IoChatLift._index >= 0 && IoChatLift._index <= GLOBAL._layerUI.numChildren) {
            GLOBAL._layerUI.addChildAt(c, IoChatLift._index);
        } else {
            GLOBAL._layerUI.addChild(c);
        }
    }

    // ---- (Inferno-only, QoL #469) the reading windows
    private static _watching: boolean = false;

    /** Lifted over a reading window (not by a minigame's lift()). */
    private static _readLifted: boolean = false;

    /** Where the chat was in the interface's layer before that. */
    private static _readIndex: int = -1;

    /** Which reading windows were open when it was lifted ("q", "l", "a", "c", "w"). */
    private static _readSig: string = "";

    /** Starts the check (once; the chat's first showing: Chat.initChat). */
    public static ioWatch(): void {
        if (!GLOBAL.INFERNO_ONLY || IoChatLift._watching) {
            return;
        }
        IoChatLift._watching = true;
        setInterval(IoChatLift.ioTick, 250);
    }

    /** The chat is over a reading window now (tests). */
    public static get ioReadLifted(): boolean {
        return IoChatLift._readLifted;
    }

    /** The reading windows open: q Quest Book, l Leaderboards, a Attack Log, c Change Log. */
    private static ioReading(): string {
        let s: string = "";
        if (IoQuestBook.isOpen) {
            s += "q";
        }
        if (IoLeaderboards.isOpen) {
            s += "l";
        }
        if (IoAttackLogs.isOpen) {
            s += "a";
        }
        if (IoChangelog.isOpen) {
            s += "c";
        }
        // (not the Alliance window: it doesn't cover the chat outside its frame, and the chat over it hid its Edit and
        // Leave buttons and the Members rows' corner; 15 October)
        return s;
    }

    public static ioTick(): void {
        let c: BYMChat = Chat._bymChat;
        if (!c || IoChatLift._lifted || !GLOBAL._layerUI) {
            // (a minigame's lift has it)
            return;
        }
        let sig: string = IoChatLift.ioReading();
        if (sig == "") {
            if (IoChatLift._readLifted) {
                IoChatLift.ioDrop();
            }
            IoChatLift._readSig = "";
            return;
        }
        // (the Quest Book, Leaderboards, Attack Log and Change Log are on the top layer)
        let layer: Sprite = GLOBAL._layerTop;
        if (!layer) {
            return;
        }
        let parent: DisplayObjectContainer = c.parent;
        if (sig == IoChatLift._readSig && parent == layer && layer.getChildIndex(c) == IoChatLift.ioSpot(layer, c)) {
            return;
        }
        // (from its own place, or from where this put it; not while a yard is being made: it has no place yet)
        if (parent == GLOBAL._layerUI) {
            IoChatLift._readIndex = parent.getChildIndex(c);
        } else if (!(IoChatLift._readLifted && (parent == GLOBAL._layerTop || parent == GLOBAL._layerWindows))) {
            return;
        }
        parent.removeChild(c);
        let at: int = IoChatLift.ioSpot(layer, null);
        layer.addChildAt(c, Math.max(0, Math.min(at, layer.numChildren)) | 0);
        IoChatLift._readLifted = true;
        IoChatLift._readSig = sig;
    }

    /**
     * Where the chat goes on the top layer (`c`, the chat, not counted): just above the first window's backdrop, so
     * it is usable outside the window's frame and never covers the window itself (15 October: over the Quest Book it
     * hid the footer's links); with no such backdrop, above everything but a confirmation (and its backdrop).
     */
    private static ioSpot(layer: Sprite, c: DisplayObject): int {
        let kids: DisplayObject[] = [];
        for (let i: int = 0; i < layer.numChildren; i++) {
            let k: DisplayObject = layer.getChildAt(i);
            if (k != c) {
                kids.push(k);
            }
        }
        for (let i: int = 0; i < kids.length; i++) {
            if (kids[i] instanceof popup_bg && i + 1 < kids.length && !(kids[i + 1] instanceof MESSAGE)) {
                return (i + 1) | 0;
            }
        }
        for (let i: int = 0; i < kids.length; i++) {
            if (kids[i] instanceof MESSAGE) {
                return (i > 0 && kids[i - 1] instanceof popup_bg ? i - 1 : i) | 0;
            }
        }
        return kids.length | 0;
    }

    /** The last reading window has closed: the chat goes back where it was. */
    private static ioDrop(): void {
        IoChatLift._readLifted = false;
        let c: BYMChat = Chat._bymChat;
        if (!c || !GLOBAL._layerUI || (c.parent != GLOBAL._layerTop && c.parent != GLOBAL._layerWindows)) {
            return;
        }
        if (IoChatLift._readIndex >= 0 && IoChatLift._readIndex <= GLOBAL._layerUI.numChildren) {
            GLOBAL._layerUI.addChildAt(c, IoChatLift._readIndex);
        } else {
            GLOBAL._layerUI.addChild(c);
        }
    }

    /** A text field (the chat's, a name box) has the keyboard. */
    public static typing(stage: Stage): boolean {
        let f: DisplayObject = stage ? as3.as(stage.focus, DisplayObject) : null;
        return f instanceof TextField && as3.cast(f, TextField).type == TextFieldType.INPUT;
    }
}
