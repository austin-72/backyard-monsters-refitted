import { ASObject } from "as3";

export class Linear extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static easeNone(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * param1 / param4 + param2;
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * param1 / param4 + param2;
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * param1 / param4 + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * param1 / param4 + param2;
    }
}
