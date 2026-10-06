import * as as3 from "as3";
import { int } from "as3";
import { BitmapFilter } from "flash/filters";
import { HexColorsPlugin, TweenInfo, TweenPlugin } from "@game";

export class FilterPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _type: null, _filter: null, _index: 0, _remove: false });
    }

    public static readonly VERSION: number = 1.03;

    public static readonly API: number = 1;
    protected _target: any;
    protected _type: any;
    protected _filter: BitmapFilter;
    protected _index: int;
    protected _remove: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    protected initFilter(param1: any, param2: BitmapFilter): void {
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc6_: HexColorsPlugin = null;
        let _loc3_: any[] = as3.cast(this._target.filters, Array);
        this._index = -1;
        if (param1.index != null) {
            this._index = param1.index | 0;
        } else {
            _loc5_ = (_loc3_.length - 1) | 0;
            while (_loc5_ > -1) {
                if (as3.is(_loc3_[_loc5_], this._type)) {
                    this._index = _loc5_;
                    break;
                }
                _loc5_--;
            }
        }
        if (this._index == -1 || _loc3_[this._index] == null || param1.addFilter == true) {
            this._index = param1.index != null ? param1.index | 0 : _loc3_.length | 0;
            _loc3_[this._index] = param2;
            this._target.filters = _loc3_;
        }
        this._filter = as3.cast(_loc3_[this._index], BitmapFilter);
        this._remove = Boolean(param1.remove == true);
        if (this._remove) {
            this.onComplete = as3.bind(this, this.onCompleteTween);
        }
        let _loc7_: any = param1.isTV == true ? param1.exposedVars : param1;
        for (_loc4_ in _loc7_) {
            if (!(!(_loc4_ in this._filter) || this._filter[_loc4_] == _loc7_[_loc4_] || _loc4_ == "remove" || _loc4_ == "index" || _loc4_ == "addFilter")) {
                if (_loc4_ == "color" || _loc4_ == "highlightColor" || _loc4_ == "shadowColor") {
                    (_loc6_ = new HexColorsPlugin()).initColor(this._filter, _loc4_, this._filter[_loc4_] >>> 0, _loc7_[_loc4_] >>> 0);
                    this._tweens[this._tweens.length] = new TweenInfo(_loc6_, "changeFactor", 0, 1, _loc4_, false);
                } else if (_loc4_ == "quality" || _loc4_ == "inner" || _loc4_ == "knockout" || _loc4_ == "hideObject") {
                    this._filter[_loc4_] = _loc7_[_loc4_];
                } else {
                    this.addTween(this._filter, _loc4_, Number(this._filter[_loc4_]), _loc7_[_loc4_], _loc4_);
                }
            }
        }
    }

    public onCompleteTween(): void {
        let _loc1_: int = 0;
        let _loc2_: any[] = null;
        if (this._remove) {
            _loc2_ = as3.cast(this._target.filters, Array);
            if (!(as3.is(_loc2_[this._index], this._type))) {
                _loc1_ = (_loc2_.length - 1) | 0;
                while (_loc1_ > -1) {
                    if (as3.is(_loc2_[_loc1_], this._type)) {
                        _loc2_.splice(_loc1_, 1);
                        break;
                    }
                    _loc1_--;
                }
            } else {
                _loc2_.splice(this._index, 1);
            }
            this._target.filters = _loc2_;
        }
    }

    public override set changeFactor(param1: number) {
        let _loc2_: int = 0;
        let _loc3_: TweenInfo = null;
        let _loc4_: any[] = as3.cast(this._target.filters, Array);
        _loc2_ = (this._tweens.length - 1) | 0;
        while (_loc2_ > -1) {
            _loc3_ = as3.cast(this._tweens[_loc2_], TweenInfo);
            _loc3_.target[_loc3_.property] = _loc3_.start + _loc3_.change * param1;
            _loc2_--;
        }
        if (!(as3.is(_loc4_[this._index], this._type))) {
            this._index = (_loc4_.length - 1) | 0;
            _loc2_ = (_loc4_.length - 1) | 0;
            while (_loc2_ > -1) {
                if (as3.is(_loc4_[_loc2_], this._type)) {
                    this._index = _loc2_;
                    break;
                }
                _loc2_--;
            }
        }
        _loc4_[this._index] = this._filter;
        this._target.filters = _loc4_;
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
