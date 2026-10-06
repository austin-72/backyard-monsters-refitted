import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class BasePlannerPopup_ZoomLayout extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ZoomLayout" });
        as3.fields(this, { scrollbar: null, mcBG: null, btnUp: null, btnDown: null });
    }

    public scrollbar: MovieClip;
    public mcBG: MovieClip;
    public btnUp: MovieClip;
    public btnDown: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
