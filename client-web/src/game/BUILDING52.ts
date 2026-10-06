import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BEXPIRABLE, CREEPS, GLOBAL, SIGNS } from "@game";

export class BUILDING52 extends BEXPIRABLE {
    static {
        as3.fields(this, { _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        this._type = 52;
        super.$ctor();
        this._footprint = [new Rectangle(0, 0, 40, 40)];
        this._gridCost = [[new Rectangle(0, 0, 40, 40), 20]];
        this.imageData = GLOBAL._buildingProps[this._type - 1].imageData;
        this.SetProps();
    }

    public override Place(param1: MouseEvent = null): void {
        super.Place(param1);
        if (this._placing == false) {
            SIGNS.CreateForBuilding(this);
        }
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._frameNumber % 2 == 0 && CREEPS._creepCount == 0) {
            this.AnimFrame();
        }
        ++this._frameNumber;
    }

    public override AnimFrame(param1: boolean = true): void {
        this._animContainerBMD.copyPixels(this._animBMD, new Rectangle(24 * this._animTick, 0, 24, 30), new Point(0, 0));
        ++this._animTick;
        if (this._animTick == 22) {
            this._animTick = 0;
        }
    }
}
