import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class GUARDIANBUTTON_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "GUARDIANBUTTON_CLIP" });
        as3.fields(this, { _bg: null, txtName: null, bRetreat: null, bSend: null, mcImage: null });
    }

    public _bg: MovieClip;
    public txtName: TextField;
    public bRetreat: Button_CLIP;
    public bSend: Button_CLIP;
    public mcImage: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
