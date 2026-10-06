import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BasePlannerPopup_ToolTip extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ToolTip" });
        as3.fields(this, { mcBG: null, tLabel: null });
    }

    public mcBG: MovieClip;
    public tLabel: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
