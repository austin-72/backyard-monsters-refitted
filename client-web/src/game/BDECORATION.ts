import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL } from "@game";

export class BDECORATION extends BFOUNDATION {
    static {
        as3.fields(this, { _animMC: null, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _animMC: MovieClip;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(param1?: any /* int */): void {
        let _loc2_: int = 0;
        _loc2_ = GLOBAL._buildingProps[param1 - 1].size | 0;
        this._type = param1;
        this._footprint = [new Rectangle(0, 0, _loc2_, _loc2_)];
        this._gridCost = [[new Rectangle(0, 0, _loc2_, _loc2_), 2]];
        super.$ctor();
        super.SetProps();
    }

    public override Place(param1: MouseEvent = null): void {
        super.Place(param1);
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._frameNumber % 2 == 0) {
            this.AnimFrame();
        }
        ++this._frameNumber;
    }
}
