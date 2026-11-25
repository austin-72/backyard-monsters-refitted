import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, GLOBAL, HATCHERYCCPOPUP, SOUNDS } from "@game";

export class HATCHERYCC extends ASObject {
    public static readonly TYPE: int = 16;

    public static readonly DEFAULT_QUEUE_LIMIT: uint = 20;

    public static queueLimit: uint = HATCHERYCC.DEFAULT_QUEUE_LIMIT;

    public static doesShowInfernoCreeps: boolean = false;

    public static _mc: HATCHERYCCPOPUP = null;

    public static _open: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(): void {
        if (!HATCHERYCC._open) {
            HATCHERYCC._open = true;
            GLOBAL.BlockerAdd();
            HATCHERYCC._mc = as3.as(GLOBAL._layerWindows.addChild(new HATCHERYCCPOPUP()), HATCHERYCCPOPUP);
            HATCHERYCC._mc.Setup();
            HATCHERYCC._mc.Center();
            HATCHERYCC._mc.ScaleUp();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (HATCHERYCC._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            BASE.BuildingDeselect();
            HATCHERYCC._open = false;
            GLOBAL._layerWindows.removeChild(HATCHERYCC._mc);
            HATCHERYCC._mc = null;
        }
    }

    public static Tick(): void {
        if (HATCHERYCC._mc) {
            // (25 November, bug report #99: the window stayed open into a yard with no ICS, an outpost taken over,
            // and its queue was read from a building that isn't there: it is closed instead)
            if (!GLOBAL._bHatcheryCC) {
                HATCHERYCC.ioDrop();
                return;
            }
            HATCHERYCC._mc.Update();
        }
    }

    /** The window let go without a sound or a deselect (its yard is gone): taken off its layer if still on it. */
    public static ioDrop(): void {
        let mc: HATCHERYCCPOPUP = HATCHERYCC._mc;
        HATCHERYCC._mc = null;
        // (its blocker only if it is still on screen: a yard change rebuilds the layers and their blockers)
        if (HATCHERYCC._open && mc && mc.stage) {
            GLOBAL.BlockerRemove();
        }
        HATCHERYCC._open = false;
        if (mc && mc.parent) {
            mc.parent.removeChild(mc);
        }
    }
}
