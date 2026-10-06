import * as as3 from "as3";
import { frame } from "@game";

export class frame_CLIP extends frame {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "frame_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
