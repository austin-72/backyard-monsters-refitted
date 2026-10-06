import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { frame_CLIP } from "@game";

export class attackCostPopup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "attackCostPopup" });
        as3.fields(this, { mcBG: null, tBody: null, mcInstant: null, mcResources: null });
    }

    public mcBG: frame_CLIP;
    public tBody: TextField;
    public mcInstant: MovieClip;
    public mcResources: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
