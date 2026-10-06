import * as as3 from "as3";
import { SmallButton } from "@game";

export class changeCatapultBtn extends SmallButton {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "changeCatapultBtn" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
