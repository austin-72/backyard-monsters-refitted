import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { BFOUNDATION, GLOBAL } from "@game";

export class BEXPIRABLE extends BFOUNDATION {
    static {
        as3.fields(this, { _lifeSpan: NaN, _createTime: NaN });
    }

    public _lifeSpan: number;
    public _createTime: number;

    public $ctor(): void {
        super.$ctor();
    }

    public override Tick(param1: int): void {
        super.Tick(param1);
        if (this._buildingProps.lifespan != 0) {
            if (GLOBAL.Timestamp() > this._createTime + this._buildingProps.lifespan) {
                this.RecycleC();
            }
        }
    }

    public override Place(param1: MouseEvent = null): void {
        if (!this._createTime) {
            this._createTime = GLOBAL.Timestamp();
        }
        super.Place(param1);
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        _loc1_.cT = this._createTime;
        return _loc1_;
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        this._createTime = Number(param1.cT);
    }
}
