import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { HatcheryMonsterIcon_CLIP } from "@game";

export class HousingPopupMonster_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HousingPopupMonster_CLIP" });
        as3.fields(this, { tInfo: null, tName: null, mcIcon: null });
    }

    public tInfo: TextField;
    public tName: TextField;
    public mcIcon: HatcheryMonsterIcon_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
