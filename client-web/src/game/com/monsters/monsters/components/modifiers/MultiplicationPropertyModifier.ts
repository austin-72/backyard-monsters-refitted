import * as as3 from "as3";
import { ASObject } from "as3";
import { IPropertyModifier } from "@game";

export class MultiplicationPropertyModifier extends ASObject implements IPropertyModifier {
    static {
        as3.implement(this, [IPropertyModifier]);
        as3.fields(this, { multiple: NaN });
    }

    public multiple: number;

    public $ctor(param1?: number): void {
        super.$ctor();
        this.multiple = param1;
    }

    public modify(param1: number): number {
        return param1 * this.multiple;
    }
}
