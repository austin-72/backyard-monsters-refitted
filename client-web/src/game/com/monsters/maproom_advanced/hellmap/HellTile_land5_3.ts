import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class HellTile_land5_3 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hellmap/land5_3.png" });
    }

    public $ctor(param1: int = 150, param2: int = 100): void {
        super.$ctor(param1, param2);
    }
}
