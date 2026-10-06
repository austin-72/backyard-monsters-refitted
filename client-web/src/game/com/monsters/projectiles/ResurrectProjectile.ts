import * as as3 from "as3";
import { uint } from "as3";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { EFFECTS, GLOBAL, GameObject, IAttackable, ITargetable, MAP, ProjectileUtils, Projectilev2, SPRITES, SpriteData, Targeting, TweenMax } from "@game";

export class ResurrectProjectile extends Projectilev2 {
    static {
        as3.fields(this, { m_orbitAngle: 0, m_filter: null });
    }

    public static readonly k_resurecctProjectile: string = "resurrectProjectile";

    public static readonly k_projectileImageURL: string = "monsters/projectiles/rezghul_projectile.png";

    private static readonly k_MAX_DISTANCE_TO_LIGHTNING_TARGET: uint = 125;

    private static readonly k_PROJECTILE_SPEED: uint = 2;

    private static readonly k_ORBIT_RADIUS: uint = 10;

    private static readonly k_ORBIT_SPEED: number = 0.05;
    private m_orbitAngle: number;
    private m_filter: GlowFilter;

    public $ctor(): void {
        super.$ctor();
    }

    public override setup(param1: IBitmapDrawable, param2: number, param3: number, param4: ITargetable, param5: number, param6: number = 0, param7: IAttackable = null, ...rest: any[]): void {
        param5 = ResurrectProjectile.k_PROJECTILE_SPEED;
        param1 = as3.cast(this.getBitmapData(), IBitmapDrawable);
        super.setup(param1, param2, param3, param4, param5, param6, param7, rest);
        this.m_filter = new GlowFilter(16777215, 0, 9, 9, 1);
        TweenMax.to(this.m_filter, 1, { "alpha": 0.8, "yoyo": true });
    }

    protected override render(): void {
        let _loc1_: BitmapData = as3.cast(this.m_rasterData.data, BitmapData);
        let _loc2_: BitmapData = this.getBitmapData();
        _loc1_.applyFilter(_loc2_, _loc2_.rect, new Point(), this.m_filter);
        this.m_orbitAngle += ResurrectProjectile.k_ORBIT_SPEED;
        let _loc3_: number = this.m_x + Math.cos(this.m_orbitAngle) * ResurrectProjectile.k_ORBIT_RADIUS;
        let _loc4_: number = this.m_y + Math.sin(this.m_orbitAngle) * ResurrectProjectile.k_ORBIT_RADIUS;
        if (Math.random() > 0.75) {
            this.randerElectricityAroundProjectile(new Point(_loc3_, _loc4_), _loc2_);
        }
        let _loc5_: Point = MAP.instance.offset;
        this.m_rasterData.pt = new Point(_loc3_ - _loc5_.x, _loc4_ - _loc5_.y);
    }

    private randerElectricityAroundProjectile(param1: Point, param2: BitmapData): void {
        let _loc3_: Point = null;
        let _loc5_: number = NaN;
        let _loc4_: ITargetable = null;
        _loc4_ = Targeting.getClosestEnemy(ResurrectProjectile.k_MAX_DISTANCE_TO_LIGHTNING_TARGET, param1, Targeting.k_TARGETS_ALL);
        if (_loc4_) {
            _loc3_ = new Point(_loc4_.x, _loc4_.y);
            _loc5_ = GLOBAL.QuickDistance(_loc3_, param1);
            if (Math.random() > _loc5_ / ResurrectProjectile.k_MAX_DISTANCE_TO_LIGHTNING_TARGET) {
                if (_loc4_ instanceof GameObject) {
                    _loc3_ = _loc3_.add(as3.cast(_loc4_, GameObject).getRandomPointOnGraphic());
                }
            } else {
                _loc3_ = null;
            }
        }
        if (!_loc3_) {
            _loc3_ = new Point(param1.x + Math.random() * param2.width, param1.y + Math.random() * param2.height);
        }
        EFFECTS.Lightning((param1.x + Math.random() * param2.width) | 0, (param1.y + Math.random() * param2.height) | 0, _loc3_.x | 0, _loc3_.y | 0, null, 65280);
    }

    private getBitmapData(): BitmapData {
        let _loc1_: BitmapData = as3.cast(SPRITES.GetSpriteDescriptor(ResurrectProjectile.k_resurecctProjectile), SpriteData).sprite;
        if (!_loc1_) {
            _loc1_ = ProjectileUtils.getFireballBitmapData();
        }
        return _loc1_.clone();
    }
}
