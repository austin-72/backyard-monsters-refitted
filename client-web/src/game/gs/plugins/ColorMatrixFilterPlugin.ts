import * as as3 from "as3";
import { int } from "as3";
import { ColorMatrixFilter } from "flash/filters";
import { EndArrayPlugin, FilterPlugin, TweenLite } from "@game";

export class ColorMatrixFilterPlugin extends FilterPlugin {
    static {
        as3.fields(this, { _matrix: null, _matrixTween: null });
    }

    public static readonly VERSION: number = 1.1;

    public static readonly API: number = 1;

    protected static _idMatrix: any[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

    protected static _lumR: number = 0.212671;

    protected static _lumG: number = 0.71516;

    protected static _lumB: number = 0.072169;
    protected _matrix: any[];
    protected _matrixTween: EndArrayPlugin;

    public $ctor(): void {
        super.$ctor();
        this.propName = "colorMatrixFilter";
        this.overwriteProps = ["colorMatrixFilter"];
    }

    public static colorize(param1: any[], param2: number, param3: number = 1): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        if (isNaN(param3)) {
            param3 = 1;
        }
        let _loc4_: number = (param2 >> 16 & 255) / 255;
        let _loc5_: number = (param2 >> 8 & 255) / 255;
        let _loc6_: number = (param2 & 255) / 255;
        let _loc7_: number = NaN;
        let _loc8_: any[] = [(_loc7_ = 1 - param3) + param3 * _loc4_ * ColorMatrixFilterPlugin._lumR, param3 * _loc4_ * ColorMatrixFilterPlugin._lumG, param3 * _loc4_ * ColorMatrixFilterPlugin._lumB, 0, 0, param3 * _loc5_ * ColorMatrixFilterPlugin._lumR, _loc7_ + param3 * _loc5_ * ColorMatrixFilterPlugin._lumG, param3 * _loc5_ * ColorMatrixFilterPlugin._lumB, 0, 0, param3 * _loc6_ * ColorMatrixFilterPlugin._lumR, param3 * _loc6_ * ColorMatrixFilterPlugin._lumG, _loc7_ + param3 * _loc6_ * ColorMatrixFilterPlugin._lumB, 0, 0, 0, 0, 0, 1, 0];
        return ColorMatrixFilterPlugin.applyMatrix(_loc8_, param1);
    }

