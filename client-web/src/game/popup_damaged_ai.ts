import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_damaged_ai extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_damaged_ai" });
        as3.fields(this, { bAction2: null, tA: null, tB: null, tC: null, mcImage: null, mcFrame: null, bAction: null });
    }

    public bAction2: Button_CLIP;
    public tA: TextField;
    public tB: TextField;
    public tC: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
