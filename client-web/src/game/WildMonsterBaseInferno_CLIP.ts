import * as as3 from "as3";
import { MovieClip, SimpleButton } from "flash/display";
import { TextField } from "flash/text";

export class WildMonsterBaseInferno_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "WildMonsterBaseInferno_CLIP" });
        as3.fields(this, { mediumhit: null, photoFrame_mc: null, smallhit: null, name_txt: null, placeholder: null, level_txt: null, largehit: null, frame_mc: null, box_mc: null });
    }

    public mediumhit: SimpleButton;
    public photoFrame_mc: MovieClip;
    public smallhit: SimpleButton;
    public name_txt: TextField;
    public placeholder: MovieClip;
    public level_txt: TextField;
    public largehit: SimpleButton;
    public frame_mc: MovieClip;
    public box_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
