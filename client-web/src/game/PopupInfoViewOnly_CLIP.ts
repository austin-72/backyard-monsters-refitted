import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class PopupInfoViewOnly_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupInfoViewOnly_CLIP" });
        as3.fields(this, { mcArrow: null, tName: null, bView: null, tHeight: null, tLabel1: null, tLabel2: null, txtButtonInfo: null, tBonus: null, tLocation: null, mcFrame: null, mcProfilePic: null });
    }

    public mcArrow: MovieClip;
    public tName: TextField;
    public bView: Button_CLIP;
    public tHeight: TextField;
    public tLabel1: TextField;
    public tLabel2: TextField;
    public txtButtonInfo: TextField;
    public tBonus: TextField;
    public tLocation: TextField;
    public mcFrame: frame_CLIP;
    public mcProfilePic: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcArrow) {
            this.mcArrow.stop();
        }
    }
}
