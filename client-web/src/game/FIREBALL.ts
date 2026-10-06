import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { ATTACK, BFOUNDATION, BTOWER, BWALL, DummyTarget, FIREBALLS, FIREBALL_CLIP, GLOBAL, ITargetable, InstanceManager, MonsterBase, ProjectileBase, ProjectileEvent, SPRITES, SpriteData, SpurtzCannon, Targeting, Vacuum, VacuumHose } from "@game";

export class FIREBALL extends ProjectileBase {
    static {
        as3.fields(this, { ioNoDamage: false, DO_ROCKETS_ACCELERATE: false, _targetMC: null, _targetBuilding: null, _previousTarget: null, _targetCreep: undefined, _type: null, _bitmapData: null, _acceleration: NaN, _graphicName: null });
    }

    public static readonly TYPE_FIREBALL: string = "fireball";

    public static readonly TYPE_MISSILE: string = "missile";

    public static readonly TYPE_MAGMA: string = "magma";

    public static readonly TYPE_SPURTZ: string = "spurtz";

    /** Hell Freezes Over: the Hailspitter's hailstone (IoHailspitter), drawn from "hailstone". */
    public static readonly TYPE_HAIL: string = "hail";

    public static readonly HAIL_GRAPHIC_NAME: string = "hailstone";

    /** Hell Freezes Over: the ice orb Rimegrave and the Sleetwing throw (IoIce.orb), drawn from "iceorb". */
    public static readonly TYPE_ICEORB: string = "iceorb";

    public static readonly ICEORB_GRAPHIC_NAME: string = "iceorb";

    public static readonly COLLIDED: string = "fireballCollided";

    public static readonly ROCKET_GRAPHIC_NAME: string = "rocket";

