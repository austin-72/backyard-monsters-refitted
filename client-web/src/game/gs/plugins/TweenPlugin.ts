import * as as3 from "as3";
import { ASObject, int } from "as3";
import { TweenInfo, TweenLite } from "@game";

export class TweenPlugin extends ASObject {
    static {
        as3.fields(this, { propName: null, overwriteProps: null, round: false, onComplete: null, _tweens: null, _changeFactor: 0 });
    }

    public static readonly VERSION: number = 1.03;

    public static readonly API: number = 1;
    public propName: string;
    public overwriteProps: any[];
    public round: boolean;
    public onComplete: Function;
    protected _tweens: any[];
    protected _changeFactor: number;

    public $ctor(): void {
        this._tweens = [];
        super.$ctor();
    }

    public static activate(param1: any[]): boolean {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        _loc2_ = (param1.length - 1) | 0;
        while (_loc2_ > -1) {
            _loc3_ = new param1[_loc2_]();
            TweenLite.plugins[_loc3_.propName] = param1[_loc2_];
            _loc2_--;
        }
        return true;
    }

    public onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this.addTween(param1, this.propName, Number(param1[this.propName]), param2, this.propName);
        return true;
    }

    protected addTween(param1: any, param2: string, param3: number, param4: any, param5: string = null): void {
        let _loc6_: number = NaN;
        if (param4 != null) {
            if ((_loc6_ = typeof param4 == "number" ? param4 - param3 : Number(param4)) != 0) {
                this._tweens[this._tweens.length] = new TweenInfo(param1, param2, param3, _loc6_, param5 || param2, false);
            }
        }
    }

    protected updateTweens(param1: number): void {
        let _loc2_: int = 0;
        let _loc3_: TweenInfo = null;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        if (this.round) {
            _loc2_ = (this._tweens.length - 1) | 0;
            while (_loc2_ > -1) {
                _loc3_ = as3.cast(this._tweens[_loc2_], TweenInfo);
                _loc5_ = (_loc4_ = _loc3_.start + _loc3_.change * param1) < 0 ? -1 : 1;
                _loc3_.target[_loc3_.property] = _loc4_ % 1 * _loc5_ > 0.5 ? (_loc4_ | 0) + _loc5_ : _loc4_ | 0;
                _loc2_--;
            }
        } else {
            _loc2_ = (this._tweens.length - 1) | 0;
            while (_loc2_ > -1) {
                _loc3_ = as3.cast(this._tweens[_loc2_], TweenInfo);
                _loc3_.target[_loc3_.property] = _loc3_.start + _loc3_.change * param1;
                _loc2_--;
            }
        }
    }

    public set changeFactor(param1: number) {
        this.updateTweens(param1);
        this._changeFactor = param1;
    }

    public get changeFactor(): number {
        return this._changeFactor;
    }

    public killProps(param1: any): void {
        let _loc2_: int = 0;
        _loc2_ = (this.overwriteProps.length - 1) | 0;
        while (_loc2_ > -1) {
            if (this.overwriteProps[_loc2_] in param1) {
                this.overwriteProps.splice(_loc2_, 1);
            }
            _loc2_--;
        }
        _loc2_ = (this._tweens.length - 1) | 0;
        while (_loc2_ > -1) {
            if (this._tweens[_loc2_].name in param1) {
                this._tweens.splice(_loc2_, 1);
            }
            _loc2_--;
        }
    }
}
