import * as as3 from "as3";
import { int, uint } from "as3";
import { AOEDamage, GLOBAL, IAttackable, IAttackingComponent, ITargetable } from "@game";

export class AOEDamageOnAttack extends AOEDamage implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
        as3.fields(this, { m_rechargeDuration: 0, m_timeAbilityIsRecharged: 0 });
    }

    protected m_rechargeDuration: int;
    protected m_timeAbilityIsRecharged: number;

    public $ctor(radiusOuter?: uint, targetFlags?: int, maxTargets: uint = 4294967295, radiusInner: uint = 0, includeInitialTarget: boolean = true, rechargeDuration: int = 0): void {
        super.$ctor(radiusOuter, targetFlags, maxTargets, radiusInner, includeInitialTarget);
        this.m_rechargeDuration = rechargeDuration;
    }

    public onAttack(target: IAttackable, damageDealt: number, projectile: ITargetable = null): number {
        if (GLOBAL.Timestamp() >= this.m_timeAbilityIsRecharged) {
            this.dealAOEDamage(damageDealt, target);
        }
        return 0;
    }

    protected override dealAOEDamage(damage: number, initialTarget: IAttackable = null): void {
        super.dealAOEDamage(damage, initialTarget);
        this.m_timeAbilityIsRecharged = GLOBAL.Timestamp() + this.m_rechargeDuration;
    }
}
