import * as as3 from "as3";
import { ASObject } from "as3";
import { MouseEvent } from "flash/events";
import { ALLIANCEPOPUP, ALLIANCES, GLOBAL, SOUNDS } from "@game";

export class ALLIANCEWINDOW extends ASObject {
    public static _mc: ALLIANCEPOPUP = null;

    public static _open: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: MouseEvent = null): void {
        if (!ALLIANCEWINDOW._open) {
            SOUNDS.Play("click1");
            ALLIANCEWINDOW._open = true;
            ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels, true);
            ALLIANCES.LoadMessages(ALLIANCEWINDOW.RefreshTabLabels, true);
            ALLIANCES.InvalidateMembers();
            ALLIANCES.InvalidateSuggested();
            GLOBAL.BlockerAdd();
            ALLIANCEWINDOW._mc = as3.as(GLOBAL._layerWindows.addChild(new ALLIANCEPOPUP()), ALLIANCEPOPUP);
            ALLIANCEWINDOW._mc.Center();
            ALLIANCEWINDOW._mc.ScaleUp();
        }
    }

    /**
     * Redraws the tab strip once a store lands. Doubles as the load callback:
     * both stores are fetched before the popup exists, so their counts arrive
     * after the tabs have been drawn.
     *
     * @param {Object} param1 - The loaded payload, unused; the labels read the store.
     */
    public static RefreshTabLabels(param1: any = null): void {
        if (ALLIANCEWINDOW._open && ALLIANCEWINDOW._mc != null) {
            ALLIANCEWINDOW._mc.RefreshTabLabels();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (ALLIANCEWINDOW._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            ALLIANCEWINDOW._open = false;
            GLOBAL._layerWindows.removeChild(ALLIANCEWINDOW._mc);
            ALLIANCEWINDOW._mc = null;
        }
    }
}
