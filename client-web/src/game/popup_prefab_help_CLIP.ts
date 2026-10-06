import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_prefab_help_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_prefab_help_CLIP" });
        as3.fields(this, { b1: null, tTitle: null, mcFrame: null, tMessage: null });
    }

    public b1: Button_CLIP;
    public tTitle: TextField;
    public mcFrame: frame_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
