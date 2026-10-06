import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { pin_shadow, pushpins } from "@game";

export class PushPin extends ASObject {
    public static readonly GREEN: uint = 0;

    public static readonly YELLOW: uint = 1;

    public static readonly ORANGE: uint = 2;

    public static readonly RED: uint = 3;

    public static columnWidth: int = 21;

    public static columnHeight: int = 25;

    private static keys: any = {};

    private static pins: BitmapData = null;

    private static shadow: BitmapData = null;

    public static loaded: boolean = false;

    private static loads: uint = 0;

    private static isSetup: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        PushPin.keys = { "shadow": { "img": "maproom/pinshadow.png", "data": new pin_shadow(0, 0) }, "pins": { "img": "maproom/pushpin.png", "data": new pushpins(0, 0) } };
        PushPin.isSetup = true;
    }

    public static getRandomPinWithColor(param1: uint): Sprite {
        let _loc2_: Sprite = null;
        let _loc3_: Bitmap = null;
        let _loc4_: BitmapData = null;
        let _loc5_: uint = 0;
        if (!PushPin.isSetup) {
            PushPin.Setup();
        }
        _loc2_ = new Sprite();
        _loc3_ = new Bitmap(PushPin.keys.shadow.data);
        _loc2_.addChild(_loc3_);
        _loc4_ = new BitmapData(PushPin.columnWidth, PushPin.columnHeight, true);
        _loc5_ = (Math.random() * 5) >>> 0;
        _loc3_.x = 3 + Math.random() * 3;
        _loc3_.y = 3 + Math.random() * 3;
        _loc4_.copyPixels(as3.cast(PushPin.keys.pins.data, BitmapData), new Rectangle(PushPin.columnWidth * _loc5_, param1 * PushPin.columnHeight, PushPin.columnWidth, PushPin.columnHeight), new Point(0, 0));
        let _loc6_: Bitmap = new Bitmap(_loc4_);
        _loc2_.addChild(_loc6_);
        _loc2_.x = -8;
        return _loc2_;
    }
}
