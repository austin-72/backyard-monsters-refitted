import * as as3 from "as3";
import { int } from "as3";
import { ArrayTweenInfo, TweenLite, TweenPlugin } from "@game";

export class EndArrayPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _a: null, _info: null });
    }

    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;
    protected _a: any[];
    protected _info: any[];

    public $ctor(): void {
        this._info = [];
        super.$ctor();
        this.propName = "endArray";
        this.overwriteProps = ["endArray"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (!(as3.is(param1, Array)) || !(as3.is(param2, Array))) {
            return false;
        }
        this.init(as3.as(param1, Array), as3.cast(param2, Array));
        return true;
    }

    public init(param1: any[], param2: any[]): void {
        this._a = param1;
        let _loc3_: int = (param2.length - 1) | 0;
        while (_loc3_ > -1) {
            if (param1[_loc3_] != param2[_loc3_] && param1[_loc3_] != null) {
                this._info[this._info.length] = new ArrayTweenInfo(_loc3_ >>> 0, Number(this._a[_loc3_]), param2[_loc3_] - this._a[_loc3_]);
            }
            _loc3_--;
        }
    }

    public override set changeFactor(param1: number) {
        let _loc2_: int = 0;
        let _loc3_: ArrayTweenInfo = null;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        if (this.round) {
            _loc2_ = (this._info.length - 1) | 0;
            while (_loc2_ > -1) {
                _loc3_ = as3.cast(this._info[_loc2_], ArrayTweenInfo);
                _loc5_ = (_loc4_ = _loc3_.start + _loc3_.change * param1) < 0 ? -1 : 1;
                this._a[_loc3_.index] = _loc4_ % 1 * _loc5_ > 0.5 ? (_loc4_ | 0) + _loc5_ : _loc4_ | 0;
                _loc2_--;
            }
        } else {
            _loc2_ = (this._info.length - 1) | 0;
            while (_loc2_ > -1) {
                _loc3_ = as3.cast(this._info[_loc2_], ArrayTweenInfo);
                this._a[_loc3_.index] = _loc3_.start + _loc3_.change * param1;
                _loc2_--;
            }
        }
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
