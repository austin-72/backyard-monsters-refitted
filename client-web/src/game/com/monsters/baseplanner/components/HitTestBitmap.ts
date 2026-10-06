import * as as3 from "as3";
import { ASObject } from "as3";
import { BitmapData, BlendMode, DisplayObject, IBitmapDrawable } from "flash/display";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";

export class HitTestBitmap extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static complexHitTestObject(param1: DisplayObject, param2: DisplayObject, param3: number = 1): boolean {
        return HitTestBitmap.complexIntersectionRectangle(param1, param2, param3).width != 0;
    }

    public static intersectionRectangle(param1: DisplayObject, param2: DisplayObject): Rectangle {
        if (!param1.root || !param2.root || !param1.hitTestObject(param2)) {
            return new Rectangle();
        }
        let _loc3_: Rectangle = param1.getBounds(param1.root);
        let _loc4_: Rectangle = param2.getBounds(param2.root);
        let _loc5_: Rectangle = null;
        (_loc5_ = new Rectangle()).x = Math.max(_loc3_.x, _loc4_.x);
        _loc5_.y = Math.max(_loc3_.y, _loc4_.y);
        _loc5_.width = Math.min(_loc3_.x + _loc3_.width - _loc5_.x, _loc4_.x + _loc4_.width - _loc5_.x);
        _loc5_.height = Math.min(_loc3_.y + _loc3_.height - _loc5_.y, _loc4_.y + _loc4_.height - _loc5_.y);
        return _loc5_;
    }

    public static complexIntersectionRectangle(param1: DisplayObject, param2: DisplayObject, param3: number = 1): Rectangle {
        if (param3 <= 0) {
            throw new Error("ArgumentError: Error #5001: Invalid value for accurracy", 5001);
        }
        if (!param1.hitTestObject(param2)) {
            return new Rectangle();
        }
        let _loc4_: Rectangle = null;
        if ((_loc4_ = HitTestBitmap.intersectionRectangle(param1, param2)).width * param3 < 1 || _loc4_.height * param3 < 1) {
            return new Rectangle();
        }
        let _loc5_: BitmapData = null;
        (_loc5_ = new BitmapData(_loc4_.width * param3, _loc4_.height * param3, false, 0)).draw(as3.cast(param1, IBitmapDrawable), HitTestBitmap.getDrawMatrix(param1, _loc4_, param3), new ColorTransform(1, 1, 1, 1, 255, -255, -255, 255));
        _loc5_.draw(as3.cast(param2, IBitmapDrawable), HitTestBitmap.getDrawMatrix(param2, _loc4_, param3), new ColorTransform(1, 1, 1, 1, 255, 255, 255, 255), BlendMode.DIFFERENCE);
        let _loc6_: Rectangle = _loc5_.getColorBoundsRect(4294967295, 4278255615);
        _loc5_.dispose();
        if (param3 != 1) {
            _loc6_.x /= param3;
            _loc6_.y /= param3;
            _loc6_.width /= param3;
            _loc6_.height /= param3;
        }
        _loc6_.x += _loc4_.x;
        _loc6_.y += _loc4_.y;
        return _loc6_;
    }

    protected static getDrawMatrix(param1: DisplayObject, param2: Rectangle, param3: number): Matrix {
        let _loc4_: Point = null;
        let _loc5_: Matrix = null;
        let _loc6_: Matrix = param1.root.transform.concatenatedMatrix;
        _loc4_ = param1.localToGlobal(new Point());
        (_loc5_ = param1.transform.concatenatedMatrix).tx = _loc4_.x - param2.x;
        _loc5_.ty = _loc4_.y - param2.y;
        _loc5_.a /= _loc6_.a;
        _loc5_.d /= _loc6_.d;
        if (param3 != 1) {
            _loc5_.scale(param3, param3);
        }
        return _loc5_;
    }
}
