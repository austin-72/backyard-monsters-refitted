import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_attackend_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_attackend_CLIP" });
        as3.fields(this, { tTitle: null, mcFrame: null, tProcessing: null, bAction: null, tMessage: null });
    }

    public tTitle: TextField;
    public mcFrame: frame_CLIP;
    public tProcessing: TextField;
    public bAction: Button_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
