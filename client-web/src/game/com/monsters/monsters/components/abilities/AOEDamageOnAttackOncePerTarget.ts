import * as as3 from "as3";
import { int, uint } from "as3";
import { AOEDamageOnAttack, GLOBAL, IAttackable, ITargetable } from "@game";

export class AOEDamageOnAttackOncePerTarget extends AOEDamageOnAttack {
    static {
        as3.fields(this, { m_lastTarget: null, m_damageMultiplier: NaN });
    }

    protected m_lastTarget: IAttackable;
    protected m_damageMultiplier: number;

    public $ctor(radiusOuter?: uint, targetFlags?: int, damageMultiplier: any /* number */ = 1, maxTargets: uint = 4294967295, radiusInner: any /* uint */ = 0, includeInitialTarget: any /* boolean */ = true, rechargeDuration: int = 0): void {
        super.$ctor(radiusOuter, targetFlags, maxTargets, radiusInner, includeInitialTarget, rechargeDuration);
        this.m_damageMultiplier = damageMultiplier;
    }

    public override onAttack(target: IAttackable, damageDealt: number, projectile: ITargetable = null): number {
        if (GLOBAL.Timestamp() > this.m_timeAbilityIsRecharged && target != this.m_lastTarget) {
            this.dealAOEDamage(damageDealt * this.m_damageMultiplier, target);
            this.m_lastTarget = target;
        }
        return 0;
    }
}
