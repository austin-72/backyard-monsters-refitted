import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class ui_buffIcon_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ui_buffIcon_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
