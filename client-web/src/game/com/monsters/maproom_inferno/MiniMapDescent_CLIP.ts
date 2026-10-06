import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MiniMapBackgroundDescent_CLIP } from "@game";

export class MiniMapDescent_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom_inferno.MiniMapDescent_CLIP" });
        as3.fields(this, { background_mc: null, mask_mc: null, fow_mc: null });
    }

    public background_mc: MiniMapBackgroundDescent_CLIP;
    public mask_mc: MovieClip;
    public fow_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
