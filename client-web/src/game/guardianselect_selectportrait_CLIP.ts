import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class guardianselect_selectportrait_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "guardianselect_selectportrait_CLIP" });
        as3.fields(this, { bSelectBG: null, tGuard_label: null, mcImage: null, tGuard_desc: null, bAction: null });
    }

    public bSelectBG: MovieClip;
    public tGuard_label: TextField;
    public mcImage: MovieClip;
    public tGuard_desc: TextField;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
