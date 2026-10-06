import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class BasePlannerPopup_BottomLayout extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerPopup_BottomLayout" });
        as3.fields(this, { btnClear: null, btnLoad: null, check2_txt: null, check3_txt: null, check1: null, check1_txt: null, check2: null, check3: null, btnApply: null, check4: null, check4_txt: null, btnSave: null });
    }

    public btnClear: MovieClip;
    public btnLoad: MovieClip;
    public check2_txt: TextField;
    public check3_txt: TextField;
    public check1: MovieClip;
    public check1_txt: TextField;
    public check2: MovieClip;
    public check3: MovieClip;
    public btnApply: MovieClip;
    public check4: MovieClip;
    public check4_txt: TextField;
    public btnSave: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
