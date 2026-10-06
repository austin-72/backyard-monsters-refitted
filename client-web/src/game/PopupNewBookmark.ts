import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class PopupNewBookmark extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupNewBookmark" });
        as3.fields(this, { tName: null, bSave: null, mcFrame: null, tMessage: null });
    }

    public tName: TextField;
    public bSave: Button_CLIP;
    public mcFrame: frame_CLIP;
    public tMessage: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
