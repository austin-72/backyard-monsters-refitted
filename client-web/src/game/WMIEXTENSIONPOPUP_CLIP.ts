import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class WMIEXTENSIONPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "WMIEXTENSIONPOPUP_CLIP" });
        as3.fields(this, { mcBanner: null, mcText: null, closeBtn: null, mcImage: null, mcFrame: null });
    }

    public mcBanner: MovieClip;
    public mcText: TextField;
    public closeBtn: Button_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
        if (this.closeBtn) {
            this.closeBtn.stop();
        }
    }
}
