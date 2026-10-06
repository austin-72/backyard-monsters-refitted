import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { popup_prefab } from "@game";

export class Kit extends ASObject {
    static {
        as3.fields(this, { build: null, resourceWorth: NaN, shinyWorth: 0 });
    }

    public build: any;
    public resourceWorth: number;
    public shinyWorth: uint;

    public $ctor(param1?: any): void {
        super.$ctor();
        this.build = param1;
        this.resourceWorth = popup_prefab.getResourceCostFromBuild(param1);
        this.shinyWorth = popup_prefab.getShinyWorthFromResources(this.resourceWorth);
    }
}
