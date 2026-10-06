import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP, popup_bg } from "@game";

export class popup_error extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_error" });
        as3.fields(this, { blocker: null, tA: null, tB: null, mcFrame: null, bAction: null });
    }

    public blocker: popup_bg;
    public tA: TextField;
    public tB: TextField;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
