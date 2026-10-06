import * as as3 from "as3";
import { int, uint } from "as3";
import { AOEDamageOnAttack } from "@game";

export class BanditoAOEDamageSpin extends AOEDamageOnAttack {
    public $ctor(radiusOuter?: uint, targetFlags?: int, radiusInner: uint = 0, includeInitialTarget: any /* boolean */ = true, maxTargets: any /* uint */ = 4294967295, rechargeDuration: int = 0): void {
        super.$ctor(radiusOuter, targetFlags, maxTargets, radiusInner, includeInitialTarget, rechargeDuration);
    }

    public override tick(param1: int = 1): void {
        if (Boolean(this.owner._targetCreep) && this.owner._atTarget) {
            this.owner._lockRotation = true;
            this.owner._targetRotation += this.owner.attackCooldown * (6 * (0.5 + this.owner.powerUpLevel() * 0.5));
        } else {
            this.owner._lockRotation = false;
        }
    }

    protected override onRegister(): void {
        this.owner.attackDelayProperty.value = this.owner.attackDelay / (1 + this.owner.powerUpLevel() * 0.5);
    }
}
