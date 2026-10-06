import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Point } from "flash/geom";
import { ShortRotationPlugin, TweenInfo, TweenLite, TweenPlugin } from "@game";

export class TransformAroundPointPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _local: null, _point: null, _shortRotation: null });
    }

    public static readonly VERSION: number = 1.02;

    public static readonly API: number = 1;
    protected _target: DisplayObject;
    protected _local: Point;
    protected _point: Point;
    protected _shortRotation: ShortRotationPlugin;

    public $ctor(): void {
        super.$ctor();
        this.propName = "transformAroundPoint";
        this.overwriteProps = [];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        let _loc4_: string = null;
        let _loc5_: ShortRotationPlugin = null;
        let _loc6_: string = null;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        if (!(param2.point instanceof Point)) {
            return false;
        }
        this._target = as3.as(param1, DisplayObject);
        this._point = as3.cast(param2.point.clone(), Point);
        this._local = this._target.globalToLocal(this._target.parent.localToGlobal(this._point));
        if (param2.isTV == true) {
            param2 = param2.exposedVars;
        }
        for (_loc4_ in param2) {
            if (_loc4_ != "point") {
                if (_loc4_ == "shortRotation") {
                    this._shortRotation = new ShortRotationPlugin();
                    this._shortRotation.onInitTween(this._target, param2[_loc4_], param3);
                    this.addTween(this._shortRotation, "changeFactor", 0, 1, "shortRotation");
                    for (_loc6_ in param2[_loc4_]) {
                        this.overwriteProps[this.overwriteProps.length] = _loc6_;
                    }
                } else if (_loc4_ == "x" || _loc4_ == "y") {
                    this.addTween(this._point, _loc4_, Number(this._point[_loc4_]), param2[_loc4_], _loc4_);
                    this.overwriteProps[this.overwriteProps.length] = _loc4_;
                } else if (_loc4_ == "scale") {
                    this.addTween(this._target, "scaleX", this._target.scaleX, param2.scale, "scaleX");
                    this.addTween(this._target, "scaleY", this._target.scaleY, param2.scale, "scaleY");
                    this.overwriteProps[this.overwriteProps.length] = "scaleX";
                    this.overwriteProps[this.overwriteProps.length] = "scaleY";
                } else {
                    this.addTween(this._target, _loc4_, Number(this._target[_loc4_]), param2[_loc4_], _loc4_);
                    this.overwriteProps[this.overwriteProps.length] = _loc4_;
                }
            }
        }
        if (param3 != null) {
            if ("x" in param3.exposedVars || "y" in param3.exposedVars) {
                if ("x" in param3.exposedVars) {
                    _loc7_ = typeof param3.exposedVars.x == "number" ? Number(param3.exposedVars.x) : this._target.x + Number(param3.exposedVars.x);
                }
                if ("y" in param3.exposedVars) {
                    _loc8_ = typeof param3.exposedVars.y == "number" ? Number(param3.exposedVars.y) : this._target.y + Number(param3.exposedVars.y);
                }
                param3.killVars({ "x": true, "y": true });
                this.changeFactor = 1;
                if (!isNaN(_loc7_)) {
                    this.addTween(this._point, "x", this._point.x, this._point.x + (_loc7_ - this._target.x), "x");
                    this.overwriteProps[this.overwriteProps.length] = "x";
                }
                if (!isNaN(_loc8_)) {
                    this.addTween(this._point, "y", this._point.y, this._point.y + (_loc8_ - this._target.y), "y");
                    this.overwriteProps[this.overwriteProps.length] = "y";
                }
                this.changeFactor = 0;
            }
        }
        return true;
    }

    public override killProps(param1: any): void {
        if (this._shortRotation != null) {
            this._shortRotation.killProps(param1);
            if (this._shortRotation.overwriteProps.length == 0) {
                param1.shortRotation = true;
            }
        }
        super.killProps(param1);
    }

    public override set changeFactor(param1: number) {
        let _loc2_: Point = null;
        let _loc3_: int = 0;
        let _loc4_: TweenInfo = null;
        let _loc5_: number = NaN;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        if (this.round) {
            _loc3_ = (this._tweens.length - 1) | 0;
            while (_loc3_ > -1) {
                _loc6_ = (_loc5_ = (_loc4_ = as3.cast(this._tweens[_loc3_], TweenInfo)).start + _loc4_.change * param1) < 0 ? -1 : 1;
                _loc4_.target[_loc4_.property] = _loc5_ % 1 * _loc6_ > 0.5 ? (_loc5_ | 0) + _loc6_ : _loc5_ | 0;
                _loc3_--;
            }
            _loc2_ = this._target.parent.globalToLocal(this._target.localToGlobal(this._local));
            _loc7_ = this._target.x + this._point.x - _loc2_.x;
            _loc8_ = this._target.y + this._point.y - _loc2_.y;
            _loc9_ = _loc7_ < 0 ? -1 : 1;
            _loc10_ = _loc8_ < 0 ? -1 : 1;
            this._target.x = Number(_loc7_ % 1 * _loc9_ > 0.5 ? (_loc7_ | 0) + _loc9_ : _loc7_ | 0);
            this._target.y = Number(_loc8_ % 1 * _loc10_ > 0.5 ? (_loc8_ | 0) + _loc10_ : _loc8_ | 0);
        } else {
            _loc3_ = (this._tweens.length - 1) | 0;
            while (_loc3_ > -1) {
                (_loc4_ = as3.cast(this._tweens[_loc3_], TweenInfo)).target[_loc4_.property] = _loc4_.start + _loc4_.change * param1;
                _loc3_--;
            }
            _loc2_ = this._target.parent.globalToLocal(this._target.localToGlobal(this._local));
            this._target.x += this._point.x - _loc2_.x;
            this._target.y += this._point.y - _loc2_.y;
        }
        this._changeFactor = param1;
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
