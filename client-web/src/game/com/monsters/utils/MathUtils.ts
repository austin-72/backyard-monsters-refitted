import { ASObject } from "as3";
import { Point } from "flash/geom";
import { GLOBAL } from "@game";

export class MathUtils extends ASObject {
    public static readonly DEGREES_TO_RADIANS: number = Math.PI / 180;

    public static readonly RADIANS_TO_DEGREES: number = 180 / Math.PI;

    public $ctor(): void {
        super.$ctor();
    }

    public static getDistanceBetweenTwoPoints(param1: Point, param2: Point): number {
        return GLOBAL.QuickDistance(param1, param2);
    }

    public static getAngleBetweenTwoPointsInRadians(param1: Point, param2: Point): number {
        return Math.atan2(param2.y - param1.y, param2.x - param1.x);
    }

    public static getAngleBetweenTwoPointsInDegrees(param1: Point, param2: Point): number {
        return MathUtils.getAngleBetweenTwoPointsInRadians(param1, param2) * MathUtils.RADIANS_TO_DEGREES;
    }
}
