import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class IoWartShadow1 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/warts/wart1_shadow.jpg" });
    }

    public $ctor(param1: int = 57, param2: int = 33): void {
        super.$ctor(param1, param2);
    }
}
