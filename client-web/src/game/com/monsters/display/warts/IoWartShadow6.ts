import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class IoWartShadow6 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/warts/wart6_shadow.jpg" });
    }

    public $ctor(param1: int = 73, param2: int = 41): void {
        super.$ctor(param1, param2);
    }
}
