import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class ChatBox_msg_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChatBox_msg_CLIP" });
        as3.fields(this, { ignoreBtn: null, txt: null, bg: null });
    }

    public ignoreBtn: MovieClip;
    public txt: TextField;
    public bg: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
