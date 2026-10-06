import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Point } from "flash/geom";
import { getQualifiedClassName } from "flash/utils";
import { ATTACK, BASE, BFOUNDATION, DummyTarget, GLOBAL, GRID, ITargetable, MonsterBase, PATHING, print } from "@game";

export class Targeting extends ASObject {
    public static readonly k_TARGETS_DEFENDERS: int = 1 << 0;

    public static readonly k_TARGETS_ATTACKERS: int = 1 << 1;

    public static readonly k_TARGETS_GROUND: int = 1 << 2;

    public static readonly k_TARGETS_FLYING: int = 1 << 3;

    public static readonly k_TARGETS_INVISIBLE: int = 1 << 4;

    public static readonly k_TARGETS_BUILDINGS: int = 1 << 5;

    public static readonly k_TARGETS_ALL: int = int.MAX_VALUE;

    public static _creepCells: any = {};

    public static _deadCreepCells: any = null;

    public static readonly _CELLSIZE: int = 100;

    public $ctor(): void {
        super.$ctor();
        Targeting.init();
    }

    public static init(): void {
        Targeting._creepCells = {};
        Targeting._deadCreepCells = {};
    }

    public static CreepCellAdd(param1: Point, param2: string, param3: MonsterBase): string {
        if (!param1) {
            return null;
        }
        param1 = GRID.FromISO(param1.x, param1.y);
        let _loc4_: string = "node" + ((param1.x / Targeting._CELLSIZE) | 0) + "|" + ((param1.y / Targeting._CELLSIZE) | 0);
        let _loc5_: any = null;
        if (!(_loc5_ = param3.dead ? Targeting._deadCreepCells : Targeting._creepCells)[_loc4_]) {
            _loc5_[_loc4_] = new Array();
        }
        _loc5_[_loc4_]["creep" + param2] = param3;
        return _loc4_;
    }

    public static CreepCellMove(param1: Point, param2: string, param3: MonsterBase, param4: string): string {
        if (!param1) {
            return null;
        }
        param1 = GRID.FromISO(param1.x, param1.y);
        let _loc5_: string = null;
        if ((_loc5_ = "node" + ((param1.x / Targeting._CELLSIZE) | 0) + "|" + ((param1.y / Targeting._CELLSIZE) | 0)) != param4) {
            Targeting.CreepCellDelete(param2, param4, param3.dead);
            return Targeting.CreepCellAdd(GRID.ToISO(param1.x, param1.y, 0), param2, param3);
        }
        return "";
    }

    public static CreepCellDelete(param1: string, param2: string, param3: boolean = false): void {
        let _loc4_: any = null;
        if ((_loc4_ = param3 ? Targeting._deadCreepCells : Targeting._creepCells)[param2]) {
            delete _loc4_[param2]["creep" + param1];
        }
    }

    public static getTargetsInRange(radius: number, location: Point, targetFlags: int, ignoreCreep: MonsterBase = null, ignoreBuilding: BFOUNDATION = null): any[] {
        let _loc5_: any[] = [];
        if (Boolean(targetFlags & Targeting.k_TARGETS_ATTACKERS) || Boolean(targetFlags & Targeting.k_TARGETS_DEFENDERS)) {
            _loc5_ = _loc5_.concat(Targeting.getCreepsInRange(radius, location, targetFlags, ignoreCreep));
        }
        if (targetFlags & Targeting.k_TARGETS_BUILDINGS) {
            _loc5_ = _loc5_.concat(Targeting.getBuildingsInRange(radius, location, ignoreBuilding));
        }
        return _loc5_;
    }

    public static getAllBUTTargetsInRange(param1: number, param2: Point, param3: int = 0): any[] {
        let _loc4_: any[] = [];
        _loc4_ = Targeting.getCreepsInRange(param1, param2, ~param3);
        if (!(param3 & Targeting.k_TARGETS_BUILDINGS)) {
            _loc4_ = _loc4_.concat(Targeting.getBuildingsInRange(param1, param2));
        }
        return _loc4_;
    }

