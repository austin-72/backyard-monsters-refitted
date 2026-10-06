import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, EFFECTS, GLOBAL, IAttackable, KEYS, MonsterBase, SOUNDS, Vacuum } from "@game";

export class BUILDING25 extends BTOWER {
    static {
        as3.fields(this, { _field: null, _fieldBMP: null, _animBitmap: null, _fireStage: 0, _shotsFired: 0, _laserTarget: null });
    }

    public static readonly TYPE: uint = 25;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _animBitmap: BitmapData;
    public _fireStage: int;
    public _shotsFired: int;
    public _laserTarget: IAttackable;

    public $ctor(): void {
        super.$ctor();
        this._type = 25;
        this._frameNumber = 0;
        this._animTick = 0;
        this._top = -30;
        this._fireStage = 0;
        this._shotsFired = 0;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
        this.Props();
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
            if (_loc1_.rate < _loc2_.rate) {
                this._upgradeDescription += KEYS.Get("building_sfpcincrease", { "v1": _loc1_.rate, "v2": _loc2_.rate }) + "<br>";
            }
        }
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && !GLOBAL._catchup) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        if (param1 instanceof MonsterBase) {
            this._laserTarget = param1;
        } else {
            this._laserTarget = null;
        }
        if (this._fireStage == 0) {
            this._fireStage = 1;
            SOUNDS.Play("lightningstart", !this.isJard ? 0.8 : 0.4);
        }
    }

    public override TickFast(param1: Event = null): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        super.TickFast(param1);
        ++this._frameNumber;
        if (this._frameNumber == 40) {
            this._frameNumber = 4;
        }
        if (!GLOBAL._catchup) {
            if (this._fireStage == 1) {
                ++this._animTick;
                if (this._animTick == 32) {
                    this._fireStage = 2;
                    this._shotsFired = 0;
                }
            } else if (this._fireStage == 2) {
                if (this.health <= 0) {
                    this._fireStage = 3;
                } else {
                    ++this._animTick;
                    if (this._animTick == 41) {
                        this._animTick = 32;
                    }
                    if (this._frameNumber % 4 == 0) {
                        if (this._hasTargets || this._targetVacuum) {
                            _loc2_ = 0.5 + 0.5 / this.maxHealth * this.health;
                            _loc3_ = 1;
                            if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
                                _loc3_ = 1.25;
                            }
                            if (this.isJard) {
                                this._jarHealth.Add(-((this.damage * _loc2_ * _loc3_) | 0));
                                ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * _loc2_ * _loc3_) | 0);
                                if (this._jarHealth.Get() <= 0) {
                                    this.KillJar();
                                }
                            } else if (Boolean(this._laserTarget) || this._targetVacuum) {
                                if (this._laserTarget) {
                                    if (this._laserTarget instanceof MonsterBase && as3.cast(this._laserTarget, MonsterBase)._movement == "fly") {
                                        EFFECTS.Lightning(this._mc.x | 0, (this._mc.y - 50) | 0, this._laserTarget.x | 0, (this._laserTarget.y - as3.cast(this._laserTarget, MonsterBase)._altitude) | 0);
                                    } else {
                                        EFFECTS.Lightning(this._mc.x | 0, (this._mc.y - 50) | 0, this._laserTarget.x | 0, this._laserTarget.y | 0);
                                    }
                                    this._laserTarget.modifyHealth(-((this.damage * _loc2_ * _loc3_) | 0));
                                    ATTACK.Damage(this._mc.x, this._mc.y - 50, (this.damage * _loc2_ * _loc3_) | 0);
                                } else if (this._targetVacuum && this.canShootVacuumHose()) {
                                    EFFECTS.Lightning(this._mc.x | 0, (this._mc.y - 50) | 0, GLOBAL.townHall._mc.x | 0, (GLOBAL.townHall._mc.y - GLOBAL.townHall._mc.height) | 0);
                                    Vacuum.getHose().modifyHealth(-((this.damage * _loc2_ * _loc3_) | 0));
                                    ATTACK.Damage(this._mc.x, this._mc.y - 50, (this.damage * _loc2_ * _loc3_) | 0);
                                }
                            }
                        }
                        SOUNDS.Play("lightningfire", !this.isJard ? 0.8 : 0.4);
                        ++this._shotsFired;
                        if (this._shotsFired >= this._rate) {
                            this._fireStage = 3;
                            SOUNDS.Play("lightningend", !this.isJard ? 0.8 : 0.4);
                        } else if (this._targetVacuum) {
                            if (this.canShootVacuumHose()) {
                                this._targetVacuum = true;
                            } else {
                                this._hasTargets = false;
                                this.FindTargets(1, this._priority);
                                if (!this._hasTargets) {
                                    this._fireStage = 3;
                                }
                                SOUNDS.Play("lightningend", !this.isJard ? 0.8 : 0.4);
                            }
                        } else if (Boolean(this._laserTarget) && (this._laserTarget.health <= 0 || this._laserTarget instanceof MonsterBase && !as3.cast(this._laserTarget, MonsterBase).isTargetable)) {
                            if (this.canShootVacuumHose()) {
                                this._targetVacuum = true;
                            } else {
                                this._hasTargets = false;
                                this.FindTargets(1, this._priority);
                                if (!this._hasTargets) {
                                    this._fireStage = 3;
                                }
                                SOUNDS.Play("lightningend", !this.isJard ? 0.8 : 0.4);
                            }
                        }
                    }
                }
            } else if (this._fireStage == 3) {
                if (this._frameNumber % 2 == 0) {
                    ++this._animTick;
                    if (this._animTick == 55) {
                        this._animTick = 0;
                        this._fireStage = 0;
                    }
                }
            }
            if (GLOBAL._render && this._animTick > 0) {
                this.AnimFrame();
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
        super.Constructed();
    }
}
