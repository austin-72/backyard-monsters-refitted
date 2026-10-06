import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, DisplayObject, MovieClip, Shape } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, GLOBAL, IAttackable, KEYS, MAP, MonsterBase, PATHING, POPUPS, RAILGUNPROJECTILE_CLIP, SOUNDS, Targeting, Vacuum, popup_building } from "@game";

export class BUILDING118 extends BTOWER {
    static {
        as3.fields(this, { _animMC: null, _animBitmap: null, _gunballs: null, _trail: null, _spawnCount: 0, _segment: null, _spot: null, _fireCount: 0 });
    }

    public _animMC: MovieClip;
    public _animBitmap: BitmapData;
    private _gunballs: any[];
    private _trail: any[];
    private _spawnCount: int;
    private _segment: Point;
    private _spot: Point;
    private _fireCount: int;

    public $ctor(): void {
        this._gunballs = [];
        this._trail = [];
        super.$ctor();
        this._frameNumber = 0;
        this._type = 118;
        this._top = 15;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
        this.Props();
        this.attackFlags = Targeting.getOldStyleTargets(-1);
    }

    public override TickAttack(): void {
        let _loc1_: MonsterBase = null;
        let _loc2_: Point = null;
        let _loc3_: Point = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        super.TickAttack();
        if (this._hasTargets) {
            _loc1_ = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            _loc2_ = PATHING.FromISO(_loc1_._tmpPoint);
            _loc3_ = PATHING.FromISO(new Point(this._mc.x, this._mc.y));
            _loc3_ = _loc3_.add(new Point(35, 35));
            _loc4_ = (_loc2_.x - _loc3_.x) | 0;
            _loc5_ = (_loc2_.y - _loc3_.y) | 0;
            if ((_loc6_ = (Math.atan2(_loc5_, _loc4_) * 57.2957795 + 30) | 0) < 0) {
                _loc6_ = (360 + _loc6_) | 0;
            }
            if (_loc6_ > 360) {
                _loc6_ -= 360;
            }
            _loc6_ = (_loc6_ / 12) | 0;
            this._animTick = _loc6_;
            this.AnimFrame();
            ++this._frameNumber;
        }
    }

