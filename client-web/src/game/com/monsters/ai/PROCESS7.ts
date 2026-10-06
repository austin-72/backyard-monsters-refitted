import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BRESOURCE, BUILDING14, BUILDING6, CREATURELOCKER, GLOBAL, GRID, IPROCESS, InstanceManager, PATHING, Solution, WMATTACK } from "@game";

export class PROCESS7 extends ASObject implements IPROCESS {
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
            if (_loc3_.health > 0 && !_loc3_._looted && (_loc3_ instanceof BRESOURCE || _loc3_ instanceof BUILDING6 || _loc3_ instanceof BUILDING14)) {
                _loc4_ = GRID.FromISO(_loc3_.x, _loc3_.y);
                _loc6_ = Point.distance(param1.entryPoint, _loc4_);
                _loc5_.push({ "building": _loc3_, "distance": _loc6_ });
            }
        }
        if (_loc5_.length > 0) {
            as3.sortOn(_loc5_, "distance", Array.NUMERIC);
            param1.targetBuilding = _loc5_[0].building;
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
        as3.sortOn(_loc1_, ["damageTaken", "distanceToTarget"], [Array.NUMERIC | Array.DESCENDING, Array.NUMERIC | Array.DESCENDING]);
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
        let _loc21_: string = null;
        let _loc22_: number = NaN;
        let _loc2_: any = {};
        let _loc3_: int = 0;
        while (_loc3_ < WMATTACK._monsterKeys.length) {
            _loc2_[WMATTACK._monsterKeys[_loc3_]] = 0;
            _loc3_ += 1;
        }
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc5_: number = 0;
        for (_loc7_ of (_loc4_ ?? [])) {
            if (_loc7_._class == "special" || _loc7_._class == "tower" || _loc7_._class == "trap" || _loc7_._class == "wall" || _loc7_._class == "resource") {
                _loc6_ = Number(_loc7_._class == "trap" || _loc7_._class == "wall" ? 0.15 : 1);
                _loc5_ += _loc6_ * WMATTACK._attackVolumeAmplifier;
            }
        }
        _loc8_ = this._intelligence * 0.5 + 0.5;
        _loc5_ = (_loc5_ * _loc8_) | 0;
        if (param1.damageTaken > 0) {
            if ((_loc22_ = param1.resourcesGained / (param1.damageTaken + param1.resourcesGained)) < 0.5) {
                _loc22_ = 0.5;
            }
            _loc9_ = _loc22_ * _loc5_;
            _loc10_ = _loc5_ - _loc9_;
        } else {
            _loc9_ = _loc5_;
            _loc10_ = 0;
        }
        let _loc11_: number = NaN;
        if ((_loc11_ = BASE.BaseLevel().level / 40) < 0) {
            _loc11_ = 0;
        }
        if (_loc11_ > 1) {
            _loc11_ = 1;
        }
        let _loc12_: string = String(WMATTACK._looters[(((WMATTACK._looters.length - 2) * _loc11_) | 0) + 1]);
        let _loc13_: string = String(WMATTACK._tanks[((WMATTACK._tanks.length - 1) * _loc11_) | 0]);
        let _loc14_: number = 0;
        let _loc15_: any = {};
        let _loc16_: number = GLOBAL._mapWidth * 0.25;
        let _loc17_: number = 100;
        let _loc18_: number = NaN;
        if ((_loc18_ = Point.distance(param1.entryPoint, new Point(param1.targetBuilding.x, param1.targetBuilding.y))) < _loc17_) {
            _loc16_ += _loc17_ - _loc18_;
        }
        if (_loc10_ >= 1) {
            if (_loc14_ == 0) {
                _loc14_ = _loc16_ / CREATURELOCKER._creatures[_loc13_].props.speed[0];
            }
            _loc15_[_loc13_] = _loc14_ * CREATURELOCKER._creatures[_loc13_].props.speed[0];
        }
        if (_loc9_ >= 1) {
            if (_loc14_ == 0) {
                _loc14_ = _loc16_ / CREATURELOCKER._creatures[_loc12_].props.speed[0];
            }
            _loc15_[_loc12_] = _loc14_ * CREATURELOCKER._creatures[_loc12_].props.speed[0];
        }
        if (_loc13_ == "C12") {
            _loc10_ = Math.ceil(_loc10_ / 2);
        }
        if (_loc12_ == "C14") {
            _loc9_ = Math.ceil(_loc9_ / 2.5);
        }
        _loc2_[_loc12_] = _loc9_ | 0;
        _loc2_[_loc13_] = _loc10_ | 0;
        let _loc19_: any = null;
        (_loc19_ = {})[_loc13_] = _loc10_ | 0;
        let _loc20_: any = null;
        (_loc20_ = {})[_loc12_] = _loc9_ | 0;
        for (_loc21_ in _loc2_) {
            if (_loc2_[_loc21_] == 0) {
                delete _loc2_[_loc21_];
            }
        }
        param1.attack = _loc2_;
        param1.distances = _loc15_;
    }
}
