import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Button_CLIP, frame_CLIP } from "@game";

export class MapRoomPopup_InfernoDescent extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomPopup_InfernoDescent" });
        as3.fields(this, { background_mc: null, bReturn: null, mcImage: null });
    }

    public background_mc: frame_CLIP;
    public bReturn: Button_CLIP;
    public mcImage: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
