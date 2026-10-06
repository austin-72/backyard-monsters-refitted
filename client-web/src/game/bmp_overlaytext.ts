import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class bmp_overlaytext extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1705_bmp_overlaytext_bmp_overlaytext.png" });
    }

    public $ctor(param1: int = 51, param2: int = 33): void {
        super.$ctor(param1, param2);
    }
}
