import * as as3 from "as3";
import { int } from "as3";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL, KEYS, PATHING } from "@game";

export class BWALL extends BFOUNDATION {
    public $ctor(): void {
        super.$ctor();
    }

    public override GridCost(param1: boolean = true): void {
        super.GridCost(param1);
        PATHING.RegisterBuilding(new Rectangle(this._mc.x, this._mc.y, 20, 20), this, param1);
    }

    public override Description(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        super.Description();
        if (this._lvl.Get() < this._buildingProps.hp.length) {
            _loc1_ = this._buildingProps.hp[this._lvl.Get() - 1] | 0;
            _loc2_ = this._buildingProps.hp[this._lvl.Get()] | 0;
            this._upgradeDescription = KEYS.Get("building_wall_upgrade", { "v1": GLOBAL.FormatNumber(_loc1_), "v2": GLOBAL.FormatNumber(_loc2_), "v3": ((100 / _loc1_ * _loc2_) | 0) - 100 });
        }
    }

    public override RecycleC(): void {
        PATHING.RegisterBuilding(new Rectangle(this._mc.x, this._mc.y, 20, 20), this, false);
        super.RecycleC();
    }
}
