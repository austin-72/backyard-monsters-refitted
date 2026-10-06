import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, BTRAP, CREATURELOCKER, GLOBAL, GRID, IPROCESS, InstanceManager, PATHING, Solution, WMATTACK } from "@game";

export class PROCESS_INFERNO1 extends ASObject implements IPROCESS {
    static {
        as3.implement(this, [IPROCESS]);
        as3.fields(this, { _solutions: null, solsProcessed: 0, _inProgress: false, _intelligence: NaN, processStepResolution: 3 });
    }

    public _solutions: Vector<Solution>;
    private solsProcessed: uint;
    public _inProgress: boolean;
    public _intelligence: number;
    private processStepResolution: int;

    public $ctor(): void {
        super.$ctor();
    }

    public Trigger(param1: number = 1): void {
        this._intelligence = param1;
        this._inProgress = true;
        this._solutions = new Vector<Solution>(0, false, Solution);
        let _loc2_: number = GLOBAL._mapWidth;
        let _loc3_: number = GLOBAL._mapHeight;
        let _loc4_: int = 0;
        while (_loc4_ < WMATTACK._attackResolution) {
            this._solutions.push(new Solution(360 / WMATTACK._attackResolution * _loc4_, _loc2_, _loc3_));
            _loc4_ += 1;
        }
        this.solsProcessed = 0;
        this.Process(as3.vget(this._solutions, 0), as3.bind(this, this.onProcess));
    }

