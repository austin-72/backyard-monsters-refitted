import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_damagedbase_onvisit extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_damagedbase_onvisit" });
        as3.fields(this, { title_txt: null, mcImage: null, body_txt: null, mcFrame: null, bAction: null });
    }

    public title_txt: TextField;
    public mcImage: MovieClip;
    public body_txt: TextField;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