    public static setThreshold(param1: any[], param2: number): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        let _loc3_: any[] = [ColorMatrixFilterPlugin._lumR * 256, ColorMatrixFilterPlugin._lumG * 256, ColorMatrixFilterPlugin._lumB * 256, 0, -256 * param2, ColorMatrixFilterPlugin._lumR * 256, ColorMatrixFilterPlugin._lumG * 256, ColorMatrixFilterPlugin._lumB * 256, 0, -256 * param2, ColorMatrixFilterPlugin._lumR * 256, ColorMatrixFilterPlugin._lumG * 256, ColorMatrixFilterPlugin._lumB * 256, 0, -256 * param2, 0, 0, 0, 1, 0];
        return ColorMatrixFilterPlugin.applyMatrix(_loc3_, param1);
    }

    public static setHue(param1: any[], param2: number): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        param2 *= Math.PI / 180;
        let _loc3_: number = Math.cos(param2);
        let _loc4_: number = Math.sin(param2);
        let _loc5_: any[] = [ColorMatrixFilterPlugin._lumR + _loc3_ * (1 - ColorMatrixFilterPlugin._lumR) + _loc4_ * -ColorMatrixFilterPlugin._lumR, ColorMatrixFilterPlugin._lumG + _loc3_ * -ColorMatrixFilterPlugin._lumG + _loc4_ * -ColorMatrixFilterPlugin._lumG, ColorMatrixFilterPlugin._lumB + _loc3_ * -ColorMatrixFilterPlugin._lumB + _loc4_ * (1 - ColorMatrixFilterPlugin._lumB), 0, 0, ColorMatrixFilterPlugin._lumR + _loc3_ * -ColorMatrixFilterPlugin._lumR + _loc4_ * 0.143, ColorMatrixFilterPlugin._lumG + _loc3_ * (1 - ColorMatrixFilterPlugin._lumG) + _loc4_ * 0.14, ColorMatrixFilterPlugin._lumB + _loc3_ * -ColorMatrixFilterPlugin._lumB + _loc4_ * -0.283, 0, 0, ColorMatrixFilterPlugin._lumR + _loc3_ * -ColorMatrixFilterPlugin._lumR + _loc4_ * -(1 - ColorMatrixFilterPlugin._lumR), ColorMatrixFilterPlugin._lumG + _loc3_ * -ColorMatrixFilterPlugin._lumG + _loc4_ * ColorMatrixFilterPlugin._lumG, ColorMatrixFilterPlugin._lumB + _loc3_ * (1 - ColorMatrixFilterPlugin._lumB) + _loc4_ * ColorMatrixFilterPlugin._lumB, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];
        return ColorMatrixFilterPlugin.applyMatrix(_loc5_, param1);
    }

    public static setBrightness(param1: any[], param2: number): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        param2 = param2 * 100 - 100;
        return ColorMatrixFilterPlugin.applyMatrix([1, 0, 0, 0, param2, 0, 1, 0, 0, param2, 0, 0, 1, 0, param2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], param1);
    }

    public static setSaturation(param1: any[], param2: number): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        let _loc3_: number = 1 - param2;
        let _loc4_: number = _loc3_ * ColorMatrixFilterPlugin._lumR;
        let _loc5_: number = _loc3_ * ColorMatrixFilterPlugin._lumG;
        let _loc6_: number = _loc3_ * ColorMatrixFilterPlugin._lumB;
        let _loc7_: any[] = [_loc4_ + param2, _loc5_, _loc6_, 0, 0, _loc4_, _loc5_ + param2, _loc6_, 0, 0, _loc4_, _loc5_, _loc6_ + param2, 0, 0, 0, 0, 0, 1, 0];
        return ColorMatrixFilterPlugin.applyMatrix(_loc7_, param1);
    }

    public static setContrast(param1: any[], param2: number): any[] {
        if (isNaN(param2)) {
            return param1;
        }
        param2 += 0.01;
        let _loc3_: any[] = [param2, 0, 0, 0, 128 * (1 - param2), 0, param2, 0, 0, 128 * (1 - param2), 0, 0, param2, 0, 128 * (1 - param2), 0, 0, 0, 1, 0];
        return ColorMatrixFilterPlugin.applyMatrix(_loc3_, param1);
    }

    public static applyMatrix(param1: any[], param2: any[]): any[] {
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        if (!(as3.is(param1, Array)) || !(as3.is(param2, Array))) {
            return param2;
        }
        let _loc3_: any[] = [];
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        _loc6_ = 0;
        while (_loc6_ < 4) {
            _loc7_ = 0;
            while (_loc7_ < 5) {
                if (_loc7_ == 4) {
                    _loc5_ = param1[_loc4_ + 4] | 0;
                } else {
                    _loc5_ = 0;
                }
                _loc3_[_loc4_ + _loc7_] = param1[_loc4_] * param2[_loc7_] + param1[_loc4_ + 1] * param2[_loc7_ + 5] + param1[_loc4_ + 2] * param2[_loc7_ + 10] + param1[_loc4_ + 3] * param2[_loc7_ + 15] + _loc5_;
                _loc7_++;
            }
            _loc4_ += 5;
            _loc6_++;
        }
        return _loc3_;
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._type = ColorMatrixFilter;
        let _loc4_: any = param2;
        this.initFilter({ "remove": param2.remove, "index": param2.index, "addFilter": param2.addFilter }, new ColorMatrixFilter(ColorMatrixFilterPlugin._idMatrix.slice()));
        this._matrix = as3.cast(this._filter, ColorMatrixFilter).matrix;
        let _loc5_: any[] = [];
        if (_loc4_.matrix != null && as3.is(_loc4_.matrix, Array)) {
            _loc5_ = as3.cast(_loc4_.matrix, Array);
        } else {
            if (_loc4_.relative == true) {
                _loc5_ = this._matrix.slice();
            } else {
                _loc5_ = ColorMatrixFilterPlugin._idMatrix.slice();
            }
            _loc5_ = ColorMatrixFilterPlugin.setBrightness(_loc5_, Number(_loc4_.brightness));
            _loc5_ = ColorMatrixFilterPlugin.setContrast(_loc5_, Number(_loc4_.contrast));
            _loc5_ = ColorMatrixFilterPlugin.setHue(_loc5_, Number(_loc4_.hue));
            _loc5_ = ColorMatrixFilterPlugin.setSaturation(_loc5_, Number(_loc4_.saturation));
            _loc5_ = ColorMatrixFilterPlugin.setThreshold(_loc5_, Number(_loc4_.threshold));
            if (!isNaN(Number(_loc4_.colorize))) {
                _loc5_ = ColorMatrixFilterPlugin.colorize(_loc5_, Number(_loc4_.colorize), Number(_loc4_.amount));
            }
        }
        this._matrixTween = new EndArrayPlugin();
        this._matrixTween.init(this._matrix, _loc5_);
        return true;
    }

    public override set changeFactor(param1: number) {
        this._matrixTween.changeFactor = param1;
        as3.cast(this._filter, ColorMatrixFilter).matrix = this._matrix;
        super.changeFactor = param1;
    }
}
