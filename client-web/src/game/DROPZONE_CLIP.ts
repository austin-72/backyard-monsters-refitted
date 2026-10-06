import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class DROPZONE_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "DROPZONE_CLIP" });
        as3.fields(this, { ring1: null });
    }

    public ring1: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
