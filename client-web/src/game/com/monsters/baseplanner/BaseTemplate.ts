import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BaseTemplateNode, IExportable } from "@game";

export class BaseTemplate extends ASObject implements IExportable {
    static {
        as3.implement(this, [IExportable]);
        as3.fields(this, { name: null, nodes: null, slot: 0 });
    }

    public name: string;
    public nodes: Vector<BaseTemplateNode>;
    public slot: uint;

    public $ctor(param1: string = null, param2: Vector<BaseTemplateNode> = null): void {
        super.$ctor();
        this.name = !(!param1) ? param1 : "";
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

    public getNodeFromBuildingID(param1: uint): boolean {
        let _loc3_: BaseTemplateNode = null;
        let _loc2_: int = 0;
        while (_loc2_ < this.nodes.length) {
            _loc3_ = as3.vget(this.nodes, _loc2_);
            if (_loc3_.id == param1) {
                return Boolean(_loc3_);
            }
            _loc2_++;
        }
        return false;
    }
}
