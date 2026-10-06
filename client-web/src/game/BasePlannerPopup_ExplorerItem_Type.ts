import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BasePlannerPopup_ExplorerItem_Type extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_ExplorerItem_Type" });
        as3.fields(this, { tLabel: null, mcFrame: null, mcLevel: null });
    }

    public tLabel: TextField;
    public mcFrame: MovieClip;
    public mcLevel: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
