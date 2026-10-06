import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

/** The Depths of Hell's map art (IoUnderworld.depthsGround): depths_bridge_se.png. */
export class DepthsTile_bridge_se extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hellmap/depths_bridge_se.png" });
    }

    public $ctor(param1: int = 150, param2: int = 100): void {
        super.$ctor(param1, param2);
    }
}
