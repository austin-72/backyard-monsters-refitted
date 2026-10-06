import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_taunt_friend extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_taunt_friend" });
        as3.fields(this, { mcIcon1: null, mcIcon2: null, mcIcon3: null, tTitle: null, mcFrame: null, bShare: null });
    }

    public mcIcon1: MovieClip;
    public mcIcon2: MovieClip;
    public mcIcon3: MovieClip;
    public tTitle: TextField;
    public mcFrame: frame_CLIP;
    public bShare: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
