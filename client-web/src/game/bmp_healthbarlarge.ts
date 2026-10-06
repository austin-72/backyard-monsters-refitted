import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class bmp_healthbarlarge extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1704_bmp_healthbarlarge_bmp_healthbarlarge.png" });
    }

    public $ctor(param1: int = 51, param2: int = 120): void {
        super.$ctor(param1, param2);
    }
}
