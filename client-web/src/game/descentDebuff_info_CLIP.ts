import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class descentDebuff_info_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "descentDebuff_info_CLIP" });
        as3.fields(this, { depthBar: null, tDepth: null, tDesc: null, tDepth2: null });
    }

    public depthBar: MovieClip;
    public tDepth: TextField;
    public tDesc: TextField;
    public tDepth2: TextField;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
