import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Button_CLIP } from "@game";

export class UI_BAITERSCAREAWAY_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_BAITERSCAREAWAY_CLIP" });
        as3.fields(this, { mcBG: null, bReturn: null });
    }

    public mcBG: MovieClip;
    public bReturn: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
