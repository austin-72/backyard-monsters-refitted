import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class ChatBox_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ChatBox_CLIP" });
        as3.fields(this, { input: null, frame: null });
    }

    public input: MovieClip;
    public frame: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
