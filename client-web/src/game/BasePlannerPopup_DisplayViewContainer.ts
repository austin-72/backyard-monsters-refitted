import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { BasePlanner_FrameMask } from "@game";

export class BasePlannerPopup_DisplayViewContainer extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_DisplayViewContainer" });
        as3.fields(this, { canvasmask: null, mcframemask: null, canvas: null, mcframe: null });
    }

    public canvasmask: MovieClip;
    public mcframemask: BasePlanner_FrameMask;
    public canvas: MovieClip;
    public mcframe: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
