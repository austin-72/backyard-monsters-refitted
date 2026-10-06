import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { BasePlannerPopup_ToolsButton_Move, BasePlannerPopup_ToolsButton_Store } from "@game";

export class BasePlannerPopup_ToolsLayout extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ToolsLayout" });
        as3.fields(this, { mcBG: null, mcExpand: null, mcStore: null, mcSelectMove: null });
    }

    public mcBG: MovieClip;
    public mcExpand: MovieClip;
    public mcStore: BasePlannerPopup_ToolsButton_Store;
    public mcSelectMove: BasePlannerPopup_ToolsButton_Move;

    public $ctor(): void {
        super.$ctor();
    }
}
