import { ASObject } from "as3";

export class Expo extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number): number {
        return param1 == 0 ? param2 : param3 * Math.pow(2, 10 * (param1 / param4 - 1)) + param2 - param3 * 0.001;
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        return param1 == param4 ? param2 + param3 : param3 * (-Math.pow(2, -10 * param1 / param4) + 1) + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number): number {
        if (param1 == 0) {
            return param2;
        }
        if (param1 == param4) {
            return param2 + param3;
        }
        if ((param1 = param1 / (param4 / 2)) < 1) {
            return param3 / 2 * Math.pow(2, 10 * (param1 - 1)) + param2;
        }
        return param3 / 2 * (-Math.pow(2, -10 * --param1) + 2) + param2;
    }
}
