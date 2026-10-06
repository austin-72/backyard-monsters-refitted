import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class buttonReinforcement_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buttonReinforcement_CLIP" });
        as3.fields(this, { tCountdown: null });
    }

    public tCountdown: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
