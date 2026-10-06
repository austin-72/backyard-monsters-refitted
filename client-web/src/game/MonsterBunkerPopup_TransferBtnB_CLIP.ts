import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP } from "@game";

export class MonsterBunkerPopup_TransferBtnB_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterBunkerPopup_TransferBtnB_CLIP" });
        as3.fields(this, { bRemove: null, tName: null, tHoused: null, mcIcon: null });
    }

    public bRemove: Button_CLIP;
    public tName: TextField;
    public tHoused: TextField;
    public mcIcon: HatcheryMonsterIcon_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
