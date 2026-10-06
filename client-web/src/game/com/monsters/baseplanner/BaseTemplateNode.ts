import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { IExportable } from "@game";

export class BaseTemplateNode extends ASObject implements IExportable {
    static {
        as3.implement(this, [IExportable]);
        as3.fields(this, { x: 0, y: 0, id: 0, type: 0 });
    }

    public x: int;
    public y: int;
    public id: uint;
    public type: uint;

    public $ctor(param1: int = 0, param2: int = 0, param3: uint = 0, param4: uint = 0): void {
        super.$ctor();
        this.x = param1;
        this.y = param2;
        this.id = param3;
        this.type = param4;
    }

    public exportData(): any {
        return { "x": this.x, "y": this.y, "id": this.id, "type": this.type };
    }

    public importData(param1: any): void {
        this.x = param1.x | 0;
        this.y = param1.y | 0;
        this.id = param1.id >>> 0;
        this.type = param1.type >>> 0;
    }
}
