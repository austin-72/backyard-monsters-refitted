import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class bubblepopupUpBuff_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubblepopupUpBuff_CLIP" });
        as3.fields(this, { mcArrow: null, mcBG: null, mcTextDuration: null, mcText: null });
    }

    public mcArrow: MovieClip;
    public mcBG: MovieClip;
    public mcTextDuration: TextField;
    public mcText: TextField;

    public $ctor(): void {
        super.$ctor();
        if (this.mcArrow) {
            this.mcArrow.stop();
        }
        if (this.mcBG) {
            this.mcBG.stop();
        }
    }
}
