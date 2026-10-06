import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_truce extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_truce" });
        as3.fields(this, { tA: null, tB: null, bMessage: null, bSend: null, mcFrame: null });
    }

    public tA: TextField;
    public tB: TextField;
    public bMessage: TextField;
    public bSend: Button_CLIP;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
