import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

// one seamless 1000x500 bone ground: used whole, so the bones never repeat inside a yard
export class hell_sand1_big extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hellyard/hell_sand1_big.jpg" });
    }

    public $ctor(param1: int = 1000, param2: int = 500): void {
        super.$ctor(param1, param2);
    }
}
