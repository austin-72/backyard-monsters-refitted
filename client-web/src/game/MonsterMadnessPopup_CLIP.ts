import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP, loading_52 } from "@game";

export class MonsterMadnessPopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterMadnessPopup_CLIP" });
        as3.fields(this, { bAction2: null, mcImage: null, mcFrame: null, mcLoading: null, bAction: null, tCopy: null, mcVideo: null });
    }

    public bAction2: Button_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public mcLoading: loading_52;
    public bAction: Button_CLIP;
    public tCopy: TextField;
    public mcVideo: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
