import * as as3 from "as3";
import { buttonFullscreen } from "@game";

export class buttonFullscreen_CLIP extends buttonFullscreen {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonFullscreen_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
