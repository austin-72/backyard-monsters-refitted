import * as as3 from "as3";
import { TweenLite, TweenPlugin } from "@game";

export class ShortRotationPlugin extends TweenPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "shortRotation";
        this.overwriteProps = [];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        let _loc4_: string = null;
        if (typeof param2 == "number") {
            return false;
        }
        for (_loc4_ in param2) {
            this.initRotation(param1, _loc4_, Number(param1[_loc4_]), Number(param2[_loc4_]));
        }
        return true;
    }

    public initRotation(param1: any, param2: string, param3: number, param4: number): void {
        let _loc5_: number = (param4 - param3) % 360;
        if (_loc5_ != _loc5_ % 180) {
            _loc5_ = _loc5_ < 0 ? _loc5_ + 360 : _loc5_ - 360;
        }
        this.addTween(param1, param2, param3, param3 + _loc5_, param2);
        this.overwriteProps[this.overwriteProps.length] = param2;
    }
}
