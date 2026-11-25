import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BASE, BaseTemplateNode, GLOBAL, IExportable } from "@game";

export class BaseTemplate extends ASObject implements IExportable {
    static {
        as3.implement(this, [IExportable]);
        as3.fields(this, { name: null, nodes: null, slot: 0, savedAt: 0, ioFrom: "" });
    }

    public name: string;
    public nodes: Vector<BaseTemplateNode>;
    public slot: uint;
    /** When it was last saved (seconds; 0: not known). Inferno-only: shown by its slot. */
    public savedAt: number;
    /**
     * Inferno-only (12 November): a shared outpost slot's outpost it was saved in (baseid; "": not known, or a main
     * yard slot). The outposts share 10 slots; one saved in another outpost is placed by kind of building
     * (BasePlanner.loadTemplateAtSlot), its building ids being that outpost's.
     */
    public ioFrom: string;

    /** Inferno-only: a shared outpost slot saved in an outpost other than the one being planned. */
    public get ioFromElsewhere(): boolean {
        return GLOBAL.INFERNO_ONLY && !!this.ioFrom && BASE.isOutpost && this.ioFrom != String(BASE._loadedBaseID);
    }

    public $ctor(param1: string = null, param2: Vector<BaseTemplateNode> = null): void {
        super.$ctor();
        this.name = !(!param1) ? param1 : "";
        this.ioFrom = "";
        if (param2) {
            this.nodes = param2;
        } else {
            this.nodes = new Vector<BaseTemplateNode>(0, false, BaseTemplateNode);
        }
    }

    public addNode(param1: BaseTemplateNode): void {
        this.nodes.push(param1);
    }

    public exportData(): any {
        let _loc1_: any = {};
        let _loc2_: int = 0;
        while (_loc2_ < this.nodes.length) {
            _loc1_[_loc2_] = as3.vget(this.nodes, _loc2_).exportData();
            _loc2_++;
        }
        return _loc1_;
    }

    public importData(param1: any): void {
        let _loc2_: any = null;
        let _loc3_: BaseTemplateNode = null;
        for (_loc2_ of as3.values(param1)) {
            if (!(as3.is(_loc2_, Number))) {
                _loc3_ = new BaseTemplateNode();
                _loc3_.importData(_loc2_);
                this.nodes.push(_loc3_);
            }
        }
    }

    public toString(): string {
        return this.name + "(" + this.slot + ")";
    }

    /**
     * Does the plan have a place for this building? param2, its kind: Inferno-only (7 October), a node for the same
     * id but another kind of building is a building that has gone (ids are given again after a reload), not this
     * one: this one isn't on the plan (it was left off it, and stood unseen in the yard while other buildings
     * were planned on top of it). (BASE.getPlannedBuilding.)
     */
    public getNodeFromBuildingID(param1: uint, param2: int = 0): boolean {
        let _loc3_: BaseTemplateNode = null;
        let _loc2_: int = 0;
        while (_loc2_ < this.nodes.length) {
            _loc3_ = as3.vget(this.nodes, _loc2_);
            if (_loc3_.id == param1 && (!GLOBAL.INFERNO_ONLY || param2 <= 0 || _loc3_.type <= 0 || (_loc3_.type | 0) == param2)) {
                return Boolean(_loc3_);
            }
            _loc2_++;
        }
        return false;
    }
}
