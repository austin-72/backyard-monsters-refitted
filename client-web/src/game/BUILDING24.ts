import { Rectangle } from "flash/geom";
import { BTRAP } from "@game";

export class BUILDING24 extends BTRAP {
    public $ctor(): void {
        super.$ctor();
        this._type = 24;
        this._footprint = [new Rectangle(0, 0, 20, 20)];
        this.SetProps();
    }
}
