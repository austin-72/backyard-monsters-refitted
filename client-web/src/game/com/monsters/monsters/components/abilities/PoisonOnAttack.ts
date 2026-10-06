import * as as3 from "as3";
import { Component, DOTEffect, IAttackable, IAttackingComponent, ITargetable, MonsterBase } from "@game";

export class PoisonOnAttack extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
    }

    public $ctor(): void {
        super.$ctor();
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        let _loc4_: MonsterBase = null;
        if (param1 instanceof MonsterBase) {
            (_loc4_ = as3.as(param1, MonsterBase)).addStatusEffect(new DOTEffect(_loc4_, this.owner.damage * this.owner.powerUpLevel() * 0.1));
        }
        return 0;
    }
}
