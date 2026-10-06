import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { BTOWER, BaseBuff, InstanceManager, MultiplicationPropertyModifier } from "@game";

export class TowerDamageBuff extends BaseBuff {
    public static readonly ID: uint = 6;

    public $ctor(): void {
        super.$ctor("Tower Damage", "bufficons/towerdamagebuff.png");
    }

    public override get description(): string {
        return "";
    }

    public override apply(): void {
        let _loc3_: BTOWER = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BTOWER);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BTOWER);
            _loc3_.damageProperty.addModifier(new TowerDamageMultiplier(this.getValue() * 0.01 + 1));
            _loc2_++;
        }
    }

    public override clear(): void {
        let _loc3_: BTOWER = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BTOWER);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BTOWER);
            _loc3_.damageProperty.removeModifier(_loc3_.damageProperty.getModifierByType(TowerDamageMultiplier));
            _loc2_++;
        }
    }
}

class TowerDamageMultiplier extends MultiplicationPropertyModifier {
    public $ctor(param1?: number): void {
        super.$ctor(param1);
    }
}
