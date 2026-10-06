import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame3_CLIP } from "@game";

export class popup_siegebrag extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_siegebrag" });
        as3.fields(this, { tText: null, mcImage: null, mcFrame: null, bSpeedup: null, bAction: null });
    }

    public tText: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame3_CLIP;
    public bSpeedup: Button_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
