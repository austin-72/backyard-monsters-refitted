import * as as3 from "as3";
import { buttonMusic } from "@game";

export class buttonMusic_CLIP extends buttonMusic {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonMusic_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
