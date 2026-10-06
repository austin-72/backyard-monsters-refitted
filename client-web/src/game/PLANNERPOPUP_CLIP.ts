import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class PLANNERPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PLANNERPOPUP_CLIP" });
        as3.fields(this, { tName: null, mcMap: null, title_txt: null, bContinue: null, txtGuide: null, bExpand: null, mcNameBG: null, bZoom1: null, bRanges: null, bZoom2: null });
    }

    public tName: TextField;
    public mcMap: MovieClip;
    public title_txt: TextField;
    public bContinue: Button_CLIP;
    public txtGuide: TextField;
    public bExpand: Button_CLIP;
    public mcNameBG: MovieClip;
    public bZoom1: Button_CLIP;
    public bRanges: Button_CLIP;
    public bZoom2: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
