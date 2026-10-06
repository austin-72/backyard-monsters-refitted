import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class MiniMap_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom.MiniMap_CLIP" });
        as3.fields(this, { background_mc: null });
    }

    public background_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
