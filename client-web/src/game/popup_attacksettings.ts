import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_attacksettings extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_attacksettings" });
        as3.fields(this, { title_txt: null, bLess: null, mcImage: null, mcFrame: null, bSame: null, bMore: null, taunt_txt: null });
    }

    public title_txt: TextField;
    public bLess: Button_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public bSame: Button_CLIP;
    public bMore: Button_CLIP;
    public taunt_txt: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
