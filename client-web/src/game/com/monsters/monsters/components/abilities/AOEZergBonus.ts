import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { ArmorPropertyModifier, Component, MonsterBase, MultiplicationPropertyModifier, Targeting } from "@game";

export class AOEZergBonus extends Component {
    static {
        as3.fields(this, { m_type: null, m_radius: NaN, m_modifierPerUnit: NaN, m_maxBonus: NaN });
    }

    protected m_type: string;
    protected m_radius: number;
    protected m_modifierPerUnit: number;
    protected m_maxBonus: number;

    public $ctor(param1?: string, param2: number = 200, param3: number = 0.5, param4: number = 10): void {
        super.$ctor();
        this.m_modifierPerUnit = param3;
        this.m_radius = param2;
        this.m_type = param1;
        this.m_maxBonus = param4;
    }

    public override tick(param1: int = 1): void {
        let _loc3_: int = 0;
        let _loc2_: any[] = Targeting.getAllBUTTargetsInRange(this.m_radius, new Point(this.owner.x, this.owner.y), this.owner.targetMode);
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_.length) {
            if (as3.cast(_loc2_.creep, MonsterBase)._creatureID == this.m_type) {
                _loc3_++;
                if (_loc3_ >= this.m_maxBonus) {
                    break;
                }
            }
            _loc4_++;
        }
        let _loc5_: ZergDamageModifier = as3.as(this.owner.damageProperty.getModifierByType(ZergDamageModifier), ZergDamageModifier);
        let _loc6_: ZergArmorModifier = as3.as(this.owner.armorProperty.getModifierByType(ZergArmorModifier), ZergArmorModifier);
        if (_loc3_) {
            if (!_loc5_) {
                _loc5_ = new ZergDamageModifier();
                _loc6_ = new ZergArmorModifier();
            }
            _loc6_.multiple = _loc3_ * this.m_modifierPerUnit;
            _loc5_.multiple = _loc3_ * this.m_modifierPerUnit;
        } else if (_loc5_) {
            this.owner.damageProperty.removeModifier(_loc5_);
            this.owner.armorProperty.removeModifier(_loc6_);
        }
    }
}

class ZergDamageModifier extends MultiplicationPropertyModifier {
    public $ctor(param1: number = 0): void {
        super.$ctor(param1);
    }
}

class ZergArmorModifier extends ArmorPropertyModifier {
    public $ctor(param1: number = 0): void {
        super.$ctor(param1);
    }
}
