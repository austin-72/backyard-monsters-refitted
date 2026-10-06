import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class bubblepopup4_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubblepopup4_CLIP" });
        as3.fields(this, { mcBG: null, tA: null });
    }

    public mcBG: MovieClip;
    public tA: TextField;

    public $ctor(): void {
        super.$ctor();
        if (this.mcBG) {
            this.mcBG.stop();
        }
    }
}
