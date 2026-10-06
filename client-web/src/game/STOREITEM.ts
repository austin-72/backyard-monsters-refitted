import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, store_icon_CLIP } from "@game";

export class STOREITEM extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "STOREITEM" });
        as3.fields(this, { tA: null, tB: null, tC: null, bBuy: null, mcIcon: null, mcScreen: null });
    }

    public tA: TextField;
    public tB: TextField;
    public tC: TextField;
    public bBuy: Button_CLIP;
    public mcIcon: store_icon_CLIP;
    public mcScreen: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
