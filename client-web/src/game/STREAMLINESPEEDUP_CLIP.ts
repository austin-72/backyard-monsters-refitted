import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class STREAMLINESPEEDUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "STREAMLINESPEEDUP_CLIP" });
        as3.fields(this, { mcBG: null, mcStoreIcon: null, mcInstant: null, tTitle: null, tDescription: null });
    }

    public mcBG: frame_CLIP;
    public mcStoreIcon: MovieClip;
    public mcInstant: MovieClip;
    public tTitle: TextField;
    public tDescription: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
