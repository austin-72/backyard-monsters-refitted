import { ASObject, int } from "as3";
import { DisplayObject } from "flash/display";
import { getTimer } from "flash/utils";
import { Rectangle } from "flash/geom";
import { GAME, GLOBAL, Quad, TweenLite } from "@game";

export class POPUPSETTINGS extends ASObject {
    private static readonly _BOTTOM_PADDING: int = 100;

    public $ctor(): void {
        super.$ctor();
    }

    public static AlignToCenter(param1: DisplayObject): void {
        param1.x = GLOBAL._SCREENCENTER.x;
        param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING;
        if (GAME._isSmallSize) {
            param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING / 2;
        }
        if (GLOBAL.INFERNO_ONLY) {
            POPUPSETTINGS.ioKeepOnScreen(param1);
        }
        if (GLOBAL.INFERNO_ONLY) {
            let i: int = POPUPSETTINGS._ioCentered.indexOf(param1);
            if (i < 0) {
                // (18 October: closed windows let go here too: only a resize did, so every window centred in a session
                // was kept, the Quest Book, the Attack Log, the Pit... one more each time it opened. One centred in
                // the last few seconds and not on the stage yet is kept: it is about to be.)
                POPUPSETTINGS.ioForgetClosed();
                POPUPSETTINGS._ioCentered.push(param1);
                POPUPSETTINGS._ioCenteredAt.push([param1.x, param1.y, getTimer()]);
            } else {
                POPUPSETTINGS._ioCenteredAt[i] = [param1.x, param1.y, getTimer()];
            }
        }
    }

    /**
     * Inferno-only (24 October): a tall window centred on a short screen (a phone held sideways: the kit window, its
     * pager on top) had its top, and its close button, above the screen. Moved down until its top shows, as far as its
     * bottom stays on the screen too.
     */
    private static ioKeepOnScreen(param1: DisplayObject): void {
        try {
            let s: Rectangle = GLOBAL._SCREEN;
            let lb: Rectangle = param1.getBounds(param1);
            if (!s || !lb || lb.height <= 0) {
                return;
            }
            let k: number = param1.scaleY || 1;
            let top: number = param1.y + lb.y * k;
            let bottom: number = top + lb.height * k;
            if (top < s.y + 4) {
                param1.y += Math.min(s.y + 4 - top, Math.max(0, s.y + s.height - 4 - bottom));
            }
        } catch (e) {
        }
    }

    /**
     * Inferno-only (14 October, QoL #445): what was centred is centred again when the stage changes size (a phone
     * turned, full screen, the window resized). Only windows with a Resize() of their own moved before; the Quest
     * Book, Pit, Arcade, Leaderboards, Attack Log, Gauntlet and the queued popups stayed where they were. Left
     * alone: one moved since it was centred, and one no longer on the stage (dropped from the list).
     */
    /** (18 October) The windows centred more than a few seconds ago and off the stage now (closed): let go. */
    private static ioForgetClosed(): void {
        let list: any[] = POPUPSETTINGS._ioCentered;
        let now: int = getTimer();
        for (let i: int = list.length - 1; i >= 0; i--) {
            let d: DisplayObject = list[i];
            let at: any[] = POPUPSETTINGS._ioCenteredAt[i];
            if (!d || (!d.stage && now - Number(at && at[2] || 0) > 5000)) {
                list.splice(i, 1);
                POPUPSETTINGS._ioCenteredAt.splice(i, 1);
            }
        }
    }

    public static ioRecenter(): void {
        let list: any[] = POPUPSETTINGS._ioCentered;
        for (let i: int = list.length - 1; i >= 0; i--) {
            let d: DisplayObject = list[i];
            let at: any[] = POPUPSETTINGS._ioCenteredAt[i];
            if (!d || !d.stage) {
                list.splice(i, 1);
                POPUPSETTINGS._ioCenteredAt.splice(i, 1);
                continue;
            }
            if (Math.abs(d.x - at[0]) > 0.5 || Math.abs(d.y - at[1]) > 0.5) {
                continue;
            }
            POPUPSETTINGS.AlignToCenter(d);
        }
    }

    private static _ioCentered: any[] = [];

    private static _ioCenteredAt: any[] = [];

    public static AlignToUpperLeft(param1: DisplayObject, param2: boolean = false): void {
        param1.x = GLOBAL._SCREENCENTER.x - param1.width * 0.5;
        param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING - param1.height * 0.5;
        if (param2) {
            param1.y = GLOBAL._SCREENCENTER.y - param1.height * 0.5;
        }
    }

    public static ScaleUp(param1: DisplayObject): void {
        // (Inferno-only, QoL #229: opened at full size with Reduce motion)
        if (GLOBAL.INFERNO_ONLY && GLOBAL.ioReduceMotion) {
            param1.scaleX = param1.scaleY = 1;
            return;
        }
        param1.scaleX = 0.9;
        param1.scaleY = 0.9;
        TweenLite.to(param1, 0.2, { "scaleX": 1, "scaleY": 1, "ease": Quad.easeOut });
    }

    public static ScaleUpFromTopLeft(param1: DisplayObject): void {
        if (GLOBAL.INFERNO_ONLY && GLOBAL.ioReduceMotion) {
            param1.scaleX = param1.scaleY = 1;
            return;
        }
        param1.scaleX = 0.9;
        param1.scaleY = 0.9;
        TweenLite.to(param1, 0.2, { "transformAroundCenter": { "scale": 1 }, "ease": Quad.easeOut });
    }
}
