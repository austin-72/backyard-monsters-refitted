import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { BlurFilter, ColorMatrixFilter } from "flash/filters";
import { ColorTransform, Matrix, Point } from "flash/geom";
import { ColorMatrix, GLOBAL, POPUPS, screenshot_border1, screenshot_border2, screenshot_border3, screenshot_ui } from "@game";

export class screenshot extends ASObject {
    public static _rawImage: BitmapData = null;

    public static _processedImage: BitmapData = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Take(param1: number, param2: number): void {
        screenshot._rawImage = new BitmapData(700, 460, false, 0);
        let _loc3_: Matrix = new Matrix();
        _loc3_.translate(param1, param2);
        screenshot._rawImage.draw(as3.cast(GLOBAL._layerMap, IBitmapDrawable), _loc3_, null, null, screenshot._rawImage.rect, true);
    }

    public static Process(param1: int = 0, param2: int = 0, param3: int = 0, param4: int = 0, param5: int = 0, param6: int = 0): void {
        let _loc7_: ColorMatrix = null;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: BitmapData = null;
        let _loc11_: Matrix = null;
        let _loc12_: Sprite = null;
        let _loc13_: BitmapData = null;
        let _loc14_: BitmapData = null;
        let _loc15_: ColorTransform = null;
        screenshot._processedImage = screenshot._rawImage.clone();
        if (param1 != 0) {
            (_loc7_ = new ColorMatrix()).adjustBrightness(param1);
            screenshot._processedImage.applyFilter(screenshot._processedImage, screenshot._processedImage.rect, screenshot._processedImage.rect.topLeft, new ColorMatrixFilter(_loc7_));
        }
        if (param2 != 0) {
            (_loc7_ = new ColorMatrix()).adjustContrast(param2);
            screenshot._processedImage.applyFilter(screenshot._processedImage, screenshot._processedImage.rect, screenshot._processedImage.rect.topLeft, new ColorMatrixFilter(_loc7_));
        }
        if (param3 != 0) {
            (_loc7_ = new ColorMatrix()).adjustSaturation(param3);
            screenshot._processedImage.applyFilter(screenshot._processedImage, screenshot._processedImage.rect, screenshot._processedImage.rect.topLeft, new ColorMatrixFilter(_loc7_));
        }
        if (param4) {
            _loc8_ = 100 - param4 + 30;
            _loc9_ = 50 + (100 - param4 + 30) / 2;
            _loc10_ = screenshot._processedImage.clone();
            _loc10_.applyFilter(_loc10_, _loc10_.rect, _loc10_.rect.topLeft, new BlurFilter(3, 3, 3));
            (_loc11_ = new Matrix()).createGradientBox(_loc10_.width, _loc10_.height * (_loc8_ / 100), 90 / (180 / Math.PI), 0, _loc10_.height * ((_loc9_ - _loc8_) / 100));
            (_loc12_ = new Sprite()).graphics.beginGradientFill("linear", new Array(16777215, 16777215, 16777215, 16777215), new Array(0, 1, 1, 0), new Array(0, 85, 170, 255), _loc11_);
            _loc12_.graphics.drawRect(0, 0, _loc10_.width, _loc10_.height);
            (_loc13_ = new BitmapData(_loc10_.width, _loc10_.height, true, 16777215)).draw(as3.cast(_loc12_, IBitmapDrawable));
            _loc10_.copyPixels(screenshot._processedImage, screenshot._processedImage.rect, screenshot._processedImage.rect.topLeft, _loc13_, _loc13_.rect.topLeft, true);
            screenshot._processedImage = _loc10_;
        }
        if (param5 > 0) {
            (_loc14_ = screenshot._rawImage.clone()).noise(1, 0, 255, 7, true);
            _loc15_ = new ColorTransform(1, 1, 1, param5 * 10 / 100);
            screenshot._processedImage.draw(as3.cast(_loc14_, IBitmapDrawable), null, _loc15_, "multiply");
            _loc15_ = new ColorTransform(1, 1, 1, param5 * 5 / 100);
            screenshot._processedImage.draw(as3.cast(_loc14_, IBitmapDrawable), null, _loc15_, "screen");
        }
        if (param6) {
            if (param6 == 1) {
                screenshot._processedImage.copyPixels(new screenshot_border1(0, 0), screenshot._processedImage.rect, new Point(0, 0));
            }
            if (param6 == 2) {
                screenshot._processedImage.copyPixels(new screenshot_border2(0, 0), screenshot._processedImage.rect, new Point(0, 0));
            }
            if (param6 == 3) {
                screenshot._processedImage.copyPixels(new screenshot_border3(0, 0), screenshot._processedImage.rect, new Point(0, 0));
            }
        }
    }

    public static Show(): void {
        screenshot.Take(-20, -20);
        POPUPS.Push(new screenshot_ui());
    }
}
