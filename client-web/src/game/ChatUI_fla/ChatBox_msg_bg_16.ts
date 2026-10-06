import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class ChatBox_msg_bg_16 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChatUI_fla.ChatBox_msg_bg_16" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
