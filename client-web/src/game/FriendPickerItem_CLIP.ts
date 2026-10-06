import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class FriendPickerItem_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "FriendPickerItem_CLIP" });
        as3.fields(this, { background: null, name_txt: null, placeholder: null, userid_txt: null, photoRing: null });
    }

    public background: MovieClip;
    public name_txt: TextField;
    public placeholder: MovieClip;
    public userid_txt: TextField;
    public photoRing: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
