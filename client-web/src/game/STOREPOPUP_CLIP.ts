import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { ButtonBrown_CLIP, Button_CLIP, frame_CLIP } from "@game";

export class STOREPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "STOREPOPUP_CLIP" });
        as3.fields(this, { b1: null, tShinyBalance: null, b2: null, b3: null, b4: null, bAdd: null, b5: null, mcFrame: null, window: null });
    }

    public b1: ButtonBrown_CLIP;
    public tShinyBalance: TextField;
    public b2: ButtonBrown_CLIP;
    public b3: ButtonBrown_CLIP;
    public b4: ButtonBrown_CLIP;
    public bAdd: Button_CLIP;
    public b5: ButtonBrown_CLIP;
    public mcFrame: frame_CLIP;
    public window: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
