import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, BUILDINGSPOPUP, GLOBAL, MapRoomManager, SOUNDS } from "@game";

export class BUILDINGS extends ASObject {
    public static _mc: BUILDINGSPOPUP = null;

    public static _open: boolean = false;

    public static _menuA: int = 1;

    public static _menuB: int = 0;

    public static _page: int = 0;

    public static _buildingID: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Reset(param1: boolean = false): void {
        if (param1) {
            BUILDINGS._menuA = 1;
            BUILDINGS._menuB = 0;
            BUILDINGS._page = 0;
        }
        BUILDINGS._buildingID = 0;
        BUILDINGS.Hide();
    }

    public static Show(param1: MouseEvent = null): void {
        if (MapRoomManager.instance.isInMapRoom3 && !BASE.isMainYardOrInfernoMainYard) {
            return;
        }
        GLOBAL.BlockerAdd();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (GLOBAL._newBuilding) {
                GLOBAL._newBuilding.Cancel();
            }
            if (!BUILDINGS._open) {
                SOUNDS.Play("click1");
                BASE.BuildingDeselect();
                BUILDINGS._open = true;
                BUILDINGS._mc = as3.as(GLOBAL._layerWindows.addChild(new BUILDINGSPOPUP()), BUILDINGSPOPUP);
                BUILDINGS._mc.Center();
                BUILDINGS._mc.ScaleUp();
            }
            if (BUILDINGS._buildingID > 0) {
                BUILDINGS._mc.ShowInfo(BUILDINGS._buildingID);
            }
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        GLOBAL.BlockerRemove();
        if (BUILDINGS._open) {
            SOUNDS.Play("close");
            BUILDINGS._open = false;
            BUILDINGS._mc.HideInfo();
            BUILDINGS._mc._buildingInfoMC = null;
            GLOBAL._layerWindows.removeChild(BUILDINGS._mc);
            BUILDINGS._mc = null;
        }
    }
}
