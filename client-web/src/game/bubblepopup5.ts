import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { MovieClipUtils } from "@game";

export class bubblepopup5 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubblepopup5" });
        as3.fields(this, { mcBG: null, mcText: null });
    }

    public mcBG: MovieClip;
    public mcText: TextField;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
