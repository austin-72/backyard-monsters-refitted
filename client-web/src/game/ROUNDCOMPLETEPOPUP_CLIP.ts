import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class ROUNDCOMPLETEPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ROUNDCOMPLETEPOPUP_CLIP" });
        as3.fields(this, { mcTitle: null, mcBanner: null, rBtn: null, mcStats: null, mcText: null, mcImage: null, mcFrame: null, mBtn: null, lBtn: null, bragBtn: null });
    }

    public mcTitle: TextField;
    public mcBanner: MovieClip;
    public rBtn: Button_CLIP;
    public mcStats: TextField;
    public mcText: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public mBtn: Button_CLIP;
    public lBtn: Button_CLIP;
    public bragBtn: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
