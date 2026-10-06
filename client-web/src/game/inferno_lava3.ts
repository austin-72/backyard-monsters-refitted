import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class inferno_lava3 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2170_inferno_lava3_inferno_lava3.jpg" });
    }

    public $ctor(param1: int = 200, param2: int = 100): void {
        super.$ctor(param1, param2);
    }
}
