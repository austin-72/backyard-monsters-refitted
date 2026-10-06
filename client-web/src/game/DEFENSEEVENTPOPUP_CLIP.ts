import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class DEFENSEEVENTPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "DEFENSEEVENTPOPUP_CLIP" });
        as3.fields(this, { mcBanner: null, mcText: null, rsvpBtn: null, mcImage: null, mcFrame: null });
    }

    public mcBanner: MovieClip;
    public mcText: TextField;
    public rsvpBtn: Button_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
