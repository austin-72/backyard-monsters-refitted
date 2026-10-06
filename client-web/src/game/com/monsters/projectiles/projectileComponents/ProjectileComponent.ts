import * as as3 from "as3";
import { Component, IAttackable, IAttackingComponent, ITargetable } from "@game";

export class ProjectileComponent extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
    }

    public $ctor(): void {
        super.$ctor();
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        return 0;
    }
}
