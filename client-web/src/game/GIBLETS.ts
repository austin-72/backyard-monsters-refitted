import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Point } from "flash/geom";
import { EFFECTS, GIBLET, GLOBAL, GRID, LOGGER, MAP } from "@game";

export class GIBLETS extends ASObject {
    public static _giblets: any = {};

    public static _gibletCount: int = 0;

    public static _tmpGibCount: int = 0;

    public static _frame: int = 0;

    private static _pool: Vector<GIBLET> = new Vector<GIBLET>(0, false, GIBLET);

    public $ctor(): void {
        super.$ctor();
    }

    public static Clear(): void {
        let giblet: GIBLET = null;
        let g: string = null;
        try {
            for (g in GIBLETS._giblets) {
                giblet = as3.cast(GIBLETS._giblets[g], GIBLET);
                if (giblet.parent) {
                    giblet.parent.removeChild(giblet);
                }
                giblet.Clear();
                GIBLETS.PoolSet(giblet);
                delete GIBLETS._giblets[g];
            }
            GIBLETS._giblets = {};
            GIBLETS._gibletCount = 0;
            GIBLETS._frame = 0;
        } catch (e) {
            LOGGER.Log("err", "Giblets Clear" + " " + e.getStackTrace());
        }
    }

    public static PoolGet(param1: int, param2: Point, param3: Point, param4: int, param5: number, param6: number): GIBLET {
        let _loc7_: GIBLET = null;
        if (GIBLETS._pool.length) {
            _loc7_ = as3.cast(GIBLETS._pool.pop(), GIBLET);
        } else {
            _loc7_ = new GIBLET();
        }
        _loc7_.init(param1, param2, param3, param4, param5, param6);
        return _loc7_;
    }

    public static PoolSet(param1: GIBLET): void {
        GIBLETS._pool.push(param1);
    }

    public static Create(param1: Point, param2: number, param3: int, param4: int, param5: int = 0): void {
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        if (!GLOBAL._catchup) {
            if (GIBLETS._tmpGibCount < 20) {
                _loc6_ = 0;
                while (_loc6_ < param4) {
                    ++GIBLETS._tmpGibCount;
                    _loc7_ = param3 * 0.2 + Math.random() * (param3 * 0.8);
                    if (Math.random() <= 0.3) {
                        _loc7_ *= 1.5;
                    }
                    GIBLETS.Spawn(param1.add(new Point(-3 + Math.random() * 6, -2 + Math.random() * 4)), param2, _loc7_ | 0, _loc6_ / 100, param5);
                    _loc6_++;
                }
            }
        }
    }

    public static Spawn(param1: Point, param2: number, param3: int, param4: number, param5: int): void {
        let _loc6_: number = Math.random() * 360;
        let _loc7_: Point = null;
        let _loc8_: number = (_loc7_ = GRID.FromISO(param1.x, param1.y)).x + Math.cos(_loc6_) * param3;
        let _loc9_: number = _loc7_.y + Math.sin(_loc6_) * param3;
        let _loc10_: Point = GRID.ToISO(_loc8_, _loc9_, 0).add(new Point(0, param5));
        GIBLETS._giblets[GIBLETS._gibletCount] = MAP._RESOURCES.addChild(GIBLETS.PoolGet(GIBLETS._gibletCount, param1, _loc10_, param3, param4, param2));
        ++GIBLETS._gibletCount;
    }

    public static Remove(param1: any): void {
        let _loc2_: GIBLET = as3.cast(GIBLETS._giblets[param1], GIBLET);
        --GIBLETS._tmpGibCount;
        try {
            EFFECTS.SplatParticle(20, _loc2_.x, _loc2_.y, 0, 0);
            MAP._RESOURCES.removeChild(_loc2_);
            _loc2_.Clear();
            GIBLETS.PoolSet(_loc2_);
            delete GIBLETS._giblets[param1];
        } catch (e) {
        }
    }
}
