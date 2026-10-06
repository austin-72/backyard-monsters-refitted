import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { BUILDINGBUTTON_CLIP, Button_CLIP, frame_CLIP } from "@game";

export class BUILDINGSPOPUPINFO_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGSPOPUPINFO_CLIP" });
        as3.fields(this, { mcBG: null, bBuild: null, mcBlocker: null, tDescription: null, mcIcon: null, bTopup: null });
    }

    public mcBG: frame_CLIP;
    public bBuild: Button_CLIP;
    public mcBlocker: MovieClip;
    public tDescription: TextField;
    public mcIcon: BUILDINGBUTTON_CLIP;
    public bTopup: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
