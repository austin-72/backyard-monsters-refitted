import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class bmd_burns extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1816_bmd_burns_bmd_burns.png" });
    }

    public $ctor(param1: int = 320, param2: int = 40): void {
        super.$ctor(param1, param2);
    }
}
