import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class system_message extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "system_message" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
