import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BFOUNDATION } from "@game";

export class PATHINGobject extends ASObject {
    static {
        as3.fields(this, { pointX: 0, pointY: 0, depth: 0, cost: 0, building: null });
    }

    public pointX: int;
    public pointY: int;
    public depth: int;
    public cost: int;
    public building: BFOUNDATION;

    public $ctor(): void {
        super.$ctor();
    }

    public Init(): void {
        this.pointX = 0;
        this.pointY = 0;
        this.depth = 0;
        this.cost = 0;
        this.building = null;
    }

    public get pointID(): int {
        return (this.pointX * 1000 + this.pointY) | 0;
    }
}
