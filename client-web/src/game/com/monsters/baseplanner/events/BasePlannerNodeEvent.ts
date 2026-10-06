import * as as3 from "as3";
import { Event } from "flash/events";
import { PlannerNode } from "@game";

export class BasePlannerNodeEvent extends Event {
    static {
        as3.fields(this, { _node: null });
    }

    private _node: PlannerNode;

    public $ctor(param1?: string, param2?: any /* PlannerNode */): void {
        this._node = param2;
        super.$ctor(param1);
    }

    public get node(): PlannerNode {
        return this._node;
    }
}
