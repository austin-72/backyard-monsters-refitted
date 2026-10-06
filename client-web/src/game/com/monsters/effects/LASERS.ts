import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { LASER, MAP } from "@game";

export class LASERS extends ASObject {
    public static _distance: int = 0;

    public static _angle: number = NaN;

    public static _pointA: Point = new Point(50, 50);

    public static _pointB: Point = null;

    public static _duration: number = 0;

    public static _power: number = 0;

    public static _lasers: any = {};

    public static _laserCount: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Fire(param1: int, param2: int, param3: int, param4: int, param5: int = 0, param6: number = 0, param7: number = 0, param8: Function = null): void {
        let _loc9_: LASER = null;
        (_loc9_ = new LASER()).Fire(MAP._PROJECTILES, new Point(param1, param2), new Point(param3, param4), param5, param6, param7, param8);
        LASERS._lasers["l" + LASERS._laserCount] = _loc9_;
        ++LASERS._laserCount;
    }

    public static Tick(): void {
        let _loc1_: string = null;
        for (_loc1_ in LASERS._lasers) {
            if (LASERS._lasers[_loc1_].Tick()) {
                delete LASERS._lasers[_loc1_];
            }
        }
    }
}
