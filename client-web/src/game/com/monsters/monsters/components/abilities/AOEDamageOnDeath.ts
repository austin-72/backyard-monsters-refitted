import * as as3 from "as3";
import { int, uint } from "as3";
import { Event } from "flash/events";
import { AOEDamage, MonsterBase } from "@game";

export class AOEDamageOnDeath extends AOEDamage {
    public $ctor(radiusOuter?: uint, targetFlags?: int, maxTargets: uint = 4294967295): void {
        super.$ctor(radiusOuter, targetFlags, maxTargets);
    }

    protected override onRegister(): void {
        this.owner.addEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    protected override onUnregister(): void {
        this.owner.removeEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    protected onDeath(param1: Event = null): void {
        let _loc2_: number = this.owner.damage * (1 + this.owner.powerUpLevel() * 0.5);
        this.dealAOEDamage(_loc2_);
    }
}
