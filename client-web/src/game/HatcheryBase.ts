import * as as3 from "as3";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, SecNum } from "@game";

export class HatcheryBase extends BFOUNDATION {
    static {
        as3.fields(this, { _finishCost: null, _finishQueue: null, _finishAll: true });
    }

    public _finishCost: SecNum;
    public _finishQueue: any;
    public _finishAll: boolean;

    public $ctor(): void {
        this._finishQueue = {};
        super.$ctor();
        this._footprint = [new Rectangle(0, 0, 100, 100)];
        this._gridCost = [[new Rectangle(0, 0, 100, 100), 10], [new Rectangle(10, 10, 80, 80), 200]];
        this._monsterQueue = [];
        this._finishCost = new SecNum(0);
    }
}
