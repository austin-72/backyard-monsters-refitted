import * as as3 from "as3";
import { Vector, int } from "as3";
import { Point } from "flash/geom";
import { AOEEnrage, ATTACK, BFOUNDATION, CHAMPIONCAGE, ChampionBase, FIREBALL, FIREBALLS, GLOBAL, ITargetable, InstanceManager, KEYS, LOGGER, LOGIN, MonsterBase, PATHING, SOUNDS, SPRITES, Targeting } from "@game";

export class Fomor extends ChampionBase {
    public $ctor(param1?: string, param2?: Point, param3?: number, param4: Point = null, param5: boolean = false, param6: BFOUNDATION = null, param7: int = 1, param8: int = 0, param9: int = 0, param10: int = 1, param11: int = 20000, param12: int = 0, param13: int = 1): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13);
        this.attackDelayProperty.value = 8;
        if (this._behaviour == "bounce") {
            this._graphicMC.y -= this._altitude;
            this.changeModeBuff();
        }
        SPRITES.SetupSprite("bigshadow");
        this.addComponent(new AOEEnrage(250, 1 + this._buff * 2, this._buff));
        this.attackFlags = Targeting.getOldStyleTargets(1);
    }

    public override tick(param1: int = 1): boolean {
        let _loc2_: boolean = super.tick(param1);
        switch (this._behaviour) {
            case MonsterBase.k_sBHVR_BUFF:
                this.tickBBuff();
                break;
            case MonsterBase.k_sBHVR_PEN:
                this._hasTarget = false;
        }
        return _loc2_;
    }

    public override canShootCreep(): boolean {
        if (this._targetCreep == null) {
            return false;
        }
        let _loc1_: number = GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint);
        if (_loc1_ > this.m_range) {
            return false;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetCreep._tmpPoint.x | 0, this._targetCreep._tmpPoint.y | 0)) {
            return true;
        }
        return false;
    }

    public findBuffTargets(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: boolean = false;
        let _loc4_: any[] = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_._class !== "decoration" && _loc2_._class !== "immovable" && _loc2_.health > 0 && _loc2_._class !== "enemy") {
                _loc3_ = true;
            }
        }
        if (!_loc3_) {
            this.changeModeRetreat();
            return;
        }
        this._looking = true;
        let _loc5_: boolean = false;
        this._targetCreeps = Targeting.getCreepsInRange(1500, this._tmpPoint, Targeting.getOldStyleTargets(1), this);
        if (this._targetCreeps.length > 0) {
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            if (!(Boolean(this._targetCreep) && this._targetCreep.health > 0 && this._targetCreep.health < this._targetCreep.maxHealth)) {
                _loc5_ = true;
                while (this._targetCreeps.length > 0 && (this._targetCreeps[0].creep._behaviour == "heal" || this._targetCreeps[0].creep.health == this._targetCreeps[0].creep.maxHealth)) {
                    this._targetCreeps.shift();
                }
                if (this._targetCreeps.length > 0) {
                    this._helpCreep = this._targetCreeps[0].creep;
                    if (this._movement == "fly") {
                        this._waypoints = [this._helpCreep._tmpPoint];
                        this._targetPosition = as3.cast(this._helpCreep._tmpPoint, Point);
                    } else {
                        this.WaypointTo(as3.cast(this._helpCreep._tmpPoint, Point), null);
                    }
                }
            }
        }
        if (this._targetCreeps.length > 0) {
            _loc5_ = false;
            this._helpCreep = this._targetCreeps[0].creep;
            if (this._movement == "fly") {
                this._waypoints = [this._helpCreep._tmpPoint];
                this._targetPosition = as3.cast(this._helpCreep._tmpPoint, Point);
            } else {
                this.WaypointTo(as3.cast(this._helpCreep._tmpPoint, Point), null);
            }
            this._behaviour = MonsterBase.k_sBHVR_BUFF;
        } else if (this._helpCreep && this._helpCreep.health > 0 && this._helpCreep.health < this._helpCreep.maxHealth) {
            _loc5_ = false;
            if (this._movement == "fly") {
                this._waypoints = [this._helpCreep._tmpPoint];
                this._targetPosition = as3.cast(this._helpCreep._tmpPoint, Point);
            } else {
                this.WaypointTo(as3.cast(this._helpCreep._tmpPoint, Point), null);
            }
            this._behaviour = MonsterBase.k_sBHVR_BUFF;
        } else if (this._targetCreeps.length == 0) {
            this.changeModeAttack();
            return;
        }
        if (this._waypoints.length) {
            this._hasTarget = true;
            this._hasPath = true;
        }
    }

    protected override tickBAttack(): void {
        super.tickBAttack();
        if (this._frameNumber % 100 == 0) {
            this.findBuffTargets();
            if (this._behaviour == MonsterBase.k_sBHVR_BUFF) {
                this.tickBBuff();
                return;
            }
        }
    }

    protected override doAttackDamage(): void {
        let _loc1_: number = 1;
        if (this._creatureID == "G3") {
            if (Boolean(this._targetCreep) && this._targetCreep.health > 0) {
                this.rangedAttack(this._targetCreep);
            } else if (this._targetBuilding) {
                this._targetCenter = this._targetBuilding._position;
                this._targetPosition = this._targetBuilding._position;
                this.rangedAttack(this._targetBuilding);
            } else {
                this.findBuffTargets();
            }
        }
    }

    protected override rangedAttack(param1: ITargetable): ITargetable {
        let _loc3_: FIREBALL = null;
        let _loc2_: Point = Point.interpolate(this._tmpPoint.add(new Point(0, -this._altitude)), this._targetPosition, 0.8);
        if (param1 instanceof BFOUNDATION) {
            _loc3_ = FIREBALLS.Spawn(_loc2_, this._targetPosition, this._targetBuilding, 8, this.damage | 0, 0, 0, FIREBALLS.TYPE_FIREBALL, this);
        } else {
            _loc3_ = FIREBALLS.Spawn2(_loc2_, this._targetCreep._tmpPoint, this._targetCreep, 8, this.damage | 0, 0, FIREBALLS.TYPE_FIREBALL, 1, this);
        }
        SOUNDS.Play("hit" + ((1 + Math.random() * 3) | 0), 0.1 + Math.random() * 0.1);
        FIREBALLS._fireballs[FIREBALLS._id - 1]._graphic.gotoAndStop(3);
        return _loc3_;
    }

    public tickBBuff(): void {
        let _loc1_: number = 1;
        if (this.health <= 0) {
            Targeting.CreepCellDelete(this._id, this.node);
            this.changeModeRetreat();
            ATTACK.Log(this._creatureID, KEYS.Get("attacklog_champ_retreated", { "v1": LOGIN._playerName, "v2": this._level.Get(), "v3": CHAMPIONCAGE._guardians[this._creatureID].name }));
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                LOGGER.Stat([54, this._creatureID, 1, this._level.Get()]);
            }
            SOUNDS.Play("monsterland" + (1 + ((Math.random() * 3) | 0)));
            return;
        }
        if (this._frameNumber % 100 == 0) {
            if (!this._attacking) {
                this.findBuffTargets();
            }
        }
        if (this._hasTarget) {
            if (this._targetCreep) {
                if (this._targetCreep.health <= 0 || this._targetCreep.health == this._targetCreep.maxHealth && this._frameNumber % 20 == 0) {
                    this._hasTarget = false;
                    this._attacking = false;
                    this._atTarget = false;
                    this._hasPath = false;
                    this._helpCreep = null;
                    if (Boolean(this._targetCreep) && this._targetCreep.health <= 0) {
                        this._targetCreep = null;
                    }
                    this.findBuffTargets();
                } else if (GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range) {
                    this._atTarget = true;
                } else {
                    this._atTarget = false;
                }
            } else if (this._helpCreep) {
                if (this._helpCreep._targetBuilding) {
                    this._targetBuilding = as3.cast(this._helpCreep._targetBuilding, BFOUNDATION);
                }
                if (this._helpCreep.health <= 0 || this._helpCreep.health == this._helpCreep.maxHealth && this._frameNumber % 20 == 0) {
                    this._hasTarget = false;
                    this._attacking = false;
                    this._atTarget = false;
                    this._hasPath = false;
                    if (this._helpCreep && this._helpCreep.health <= 0) {
                        this._helpCreep = null;
                    }
                    this.findBuffTargets();
                } else if (this._helpCreep && GLOBAL.QuickDistance(as3.cast(this._helpCreep._tmpPoint, Point), this._tmpPoint) < this.m_range && Boolean(this._helpCreep._targetBuilding) && GLOBAL.QuickDistance(as3.cast(this._helpCreep._targetBuilding._position, Point), this._tmpPoint) < this.m_range) {
                    this._atTarget = true;
                } else if (!this._attacking && !this._looking && this._frameNumber % 120 == 0) {
                    this.findBuffTargets();
                } else if (this._attacking && this._helpCreep && GLOBAL.QuickDistance(as3.cast(this._helpCreep._tmpPoint, Point), this._tmpPoint) > this.m_range * 1.25) {
                    this._attacking = false;
                    this._atTarget = false;
                } else if (this._waypoints.length == 0 && !this._atTarget) {
                    if (this.canHitBuilding()) {
                        this._atTarget = true;
                    } else if (!this._looking) {
                        if (this._movement == "fly") {
                            this._hasPath = true;
                            this._waypoints = [this._targetBuilding._position];
                            this._targetPosition = this._targetBuilding._position;
                        } else if (!this._looking) {
                            this._hasPath = false;
                            this._hasTarget = false;
                            this.WaypointTo(this._targetBuilding._position, this._targetBuilding);
                        }
                    }
                }
            } else if (Boolean(this._targetBuilding) && this._targetBuilding.health > 0) {
                if (this.canHitBuilding()) {
                    this._atTarget = true;
                } else {
                    this._atTarget = false;
                    this._attacking = false;
                    if (this._waypoints.length == 0 && !this._looking) {
                        this._hasPath = false;
                        if (this._movement == "fly") {
                            this._waypoints = [this._helpCreep._tmpPoint];
                            this._targetPosition = as3.cast(this._helpCreep._tmpPoint, Point);
                        } else {
                            this.WaypointTo(as3.cast(this._helpCreep._tmpPoint, Point), this._targetBuilding);
                        }
                    }
                }
            } else {
                this._attacking = false;
                this._atTarget = false;
                this._hasPath = false;
                this._targetCreep = null;
                this._helpCreep = null;
                this._targetBuilding = null;
                this.findBuffTargets();
            }
        } else {
            this._attacking = false;
            this._atTarget = false;
            this._hasPath = false;
            this._targetCreep = null;
            this._helpCreep = null;
            this._targetBuilding = null;
            this.findBuffTargets();
        }
        if (this._atTarget) {
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                if (Boolean(this._targetCreep) && this._targetCreep.health > 0) {
                    this._attacking = true;
                    this.rangedAttack(this._targetCreep);
                    this._targetCenter = this._targetCreep._tmpPoint;
                    this._targetPosition = this._targetCreep._tmpPoint;
                } else if (this._helpCreep && this._helpCreep._targetBuilding && this._helpCreep._targetBuilding.health > 0 || this._targetBuilding && this._targetBuilding.health > 0) {
                    if (this._helpCreep) {
                        this._targetBuilding = as3.cast(this._helpCreep._targetBuilding, BFOUNDATION);
                    }
                    if (Boolean(this._targetBuilding) && GLOBAL.QuickDistance(this._targetBuilding._position, this._tmpPoint) < this.m_range) {
                        this._attacking = true;
                        this._targetCenter = this._targetBuilding._position;
                        this._targetPosition = this._targetBuilding._position;
                        this.rangedAttack(this._targetBuilding);
                    } else if (this._targetBuilding) {
                        this._attacking = false;
                        this._atTarget = false;
                        if (this._movement == "fly") {
                            this._hasPath = true;
                            this._waypoints = [this._targetBuilding._position];
                            this._targetPosition = this._targetBuilding._position;
                        } else if (!this._looking) {
                            this._hasPath = false;
                            this._hasTarget = false;
                            this.WaypointTo(this._targetBuilding._position, this._targetBuilding);
                        }
                    } else {
                        this._attacking = false;
                        this._atTarget = false;
                        this._hasPath = false;
                        this._targetCreep = null;
                        this._helpCreep = null;
                        this._targetBuilding = null;
                        this.findBuffTargets();
                    }
                } else {
                    this._attacking = false;
                    this._atTarget = false;
                    this._hasTarget = false;
                    this._hasPath = false;
                    this._targetBuilding = null;
                    this._targetCreep = null;
                    this._helpCreep = null;
                    this.findBuffTargets();
                }
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
        }
    }

    public changeModeBuff(): void {
        this.changeMode();
        this._behaviour = MonsterBase.k_sBHVR_BUFF;
        this.findBuffTargets();
    }
}