    public override TickFast(param1: Event = null): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: number = NaN;
        super.TickFast();
        if (this._gunballs.length > 0) {
            ++this._fireCount;
            if (this._fireCount > 10) {
                _loc2_ = this._gunballs.length | 0;
                _loc3_ = 0;
                while (_loc3_ < _loc2_) {
                    if (this._fireCount > 15) {
                        if (Boolean(this._gunballs[0]) && Boolean(this._gunballs[0].parent)) {
                            MAP._PROJECTILES.removeChild(as3.cast(this._gunballs[0], DisplayObject));
                        }
                        if (Boolean(this._trail[0]) && Boolean(this._trail[0].parent)) {
                            MAP._PROJECTILES.removeChild(as3.cast(this._trail[0], DisplayObject));
                        }
                    } else {
                        _loc4_ = 1 - (this._fireCount - 10) * 0.2;
                        if (Boolean(this._gunballs[0]) && Boolean(this._gunballs[0].parent)) {
                            this._gunballs[_loc3_].alpha = _loc4_;
                        }
                        if (Boolean(this._trail[0]) && Boolean(this._trail[0].parent)) {
                            this._trail[_loc3_].alpha = _loc4_;
                        }
                    }
                    _loc3_++;
                }
            }
        }
        if (this._fireCount > 15) {
            this._gunballs = [];
            this._trail = [];
        }
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && GLOBAL._render) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
    }

    public override Fire(param1: IAttackable): void {
        let _loc4_: Point = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        let _loc8_: any[] = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: Point = null;
        let _loc12_: int = 0;
        let _loc13_: any = undefined;
        super.Fire(param1);
        SOUNDS.Play("railgun1", !this.isJard ? 0.8 : 0.4);
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * 3 * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 3 * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else {
            _loc4_ = new Point(this._mc.x, this._mc.y + this._top);
            this._spot = new Point(_loc4_.x, _loc4_.y);
            if (this._targetVacuum) {
                _loc6_ = GLOBAL.townHall._mc.x - _loc4_.x;
                _loc5_ = GLOBAL.townHall._mc.y - GLOBAL.townHall._mc.height - _loc4_.y;
                Vacuum.getHose().modifyHealth(-((this.damage * 3 * _loc2_ * _loc3_) | 0));
            } else {
                _loc5_ = param1.y - _loc4_.y;
                _loc6_ = param1.x - _loc4_.x;
            }
            this._segment = new Point(Math.cos(Math.atan2(_loc5_, _loc6_)) * 32, Math.sin(Math.atan2(_loc5_, _loc6_)) * 32);
            while (this._gunballs.length > 0) {
                if (Boolean(this._gunballs[0]) && Boolean(this._gunballs[0].parent)) {
                    MAP._PROJECTILES.removeChild(as3.cast(this._gunballs[0], DisplayObject));
                }
                if (Boolean(this._trail[0]) && Boolean(this._trail[0].parent)) {
                    MAP._PROJECTILES.removeChild(as3.cast(this._trail[0], DisplayObject));
                }
                this._gunballs.shift();
                this._trail.shift();
            }
            this._spawnCount = 0;
            this._fireCount = 0;
            _loc7_ = 0;
            while (_loc7_ < 50) {
                this._gunballs[_loc7_] = new RAILGUNPROJECTILE_CLIP();
                this._gunballs[_loc7_].x = this._spot.x + this._segment.x;
                this._gunballs[_loc7_].y = this._spot.y + this._segment.y;
                this._trail[_loc7_] = new Shape();
                this._trail[_loc7_].graphics.lineStyle(1, 16777215, 1);
                this._trail[_loc7_].graphics.moveTo(this._spot.x, this._spot.y);
                this._trail[_loc7_].graphics.lineTo(this._spot.x + this._segment.x, this._spot.y + this._segment.y);
                this._trail[_loc7_].filters = [new GlowFilter(35003, 1, 5 + Math.random() * 2, 5 + Math.random() * 2, 4, 1, false, false)];
                this._spot = this._spot.add(this._segment);
                MAP._PROJECTILES.addChild(as3.cast(this._trail[_loc7_], DisplayObject));
                MAP._PROJECTILES.addChild(as3.cast(this._gunballs[_loc7_], DisplayObject));
                ++this._spawnCount;
                _loc7_++;
            }
            if (!this._targetVacuum) {
                _loc9_ = (_loc8_ = Targeting.getCreepsInRange(1600, _loc4_, this.attackFlags)).length | 0;
                _loc10_ = 0;
                _loc11_ = _loc4_.add(new Point(this._segment.x * 50, this._segment.y * 50));
                _loc12_ = 0;
                while (_loc12_ < _loc9_) {
                    _loc13_ = _loc8_[_loc12_].creep;
                    if (this.lineIntersectCircle(_loc4_, _loc11_, as3.cast(_loc13_._tmpPoint, Point))) {
                        _loc10_ = (_loc10_ + this.damage * _loc3_ * _loc2_ * _loc13_._damageMult) | 0;
                        _loc13_.modifyHealth(-(this.damage * _loc3_ * _loc2_ * _loc13_._damageMult));
                    }
                    _loc12_++;
                }
            }
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, _loc10_);
        }
    }

    private lineIntersectCircle(param1: Point, param2: Point, param3: Point, param4: number = 20): boolean {
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc5_: number = (param2.x - param1.x) * (param2.x - param1.x) + (param2.y - param1.y) * (param2.y - param1.y);
        let _loc6_: number = 2 * ((param2.x - param1.x) * (param1.x - param3.x) + (param2.y - param1.y) * (param1.y - param3.y));
        let _loc7_: number = param3.x * param3.x + param3.y * param3.y + param1.x * param1.x + param1.y * param1.y - 2 * (param3.x * param1.x + param3.y * param1.y) - param4 * param4;
        let _loc8_: number = NaN;
        if ((_loc8_ = _loc6_ * _loc6_ - 4 * _loc5_ * _loc7_) <= 0) {
            return false;
        }
        _loc9_ = Math.sqrt(_loc8_);
        _loc10_ = (-_loc6_ + _loc9_) / (2 * _loc5_);
        _loc11_ = (-_loc6_ - _loc9_) / (2 * _loc5_);
        if ((_loc10_ < 0 || _loc10_ > 1) && (_loc11_ < 0 || _loc11_ > 1)) {
            return false;
        }
        return true;
    }

    public override Props(): void {
        super.Props();
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Destroyed(param1: boolean = true): void {
        super.Destroyed(param1);
        while (this._gunballs.length > 0) {
            if (Boolean(this._gunballs[0]) && Boolean(this._gunballs[0].parent)) {
                MAP._PROJECTILES.removeChild(as3.cast(this._gunballs[0], DisplayObject));
            }
            if (Boolean(this._trail[0]) && Boolean(this._trail[0].parent)) {
                MAP._PROJECTILES.removeChild(as3.cast(this._trail[0], DisplayObject));
            }
            this._gunballs.shift();
            this._trail.shift();
        }
        this._spawnCount = 0;
        this._fireCount = 0;
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-wmb", KEYS.Get("pop_railgunbuilt_streamtitle"), KEYS.Get("pop_railgunbuilt_streambody"), "build_railgun.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_railgunbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_railgunbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }
}
