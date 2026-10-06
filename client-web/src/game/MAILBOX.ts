import { ASObject, int } from "as3";
import { Loader } from "flash/display";
import { MouseEvent } from "flash/events";
import { GLOBAL, MailBox, SOUNDS } from "@game";

export class MAILBOX extends ASObject {
    public static _loader: Loader = null;

    public static _open: boolean = false;

    private static loaded: boolean = false;

    public static _handleTruceRequests: boolean = true;

    public static _threadidToOpen: int = -1;

    public static _mc: MailBox = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        MAILBOX._mc = null;
    }

    public static Show(): void {
        SOUNDS.Play("click1");
        MAILBOX._mc = new MailBox();
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(MAILBOX._mc);
        MAILBOX._mc.Setup();
    }

    public static Tick(): void {
        if (Boolean(MAILBOX._mc) && GLOBAL.Timestamp() % 15 == 0) {
            MAILBOX._mc.Tick();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        try {
            SOUNDS.Play("close");
            GLOBAL.BlockerRemove();
            GLOBAL._layerWindows.removeChild(MAILBOX._mc);
            MAILBOX._mc = null;
        } catch (e) {
        }
    }

    public static ShowWithThreadId(param1: int): void {
        MAILBOX._threadidToOpen = param1;
        MAILBOX.Show();
    }
}
