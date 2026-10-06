import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class PopupInfoMine_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupInfoMine_CLIP" });
        as3.fields(this, { mMonstersMask: null, mcArrow: null, tName: null, bInviteMigrate: null, mMonsters: null, tHeight: null, tLabel1: null, bOpen: null, tLabel2: null, txtButtonInfo: null, tLabel3: null, tBonus: null, bMonsters: null, tLabel4: null, tLocation: null, scroll: null, mcFrame: null, bRelocate: null, bBookmark: null });
    }

    public mMonstersMask: MovieClip;
    public mcArrow: MovieClip;
    public tName: TextField;
    public bInviteMigrate: Button_CLIP;
    public mMonsters: MovieClip;
    public tHeight: TextField;
    public tLabel1: TextField;
    public bOpen: Button_CLIP;
    public tLabel2: TextField;
    public txtButtonInfo: TextField;
    public tLabel3: TextField;
    public tBonus: TextField;
    public bMonsters: Button_CLIP;
    public tLabel4: TextField;
    public tLocation: TextField;
    public scroll: MovieClip;
    public mcFrame: frame_CLIP;
    public bRelocate: Button_CLIP;
    public bBookmark: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        if (this.mcArrow) {
            this.mcArrow.stop();
        }
    }
}
