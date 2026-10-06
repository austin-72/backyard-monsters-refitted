import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { Matrix, Point, Rectangle } from "flash/geom";
import { GLOBAL, GRID, LOGGER, MAP, ParticlesObject } from "@game";

export class Particles extends ASObject {
    public static _particles: any = {};

    public static _particleCount: int = 0;

    public static _tmpParticleCount: int = 0;

    public static _frame: int = 0;

    private static _pool: Vector<ParticlesObject> = new Vector<ParticlesObject>(0, false, ParticlesObject);

    public $ctor(): void {
        super.$ctor();
    }

    public static Clear(): void {
        let particle: ParticlesObject = null;
        let g: string = null;
        try {
            for (g in Particles._particles) {
                particle = as3.cast(Particles._particles[g], ParticlesObject);
                if (particle.parent) {
                    particle.parent.removeChild(particle);
                }
                particle.Clear();
                Particles.PoolSet(particle);
                delete Particles._particles[g];
            }
            Particles._particles = {};
            Particles._particleCount = 0;
            Particles._frame = 0;
        } catch (e) {
            LOGGER.Log("err", "Particles Clear" + " " + e.getStackTrace());
        }
    }

    public static PoolGet(param1: int, param2: Point, param3: Point, param4: int, param5: number, param6: number): ParticlesObject {
        let _loc7_: ParticlesObject = null;
        if (Particles._pool.length) {
            _loc7_ = as3.cast(Particles._pool.pop(), ParticlesObject);
        } else {
            (_loc7_ = new ParticlesObject()).gotoAndStop(((Math.random() * 3) | 0) + 1);
        }
        _loc7_.init(param1, param2, param3, param4, param5, param6);
        return _loc7_;
    }

    public static PoolSet(param1: ParticlesObject): void {
        Particles._pool.push(param1);
    }

    public static Create(param1: Point, param2: number, param3: int, param4: int, param5: int = 0): void {
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        if (!GLOBAL._catchup) {
            if (Particles._tmpParticleCount < 80) {
                _loc6_ = 0;
                while (_loc6_ < param4) {
                    Particles._tmpParticleCount += 1;
                    _loc7_ = param3 * 0.2 + Math.random() * (param3 * 0.8);
                    if (Math.random() <= 0.3) {
                        _loc7_ *= 1.5;
                    }
                    Particles.Spawn(param1.add(new Point(-3 + Math.random() * 6, -2 + Math.random() * 4)), param2, _loc7_ | 0, _loc6_ / 100, param5);
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
        Particles._particles[Particles._particleCount] = MAP._GROUND.addChild(Particles.PoolGet(Particles._particleCount, param1, _loc10_, param3, param4, param2));
        Particles._particleCount += 1;
    }

    public static Remove(param1: any): void {
        let _loc2_: ParticlesObject = as3.cast(Particles._particles[param1], ParticlesObject);
        --Particles._tmpParticleCount;
        try {
            MAP._GROUND.removeChild(_loc2_);
            _loc2_.Clear();
            Particles.PoolSet(_loc2_);
            delete Particles._particles[param1];
        } catch (e) {
        }
    }

    public static SnapShot(param1: int, param2: int, param3: number, param4: ParticlesObject): void {
        let _loc5_: BitmapData = null;
        let _loc6_: Matrix = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        try {
            _loc6_ = new Matrix();
            _loc7_ = 26;
            _loc8_ = 26;
            _loc5_ = new BitmapData(_loc7_, _loc8_, true, 0);
            _loc6_.scale(param3, param3);
            _loc6_.tx = _loc7_ * 0.5;
            _loc6_.ty = _loc8_ * 0.5;
            _loc5_.draw(as3.cast(param4, IBitmapDrawable), _loc6_);
            MAP.effectsBMD.copyPixels(_loc5_, new Rectangle(0, 0, _loc7_, _loc8_), new Point(param1 + MAP.effectsBMD.width * 0.5 - _loc7_ / 2, param2 + MAP.effectsBMD.height * 0.5 - _loc8_ * 0.5), null, null, true);
        } catch (e) {
        }
    }
}
