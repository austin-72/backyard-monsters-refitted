import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

/** Inferno-only Yard Planner toolbar icon (white = normal, y = yellow: hover / active). */
export class io_pt_redo_w extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/io_pt_redo_w.png" });
    }

    public $ctor(param1: int = 26, param2: int = 26): void {
        super.$ctor(param1, param2);
    }
}
