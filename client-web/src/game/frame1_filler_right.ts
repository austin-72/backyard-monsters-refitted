import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class frame1_filler_right extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2677_frame1_filler_right_frame1_filler_right.png" });
    }

    public $ctor(param1: int = 20, param2: int = 220): void {
        super.$ctor(param1, param2);
    }
}
