import * as as3 from "as3";
import { frame2 } from "@game";

export class frame2_CLIP extends frame2 {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "frame2_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
