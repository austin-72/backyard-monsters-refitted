import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class DescentBasePopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom_inferno.views.DescentBasePopup_CLIP" });
        as3.fields(this, { depthBar: null, tDepth: null, attackBtn: null, helpBtn: null, tDepth2: null, bg_mc: null, msgBtn: null, truceBtn: null });
    }

    public depthBar: MovieClip;
    public tDepth: TextField;
    public attackBtn: Button_CLIP;
    public helpBtn: Button_CLIP;
    public tDepth2: TextField;
    public bg_mc: MovieClip;
    public msgBtn: Button_CLIP;
    public truceBtn: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
