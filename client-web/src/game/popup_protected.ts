import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class popup_protected extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_protected" });
        as3.fields(this, { tA: null, tB: null, mcImage: null, mcFrame: null });
    }

    public tA: TextField;
    public tB: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
