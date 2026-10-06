import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { GLOBAL, ImageCache, ImageText, KEYS, ScaleBitmap, button_alert } from "@game";

export class StoneButton extends Sprite {
    static {
        as3.fields(this, { _enabled: true, _bmd: null, _bm: null, label: null, size: 0, _alert: "", _multiline: false, spinnerInset: 7, alertMC: null, _tgtWidth: 0, margin: 12 });
    }

    public static _bgKeys: any[] = [{ "key": "ui/stone1.png", "width": 54, "height": 36 }, { "key": "ui/stone2.png", "width": 59, "height": 36 }, { "key": "ui/stone3.png", "width": 79, "height": 36 }];

    public static _bgKeysInferno: any[] = [{ "key": "ui/lava1.png", "width": 81, "height": 37 }, { "key": "ui/lava2.png", "width": 61, "height": 37 }, { "key": "ui/lava3.png", "width": 53, "height": 37 }];
    public _enabled: boolean;
    public _bmd: BitmapData;
    public _bm: Bitmap;
    public label: string;
    public size: int;
    public _alert: string;
    private _multiline: boolean;
    public spinnerInset: int;
    public alertMC: button_alert;
    private _tgtWidth: int;
    public margin: int;

    public $ctor(): void {
        super.$ctor();
    }

    public getButtonWidth(): int {
        return this._tgtWidth;
    }

    public getButtonHeight(): int {
        let _loc1_: int = 0;
        if (this._bm) {
            _loc1_ = this._bm.height | 0;
        }
        return _loc1_;
    }

    public set Multiline(param1: boolean) {
        if (param1 != this._multiline) {
            this._multiline = param1;
            if (Boolean(this.label) && Boolean(this.size)) {
                this.Setup(this.label, this.size);
            }
        }
    }

    public get Multiline(): boolean {
        return this._multiline;
    }

    public set Enabled(param1: boolean) {
        if (param1 != this._enabled) {
            this._enabled = param1;
            this.Clear();
            if (Boolean(this.label) && Boolean(this.size)) {
                this.Setup(this.label, this.size);
            }
        }
    }

    public get Enabled(): boolean {
        return this._enabled;
    }

    public set Alert(param1: string) {
        if (param1 != "" && param1 != "0") {
            this._alert = param1;
            if (!this.alertMC) {
                this.alertMC = new button_alert();
                this.addChild(this.alertMC);
                this.alertMC.mouseChildren = false;
            } else {
                this.setChildIndex(this.alertMC, (this.numChildren - 1) | 0);
            }
            this.alertMC.x = this.getButtonWidth() - this.spinnerInset;
            this.alertMC.y = this.spinnerInset;
            this.alertMC.mcCounter.t.htmlText = param1;
        } else if (this.alertMC) {
            this.removeChild(this.alertMC);
            this.alertMC = null;
            this._alert = "";
        }
    }

    public get Alert(): string {
        return this._alert;
    }

    public Clear(): void {
        if (Boolean(this._bmd) && Boolean(this._bm)) {
            if (this._bm.parent) {
                this.removeChild(this._bm);
            }
            this._bmd.dispose();
        }
    }

    public SetupKey(param1: string, param2: int = 12): void {
        this.Setup(KEYS.Get(param1), param2);
    }

    public Setup(param1: string, param2: int = 12): void {
        let tx: BitmapData = null;
        let tgt: int = 0;
        let tgtDiff: int = 0;
        let imgArray: any[] = null;
        let i: int = 0;
        tx = null;
        let cbf: Function = null;
        let ct: ColorTransform = null;
        let nd: int = 0;
        let str: string = param1;
        let sz: int = param2;
        cbf = (param1: string, param2: BitmapData): void => {
            let _loc3_: BitmapData = new BitmapData(param2.width, param2.height, true, 0);
            _loc3_.copyPixels(param2, new Rectangle(0, 0, param2.width, param2.height), new Point(0, 0));
            let _loc4_: number = this._tgtWidth / _loc3_.width;
            let _loc5_: ScaleBitmap = null;
            (_loc5_ = new ScaleBitmap(_loc3_)).scale9Grid = new Rectangle(10, 10, 10, 10);
            _loc5_.setSize(this._tgtWidth, 36);
            this._bmd = new BitmapData(_loc5_.width, _loc5_.height, true, 0);
            this._bmd.draw(as3.cast(_loc5_, IBitmapDrawable));
            let _loc6_: Matrix = null;
            (_loc6_ = new Matrix()).translate(this.margin, 2 + ((_loc5_.height * 0.5 - tx.height * 0.5) | 0));
            this._bmd.draw(as3.cast(tx, IBitmapDrawable), _loc6_);
            this._bm = new Bitmap(this._bmd);
            this.addChild(this._bm);
        };
        this.Clear();
        this.label = str;
        this.size = sz;
        if (this._enabled) {
            this.buttonMode = true;
            this.useHandCursor = true;
            if (this.alertMC) {
                this.alertMC.buttonMode = true;
                this.alertMC.useHandCursor = true;
            }
        } else {
            this.buttonMode = false;
            this.useHandCursor = false;
        }
        tx = ImageText.Get(str, sz);
        if (!this._enabled) {
            ct = new ColorTransform(1, 1, 1, 0.5);
            tx.colorTransform(tx.rect, new ColorTransform(1, 1, 1, 0.5));
        }
        tgt = 0;
        tgtDiff = -1;
        this._tgtWidth = (tx.width + 2 * this.margin) | 0;
        imgArray = StoneButton._bgKeys;
        if (GLOBAL.InfernoMode()) {
            imgArray = StoneButton._bgKeysInferno;
        }
        i = 0;
        while (i < imgArray.length) {
            nd = (this._tgtWidth - imgArray[i].width) | 0;
            if (nd < 0) {
                nd = (nd * -1) | 0;
            }
            if (tgtDiff == -1 || nd < tgtDiff) {
                tgtDiff = nd;
                tgt = i;
            }
            i++;
        }
        ImageCache.GetImageWithCallBack(as3.str(imgArray[tgt].key), cbf);
    }
}
