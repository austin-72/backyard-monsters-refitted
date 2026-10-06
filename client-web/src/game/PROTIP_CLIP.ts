import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class PROTIP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PROTIP_CLIP" });
        as3.fields(this, { tTitle: null, tDesc: null, mcFrame: null, mcIcon: null });
    }

    public tTitle: TextField;
    public tDesc: TextField;
    public mcFrame: frame_CLIP;
    public mcIcon: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
