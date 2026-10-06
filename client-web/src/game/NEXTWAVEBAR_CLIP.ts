import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class NEXTWAVEBAR_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "NEXTWAVEBAR_CLIP" });
        as3.fields(this, { bNext: null, mcHit: null, tR: null });
    }

    public bNext: MovieClip;
    public mcHit: MovieClip;
    public tR: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
