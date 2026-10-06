import * as as3 from "as3";
import { int, uint } from "as3";
import { IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, GlaiveProjectileComponent, ITargetable, LoanShark, MonsterBase, ProjectileUtils, Projectilev2, SPRITES, SetFireProjectileComponent, Targeting } from "@game";

export class Teratornv2 extends CreepBase {
    static {
        as3.fields(this, { m_projectilePool: null });
    }

    private static readonly k_maxGlaiveTargets: uint = 3;

    private static readonly k_glaiveRange: uint = 100;

    private static readonly k_projectilePoolSize: uint = 5;
    private m_projectilePool: LoanShark;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        SPRITES.SetupSprite("shadow");
        this.m_projectilePool = new LoanShark(Projectilev2, true, Teratornv2.k_projectilePoolSize);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc2_: uint = this.powerUpLevel() >>> 0;
        let _loc3_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        if (_loc2_) {
            _loc3_.addComponent(new GlaiveProjectileComponent(Teratornv2.k_maxGlaiveTargets, Teratornv2.k_glaiveRange, Targeting.k_TARGETS_BUILDINGS));
        }
        _loc3_.addComponent(new SetFireProjectileComponent((this.damage * 0.1) >>> 0));
        _loc3_.setup(as3.cast(ProjectileUtils.getFireballBitmapData(), IBitmapDrawable), this.x, this.getDisplayY(), param1, ProjectileUtils.k_fireballSpeed, this.damage, this);
        return _loc3_;
    }

    public override die(): void {
        super.die();
        this.m_projectilePool.dispose();
    }
}
