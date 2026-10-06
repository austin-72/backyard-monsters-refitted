import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_defense extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_defense" });
        as3.fields(this, { tText: null, mcImage: null, mcFrame: null, bAction: null });
    }

    public tText: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
