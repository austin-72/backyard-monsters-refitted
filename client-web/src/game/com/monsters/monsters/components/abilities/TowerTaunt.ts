import * as as3 from "as3";
import { int, uint } from "as3";
import { Point } from "flash/geom";
import { BTOWER, Component, Targeting } from "@game";

export class TowerTaunt extends Component {
    static {
        as3.fields(this, { m_radius: 0 });
    }

    protected m_radius: uint;

    public $ctor(param1: uint = 500): void {
        super.$ctor();
        this.m_radius = param1;
    }

    public override tick(param1: int = 1): void {
        let _loc4_: BTOWER = null;
        let _loc2_: any[] = Targeting.getBuildingsInRange(this.m_radius, new Point(this.owner.x, this.owner.y));
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            if (_loc2_[_loc3_] instanceof BTOWER) {
                (_loc4_ = as3.as(_loc2_[_loc3_].creep, BTOWER)).setTarget(this.owner);
            }
            _loc3_++;
        }
    }
}
