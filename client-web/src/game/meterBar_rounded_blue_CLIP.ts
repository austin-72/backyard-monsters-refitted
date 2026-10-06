import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class meterBar_rounded_blue_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "meterBar_rounded_blue_CLIP" });
        as3.fields(this, { mcFill: null, mcBG: null, mcFillMask: null });
    }

    public mcFill: MovieClip;
    public mcBG: MovieClip;
    public mcFillMask: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcFill) {
            this.mcFill.stop();
        }
        if (this.mcBG) {
            this.mcBG.stop();
        }
    }
}
