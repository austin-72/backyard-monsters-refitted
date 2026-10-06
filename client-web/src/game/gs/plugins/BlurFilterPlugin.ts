import * as as3 from "as3";
import { int } from "as3";
import { BlurFilter } from "flash/filters";
import { FilterPlugin, TweenLite } from "@game";

export class BlurFilterPlugin extends FilterPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "blurFilter";
        this.overwriteProps = ["blurFilter"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._type = BlurFilter;
        this.initFilter(param2, new BlurFilter(0, 0, param2.quality | 0 || 2));
        return true;
    }
}
