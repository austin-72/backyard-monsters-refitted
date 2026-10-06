import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP, MovieClipUtils, ScrollSet_CLIP, buttonClose_CLIP, creatureBar, frame_CLIP } from "@game";

export class HATCHERYCCPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HATCHERYCCPOPUP_CLIP" });
        as3.fields(this, { tHousingLabel: null, mcRemove6: null, hatchery5: null, mcCount4: null, mcRemove5: null, mcCount5: null, hatchery2: null, hatcheryBG4: null, monsterCanvas: null, mcRemove4: null, mcMonsterInfo: null, hatchery3: null, mcCount2: null, hatcheryBG5: null, monsterMask: null, mcCount3: null, hatchery1: null, bProgress5: null, title_txt: null, mcGoo: null, hatcheryRemove5: null, mcCount1: null, bProgress4: null, bContinue: null, hatcheryRemove4: null, bProgress3: null, txtGuide: null, bProgress2: null, slot1: null, scroller: null, bFinish: null, bProgress1: null, slot2: null, txtGoo: null, txtStorage: null, hatlabel4_txt: null, hatcheryRemove1: null, slot3: null, mcMagma: null, hatlabel5_txt: null, slot4: null, hatcheryRemove3: null, tProgress5: null, slot5: null, txtMagma: null, tGooLabel: null, mcRemove3: null, hatcheryRemove2: null, tProgress4: null, hatcheryBG2: null, mcSlotsGoldFrame: null, slot6: null, bTopupMagma: null, mcRemove2: null, tProgress3: null, hatcheryBG3: null, slot7: null, mcFrame: null, mcOverdrive: null, hatlabel1_txt: null, mcRemove1: null, tProgress2: null, bTopup: null, hatlabel2_txt: null, mcCount6: null, tProgress1: null, hatcheryBG1: null, bSpeedup: null, tMagmaLabel: null, mcStorage: null, hatlabel3_txt: null, mcRemove7: null, mcCount7: null, hatchery4: null });
    }

    public tHousingLabel: TextField;
    public mcRemove6: buttonClose_CLIP;
    public hatchery5: HatcheryMonsterIcon_CLIP;
    public mcCount4: MovieClip;
    public mcRemove5: buttonClose_CLIP;
    public mcCount5: MovieClip;
    public hatchery2: HatcheryMonsterIcon_CLIP;
    public hatcheryBG4: MovieClip;
    public monsterCanvas: MovieClip;
    public mcRemove4: buttonClose_CLIP;
    public mcMonsterInfo: MovieClip;
    public hatchery3: HatcheryMonsterIcon_CLIP;
    public mcCount2: MovieClip;
    public hatcheryBG5: MovieClip;
    public monsterMask: MovieClip;
    public mcCount3: MovieClip;
    public hatchery1: HatcheryMonsterIcon_CLIP;
    public bProgress5: creatureBar;
    public title_txt: TextField;
    public mcGoo: MovieClip;
    public hatcheryRemove5: buttonClose_CLIP;
    public mcCount1: MovieClip;
    public bProgress4: creatureBar;
    public bContinue: Button_CLIP;
    public hatcheryRemove4: buttonClose_CLIP;
    public bProgress3: creatureBar;
    public txtGuide: TextField;
    public bProgress2: creatureBar;
    public slot1: HatcheryMonsterIcon_CLIP;
    public scroller: ScrollSet_CLIP;
    public bFinish: MovieClip;
    public bProgress1: creatureBar;
    public slot2: HatcheryMonsterIcon_CLIP;
    public txtGoo: TextField;
    public txtStorage: TextField;
    public hatlabel4_txt: TextField;
    public hatcheryRemove1: buttonClose_CLIP;
    public slot3: HatcheryMonsterIcon_CLIP;
    public mcMagma: MovieClip;
    public hatlabel5_txt: TextField;
    public slot4: HatcheryMonsterIcon_CLIP;
    public hatcheryRemove3: buttonClose_CLIP;
    public tProgress5: TextField;
    public slot5: HatcheryMonsterIcon_CLIP;
    public txtMagma: TextField;
    public tGooLabel: TextField;
    public mcRemove3: buttonClose_CLIP;
    public hatcheryRemove2: buttonClose_CLIP;
    public tProgress4: TextField;
    public hatcheryBG2: MovieClip;
    public mcSlotsGoldFrame: MovieClip;
    public slot6: HatcheryMonsterIcon_CLIP;
    public bTopupMagma: MovieClip;
    public mcRemove2: buttonClose_CLIP;
    public tProgress3: TextField;
    public hatcheryBG3: MovieClip;
    public slot7: HatcheryMonsterIcon_CLIP;
    public mcFrame: frame_CLIP;
    public mcOverdrive: MovieClip;
    public hatlabel1_txt: TextField;
    public mcRemove1: buttonClose_CLIP;
    public tProgress2: TextField;
    public bTopup: MovieClip;
    public hatlabel2_txt: TextField;
    public mcCount6: MovieClip;
    public tProgress1: TextField;
    public hatcheryBG1: MovieClip;
    public bSpeedup: MovieClip;
    public tMagmaLabel: TextField;
    public mcStorage: MovieClip;
    public hatlabel3_txt: TextField;
    public mcRemove7: buttonClose_CLIP;
    public mcCount7: MovieClip;
    public hatchery4: HatcheryMonsterIcon_CLIP;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
