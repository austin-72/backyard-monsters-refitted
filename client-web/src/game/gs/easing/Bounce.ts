import { ASObject } from "as3";

export class Bounce extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        if ((param1 = param1 / param4) < 1 / 2.75) {
            return param3 * (7.5625 * param1 * param1) + param2;
        }
        if (param1 < 2 / 2.75) {
            return param3 * (7.5625 * (param1 = param1 - 1.5 / 2.75) * param1 + 0.75) + param2;
        }
        if (param1 < 2.5 / 2.75) {
            return param3 * (7.5625 * (param1 = param1 - 2.25 / 2.75) * param1 + 0.9375) + param2;
        }
        return param3 * (7.5625 * (param1 = param1 - 2.625 / 2.75) * param1 + 0.984375) + param2;
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number): number {
        return param3 - Bounce.easeOut(param4 - param1, 0, param3, param4) + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number): number {
        if (param1 < param4 / 2) {
            return Bounce.easeIn(param1 * 2, 0, param3, param4) * 0.5 + param2;
        }
        return Bounce.easeOut(param1 * 2 - param4, 0, param3, param4) * 0.5 + param3 * 0.5 + param2;
    }
}
