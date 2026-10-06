import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class popup_attackedme extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_attackedme" });
        as3.fields(this, { b1: null, b2: null, b3: null, tA: null, mcPic: null, bShare: null });
    }

    public b1: MovieClip;
    public b2: MovieClip;
    public b3: MovieClip;
    public tA: TextField;
    public mcPic: MovieClip;
    public bShare: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
