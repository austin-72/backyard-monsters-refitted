import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class popup_infernodescent_battle_report extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_infernodescent_battle_report" });
        as3.fields(this, { bButton: null, mcResource1: null, mcResource2: null, tBody: null, mcResource3: null, tTitle: null, mcImage: null, mcFrame: null, mcResource4: null });
    }

    public bButton: Button_CLIP;
    public mcResource1: MovieClip;
    public mcResource2: MovieClip;
    public tBody: TextField;
    public mcResource3: MovieClip;
    public tTitle: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public mcResource4: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
