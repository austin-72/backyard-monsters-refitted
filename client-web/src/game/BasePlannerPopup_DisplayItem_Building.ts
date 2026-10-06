import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class BasePlannerPopup_DisplayItem_Building extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_DisplayItem_Building" });
        as3.fields(this, { mcBG: null, mcMask: null, mcInvalid: null, mcRange: null, mcFort: null, mcFrame: null, mcIcon: null, mcLevel: null });
    }

    public mcBG: MovieClip;
    public mcMask: MovieClip;
    public mcInvalid: MovieClip;
    public mcRange: MovieClip;
    public mcFort: MovieClip;
    public mcFrame: MovieClip;
    public mcIcon: MovieClip;
    public mcLevel: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
