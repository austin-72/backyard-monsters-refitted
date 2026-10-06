import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_generic extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_generic" });
        as3.fields(this, { mcBG: null, tA: null, tB: null, mcImage: null, bAction: null, mcImageFrame: null });
    }

    public mcBG: frame_CLIP;
    public tA: TextField;
    public tB: TextField;
    public mcImage: MovieClip;
    public bAction: Button_CLIP;
    public mcImageFrame: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
