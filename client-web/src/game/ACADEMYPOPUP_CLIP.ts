import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { BUILDINGSARROW, Button_CLIP, creatureBar, frame_CLIP } from "@game";

export class ACADEMYPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ACADEMYPOPUP_CLIP" });
        as3.fields(this, { bNext: null, tResourceA: null, bDamageA: null, bA: null, tResourceB: null, bB: null, tStorageB: null, tHealthB: null, time_txt: null, tName: null, tHealthA: null, bStorageB: null, tDamageB: null, tTimeA: null, bStorageA: null, bSpeedA: null, bPrevious: null, tTimeB: null, tDamageA: null, bSpeedB: null, bContinue: null, health_txt: null, txtGuide: null, housing_txt: null, after_txt: null, bHealthB: null, bResourceA: null, mcImage: null, bResourceB: null, mcFrame: null, tSpeedA: null, before_txt: null, bDamageB: null, bTimeA: null, tSpeedB: null, bTimeB: null, bHealthA: null, tStorageA: null, cost_txt: null, damage_txt: null, speed_txt: null });
    }

    public bNext: BUILDINGSARROW;
    public tResourceA: TextField;
    public bDamageA: creatureBar;
    public bA: MovieClip;
    public tResourceB: TextField;
    public bB: MovieClip;
    public tStorageB: TextField;
    public tHealthB: TextField;
    public time_txt: TextField;
    public tName: TextField;
    public tHealthA: TextField;
    public bStorageB: creatureBar;
    public tDamageB: TextField;
    public tTimeA: TextField;
    public bStorageA: creatureBar;
    public bSpeedA: creatureBar;
    public bPrevious: BUILDINGSARROW;
    public tTimeB: TextField;
    public tDamageA: TextField;
    public bSpeedB: creatureBar;
    public bContinue: Button_CLIP;
    public health_txt: TextField;
    public txtGuide: TextField;
    public housing_txt: TextField;
    public after_txt: TextField;
    public bHealthB: creatureBar;
    public bResourceA: creatureBar;
    public mcImage: MovieClip;
    public bResourceB: creatureBar;
    public mcFrame: frame_CLIP;
    public tSpeedA: TextField;
    public before_txt: TextField;
    public bDamageB: creatureBar;
    public bTimeA: creatureBar;
    public tSpeedB: TextField;
    public bTimeB: creatureBar;
    public bHealthA: creatureBar;
    public tStorageA: TextField;
    public cost_txt: TextField;
    public damage_txt: TextField;
    public speed_txt: TextField;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
