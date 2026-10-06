import * as as3 from "as3";
import { int, uint } from "as3";
import { CapsStyle, Shape, Sprite } from "flash/display";
import { Point } from "flash/geom";

export class DashedLine extends Sprite {
    static {
        as3.fields(this, { lengthsArray: null, lineColor: 0, lineWeight: NaN, lineAlpha: 1, curX: 0, curY: 0, remainingDist: 0, curIndex: 0, arraySum: 0, startIndex: 0, fill: null, stroke: null });
    }

    private lengthsArray: any[];
    private lineColor: uint;
    private lineWeight: number;
    private lineAlpha: number;
    private curX: number;
    private curY: number;
    private remainingDist: number;
    private curIndex: int;
    private arraySum: number;
    private startIndex: int;
    private fill: Shape;
    private stroke: Shape;

    public $ctor(param1: number = 0, param2: number = 0, param3: any[] = null): void {
        this.lengthsArray = new Array();
        this.fill = new Shape();
        this.stroke = new Shape();
        super.$ctor();
        if (param3 != null) {
            this.lengthsArray = param3;
        } else {
            this.lengthsArray = [5, 5];
        }
        if (this.lengthsArray.length % 2 != 0) {
            param3.push(5);
        }
        let _loc4_: int = 0;
        while (_loc4_ < param3.length) {
            this.arraySum = Number(this.arraySum + param3[_loc4_]);
            _loc4_++;
        }
        this.lineWeight = param1;
        this.lineColor = param2 >>> 0;
        this.stroke.graphics.lineStyle(this.lineWeight, this.lineColor, this.lineAlpha, false, "none", CapsStyle.NONE);
        this.addChild(this.fill);
        this.addChild(this.stroke);
    }

    public moveTo(param1: number, param2: number): void {
        this.stroke.graphics.moveTo(param1, param2);
        this.fill.graphics.moveTo(param1, param2);
        this.curX = param1;
        this.curY = param2;
        this.remainingDist = 0;
        this.startIndex = 0;
    }

    public lineTo(param1: number, param2: number): void {
        let _loc8_: int = 0;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc3_: number = (param2 - this.curY) / (param1 - this.curX);
        let _loc4_: number = this.curX;
        let _loc5_: number = this.curY;
        let _loc6_: int = param1 < _loc4_ ? -1 : 1;
        let _loc7_: int = param2 < _loc5_ ? -1 : 1;
        loop0:
        while (Math.abs(_loc4_ - this.curX) < Math.abs(_loc4_ - param1) || Math.abs(_loc5_ - this.curY) < Math.abs(_loc5_ - param2)) {
            _loc8_ = this.startIndex;
            while (_loc8_ < this.lengthsArray.length) {
                _loc9_ = this.remainingDist == 0 ? Number(this.lengthsArray[_loc8_]) : this.remainingDist;
                _loc10_ = this.getCoords(_loc9_, _loc3_).x * _loc6_;
                _loc11_ = this.getCoords(_loc9_, _loc3_).y * _loc7_;
                if (!(Math.abs(_loc4_ - this.curX) + Math.abs(_loc10_) < Math.abs(_loc4_ - param1) || Math.abs(_loc5_ - this.curY) + Math.abs(_loc11_) < Math.abs(_loc5_ - param2))) {
                    this.remainingDist = this.getDistance(this.curX, this.curY, param1, param2);
                    this.curIndex = _loc8_;
                    break loop0;
                }
                if (_loc8_ % 2 == 0) {
                    this.stroke.graphics.lineTo(this.curX + _loc10_, this.curY + _loc11_);
                } else {
                    this.stroke.graphics.moveTo(this.curX + _loc10_, this.curY + _loc11_);
                }
                this.curX += _loc10_;
                this.curY += _loc11_;
                this.curIndex = _loc8_;
                this.startIndex = 0;
                this.remainingDist = 0;
                _loc8_++;
            }
        }
        this.startIndex = this.curIndex;
        if (this.remainingDist != 0) {
            if (this.curIndex % 2 == 0) {
                this.stroke.graphics.lineTo(param1, param2);
            } else {
                this.stroke.graphics.moveTo(param1, param2);
            }
            this.remainingDist = this.lengthsArray[this.curIndex] - this.remainingDist;
        } else if (this.startIndex == this.lengthsArray.length - 1) {
            this.startIndex = 0;
        } else {
            ++this.startIndex;
        }
        this.curX = param1;
        this.curY = param2;
        this.fill.graphics.lineTo(param1, param2);
    }

    private getCoords(param1: number, param2: number): Point {
        let _loc3_: number = Math.atan(param2);
        let _loc4_: number = Math.abs(Math.sin(_loc3_) * param1);
        let _loc5_: number = Math.abs(Math.cos(_loc3_) * param1);
        return new Point(_loc5_, _loc4_);
    }

    private getDistance(param1: number, param2: number, param3: number, param4: number): number {
        return Math.sqrt(Math.pow(param3 - param1, 2) + Math.pow(param4 - param2, 2));
    }

    public clear(): void {
        this.stroke.graphics.clear();
        this.stroke.graphics.lineStyle(this.lineWeight, this.lineColor, this.lineAlpha, false, "none", CapsStyle.NONE);
        this.fill.graphics.clear();
        this.moveTo(0, 0);
    }

    public lineStyle(param1: number = 0, param2: number = 0, param3: number = 1): void {
        this.lineWeight = param1;
        this.lineColor = param2 >>> 0;
        this.lineAlpha = param3;
        this.stroke.graphics.lineStyle(this.lineWeight, this.lineColor, this.lineAlpha, false, "none", CapsStyle.NONE);
    }

    public beginFill(param1: number, param2: number = 1): void {
        this.fill.graphics.beginFill(param1 >>> 0, param2);
    }

    public endFill(): void {
        this.fill.graphics.endFill();
    }
}
