import { ASObject } from "as3";

export class Cubic extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * (param1 = param1 / param4) * param1 * param1 + param2;
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * ((param1 = param1 / param4 - 1) * param1 * param1 + 1) + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number): number {
        if ((param1 = param1 / (param4 / 2)) < 1) {
            return param3 / 2 * param1 * param1 * param1 + param2;
        }
        return param3 / 2 * ((param1 = param1 - 2) * param1 * param1 + 2) + param2;
    }
}
