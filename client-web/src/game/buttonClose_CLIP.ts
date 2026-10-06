import * as as3 from "as3";
import { buttonClose } from "@game";

export class buttonClose_CLIP extends buttonClose {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonClose_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
