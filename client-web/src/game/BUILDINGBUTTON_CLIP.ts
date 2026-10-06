import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BUILDINGBUTTON_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BUILDINGBUTTON_CLIP" });
        as3.fields(this, { tName: null, mcBG: null, mcShroud: null, mcNew: null, mcSale: null, tQuantity: null, mcCheck: null });
    }

    public tName: TextField;
    public mcBG: MovieClip;
    public mcShroud: MovieClip;
    public mcNew: MovieClip;
    public mcSale: MovieClip;
    public tQuantity: TextField;
    public mcCheck: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
