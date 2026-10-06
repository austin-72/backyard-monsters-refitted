import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MR3EventHUD_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MR3EventHUD_CLIP" });
        as3.fields(this, { mcTitle: null, bInfo: null, tExperience: null, mcInfo: null, tCountdown: null, mcReward: null });
    }

    public mcTitle: MovieClip;
    public bInfo: Button_CLIP;
    public tExperience: TextField;
    public mcInfo: MovieClip;
    public tCountdown: TextField;
    public mcReward: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
