import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { BasePlannerPopup_ExplorerCanvas, BasePlannerPopup_ExplorerFrame } from "@game";

export class BasePlannerPopup_ExplorerContainer extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ExplorerContainer" });
        as3.fields(this, { canvasmask: null, bg: null, mcScroller: null, canvas: null, mcframe: null });
    }

    public canvasmask: BasePlannerPopup_ExplorerCanvas;
    public bg: BasePlannerPopup_ExplorerCanvas;
    public mcScroller: MovieClip;
    public canvas: MovieClip;
    public mcframe: BasePlannerPopup_ExplorerFrame;

    public $ctor(): void {
        super.$ctor();
    }
}
