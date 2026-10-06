import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class QUESTSPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "QUESTSPOPUP_CLIP" });
        as3.fields(this, { title_txt: null, mcFrame: null });
    }

    public title_txt: TextField;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
