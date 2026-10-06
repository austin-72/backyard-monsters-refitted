import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, CheckBox_CLIP, frame_CLIP } from "@game";

export class RADIOSETTINGSPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "RADIOSETTINGSPOPUP_CLIP" });
        as3.fields(this, { tAttack: null, tEmail: null, mcBG: null, cbNews: null, bSave: null, tNews: null, tDesc: null, tTitle: null, tEmailInput: null, tProxy: null, cbAttack: null, cbProxy: null });
    }

    public tAttack: TextField;
    public tEmail: TextField;
    public mcBG: frame_CLIP;
    public cbNews: CheckBox_CLIP;
    public bSave: Button_CLIP;
    public tNews: TextField;
    public tDesc: TextField;
    public tTitle: TextField;
    public tEmailInput: TextField;
    public tProxy: TextField;
    public cbAttack: CheckBox_CLIP;
    public cbProxy: CheckBox_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
