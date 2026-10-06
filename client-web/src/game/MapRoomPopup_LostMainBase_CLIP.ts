import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class MapRoomPopup_LostMainBase_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomPopup_LostMainBase_CLIP" });
        as3.fields(this, { mcBG: null, bNo: null, tDesc: null, tTitle: null, mcImage: null, tWarning: null, bYes: null });
    }

    public mcBG: frame_CLIP;
    public bNo: Button_CLIP;
    public tDesc: TextField;
    public tTitle: TextField;
    public mcImage: MovieClip;
    public tWarning: TextField;
    public bYes: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
