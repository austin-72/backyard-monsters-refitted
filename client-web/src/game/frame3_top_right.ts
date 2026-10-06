import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class frame3_top_right extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2048_frame3_top_right_frame3_top_right.png" });
    }

    public $ctor(param1: int = 116, param2: int = 90): void {
        super.$ctor(param1, param2);
    }
}
