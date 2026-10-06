import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class KrallenHUD_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "KrallenHUD_CLIP" });
        as3.fields(this, { mcLevel: null });
    }

    public mcLevel: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
