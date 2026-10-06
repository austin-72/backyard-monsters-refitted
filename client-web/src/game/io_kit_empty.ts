import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

/** Inferno-only art built into the game (so it never depends on a file being on the server). */
export class io_kit_empty extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/io_kit_empty.png" });
    }

    public $ctor(param1: int = 140, param2: int = 90): void {
        super.$ctor(param1, param2);
    }
}
