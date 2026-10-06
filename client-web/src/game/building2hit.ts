import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class building2hit extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "building2hit" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
