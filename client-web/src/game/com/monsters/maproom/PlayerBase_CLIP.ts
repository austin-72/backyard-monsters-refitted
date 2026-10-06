import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class PlayerBase_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom.PlayerBase_CLIP" });
        as3.fields(this, { photoFrame_mc: null, name_txt: null, placeholder: null, frame_mc: null, box_mc: null });
    }

    public photoFrame_mc: MovieClip;
    public name_txt: TextField;
    public placeholder: MovieClip;
    public frame_mc: MovieClip;
    public box_mc: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
