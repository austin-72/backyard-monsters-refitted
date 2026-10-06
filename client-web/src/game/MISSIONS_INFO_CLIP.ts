import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils, frame_CLIP, icon_costs_short } from "@game";

export class MISSIONS_INFO_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MISSIONS_INFO_CLIP" });
        as3.fields(this, { mcArrow: null, R1: null, R2: null, tHint: null, R3: null, R4: null, bCollect: null, R5: null, mcImage: null, mcFrame: null, tReward: null, tDescription: null });
    }

    public mcArrow: MovieClip;
    public R1: icon_costs_short;
    public R2: icon_costs_short;
    public tHint: TextField;
    public R3: icon_costs_short;
    public R4: icon_costs_short;
    public bCollect: Button_CLIP;
    public R5: icon_costs_short;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public tReward: TextField;
    public tDescription: TextField;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
