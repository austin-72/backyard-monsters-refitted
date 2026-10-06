import * as as3 from "as3";
import { int, uint } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, Component, IAttackable, IAttackingComponent, ITargetable, Targeting } from "@game";

export class BlinkOnAttack extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
        as3.fields(this, { m_attacksToBlink: 0, m_maxBlinkDistance: 0, m_maxBlinkPoints: 0, m_attacks: 0, m_blinkTarget: null, m_blinkDistance: 0, m_blinkPoints: 0 });
    }

    protected m_attacksToBlink: uint;
    protected m_maxBlinkDistance: uint;
    protected m_maxBlinkPoints: int;
    protected m_attacks: uint;
    protected m_blinkTarget: ITargetable;
    protected m_blinkDistance: int;
    protected m_blinkPoints: int;

    public $ctor(param1: uint = 3, param2: uint = 200, param3: int = 10): void {
        super.$ctor();
        this.m_maxBlinkPoints = param3;
        this.m_attacksToBlink = param1;
        this.m_maxBlinkDistance = param2;
    }

    public override tick(param1: int = 1): void {
        if (this.isBlinking()) {
            this.tickBlink();
        }
    }

    private tickBlink(): void {
        let _loc4_: int = 0;
        let _loc5_: number = NaN;
        let _loc1_: any[] = this.owner._waypoints;
        let _loc2_: Point = new Point(this.owner.x, this.owner.y);
        let _loc3_: boolean = this.owner._hasPath;
        if (this.m_blinkPoints) {
            if (_loc3_ && Boolean(_loc1_.length)) {
                _loc4_ = (_loc1_.length - 1) | 0;
                _loc5_ = _loc2_.subtract(as3.cast(_loc1_[_loc1_.length - 1], Point)).length;
                this.owner._tmpPoint = Point.interpolate(_loc2_, as3.cast(_loc1_[_loc4_], Point), 1 - this.m_blinkDistance / _loc5_);
                --this.m_blinkPoints;
                if (this.m_blinkPoints <= 0) {
                    this.stopBlink();
                    _loc1_ = [];
                }
            } else {
                this.stopBlink();
            }
        } else if (_loc3_ && _loc1_.length > 0) {
            this.startBlink(_loc2_.subtract(as3.cast(_loc1_[_loc1_.length - 1], Point)).length / 10);
        }
    }

    private startBlink(param1: any): void {
        this.m_blinkDistance = param1.dist | 0;
        this.m_blinkTarget = as3.cast(param1.creep, ITargetable);
        this.owner.WaypointTo(new Point(this.m_blinkTarget.x, this.m_blinkTarget.y), this.m_blinkTarget instanceof BFOUNDATION ? as3.as(this.m_blinkTarget, BFOUNDATION) : null);
        this.m_blinkPoints = this.m_maxBlinkPoints;
        this.owner.graphic.alpha = 0.3;
        ++this.owner.targetableStatus;
        this.m_attacks = 0;
    }

    private stopBlink(): void {
        this.owner._atTarget = true;
        this.owner.graphic.alpha = 1;
        this.m_blinkPoints = 0;
        this.m_blinkDistance = 0;
        this.m_blinkTarget = null;
        --this.owner.targetableStatus;
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        ++this.m_attacks;
        if (this.m_attacks >= this.m_attacksToBlink) {
            this.attemptBlink();
        }
        return param2;
    }

    private attemptBlink(): void {
        let _loc1_: any = null;
        if (!this.isBlinking()) {
            _loc1_ = this.getNewBlinkTarget();
            if (_loc1_) {
                this.startBlink(_loc1_);
            }
        }
    }

    private getNewBlinkTarget(): any {
        let _loc3_: int = 0;
        let _loc1_: any[] = Targeting.getBuildingsInRange(this.m_maxBlinkDistance, new Point(this.owner.x, this.owner.y));
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            if (_loc1_[_loc2_].creep == this.owner._targetBuilding) {
                _loc1_.splice(_loc2_, 1);
                break;
            }
            _loc2_++;
        }
        if (_loc1_.length > 0) {
            _loc3_ = Math.floor(Math.random() * (_loc1_.length - 1)) | 0;
            return _loc1_[_loc3_];
        }
        return null;
    }

    public isBlinking(): boolean {
        return this.m_blinkPoints != 0;
    }
}
