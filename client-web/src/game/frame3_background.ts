import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class frame3_background extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2049_frame3_background_frame3_background.jpg" });
    }

    public $ctor(param1: int = 72, param2: int = 72): void {
        super.$ctor(param1, param2);
    }
}
