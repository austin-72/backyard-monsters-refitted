import * as as3 from "as3";
import { ASObject } from "as3";

export class TweenInfo extends ASObject {
    static {
        as3.fields(this, { target: null, property: null, start: NaN, change: NaN, name: null, isPlugin: false });
    }

    public target: any;
    public property: string;
    public start: number;
    public change: number;
    public name: string;
    public isPlugin: boolean;

    public $ctor(param1?: any, param2?: string, param3?: number, param4?: number, param5?: string, param6?: boolean): void {
        super.$ctor();
        this.target = param1;
        this.property = param2;
        this.start = param3;
        this.change = param4;
        this.name = param5;
        this.isPlugin = param6;
    }
}
