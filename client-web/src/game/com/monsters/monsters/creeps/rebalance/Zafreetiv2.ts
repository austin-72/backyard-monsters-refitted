import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { AOEHealOnDeath, BFOUNDATION, CreepBase, ITargetable, LoanShark, MonsterBase, ProjectileUtils, Projectilev2, SOUNDS, SPRITES } from "@game";

export class Zafreetiv2 extends CreepBase {
    static {
        as3.fields(this, { m_projectilePool: null });
    }

    private static readonly k_projectilePoolSize: uint = 3;
    private m_projectilePool: LoanShark;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        this._graphic = new BitmapData(56, 70, true, 0);
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        if (this.poweredUp()) {
            this.addComponent(new AOEHealOnDeath());
        }
        this.m_projectilePool = new LoanShark(Projectilev2, true, Zafreetiv2.k_projectilePoolSize);
        SPRITES.SetupSprite("bigshadow");
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc2_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        _loc2_.setup(as3.cast(ProjectileUtils.getHealballBitmapData(), IBitmapDrawable), this.x, this.getDisplayY(), param1, ProjectileUtils.k_healballSpeed, this.damage, this);
        SOUNDS.Play("hit" + ((3 + Math.random() * 2) | 0), 0.1 + Math.random() * 0.1);
        return _loc2_;
    }

    public override die(): void {
        super.die();
        this.m_projectilePool.dispose();
    }
}
