import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP } from "@game";

export class MonsterBunkerPopup_TransferBtnA_CLIP_Persistant extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterBunkerPopup_TransferBtnA_CLIP_Persistant" });
        as3.fields(this, { tName: null, tHoused: null, bAdd: null, tSize: null, mcIcon: null });
    }

    public tName: TextField;
    public tHoused: TextField;
    public bAdd: Button_CLIP;
    public tSize: TextField;
    public mcIcon: HatcheryMonsterIcon_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
