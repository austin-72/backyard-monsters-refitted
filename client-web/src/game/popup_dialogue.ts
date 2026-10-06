import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame3_CLIP } from "@game";

export class popup_dialogue extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_dialogue" });
        as3.fields(this, { mcBG: null, tBody: null, tTitle: null, mcImage: null, bAction: null });
    }

    public mcBG: frame3_CLIP;
    public tBody: TextField;
    public tTitle: TextField;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
