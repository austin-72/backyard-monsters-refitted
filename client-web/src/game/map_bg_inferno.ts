import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class map_bg_inferno extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "map_bg_inferno" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
