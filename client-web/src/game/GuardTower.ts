import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { DisplayObjectContainer } from "flash/display";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BTOWER, EFFECTS, GLOBAL, ICoreBuilding, ITickable, MAP, MathUtils, MonsterBase, SOUNDS, Targeting } from "@game";

export class GuardTower extends BTOWER implements ICoreBuilding {
    static {
        as3.implement(this, [ICoreBuilding]);
        as3.fields(this, { m_lastDamagedState: false, m_teslas: null, m_tick: 0, m_isAttacking: false });
    }

    public static readonly k_SPECIAL_ANGLE: Point = new Point(90, 180);

    private static m_teslaPositions: Vector<TeslaData> = null;

    private static m_teslaDamagedPositions: Vector<TeslaData> = null;

    public static readonly k_TYPE: int = 138;
    private m_lastDamagedState: boolean;
    private m_teslas: Vector<GuardTowerTesla>;
    private m_tick: int;
    private m_isAttacking: boolean;

    public $ctor(): void {
        super.$ctor();
        GuardTower.m_teslaPositions = Vector.from([new TeslaData(new Point(-0.5, -68), new Point(-180, 0)), new TeslaData(new Point(58, -37), new Point(-90, 90)), new TeslaData(new Point(-0.5, -7), new Point(0, 180)), new TeslaData(new Point(-59, -40), GuardTower.k_SPECIAL_ANGLE)], TeslaData);
        GuardTower.m_teslaDamagedPositions = Vector.from([new TeslaData(new Point(-0.5, -68), new Point(-180, 0)), new TeslaData(new Point(58, -26), new Point(-90, 90)), new TeslaData(new Point(-6, -7), new Point(0, 180)), new TeslaData(new Point(-67, -53), GuardTower.k_SPECIAL_ANGLE)], TeslaData);
        this.m_teslas = new Vector<GuardTowerTesla>(0, false, GuardTowerTesla);
        this._animRandomStart = false;
        this._footprint = [new Rectangle(0, 0, 130, 130)];
        this._gridCost = [[new Rectangle(0, 0, 130, 130), 10], [new Rectangle(10, 10, 110, 110), 200]];
        this._type = GuardTower.k_TYPE;
        this.SetProps();
        this.graphic.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
    }

    public override ApplyJar(param1: int, ioSeconds: number = 0): void {
    }

    protected override onEnterFrame(param1: Event): void {
        if (!this._mcHit.parent) {
            return;
        }
        this.anim2Container.visible = false;
        ++this.m_tick;
        this.AnimFrame(true);
        if (this.m_tick % 2 == 0) {
            --this._animTick;
        }
        this.anim2Container.visible = this.m_isAttacking;
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        this.setupTeslas();
        GLOBAL.setTownHall(this);
    }

    public override Cancel(): void {
        GLOBAL.setTownHall(null);
        super.Cancel();
    }

    public override Constructed(): void {
        super.Constructed();
        GLOBAL.setTownHall(this);
    }

    private setupTeslas(): void {
        let _loc2_: GuardTowerTesla = null;
        let _loc1_: int = 0;
        while (_loc1_ < GuardTower.m_teslaPositions.length) {
            _loc2_ = new GuardTowerTesla(this.damage, this._range, as3.vget(GuardTower.m_teslaPositions, _loc1_).angleRange, this._rate);
            if (_loc1_ == 0) {
                _loc2_.parent = MAP._CREEPSMC;
            }
            this.m_teslas.push(_loc2_);
            _loc1_++;
        }
        this.updateTeslaPositions();
    }

    private updateTeslas(): void {
        let _loc2_: GuardTowerTesla = null;
        this.m_isAttacking = false;
        let _loc1_: int = 0;
        while (_loc1_ < this.m_teslas.length) {
            _loc2_ = as3.vget(this.m_teslas, _loc1_);
            _loc2_.tick();
            if (_loc2_.target) {
                this.m_isAttacking = true;
            }
            _loc1_++;
        }
    }

    public override Tick(param1: int): void {
        super.Tick(param1);
        if (this.isDamaged != this.m_lastDamagedState && Boolean(this.m_teslas)) {
            this.updateTeslaPositions();
        }
    }

