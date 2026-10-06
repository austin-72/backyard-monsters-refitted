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
            HATCHERYCC._mc.Update();
        }
    }
}
