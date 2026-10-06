import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class bubble_selecttarget extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubble_selecttarget" });
        as3.fields(this, { bCancel: null, tDesc: null });
    }

    public bCancel: Button_CLIP;
    public tDesc: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
