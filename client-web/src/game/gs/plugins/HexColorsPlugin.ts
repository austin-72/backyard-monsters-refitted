import * as as3 from "as3";
import { int, uint } from "as3";
import { TweenLite, TweenPlugin } from "@game";

export class HexColorsPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _colors: null });
    }

    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;
    protected _colors: any[];

    public $ctor(): void {
        super.$ctor();
        this.propName = "hexColors";
        this.overwriteProps = [];
        this._colors = [];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        let _loc4_: string = null;
        for (_loc4_ in param2) {
            this.initColor(param1, _loc4_, param1[_loc4_] >>> 0, param2[_loc4_] >>> 0);
        }
        return true;
    }

    public initColor(param1: any, param2: string, param3: uint, param4: uint): void {
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: number = NaN;
        if (param3 != param4) {
            _loc5_ = param3 >> 16;
            _loc6_ = param3 >> 8 & 255;
            _loc7_ = param3 & 255;
            this._colors[this._colors.length] = [param1, param2, _loc5_, (param4 >> 16) - _loc5_, _loc6_, (param4 >> 8 & 255) - _loc6_, _loc7_, (param4 & 255) - _loc7_];
            this.overwriteProps[this.overwriteProps.length] = param2;
        }
    }

    public override killProps(param1: any): void {
        let _loc2_: int = (this._colors.length - 1) | 0;
        while (_loc2_ > -1) {
            if (param1[this._colors[_loc2_][1]] != undefined) {
                this._colors.splice(_loc2_, 1);
            }
            _loc2_--;
        }
        super.killProps(param1);
    }

    public override set changeFactor(param1: number) {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        _loc2_ = (this._colors.length - 1) | 0;
        while (_loc2_ > -1) {
            _loc3_ = as3.cast(this._colors[_loc2_], Array);
            _loc3_[0][_loc3_[1]] = _loc3_[2] + param1 * _loc3_[3] << 16 | _loc3_[4] + param1 * _loc3_[5] << 8 | _loc3_[6] + param1 * _loc3_[7];
            _loc2_--;
        }
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
