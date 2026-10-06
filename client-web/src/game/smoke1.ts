import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class smoke1 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1565_smoke1_smoke1.png" });
    }

    public $ctor(param1: int = 3000, param2: int = 30): void {
        super.$ctor(param1, param2);
    }
}
