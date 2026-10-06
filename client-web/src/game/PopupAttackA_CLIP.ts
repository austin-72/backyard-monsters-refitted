import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class PopupAttackA_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupAttackA_CLIP" });
        as3.fields(this, { mMonstersMask: null, mMonsters: null, bCancel: null, bAttack: null, tAttackText: null, tCatapult: null, tMonsters: null, mcAlliancePic: null, scroll: null, mcFrame: null, mcProfilePic: null });
    }

    public mMonstersMask: MovieClip;
    public mMonsters: MovieClip;
    public bCancel: Button_CLIP;
    public bAttack: Button_CLIP;
    public tAttackText: TextField;
    public tCatapult: TextField;
    public tMonsters: TextField;
    public mcAlliancePic: MovieClip;
    public scroll: MovieClip;
    public mcFrame: frame_CLIP;
    public mcProfilePic: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
