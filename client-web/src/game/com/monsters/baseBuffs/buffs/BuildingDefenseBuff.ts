import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { ArmorPropertyModifier, BFOUNDATION, BaseBuff, InstanceManager } from "@game";

export class BuildingDefenseBuff extends BaseBuff {
    public static readonly ID: uint = 1;

    public $ctor(): void {
        super.$ctor("Tower Defense", "bufficons/towerdefensebuff.png");
    }

    public override get description(): string {
        return "";
    }

    public override apply(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BFOUNDATION);
            _loc3_.armorProperty.addModifier(new BuildingDefenseMultiplier(this.getValue() * 0.01));
            _loc2_++;
        }
    }

    public override clear(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BFOUNDATION);
            _loc3_.armorProperty.removeModifier(_loc3_.damageProperty.getModifierByType(BuildingDefenseMultiplier));
            _loc2_++;
        }
    }
}

class BuildingDefenseMultiplier extends ArmorPropertyModifier {
    public $ctor(param1?: number): void {
        super.$ctor(param1);
    }
}