    private updateTeslaPositions(): void {
        let _loc1_: Point = new Point(this.x, this.y);
        let _loc2_: Vector<TeslaData> = this.isDamaged ? GuardTower.m_teslaDamagedPositions : GuardTower.m_teslaPositions;
        let _loc3_: int = 0;
        while (_loc3_ < this.m_teslas.length) {
            as3.vget(this.m_teslas, _loc3_).moveTo(_loc1_.add(as3.vget(_loc2_, _loc3_).position));
            _loc3_++;
        }
        this.m_lastDamagedState = this.isDamaged;
    }

    public override TickAttack(): void {
        super.TickAttack();
        if (Boolean(this.m_teslas) && this.canAttack) {
            this.updateTeslas();
        }
    }

    protected override onMove(): void {
        this.updateTeslaPositions();
    }
}

class GuardTowerTesla extends ASObject implements ITickable {
    static {
        as3.implement(this, [ITickable]);
        as3.fields(this, { parent: null, m_x: NaN, m_y: NaN, m_target: null, m_damage: NaN, m_range: NaN, m_attackSpeed: NaN, m_angleRange: null, m_timeAbleToFire: NaN });
    }

    public parent: DisplayObjectContainer;
    private m_x: number;
    private m_y: number;
    private m_target: MonsterBase;
    private m_damage: number;
    private m_range: number;
    private m_attackSpeed: number;
    private m_angleRange: Point;
    private m_timeAbleToFire: number;

    public $ctor(param1?: number, param2?: number, param3?: Point, param4: number = 0): void {
        super.$ctor();
        this.m_timeAbleToFire = 0;
        this.m_damage = param1;
        this.m_attackSpeed = param4;
        this.m_range = param2;
        this.m_angleRange = param3;
    }

    public get target(): MonsterBase {
        return this.m_target;
    }

    public tick(param1: int = 1): void {
        if (!this.m_target || this.m_target.health <= 0 || !this.m_target.isTargetable) {
            this.m_target = this.getTarget();
        }
        if (this.m_target) {
            if (Math.random() > 0.5) {
                EFFECTS.Lightning(this.m_x | 0, this.m_y | 0, this.m_target.x | 0, this.m_target.getDisplayY() | 0, this.parent);
            }
            if (Number(GLOBAL.Timestamp()) >= this.m_timeAbleToFire) {
                this.fire();
            }
        }
    }

    private fire(): void {
        SOUNDS.Play("lightningfire", 0.8);
        EFFECTS.Lightning(this.m_x | 0, this.m_y | 0, this.m_target.x | 0, this.m_target.getDisplayY() | 0, this.parent);
        this.m_target.modifyHealth(-this.m_damage, this.m_target);
        this.m_timeAbleToFire = Number(GLOBAL.Timestamp()) + this.m_attackSpeed;
    }

    public moveTo(param1: Point): void {
        this.m_x = param1.x;
        this.m_y = param1.y;
    }

    private getTarget(): MonsterBase {
        let _loc3_: MonsterBase = null;
        let _loc4_: number = NaN;
        let _loc1_: any[] = Targeting.getCreepsInRange(this.m_range, new Point(this.m_x, this.m_y), Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_ATTACKERS);
        if (_loc1_.length <= 0) {
            return null;
        }
        as3.sortOn(_loc1_, ["dist"], Array.NUMERIC);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            _loc3_ = as3.as(_loc1_[_loc2_].creep, MonsterBase);
            _loc4_ = MathUtils.getAngleBetweenTwoPointsInDegrees(new Point(this.m_x, this.m_y), new Point(_loc3_.x, _loc3_.y));
            if (this.m_angleRange == GuardTower.k_SPECIAL_ANGLE) {
                _loc4_ = Math.abs(_loc4_);
            }
            if (_loc4_ >= this.m_angleRange.x && _loc4_ <= this.m_angleRange.y) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }
}

class TeslaData extends ASObject {
    static {
        as3.fields(this, { position: null, angleRange: null });
    }

    public position: Point;
    public angleRange: Point;

    public $ctor(param1?: Point, param2?: Point): void {
        super.$ctor();
        this.position = param1;
        this.angleRange = param2;
    }
}
