import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_gift extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_gift" });
        as3.fields(this, { bThanks: null, bReturn: null, tA: null, tB: null, mcPic: null, mcImage: null, mcFrame: null });
    }

    public bThanks: Button_CLIP;
    public bReturn: Button_CLIP;
    public tA: TextField;
    public tB: TextField;
    public mcPic: MovieClip;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
