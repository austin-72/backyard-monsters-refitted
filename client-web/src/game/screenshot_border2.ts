import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class screenshot_border2 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2655_screenshot_border2_screenshot_border2.png" });
    }

    public $ctor(param1: int = 700, param2: int = 460): void {
        super.$ctor(param1, param2);
    }
}
