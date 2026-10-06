import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class chat_window_box_10 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChatUI_fla.chat_window_box_10" });
    }

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
