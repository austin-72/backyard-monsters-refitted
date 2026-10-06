import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { bubblepopup6_CLIP, frame_CLIP } from "@game";

export class BUILDINGOPTIONSPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGOPTIONSPOPUP_CLIP" });
        as3.fields(this, { mcCBBG: null, mcBG: null, mcInstant: null, mcResources: null, mcImage: null, mcInfoCB: null, tDescription: null });
    }

    public mcCBBG: MovieClip;
    public mcBG: frame_CLIP;
    public mcInstant: MovieClip;
    public mcResources: MovieClip;
    public mcImage: MovieClip;
    public mcInfoCB: bubblepopup6_CLIP;
    public tDescription: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
