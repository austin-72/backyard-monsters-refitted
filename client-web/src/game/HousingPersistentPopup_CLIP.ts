import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils } from "@game";

export class HousingPersistentPopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HousingPersistentPopup_CLIP" });
        as3.fields(this, { tTitleBunkers: null, title_txt: null, tHealthText: null, tCapacityText: null, m_bgWhite: null, bJuice: null, m_line: null, tJuicingText: null, bHealAll: null, bClear: null, tTitleHousing: null, capacity_desc_txt: null, monsterContainerMask: null, tStorage: null, tAscendText: null, tTitleHealing: null, monsterContainer: null, mcStorage: null, bTransfer: null });
    }

    public tTitleBunkers: TextField;
    public title_txt: TextField;
    public tHealthText: TextField;
    public tCapacityText: TextField;
    public m_bgWhite: MovieClip;
    public bJuice: Button_CLIP;
    public m_line: MovieClip;
    public tJuicingText: TextField;
    public bHealAll: Button_CLIP;
    public bClear: Button_CLIP;
    public tTitleHousing: TextField;
    public capacity_desc_txt: TextField;
    public monsterContainerMask: MovieClip;
    public tStorage: TextField;
    public tAscendText: TextField;
    public tTitleHealing: TextField;
    public monsterContainer: MovieClip;
    public mcStorage: MovieClip;
    public bTransfer: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
