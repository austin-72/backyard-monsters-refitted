import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame3_CLIP } from "@game";

export class popup_infernoemerge_complete extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_infernoemerge_complete" });
        as3.fields(this, { tBody: null, frame: null, mcImage: null, bAction: null });
    }

    public tBody: TextField;
    public frame: frame3_CLIP;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
