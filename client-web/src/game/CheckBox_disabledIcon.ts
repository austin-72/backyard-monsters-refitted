import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class CheckBox_disabledIcon extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CheckBox_disabledIcon" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
