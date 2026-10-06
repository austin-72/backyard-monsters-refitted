import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Button_CLIP, frame1_CLIP, frame_CLIP } from "@game";

export class MapRoomPopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomPopup_CLIP" });
        as3.fields(this, { mcR1: null, mcFrame2: null, mcR2: null, mcR3: null, mcMask: null, mcR4: null, bHome: null, bBookmarks: null, mcInfo: null, mcBuffHolder: null, mcOutposts: null, mcFrame: null, bJump: null });
    }

    public mcR1: MovieClip;
    public mcFrame2: frame_CLIP;
    public mcR2: MovieClip;
    public mcR3: MovieClip;
    public mcMask: MovieClip;
    public mcR4: MovieClip;
    public bHome: Button_CLIP;
    public bBookmarks: Button_CLIP;
    public mcInfo: MovieClip;
    public mcBuffHolder: MovieClip;
    public mcOutposts: MovieClip;
    public mcFrame: frame1_CLIP;
    public bJump: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
