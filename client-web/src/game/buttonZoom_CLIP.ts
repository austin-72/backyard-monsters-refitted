import * as as3 from "as3";
import { buttonZoom } from "@game";

export class buttonZoom_CLIP extends buttonZoom {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonZoom_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
