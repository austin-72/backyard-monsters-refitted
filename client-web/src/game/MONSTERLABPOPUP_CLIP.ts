import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils, creatureBarAdv, frame_CLIP } from "@game";

export class MONSTERLABPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MONSTERLABPOPUP_CLIP" });
        as3.fields(this, { tStatusDesc: null, tStatusTitle: null, tStatsPBarLabel: null, tProgress: null, tStatsPBar: null, title_txt: null, bContinue: null, mcList: null, txtGuide: null, tStatsWarning: null, mcInstant: null, tIdle: null, mcResources: null, mcPBarStatus: null, mcPBarStats: null, mcStatusIcon: null, mcFrame: null, tStatsTitle: null, bAction: null, mcPortraitIcon: null });
    }

    public tStatusDesc: TextField;
    public tStatusTitle: TextField;
    public tStatsPBarLabel: TextField;
    public tProgress: TextField;
    public tStatsPBar: TextField;
    public title_txt: TextField;
    public bContinue: Button_CLIP;
    public mcList: MovieClip;
    public txtGuide: TextField;
    public tStatsWarning: TextField;
    public mcInstant: MovieClip;
    public tIdle: TextField;
    public mcResources: MovieClip;
    public mcPBarStatus: creatureBarAdv;
    public mcPBarStats: creatureBarAdv;
    public mcStatusIcon: MovieClip;
    public mcFrame: frame_CLIP;
    public tStatsTitle: TextField;
    public bAction: Button_CLIP;
    public mcPortraitIcon: MovieClip;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
