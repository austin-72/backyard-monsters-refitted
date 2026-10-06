import * as as3 from "as3";
import { int, uint } from "as3";
import { Point } from "flash/geom";
import { Component, print } from "@game";

export class Blink extends Component {
    static {
        as3.fields(this, { m_maxBlinkPoints: 0, m_blinkDistance: 0, m_blinkPoints: 0 });
    }

    protected m_maxBlinkPoints: int;
    protected m_blinkDistance: int;
    protected m_blinkPoints: int;

    public $ctor(param1: int = 10): void {
        super.$ctor();
        this.m_maxBlinkPoints = param1;
    }

    private isWithinBlinkRange(): boolean {
        let _loc4_: Point = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc1_: any[] = this.owner._waypoints;
        let _loc2_: uint = _loc1_.length;
        let _loc3_: int = this.owner.powerUpLevel();
        if (this.owner._hasPath && _loc2_ != 0 && _loc2_ < _loc3_ * 5) {
            _loc5_ = (_loc4_ = this.owner._tmpPoint.subtract(as3.cast(_loc1_[_loc2_ - 1], Point))).x * _loc4_.x + _loc4_.y * _loc4_.y;
            _loc6_ = _loc3_ * 150;
            _loc6_ *= _loc6_;
            if (_loc5_ <= _loc6_) {
                return true;
            }
        }
        return false;
    }

    public override tick(param1: int = 1): void {
        let _loc2_: any[] = null;
        let _loc3_: Point = null;
        let _loc4_: boolean = false;
        let _loc5_: int = 0;
        let _loc6_: number = NaN;
        if (!this.owner._atTarget && this.isWithinBlinkRange()) {
            _loc2_ = this.owner._waypoints;
            _loc3_ = new Point(this.owner.x, this.owner.y);
            _loc4_ = this.owner._hasPath;
            if (this.m_blinkPoints) {
                if (this.m_blinkPoints > 0 && _loc4_) {
                    if (_loc2_.length > 0) {
                        _loc5_ = (_loc2_.length - 1) | 0;
                        _loc6_ = _loc3_.subtract(as3.cast(_loc2_[_loc2_.length - 1], Point)).length;
                        this.owner._tmpPoint = Point.interpolate(_loc3_, as3.cast(_loc2_[_loc5_], Point), 1 - this.m_blinkDistance / _loc6_);
                        --this.m_blinkPoints;
                        if (this.m_blinkPoints <= 0) {
                            this.stopBlink();
                            _loc2_ = [];
                        }
                    } else {
                        this.stopBlink();
                    }
                } else {
                    this.stopBlink();
                }
            } else if (_loc4_ && _loc2_.length > 0) {
                this.startBlink(_loc3_.subtract(as3.cast(_loc2_[_loc2_.length - 1], Point)).length / 10);
            }
        } else if (this.m_blinkPoints) {
            this.stopBlink();
        }
    }

    private startBlink(param1: number): void {
        this.m_blinkPoints = this.m_maxBlinkPoints;
        this.m_blinkDistance = param1 | 0;
        this.owner.graphic.alpha = 0.3;
        ++this.owner.targetableStatus;
        print("starting blink");
    }

    private stopBlink(): void {
        this.owner._atTarget = true;
        this.owner.graphic.alpha = 1;
        this.m_blinkPoints = 0;
        --this.owner.targetableStatus;
        print("stopping blink");
    }
}
