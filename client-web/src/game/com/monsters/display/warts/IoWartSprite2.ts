import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class IoWartSprite2 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/warts/wart2.png" });
    }

    public $ctor(param1: int = 48, param2: int = 29): void {
        super.$ctor(param1, param2);
    }
}
