import * as as3 from "as3";
import { Vector, int } from "as3";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { EventDispatcher } from "flash/events";
import { Point } from "flash/geom";
import { CreepBase, DummyTarget, GLOBAL, GameObject, IAttackable, ITargetable, ITickable, MAP, ProjectileComponent, ProjectileEvent, RasterData } from "@game";

export class Projectilev2 extends EventDispatcher implements IAttackable, ITickable {
    static {
        as3.implement(this, [IAttackable, ITickable]);
        as3.fields(this, { targetOffset: null, m_x: NaN, m_y: NaN, m_target: null, m_speed: NaN, m_damage: NaN, m_source: null, m_components: null, m_rasterData: null, m_angleToTargetPoint: NaN, m_distanceToTarget: NaN });
    }

    private static readonly k_DO_PROJECTILES_HAVE_RANDOM_OFFSET: boolean = true;
    public targetOffset: Point;
    protected m_x: number;
    protected m_y: number;
    protected m_target: ITargetable;
    protected m_speed: number;
    protected m_damage: number;
    protected m_source: IAttackable;
    protected m_components: Vector<ProjectileComponent>;
    protected m_rasterData: RasterData;
    protected m_angleToTargetPoint: number;
    protected m_distanceToTarget: number;

    public $ctor(): void {
        this.m_components = new Vector<ProjectileComponent>(0, false, ProjectileComponent);
        super.$ctor();
    }

    public get rasterData(): RasterData {
        return this.m_rasterData;
    }

    public set graphic(param1: IBitmapDrawable) {
    }

    public get angleToTargetPoint(): number {
        return this.m_angleToTargetPoint;
    }

    public get damage(): number {
        return this.m_damage;
    }

    public set damage(param1: number) {
        this.m_damage = param1;
    }

    public setup(param1: IBitmapDrawable, param2: number, param3: number, param4: ITargetable, param5: number, param6: number = 0, param7: IAttackable = null, ...rest: any[]): void {
        this.m_rasterData = new RasterData(param1, new Point(param2, param3), int.MAX_VALUE);
        this.m_x = param2 - as3.cast(this.m_rasterData.data, BitmapData).width * 0.5;
        this.m_y = param3 - as3.cast(this.m_rasterData.data, BitmapData).height * 0.5;
        this.m_target = param4;
        this.m_speed = param5;
        this.m_damage = param6;
        this.m_source = param7;
        GLOBAL.addFastTickable(this);
        if (param4 instanceof GameObject && Projectilev2.k_DO_PROJECTILES_HAVE_RANDOM_OFFSET) {
            this.targetOffset = as3.cast(param4, GameObject).getRandomPointOnGraphic();
        }
        let _loc9_: int = 0;
        while (_loc9_ < rest.length) {
            if (rest[_loc9_] instanceof ProjectileComponent) {
                this.addComponent(as3.cast(rest[_loc9_], ProjectileComponent));
            }
            _loc9_++;
        }
    }

    public addComponent(param1: ProjectileComponent): void {
        this.m_components.push(param1);
    }

    public get x(): number {
        return this.m_x;
    }

    public get y(): number {
        return this.m_y;
    }

    public get targetPoint(): Point {
        let _loc1_: Point = new Point(this.m_target.x, this.m_target.y);
        if (this.targetOffset) {
            _loc1_ = _loc1_.add(this.targetOffset);
        }
        return _loc1_;
    }

    public tick(param1: int = 1): void {
        this.validateTarget();
        this.move();
        let _loc2_: int = 0;
        while (_loc2_ < this.m_components.length) {
            as3.vget(this.m_components, _loc2_).tick(param1);
            _loc2_++;
        }
        if (this.m_distanceToTarget - this.m_speed <= 0) {
            this.hit();
        }
        if (this.m_target) {
            this.render();
        } else {
            this.destroy();
        }
    }

    protected move(): void {
        let _loc1_: Point = null;
        _loc1_ = this.targetPoint;
        let _loc2_: number = _loc1_.x - this.m_x;
        let _loc3_: number = _loc1_.y - this.m_y;
        this.m_distanceToTarget = Math.sqrt(_loc2_ * _loc2_ + _loc3_ * _loc3_);
        this.m_angleToTargetPoint = Math.atan2(_loc3_, _loc2_);
        this.m_x += Math.cos(this.m_angleToTargetPoint) * this.m_speed;
        this.m_y += Math.sin(this.m_angleToTargetPoint) * this.m_speed;
    }

    private validateTarget(): void {
        if (this.m_target instanceof GameObject && !as3.cast(this.m_target, GameObject).isTargetable || this.m_target instanceof CreepBase && as3.cast(this.m_target, CreepBase).invisible) {
            this.m_target = new DummyTarget(this.m_target.x, this.m_target.y);
        }
    }

    protected render(): void {
        let _loc1_: Point = MAP.instance.offset;
        this.m_rasterData.pt = new Point(this.m_x - _loc1_.x, this.m_y - _loc1_.y);
    }

    private hit(): void {
        let _loc2_: IAttackable = null;
        let _loc3_: int = 0;
        this.dispatchEvent(new ProjectileEvent(ProjectileEvent.k_hit, this.m_target));
        let _loc1_: ITargetable = this.m_target;
        if (as3.is(this.m_target, IAttackable)) {
            _loc2_ = as3.cast(this.m_target, IAttackable);
            _loc2_.modifyHealth(this.m_damage, this);
            _loc3_ = 0;
            while (_loc3_ < this.m_components.length) {
                this.m_damage = as3.vget(this.m_components, _loc3_).onAttack(_loc2_, this.m_damage, this);
                _loc3_++;
            }
        }
        if (_loc1_ == this.m_target) {
            this.m_target = null;
        }
    }

    protected destroy(): void {
        this.m_damage = 0;
        this.m_speed = 0;
        this.m_x = 0;
        this.m_y = 0;
        this.m_source = null;
        this.m_target = null;
        this.m_rasterData.clear();
        this.m_rasterData = null;
        this.targetOffset = null;
        GLOBAL.removeFastTickable(this);
        this.m_components = new Vector<ProjectileComponent>(0, false, ProjectileComponent);
    }

    public get target(): ITargetable {
        return this.m_target;
    }

    public set target(param1: ITargetable) {
        this.m_target = param1;
    }

    public get defenseFlags(): int {
        return 0;
    }

    public get attackFlags(): int {
        return 0;
    }

    public get attackPriorityFlags(): Vector<int> {
        return null;
    }

    public get health(): number {
        return 0;
    }

    public get maxHealth(): number {
        return 0;
    }

    public modifyHealth(param1: number, param2: ITargetable = null): number {
        return 0;
    }

    public copy(param1: Projectilev2 = null): Projectilev2 {
        if (!param1) {
            param1 = new Projectilev2();
        }
        param1.setup(as3.cast(as3.as(this.m_rasterData.data, BitmapData), IBitmapDrawable), this.m_x, this.m_y, this.m_target, this.m_speed, this.m_damage, this.m_source);
        param1.targetOffset = this.targetOffset;
        return param1;
    }
}
