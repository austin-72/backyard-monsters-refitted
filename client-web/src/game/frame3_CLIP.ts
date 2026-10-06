import * as as3 from "as3";
import { frame3 } from "@game";

export class frame3_CLIP extends frame3 {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "frame3_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
