import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class PopupMonstersA_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupMonstersA_CLIP" });
        as3.fields(this, { mMonstersMask: null, mMonsters: null, bCancel: null, tDesc: null, scroll: null, bTransfer: null });
    }

    public mMonstersMask: MovieClip;
    public mMonsters: MovieClip;
    public bCancel: Button_CLIP;
    public tDesc: TextField;
    public scroll: MovieClip;
    public bTransfer: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
