import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { frame_CLIP } from "@game";

export class FBPROMO_711_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "FBPROMO_711_CLIP" });
        as3.fields(this, { bAction3: null, bInfo: null, mcFrame: null, bAction4: null });
    }

    public bAction3: MovieClip;
    public bInfo: MovieClip;
    public mcFrame: frame_CLIP;
    public bAction4: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
