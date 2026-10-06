import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame2_CLIP } from "@game";

export class popup_report extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_report" });
        as3.fields(this, { sendBtn: null, tDesc: null, tTitle: null, mcFrame: null });
    }

    public sendBtn: Button_CLIP;
    public tDesc: TextField;
    public tTitle: TextField;
    public mcFrame: frame2_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
