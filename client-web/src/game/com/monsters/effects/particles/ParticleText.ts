import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Point } from "flash/geom";
import { GLOBAL, ParticleDamageItem } from "@game";

export class ParticleText extends ASObject {
    public static readonly TYPE_DAMAGE: uint = 10;

    public static readonly TYPE_THORN: uint = 11;

    public static readonly TYPE_HEAL: uint = 11;

    private static _pool: any[] = [];

    private static _currentCount: int = 0;

    private static _currentMax: int = 20;

    public $ctor(): void {
        super.$ctor();
    }

    public static Create(param1: Point, param2: int, param3: uint): ParticleDamageItem {
        let _loc4_: ParticleDamageItem = null;
        if (!GLOBAL._catchup && ParticleText._currentCount < ParticleText._currentMax) {
            _loc4_ = ParticleText.PoolGet(param3);
            if (_loc4_) {
                _loc4_.Init(param1, param2, param3);
            }
        }
        return _loc4_;
    }

    private static PoolGet(param1: uint): ParticleDamageItem {
        let _loc2_: ParticleDamageItem = null;
        ++ParticleText._currentCount;
        if (ParticleText._pool.length) {
            _loc2_ = as3.cast(ParticleText._pool.pop(), ParticleDamageItem);
        } else {
            _loc2_ = new ParticleDamageItem();
        }
        return _loc2_;
    }

    public static Remove(param1: ParticleDamageItem): void {
        --ParticleText._currentCount;
        if (ParticleText._currentCount < 0) {
            ParticleText._currentCount = 0;
        }
        ParticleText.PoolSet(param1);
    }

    private static PoolSet(param1: ParticleDamageItem): void {
        ParticleText._pool.push(param1);
    }

    public static Clear(): void {
        ParticleText._pool = [];
        ParticleText._currentCount = 0;
    }
}
