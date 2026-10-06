import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { BitmapData, DisplayObject, Sprite } from "flash/display";
import { Event } from "flash/events";
import { ColorMatrixFilter, GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BTOWER, BuildingAssetContainer, CREATURES, FIREBALL, FIREBALLS, GLOBAL, IAttackable, MAP, MathUtils, MonsterBase, SOUNDS, SPRITES, SecNum, Spurtz, Targeting } from "@game";

export class SpurtzCannon extends BTOWER {
    static {
        as3.fields(this, { _shotsFired: 0, _shotsPerFire: 0, _projectile: null, _projectileType: null, _barrelRotation: 0, _angleToTarget: NaN, _chanceToSpawnSpurtz: 0.5, _barrelRotationSpeed: 1, _ANGLE_THRESHOLD_TO_SWITCH_TARGETS: 2, _ANGLE_THRESHOLD_TO_START_SHOOTING: 20, _spurts: null, _targetCreepIndex: 0 });
    }

    public static readonly TYPE: uint = 136;

    public static SPURTZ_PROJECTILE: string = "spurtz_projectile";
    protected _shotsFired: uint;
    protected _shotsPerFire: uint;
    protected _projectile: FIREBALL;
    protected _projectileType: string;
    protected _barrelRotation: number;
    protected _angleToTarget: number;
    protected _chanceToSpawnSpurtz: number;
    private _barrelRotationSpeed: number;
    private _ANGLE_THRESHOLD_TO_SWITCH_TARGETS: number;
    private _ANGLE_THRESHOLD_TO_START_SHOOTING: number;
    private _spurts: Vector<Spurtz>;
    private _targetCreepIndex: int;

    public $ctor(param1: any /* int */ = 0): void {
        super.$ctor();
        this._animRandomStart = false;
        this._top = -32;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._maxTargets = 10;
        if (!param1) {
            param1 = SpurtzCannon.TYPE | 0;
        }
        this._type = param1;
        this.SetProps();
        this._projectileType = FIREBALL.TYPE_SPURTZ;
        SPRITES.SetupSprite(SpurtzCannon.SPURTZ_PROJECTILE);
        this._spurts = new Vector<Spurtz>(0, false, Spurtz);
        this._buildInstant = true;
        this._buildInstantCost = new SecNum(0);
    }

    public override InstantBuildCost(): int {
        return 0;
    }

    public get isFiring(): boolean {
        return this._shotsFired > 0;
    }

    protected override setupImage(param1: uint, param2: string, param3: BuildingAssetContainer, param4: any, param5: BitmapData, param6: number): void {
        super.setupImage(param1, param2, param3, param4, param5, param6);
        this.renderRotation();
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        this.FindTargets(this._maxTargets, this._priority);
        this._shotsFired = 0;
        this._targetCreepIndex = 0;
        if (this._target) {
            this.setAngleToTarget();
        }
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        this.killSpurts();
    }

    private killSpurts(): void {
        let _loc2_: Spurtz = null;
        let _loc1_: int = (this._spurts.length - 1) | 0;
        while (_loc1_ >= 0) {
            _loc2_ = as3.vget(this._spurts, _loc1_);
            if (_loc2_._frameNumber > 100 && (Math.random() > 0.9 || !_loc2_._hasTarget)) {
                _loc2_.setHealth(0);
            }
            if (_loc2_.health <= 0) {
                this._spurts.splice(_loc1_, 1);
            }
            _loc1_--;
        }
    }

    public override TickAttack(): void {
        super.TickAttack();
        this._shotsPerFire = this._buildingProps.stats[this._lvl.Get() - 1].shots >>> 0;
        this.updateTarget();
        if (this._target) {
            this.rotateBarrelTowardsTarget();
            if (this.shouldFire()) {
                this.shoot();
            }
        }
    }

    private updateTarget(): void {
        if (!this.hasValidTarget()) {
            this._target = null;
            return;
        }
        if (Math.abs(this._angleToTarget - this._barrelRotation) <= this._ANGLE_THRESHOLD_TO_SWITCH_TARGETS) {
            if (this._targetCreeps.length > 1) {
                this._target = as3.cast(this.getNextTarget(), IAttackable);
                this.setAngleToTarget();
            }
        }
    }

    private getNextTarget(): any {
        ++this._targetCreepIndex;
        if (this._targetCreepIndex >= this._targetCreeps.length) {
            this._targetCreepIndex = 0;
        }
        return this._targetCreeps[this._targetCreepIndex].creep;
    }

    private setAngleToTarget(): void {
        let _loc1_: number = Math.atan2(this.y + Math.abs(this._top) - this._target.y, this.x - this._target.x);
        this._angleToTarget = _loc1_ * (180 / Math.PI);
    }

    private shouldFire(): boolean {
        return this._fireTick % 5 == 0 && this._shotsFired < this._shotsPerFire && (Math.abs(this._angleToTarget - this._barrelRotation) <= this._ANGLE_THRESHOLD_TO_START_SHOOTING || this.isFiring);
    }

    private hasValidTarget(): boolean {
        return Boolean(this._targetCreeps) && this._targetCreeps.length > 0 && as3.cast(this._targetCreeps[0].creep, MonsterBase).health > 0;
    }

