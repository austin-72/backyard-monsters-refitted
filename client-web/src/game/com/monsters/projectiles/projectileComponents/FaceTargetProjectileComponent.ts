import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";
import { ProjectileComponent, Projectilev2, SPRITES, SpriteSheetAnimation } from "@game";

export class FaceTargetProjectileComponent extends ProjectileComponent {
    static {
        as3.fields(this, { m_animation: null, m_projectile: null });
    }

    private m_animation: SpriteSheetAnimation;
    private m_projectile: Projectilev2;

    public $ctor(param1?: Projectilev2, param2?: SpriteSheetAnimation): void {
        super.$ctor();
        this.m_animation = param2;
        this.m_projectile = param1;
    }

    public override tick(param1: int = 1): void {
        let _loc2_: number = NaN;
        let _loc3_: BitmapData = null;
        if (Boolean(this.m_projectile.rasterData) && Boolean(this.m_projectile.angleToTargetPoint)) {
            _loc2_ = this.m_projectile.angleToTargetPoint * (180 / Math.PI);
            if (_loc2_ < 0) {
                _loc2_ = 360 + _loc2_;
            }
            _loc3_ = as3.as(this.m_projectile.rasterData.data, BitmapData);
            SPRITES.GetFrame(_loc3_, this.m_animation.spriteData, (_loc2_ / this.m_animation.totalFrames) | 0);
        }
    }
}
