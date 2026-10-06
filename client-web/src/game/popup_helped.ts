import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_helped extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_helped" });
        as3.fields(this, { bPost: null, tA: null, tB: null, mcImage: null, mcFrame: null });
    }

    public bPost: Button_CLIP;
    public tA: TextField;
    public tB: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
