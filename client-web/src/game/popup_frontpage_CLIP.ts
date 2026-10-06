import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { frame_CLIP, loading_52 } from "@game";

export class popup_frontpage_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_frontpage_CLIP" });
        as3.fields(this, { bNext: null, bPrev: null, mcCarousel: null, mcContainer: null, mcNew: null, mcFrame: null, mcLoading: null });
    }

    public bNext: MovieClip;
    public bPrev: MovieClip;
    public mcCarousel: MovieClip;
    public mcContainer: MovieClip;
    public mcNew: MovieClip;
    public mcFrame: frame_CLIP;
    public mcLoading: loading_52;

    public $ctor(): void {
        super.$ctor();
    }
}
