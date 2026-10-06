import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, GLOBAL, IAttackable, KEYS, MonsterBase, PATHING, POPUPS, PROJECTILES, SOUNDS, Targeting, Vacuum, popup_building } from "@game";

export class BUILDING115 extends BTOWER {
    static {
        as3.fields(this, { _animMC: null, _animBitmap: null, _shotsFired: 0, _lostCreep: false, _fireStage: 1, _targetArray: null });
    }

    public _animMC: MovieClip;
    public _animBitmap: BitmapData;
    public _shotsFired: int;
    public _lostCreep: boolean;
    public _fireStage: int;
    public _targetArray: any[];

    public $ctor(): void {
        this._targetArray = [4, 4, 6, 8, 10, 12, 14, 16];
        super.$ctor();
        this._frameNumber = 0;
        this._type = 115;
        this._top = -5;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._fireStage = 1;
        this.SetProps();
        this.Props();
        this.attackFlags = Targeting.getOldStyleTargets(2);
    }

    public override TickAttack(): void {
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: MonsterBase = null;
        let _loc5_: Point = null;
        let _loc6_: Point = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc1_: int = this._targetArray[this._lvl.Get() - 1] | 0;
        ++this._frameNumber;
        if (this.health > 0 && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() == 0) {
            if (this._fireStage == 1) {
                --this._fireTick;
                if (this._fireTick <= 0) {
                    this._fireStage = 2;
                    this._shotsFired = 0;
                    this._fireTick = (this._fireTick + this._rate * 2) | 0;
                }
            }
            if (this._fireStage == 2) {
                if (this.canShootVacuumHose()) {
                    this._targetVacuum = true;
                    this._fireTick = 30;
                } else if (!this._hasTargets || !this.targetInRange()) {
                    this._targetVacuum = false;
                    this.FindTargets(_loc1_, this._priority);
                    this._fireTick = 30;
                }
                if (this._targetVacuum || this._hasTargets) {
                    if (this._shotsFired >= _loc1_) {
                        this._fireStage = 1;
                    } else if (this._frameNumber % 4 == 0) {
                        _loc2_ = false;
                        _loc3_ = 0;
                        if (Boolean(this._targetCreeps) && this._targetCreeps.length > 0) {
                            _loc3_ = (this._shotsFired % this._targetCreeps.length) | 0;
                        }
                        if (this._targetVacuum) {
                            this.Fire(Vacuum.getHose());
                            ++this._shotsFired;
                        } else if (this._targetCreeps[_loc3_].creep.health > 0) {
                            this.Fire(as3.cast(this._targetCreeps[_loc3_].creep, IAttackable));
                            ++this._shotsFired;
                        } else {
                            _loc2_ = true;
                        }
                        if (Boolean(this._retarget) || _loc2_) {
                            this.FindTargets(_loc1_, this._priority);
                        }
                    }
                }
            }
        }
        if (this._hasTargets) {
            _loc4_ = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            _loc5_ = PATHING.FromISO(_loc4_._tmpPoint);
            _loc6_ = (_loc6_ = PATHING.FromISO(new Point(this._mc.x, this._mc.y))).add(new Point(35, 35));
            _loc7_ = (_loc5_.x - _loc6_.x) | 0;
            _loc8_ = (_loc5_.y - _loc6_.y) | 0;
            if ((_loc9_ = (Math.atan2(_loc8_, _loc7_) * 57.2957795) | 0) < 0) {
                _loc9_ = (360 + _loc9_) | 0;
            }
            _loc9_ = (_loc9_ / 12) | 0;
            this._animTick = _loc9_;
            this.AnimFrame();
        }
        if (this._jarAnimation) {
            this.TickJar();
        }
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && GLOBAL._render) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        SOUNDS.Play("snipe1", !this.isJard ? 0.8 : 0.4);
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else {
            PROJECTILES.Spawn(new Point(this._mc.x, this._mc.y + this._top), null, param1, this._speed, (this.damage * _loc2_ * _loc3_) | 0, false, this._splash, this.attackFlags);
        }
    }

    public override Description(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        super.Description();
        this._upgradeDescription = "";
        if (this._lvl.Get() > 0 && this._lvl.Get() < this._buildingProps.costs.length) {
            _loc1_ = this._buildingProps.stats[this._lvl.Get() - 1];
            _loc2_ = this._buildingProps.stats[this._lvl.Get()];
            _loc3_ = _loc1_.range | 0;
            _loc4_ = _loc2_.range | 0;
            if (BASE.isOutpost) {
                _loc3_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc3_);
                _loc4_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc4_);
            }
            if (_loc1_.range < _loc2_.range) {
                this._upgradeDescription += KEYS.Get("building_rangeincrease", { "v1": _loc3_, "v2": _loc4_ }) + "<br>";
            }
            if (_loc1_.damage < _loc2_.damage) {
                this._upgradeDescription += KEYS.Get("building_dpsincrease", { "v1": _loc1_.damage, "v2": _loc2_.damage }) + "<br>";
            }
            if (this._lvl.Get() > 1) {
                this._upgradeDescription += KEYS.Get("building_sfpsincrease", { "v1": this._targetArray[this._lvl.Get() - 1], "v2": this._targetArray[this._lvl.Get()] }) + "<br>";
            }
        }
    }

    public override Props(): void {
        super.Props();
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (): void => {
                GLOBAL.CallJS("sendFeed", ["aatower-construct", KEYS.Get("pop_aabuilt_streamtitle"), KEYS.Get("pop_aabuilt_streambody"), "build-aerial.v2.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_aabuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_aabuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }
}
