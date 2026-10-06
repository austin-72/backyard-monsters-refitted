import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP, MovieClipUtils, ScrollSet_CLIP, buttonClose_CLIP, creatureBar, frame_CLIP } from "@game";

export class HATCHERYPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HATCHERYPOPUP_CLIP" });
        as3.fields(this, { mcCount4: null, monsterCanvas: null, mcRemove4: null, tProgress: null, mcCount2: null, mcMonsterInfo: null, monsterMask: null, mcCount3: null, title_txt: null, mcCount1: null, bProgress: null, bContinue: null, slot0: null, txtGuide: null, bFinish: null, slot1: null, scroller: null, slot2: null, slot3: null, slot4: null, mcRemove3: null, portrait1: null, mcRemove2: null, mcFrame: null, mcOverdrive: null, mcRemove1: null, mcMessage: null, mcRemove0: null, bSpeedup: null });
    }

    public mcCount4: MovieClip;
    public monsterCanvas: MovieClip;
    public mcRemove4: buttonClose_CLIP;
    public tProgress: TextField;
    public mcCount2: MovieClip;
    public mcMonsterInfo: MovieClip;
    public monsterMask: MovieClip;
    public mcCount3: MovieClip;
    public title_txt: TextField;
    public mcCount1: MovieClip;
    public bProgress: creatureBar;
    public bContinue: Button_CLIP;
    public slot0: HatcheryMonsterIcon_CLIP;
    public txtGuide: TextField;
    public bFinish: MovieClip;
    public slot1: HatcheryMonsterIcon_CLIP;
    public scroller: ScrollSet_CLIP;
    public slot2: HatcheryMonsterIcon_CLIP;
    public slot3: HatcheryMonsterIcon_CLIP;
    public slot4: HatcheryMonsterIcon_CLIP;
    public mcRemove3: buttonClose_CLIP;
    public portrait1: MovieClip;
    public mcRemove2: buttonClose_CLIP;
    public mcFrame: frame_CLIP;
    public mcOverdrive: MovieClip;
    public mcRemove1: buttonClose_CLIP;
    public mcMessage: MovieClip;
    public mcRemove0: buttonClose_CLIP;
    public bSpeedup: MovieClip;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
