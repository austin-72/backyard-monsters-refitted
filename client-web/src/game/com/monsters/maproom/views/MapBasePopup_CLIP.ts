import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MapBasePopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom.views.MapBasePopup_CLIP" });
        as3.fields(this, { title_txt: null, attackBtn: null, helpBtn: null, bg_mc: null, msgBtn: null, truceBtn: null });
    }

    public title_txt: TextField;
    public attackBtn: Button_CLIP;
    public helpBtn: Button_CLIP;
    public bg_mc: MovieClip;
    public msgBtn: Button_CLIP;
    public truceBtn: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
