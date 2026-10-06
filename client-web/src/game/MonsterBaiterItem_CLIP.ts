import * as as3 from "as3";
import { MovieClip, SimpleButton } from "flash/display";
import { TextField } from "flash/text";
import { HatcheryMonsterIcon_CLIP } from "@game";

export class MonsterBaiterItem_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterBaiterItem_CLIP" });
        as3.fields(this, { tInfo: null, tName: null, decr_btn: null, mcIcon: null, incr_btn: null });
    }

    public tInfo: TextField;
    public tName: TextField;
    public decr_btn: SimpleButton;
    public mcIcon: HatcheryMonsterIcon_CLIP;
    public incr_btn: SimpleButton;

    public $ctor(): void {
        super.$ctor();
    }
}
