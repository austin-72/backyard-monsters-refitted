import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class MESSAGE_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MESSAGE_CLIP" });
        as3.fields(this, { bAction2: null, mcBG: null, bAction: null, tMessage: null });
    }

    public bAction2: Button_CLIP;
    public mcBG: frame_CLIP;
    public bAction: Button_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
