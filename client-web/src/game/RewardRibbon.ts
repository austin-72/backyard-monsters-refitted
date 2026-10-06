import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class RewardRibbon extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "RewardRibbon" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
