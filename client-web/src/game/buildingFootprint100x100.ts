import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class buildingFootprint100x100 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "buildingFootprint100x100" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}
