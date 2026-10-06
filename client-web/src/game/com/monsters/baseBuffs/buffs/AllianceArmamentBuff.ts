import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { BFOUNDATION, BTOWER, BTRAP, BWALL, BaseBuff, InstanceManager, KEYS, MapRoomManager, MultiplicationPropertyModifier } from "@game";

export class AllianceArmamentBuff extends BaseBuff {
    public static readonly k_ArmorMultiplier: number = 1.5;

    public static readonly k_DamageMultiplier: number = 1.25;

    public static readonly ID: uint = 8;

    public $ctor(): void {
        super.$ctor("ap_armament");
    }

    public override get description(): string {
        return KEYS.Get(MapRoomManager.instance.isInMapRoom2 ? "ap_armament_desc" : "nwm_ap_armament_desc");
    }

    public override apply(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: BTRAP = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BFOUNDATION);
            if (_loc3_ instanceof BTOWER || _loc3_ instanceof BWALL) {
                _loc3_.maxHealthProperty.store();
                _loc3_.maxHealthProperty.addModifier(new ArmamentBuildingDefenseMultiplier());
                _loc3_.maxHealthProperty.updateHealth();
            }
            _loc2_++;
        }
        _loc1_ = InstanceManager.getInstancesByClass(BTRAP);
        _loc2_ = 0;
        while (_loc2_ < _loc1_.length) {
            (_loc4_ = as3.as(as3.vget(_loc1_, _loc2_), BTRAP)).damageProperty.addModifier(new ArmamentTrapDamageMultiplier());
            _loc2_++;
        }
    }

    public override clear(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: BTRAP = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(as3.vget(_loc1_, _loc2_), BFOUNDATION);
            if (_loc3_ instanceof BTOWER || _loc3_ instanceof BWALL) {
                _loc3_.maxHealthProperty.store();
                _loc3_.maxHealthProperty.removeModifier(_loc3_.maxHealthProperty.getModifierByType(ArmamentBuildingDefenseMultiplier));
                _loc3_.maxHealthProperty.updateHealth();
            }
            _loc2_++;
        }
        _loc1_ = InstanceManager.getInstancesByClass(BTRAP);
        _loc2_ = 0;
        while (_loc2_ < _loc1_.length) {
            (_loc4_ = as3.as(as3.vget(_loc1_, _loc2_), BTRAP)).damageProperty.removeModifier(_loc4_.damageProperty.getModifierByType(ArmamentTrapDamageMultiplier));
            _loc2_++;
        }
    }
}

class ArmamentBuildingDefenseMultiplier extends MultiplicationPropertyModifier {
    public $ctor(): void {
        super.$ctor(AllianceArmamentBuff.k_ArmorMultiplier);
    }
}

class ArmamentTrapDamageMultiplier extends MultiplicationPropertyModifier {
    public $ctor(): void {
        super.$ctor(AllianceArmamentBuff.k_DamageMultiplier);
    }
}
