import * as as3 from "as3";
import { ASObject, int } from "as3";
import { TweenInfo, TweenLite } from "@game";

export class OverwriteManager extends ASObject {
    public static readonly version: number = 3.12;

    public static readonly NONE: int = 0;

    public static readonly ALL: int = 1;

    public static readonly AUTO: int = 2;

    public static readonly CONCURRENT: int = 3;

    public static mode: int = 0;

    public static enabled: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static init(param1: int = 2): int {
        if (TweenLite.version < 10.09) {
        }
        TweenLite.overwriteManager = OverwriteManager;
        OverwriteManager.mode = param1;
        OverwriteManager.enabled = true;
        return OverwriteManager.mode;
    }

    public static manageOverwrites(param1: TweenLite, param2: any[]): void {
        let _loc7_: int = 0;
        let _loc8_: TweenLite = null;
        let _loc10_: any[] = null;
        let _loc11_: any = null;
        let _loc12_: int = 0;
        let _loc13_: TweenInfo = null;
        let _loc14_: any[] = null;
        let _loc3_: any = param1.vars;
        let _loc4_: int = 0;
        if ((_loc4_ = _loc3_.overwrite == undefined ? OverwriteManager.mode : _loc3_.overwrite | 0) < 2 || param2 == null) {
            return;
        }
        let _loc5_: number = param1.startTime;
        let _loc6_: any[] = [];
        let _loc9_: int = -1;
        _loc7_ = (param2.length - 1) | 0;
        while (_loc7_ > -1) {
            if ((_loc8_ = as3.cast(param2[_loc7_], TweenLite)) == param1) {
                _loc9_ = _loc7_;
            } else if (_loc7_ < _loc9_ && _loc8_.startTime <= _loc5_ && _loc8_.startTime + _loc8_.duration * 1000 / _loc8_.combinedTimeScale > _loc5_) {
                _loc6_[_loc6_.length] = _loc8_;
            }
            _loc7_--;
        }
        if (_loc6_.length == 0 || param1.tweens.length == 0) {
            return;
        }
        if (_loc4_ == OverwriteManager.AUTO) {
            _loc10_ = param1.tweens;
            _loc11_ = {};
            _loc7_ = (_loc10_.length - 1) | 0;
            while (_loc7_ > -1) {
                if ((_loc13_ = as3.cast(_loc10_[_loc7_], TweenInfo)).isPlugin) {
                    if (_loc13_.name == "_MULTIPLE_") {
                        _loc12_ = ((_loc14_ = as3.cast(_loc13_.target.overwriteProps, Array)).length - 1) | 0;
                        while (_loc12_ > -1) {
                            _loc11_[_loc14_[_loc12_]] = true;
                            _loc12_--;
                        }
                    } else {
                        _loc11_[_loc13_.name] = true;
                    }
                    _loc11_[_loc13_.target.propName] = true;
                } else {
                    _loc11_[_loc13_.name] = true;
                }
                _loc7_--;
            }
            _loc7_ = (_loc6_.length - 1) | 0;
            while (_loc7_ > -1) {
                OverwriteManager.killVars(_loc11_, _loc6_[_loc7_].exposedVars, as3.cast(_loc6_[_loc7_].tweens, Array));
                _loc7_--;
            }
        } else {
            _loc7_ = (_loc6_.length - 1) | 0;
            while (_loc7_ > -1) {
                _loc6_[_loc7_].enabled = false;
                _loc7_--;
            }
        }
    }

    public static killVars(param1: any, param2: any, param3: any[]): void {
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: TweenInfo = null;
        _loc4_ = (param3.length - 1) | 0;
        while (_loc4_ > -1) {
            if ((_loc6_ = as3.cast(param3[_loc4_], TweenInfo)).name in param1) {
                param3.splice(_loc4_, 1);
            } else if (_loc6_.isPlugin && _loc6_.name == "_MULTIPLE_") {
                _loc6_.target.killProps(param1);
                if (_loc6_.target.overwriteProps.length == 0) {
                    param3.splice(_loc4_, 1);
                }
            }
            _loc4_--;
        }
        for (_loc5_ in param1) {
            delete param2[_loc5_];
        }
    }
}
