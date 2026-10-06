import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject } from "flash/display";
import { ColorTransform } from "flash/geom";
import { TweenInfo, TweenLite, TweenPlugin } from "@game";

export class TintPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _ct: null, _ignoreAlpha: false });
    }

    public static readonly VERSION: number = 1.1;

    public static readonly API: number = 1;

    protected static _props: any[] = ["redMultiplier", "greenMultiplier", "blueMultiplier", "alphaMultiplier", "redOffset", "greenOffset", "blueOffset", "alphaOffset"];
    protected _target: DisplayObject;
    protected _ct: ColorTransform;
    protected _ignoreAlpha: boolean;

    public $ctor(): void {
        super.$ctor();
        this.propName = "tint";
        this.overwriteProps = ["tint"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (!(param1 instanceof DisplayObject)) {
            return false;
        }
        let _loc4_: ColorTransform = new ColorTransform();
        if (param2 != null && param3.exposedVars.removeTint != true) {
            _loc4_.color = param2 >>> 0;
        }
        this._ignoreAlpha = true;
        this.init(as3.as(param1, DisplayObject), _loc4_);
        return true;
    }

    public init(param1: DisplayObject, param2: ColorTransform): void {
        let _loc3_: int = 0;
        let _loc4_: string = null;
        this._target = param1;
        this._ct = this._target.transform.colorTransform;
        _loc3_ = (TintPlugin._props.length - 1) | 0;
        while (_loc3_ > -1) {
            _loc4_ = String(TintPlugin._props[_loc3_]);
            if (this._ct[_loc4_] != param2[_loc4_]) {
                this._tweens[this._tweens.length] = new TweenInfo(this._ct, _loc4_, Number(this._ct[_loc4_]), param2[_loc4_] - this._ct[_loc4_], "tint", false);
            }
            _loc3_--;
        }
    }

    public override set changeFactor(param1: number) {
        let _loc2_: ColorTransform = null;
        this.updateTweens(param1);
        if (this._ignoreAlpha) {
            _loc2_ = this._target.transform.colorTransform;
            this._ct.alphaMultiplier = _loc2_.alphaMultiplier;
            this._ct.alphaOffset = _loc2_.alphaOffset;
        }
        this._target.transform.colorTransform = this._ct;
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}
