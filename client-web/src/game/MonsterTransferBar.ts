import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MonsterTransferBar extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterTransferBar" });
        as3.fields(this, { t1: null, b1a: null, r1: null, b1b: null });
    }

    public t1: TextField;
    public b1a: Button_CLIP;
    public r1: TextField;
    public b1b: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
