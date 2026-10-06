import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class popup_bg2 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_bg2" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
