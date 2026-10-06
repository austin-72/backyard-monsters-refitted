import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BRESOURCE, CREEPS, GLOBAL } from "@game";

export class BUILDING3 extends BRESOURCE {
    static {
        as3.fields(this, { _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        this._frameNumber = (Math.random() * 5) | 0;
        super.$ctor();
        this._frameNumber = (Math.random() * 5) | 0;
        this._type = 3;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._spoutPoint = new Point(28, -17);
        this._spoutHeight = 50;
        this.SetProps();
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._animLoaded && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() == 0 && this._producing && this._canFunction) {
            if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "help" || GLOBAL.mode == "view") && this._frameNumber % 3 == 0 && CREEPS._creepCount == 0) {
                this.AnimFrame();
            } else if (this._frameNumber % 10 == 0) {
                this.AnimFrame();
            }
        }
        ++this._frameNumber;
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Constructed(): void {
        super.Constructed();
    }
}
