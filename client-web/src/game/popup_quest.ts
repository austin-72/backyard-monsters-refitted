import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_quest extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_quest" });
        as3.fields(this, { mcBG: null, tA: null, mcImage: null, bAction: null });
    }

    public mcBG: frame_CLIP;
    public tA: TextField;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
