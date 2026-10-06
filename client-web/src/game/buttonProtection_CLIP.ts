import * as as3 from "as3";
import { buttonProtection } from "@game";

export class buttonProtection_CLIP extends buttonProtection {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonProtection_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
