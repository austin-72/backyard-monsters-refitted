import * as as3 from "as3";
import { buttonSaving } from "@game";

export class buttonSaving_CLIP extends buttonSaving {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonSaving_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
