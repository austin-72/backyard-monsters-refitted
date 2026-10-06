import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class DescentView_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom_inferno.views.DescentView_CLIP" });
        as3.fields(this, { mask_mc: null });
    }

    public mask_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
