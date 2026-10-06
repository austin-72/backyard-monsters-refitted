import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, Shape } from "flash/display";
import { GlowFilter } from "flash/filters";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { CREATURES, GIBLETS, GLOBAL, LASERS, MAP, ParticleScorch1, ParticleSplat, Particles, ResourceBombs, bmd_burns } from "@game";

export class EFFECTS extends ASObject {
    public static _items: any;

    public static _itemCount: int;

    public static _effects: any[];

    public static _effectsJSON: string;

    public static _scorches: any[];

    public static _burns: BitmapData;

    public static _splats: any[];

    public static _switcher: int;

    public static _trash: any;

    public static _tmpSplatCount: int;

    public static _effectsLimit: int;

    public static _effectDuration: int;

    static {
        as3.lazyStatics(this, { _items: null, _itemCount: 0, _effects: null, _effectsJSON: null, _scorches: null, _burns: null, _splats: null, _switcher: 0, _trash: null, _tmpSplatCount: 0, _effectsLimit: 0, _effectDuration: 0 }, () => {
            EFFECTS._items = {};
            EFFECTS._itemCount = 0;
            EFFECTS._effects = [];
            EFFECTS._effectsJSON = "";
            EFFECTS._scorches = [new ParticleScorch1(0, 0)];
            EFFECTS._burns = new bmd_burns(0, 0);
            EFFECTS._splats = [new ParticleSplat()];
            EFFECTS._switcher = 0;
            EFFECTS._trash = {};
            EFFECTS._tmpSplatCount = 0;
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: any[]): void {
        EFFECTS._items = {};
        EFFECTS._itemCount = 0;
        EFFECTS._effects = param1;
        EFFECTS._effectsLimit = GLOBAL._flags.efl | 0;
        EFFECTS._effectDuration = 172800;
    }

    public static CreepSplat(param1: string, param2: int, param3: int): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        if (param1.substr(0, 1) == "G") {
            _loc4_ = 10;
        } else {
            _loc4_ = (CREATURES.GetProperty(param1, "cResource") / 100) | 0;
        }
        if (_loc4_ > 5 && param1.substr(0, 1) != "G") {
            _loc4_ = 5;
        }
        if (EFFECTS._tmpSplatCount < 2) {
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                ++EFFECTS._tmpSplatCount;
                _loc6_ = Math.random() * 360 * 0.0174532925;
                _loc7_ = (Math.random() * 16) | 0;
                EFFECTS.SplatParticle(30, param2 + Math.sin(_loc6_) * _loc7_, param3 + Math.cos(_loc6_) * _loc7_, _loc6_, Math.random() * 20 / 15);
                _loc5_++;
            }
        }
        GIBLETS.Create(new Point(param2, param3 + 3), 0.8, 75, _loc4_);
    }

    public static SplatParticle(param1: number, param2: number, param3: number, param4: number, param5: number): void {
        let _loc7_: int = 0;
        // Inferno-only: a monster's death tween can finish after its yard was left (Return Home), with the map's
        // layers gone: the splat threw (bug report #57, "MAP._EFFECTS is null")
        if (GLOBAL.INFERNO_ONLY && !MAP._EFFECTS) {
            return;
        }
        let _loc6_: ParticleSplat = as3.as(MAP._EFFECTS.addChild(new ParticleSplat()), ParticleSplat);
        _loc7_ = (1 + ((Math.random() * 5) | 0)) | 0;
        _loc6_.gotoAndStop(_loc7_);
        _loc6_.x = param2;
        _loc6_.y = param3;
        let _loc8_: number = 1 / 32 * param1;
        _loc6_.scaleX = _loc6_.scaleY = _loc8_;
        EFFECTS._items["i" + EFFECTS._itemCount] = { "mc": _loc6_, "xd": Math.sin(param4), "yd": Math.cos(param4) * 0.5, "speed": param5, "life": 0, "code": "s" + _loc7_, "frame": _loc7_ };
        ++EFFECTS._itemCount;
    }

    public static Scorch(param1: Point, param2: int = 0): void {
        EFFECTS.SnapShotB(param1.x | 0, param1.y | 0, "b" + param2, 0);
        EFFECTS.Push([param1.x, param1.y, "b" + param2, 0]);
    }

