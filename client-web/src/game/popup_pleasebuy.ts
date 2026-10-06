import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_pleasebuy extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_pleasebuy" });
        as3.fields(this, { mcImage: null, mcFrame: null, bAction: null, tMessage: null });
    }

    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
