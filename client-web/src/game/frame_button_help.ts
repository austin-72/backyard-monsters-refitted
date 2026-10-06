import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class frame_button_help extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1699_frame_button_help_frame_button_help.png" });
    }

    public $ctor(param1: int = 27, param2: int = 27): void {
        super.$ctor(param1, param2);
    }
}
