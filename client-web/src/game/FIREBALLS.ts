import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, Console, FIREBALL, GLOBAL, IAttackable, MAP, MonsterBase, VacuumHose } from "@game";

export class FIREBALLS extends ASObject {
    public static TYPE_FIREBALL: string; // const

    public static TYPE_MISSILE: string; // const

    public static TYPE_MAGMA: string; // const

    public static _fireballs: any;

    public static _id: int;

    public static _fireballCount: int;

    public static _type: string;

    public static _pool: any[];

    static {
        as3.lazyStatics(this, { TYPE_FIREBALL: null, TYPE_MISSILE: null, TYPE_MAGMA: null, _fireballs: null, _id: 0, _fireballCount: 0, _type: null, _pool: null }, () => {
            FIREBALLS.TYPE_FIREBALL = "fireball";
            FIREBALLS.TYPE_MISSILE = "missile";
            FIREBALLS.TYPE_MAGMA = "magma";
            FIREBALLS._type = FIREBALL.TYPE_FIREBALL;
            FIREBALLS._pool = [];
        });
    }

    public $ctor(): void {
        super.$ctor();
        FIREBALLS.Clear();
    }

    public static Spawn(param1: Point, param2: Point, param3: BFOUNDATION, param4: number, param5: int, param6: int = 0, param7: int = 0, param8: string = "fireball", param9: IAttackable = null): FIREBALL {
        let _loc10_: FIREBALL = null;
        if (!param8) {
            param8 = FIREBALL.TYPE_FIREBALL;
        }
        FIREBALLS._type = param8;
        _loc10_ = FIREBALLS.PoolGet();
        if (param8 == FIREBALLS.TYPE_FIREBALL || param8 == FIREBALLS.TYPE_MAGMA) {
            if (param5 > 0) {
                _loc10_._graphic.gotoAndStop(1);
            } else {
                _loc10_._graphic.gotoAndStop(2);
            }
        }
        if (!GLOBAL._catchup) {
            MAP._FIREBALLS.addChild(_loc10_._graphic);
        }
        _loc10_._id = FIREBALLS._id;
        if (!param9) {
            Console.warning("you created a fireball with no source", true);
        }
        _loc10_._source = param9;
        _loc10_._startPoint = param1;
        _loc10_._targetType = 2;
        _loc10_._targetBuilding = param3;
        _loc10_._maxSpeed = param4;
        _loc10_._damage = param5;
        _loc10_._splash = param6;
        _loc10_._tmpX = param1.x;
        _loc10_._tmpY = param1.y;
        _loc10_._glaves = param7;
        _loc10_._speed = param4;
        _loc10_._startDistance = 0;
        if (!FIREBALLS._fireballs) {
            FIREBALLS._fireballs = {};
        }
        FIREBALLS._fireballs[FIREBALLS._id] = _loc10_;
        ++FIREBALLS._id;
        ++FIREBALLS._fireballCount;
        return _loc10_;
    }

    public static Spawn2(param1: Point, param2: Point, param3: IAttackable, param4: number, param5: int, param6: int = 0, param7: string = "fireball", param8: int = 1, param9: IAttackable = null): FIREBALL {
        let _loc10_: FIREBALL = null;
        if (!param7) {
            param7 = FIREBALL.TYPE_FIREBALL;
        }
        FIREBALLS._type = param7;
        _loc10_ = FIREBALLS.PoolGet();
        if (!GLOBAL._catchup) {
            MAP._FIREBALLS.addChild(_loc10_._graphic);
        }
        if (param5 > 0) {
            _loc10_._graphic.gotoAndStop(1);
        } else {
            _loc10_._graphic.gotoAndStop(2);
        }
        _loc10_._type = param7;
        _loc10_._id = FIREBALLS._id;
        if (!param9) {
            Console.warning("you created a fireball with no source", true);
        }
        _loc10_._source = param9;
        _loc10_._startPoint = param1;
        _loc10_._targetType = param3 instanceof VacuumHose ? 4 : param8;
        _loc10_._targetPoint = param2;
        _loc10_._targetCreep = param3;
        _loc10_._maxSpeed = param4;
        _loc10_._damage = param5;
        _loc10_._glaves = 0;
        if (param3 && param3 instanceof MonsterBase && as3.cast(param3, MonsterBase)._movement != "fly") {
            _loc10_._splash = param6;
        } else {
            _loc10_._splash = 0;
        }
        _loc10_._tmpX = param1.x;
        _loc10_._tmpY = param1.y;
        _loc10_._speed = param4;
        _loc10_._startDistance = 0;
        if (!FIREBALLS._fireballs) {
            FIREBALLS._fireballs = {};
        }
        FIREBALLS._fireballs[FIREBALLS._id] = _loc10_;
        ++FIREBALLS._id;
        ++FIREBALLS._fireballCount;
        return _loc10_;
    }

    public static Remove(param1: int): void {
        let _loc2_: FIREBALL = as3.cast(FIREBALLS._fireballs[param1], FIREBALL);
        try {
            _loc2_._graphic.filters = [];
            MAP._FIREBALLS.removeChild(_loc2_._graphic);
        } catch (e) {
        }
        FIREBALLS.PoolSet(_loc2_);
        delete FIREBALLS._fireballs[param1];
        --FIREBALLS._fireballCount;
    }

    public static Tick(): void {
        let _loc1_: string = null;
        let _loc2_: FIREBALL = null;
        for (_loc2_ of as3.values(FIREBALLS._fireballs)) {
            _loc2_.Tick();
        }
    }

    public static Clear(): void {
        let _loc1_: string = null;
        let _loc2_: FIREBALL = null;
        for (_loc1_ in FIREBALLS._fireballs) {
            _loc2_ = as3.cast(FIREBALLS._fireballs[_loc1_], FIREBALL);
            try {
                MAP._FIREBALLS.removeChild(_loc2_._graphic);
            } catch (e) {
            }
        }
        FIREBALLS._fireballs = {};
        FIREBALLS._id = 0;
        FIREBALLS._fireballCount = 0;
    }

    public static PoolSet(param1: FIREBALL): void {
        FIREBALLS._pool.push(param1);
    }

    public static PoolGet(): FIREBALL {
        let _loc1_: FIREBALL = null;
        if (FIREBALLS._pool.length) {
            _loc1_ = as3.cast(FIREBALLS._pool.pop(), FIREBALL);
        } else {
            _loc1_ = new FIREBALL();
        }
        _loc1_.Setup(FIREBALLS._type);
        return _loc1_;
    }
}
