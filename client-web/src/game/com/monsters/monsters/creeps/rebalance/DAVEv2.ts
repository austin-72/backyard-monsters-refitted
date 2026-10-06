import * as as3 from "as3";
import { int, uint } from "as3";
import { IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, FaceTargetProjectileComponent, ITargetable, LoanShark, MonsterBase, Projectilev2, SOUNDS, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

export class DAVEv2 extends CreepBase {
    static {
        as3.fields(this, { m_projectilePool: null });
    }

    private static readonly k_rocketKey: string = "rocket";

    private static readonly k_rocketSpeed: uint = 8;

    private static readonly k_projectilePoolSize: uint = 4;
    private m_projectilePool: LoanShark;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        if (this.powerUpLevel()) {
            this.targetMode = 1;
            SPRITES.SetupSprite(DAVEv2.k_rocketKey);
            this.range = 100 + 40 * this.powerUpLevel();
            this.m_projectilePool = new LoanShark(Projectilev2, true, DAVEv2.k_projectilePoolSize);
        }
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc2_: number = this.damage * 0.5;
        let _loc3_: SpriteSheetAnimation = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(DAVEv2.k_rocketKey), SpriteData), 11);
        let _loc4_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        let _loc5_: Point = new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10);
        let _loc6_: FaceTargetProjectileComponent = new FaceTargetProjectileComponent(_loc4_, _loc3_);
        _loc4_.setup(as3.cast(_loc3_.bitmapData, IBitmapDrawable), _loc5_.x, _loc5_.y, param1, DAVEv2.k_rocketSpeed, _loc2_, this, _loc6_);
        _loc4_ = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        _loc5_ = new Point(this._tmpPoint.x + Math.random() * 20 - 10, this._tmpPoint.y + Math.random() * 20 - 10);
        _loc6_ = new FaceTargetProjectileComponent(_loc4_, _loc3_);
        _loc4_.setup(as3.cast(_loc3_.bitmapData, IBitmapDrawable), _loc5_.x, _loc5_.y, param1, DAVEv2.k_rocketSpeed, _loc2_, this, _loc6_);
        return _loc4_;
    }

    public override die(): void {
        super.die();
        this.m_projectilePool.dispose();
    }

    public override deathSplat(): void {
        SOUNDS.Play("monsterlanddave");
    }
}