    public static getTargetThatHasAllFlagsInRange(param1: number, param2: Point, param3: int = 0, param4: MonsterBase = null): any[] {
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc13_: string = null;
        let _loc14_: MonsterBase = null;
        let _loc15_: number = NaN;
        let _loc16_: Point = null;
        let _loc17_: int = 0;

        if (!param2) {
            return [];
        }

        let _loc5_: int = (param2.x / Targeting._CELLSIZE) | 0;
        let _loc6_: int = (param2.y / Targeting._CELLSIZE) | 0;
        let _loc7_: int = (((param1 / Targeting._CELLSIZE) | 0) + 1) | 0;
        let _loc8_: any[] = [];
        let _loc9_: number = param1 * param1;
        let _loc10_: int = (_loc5_ - _loc7_) | 0;
        while (_loc10_ <= _loc5_ + _loc7_) {
            _loc11_ = (_loc6_ - _loc7_) | 0;
            while (_loc11_ <= _loc6_ + _loc7_) {
                _loc12_ = "node" + _loc10_ + "|" + _loc11_;

                if (!Targeting._creepCells[_loc12_]) {
                    _loc11_++;
                    continue;
                }
                for (_loc13_ in Targeting._creepCells[_loc12_]) {
                    _loc14_ = as3.cast(Targeting._creepCells[_loc12_][_loc13_], MonsterBase);

                    if (!_loc14_ || !_loc14_._tmpPoint) {
                        continue;
                    }

                    if (_loc14_ != param4 && Targeting.canHitCreep(_loc14_.defenseFlags, param3)) {
                        _loc15_ = _loc14_.health;
                        _loc16_ = PATHING.FromISO(_loc14_._tmpPoint);

                        if (!_loc16_) {
                            continue;
                        }

                        if ((_loc17_ = GLOBAL.QuickDistanceSquared(param2, _loc16_) | 0) < _loc9_) {
                            _loc8_.push({ "creep": _loc14_, "dist": Math.sqrt(_loc17_), "pos": _loc16_, "hp": _loc15_ });
                        }
                    }
                }
                _loc11_++;
            }
            _loc10_++;
        }
        return _loc8_;
    }

    public static getBuildingsInRange(param1: number, param2: Point, param3: BFOUNDATION = null): any[] {
        let _loc5_: BFOUNDATION = null;
        let _loc6_: int = 0;
        let _loc4_: any[] = [];

        if (!param2) {
            return [];
        }

        for (_loc5_ of as3.values(BASE._buildingsAll)) {
            if (!_loc5_) {
                continue;
            }

            if (_loc5_.isTargetable && _loc5_ != param3) {
                if ((_loc6_ = GLOBAL.QuickDistanceSquared(param2, new Point(_loc5_.x, _loc5_.y)) | 0) < param1 * param1) {
                    _loc4_.push({ "creep": _loc5_, "dist": Math.sqrt(_loc6_) });
                }
            }
        }
        return _loc4_;
    }

    /**
     * Inferno-only: a monster in the air (Balthazar and the other flyers, landed to attack or not). Balthazar
     * is made hittable by every tower (his class clears his flying and ground flags), so the ground-only
     * defences have to leave him out by hand: he does not set off traps (their blast still catches him
     * if he is near one when something else sets it off), and Quake towers neither fire at him nor hurt him.
     */
    public static ioAirborne(param1: MonsterBase): boolean {
        return param1 != null && (param1._movement == "fly" || param1._movement == "fly_low");
    }

    /**
     * Inferno-only: monsters that do not set traps off: the airborne ones, and Flickerfiend (IC14), too
     * nimble to step on one. A trap something else sets off still catches them in its blast.
     */
    public static ioSkipsTraps(param1: MonsterBase): boolean {
        return param1 != null && (Targeting.ioAirborne(param1) || param1._creatureID == "IC14");
    }

    public static getOldStyleTargets(param1: int): int {
        let _loc2_: any = 0;
        if (param1 == -1) {
            _loc2_ |= Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_INVISIBLE;
        } else if (param1 == 0) {
            _loc2_ |= Targeting.k_TARGETS_GROUND;
        } else if (param1 == 1) {
            _loc2_ |= Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING;
        } else if (param1 == 2) {
            _loc2_ |= Targeting.k_TARGETS_FLYING;
        }
        return _loc2_ | Targeting.k_TARGETS_ATTACKERS;
    }