    public static Burn(param1: int, param2: int): void {
        let _loc3_: int = (80 * ((Math.random() * 4) | 0) - 80) | 0;
        MAP.effectsBMD.copyPixels(EFFECTS._burns, new Rectangle(_loc3_, 0, 80, 40), new Point(param1 + MAP.effectsBMD.width * 0.5 - 40, param2 + MAP.effectsBMD.height * 0.5 - 20), null, null, true);
    }

    public static Lightning(param1: int, param2: int, param3: int, param4: int, param5: DisplayObjectContainer = null, param6: uint = 3197178): void {
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        if (!param5) {
            param5 = MAP._PROJECTILES;
        }
        let _loc7_: int = Point.distance(new Point(param1, param2), new Point(param3, param4)) | 0;
        let _loc8_: Shape = null;
        (_loc8_ = as3.as(param5.addChild(new Shape()), Shape)).graphics.lineStyle(1, param6, 1);
        _loc8_.graphics.moveTo(param1, param2);
        let _loc13_: int = 0;
        while (_loc13_ < ((_loc7_ / 30) | 0)) {
            _loc9_ = (param3 - param1) | 0;
            _loc10_ = (param4 - param2) | 0;
            _loc11_ = (Math.cos(Math.atan2(_loc10_, _loc9_)) * (_loc7_ / ((_loc7_ / 30) | 0) * _loc13_)) | 0;
            _loc12_ = (Math.sin(Math.atan2(_loc10_, _loc9_)) * (_loc7_ / ((_loc7_ / 30) | 0) * _loc13_)) | 0;
            _loc8_.graphics.lineTo(_loc11_ + param1 - 7 + Math.random() * 15, _loc12_ + param2 - 7 + Math.random() * 15);
            _loc8_.filters = [new GlowFilter(param6, 1, 4, 4, 2, 2, false, false)];
            _loc13_++;
        }
        _loc8_.graphics.lineTo(param3 - 5 + Math.random() * 10, param4 - Math.random() * 10);
        _loc8_.blendMode = "add";
        EFFECTS._trash["i" + EFFECTS._itemCount] = { "counter": 0, "container": param5, "mc": _loc8_ };
        ++EFFECTS._itemCount;
    }

    public static Laser(param1: int, param2: int, param3: int, param4: int, param5: int, param6: number, param7: number, param8: Function = null): void {
        LASERS.Fire(param1, param2, param3, param4, param5, param6, param7, param8);
    }

    public static Tick(): void {
        let _loc1_: any = null;
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: any = null;
        if (EFFECTS._tmpSplatCount > 0) {
            --EFFECTS._tmpSplatCount;
        }
        for (_loc2_ in EFFECTS._items) {
            _loc1_ = EFFECTS._items[_loc2_];
            if (GLOBAL._render) {
                _loc1_.mc.x += _loc1_.xd * _loc1_.speed;
                _loc1_.mc.y += _loc1_.yd * _loc1_.speed;
                _loc1_.mc.scaleX = _loc1_.mc.scaleY = _loc1_.mc.scaleY + 0.02;
                if (_loc1_.speed > 0) {
                    _loc1_.speed -= 0.02;
                }
                ++_loc1_.life;
                if (_loc1_.speed <= 0 && _loc1_.life > 10) {
                    EFFECTS.SnapShot(_loc1_);
                    EFFECTS.Remove(MAP._EFFECTS, as3.cast(_loc1_.mc, DisplayObject));
                    delete EFFECTS._items[_loc2_];
                }
            } else {
                _loc1_.mc.x += _loc1_.xd * (_loc1_.speed * 20);
                _loc1_.mc.y += _loc1_.yd * (_loc1_.speed * 20);
                _loc1_.mc.scaleX = _loc1_.mc.scaleY = _loc1_.mc.scaleY + 0.4;
                EFFECTS.SnapShot(_loc1_);
                EFFECTS.Remove(MAP._EFFECTS, as3.cast(_loc1_.mc, DisplayObject));
                delete EFFECTS._items[_loc2_];
            }
        }
        LASERS.Tick();
        ResourceBombs.Tick();
        for (_loc3_ in EFFECTS._trash) {
            if ((_loc4_ = EFFECTS._trash[_loc3_]).counter >= 3) {
                EFFECTS.Remove(as3.cast(_loc4_.container, DisplayObjectContainer), as3.cast(_loc4_.mc, DisplayObject));
                delete EFFECTS._trash[_loc3_];
            } else {
                _loc4_.mc.alpha /= 1.75;
            }
            ++_loc4_.counter;
        }
    }

