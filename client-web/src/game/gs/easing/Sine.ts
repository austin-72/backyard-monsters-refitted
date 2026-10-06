import { ASObject } from "as3";

export class Sine extends ASObject {
    private static readonly _HALF_PI: number = Math.PI / 2;

    public $ctor(): void {
        super.$ctor();
    }

    public static easeIn(param1: number, param2: number, param3: number, param4: number): number {
        return -param3 * Math.cos(param1 / param4 * Sine._HALF_PI) + param3 + param2;
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        return param3 * Math.sin(param1 / param4 * Sine._HALF_PI) + param2;
    }

    public static easeInOut(param1: number, param2: number, param3: number, param4: number): number {
        return -param3 / 2 * (Math.cos(Math.PI * param1 / param4) - 1) + param2;
    }
}
