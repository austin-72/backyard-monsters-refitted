import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { loading_210 } from "@game";

export class UI_MISSIONS_ITEM_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_MISSIONS_ITEM_CLIP" });
        as3.fields(this, { tName: null, tDesc: null, bg: null, mcImage: null, mcLoading: null, mcCheck: null });
    }

    public tName: TextField;
    public tDesc: TextField;
    public bg: MovieClip;
    public mcImage: MovieClip;
    public mcLoading: loading_210;
    public mcCheck: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
