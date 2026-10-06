import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class IoWartShadow4 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/warts/wart4_shadow.jpg" });
    }

    public $ctor(param1: int = 59, param2: int = 37): void {
        super.$ctor(param1, param2);
    }
}
