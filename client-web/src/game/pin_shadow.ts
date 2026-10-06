import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class pin_shadow extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/2778_pin_shadow_pin_shadow.png" });
    }

    public $ctor(param1: int = 28, param2: int = 25): void {
        super.$ctor(param1, param2);
    }
}
