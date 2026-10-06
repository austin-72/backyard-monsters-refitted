import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class ChatBox_msg_name_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChatBox_msg_name_CLIP" });
        as3.fields(this, { bg: null, label: null });
    }

    public bg: MovieClip;
    public label: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
