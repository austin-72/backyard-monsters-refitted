import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_prefab_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_prefab_CLIP" });
        as3.fields(this, { tCol1: null, img2: null, tCol2: null, t1: null, img3: null, tSelect: null, tCol3: null, t2: null, tInstantNotice: null, tCol4: null, t3: null, b1: null, b2: null, c1: null, b3: null, c2: null, b1s: null, c3: null, b2s: null, b3s: null, tShiny: null, mcFrame: null, img1: null });
    }

    public tCol1: TextField;
    public img2: MovieClip;
    public tCol2: TextField;
    public t1: TextField;
    public img3: MovieClip;
    public tSelect: TextField;
    public tCol3: TextField;
    public t2: TextField;
    public tInstantNotice: TextField;
    public tCol4: TextField;
    public t3: TextField;
    public b1: Button_CLIP;
    public b2: Button_CLIP;
    public c1: TextField;
    public b3: Button_CLIP;
    public c2: TextField;
    public b1s: Button_CLIP;
    public c3: TextField;
    public b2s: Button_CLIP;
    public b3s: Button_CLIP;
    public tShiny: TextField;
    public mcFrame: frame_CLIP;
    public img1: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
