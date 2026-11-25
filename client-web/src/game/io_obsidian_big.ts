import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

// Inferno-only (12 October): an invite ground (one seamless 1000x500 sheet, used whole like the bone fields; MAPBG
// "io_obsidian"), opened by friends joining through the player's invite link. Drawn by art/grounds/make_grounds.py.
export class io_obsidian_big extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hellyard/io_obsidian_big.jpg" });
    }

    public $ctor(param1: int = 1000, param2: int = 500): void {
        super.$ctor(param1, param2);
    }
}
