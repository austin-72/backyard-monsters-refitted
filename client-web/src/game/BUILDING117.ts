import * as as3 from "as3";
import { int } from "as3";
import { Rectangle } from "flash/geom";
import { ACHIEVEMENTS, BHEAVYTRAP } from "@game";

export class BUILDING117 extends BHEAVYTRAP {
    public $ctor(): void {
        super.$ctor();
        this._type = 117;
        this._footprint = [new Rectangle(0, 0, 20, 20)];
        this.SetProps();
    }

    public override Constructed(): void {
        ACHIEVEMENTS._stats["heavytraps"] = (ACHIEVEMENTS._stats["heavytraps"] | 0) + 1;
        ACHIEVEMENTS.Check();
        super.Constructed();
    }
}
