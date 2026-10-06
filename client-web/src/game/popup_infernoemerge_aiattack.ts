import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HousingPopupMonster_CLIP, frame3_CLIP } from "@game";

export class popup_infernoemerge_aiattack extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_infernoemerge_aiattack" });
        as3.fields(this, { tName: null, c1: null, c2: null, tTitle: null, c3: null, c4: null, c5: null, mcImage: null, mcFrame: null, bAction: null });
    }

    public tName: TextField;
    public c1: HousingPopupMonster_CLIP;
    public c2: HousingPopupMonster_CLIP;
    public tTitle: TextField;
    public c3: HousingPopupMonster_CLIP;
    public c4: HousingPopupMonster_CLIP;
    public c5: HousingPopupMonster_CLIP;
    public mcImage: MovieClip;
    public mcFrame: frame3_CLIP;
    public bAction: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
