import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { StageDisplayState } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BasePlanner, GLOBAL, PLANNERPOPUP, SOUNDS, STORE } from "@game";

export class PLANNER extends ASObject {
    public static readonly TYPE: uint = 10;

    public static _mc: PLANNERPOPUP = null;

    public static _open: boolean = false;

    public static _selected: boolean = false;

    public static _useOldPlanner: boolean = true;

    public static basePlanner: BasePlanner = null;

    public $ctor(): void {
        super.$ctor();
        PLANNER._open = false;
    }

    public static Show(param1: MouseEvent = null): void {
        if (GLOBAL._selectedBuilding) {
            GLOBAL._selectedBuilding.StopMoveB();
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        BASE.BuildingDeselect();
        PLANNER._selected = false;
        if (GLOBAL._flags.yp_version != null) {
            switch (GLOBAL._flags.yp_version) {
                case 0:
                    GLOBAL.Message(">Yard PLANNER has been disabled for this ENVIRONMENT");
                    return;
                case 1:
                    PLANNER._useOldPlanner = true;
                    break;
                case 2:
                    PLANNER._useOldPlanner = false;
            }
        }
        if (!PLANNER._open) {
            PLANNER._open = true;
            SOUNDS.Play("click1");
            BASE.BuildingDeselect();
            GLOBAL.BlockerAdd();
            if (PLANNER._useOldPlanner) {
                if (GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN) {
                    GLOBAL._ROOT.stage.displayState = StageDisplayState.NORMAL;
                }
                PLANNER._mc = as3.as(GLOBAL._layerWindows.addChild(new PLANNERPOPUP()), PLANNERPOPUP);
            } else if (PLANNER.basePlanner) {
                PLANNER.basePlanner.setup();
            } else {
                PLANNER.basePlanner = new BasePlanner();
                PLANNER.basePlanner.setup();
            }
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        GLOBAL.BlockerRemove();
        if (Boolean(GLOBAL._selectedBuilding) && GLOBAL._selectedBuilding._class != "mushroom") {
            GLOBAL._selectedBuilding.StopMoveB();
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        BASE.BuildingDeselect();
        if (PLANNER._open) {
            SOUNDS.Play("close");
            PLANNER._open = false;
            if (PLANNER._useOldPlanner) {
                PLANNER._mc.Remove();
                GLOBAL._layerWindows.removeChild(PLANNER._mc);
                PLANNER._mc = null;
            } else {
                PLANNER.basePlanner.hide();
            }
        }
    }

    public static isOpen(): boolean {
        return PLANNER._open;
    }

    /**
     * Inferno-only: the Yard Planner window covers the yard, so MAP skips drawing the yard while it is
     * open. The yard's renderer redraws all of it every frame, and that forced the whole planner, with
     * every building in it, to be drawn again each frame too: slow on phones. It draws everything again
     * on the first frame after the planner closes.
     */
    public static ioCoversYard(): boolean {
        return GLOBAL.INFERNO_ONLY && PLANNER._open && !PLANNER._useOldPlanner;
    }

    public static Update(): void {
        if (PLANNER._open) {
            if (PLANNER._useOldPlanner) {
                STORE.Hide();
                PLANNER.Hide();
                PLANNER.Show();
            }
        }
    }
}
