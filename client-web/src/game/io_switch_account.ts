import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

/** Inferno-only: the Switch account button (top bar), in the style of the round gold top-bar buttons. */
export class io_switch_account extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/io_switch_account.png" });
    }

    public $ctor(param1: int = 27, param2: int = 27): void {
        super.$ctor(param1, param2);
    }
}
