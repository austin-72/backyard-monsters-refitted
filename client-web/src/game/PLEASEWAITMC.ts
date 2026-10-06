import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame2_CLIP, loading_210 } from "@game";

export class PLEASEWAITMC extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PLEASEWAITMC" });
        as3.fields(this, { mcFrame: null, tMessage: null, mcLoading: null });
    }

    public mcFrame: frame2_CLIP;
    public tMessage: TextField;
    public mcLoading: loading_210;

    public $ctor(): void {
        super.$ctor();
    }
}
