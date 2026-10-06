import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, emptyMc, frame3_CLIP } from "@game";

export class popup_mr2tutorial extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_mr2tutorial" });
        as3.fields(this, { tBody: null, mcFrame: null, bAction: null, mcImageContainer: null });
    }

    public tBody: TextField;
    public mcFrame: frame3_CLIP;
    public bAction: Button_CLIP;
    public mcImageContainer: emptyMc;

    public $ctor(): void {
        super.$ctor();
    }
}
