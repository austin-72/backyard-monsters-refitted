import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BaseTemplate, BaseTemplateNode, GLOBAL, GRID, InstanceManager, PlannerNode } from "@game";

export class PlannerTemplate extends ASObject {
    static {
        as3.fields(this, { slot: 0, name: null, inventoryData: null, displayData: null, _savableData: null });
    }

    public static readonly _DECORATION_ID: int = 1000000;
    public slot: uint;
    public name: string;
    public inventoryData: Vector<PlannerNode>;
    public displayData: Vector<PlannerNode>;
    private _savableData: BaseTemplate;

    public $ctor(param1: BaseTemplate = null): void {
        this.inventoryData = new Vector<PlannerNode>(0, false, PlannerNode);
        this.displayData = new Vector<PlannerNode>(0, false, PlannerNode);
        super.$ctor();
        if (param1) {
            this.importData(param1);
        }
    }

    public exportData(): BaseTemplate {
        let _loc4_: PlannerNode = null;
        let _loc1_: BaseTemplate = new BaseTemplate(this.name);
        let _loc2_: Vector<BaseTemplateNode> = new Vector<BaseTemplateNode>(0, false, BaseTemplateNode);
        let _loc3_: int = 0;
        while (_loc3_ < this.displayData.length) {
            _loc4_ = as3.vget(this.displayData, _loc3_);
            if (!BASE.isBuildingIgnoredInYardPlannerSave(_loc4_.building)) {
                _loc2_.push(new BaseTemplateNode(_loc4_.x | 0, _loc4_.y | 0, _loc4_.id >>> 0, _loc4_.type >>> 0));
            }
            _loc3_++;
        }
        _loc1_.nodes = _loc2_;
        _loc1_.slot = this.slot;
        return _loc1_;
    }

    public importData(param1: BaseTemplate): void {
        this._savableData = param1;
        this.name = this._savableData.name;
        this.slot = this._savableData.slot;
        this.getPlannerDataFromTemplate(param1);
    }

    private getPlannerDataFromTemplate(param1: BaseTemplate): void {
        let _loc6_: BaseTemplateNode = null;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: PlannerNode = null;
        let _loc9_: PlannerNode = null;
        let _loc10_: Point = null;
        let _loc11_: uint = 0;
        let _loc12_: boolean = false;
        let _loc13_: uint = 0;
        as3.vsetLength(this.displayData, 0);
        as3.vsetLength(this.inventoryData, 0);
        let _loc2_: Vector<BaseTemplateNode> = new Vector<BaseTemplateNode>(0, false, BaseTemplateNode);
        let _loc3_: int = 0;
        while (_loc3_ < param1.nodes.length) {
            _loc6_ = as3.vget(param1.nodes, _loc3_);
            _loc7_ = this.getBuildingFromNode(_loc6_);
            if (!_loc7_) {
                _loc2_.push(_loc6_);
            } else {
                _loc8_ = new PlannerNode(_loc7_, _loc6_.x, _loc6_.y);
                this.displayData.push(_loc8_);
            }
            _loc3_++;
        }
        let _loc4_: Vector<PlannerNode> = this.getNodesFromUnusedBuildings(param1);
        _loc3_ = 0;
        while (_loc3_ < _loc4_.length) {
            if ((_loc9_ = as3.vget(_loc4_, _loc3_)).category == "misc") {
                _loc10_ = GRID.FromISO(_loc9_.building.x, _loc9_.building.y);
                _loc9_.x = _loc10_.x;
                _loc9_.y = _loc10_.y;
                this.displayData.push(_loc9_);
            } else {
                this.inventoryData.push(_loc9_);
            }
            _loc3_++;
        }
        let _loc5_: Vector<PlannerNode> = this.getNodesFromStoredBuildings();
        _loc3_ = 0;
        while (_loc3_ < _loc5_.length) {
            _loc11_ = 0;
            _loc12_ = false;
            _loc13_ = _loc2_.length >>> 0;
            _loc11_ = 0;
            while (_loc11_ < _loc13_) {
                if (as3.vget(_loc5_, _loc3_).type == as3.vget(_loc2_, _loc11_).type) {
                    as3.vget(_loc5_, _loc3_).x = as3.vget(_loc2_, _loc11_).x;
                    as3.vget(_loc5_, _loc3_).y = as3.vget(_loc2_, _loc11_).y;
                    _loc2_.splice(_loc11_, 1);
                    _loc12_ = true;
                    break;
                }
                _loc11_++;
            }
            if (_loc12_) {
                this.displayData.push(as3.vget(_loc5_, _loc3_));
            } else {
                this.inventoryData.push(as3.vget(_loc5_, _loc3_));
            }
            _loc3_++;
        }
    }

    private getBuildingFromNode(param1: BaseTemplateNode): BFOUNDATION {
        return BASE.getBuildingByID(param1.id);
    }

    private getNodesFromUnusedBuildings(param1: BaseTemplate): Vector<PlannerNode> {
        let _loc4_: BFOUNDATION = null;
        let _loc2_: Vector<BFOUNDATION> = BASE.getYardPlannerBuildings();
        let _loc3_: Vector<PlannerNode> = new Vector<PlannerNode>(0, false, PlannerNode);
        for (_loc4_ of (_loc2_ ?? [])) {
            if (!param1.getNodeFromBuildingID(_loc4_._id >>> 0)) {
                _loc3_.push(new PlannerNode(_loc4_));
            }
        }
        return _loc3_;
    }

    private getNodesFromStoredBuildings(): Vector<PlannerNode> {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: any = null;
        let _loc9_: int = 0;
        let _loc10_: BFOUNDATION = null;
        let _loc1_: Vector<PlannerNode> = new Vector<PlannerNode>(0, false, PlannerNode);
        if (BASE._buildingsStored) {
            _loc2_ = 0;
            _loc3_ = BASE._buildingsStored;
            for (_loc4_ in BASE._buildingsStored) {
                if (_loc4_.charAt(1) != "l") {
                    _loc5_ = Number(_loc4_.substr(_loc4_.indexOf("b") + 1)) | 0;
                    _loc6_ = BASE._buildingsStored[_loc4_].Get() | 0;

                    if (GLOBAL._buildingProps[_loc5_ - 1] && GLOBAL._buildingProps[_loc5_ - 1].cls == null) {
                        continue;
                    }

                    _loc7_ = 0;
                    while (_loc7_ < _loc6_) {
                        (_loc8_ = {}).t = _loc5_;
                        _loc8_.x = 0;
                        _loc8_.y = 0;
                        _loc8_.id = PlannerTemplate._DECORATION_ID;
                        _loc9_ = 1;
                        if (BASE._buildingsStored["bl" + _loc5_]) {
                            _loc9_ = BASE._buildingsStored["bl" + _loc5_].Get() | 0;
                        }
                        _loc8_.l = _loc9_;
                        _loc10_ = new BFOUNDATION();
                        InstanceManager.removeInstance(_loc10_);
                        _loc10_._id = PlannerTemplate._DECORATION_ID;
                        _loc10_._type = _loc5_;
                        _loc10_._lvl.Set(_loc9_);
                        _loc10_._fortification.Set(0);
                        _loc10_._range = 0;
                        _loc1_.push(new PlannerNode(_loc10_));
                        _loc7_++;
                    }
                }
            }
        }
        return _loc1_;
    }
}