    public Process(param1: Solution, param2: Function): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: Point = null;
        let _loc6_: number = NaN;
        let _loc5_: any[] = [];
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc7_ ?? [])) {
            if (_loc3_.health > 0 && !_loc3_._looted && (_loc3_ instanceof BTOWER === false && _loc3_ instanceof BTRAP === false)) {
                _loc4_ = GRID.FromISO(_loc3_.x, _loc3_.y);
                _loc6_ = Point.distance(param1.entryPoint, _loc4_);
                _loc5_.push({ "building": _loc3_, "distance": _loc6_ });
            }
        }
        if (_loc5_.length > 0) {
            as3.sortOn(_loc5_, "distance", Array.NUMERIC);
            param1.targetBuilding = _loc5_[0].building;
            // No building class has had an _hp field since the Refitted refactor (health lives in
            // `health`); this planner never ran against a player's yard before, so it went unnoticed.
            // Reading it threw on every frame of a raid and broke the yard (mouse stuck dragging).
            param1.targetHP += Number(param1.targetBuilding.health);
            if (param1.targetHP > 50000) {
                param1.targetHP = 50000;
            }
            param1.wayPoints = PATHING.GetPath(GRID.ToISO(param1.entryPoint.x, param1.entryPoint.y, 0), new Rectangle(param1.targetBuilding.x, param1.targetBuilding.y, param1.targetBuilding._footprint[0].width, param1.targetBuilding._footprint[0].height), param2);
        }
    }

    public onProcess(param1: any[], param2: BFOUNDATION = null, param3: int = 0, param4: boolean = false, param5: BFOUNDATION = null): void {
        as3.vget(this._solutions, this.solsProcessed).wayPoints = param1;
        as3.vget(this._solutions, this.solsProcessed).distanceToTarget = param1.length;
        this.solsProcessed = (this.solsProcessed + 1) >>> 0;
        if (this.solsProcessed < WMATTACK._attackResolution) {
            this.Process(as3.vget(this._solutions, this.solsProcessed), as3.bind(this, this.onProcess));
        } else {
            this.beginProcessB();
        }
    }

    public beginProcessB(): void {
        let _loc2_: Solution = null;
        let _loc3_: int = 0;
        let _loc1_: any[] = [].concat();
        for (_loc2_ of (this._solutions ?? [])) {
            this.ProcessB(_loc2_);
            _loc1_.push(_loc2_);
        }
        as3.sortOn(_loc1_, ["damageTaken", "distanceToTarget", "targetHP"], [Array.NUMERIC | Array.DESCENDING, Array.NUMERIC | Array.DESCENDING, Array.NUMERIC]);
        _loc3_ = ((_loc1_.length - 1) * this._intelligence) | 0;
        this.ProcessC(as3.cast(_loc1_[_loc3_], Solution));
        this._inProgress = false;
        WMATTACK.Queue(as3.cast(_loc1_[_loc3_], Solution));
    }

    public ProcessB(param1: Solution): void {
        let _loc2_: int = 0;
        if (param1.wayPoints) {
            _loc2_ = 0;
            while (_loc2_ < param1.wayPoints.length) {
                param1.damageTaken += WMATTACK._damageBias * this.processStepResolution * WMATTACK.dpsAtPoint(param1, as3.cast(param1.wayPoints[_loc2_], Point));
                _loc2_ += this.processStepResolution;
            }
        }
    }

    public ProcessC(param1: Solution): void {
        let _loc6_: number = NaN;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: number = NaN;
        let _loc14_: number = NaN;
        let _loc15_: number = NaN;
        let _loc28_: string = null;
        let _loc2_: any = {};
        let _loc3_: int = 0;
        while (_loc3_ < WMATTACK._monsterKeys.length) {
            _loc2_[WMATTACK._monsterKeys[_loc3_]] = 0;
            _loc3_ += 1;
        }
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc5_: number = 0;
        for (_loc7_ of (_loc4_ ?? [])) {
            _loc6_ = Number(_loc7_._class == "trap" || _loc7_._class == "wall" ? 0.15 : 1);
            _loc5_ += _loc6_ * WMATTACK._attackVolumeAmplifier;
        }
        _loc8_ = this._intelligence * 0.5 + 0.5;
        _loc5_ = (_loc5_ * _loc8_) | 0;
        _loc9_ = 2;
        _loc14_ = 0.25;
        _loc11_ = (_loc10_ = _loc5_ * _loc14_) / _loc9_;
        _loc13_ = _loc5_ - (_loc10_ + _loc11_);
        if ((_loc15_ = BASE.BaseLevel().level / 40) < 0) {
            _loc15_ = 0;
        }
        if (_loc15_ > 1) {
            _loc15_ = 1;
        }
        let _loc16_: string = String(WMATTACK._infernoAnything[((WMATTACK._infernoAnything.length - 1) * _loc15_) | 0]);
        // Indexed by their own lengths (the stock code used the overworld lists' lengths, which can run
        // past the end of these).
        let _loc17_: string = String(WMATTACK._infernoTanks[((WMATTACK._infernoTanks.length - 1) * _loc15_) | 0]);
        let _loc18_: string = String(WMATTACK._infernoDps[((WMATTACK._infernoDps.length - 1) * _loc15_) | 0]);
        let _loc19_: string = String(WMATTACK._infernoHunters[((WMATTACK._infernoHunters.length - 1) * _loc15_) | 0]);
        let _loc20_: number = 0;
        let _loc21_: any = {};
        let _loc22_: number = GLOBAL._mapWidth * 0.25;
        let _loc23_: number = 100;
        let _loc24_: number = NaN;
        if ((_loc24_ = Point.distance(param1.entryPoint, new Point(param1.targetBuilding.x, param1.targetBuilding.y))) < _loc23_) {
            _loc22_ += _loc23_ - _loc24_;
        }
        if (_loc10_ >= 1) {
            if (_loc20_ == 0) {
                _loc20_ = _loc22_ / CREATURELOCKER._creatures[_loc17_].props.speed[0];
            }
            _loc21_[_loc17_] = _loc20_ * CREATURELOCKER._creatures[_loc17_].props.speed[0];
        }
        if (_loc11_ >= 1) {
            if (_loc20_ == 0) {
                _loc20_ = _loc22_ / CREATURELOCKER._creatures[_loc18_].props.speed[0];
            }
            _loc21_[_loc18_] = _loc20_ * CREATURELOCKER._creatures[_loc18_].props.speed[0];
        }
        if (_loc12_ >= 1) {
            if (_loc20_ == 0) {
                _loc20_ = _loc22_ / CREATURELOCKER._creatures[_loc16_].props.speed[0];
            }
            _loc21_[_loc16_] = _loc20_ * CREATURELOCKER._creatures[_loc16_].props.speed[0];
        }
        if (_loc13_ >= 1) {
            if (_loc20_ == 0) {
                _loc20_ = _loc22_ / CREATURELOCKER._creatures[_loc19_].props.speed[0];
            }
            _loc21_[_loc19_] = _loc20_ * CREATURELOCKER._creatures[_loc19_].props.speed[0];
        }
        _loc2_[_loc17_] = _loc10_ | 0;
        if (_loc17_ == _loc18_) {
            _loc2_[_loc17_] += _loc11_ | 0;
        } else {
            _loc2_[_loc18_] = _loc11_ | 0;
        }
        if (_loc17_ == _loc19_) {
            _loc2_[_loc17_] += _loc13_ | 0;
        } else {
            _loc2_[_loc19_] = _loc13_ | 0;
        }
        let _loc25_: any = null;
        (_loc25_ = {})[_loc17_] = _loc10_ | 0;
        let _loc26_: any = null;
        (_loc26_ = {})[_loc18_] = _loc11_ | 0;
        let _loc27_: any = null;
        (_loc27_ = {})[_loc19_] = _loc13_ | 0;
        for (_loc28_ in _loc2_) {
            if (_loc2_[_loc28_] == 0) {
                delete _loc2_[_loc28_];
            }
        }
        param1.attack = _loc2_;
        param1.tanks = _loc25_;
        param1.dps = _loc26_;
        param1.anything = _loc27_;
        param1.distances = _loc21_;
        if (WMATTACK._ioPlan) {
            this.ioUsePlan(param1, _loc22_);
        }
    }

    /**
     * Inferno wild attack from the server config (WMATTACK._ioPlan): its monsters instead of the ones
     * worked out from the yard. They set off at distances that bring them in together, as above: the
     * slowest starts `reach` away, the others further out by their speed.
     */
    private ioUsePlan(param1: Solution, reach: number): void {
        let plan: any = WMATTACK._ioPlan;
        let attack: any = {};
        let distances: any = {};
        let id: string = null;
        let slowest: number = 0;
        let speed: number = NaN;
        for (id in plan.monsters) {
            if (CREATURELOCKER._creatures[id] && (plan.monsters[id] | 0) > 0) {
                attack[id] = plan.monsters[id] | 0;
                speed = this.ioSpeed(id, plan.level | 0);
                if (slowest == 0 || speed < slowest) {
                    slowest = speed;
                }
            }
        }
        for (id in attack) {
            distances[id] = reach / slowest * this.ioSpeed(id, plan.level | 0);
        }
        param1.attack = attack;
        param1.distances = distances;
        param1.tanks = {};
        param1.dps = {};
        param1.anything = attack;
    }

    private ioSpeed(id: string, level: int): number {
        let speeds: any[] = as3.as(CREATURELOCKER._creatures[id].props.speed, Array);
        let speed: number = Number(speeds[Math.max(0, Math.min(speeds.length - 1, level - 1))]);
        return Number(speed > 0 ? speed : 1);
    }
}
