import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { buttonClose_CLIP } from "@game";

export class popup_sign_view extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_sign_view" });
        as3.fields(this, { subject_txt: null, bClose: null, placeholder: null, name_txt: null, bg_mc: null, photoRing: null });
    }

    public subject_txt: TextField;
    public bClose: buttonClose_CLIP;
    public placeholder: MovieClip;
    public name_txt: TextField;
    public bg_mc: MovieClip;
    public photoRing: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
