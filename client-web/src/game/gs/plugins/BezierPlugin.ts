import * as as3 from "as3";
import { int, uint } from "as3";
import { TweenLite, TweenPlugin } from "@game";

export class BezierPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _orientData: null, _orient: false, _future: null, _beziers: null });
    }

    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;

    protected static readonly _RAD2DEG: number = 180 / Math.PI;
    protected _target: any;
    protected _orientData: any[];
    protected _orient: boolean;
    protected _future: any;
    protected _beziers: any;

    public $ctor(): void {
        this._future = {};
        super.$ctor();
        this.propName = "bezier";
        this.overwriteProps = [];
    }

    public static parseBeziers(param1: any, param2: boolean = false): any {
        let _loc3_: int = 0;
        let _loc4_: any[] = null;
        let _loc5_: any = null;
        let _loc6_: string = null;
        let _loc7_: any = {};
        if (param2) {
            for (_loc6_ in param1) {
                _loc4_ = as3.cast(param1[_loc6_], Array);
                _loc7_[_loc6_] = _loc5_ = [];
                if (_loc4_.length > 2) {
                    _loc5_[_loc5_.length] = [_loc4_[0], _loc4_[1] - (_loc4_[2] - _loc4_[0]) / 4, _loc4_[1]];
                    _loc3_ = 1;
                    while (_loc3_ < _loc4_.length - 1) {
                        _loc5_[_loc5_.length] = [_loc4_[_loc3_], _loc4_[_loc3_] + (_loc4_[_loc3_] - _loc5_[_loc3_ - 1][1]), _loc4_[_loc3_ + 1]];
                        _loc3_++;
                    }
                } else {
                    _loc5_[_loc5_.length] = [_loc4_[0], (_loc4_[0] + _loc4_[1]) / 2, _loc4_[1]];
                }
            }
        } else {
            for (_loc6_ in param1) {
                _loc4_ = as3.cast(param1[_loc6_], Array);
                _loc7_[_loc6_] = _loc5_ = [];
                if (_loc4_.length > 3) {
                    _loc5_[_loc5_.length] = [_loc4_[0], _loc4_[1], (_loc4_[1] + _loc4_[2]) / 2];
                    _loc3_ = 2;
                    while (_loc3_ < _loc4_.length - 2) {
                        _loc5_[_loc5_.length] = [_loc5_[_loc3_ - 2][2], _loc4_[_loc3_], (_loc4_[_loc3_] + _loc4_[_loc3_ + 1]) / 2];
                        _loc3_++;
                    }
                    _loc5_[_loc5_.length] = [_loc5_[_loc5_.length - 1][2], _loc4_[_loc4_.length - 2], _loc4_[_loc4_.length - 1]];
                } else if (_loc4_.length == 3) {
                    _loc5_[_loc5_.length] = [_loc4_[0], _loc4_[1], _loc4_[2]];
                } else if (_loc4_.length == 2) {
                    _loc5_[_loc5_.length] = [_loc4_[0], (_loc4_[0] + _loc4_[1]) / 2, _loc4_[1]];
                }
            }
        }
        return _loc7_;
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (!(as3.is(param2, Array))) {
            return false;
        }
        this.init(param3, as3.as(param2, Array), false);
        return true;
    }

    protected init(param1: TweenLite, param2: any[], param3: boolean): void {
        let _loc5_: int = 0;
        let _loc6_: string = null;
        this._target = param1.target;
        if (param1.exposedVars.orientToBezier == true) {
            this._orientData = [["x", "y", "rotation", 0]];
            this._orient = true;
        } else if (as3.is(param1.exposedVars.orientToBezier, Array)) {
            this._orientData = as3.cast(param1.exposedVars.orientToBezier, Array);
            this._orient = true;
        }
        let _loc4_: any = {};
        _loc5_ = 0;
        while (_loc5_ < param2.length) {
            for (_loc6_ in param2[_loc5_]) {
                if (_loc4_[_loc6_] == undefined) {
                    _loc4_[_loc6_] = [param1.target[_loc6_]];
                }
                if (typeof param2[_loc5_][_loc6_] == "number") {
                    _loc4_[_loc6_].push(param2[_loc5_][_loc6_]);
                } else {
                    _loc4_[_loc6_].push(param1.target[_loc6_] + Number(param2[_loc5_][_loc6_]));
                }
            }
            _loc5_++;
        }
        for (_loc6_ in _loc4_) {
            this.overwriteProps[this.overwriteProps.length] = _loc6_;
            if (param1.exposedVars[_loc6_] != undefined) {
                if (typeof param1.exposedVars[_loc6_] == "number") {
                    _loc4_[_loc6_].push(param1.exposedVars[_loc6_]);
                } else {
                    _loc4_[_loc6_].push(param1.target[_loc6_] + Number(param1.exposedVars[_loc6_]));
                }
                delete param1.exposedVars[_loc6_];
                _loc5_ = (param1.tweens.length - 1) | 0;
                while (_loc5_ > -1) {
                    if (param1.tweens[_loc5_].name == _loc6_) {
                        param1.tweens.splice(_loc5_, 1);
                    }
                    _loc5_--;
                }
            }
        }
        this._beziers = BezierPlugin.parseBeziers(_loc4_, param3);
    }

    public override killProps(param1: any): void {
        let _loc2_: string = null;
        for (_loc2_ in this._beziers) {
            if (_loc2_ in param1) {
                delete this._beziers[_loc2_];
            }
        }
        super.killProps(param1);
    }

    public override set changeFactor(param1: number) {
        let _loc2_: int = 0;
        let _loc3_: string = null;
        let _loc4_: any = null;
        let _loc5_: number = NaN;
        let _loc6_: uint = 0;
        let _loc7_: number = NaN;
        let _loc8_: int = 0;
        let _loc9_: any = null;
        let _loc10_: boolean = false;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: any[] = null;
        let _loc14_: number = NaN;
        if (param1 == 1) {
            for (_loc3_ in this._beziers) {
                _loc2_ = (this._beziers[_loc3_].length - 1) | 0;
                this._target[_loc3_] = this._beziers[_loc3_][_loc2_][2];
            }
        } else {
            for (_loc3_ in this._beziers) {
                _loc6_ = this._beziers[_loc3_].length >>> 0;
                if (param1 < 0) {
                    _loc2_ = 0;
                } else if (param1 >= 1) {
                    _loc2_ = (_loc6_ - 1) | 0;
                } else {
                    _loc2_ = (_loc6_ * param1) | 0;
                }
                _loc5_ = (param1 - _loc2_ * (1 / _loc6_)) * _loc6_;
                _loc4_ = this._beziers[_loc3_][_loc2_];
                if (this.round) {
                    _loc8_ = (_loc7_ = Number(_loc4_[0] + _loc5_ * (2 * (1 - _loc5_) * (_loc4_[1] - _loc4_[0]) + _loc5_ * (_loc4_[2] - _loc4_[0])))) < 0 ? -1 : 1;
                    this._target[_loc3_] = _loc7_ % 1 * _loc8_ > 0.5 ? (_loc7_ | 0) + _loc8_ : _loc7_ | 0;
                } else {
                    this._target[_loc3_] = _loc4_[0] + _loc5_ * (2 * (1 - _loc5_) * (_loc4_[1] - _loc4_[0]) + _loc5_ * (_loc4_[2] - _loc4_[0]));
                }
            }
        }
        if (this._orient) {
            _loc9_ = this._target;
            _loc10_ = this.round;
            this._target = this._future;
            this.round = false;
            this._orient = false;
            this.changeFactor = param1 + 0.01;
            this._target = _loc9_;
            this.round = _loc10_;
            this._orient = true;
            _loc2_ = 0;
            while (_loc2_ < this._orientData.length) {
                _loc14_ = Number(Number((_loc13_ = as3.cast(this._orientData[_loc2_], Array))[3]) || 0);
                _loc11_ = this._future[_loc13_[0]] - this._target[_loc13_[0]];
                _loc12_ = this._future[_loc13_[1]] - this._target[_loc13_[1]];
                this._target[_loc13_[2]] = Math.atan2(_loc12_, _loc11_) * BezierPlugin._RAD2DEG + _loc14_;
                _loc2_++;
            }
        }
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
