import * as as3 from "as3";
import { ASObject } from "as3";
import { DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BFOUNDATION, BUILDINGOPTIONSPOPUP, GLOBAL, SOUNDS } from "@game";

export class BUILDINGOPTIONS extends ASObject {
    public static _do: BUILDINGOPTIONSPOPUP = null;

    public static _doBG: DisplayObject = null;

    public static _building: BFOUNDATION = null;

    public static _open: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: BFOUNDATION, param2: string = "info"): void {
        if (!BUILDINGOPTIONS._open) {
            GLOBAL.BlockerAdd();
            SOUNDS.Play("click1");
            BASE.BuildingDeselect();
            BUILDINGOPTIONS._building = param1;
            BUILDINGOPTIONS._open = true;
            BUILDINGOPTIONS._do = as3.as(GLOBAL._layerWindows.addChild(new BUILDINGOPTIONSPOPUP(param2)), BUILDINGOPTIONSPOPUP);
            BUILDINGOPTIONS._do.Center();
            BUILDINGOPTIONS._do.ScaleUp();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (BUILDINGOPTIONS._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            BUILDINGOPTIONS._open = false;
            GLOBAL._layerWindows.removeChild(BUILDINGOPTIONS._do);
            BUILDINGOPTIONS._do = null;
        }
    }
}
