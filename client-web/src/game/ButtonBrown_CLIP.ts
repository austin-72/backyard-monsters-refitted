import * as as3 from "as3";
import { ButtonBrown } from "@game";

export class ButtonBrown_CLIP extends ButtonBrown {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ButtonBrown_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
