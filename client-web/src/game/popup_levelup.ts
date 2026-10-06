import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_levelup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_levelup" });
        as3.fields(this, { bPost: null, title_txt: null, headline_txt: null, mcImage: null, body_txt: null, mcFrame: null });
    }

    public bPost: Button_CLIP;
    public title_txt: TextField;
    public headline_txt: TextField;
    public mcImage: MovieClip;
    public body_txt: TextField;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
