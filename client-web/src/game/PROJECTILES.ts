import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { GLOBAL, IAttackable, MAP, PROJECTILE, PROJECTILE_CLIP } from "@game";

export class PROJECTILES extends ASObject {
    public static _projectiles: any = null;

    public static _id: int = 0;

    public static _projectileCount: int = 0;

    public static _pool: any[] = [];

    public $ctor(): void {
        super.$ctor();
        PROJECTILES.Clear();
    }

    public static Spawn(param1: Point, param2: Point, param3: IAttackable, param4: number, param5: int, param6: boolean = false, param7: int = 0, param8: int = 0): void {
        let _loc9_: PROJECTILE = PROJECTILES.PoolGet();
        if (!GLOBAL._catchup) {
            _loc9_._graphic = new PROJECTILE_CLIP();
            MAP._PROJECTILES.addChild(_loc9_._graphic);
        }
        _loc9_._id = PROJECTILES._id;
        _loc9_._startPoint = param1;
        if (param3) {
        }
        _loc9_._targetPoint = param2;
        _loc9_._target = param3;
        _loc9_._maxSpeed = param4;
        _loc9_._damage = param5;
        _loc9_._rocket = param6;
        _loc9_._splash = param7;
        _loc9_._splashTargetFlags = param8;
        _loc9_._tmpX = param1.x;
        _loc9_._tmpY = param1.y;
        if (param6) {
            _loc9_._speed = param4 / 2;
            _loc9_._rotationEasing = 25;
            _loc9_._graphic.rotation = Math.random() * 360;
        } else {
            _loc9_._speed = param4;
        }
        _loc9_._startDistance = 0;
        if (!PROJECTILES._projectiles) {
            PROJECTILES._projectiles = {};
        }
        PROJECTILES._projectiles[PROJECTILES._id] = _loc9_;
        ++PROJECTILES._id;
        ++PROJECTILES._projectileCount;
    }

    public static Remove(param1: int): void {
        let _loc2_: PROJECTILE = as3.cast(PROJECTILES._projectiles[param1], PROJECTILE);
        try {
            MAP._PROJECTILES.removeChild(_loc2_._graphic);
        } catch (e) {
        }
        PROJECTILES.PoolSet(_loc2_);
        delete PROJECTILES._projectiles[param1];
        --PROJECTILES._projectileCount;
    }

    public static Tick(): void {
        let _loc1_: string = null;
        let _loc2_: PROJECTILE = null;
        for (_loc2_ of as3.values(PROJECTILES._projectiles)) {
            _loc2_.Tick();
        }
    }

    public static Clear(): void {
        let _loc1_: string = null;
        let _loc2_: PROJECTILE = null;
        for (_loc1_ in PROJECTILES._projectiles) {
            _loc2_ = as3.cast(PROJECTILES._projectiles[_loc1_], PROJECTILE);
            try {
                MAP._PROJECTILES.removeChild(_loc2_._graphic);
            } catch (e) {
            }
        }
        PROJECTILES._projectiles = {};
        PROJECTILES._id = 0;
        PROJECTILES._projectileCount = 0;
    }

    public static PoolSet(param1: PROJECTILE): void {
        PROJECTILES._pool.push(param1);
    }

    public static PoolGet(): PROJECTILE {
        let _loc1_: PROJECTILE = null;
        if (PROJECTILES._pool.length) {
            _loc1_ = as3.cast(PROJECTILES._pool.pop(), PROJECTILE);
        } else {
            _loc1_ = new PROJECTILE();
        }
        return _loc1_;
    }
}
