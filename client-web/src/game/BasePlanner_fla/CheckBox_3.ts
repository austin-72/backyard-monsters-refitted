import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class CheckBox_3 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlanner_fla.CheckBox_3" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
