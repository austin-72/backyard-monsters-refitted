import * as as3 from "as3";
import { int } from "as3";
import { BevelFilter } from "flash/filters";
import { FilterPlugin, TweenLite } from "@game";

export class BevelFilterPlugin extends FilterPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "bevelFilter";
        this.overwriteProps = ["bevelFilter"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._type = BevelFilter;
        this.initFilter(param2, new BevelFilter(0, 0, 16777215, 0.5, 0, 0.5, 2, 2, 0, param2.quality | 0 || 2));
        return true;
    }
}
