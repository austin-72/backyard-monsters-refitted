import * as as3 from "as3";
import { BezierPlugin, TweenLite } from "@game";

export class BezierThroughPlugin extends BezierPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "bezierThrough";
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (!(as3.is(param2, Array))) {
            return false;
        }
        this.init(param3, as3.as(param2, Array), true);
        return true;
    }
}