    public static getCreepsInRange(param1: number, param2: Point, param3: int = 0, param4: MonsterBase = null): any[] {
        if (!param2) {
            return [];
        }
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc13_: string = null;
        let _loc14_: MonsterBase = null;
        let _loc15_: number = NaN;
        let _loc16_: Point = null;
        let _loc17_: int = 0;
        if (!(param3 & Targeting.k_TARGETS_DEFENDERS || param3 & Targeting.k_TARGETS_ATTACKERS)) {
            if (GLOBAL._aiDesignMode) {
                print("haha, you are a fool! Attempting to get creeps in range, but targeting attacking or defending creeps not defined");
            }
            return [];
        }
        param2 = PATHING.FromISO(param2);

        if (!param2) {
            return [];
        }

        let _loc5_: int = (param2.x / Targeting._CELLSIZE) | 0;
        let _loc6_: int = (param2.y / Targeting._CELLSIZE) | 0;
        let _loc7_: int = (((param1 / Targeting._CELLSIZE) | 0) + 1) | 0;
        let _loc8_: any[] = [];
        let _loc9_: number = param1 * param1;
        let _loc10_: int = (_loc5_ - _loc7_) | 0;
        while (_loc10_ <= _loc5_ + _loc7_) {
            _loc11_ = (_loc6_ - _loc7_) | 0;
            while (_loc11_ <= _loc6_ + _loc7_) {
                _loc12_ = "node" + _loc10_ + "|" + _loc11_;

                if (!Targeting._creepCells[_loc12_]) {
                    _loc11_++;
                    continue;
                }
                for (_loc13_ in Targeting._creepCells[_loc12_]) {
                    _loc14_ = as3.cast(Targeting._creepCells[_loc12_][_loc13_], MonsterBase);

                    if (!_loc14_ || !_loc14_._tmpPoint) {
                        continue;
                    }

                    if (_loc14_.health > 0 && _loc14_.isTargetable && _loc14_ != param4 && Targeting.canHitCreep(param3, _loc14_.defenseFlags)) {
                        _loc15_ = _loc14_.health;
                        _loc16_ = PATHING.FromISO(_loc14_._tmpPoint);

                        if (!_loc16_) {
                            continue;
                        }

                        if ((_loc17_ = GLOBAL.QuickDistanceSquared(param2, _loc16_) | 0) < _loc9_) {
                            _loc8_.push({ "creep": _loc14_, "dist": Math.sqrt(_loc17_), "pos": _loc16_, "hp": _loc15_ });
                        }
                    }
                }
                _loc11_++;
            }
            _loc10_++;
        }
        return _loc8_;
    }

    public static getDeadCreeps(param1: Point, param2: number, param3: int = 0, param4: MonsterBase = null): any[] {
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc13_: string = null;
        let _loc14_: MonsterBase = null;
        let _loc15_: number = NaN;
        let _loc16_: Point = null;
        let _loc17_: int = 0;

        if (!param1) {
            return [];
        }

        param1 = PATHING.FromISO(param1);

        if (!param1) {
            return [];
        }

        let _loc5_: int = (param1.x / Targeting._CELLSIZE) | 0;
        let _loc6_: int = (param1.y / Targeting._CELLSIZE) | 0;
        let _loc7_: int = (((param2 / Targeting._CELLSIZE) | 0) + 1) | 0;
        let _loc8_: any[] = [];
        let _loc9_: number = param2 * param2;
        let _loc10_: int = (_loc5_ - _loc7_) | 0;
        while (_loc10_ <= _loc5_ + _loc7_) {
            _loc11_ = (_loc6_ - _loc7_) | 0;
            while (_loc11_ <= _loc6_ + _loc7_) {
                _loc12_ = "node" + _loc10_ + "|" + _loc11_;

                if (!Targeting._deadCreepCells[_loc12_]) {
                    _loc11_++;
                    continue;
                }
                for (_loc13_ in Targeting._deadCreepCells[_loc12_]) {
                    _loc14_ = as3.cast(Targeting._deadCreepCells[_loc12_][_loc13_], MonsterBase);

                    if (!_loc14_ || !_loc14_._tmpPoint) {
                        continue;
                    }

                    if (_loc14_.health <= 0 && _loc14_._visible && _loc14_.isTargetable && _loc14_ != param4) {
                        if (Targeting.canHitCreep(param3, _loc14_.defenseFlags)) {
                            _loc15_ = _loc14_.health;
                            _loc16_ = PATHING.FromISO(_loc14_._tmpPoint);

                            if (!_loc16_) {
                                continue;
                            }

                            if ((_loc17_ = GLOBAL.QuickDistanceSquared(param1, _loc16_) | 0) < _loc9_) {
                                _loc8_.push({ "creep": _loc14_, "dist": Math.sqrt(_loc17_), "pos": _loc16_, "hp": _loc15_ });
                            }
                        }
                    }
                }
                _loc11_++;
            }
            _loc10_++;
        }
        return _loc8_;
    }

