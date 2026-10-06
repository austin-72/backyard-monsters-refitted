import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class screenshot_border1 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2656_screenshot_border1_screenshot_border1.png" });
    }

    public $ctor(param1: int = 700, param2: int = 460): void {
        super.$ctor(param1, param2);
    }
}
