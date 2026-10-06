import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Button_CLIP, frame_CLIP } from "@game";

export class old_maproom extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "old_maproom" });
        as3.fields(this, { mcHolder: null, mvBtn: null, lvBtn: null, background_mc: null });
    }

    public mcHolder: MovieClip;
    public mvBtn: Button_CLIP;
    public lvBtn: Button_CLIP;
    public background_mc: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
