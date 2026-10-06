import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { BUILDINGSARROW, Button_CLIP, buttonClose_CLIP } from "@game";

export class BUILDINGSPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGSPOPUP_CLIP" });
        as3.fields(this, { bNext: null, bClose: null, bPrevious: null, b1: null, b2: null, b3: null, b4: null, mcNew: null });
    }

    public bNext: BUILDINGSARROW;
    public bClose: buttonClose_CLIP;
    public bPrevious: BUILDINGSARROW;
    public b1: Button_CLIP;
    public b2: Button_CLIP;
    public b3: Button_CLIP;
    public b4: Button_CLIP;
    public mcNew: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