    public static readonly SPRUTZ_GRAPHIC_NAME: string = "IC1";
    /** Inferno-only: only a picture (the hit it shows was dealt already): it does no damage when it lands. */
    public ioNoDamage: boolean;
    private DO_ROCKETS_ACCELERATE: boolean;
    public _targetMC: MovieClip;
    public _targetBuilding: BFOUNDATION;
    public _previousTarget: BFOUNDATION;
    public _targetCreep: any;
    public _type: string;
    public _bitmapData: BitmapData;
    private _acceleration: number;
    private _graphicName: string;

    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: string = "fireball"): void {
        let _loc2_: SpriteData = null;
        let _loc3_: Bitmap = null;
        if (this._graphic) {
            if (this._graphic.numChildren > 0) {
                this._graphic.removeChildAt(0);
            }
            this._graphic = null;
        }
        this._type = param1;
        this._acceleration = 0.5;
        this.ioNoDamage = false;
        // (a fireball from the pool keeps the picture of what it was last; a plain fireball has none)
        this._graphicName = null;
        if (this._type == FIREBALL.TYPE_FIREBALL || this._type == FIREBALL.TYPE_MAGMA) {
            this._graphic = new FIREBALL_CLIP();
            if (this._type == FIREBALL.TYPE_MAGMA) {
                // 8 x 8 instead of 12 x 12: power-of-two blurs take Flash's fast path, and this filter is
                // recomputed every frame the fireball animates.
                this._graphic.filters = [new GlowFilter(16748544, 1, 8, 8, 4, 1, false, false)];
            }
        } else {
            switch (this._type) {
                case FIREBALL.TYPE_MISSILE:
                    this._graphicName = FIREBALL.ROCKET_GRAPHIC_NAME;
                    break;
                case FIREBALL.TYPE_SPURTZ:
                    this._graphicName = SpurtzCannon.SPURTZ_PROJECTILE;
                    this._targetType = 3;
                    break;
                case FIREBALL.TYPE_HAIL:
                    this._graphicName = FIREBALL.HAIL_GRAPHIC_NAME;
                    break;
                case FIREBALL.TYPE_ICEORB:
                    this._graphicName = FIREBALL.ICEORB_GRAPHIC_NAME;
            }
            this._graphic = new MovieClip();
            if (this.DO_ROCKETS_ACCELERATE) {
                this._acceleration = 0.05;
            }
            _loc2_ = as3.as(SPRITES.GetSpriteDescriptor(this._graphicName), SpriteData);
            this._bitmapData = new BitmapData(_loc2_.width, _loc2_.height, true, 16777215);
            _loc3_ = new Bitmap(this._bitmapData);
            _loc3_.x = -(_loc2_.width * 0.5);
            _loc3_.y = -(_loc2_.height * 0.5);
            this._graphic.addChild(_loc3_);
        }
    }

    public Tick(): boolean {
        ++this._frameNumber;
        if (this._targetType == 1) {
            if (!this._targetCreep) {
                FIREBALLS.Remove(this._id);
                return true;
            }
            if (Boolean(this._targetCreep._movement) && this._targetCreep._movement == "fly") {
                this._targetPoint = new Point(this._targetCreep._tmpPoint.x, this._targetCreep._tmpPoint.y - this._targetCreep._altitude);
            } else {
                this._targetPoint = as3.cast(this._targetCreep._tmpPoint, Point);
            }
        } else if (this._targetType == 2) {
            this._targetPoint = new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y + this._targetBuilding._footprint[0].height / 2);
        } else if (this._targetType != 3) {
            if (this._targetType == 4) {
            }
        }
        this._distance = Point.distance(this._targetPoint, new Point(this._tmpX, this._tmpY)) | 0;
        if (this.Move()) {
            return true;
        }
        this.Render();
        return false;
    }

    public Move(): boolean {
        let _loc2_: number = NaN;
        let _loc3_: VacuumHose = null;
        if (this._type == FIREBALL.TYPE_MISSILE && this.DO_ROCKETS_ACCELERATE) {
            this._acceleration += 0.025;
        }
        let _loc1_: number = this._maxSpeed * this._acceleration;
        if (this._frameNumber % 5 == 0) {
            this._xd = this._targetPoint.x - this._tmpX;
            this._yd = this._targetPoint.y - this._tmpY;
            this._xChange = Math.cos(Math.atan2(this._yd, this._xd)) * _loc1_;
            this._yChange = Math.sin(Math.atan2(this._yd, this._xd)) * _loc1_;
        }
        this._tmpX += this._xChange;
        this._tmpY += this._yChange;
        this._distance = (this._distance - _loc1_) | 0;
        if (this._distance <= this._maxSpeed) {
            this.dispatchEvent(new ProjectileEvent(FIREBALL.COLLIDED, as3.cast(this._targetCreep, ITargetable), this._targetBuilding));
            if (this.ioNoDamage) {
            } else if (this._splash > 0) {
                this.Splash();
            } else if (this._targetType == 1) {
                if (this._targetCreep.dead) {
                    FIREBALLS.Remove(this._id);
                    return true;
                }
                if (this._damage > 0) {
                    _loc2_ = this._targetCreep._damageMult * this._damage;
                    this._targetCreep.modifyHealth(-(this._targetCreep._damageMult * this._damage));
                } else {
                    if (this._targetCreep._creatureID.substr(0, 1) == "G") {
                        this._damage *= 0.1;
                    }
                    _loc2_ = this._damage;
                    if (this._targetCreep.health - _loc2_ >= this._targetCreep.maxHealth) {
                        _loc2_ = -(this._targetCreep.maxHealth - this._targetCreep.health);
                    }
                    this._targetCreep.modifyHealth(-_loc2_);
                }
                ATTACK.Damage(this._startPoint.x, this._startPoint.y, _loc2_ | 0);
            } else if (this._targetType == 2) {
                if (this._targetBuilding.health > 0) {
                    this._targetBuilding.modifyHealth(this._damage, new DummyTarget(this._startPoint.x, this._startPoint.y));
                }
            } else if (this._targetType != 3) {
                if (this._targetType == 4) {
                    _loc3_ = Vacuum.getHose();
                    if (Boolean(_loc3_) && this._targetCreep == _loc3_) {
                        _loc3_.modifyHealth(-this._damage);
                    }
                }
            }
            if (this._glaves > 0) {
                --this._glaves;
                this.FindGlaiveTarget();
                this._damage *= 0.5;
            } else {
                this._targetBuilding = null;
            }
            if (this._targetBuilding == null) {
                FIREBALLS.Remove(this._id);
                return true;
            }
        }
        return false;
    }

    public Render(): void {
        let _loc1_: number = NaN;
        let _loc2_: number = NaN;
        if (GLOBAL._render) {
            this._graphic.x = this._tmpX | 0;
            this._graphic.y = this._tmpY | 0;
        }
        if (this._graphicName) {
            _loc1_ = Math.atan2(this._targetPoint.y - this._tmpY, this._targetPoint.x - this._tmpX);
            _loc2_ = _loc1_ * (180 / Math.PI);
            SPRITES.GetSprite(this._bitmapData, this._graphicName, "", _loc2_ | 0, this._frameNumber);
        }
    }

    public Splash(): void {
        let _loc1_: any = null;
        let _loc2_: MonsterBase = null;
        let _loc3_: number = NaN;
        let _loc4_: Point = null;
        let _loc5_: int = 0;
        let _loc6_: any[] = null;
        if (this._targetCreep._movement == "fly") {
            _loc6_ = Targeting.getCreepsInRange(this._splash, new Point(this._tmpX, this._tmpY), Targeting.getOldStyleTargets(2));
        } else {
            _loc6_ = Targeting.getCreepsInRange(this._splash, new Point(this._tmpX, this._tmpY), Targeting.getOldStyleTargets(0));
        }
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        while (_loc8_ < _loc6_.length) {
            _loc1_ = _loc6_[_loc8_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            if (!(_loc2_._friendly && this._damage < 0)) {
                if (_loc2_ == this._targetCreep) {
                    if (this._damage > 0) {
                        _loc2_.modifyHealth(-this._damage);
                        _loc7_ = (_loc7_ + this._damage) | 0;
                    } else if (_loc2_._creatureID.substr(0, 1) == "G") {
                        _loc2_.modifyHealth(-this._damage / 10);
                        _loc7_ = (_loc7_ + this._damage / 10) | 0;
                    } else {
                        _loc2_.modifyHealth(-this._damage);
                        _loc7_ = (_loc7_ + this._damage) | 0;
                    }
                    if (_loc2_.health > _loc2_.maxHealth) {
                        _loc7_ = (_loc7_ - (_loc2_.maxHealth - _loc2_.health)) | 0;
                        _loc2_.modifyHealth(_loc7_);
                    }
                } else {
                    _loc3_ = Number(_loc1_.dist);
                    _loc4_ = as3.cast(_loc1_.pos, Point);
                    if ((_loc5_ = (this._damage * 0.75 / this._splash * (this._splash - _loc3_)) | 0) > 0) {
                        _loc2_.modifyHealth(-_loc5_);
                        _loc7_ += _loc5_;
                    } else if (_loc2_._creatureID.substr(0, 1) == "G") {
                        _loc2_.modifyHealth(-_loc5_ / 10);
                        _loc7_ = (_loc7_ + _loc5_ / 10) | 0;
                    } else {
                        _loc2_.modifyHealth(-_loc5_);
                        _loc7_ += _loc5_;
                    }
                    if (_loc2_.health > _loc2_.maxHealth) {
                        _loc7_ = (_loc7_ - (_loc2_.maxHealth - _loc2_.health)) | 0;
                        _loc2_.modifyHealth(_loc7_);
                    }
                }
            }
            _loc8_++;
        }
        ATTACK.Damage(this._startPoint.x, this._startPoint.y, _loc7_);
    }

    private FindGlaiveTarget(): void {
        let _loc1_: Point = null;
        let _loc2_: Point = null;
        let _loc3_: int = 0;
        let _loc5_: BFOUNDATION = null;
        if (this._targetBuilding == null) {
            return;
        }
        let _loc4_: any[] = [];
        _loc1_ = new Point(this._graphic.x, this._graphic.y);
        let _loc6_: int = 100;
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc5_ of (_loc7_ ?? [])) {
            if (Boolean(_loc5_.isTargetable) && _loc5_._class != "wall" && _loc5_._class != "mushroom" && _loc5_._class != "decoration" && _loc5_._class != "immovable" && _loc5_.health > 0 && _loc5_._class != "enemy" && _loc5_._class != "trap" && !(_loc5_ instanceof BTOWER && (as3.as(_loc5_, BTOWER)).isJard)) {
                _loc2_ = new Point(_loc5_._mc.x, _loc5_._mc.y + _loc5_._footprint[0].height / 2);
                _loc3_ = Point.distance(_loc1_, _loc2_) | 0;
                if (_loc5_ != this._targetBuilding && _loc3_ <= _loc6_) {
                    _loc4_.push({ "building": _loc5_, "distance": _loc3_, "expand": true });
                }
            }
        }
        if (_loc4_.length == 0) {
            _loc7_ = InstanceManager.getInstancesByClass(BWALL);
            for (_loc5_ of (_loc7_ ?? [])) {
                _loc2_ = new Point(_loc5_._mc.x, _loc5_._mc.y + _loc5_._footprint[0].height / 2);
                _loc3_ = Point.distance(_loc1_, _loc2_) | 0;
                if (_loc5_ != this._targetBuilding && _loc3_ <= _loc6_ && _loc5_.health > 0) {
                    _loc4_.push({ "building": _loc5_, "distance": _loc3_, "expand": true });
                }
            }
        }
        as3.sortOn(_loc4_, "distance", Array.NUMERIC);
        if (_loc4_.length == 0) {
            this._targetBuilding = null;
            return;
        }
        if (_loc4_[0].building == this._previousTarget) {
            _loc4_.shift();
        }
        if (_loc4_.length > 0) {
            this._previousTarget = this._targetBuilding;
            this._targetBuilding = as3.cast(_loc4_[0].building, BFOUNDATION);
            this._targetPoint = new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y + (!(!_loc4_[0].expand) ? this._targetBuilding._footprint[0].height / 2 : 0));
            _loc3_ = (Point.distance(_loc1_, this._targetPoint) - (!(!_loc4_[0].expand) ? Math.abs(this._targetBuilding._footprint[0].height - this._previousTarget._footprint[0].height) / 2 : 0)) | 0;
            if (_loc3_ > _loc6_) {
                this._targetBuilding = null;
            }
        } else {
            this._targetBuilding = null;
        }
    }
}
