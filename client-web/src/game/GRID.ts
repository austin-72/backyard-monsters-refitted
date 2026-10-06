import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BFOUNDATION, GLOBAL, LOGGER } from "@game";

export class GRID extends ASObject {
    public static _mapWidth: int; // const

    public static _mapHeight: int; // const

    public static _rowOffset: int; // const

    public static _grid: Vector<uint>;

    static {
        as3.lazyStatics(this, { _mapWidth: 0, _mapHeight: 0, _rowOffset: 0, _grid: null }, () => {
            GRID._mapWidth = 2600;
            GRID._mapHeight = 2600;
            GRID._rowOffset = Math.ceil(GRID._mapWidth / 5) | 0;
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static CreateGrid(): void {
        let _loc1_: int = getTimer();
        GRID.Cleanup();
    }

    public static Block(param1: Rectangle, param2: boolean = false): void {
        let _loc4_: Point = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc3_: Point = GRID.FromISO(param1.x, param1.y);
        param1.x = _loc3_.x;
        param1.y = _loc3_.y;
        let _loc5_: int = 0;
        while (_loc5_ < param1.width) {
            _loc6_ = 0;
            while (_loc6_ < param1.height) {
                if ((_loc7_ = ((_loc4_ = GRID.GlobalLocal(new Point(_loc5_ + param1.x, _loc6_ + param1.y), 5)).x + _loc4_.y * GRID._rowOffset) | 0) > 0 && _loc7_ < GRID._grid.length) {
                    if (param2) {
                        (($v: any, $i: any) => as3.vset($v, $i, (as3.vget($v, $i) | 1) >>> 0))(GRID._grid, _loc4_.x + _loc4_.y * GRID._rowOffset);
                    } else {
                        (($v: any, $i: any) => as3.vset($v, $i, (as3.vget($v, $i) & ~1) >>> 0))(GRID._grid, _loc4_.x + _loc4_.y * GRID._rowOffset);
                    }
                }
                _loc6_ += 5;
            }
            _loc5_ += 5;
        }
        GRID.Clear();
    }

    public static FindSpace(param1: BFOUNDATION): void {
        let _loc3_: boolean = false;
        let _loc4_: Point = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc9_: int = 0;
        let _loc2_: Rectangle = as3.cast(param1._footprint[0], Rectangle);
        let _loc8_: int = 0;
        while (_loc8_ < 120) {
            _loc9_ = 0;
            while (_loc9_ < 100) {
                _loc4_ = GRID.ToISO(-(GLOBAL._mapWidth * 0.5) + _loc8_ * 10, -(GLOBAL._mapHeight * 0.5) + _loc9_ * 10, 0);
                if (!GRID.FootprintBlocked(param1._footprint, _loc4_, true)) {
                    LOGGER.Log("err", "GRID.FindSpace " + _loc8_ + ", " + _loc9_ + ", " + _loc4_.x + ", " + _loc4_.y);
                    param1._mc.x = _loc4_.x;
                    param1._mc.y = _loc4_.y;
                    param1._mcBase.x = _loc4_.x;
                    param1._mcBase.y = _loc4_.y;
                    param1._mcFootprint.x = _loc4_.x;
                    param1._mcFootprint.y = _loc4_.y;
                    param1.GridCost(true);
                    return;
                }
                _loc9_++;
            }
            _loc8_++;
        }
    }

    public static FootprintBlocked(param1: any[], param2: Point, param3: boolean = false, param4: boolean = false): boolean {
        let _loc5_: Rectangle = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        param2 = GRID.FromISO(param2.x, param2.y);
        for (_loc5_ of as3.values(param1)) {
            _loc6_ = 0;
            while (_loc6_ < _loc5_.width) {
                _loc7_ = 0;
                while (_loc7_ < _loc5_.height) {
                    if (GRID.Blocked(new Point(_loc6_ + _loc5_.x + param2.x, _loc7_ + _loc5_.y + param2.y), param3, param4) > 0) {
                        return true;
                    }
                    _loc7_ += 5;
                }
                _loc6_ += 5;
            }
        }
        return false;
    }

    public static Blocked(param1: Point, param2: boolean = false, param3: boolean = false): int {
        let _loc4_: Point = null;
        if ((_loc4_ = GRID.GlobalLocal(new Point(param1.x, param1.y), 5)).x < 0 || _loc4_.y < 0 || _loc4_.x >= GRID._mapWidth / 5 || _loc4_.y >= GRID._mapHeight / 5) {
            return 3;
        }
        let _loc5_: int = (GLOBAL._mapWidth * 0.5) | 0;
        let _loc6_: int = (GLOBAL._mapHeight * 0.5) | 0;
        if (param2 && !param3 && (param1.x < 0 - _loc5_ || param1.x >= _loc5_ || param1.y < 0 - _loc6_ || param1.y >= _loc6_)) {
            return 2;
        }
        return as3.vget(GRID._grid, _loc4_.x + _loc4_.y * GRID._rowOffset) & 1;
    }

    public static Clear(): void {
    }

    public static Cleanup(): void {
        let _loc1_: int = (Math.ceil(GRID._mapWidth / 5) * Math.ceil(GRID._mapHeight / 5)) | 0;
        GRID._grid = new Vector<uint>(_loc1_, true, uint);
    }

    public static GlobalLocal(param1: Point, param2: int): Point {
        let _loc3_: number = ((param1.x + GRID._mapWidth * 0.5) / param2) | 0;
        let _loc4_: number = ((param1.y + GRID._mapHeight * 0.5) / param2) | 0;
        return new Point(_loc3_, _loc4_);
    }

    public static LocalGlobal(param1: Point, param2: int): Point {
        let _loc3_: number = ((param1.x * param2 - GRID._mapWidth * 0.5) | 0) + param2 * 0.5;
        let _loc4_: number = ((param1.y * param2 - GRID._mapHeight * 0.5) | 0) + param2 * 0.5;
        return new Point(_loc3_, _loc4_);
    }

    public static ToISO(param1: number, param2: number, param3: number): Point {
        let _loc4_: number = (param1 + param2) * 0.5 - param3;
        let _loc5_: number = param1 - param2;
        return new Point(Math.floor(_loc5_), Math.floor(_loc4_));
    }

    public static FromISO(param1: number, param2: number): Point {
        let _loc3_: number = param2 - param1 * 0.5;
        let _loc4_: number = param1 * 0.5 + param2;
        return new Point(Math.ceil(_loc4_), Math.ceil(_loc3_));
    }
}
