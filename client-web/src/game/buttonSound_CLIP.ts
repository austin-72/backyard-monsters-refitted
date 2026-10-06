import * as as3 from "as3";
import { buttonSound } from "@game";

export class buttonSound_CLIP extends buttonSound {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonSound_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
