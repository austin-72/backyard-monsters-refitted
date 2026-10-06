import * as as3 from "as3";
import { ASObject, uint } from "as3";

export class ArrayTweenInfo extends ASObject {
    static {
        as3.fields(this, { index: 0, start: NaN, change: NaN });
    }

    public index: uint;
    public start: number;
    public change: number;

    public $ctor(param1?: uint, param2?: number, param3?: number): void {
        super.$ctor();
        this.index = param1;
        this.start = param2;
        this.change = param3;
    }
}
