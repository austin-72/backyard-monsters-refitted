import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class BasePlannerPopup_ExplorerCanvas extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ExplorerCanvas" });
        as3.fields(this, { mcMask: null, mcCanvas: null });
    }

    public mcMask: MovieClip;
    public mcCanvas: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
