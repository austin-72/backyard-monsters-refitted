import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOTEM, BaseTemplateNode, GRID, PlannerTemplate, SecNum } from "@game";

export class InventoryManager extends ASObject {
    public $ctor(param1?: InstanceEnforcer): void {
        super.$ctor();
    }

    public static buildingStorageAdd(param1: int, param2: int = 0): void {
        if (!BASE._buildingsStored["b" + param1]) {
            BASE._buildingsStored["b" + param1] = new SecNum(0);
        }
        BASE._buildingsStored["b" + param1].Add(1);
        if (BTOTEM.IsTotem(param1) || BTOTEM.IsTotem2(param1)) {
            BASE._buildingsStored["bl" + param1] = new SecNum(param2);
        }
    }

    public static buildingStorageRemove(param1: int): int {
        let _loc2_: int = 0;
        if (BASE._buildingsStored["b" + param1]) {
            if (BASE._buildingsStored["b" + param1].Get() >= 1) {
                BASE._buildingsStored["b" + param1].Add(-1);
                _loc2_ = 1;
                if (BASE._buildingsStored["bl" + param1]) {
                    _loc2_ = BASE._buildingsStored["bl" + param1].Get() | 0;
                    delete BASE._buildingsStored["bl" + param1];
                }
                return _loc2_;
            }
        }
        return 0;
    }

    public static buildingStorageCount(param1: int): int {
        if (BASE._buildingsStored["b" + param1]) {
            return BASE._buildingsStored["b" + param1].Get() | 0;
        }
        return 0;
    }

    public static getBuildingFromNode(param1: BaseTemplateNode): BFOUNDATION {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc2_: Point = GRID.ToISO(param1.x, param1.y, 0);
        if (param1.id == PlannerTemplate._DECORATION_ID) {
            _loc4_ = param1.type | 0;
            _loc3_ = BASE.addBuildingC(_loc4_);
            _loc5_ = { "X": param1.x, "Y": param1.y, "t": _loc4_, "id": BASE._buildingCount++ };
            if (BASE._buildingsStored["bl" + _loc4_]) {
                _loc5_.l = BASE._buildingsStored["bl" + _loc4_].Get();
            }
            _loc3_.Setup(_loc5_);
            param1.id = _loc3_._id >>> 0;
            BASE._buildingsStored["b" + _loc4_].Set(BASE._buildingsStored["b" + _loc4_].Get() - 1);
        } else {
            _loc3_ = BASE.getBuildingByID(param1.id);
        }
        return _loc3_;
    }
}

class InstanceEnforcer extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
