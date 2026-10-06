import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { buttonDefenseEvent_CLIP, buttonFullscreen_CLIP, buttonMusic_CLIP, buttonProtection_CLIP, buttonReinforcement_CLIP, buttonSaving_CLIP, buttonSound_CLIP, buttonZoom_CLIP } from "@game";

export class UI_TOP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_TOP_CLIP" });
        as3.fields(this, { mcZoom: null, mcProtected: null, mcFullscreen: null, mcSave: null, mcBuffHolder: null, mcSpecialEvent: null, mcSound: null, mc: null, mcMusic: null, mcReinforcements: null });
    }

    public mcZoom: buttonZoom_CLIP;
    public mcProtected: buttonProtection_CLIP;
    public mcFullscreen: buttonFullscreen_CLIP;
    public mcSave: buttonSaving_CLIP;
    public mcBuffHolder: MovieClip;
    public mcSpecialEvent: buttonDefenseEvent_CLIP;
    public mcSound: buttonSound_CLIP;
    public mc: MovieClip;
    public mcMusic: buttonMusic_CLIP;
    public mcReinforcements: buttonReinforcement_CLIP;

    public $ctor(): void {
        super.$ctor();
        if (this.mc && this.mc.mcPoints) {
            this.mc.mcPoints.stop();
        }
    }
}