    public static Remove(param1: DisplayObjectContainer, param2: DisplayObject): void {
        param1.removeChild(param2);
    }

    public static Process(param1: any): void {
        let _loc3_: any[] = null;
        while (EFFECTS._effects.length > EFFECTS._effectsLimit) {
            EFFECTS._effects.shift();
        }
        let _loc2_: int = 0;
        while (_loc2_ < EFFECTS._effects.length) {
            _loc3_ = as3.cast(EFFECTS._effects[_loc2_], Array);
            if (_loc3_[3] + param1 > EFFECTS._effectDuration) {
                EFFECTS._effects.splice(_loc2_, 1);
            } else {
                _loc3_[3] += param1;
                EFFECTS.SnapShotB(_loc3_[0] | 0, _loc3_[1] | 0, as3.str(_loc3_[2]), _loc3_[3] | 0);
            }
            _loc2_++;
        }
        EFFECTS._effectsJSON = JSON.stringify(EFFECTS._effects);
    }

    public static SnapShot(param1: any): void {
        EFFECTS.SnapShotB(param1.mc.x | 0, param1.mc.y | 0, as3.str(param1.code), 0, Number(param1.mc.scaleX));
        EFFECTS.Push([param1.mc.x | 0, param1.mc.y | 0, param1.code, 0]);
    }

    public static SnapShotB(param1: int, param2: int, param3: string, param4: int, param5: number = 0): void {
        let _loc6_: BitmapData = null;
        let _loc7_: Matrix = null;
        let _loc8_: ParticleSplat = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        try {
            _loc7_ = new Matrix();
            if (param5 == 0) {
                param5 = 1 + Math.random() * 10 / 10;
            }
            if (param3.substr(0, 1) == "s") {
                _loc9_ = 100;
                _loc10_ = 100;
                _loc6_ = new BitmapData(100, 100, true, 0);
                _loc7_.scale(param5, param5);
                _loc7_.tx = 50;
                _loc7_.ty = 50;
                (_loc8_ = as3.cast(EFFECTS._splats[0], ParticleSplat)).gotoAndStop(param3.substr(1, 1));
                _loc6_.draw(as3.cast(_loc8_, IBitmapDrawable), _loc7_, new ColorTransform(1, 1, 1, 1 - param4 / EFFECTS._effectDuration));
            } else if (param3.substr(0, 1) == "b") {
                _loc9_ = 200;
                _loc10_ = 100;
                _loc6_ = as3.cast(EFFECTS._scorches[param3.substr(1, 1)], BitmapData);
                _loc7_.tx = 100;
                _loc7_.ty = 50;
            }
            MAP.effectsBMD.copyPixels(_loc6_, new Rectangle(0, 0, _loc9_, _loc10_), new Point(param1 + MAP.effectsBMD.width * 0.5 - _loc9_ / 2, param2 + MAP.effectsBMD.height * 0.5 - _loc10_ / 2), null, null, true);
        } catch (e) {
        }
    }

    public static Push(param1: any[]): void {
        if (EFFECTS._switcher % 2 == 0) {
            EFFECTS._effects.push(param1);
            EFFECTS._effectsJSON = JSON.stringify(EFFECTS._effects);
            if (EFFECTS._effects.length > EFFECTS._effectsLimit) {
                EFFECTS._effects.shift();
            }
        }
        ++EFFECTS._switcher;
    }

    public static Dig(param1: int, param2: int): void {
        Particles.Create(new Point(param1, param2), 1 + Math.random() * 0.5, 30, 20, 0);
    }

    public static Burrow(param1: int, param2: int): void {
        Particles.Create(new Point(param1, param2), 0.5 + Math.random() * 0.5, 10, 3, 0);
    }
}
