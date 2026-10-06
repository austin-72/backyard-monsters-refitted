import * as as3 from "as3";
import { int, uint } from "as3";
import { IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, ITargetable, LoanShark, MonsterBase, ProjectileUtils, Projectilev2 } from "@game";

export class Sabnoxv2 extends CreepBase {
    static {
        as3.fields(this, { m_projectilePool: null });
    }

    private static readonly k_projectileSpeed: uint = 10;

    private static readonly k_projectilePoolSize: uint = 3;
    private m_projectilePool: LoanShark;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_projectilePool = new LoanShark(Projectilev2, true, Sabnoxv2.k_projectilePoolSize);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc2_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        _loc2_.setup(as3.cast(ProjectileUtils.getFireballBitmapData()(), IBitmapDrawable), this.x, this.getDisplayY(), param1, Sabnoxv2.k_projectileSpeed, this.damage, this);
        return _loc2_;
    }

    public override die(): void {
        super.die();
        this.m_projectilePool.dispose();
    }
}
