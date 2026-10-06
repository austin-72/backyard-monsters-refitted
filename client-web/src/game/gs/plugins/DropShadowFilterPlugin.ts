import * as as3 from "as3";
import { int } from "as3";
import { DropShadowFilter } from "flash/filters";
import { FilterPlugin, TweenLite } from "@game";

export class DropShadowFilterPlugin extends FilterPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "dropShadowFilter";
        this.overwriteProps = ["dropShadowFilter"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._type = DropShadowFilter;
        this.initFilter(param2, new DropShadowFilter(0, 45, 0, 0, 0, 0, 1, param2.quality | 0 || 2, param2.inner, param2.knockout, param2.hideObject));
        return true;
    }
}
