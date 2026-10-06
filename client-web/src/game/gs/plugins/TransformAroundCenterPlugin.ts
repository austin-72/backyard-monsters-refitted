import * as as3 from "as3";
import { DisplayObject, Sprite } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { TransformAroundPointPlugin, TweenLite } from "@game";

export class TransformAroundCenterPlugin extends TransformAroundPointPlugin {
    public static readonly VERSION: number = 1.02;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "transformAroundCenter";
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        let _loc6_: Sprite = null;
        let _loc4_: boolean = false;
        if (param1.parent == null) {
            _loc4_ = true;
            (_loc6_ = new Sprite()).addChild(as3.as(param1, DisplayObject));
        }
        let _loc5_: Rectangle = as3.cast(param1.getBounds(param1.parent), Rectangle);
        param2.point = new Point(_loc5_.x + _loc5_.width / 2, _loc5_.y + _loc5_.height / 2);
        if (_loc4_) {
            param1.parent.removeChild(param1);
        }
        return super.onInitTween(param1, param2, param3);
    }
}
