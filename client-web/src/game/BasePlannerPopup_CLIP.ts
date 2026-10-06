import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { BasePlannerPopup_ExplorerCanvas, BasePlannerPopup_ZoomLayout } from "@game";

export class BasePlannerPopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_CLIP" });
        as3.fields(this, { guideDisplayView: null, guideZoom: null, guideBG: null, guideSidebar: null });
    }

    public guideDisplayView: MovieClip;
    public guideZoom: BasePlannerPopup_ZoomLayout;
    public guideBG: MovieClip;
    public guideSidebar: BasePlannerPopup_ExplorerCanvas;

    public $ctor(): void {
        super.$ctor();
    }
}
