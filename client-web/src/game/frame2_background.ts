import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class frame2_background extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2052_frame2_background_frame2_background.png" });
    }

    public $ctor(param1: int = 92, param2: int = 92): void {
        super.$ctor(param1, param2);
    }
}
