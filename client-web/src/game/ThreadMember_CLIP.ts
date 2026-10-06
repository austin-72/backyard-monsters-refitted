import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class ThreadMember_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ThreadMember_CLIP" });
        as3.fields(this, { leftbg_mc: null, rightbg_mc: null, placeholder: null, body_txt: null, photoRing: null });
    }

    public leftbg_mc: MovieClip;
    public rightbg_mc: MovieClip;
    public placeholder: MovieClip;
    public body_txt: TextField;
    public photoRing: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
