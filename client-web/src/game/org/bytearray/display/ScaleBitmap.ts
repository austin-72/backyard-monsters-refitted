import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Matrix, Rectangle } from "flash/geom";

export class ScaleBitmap extends Bitmap {
    static {
        as3.fields(this, { _originalBitmap: null, _scale9Grid: null });
    }

    protected _originalBitmap: BitmapData;
    protected _scale9Grid: Rectangle;

    public $ctor(param1: BitmapData = null, param2: string = "auto", param3: boolean = false): void {
        super.$ctor(param1, param2, param3);
        this._originalBitmap = param1.clone();
    }

    public override set bitmapData(param1: BitmapData) {
        this._originalBitmap = param1.clone();
        if (this._scale9Grid != null) {
            if (!this.validGrid(this._scale9Grid)) {
                this._scale9Grid = null;
            }
            this.setSize(param1.width, param1.height);
        } else {
            this.assignBitmapData(this._originalBitmap.clone());
        }
    }

    public override set width(param1: number) {
        if (param1 != this.width) {
            this.setSize(param1, this.height);
        }
    }

    public override set height(param1: number) {
        if (param1 != this.height) {
            this.setSize(this.width, param1);
        }
    }

    public override set scale9Grid(param1: Rectangle) {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        if (this._scale9Grid == null && param1 != null || this._scale9Grid != null && !this._scale9Grid.equals(param1)) {
            if (param1 == null) {
                _loc2_ = this.width;
                _loc3_ = this.height;
                this._scale9Grid = null;
                this.assignBitmapData(this._originalBitmap.clone());
                this.setSize(_loc2_, _loc3_);
            } else {
                if (!this.validGrid(param1)) {
                    throw new Error("#001 - The _scale9Grid does not match the original BitmapData");
                }
                this._scale9Grid = param1.clone();
                this.resizeBitmap(this.width, this.height);
                this.scaleX = 1;
                this.scaleY = 1;
            }
        }
    }

    private assignBitmapData(param1: BitmapData): void {
        super.bitmapData.dispose();
        super.bitmapData = param1;
    }

    private validGrid(param1: Rectangle): boolean {
        return param1.right <= this._originalBitmap.width && param1.bottom <= this._originalBitmap.height;
    }

    public override get scale9Grid(): Rectangle {
        return this._scale9Grid;
    }

    public setSize(param1: number, param2: number): void {
        if (this._scale9Grid == null) {
            super.width = param1;
            super.height = param2;
        } else {
            param1 = Math.max(param1, this._originalBitmap.width - this._scale9Grid.width);
            param2 = Math.max(param2, this._originalBitmap.height - this._scale9Grid.height);
            this.resizeBitmap(param1, param2);
        }
    }

    public getOriginalBitmapData(): BitmapData {
        return this._originalBitmap;
    }

    protected resizeBitmap(param1: number, param2: number): void {
        let _loc8_: Rectangle = null;
        let _loc9_: Rectangle = null;
        let _loc12_: int = 0;
        let _loc3_: BitmapData = new BitmapData(param1, param2, true, 0);
        let _loc4_: any[] = [0, this._scale9Grid.top, this._scale9Grid.bottom, this._originalBitmap.height];
        let _loc5_: any[] = [0, this._scale9Grid.left, this._scale9Grid.right, this._originalBitmap.width];
        let _loc6_: any[] = [0, this._scale9Grid.top, param2 - (this._originalBitmap.height - this._scale9Grid.bottom), param2];
        let _loc7_: any[] = [0, this._scale9Grid.left, param1 - (this._originalBitmap.width - this._scale9Grid.right), param1];
        let _loc10_: Matrix = new Matrix();
        let _loc11_: int = 0;
        while (_loc11_ < 3) {
            _loc12_ = 0;
            while (_loc12_ < 3) {
                _loc8_ = new Rectangle(_loc5_[_loc11_], _loc4_[_loc12_], _loc5_[_loc11_ + 1] - _loc5_[_loc11_], _loc4_[_loc12_ + 1] - _loc4_[_loc12_]);
                _loc9_ = new Rectangle(_loc7_[_loc11_], _loc6_[_loc12_], _loc7_[_loc11_ + 1] - _loc7_[_loc11_], _loc6_[_loc12_ + 1] - _loc6_[_loc12_]);
                _loc10_.identity();
                _loc10_.a = _loc9_.width / _loc8_.width;
                _loc10_.d = _loc9_.height / _loc8_.height;
                _loc10_.tx = _loc9_.x - _loc8_.x * _loc10_.a;
                _loc10_.ty = _loc9_.y - _loc8_.y * _loc10_.d;
                _loc3_.draw(as3.cast(this._originalBitmap, IBitmapDrawable), _loc10_, null, null, _loc9_, this.smoothing);
                _loc12_++;
            }
            _loc11_++;
        }
        this.assignBitmapData(_loc3_);
    }

    public override get bitmapData(): BitmapData {
        return super.bitmapData;
    }

    public override get width(): number {
        return super.width;
    }

    public override get height(): number {
        return super.height;
    }
}
