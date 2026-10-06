import * as as3 from "as3";
import { uint } from "as3";
import { FlameEffect, IAttackable, ITargetable, MonsterBase, ProjectileComponent } from "@game";

export class SetFireProjectileComponent extends ProjectileComponent {
    static {
        as3.fields(this, { m_DoT: 0 });
    }

    private m_DoT: uint;

    public $ctor(param1?: uint): void {
        super.$ctor();
        this.m_DoT = param1;
    }

    public override onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        if (param1 instanceof MonsterBase) {
            as3.cast(param1, MonsterBase).addStatusEffect(new FlameEffect(this.owner, this.m_DoT));
        }
        return param2;
    }
}
