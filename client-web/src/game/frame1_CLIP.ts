import * as as3 from "as3";
import { frame1 } from "@game";

export class frame1_CLIP extends frame1 {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "frame1_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
