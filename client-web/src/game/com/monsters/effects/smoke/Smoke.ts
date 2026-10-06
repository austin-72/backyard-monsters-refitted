import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { GLOBAL, LOGGER, MAP, SmokeParticle, SmokeSystem, smoke1 } from "@game";

export class Smoke extends ASObject {
    private static _bmd: BitmapData = null;

    private static _mc: DisplayObject = null;

    private static _tmpPoint: Point = null;

    private static _tmpSmokeParticle: SmokeParticle = null;

    private static _noiseBMD: BitmapData = null;

    private static setupCompleted: boolean = false;

    private static _rect: Rectangle = null;

    private static _frameNumber: int = 0;

    private static _sourceID: int = 0;

    private static lastProcessTime: number = NaN;

    private static _particles: Vector<SmokeParticle> = new Vector<SmokeParticle>(0, false, SmokeParticle);

    private static _sources: Vector<SmokeSystem> = new Vector<SmokeSystem>(0, false, SmokeSystem);

    private static _enabled: boolean = false;

    public static _smokeParticleBMD: Vector<BitmapData> = new Vector<BitmapData>(100, true, BitmapData);

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        let tmpSpriteSheet: BitmapData = null;
        let i: int = 0;
        let tmpW: int = 0;
        let tmpO: int = 0;
        let tmpSprite: BitmapData = null;
        try {
            if (!Smoke._enabled) {
                return;
            }
            if (!Smoke.setupCompleted) {
                Smoke._rect = new Rectangle(0, 0, 1500, 800);
                Smoke._frameNumber = 0;
                Smoke._sourceID = 0;
                tmpSpriteSheet = new smoke1(0, 0);
                i = 0;
                while (i < 100) {
                    tmpW = (5 + 25 / 100 * i) | 0;
                    tmpO = ((30 - tmpW) * 0.5) | 0;
                    tmpSprite = new BitmapData(tmpW, tmpW, true, 16777215);
                    tmpSprite.copyPixels(tmpSpriteSheet, new Rectangle(i * 30 + tmpO, tmpO, tmpW, tmpW), new Point(0, 0), null, null, true);
                    as3.vset(Smoke._smokeParticleBMD, i, tmpSprite);
                    i++;
                }
                Smoke.setupCompleted = true;
            }
            Smoke._bmd = new BitmapData(Smoke._rect.width, Smoke._rect.height, true, 0);
            Smoke._mc = MAP._EFFECTSTOP.addChild(new Bitmap(Smoke._bmd));
            Smoke._mc.x = -Smoke._rect.width;
            Smoke._mc.y = -Smoke._rect.height;
            Smoke._mc.scaleX = Smoke._mc.scaleY = 2;
            Smoke._sources = new Vector<SmokeSystem>(0, false, SmokeSystem);
            Smoke._particles = new Vector<SmokeParticle>(0, false, SmokeParticle);
            Smoke._bmd.fillRect(Smoke._bmd.rect, 0);
        } catch (e) {
            LOGGER.Log("err", "Smoke.Setup " + Smoke.setupCompleted);
        }
    }

    public static CreatePoof(param1: Point, param2: int, param3: number): void {
        if (!Smoke._enabled) {
            return;
        }
        if (GLOBAL._fps < 30) {
            return;
        }
        Smoke.Add(param1, 5, (100 * param3) | 0, param2, 2);
    }

    public static CreateStream(param1: Point): void {
        if (!Smoke._enabled) {
            return;
        }
        if (GLOBAL._fps < 30) {
            return;
        }
        Smoke.Add(param1, 200, 4, 2, 1);
    }

    private static Add(param1: Point, param2: int, param3: int, param4: int, param5: number): void {
        if (!Smoke._enabled) {
            return;
        }
        if (!Smoke.setupCompleted) {
            return;
        }
        param1 = new Point(param1.x * 0.5, param1.y * 0.5).add(new Point(Smoke._rect.width * 0.5, Smoke._rect.height * 0.5));
        let _loc6_: SmokeSystem = null;
        (_loc6_ = new SmokeSystem()).id = Smoke._sourceID = (Smoke._sourceID + 1) | 0;
        _loc6_.position = param1;
        _loc6_.life = param2;
        _loc6_.density = param3;
        _loc6_.basesize = (param4 * 0.5) | 0;
        _loc6_.expand = param5;
        Smoke._sources.push(_loc6_);
        if (Smoke._sources.length > 3) {
            Smoke._sources.shift();
        }
    }

    private static Remove(param1: int): void {
        let _loc2_: int = 0;
        if (!Smoke._enabled) {
            return;
        }
        if (!Smoke.setupCompleted) {
            return;
        }
        let _loc3_: int = Smoke._sources.length | 0;
        _loc2_ = 0;
        while (_loc2_ < _loc3_) {
            if ((as3.as(as3.vget(Smoke._sources, _loc2_), SmokeSystem)).id == param1) {
                Smoke._sources.splice(_loc2_, 1);
                return;
            }
            _loc2_ += 1;
        }
    }

    public static Tick(): void {
        let _loc2_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: SmokeSystem = null;
        let _loc6_: SmokeParticle = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: number = NaN;
        let _loc12_: BitmapData = null;
        if (!Smoke._enabled) {
            return;
        }
        if (!Smoke.setupCompleted) {
            return;
        }
        let _loc1_: int = 0;
        let _loc3_: int = getTimer();
        Smoke._frameNumber += 1;
        _loc9_ = Smoke._particles.length | 0;
        _loc10_ = Smoke._sources.length | 0;
        if (Smoke._frameNumber % 2 == 0) {
            if (_loc9_ < 700 && GLOBAL._fps > 20) {
                _loc1_ = 0;
                while (_loc1_ < _loc10_) {
                    _loc11_ = (_loc5_ = as3.vget(Smoke._sources, _loc1_)).basesize * 0.5;
                    --_loc5_.life;
                    if (Smoke.lastProcessTime > 10) {
                        --_loc5_.life;
                    }
                    if (_loc5_.life <= 0) {
                        Smoke.Remove(_loc5_.id);
                        _loc10_--;
                        _loc1_--;
                    } else {
                        _loc2_ = 0;
                        while (_loc2_ < _loc5_.density) {
                            (_loc6_ = new SmokeParticle()).position = new Point(_loc5_.position.x - _loc11_ + Math.random() * _loc5_.basesize, _loc5_.position.y - _loc11_ + Math.random() * _loc5_.basesize);
                            _loc6_.position.x += Math.random() * _loc5_.basesize - _loc5_.basesize * 0.5;
                            _loc6_.position.y += (Math.random() * _loc5_.basesize - _loc5_.basesize * 0.5) * 0.5;
                            _loc6_.speed = 2 + Math.random();
                            _loc6_.wind = Math.random() * _loc5_.expand;
                            Smoke._particles.push(_loc6_);
                            _loc2_ += 1;
                        }
                        if (_loc5_.life % 10 == 0 && _loc5_.density > 1) {
                            --_loc5_.density;
                        }
                    }
                    _loc1_ += 1;
                }
            }
            if ((_loc9_ = Smoke._particles.length | 0) > 0) {
                Smoke._bmd.lock();
                _loc1_ = 0;
                while (_loc1_ < _loc9_) {
                    _loc6_ = as3.vget(Smoke._particles, _loc1_);
                    _loc7_ = (100 - 100 / 3 * _loc6_.speed) | 0;
                    _loc8_ = (as3.vget(Smoke._smokeParticleBMD, _loc7_).rect.width + 2) | 0;
                    Smoke._bmd.fillRect(new Rectangle(_loc6_.position.x - 1, _loc6_.position.y - 1, _loc8_, _loc8_), 0);
                    _loc1_ += 1;
                }
                _loc4_ = 0;
                while (_loc4_ < GLOBAL._loops) {
                    _loc1_ = 0;
                    while (_loc1_ < _loc9_) {
                        (_loc6_ = as3.vget(Smoke._particles, _loc1_)).position.x = _loc6_.position.x + _loc6_.wind * 0.25;
                        _loc6_.position.y -= _loc6_.speed * 0.25;
                        _loc6_.speed -= 0.01;
                        if ((_loc7_ = (100 - 100 / 3 * _loc6_.speed) | 0) >= 98) {
                            Smoke._particles.splice(_loc1_, 1);
                            _loc1_--;
                            _loc9_--;
                        }
                        _loc1_ += 1;
                    }
                    _loc4_++;
                }
                _loc1_ = 0;
                while (_loc1_ < _loc9_) {
                    _loc6_ = as3.vget(Smoke._particles, _loc1_);
                    _loc7_ = (100 - 100 / 3 * _loc6_.speed) | 0;
                    _loc12_ = as3.vget(Smoke._smokeParticleBMD, _loc7_);
                    if (!GLOBAL._catchup) {
                        Smoke._bmd.copyPixels(_loc12_, _loc12_.rect, _loc6_.position, null, null, true);
                    }
                    _loc1_ += 1;
                }
                Smoke._bmd.unlock();
            }
            Smoke.lastProcessTime = getTimer() - _loc3_;
        }
    }
}
