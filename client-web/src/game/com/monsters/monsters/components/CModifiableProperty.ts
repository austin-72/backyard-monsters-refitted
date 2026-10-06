import * as as3 from "as3";
import { Vector, int } from "as3";
import { CProperty, IPropertyModifier } from "@game";

export class CModifiableProperty extends CProperty {
    static {
        as3.fields(this, { _modifiers: null, _cachedValue: NaN, _isDirty: true });
    }

    protected _modifiers: Vector<IPropertyModifier>;
    // Performance optimization: Cache calculated values to avoid recalculating modifiers every access
    private _cachedValue: number;
    private _isDirty: boolean;

    // Comment: Using compile-time constants for default parameter values
    public $ctor(param1: number = 1.7976931348623157e+308, param2: number = -1.7976931348623157e+308, param3: number = -1): void {
        this._cachedValue = NaN;
        super.$ctor(param1, param2, param3);
        this._modifiers = new Vector<IPropertyModifier>(0, false, IPropertyModifier);
    }

    public override get value(): number {
        // Performance optimization: Use cached value if available and not dirty
        if (!this._isDirty && !isNaN(this._cachedValue)) {
            return this._cachedValue;
        }

        let _loc1_: number = this._value;
        let _loc2_: int = 0;
        while (_loc2_ < this._modifiers.length) {
            _loc1_ = as3.vget(this._modifiers, _loc2_).modify(_loc1_);
            _loc2_++;
        }

        // Cache the calculated value
        this._cachedValue = _loc1_;
        this._isDirty = false;

        return _loc1_;
    }

    public override set value(param1: number) {
        super.value = param1;
        this._isDirty = true;
    }

    public get modifiers(): Vector<IPropertyModifier> {
        return this._modifiers;
    }

    public addModifier(param1: IPropertyModifier, param2: number = 0): void {
        this._modifiers.push(param1);
        this._isDirty = true;
    }

    public removeModifier(param1: IPropertyModifier): void {
        let _loc2_: int = this._modifiers.indexOf(param1) | 0;
        if (_loc2_ >= 0) {
            this._modifiers.splice(_loc2_, 1);
            this._isDirty = true;
        }
    }

    public getModifierByType(param1: any): IPropertyModifier {
        let _loc2_: int = 0;
        while (_loc2_ < this._modifiers.length) {
            if (as3.is(as3.vget(this._modifiers, _loc2_), param1)) {
                return as3.vget(this._modifiers, _loc2_);
            }
            _loc2_++;
        }
        return null;
    }

    public getModifier(param1: IPropertyModifier): IPropertyModifier {
        let _loc2_: int = this._modifiers.indexOf(param1) | 0;
        if (_loc2_ != -1) {
            return as3.vget(this._modifiers, _loc2_);
        }
        return null;
    }
}
