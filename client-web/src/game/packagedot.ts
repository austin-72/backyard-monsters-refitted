import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class packagedot extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "packagedot" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
