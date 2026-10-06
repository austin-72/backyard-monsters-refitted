import { ASObject } from "as3";

export class Elastic extends ASObject {
    private static readonly _2PI: number = Math.PI * 2;

    public $ctor(): void {
        super.$ctor();
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number, param5: number = 0, param6: number = 0): number {
        let _loc7_: number = NaN;
        if (param1 == 0) {
            return param2;
        }
        if ((param1 = param1 / param4) == 1) {
            return param2 + param3;
        }
        if (!param6) {
            param6 = param4 * 0.3;
        }
        if (!param5 || param5 < Math.abs(param3)) {
            param5 = param3;
            _loc7_ = param6 / 4;
        } else {
            _loc7_ = param6 / Elastic._2PI * Math.asin(param3 / param5);
        }
        return -(param5 * Math.pow(2, 10 * (param1 = param1 - 1)) * Math.sin((param1 * param4 - _loc7_) * Elastic._2PI / param6)) + param2;
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number, param5: number = 0, param6: number = 0): number {
        let _loc7_: number = NaN;
        if (param1 == 0) {
            return param2;
        }
        if ((param1 = param1 / param4) == 1) {
            return param2 + param3;
        }
        if (!param6) {
            param6 = param4 * 0.3;
        }
        if (!param5 || param5 < Math.abs(param3)) {
            param5 = param3;
            _loc7_ = param6 / 4;
        } else {
            _loc7_ = param6 / Elastic._2PI * Math.asin(param3 / param5);
        }
        return param5 * Math.pow(2, -10 * param1) * Math.sin((param1 * param4 - _loc7_) * Elastic._2PI / param6) + param3 + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number, param5: number = 0, param6: number = 0): number {
        let _loc7_: number = NaN;
        if (param1 == 0) {
            return param2;
        }
        if ((param1 = param1 / (param4 / 2)) == 2) {
            return param2 + param3;
        }
        if (!param6) {
            param6 = param4 * (0.3 * 1.5);
        }
        if (!param5 || param5 < Math.abs(param3)) {
            param5 = param3;
            _loc7_ = param6 / 4;
        } else {
            _loc7_ = param6 / Elastic._2PI * Math.asin(param3 / param5);
        }
        if (param1 < 1) {
            return -0.5 * (param5 * Math.pow(2, 10 * (param1 = param1 - 1)) * Math.sin((param1 * param4 - _loc7_) * Elastic._2PI / param6)) + param2;
        }
        return param5 * Math.pow(2, -10 * (param1 = param1 - 1)) * Math.sin((param1 * param4 - _loc7_) * Elastic._2PI / param6) * 0.5 + param3 + param2;
    }
}
