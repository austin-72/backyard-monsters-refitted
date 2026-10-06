import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

export class IoWartSprite3 extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/warts/wart3.png" });
    }

    public $ctor(param1: int = 41, param2: int = 38): void {
        super.$ctor(param1, param2);
    }
}
