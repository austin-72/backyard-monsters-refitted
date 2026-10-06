import * as as3 from "as3";
import { MovieClip, SimpleButton } from "flash/display";
import { TextField } from "flash/text";

export class FriendPicker_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "FriendPicker_CLIP" });
        as3.fields(this, { placeholder: null, name_txt: null, arrowLine: null, hitBtn: null, mask_mc: null, arrowBtn: null, bg_mc: null, photoRing: null });
    }

    public placeholder: MovieClip;
    public name_txt: TextField;
    public arrowLine: MovieClip;
    public hitBtn: SimpleButton;
    public mask_mc: MovieClip;
    public arrowBtn: MovieClip;
    public bg_mc: MovieClip;
    public photoRing: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
