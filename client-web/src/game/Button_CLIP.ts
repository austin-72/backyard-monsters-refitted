import * as as3 from "as3";
import { Button } from "@game";

export class Button_CLIP extends Button {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "Button_CLIP" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
