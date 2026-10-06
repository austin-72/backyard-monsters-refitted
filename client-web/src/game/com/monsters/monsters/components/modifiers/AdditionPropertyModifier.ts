import * as as3 from "as3";
import { ASObject } from "as3";
import { IPropertyModifier } from "@game";

export class AdditionPropertyModifier extends ASObject implements IPropertyModifier {
    static {
        as3.implement(this, [IPropertyModifier]);
        as3.fields(this, { value: NaN });
    }

    public value: number;

    public $ctor(param1: number = 0): void {
        super.$ctor();
        this.value = param1;
    }

    public modify(param1: number): number {
        return param1 + this.value;
    }
}
