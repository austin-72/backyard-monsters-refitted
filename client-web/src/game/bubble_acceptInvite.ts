import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class bubble_acceptInvite extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "bubble_acceptInvite" });
        as3.fields(this, { bNo: null, tDesc: null, bYes: null });
    }

    public bNo: Button_CLIP;
    public tDesc: TextField;
    public bYes: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
