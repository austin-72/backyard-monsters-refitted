import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { Component, DivisionModifier, EFFECTS, MultiplicationPropertyModifier, TweenMax } from "@game";

export class Zombiefy extends Component {
    static {
        as3.fields(this, { m_attackDelayModifier: null, m_moveSpeedModifier: null, m_damageModifier: null, m_maxHealthModifier: null });
    }

    private m_attackDelayModifier: DivisionModifier;
    private m_moveSpeedModifier: MultiplicationPropertyModifier;
    private m_damageModifier: MultiplicationPropertyModifier;
    private m_maxHealthModifier: MultiplicationPropertyModifier;

    public $ctor(param1?: number, param2?: number, param3?: number): void {
        super.$ctor();
        this.m_attackDelayModifier = new DivisionModifier(param1);
        this.m_moveSpeedModifier = new MultiplicationPropertyModifier(param1);
        this.m_damageModifier = new MultiplicationPropertyModifier(param3);
        this.m_maxHealthModifier = new MultiplicationPropertyModifier(param2);
    }

    protected override onRegister(): void {
        this.owner.attackDelayProperty.addModifier(this.m_attackDelayModifier);
        this.owner.moveSpeedProperty.addModifier(this.m_moveSpeedModifier);
        this.owner.maxHealthProperty.store();
        this.owner.maxHealthProperty.addModifier(this.m_maxHealthModifier);
        this.owner.maxHealthProperty.updateHealth();
        this.owner.damageProperty.addModifier(this.m_damageModifier);
        TweenMax.to(this.owner._graphicMC, 1, { "colorMatrixFilter": { "saturation": 0 } });
        this.owner.isDisposable = true;
    }

    protected override onUnregister(): void {
        this.owner.attackDelayProperty.removeModifier(this.m_attackDelayModifier);
        this.owner.moveSpeedProperty.removeModifier(this.m_moveSpeedModifier);
        this.owner.maxHealthProperty.removeModifier(this.m_maxHealthModifier);
        this.owner.damageProperty.removeModifier(this.m_damageModifier);
        TweenMax.to(this.owner._graphicMC, 1, { "colorMatrixFilter": { "saturation": 1 } });
    }

    public override tick(param1: int = 1): void {
        let _loc2_: Point = null;
        let _loc3_: Point = null;
        if (Math.random() > 0.9) {
            _loc2_ = new Point(this.owner.x, this.owner.y).add(this.owner.getRandomPointOnGraphic());
            _loc3_ = new Point(this.owner.x, this.owner.y).add(this.owner.getRandomPointOnGraphic());
            EFFECTS.Lightning(_loc2_.x | 0, _loc2_.y | 0, _loc3_.x | 0, _loc3_.y | 0, null, 65280);
        }
    }

    public override clone(): Component {
        return new Zombiefy(this.m_moveSpeedModifier.multiple, this.m_maxHealthModifier.multiple, this.m_damageModifier.multiple);
    }

    /** Inferno-only: the same, with another health multiple (Rezghul raises a champion at a quarter of its health). */
    public ioCloneWithHealth(param1: number): Component {
        return new Zombiefy(this.m_moveSpeedModifier.multiple, param1, this.m_damageModifier.multiple);
    }
}
