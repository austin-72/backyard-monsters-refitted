import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class SALESPECIALSPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SALESPECIALSPOPUP_CLIP" });
        as3.fields(this, { bAction2: null, bAction3: null, bInfo: null, tTitle: null, tDesc: null, mcFrame: null, bAction: null, bAction4: null });
    }

    public bAction2: Button_CLIP;
    public bAction3: MovieClip;
    public bInfo: MovieClip;
    public tTitle: TextField;
    public tDesc: TextField;
    public mcFrame: frame_CLIP;
    public bAction: Button_CLIP;
    public bAction4: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
