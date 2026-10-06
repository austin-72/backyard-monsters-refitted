import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BasePlannerPopup_ExplorerItem_Category extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ExplorerItem_Category" });
        as3.fields(this, { mcBG: null, tLabel: null, mcCarrot: null, mcFrame: null });
    }

    public mcBG: MovieClip;
    public tLabel: TextField;
    public mcCarrot: MovieClip;
    public mcFrame: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
