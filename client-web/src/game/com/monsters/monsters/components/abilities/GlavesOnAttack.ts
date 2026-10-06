import * as as3 from "as3";
import { uint } from "as3";
import { Component, FIREBALL, IAttackable, IAttackingComponent, ITargetable } from "@game";

export class GlavesOnAttack extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
        as3.fields(this, { m_amountOfGlaves: 0 });
    }

    protected m_amountOfGlaves: uint;

    public $ctor(param1?: uint): void {
        super.$ctor();
        this.m_amountOfGlaves = param1;
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        if (Boolean(param3) && param3 instanceof FIREBALL) {
            as3.cast(param3, FIREBALL)._glaves = this.m_amountOfGlaves;
        }
        return 0;
    }
}
