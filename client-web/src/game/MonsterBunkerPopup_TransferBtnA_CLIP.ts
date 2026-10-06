import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP } from "@game";

export class MonsterBunkerPopup_TransferBtnA_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterBunkerPopup_TransferBtnA_CLIP" });
        as3.fields(this, { bRemove: null, tName: null, tSelected: null, tHoused: null, bAdd: null, mcIcon: null });
    }

    public bRemove: Button_CLIP;
    public tName: TextField;
    public tSelected: TextField;
    public tHoused: TextField;
    public bAdd: Button_CLIP;
    public mcIcon: HatcheryMonsterIcon_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
