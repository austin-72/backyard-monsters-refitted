import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class ScrollSet_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ScrollSet_CLIP" });
        as3.fields(this, { mcBG: null, mcScroller: null });
    }

    public mcBG: MovieClip;
    public mcScroller: MovieClip;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBG) {
            this.mcBG.stop();
        }
        if (this.mcScroller) {
            this.mcScroller.stop();
        }
    }
}
