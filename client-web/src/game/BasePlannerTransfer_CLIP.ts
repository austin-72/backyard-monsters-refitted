import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class BasePlannerTransfer_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerTransfer_CLIP" });
        as3.fields(this, { tTitle: null, mcRowContainer: null, mcFrame: null });
    }

    public tTitle: TextField;
    public mcRowContainer: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
