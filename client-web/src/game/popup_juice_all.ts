import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_juice_all extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_juice_all" });
        as3.fields(this, { tfBody: null, btnJuice: null, btnCancel: null, tfTitle: null, mcImage: null, mcFrame: null });
    }

    public tfBody: TextField;
    public btnJuice: Button_CLIP;
    public btnCancel: Button_CLIP;
    public tfTitle: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
