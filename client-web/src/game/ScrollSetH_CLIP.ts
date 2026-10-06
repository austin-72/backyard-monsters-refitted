import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MovieClipUtils } from "@game";

export class ScrollSetH_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ScrollSetH_CLIP" });
        as3.fields(this, { mcBG: null, mcScroller: null });
    }

    public mcBG: MovieClip;
    public mcScroller: MovieClip;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
