import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class GUARDIANSELECTPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "GUARDIANSELECTPOPUP_CLIP" });
        as3.fields(this, { mcMask: null, tTitle: null, frame: null });
    }

    public mcMask: MovieClip;
    public tTitle: TextField;
    public frame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
