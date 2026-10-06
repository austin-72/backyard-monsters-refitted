import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class pushpins extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2777_pushpins_pushpins.png" });
    }

    public $ctor(param1: int = 105, param2: int = 100): void {
        super.$ctor(param1, param2);
    }
}
