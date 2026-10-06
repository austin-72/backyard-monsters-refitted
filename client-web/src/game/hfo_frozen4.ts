import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

// Hell Freezes Over: the Inferno lava ground tile 4, frozen (Day 3 until the curse breaks; MAPBG "hfo_frozen")
export class hfo_frozen4 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/hfo/hfo_frozen4.jpg" });
    }

    public $ctor(param1: int = 200, param2: int = 100): void {
        super.$ctor(param1, param2);
    }
}
