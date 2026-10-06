import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HousingPopupMonster_CLIP, frame_CLIP } from "@game";

export class AIATTACKPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "AIATTACKPOPUP_CLIP" });
        as3.fields(this, { waitBtn: null, name_txt: null, title_txt: null, c1: null, c2: null, c3: null, sendNow: null, mcImage: null, mcFrame: null });
    }

    public waitBtn: Button_CLIP;
    public name_txt: TextField;
    public title_txt: TextField;
    public c1: HousingPopupMonster_CLIP;
    public c2: HousingPopupMonster_CLIP;
    public c3: HousingPopupMonster_CLIP;
    public sendNow: Button_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
