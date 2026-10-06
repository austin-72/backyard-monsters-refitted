import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class MONSTERLABITEM_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MONSTERLABITEM_CLIP" });
        as3.fields(this, { mcBG: null, tLabel: null, mcIcon: null, mcLevel: null });
    }

    public mcBG: MovieClip;
    public tLabel: TextField;
    public mcIcon: MovieClip;
    public mcLevel: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
