import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class screenshot_ui_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "screenshot_ui_CLIP" });
        as3.fields(this, { bContrastUp: null, tBrightness: null, bGrainDown: null, tTilt: null, tContrast: null, bTiltUp: null, bPreset6: null, tSaturation: null, bPreset4: null, bContrastDown: null, bBrightnessUp: null, bPreset5: null, bSaturationUp: null, bPreset2: null, tGrain: null, bSave1: null, bPreset3: null, bTiltDown: null, bSave2: null, bPreset1: null, bSave3: null, mcImage: null, bGrainUp: null, bBrightnessDown: null, bSaturationDown: null });
    }

    public bContrastUp: Button_CLIP;
    public tBrightness: TextField;
    public bGrainDown: Button_CLIP;
    public tTilt: TextField;
    public tContrast: TextField;
    public bTiltUp: Button_CLIP;
    public bPreset6: Button_CLIP;
    public tSaturation: TextField;
    public bPreset4: Button_CLIP;
    public bContrastDown: Button_CLIP;
    public bBrightnessUp: Button_CLIP;
    public bPreset5: Button_CLIP;
    public bSaturationUp: Button_CLIP;
    public bPreset2: Button_CLIP;
    public tGrain: TextField;
    public bSave1: Button_CLIP;
    public bPreset3: Button_CLIP;
    public bTiltDown: Button_CLIP;
    public bSave2: Button_CLIP;
    public bPreset1: Button_CLIP;
    public bSave3: Button_CLIP;
    public mcImage: MovieClip;
    public bGrainUp: Button_CLIP;
    public bBrightnessDown: Button_CLIP;
    public bSaturationDown: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
