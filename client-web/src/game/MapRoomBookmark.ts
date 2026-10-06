import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { buttonClose_CLIP } from "@game";

export class MapRoomBookmark extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoomBookmark" });
        as3.fields(this, { tName: null, mcBG: null, bDelete: null });
    }

    public tName: TextField;
    public mcBG: MovieClip;
    public bDelete: buttonClose_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
