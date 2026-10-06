import * as as3 from "as3";
import { ASObject } from "as3";
import { IPropertyModifier } from "@game";

export class DivisionModifier extends ASObject implements IPropertyModifier {
    static {
        as3.implement(this, [IPropertyModifier]);
        as3.fields(this, { divisor: NaN });
    }

    public divisor: number;

    public $ctor(param1?: number): void {
        super.$ctor();
        this.divisor = param1;
    }

    public modify(param1: number): number {
        return param1 / this.divisor;
    }
}