    private rotateBarrelTowardsTarget(): void {
        let _loc1_: int = this._angleToTarget - this._barrelRotation > 0 ? 1 : -1;
        this._barrelRotation += _loc1_ * this._barrelRotationSpeed;
        if (this._barrelRotation > 180) {
            this._barrelRotation = -(180 - this._barrelRotation);
        } else if (this._barrelRotation < -180) {
            this._barrelRotation = 180 - (180 - this._barrelRotation);
        }
        this.renderRotation();
    }

    private renderRotation(): void {
        this._animTick = ((this._barrelRotation + 180) / 11.25) | 0;
        this.AnimFrame();
        ++this._frameNumber;
    }

    private shoot(): void {
        let _loc5_: Point = null;
        SOUNDS.Play(Math.random() > 0.5 ? "magma2" : "magma1");
        if (this.isJard) {
            this.shootJar();
            return;
        }
        let _loc1_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc2_: number = 1;
        let _loc3_: number = MathUtils.getDistanceBetweenTwoPoints(this._position, new Point(this._target.x, this._target.y));
        let _loc4_: number = (this._barrelRotation + 180) * (Math.PI / 180);
        _loc5_ = (_loc5_ = new Point(this.x + Math.cos(_loc4_) * _loc3_, this.y + Math.sin(_loc4_) * _loc3_)).add(new Point(this.getSpreadFromDistance(_loc3_ * 0.2), this.getSpreadFromDistance(_loc3_ * 0.2)));
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc2_ = 1.25;
        }
        this._projectile = FIREBALLS.Spawn2(new Point(this._mc.x, this._mc.y + this._top), _loc5_, null, this._speed, (this.damage * _loc1_ * _loc2_) | 0, this._splash, this._projectileType, 3, this);
        this._projectile.addEventListener(FIREBALL.COLLIDED, as3.bind(this, this.collidedWithTarget), false, 0, true);
        ++this._shotsFired;
        this.scaleDisplayObjectRandomly(this._projectile._graphic);
    }

    private shootJar(): void {
        let _loc1_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc2_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc2_ = 1.25;
        }
        let _loc3_: int = (this.damage * 0.25 * _loc1_ * _loc2_) | 0;
        this._jarHealth.Add(-_loc3_);
        ATTACK.Damage(this._mc.x, this._mc.y + this._top, _loc3_);
    }

    private scaleDisplayObjectRandomly(param1: DisplayObject): void {
        let _loc2_: number = Math.random() * 0.6 + 0.4;
        param1.scaleX = _loc2_;
        param1.scaleY = _loc2_;
    }

    private makeItSperm(param1: Sprite): void {
        let _loc2_: any[] = new Array();
        _loc2_ = _loc2_.concat([1, 1, 1, 1, 1]);
        _loc2_ = _loc2_.concat([1, 1, 1, 1, 1]);
        _loc2_ = _loc2_.concat([1, 1, 1, 1, 1]);
        _loc2_ = _loc2_.concat([0, 0, 0, 1, 0]);
        param1.filters = [new ColorMatrixFilter(_loc2_)];
    }

    private getSpreadFromDistance(param1: number): number {
        return Math.random() * (param1 * 2) - param1;
    }

    protected collidedWithTarget(param1: Event): void {
        let _loc2_: FIREBALL = as3.as(param1.target, FIREBALL);
        _loc2_.removeEventListener(FIREBALL.COLLIDED, as3.bind(this, this.collidedWithTarget));
        let _loc3_: number = Math.atan2(_loc2_._startPoint.x - _loc2_._targetPoint.x, _loc2_._startPoint.y - _loc2_._targetPoint.y);
        let _loc4_: number = _loc3_ * (180 / Math.PI);
        this.dealAoEDamage(_loc2_);
        if (Math.random() > this._chanceToSpawnSpurtz) {
            this.spawnSpurtzAt(_loc2_._tmpX | 0, _loc2_._tmpY | 0, _loc4_, _loc2_._graphic.scaleX);
        }
    }

    private dealAoEDamage(param1: FIREBALL): void {
        let _loc2_: uint = (this._projectile._graphic.width + this._projectile._graphic.height) >>> 0;
        let _loc3_: Point = new Point(param1._tmpX, this._projectile._tmpY);
        let _loc4_: any[] = null;
        if ((_loc4_ = Targeting.getCreepsInRange(_loc2_, _loc3_, Targeting.getOldStyleTargets(0))).length > 0) {
            Targeting.DealLinearAEDamage(_loc3_, _loc2_, this._projectile._damage, _loc4_);
        }
    }

    private spawnSpurtzAt(param1: int, param2: int, param3: number, param4: number): void {
        let _loc5_: Spurtz = null;
        (_loc5_ = as3.as(CREATURES.Spawn("IC1", MAP._BUILDINGTOPS, "defend", new Point(param1, param2), param3), Spurtz)).isDisposable = true;
        _loc5_.findDefenseTargets();
        _loc5_.graphic.scaleX = param4;
        _loc5_.graphic.scaleY = param4;
        this._spurts.push(_loc5_);
    }

    private makeSuperSpurtz(param1: Spurtz): void {
        param1.graphic.scaleX = 2;
        param1.graphic.scaleY = 2;
        param1.graphic.filters = [new GlowFilter(16759349, 1, 10, 10, 6, 3)];
    }
}
