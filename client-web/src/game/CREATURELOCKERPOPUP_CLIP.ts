import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils, creatureBar, frame_CLIP } from "@game";

export class CREATURELOCKERPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CREATURELOCKERPOPUP_CLIP" });
        as3.fields(this, { bNext: null, tTime: null, bSpeed: null, time_txt: null, bResource: null, bInstant: null, mcButtons: null, tResource: null, bDamage: null, title_txt: null, bPrevious: null, bContinue: null, health_txt: null, mcList: null, txtGuide: null, prod_label_txt: null, tSpeed: null, bTime: null, bStorage: null, tCosts: null, tHealth: null, housing_txt: null, tStorage: null, mcImage: null, mcFrame: null, goo_txt: null, tDescription: null, tDamage: null, damage_txt: null, speed_txt: null, bHealth: null });
    }

    public bNext: Button_CLIP;
    public tTime: TextField;
    public bSpeed: creatureBar;
    public time_txt: TextField;
    public bResource: creatureBar;
    public bInstant: Button_CLIP;
    public mcButtons: MovieClip;
    public tResource: TextField;
    public bDamage: creatureBar;
    public title_txt: TextField;
    public bPrevious: Button_CLIP;
    public bContinue: Button_CLIP;
    public health_txt: TextField;
    public mcList: MovieClip;
    public txtGuide: TextField;
    public prod_label_txt: TextField;
    public tSpeed: TextField;
    public bTime: creatureBar;
    public bStorage: creatureBar;
    public tCosts: TextField;
    public tHealth: TextField;
    public housing_txt: TextField;
    public tStorage: TextField;
    public mcImage: MovieClip;
    public mcFrame: frame_CLIP;
    public goo_txt: TextField;
    public tDescription: TextField;
    public tDamage: TextField;
    public damage_txt: TextField;
    public speed_txt: TextField;
    public bHealth: creatureBar;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
