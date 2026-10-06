import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class MapRoomPopupJump extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomPopupJump" });
        as3.fields(this, { mcFrame: null, tX: null, bJump: null, tY: null, tMessage: null });
    }

    public mcFrame: frame_CLIP;
    public tX: TextField;
    public bJump: Button_CLIP;
    public tY: TextField;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
