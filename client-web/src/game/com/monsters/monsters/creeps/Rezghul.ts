import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CREATURES, CreepBase, CreepSkinManager, ITargetable, LoanShark, MAP, MonsterBase, ProjectileUtils, Projectilev2, RasterData, ResurrectProjectile, RezghulResurrectAttack, SPRITES, Targeting, Zombiefy } from "@game";

export class Rezghul extends CreepBase {
    static {
        as3.fields(this, { m_projectilePool: null });
    }

    private static readonly k_projectileSpeed: uint = 3;

    private static readonly k_projectilePoolSize: uint = 4;

    public static readonly k_ZOMBIE_HEALTH_MULTIPLIER: string = "zombieHealthMultiplier";

    public static readonly k_ZOMBIE_DAMAGE_MULTIPLIER: string = "zombieDamageMultiplier";

    public static readonly k_ZOMBIE_SPEED_MULTIPLIER: string = "zombieSpeedMultiplier";

    public static readonly k_RESSURECT_COOLDOWN: string = "resurrectCooldown";
    private m_projectilePool: LoanShark;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        let _loc13_: Zombiefy = null;
        let _loc14_: ResurrectProjectile = null;
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        SPRITES.SetupSprite(ResurrectProjectile.k_resurecctProjectile);
        SPRITES.SetupSprite("shadow");
        this._shadow = new BitmapData(52, 50, true, 0);
        this._shadowMC = as3.cast(BYMConfig.instance.RENDERER_ON ? new Bitmap(this._shadow) : this.graphic.addChild(new Bitmap(this._shadow)), DisplayObject);
        this._shadowMC.x = -21;
        this._shadowMC.y = -25;
        if (BYMConfig.instance.RENDERER_ON) {
            this._shadowData = new RasterData(as3.cast(this._shadow, IBitmapDrawable), this._shadowPt, MAP.DEPTH_SHADOW);
        }
        this.m_projectilePool = new LoanShark(Projectilev2, true, Rezghul.k_projectilePoolSize);
        _loc13_ = new Zombiefy(CREATURES.GetProperty(this._creatureID, Rezghul.k_ZOMBIE_SPEED_MULTIPLIER, param5, this._friendly), CREATURES.GetProperty(this._creatureID, Rezghul.k_ZOMBIE_HEALTH_MULTIPLIER, param5, this._friendly), CREATURES.GetProperty(this._creatureID, Rezghul.k_ZOMBIE_DAMAGE_MULTIPLIER, param5, this._friendly));
        _loc14_ = new ResurrectProjectile();
        let _loc15_: RezghulResurrectAttack = new RezghulResurrectAttack(300, CREATURES.GetProperty(this._creatureID, Rezghul.k_RESSURECT_COOLDOWN, param5, this._friendly) | 0, Targeting.getFriendlyFlag(this) | Targeting.k_TARGETS_GROUND, 50, _loc14_, _loc13_);
        this.addComponent(_loc15_);
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc2_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        _loc2_.setup(as3.cast(this.getProjectileBitmapData(), IBitmapDrawable), this.x, this.getDisplayY(), param1, Rezghul.k_projectileSpeed, -this.damage, this);
        return _loc2_;
    }

    protected override getNextSprite(): void {
        if (!this._atTarget) {
            this.spriteAction = "moving";
        } else {
            this.spriteAction = "idle";
        }
        SPRITES.GetSprite(this._shadow, "shadow", "shadow", 0);
        this._lastFrame = CreepSkinManager.instance.GetSprite(this._graphic, this._creatureID, this.spriteAction, this.m_rotation | 0, this._frameNumber, this._lastFrame, this._currentSkinOverride);
    }

    public override die(): void {
        super.die();
        this.m_projectilePool.dispose();
    }

    private getProjectileBitmapData(): BitmapData {
        return ProjectileUtils.getFomorballBitmapData();
    }
}
