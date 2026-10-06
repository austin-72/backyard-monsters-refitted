import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, BUILDING13, GLOBAL, HATCHERYPOPUP, SOUNDS } from "@game";

export class HATCHERY extends ASObject {
    public static readonly TYPE: uint = 13;

    public static _mc: HATCHERYPOPUP = null;

    public static _open: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: BUILDING13): void {
        if (!HATCHERY._open) {
            HATCHERY._open = true;
            GLOBAL.BlockerAdd();
            HATCHERY._mc = as3.as(GLOBAL._layerWindows.addChild(new HATCHERYPOPUP()), HATCHERYPOPUP);
            HATCHERY._mc.Setup(param1);
            HATCHERY._mc.Center();
            HATCHERY._mc.ScaleUp();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (HATCHERY._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            BASE.BuildingDeselect();
            HATCHERY._open = false;
            GLOBAL._layerWindows.removeChild(HATCHERY._mc);
            HATCHERY._mc = null;
        }
    }

    public static Tick(): void {
        if (HATCHERY._mc) {
            HATCHERY._mc.Update();
        }
    }
}
