import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class MonsterLabItem_Star_340 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "SWC_ALL_fla.MonsterLabItem_Star_340" });
        as3.fields(this, { tLevel: null });
    }

    public tLevel: TextField;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
