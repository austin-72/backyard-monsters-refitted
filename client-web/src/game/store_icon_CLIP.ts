import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class store_icon_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "store_icon_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
