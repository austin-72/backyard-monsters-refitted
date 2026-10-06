import * as as3 from "as3";
import { Component, IAttackable, IAttackingComponent, ITargetable, SPRITES } from "@game";

export class DAVERockets extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
    }

    public $ctor(): void {
        super.$ctor();
    }

    protected override onRegister(): void {
        this.owner.targetMode = 1;
        SPRITES.SetupSprite("rocket");
        this.owner.range = 100 + 40 * this.owner.powerUpLevel();
    }

    protected override onUnregister(): void {
        this.owner.targetMode = 0;
        this.owner.range = 1;
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        return 0;
    }
}
