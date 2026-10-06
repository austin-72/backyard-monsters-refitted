import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { GLOBAL, LOGGER } from "@game";

export class SecNum extends ASObject {
    static {
        as3.fields(this, { _seed: 0, _x: 0, _n: 0, _n64: 0, _neg: false });
    }

    private static TWOPOW32: number; // const

    static {
        as3.lazyStatics(this, { TWOPOW32: NaN }, () => {
            SecNum.TWOPOW32 = Math.pow(2, 32);
        });
    }
    private _seed: uint;
    private _x: uint;
    private _n: uint;
    private _n64: uint;
    private _neg: boolean;

    public $ctor(param1?: number): void {
        super.$ctor();
        this.Set(param1);
    }

    public Set(param1: number): void {
        this._neg = false;
        if (param1 < 0) {
            param1 *= -1;
            this._neg = true;
        }
        this._seed = (Math.random() * 99999) >>> 0;
        param1 = Math.round(param1);
        this._x = (param1 ^ this._seed) >>> 0;
        this._n = ((param1 >>> 0) + (this._seed << 1) ^ this._seed) >>> 0;
        this._n64 = (param1 / SecNum.TWOPOW32) >>> 0;
    }

    public Add(param1: number): number {
        this.Set(param1 = param1 + this.Get());
        return param1;
    }

    public Get(): number {
        let _loc1_: number = this._n64 * SecNum.TWOPOW32 + ((this._x ^ this._seed) >>> 0);
        if (_loc1_ == this._n64 * SecNum.TWOPOW32 + ((((this._n ^ this._seed) >>> 0) - (this._seed << 1)) >>> 0)) {
            if (this._neg) {
                _loc1_ *= -1;
            }
            return _loc1_;
        }
        LOGGER.Log("err", "SecNum Broke (impossible unless.....)" + _loc1_ + " != " + (this._n64 * SecNum.TWOPOW32 + ((((this._n ^ this._seed) >>> 0) - (this._seed << 1)) >>> 0)) + "?");
        GLOBAL.ErrorMessage("SecNum");
        return 0;
    }
}
