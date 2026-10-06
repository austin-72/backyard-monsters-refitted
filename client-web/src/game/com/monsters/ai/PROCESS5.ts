import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BRESOURCE, BTOWER, BTRAP, BUILDING14, BUILDING6, BWALL, CREATURELOCKER, GLOBAL, GRID, IPROCESS, InstanceManager, PATHING, Solution, WMATTACK } from "@game";

export class PROCESS5 extends ASObject implements IPROCESS {
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
            if ((_loc3_ instanceof BRESOURCE || _loc3_ instanceof BUILDING6 || _loc3_ in BUILDING14) && _loc3_.health > 0 && !_loc3_._looted) {
                _loc4_ = GRID.FromISO(_loc3_.x, _loc3_.y);
                _loc6_ = Point.distance(param1.entryPoint, _loc4_);
                _loc5_.push({ "building": _loc3_, "distance": _loc6_ });
            }
        }
        if (_loc5_.length > 0) {
            as3.sortOn(_loc5_, "distance", Array.NUMERIC);
            param1.targetBuilding = _loc5_[0].building;
            if (param1.targetBuilding._type == 6 || param1.targetBuilding._type == 14) {
                param1.resourcesGained = 0.04 * BASE._resources.r1.Get();
            } else {
                param1.resourcesGained = 0.1 * param1.targetBuilding._stored.Get();
            }
            if (param1.resourcesGained > 10000) {
                param1.resourcesGained = 10000;
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
        as3.sortOn(_loc1_, ["damageTaken", "distanceToTarget", "resourcesGained"], [Array.NUMERIC | Array.DESCENDING, Array.NUMERIC | Array.DESCENDING, Array.NUMERIC]);
        _loc3_ = ((_loc1_.length - 1) * this._intelligence) | 0;
        this.ProcessC(as3.cast(_loc1_[_loc3_], Solution));
        this._inProgress = false;
        WMATTACK.Queue(as3.cast(_loc1_[_loc3_], Solution));
    }

    public ProcessB(param1: Solution): void {
        let _loc2_: int = 0;
        while (_loc2_ < param1.wayPoints.length) {
            param1.damageTaken += WMATTACK._damageBias * this.processStepResolution * WMATTACK.dpsAtPoint(param1, as3.cast(param1.wayPoints[_loc2_], Point));
            _loc2_ += this.processStepResolution;
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
        let _loc26_: string = null;
        let _loc2_: any = {};
        let _loc3_: int = 0;
        while (_loc3_ < WMATTACK._monsterKeys.length) {
            _loc2_[WMATTACK._monsterKeys[_loc3_]] = 0;
            _loc3_ += 1;
        }
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc5_: number = 0;
        for (_loc7_ of (_loc4_ ?? [])) {
            if (_loc7_._class == "special" || _loc7_ instanceof BTOWER || _loc7_ instanceof BTRAP || _loc7_ instanceof BWALL || _loc7_ instanceof BRESOURCE) {
                _loc6_ = _loc7_ instanceof BWALL || _loc7_ instanceof BTRAP ? 0.01 : 0.3;
                _loc5_ += _loc6_ * WMATTACK._attackVolumeAmplifier;
            }
        }
        _loc8_ = this._intelligence * 0.5 + 0.5;
        _loc5_ = (_loc5_ * _loc8_) | 0;
        _loc9_ = 0.3;
        _loc10_ = 0.2;
        if (param1.damageTaken > 0) {
            _loc11_ = _loc10_ * _loc5_;
            _loc13_ = (_loc12_ = (_loc5_ - _loc11_) / (_loc9_ + 1)) / _loc9_;
        } else {
            _loc11_ = 0;
            _loc12_ = 0;
            if ((_loc13_ = _loc5_) < 1) {
                _loc13_++;
            }
        }
        _loc11_ = Math.ceil(_loc11_);
        _loc12_ = Math.ceil(_loc12_);
        if ((_loc13_ = Math.ceil(_loc13_)) > 5) {
            _loc11_ += _loc13_ - 5;
            _loc13_ = 5;
        }
        let _loc14_: number = NaN;
        if ((_loc14_ = BASE.BaseLevel().level / 40) < 0) {
            _loc14_ = 0;
        }
        if (_loc14_ > 1) {
            _loc14_ = 1;
        }
        let _loc15_: string = String(WMATTACK._looters[((WMATTACK._looters.length - 2) * _loc14_) | 0]);
        let _loc16_: string = String(WMATTACK._tanks[((WMATTACK._tanks.length - 1) * _loc14_) | 0]);
        let _loc17_: string = String(WMATTACK._kamikaze[((WMATTACK._kamikaze.length - 1) * _loc14_) | 0]);
        let _loc18_: number = 0;
        let _loc19_: any = {};
        let _loc20_: number = GLOBAL._mapWidth * 0.25;
        let _loc21_: number = 100;
        let _loc22_: number = NaN;
        if ((_loc22_ = Point.distance(param1.entryPoint, new Point(param1.targetBuilding.x, param1.targetBuilding.y))) < _loc21_) {
            _loc20_ += _loc21_ - _loc22_;
        }
        if (_loc12_ >= 1) {
            if (_loc18_ == 0) {
                _loc18_ = _loc20_ / CREATURELOCKER._creatures[_loc16_].props.speed[0];
            }
            _loc19_[_loc16_] = _loc18_ * CREATURELOCKER._creatures[_loc16_].props.speed[0];
        }
        if (_loc13_ >= 1) {
            if (_loc18_ == 0) {
                _loc18_ = _loc20_ / CREATURELOCKER._creatures[_loc17_].props.speed[0];
            }
            _loc19_[_loc17_] = 40 + _loc18_ * CREATURELOCKER._creatures[_loc17_].props.speed[0];
        }
        if (_loc11_ >= 1) {
            if (_loc18_ == 0) {
                _loc18_ = _loc20_ / CREATURELOCKER._creatures[_loc15_].props.speed[0];
            }
            _loc19_[_loc15_] = 80 + _loc18_ * CREATURELOCKER._creatures[_loc15_].props.speed[0];
        }
        if (_loc16_ == "C12") {
            _loc12_ = Math.ceil(_loc12_ / 2);
        }
        _loc2_[_loc15_] = _loc11_ | 0;
        _loc2_[_loc16_] = _loc12_ | 0;
        _loc2_[_loc17_] = _loc13_ | 0;
        let _loc23_: any = null;
        (_loc23_ = {})[_loc16_] = _loc12_ | 0;
        let _loc24_: any = null;
        (_loc24_ = {})[_loc17_] = _loc13_ | 0;
        let _loc25_: any = null;
        (_loc25_ = {})[_loc15_] = _loc11_ | 0;
        for (_loc26_ in _loc2_) {
            if (_loc2_[_loc26_] == 0) {
                delete _loc2_[_loc26_];
            }
        }
        param1.attack = _loc2_;
        param1.looters = _loc25_;
        param1.tanks = _loc23_;
        param1.dps = _loc24_;
        param1.distances = _loc19_;
    }
}
