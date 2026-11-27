import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

// Inferno-only (27 November, 72's suggestion): a ground opened by reaching level 50 (one seamless 1000x500 sheet,
// used whole like the invite grounds; MAPBG "io_hellforge"). Drawn by art/grounds/make_grounds.py (levels).
export class io_hellforge_big extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hellyard/io_hellforge_big.jpg" });
    }

    public $ctor(param1: int = 1000, param2: int = 500): void {
        super.$ctor(param1, param2);
    }
}
