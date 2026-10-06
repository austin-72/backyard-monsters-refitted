import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { ButtonBrown_CLIP, Button_CLIP, GuardianCage_DNABar, MapRoomPopupInfoMonster_CLIP, MovieClipUtils, creatureBarGuardian, frame_CLIP, koth_looted_marker, meterBar_rounded_blue_CLIP, meterBar_rounded_red_CLIP } from "@game";

export class GUARDIANCAGEPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "GUARDIANCAGEPOPUP_CLIP" });
        as3.fields(this, { buff_txt: null, p3_abilities_txt: null, p3_bLootLeft: null, p3_bSpeed: null, p3_mcImage: null, bSpeed: null, tBuffDesc: null, damage_txt2: null, day1: null, p3_speed_txt: null, barHP: null, day2: null, p3_damage_txt: null, buff_txt2: null, tHealth2: null, day3: null, p3_mcAbility1: null, p3_tKothLevel: null, bBuff: null, tNextFeedTitle: null, p3_buff_txt: null, p3_tDamage: null, p3_bHealth: null, bDamage: null, bEvolve: null, p3_tDescription2: null, p3_timeleft_txt: null, p3_tSpeed: null, health_txt: null, health_txt2: null, tBuff2: null, mcNextGuardian: null, p3_tTimeleft: null, p3_tHP: null, b1: null, mcInstant: null, p3_bTimeleft: null, b2: null, tTitle: null, tSpeed: null, tSpeed2: null, b3: null, tHealth: null, bDamage2: null, mcFeed1: null, p3_gRankBG: null, p3_looted_txt: null, p3_bDamage: null, tFeedsFrom: null, barDNA: null, mcFeed2: null, p3_bHeal: null, bHeal: null, mcCurrGuardian: null, p3_health_txt: null, p3_tBuff: null, p3_bHP: null, tEvoDesc: null, tEvoStage: null, mcImage: null, speed_txt2: null, bHealth2: null, p3_mcLootMark2: null, p3_tDescription: null, mcFrame: null, tHP: null, tBuff: null, bFeedTimer: null, barDNA_mask: null, window: null, tDamage: null, bSpeed2: null, gFeedBG: null, damage_txt: null, speed_txt: null, bHealth: null, tNextFeed: null, tDamage2: null, bBuff2: null, barDNA_bg: null, p3_mcLootMark1: null, p3_tLootLeft: null, p3_tHealth: null, p3_bBuff: null });
    }

    public buff_txt: TextField;
    public p3_abilities_txt: TextField;
    public p3_bLootLeft: meterBar_rounded_red_CLIP;
    public p3_bSpeed: creatureBarGuardian;
    public p3_mcImage: MovieClip;
    public bSpeed: creatureBarGuardian;
    public tBuffDesc: TextField;
    public damage_txt2: TextField;
    public day1: MovieClip;
    public p3_speed_txt: TextField;
    public barHP: MovieClip;
    public day2: MovieClip;
    public p3_damage_txt: TextField;
    public buff_txt2: TextField;
    public tHealth2: TextField;
    public day3: MovieClip;
    public p3_mcAbility1: MovieClip;
    public p3_tKothLevel: TextField;
    public bBuff: creatureBarGuardian;
    public tNextFeedTitle: TextField;
    public p3_buff_txt: TextField;
    public p3_tDamage: TextField;
    public p3_bHealth: creatureBarGuardian;
    public bDamage: creatureBarGuardian;
    public bEvolve: Button_CLIP;
    public p3_tDescription2: TextField;
    public p3_timeleft_txt: TextField;
    public p3_tSpeed: TextField;
    public health_txt: TextField;
    public health_txt2: TextField;
    public tBuff2: TextField;
    public mcNextGuardian: MovieClip;
    public p3_tTimeleft: TextField;
    public p3_tHP: TextField;
    public b1: ButtonBrown_CLIP;
    public mcInstant: MovieClip;
    public p3_bTimeleft: meterBar_rounded_blue_CLIP;
    public b2: ButtonBrown_CLIP;
    public tTitle: TextField;
    public tSpeed: TextField;
    public tSpeed2: TextField;
    public b3: ButtonBrown_CLIP;
    public tHealth: TextField;
    public bDamage2: creatureBarGuardian;
    public mcFeed1: MapRoomPopupInfoMonster_CLIP;
    public p3_gRankBG: MovieClip;
    public p3_looted_txt: TextField;
    public p3_bDamage: creatureBarGuardian;
    public tFeedsFrom: TextField;
    public barDNA: GuardianCage_DNABar;
    public mcFeed2: MapRoomPopupInfoMonster_CLIP;
    public p3_bHeal: Button_CLIP;
    public bHeal: Button_CLIP;
    public mcCurrGuardian: MovieClip;
    public p3_health_txt: TextField;
    public p3_tBuff: TextField;
    public p3_bHP: MovieClip;
    public tEvoDesc: TextField;
    public tEvoStage: TextField;
    public mcImage: MovieClip;
    public speed_txt2: TextField;
    public bHealth2: creatureBarGuardian;
    public p3_mcLootMark2: koth_looted_marker;
    public p3_tDescription: TextField;
    public mcFrame: frame_CLIP;
    public tHP: TextField;
    public tBuff: TextField;
    public bFeedTimer: MovieClip;
    public barDNA_mask: MovieClip;
    public window: MovieClip;
    public tDamage: TextField;
    public bSpeed2: creatureBarGuardian;
    public gFeedBG: MovieClip;
    public damage_txt: TextField;
    public speed_txt: TextField;
    public bHealth: creatureBarGuardian;
    public tNextFeed: TextField;
    public tDamage2: TextField;
    public bBuff2: creatureBarGuardian;
    public barDNA_bg: GuardianCage_DNABar;
    public p3_mcLootMark1: koth_looted_marker;
    public p3_tLootLeft: TextField;
    public p3_tHealth: TextField;
    public p3_bBuff: creatureBarGuardian;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}
