import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { AOEDamageOnDeath, AcidOnDeath, AdditionPropertyModifier, BFOUNDATION, CreepBase, IAttackable, ITargetable, MonsterBase, Targeting } from "@game";

export class ProjectXv2 extends CreepBase {
    static {
        as3.fields(this, { m_damageComponent: null, m_acidComponent: null, m_lastingDamageModifier: null });
    }

    private m_damageComponent: AOEDamageOnDeath;
    private m_acidComponent: AcidOnDeath;
    private m_lastingDamageModifier: AdditionPropertyModifier;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        let _loc13_: any = 0;
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        _loc13_ = Targeting.k_TARGETS_BUILDINGS | Targeting.k_TARGETS_GROUND;
        if (param8) {
            _loc13_ |= Targeting.k_TARGETS_ATTACKERS;
        } else {
            _loc13_ |= Targeting.k_TARGETS_DEFENDERS;
        }
        this.m_damageComponent = as3.as(this.addComponent(new AOEDamageOnDeath(60, _loc13_ | 0)), AOEDamageOnDeath);
        this.m_acidComponent = as3.as(this.addComponent(new AcidOnDeath(60, 100, 10)), AcidOnDeath);
        this.m_lastingDamageModifier = new AdditionPropertyModifier();
        this.damageProperty.addModifier(this.m_lastingDamageModifier);
    }

    protected override attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        ++this.m_lastingDamageModifier.value;
        super.attacked(param1, param2, param3);
    }

    public override die(): void {
        super.die();
    }
}
