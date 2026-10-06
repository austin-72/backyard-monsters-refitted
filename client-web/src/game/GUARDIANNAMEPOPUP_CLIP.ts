import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class GUARDIANNAMEPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "GUARDIANNAMEPOPUP_CLIP" });
        as3.fields(this, { mcGuard: null, mcBG: null, tInput: null, tTitle: null, tDescription: null, bAction: null });
    }

    public mcGuard: MovieClip;
    public mcBG: frame_CLIP;
    public tInput: TextField;
    public tTitle: TextField;
    public tDescription: TextField;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
