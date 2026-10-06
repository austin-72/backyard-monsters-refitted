import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class bmp_healthbarsmall extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1667_bmp_healthbarsmall_bmp_healthbarsmall.png" });
    }

    public $ctor(param1: int = 17, param2: int = 60): void {
        super.$ctor(param1, param2);
    }
}
