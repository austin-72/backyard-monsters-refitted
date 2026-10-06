import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame3_CLIP } from "@game";

export class popup_infernoentice_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_infernoentice_CLIP" });
        as3.fields(this, { tDesc: null, tButton: null, bEnter: null, mcFrame: null });
    }

    public tDesc: TextField;
    public tButton: TextField;
    public bEnter: Button_CLIP;
    public mcFrame: frame3_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
