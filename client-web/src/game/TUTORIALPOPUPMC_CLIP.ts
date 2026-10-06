import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, TUTORIALARROWMC_CLIP } from "@game";

export class TUTORIALPOPUPMC_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "TUTORIALPOPUPMC_CLIP" });
        as3.fields(this, { mcArrow: null, mcBubble: null, mcText: null, mcButton: null, mcBlocker: null });
    }

    public mcArrow: TUTORIALARROWMC_CLIP;
    public mcBubble: MovieClip;
    public mcText: TextField;
    public mcButton: Button_CLIP;
    public mcBlocker: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