    public static canHitCreep(param1: int, param2: int): boolean {
        param1 = ~param1;
        return !(param1 & param2);
    }

    public static getClosestCreep(param1: number, param2: Point, param3: int = 0, param4: MonsterBase = null): MonsterBase {
        let _loc5_: any[] = null;
        if ((_loc5_ = Targeting.getCreepsInRange(param1, param2, param3, param4)).length <= 0) {
            return null;
        }
        as3.sortOn(_loc5_, ["dist"], Array.NUMERIC);

        if (!_loc5_[0] || !_loc5_[0].creep) {
            return null;
        }

        return as3.cast(_loc5_[0].creep, MonsterBase);
    }

    public static DealLinearAEDamage(param1: Point, param2: number, param3: number, param4: any[], param5: number = 0): int {
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc10_: any = undefined;

        if (!param1 || !param4) {
            return 0;
        }

        if (param5 > param2) {
            param5 = param2 - 1;
        }
        for (_loc10_ of as3.values(param4)) {
            if (!_loc10_) {
                continue;
            }

            if (getQualifiedClassName(_loc10_) == "Object") {
                if (!_loc10_.creep) {
                    continue;
                }

                _loc6_ = _loc10_.dist | 0;
                _loc10_ = _loc10_.creep;
            } else {
                _loc6_ = GLOBAL.QuickDistance(param1, new Point(_loc10_.x, _loc10_.y)) | 0;
            }
            if (param2 >= _loc6_) {
                if (_loc6_ < param5) {
                    _loc7_ = param3 | 0;
                } else {
                    _loc7_ = (param3 / param2 * (param2 - _loc6_)) | 0;
                }
                if (_loc7_ < param3 / 5) {
                    _loc7_ = (param3 / 5) | 0;
                }
                if (_loc10_ instanceof BFOUNDATION) {
                    as3.cast(_loc10_, BFOUNDATION).modifyHealth(_loc7_, new DummyTarget(param1.x, param1.y));
                } else {
                    _loc7_ = (_loc7_ * _loc10_._damageMult) | 0;
                    _loc10_.modifyHealth(-_loc7_);
                }
                _loc8_ += _loc7_;
            }
        }
        ATTACK.Damage(param1.x, param1.y, _loc8_);
        return _loc8_;
    }

    public static getFriendlyFlag(param1: MonsterBase): int {
        if (!param1) {
            return Targeting.k_TARGETS_ATTACKERS;
        }
        return param1._friendly ? Targeting.k_TARGETS_DEFENDERS : Targeting.k_TARGETS_ATTACKERS;
    }

    public static getEnemyFlag(param1: MonsterBase): int {
        if (!param1) {
            return Targeting.k_TARGETS_DEFENDERS;
        }
        return param1._friendly ? Targeting.k_TARGETS_ATTACKERS : Targeting.k_TARGETS_DEFENDERS;
    }

    public static getClosestEnemy(param1: uint, param2: Point, param3: int): ITargetable {
        let _loc4_: any[] = null;
        if ((_loc4_ = Targeting.getTargetsInRange(param1, param2, param3)).length <= 0) {
            return null;
        }
        as3.sortOn(_loc4_, ["dist"], Array.NUMERIC);

        if (!_loc4_[0] || !_loc4_[0].creep) {
            return null;
        }

        return as3.cast(_loc4_[0].creep, ITargetable);
    }
}
