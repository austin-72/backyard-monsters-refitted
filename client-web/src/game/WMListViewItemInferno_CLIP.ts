import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class WMListViewItemInferno_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "WMListViewItemInferno_CLIP" });
        as3.fields(this, { name_txt: null, placeholder: null, attackBtn: null, level_txt: null, status_txt: null, dot: null, attacks_txt: null, helpBtn: null, extraStatus_txt: null });
    }

    public name_txt: TextField;
    public placeholder: MovieClip;
    public attackBtn: Button_CLIP;
    public level_txt: TextField;
    public status_txt: TextField;
    public dot: MovieClip;
    public attacks_txt: TextField;
    public helpBtn: Button_CLIP;
    public extraStatus_txt: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
