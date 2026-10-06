import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, MovieClip } from "flash/display";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, CStatusEffect, FIREBALL, FIREBALLS, FlameEffect, GLOBAL, IAttackable, KEYS, MonsterBase, SOUNDS, Targeting } from "@game";

export class INFERNO_MAGMA_TOWER extends BTOWER {
    static {
        as3.fields(this, { _animMC: null, _animBitmap: null, _lostCreep: false, _fireStage: 1, _targetArray: null, _projectile: null, _projectileType: null });
    }

    public static readonly ID: int = 132;
    public _animMC: MovieClip;
    public _animBitmap: BitmapData;
    public _lostCreep: boolean;
    public _fireStage: int;
    public _targetArray: any[];
    protected _projectile: FIREBALL;
    protected _projectileType: string;

    public $ctor(): void {
        this._targetArray = [4, 4, 6, 8, 10, 12];
        super.$ctor();
        this._frameNumber = 0;
        this._type = 132;
        this._top = -30;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._projectileType = FIREBALLS.TYPE_MAGMA;
        this._fireStage = 1;
        this.SetProps();
    }

    public override TickAttack(): void {
        super.TickAttack();
        this.Rotate();
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && GLOBAL._render) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
        super.AnimFrame(false);
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        if (Math.random() * 2 <= 1) {
            SOUNDS.Play("magma1");
        } else {
            SOUNDS.Play("magma2");
        }
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else {
            this._projectile = FIREBALLS.Spawn2(new Point(this._mc.x, this._mc.y + this._top), new Point(param1.x, param1.y), param1, this._speed, (this.damage * _loc2_ * _loc3_) | 0, this._splash, this._projectileType, 1, this);
        }
    }

    protected onProjectileCollision(param1: Event): void {
        let _loc2_: FIREBALL = as3.as(param1.target, FIREBALL);
        _loc2_.removeEventListener(FIREBALL.COLLIDED, as3.bind(this, this.onProjectileCollision));
        let _loc3_: any[] = Targeting.getCreepsInRange(this._splash, new Point(_loc2_._targetCreep.x, _loc2_._targetCreep.y), Targeting.getOldStyleTargets(0));
        let _loc4_: int = 0;
        let _loc5_: CStatusEffect = null;
        while (_loc4_ < _loc3_.length) {
            // addStatusEffect() only renews a flame the monster already has, and threw the freshly built
            // one away: a new bitmap for every monster in every splash. Renew without building it.
            _loc5_ = as3.as(as3.cast(_loc3_[_loc4_].creep, MonsterBase).getComponentByType(FlameEffect), CStatusEffect);
            if (_loc5_) {
                _loc5_.renew();
            } else {
                as3.cast(_loc3_[_loc4_].creep, MonsterBase).addStatusEffect(new FlameEffect(as3.cast(_loc3_[_loc4_].creep, MonsterBase), this.damage * 0.5));
            }
            _loc4_++;
        }
    }

    public override Description(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        super.Description();
        this._upgradeDescription = "";
        if (this._lvl.Get() > 0 && this._lvl.Get() < this._buildingProps.costs.length) {
            _loc1_ = this._buildingProps.stats[this._lvl.Get() - 1];
            _loc2_ = this._buildingProps.stats[this._lvl.Get()];
            _loc3_ = _loc1_.range | 0;
            _loc4_ = _loc2_.range | 0;
            if (BASE.isOutpost) {
                _loc3_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc3_);
                _loc4_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc4_);
            }
            if (_loc1_.range < _loc2_.range) {
                this._upgradeDescription += KEYS.Get("building_rangeincrease", { "v1": _loc3_, "v2": _loc4_ }) + "<br>";
            }
            if (_loc1_.damage < _loc2_.damage) {
                this._upgradeDescription += KEYS.Get("building_dpsincrease", { "v1": _loc1_.damage, "v2": _loc2_.damage }) + "<br>";
            }
            if (this._lvl.Get() > 1) {
                this._upgradeDescription += KEYS.Get("building_sfpsincrease", { "v1": this._targetArray[this._lvl.Get() - 1], "v2": this._targetArray[this._lvl.Get()] }) + "<br>";
            }
        }
    }

    public override Setup(param1: any): void {
        param1.t = this._type;
        super.Setup(param1);
        this.Props();
    }
}
