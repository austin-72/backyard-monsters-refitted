import { Rectangle } from "flash/geom";
import { BMUSHROOM } from "@game";

export class BUILDING7 extends BMUSHROOM {
    public $ctor(): void {
        super.$ctor();
        this._type = 7;
        this._footprint = [new Rectangle(0, 0, 30, 30)];
        this._gridCost = [[new Rectangle(0, 0, 30, 30), 10]];
        this.SetProps();
    }
}
