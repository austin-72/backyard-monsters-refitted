import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_horse extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_horse" });
        as3.fields(this, { bA: null, bB: null, tName: null, tA: null, mcFrame: null });
    }

    public bA: Button_CLIP;
    public bB: Button_CLIP;
    public tName: TextField;
    public tA: TextField;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
