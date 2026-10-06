import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, MovieClip, Shape } from "flash/display";
import { BitmapFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";

// AS3 namespace renderer_friend: members declared in it are plain properties in TypeScript.

export class RasterData extends ASObject {
    static {
        as3.fields(this, { _id: 0, _data: null, _pt: null, _depth: NaN, _rect: null, _blendMode: null, _filter: null, _scaleX: 0, _scaleY: 0, _alpha: 0, _visible: false, _unSorted: false, _cleared: false, _rsHas: false, _rsFrame: 0, _rsX: NaN, _rsY: NaN, _rsW: NaN, _rsH: NaN, _rsVer: NaN, _rsData: null, _rsAlpha: 0, _rsBlend: null, _rsFilter: null, _rsDepth: NaN, _ioBm: null, _ipX0: 0, _ipY0: 0, _ipX1: 0, _ipY1: 0, _ipSeen: -10, _ipSx: 0, _ipSy: 0 });
    }

    public static readonly s_rasterData: Vector<RasterData> = new Vector<RasterData>(0, false, RasterData);

    public static readonly s_visibleData: Vector<RasterData> = new Vector<RasterData>(0, false, RasterData);

    public static readonly s_unsortedData: Vector<RasterData> = new Vector<RasterData>(0, false, RasterData);

    public static readonly s_debugData: Vector<RasterData> = new Vector<RasterData>(0, false, RasterData);

    public static s_needsSort: boolean = false;

    private static s_id: uint = 0;
    public _id: uint;
    public _data: IBitmapDrawable;
    public _pt: Point;
    public _depth: number;
    public _rect: Rectangle;
    public _blendMode: string;
    public _filter: BitmapFilter;
    public _scaleX: int;
    public _scaleY: int;
    public _alpha: uint;
    public _visible: boolean;
    public _unSorted: boolean;
    public _cleared: boolean;
    // Where and how it was drawn last (Renderer's partial redraw): what changed since is drawn again.
    public _rsHas: boolean;
    public _rsFrame: uint;
    public _rsX: number;
    public _rsY: number;
    public _rsW: number;
    public _rsH: number;
    public _rsVer: number;
    public _rsData: any;
    public _rsAlpha: uint;
    public _rsBlend: string;
    public _rsFilter: any;
    public _rsDepth: number;
    /** Its own Bitmap for drawing it through its filter (Renderer): the browser build keeps the filtered
     *  picture of each Bitmap while it is unchanged; one Bitmap shared by every entry never matched. */
    public _ioBm: Bitmap;
    // Frame interpolation (browser build, Renderer.ioInterpolate): where it was drawn at the game's last two
    // frames (_ipSeen: the renderer's frame count of the last), and where it really is while drawn between.
    public _ipX0: number;
    public _ipY0: number;
    public _ipX1: number;
    public _ipY1: number;
    public _ipSeen: int;
    public _ipSx: number;
    public _ipSy: number;

    public $ctor(param1?: IBitmapDrawable, param2?: Point, param3?: number, param4: string = null, param5: boolean = false): void {
        this._id = (RasterData.s_id++) >>> 0;
        super.$ctor();
        this.data = param1;
        this._pt = param2;
        this._depth = param3;
        this._blendMode = param4;
        this._scaleX = this._scaleY = 100;
        this._alpha = 4278190080;
        this._visible = true;
        this._unSorted = param5;
        RasterData.s_needsSort = this._unSorted ? RasterData.s_needsSort : true;
        if (this._unSorted) {
            as3.vset(RasterData.s_rasterData, RasterData.s_rasterData.length, this);
            as3.vset(RasterData.s_unsortedData, RasterData.s_unsortedData.length, this);
        } else {
            as3.vset(RasterData.s_rasterData, RasterData.s_rasterData.length, this);
            as3.vset(RasterData.s_visibleData, RasterData.s_visibleData.length, this);
        }
    }

    public static get rasterData(): Vector<RasterData> {
        return RasterData.s_rasterData;
    }

    public static get visibleData(): Vector<RasterData> {
        return RasterData.s_visibleData;
    }

    public static get totalMemory(): uint {
        let _loc1_: uint = 0;
        let _loc2_: RasterData = null;
        let _loc3_: BitmapData = null;
        for (_loc2_ of (RasterData.s_rasterData ?? [])) {
            _loc3_ = as3.as(_loc2_._data, BitmapData);
            if (_loc3_) {
                _loc1_ = (_loc1_ + _loc3_.getPixels(_loc3_.rect).length) >>> 0;
            }
        }
        return _loc1_;
    }

    public static showDebug(): void {
        let _loc1_: RasterData = null;
        let _loc2_: BitmapData = null;
        let _loc3_: Shape = null;
        for (_loc1_ of (RasterData.s_rasterData ?? [])) {
            _loc2_ = as3.as(_loc1_._data, BitmapData);
            if (_loc2_) {
                _loc3_ = new Shape();
                _loc3_.graphics.lineStyle(1, 16711680);
                _loc3_.graphics.beginFill(10027008, 0.4);
                _loc3_.graphics.drawRect(0, 0, _loc2_.width, _loc2_.height);
                as3.vset(RasterData.s_debugData, RasterData.s_debugData.length, new RasterData(as3.cast(_loc3_, IBitmapDrawable), _loc1_._pt, _loc1_._depth));
            }
        }
    }

    public static hideDebug(): void {
        let _loc1_: RasterData = null;
        for (_loc1_ of (RasterData.s_debugData ?? [])) {
            _loc1_.clear(true);
        }
        as3.vsetLength(RasterData.s_debugData, 0);
    }

    public static clear(param1: boolean = false): void {
        let _loc2_: RasterData = null;
        for (_loc2_ of (RasterData.s_rasterData ?? [])) {
            _loc2_.clear(param1);
        }
        as3.vsetLength(RasterData.s_unsortedData, as3.vsetLength(RasterData.s_visibleData, as3.vsetLength(RasterData.s_rasterData, as3.vsetLength(RasterData.s_debugData, 0))));
    }

    public get id(): uint {
        return this._id;
    }

    public get data(): IBitmapDrawable {
        return this._data;
    }

    public set data(param1: IBitmapDrawable) {
        this._data = param1;
        switch (true) {
            case this._data instanceof BitmapData:
                this._rect = (as3.as(this._data, BitmapData)).rect;
                break;
            case this._data instanceof MovieClip:
                this._rect = (as3.as(this._data, MovieClip)).getRect(as3.as(this._data, MovieClip));
                break;
            default:
                this._rect = new Rectangle();
        }
    }

    public set pt(param1: Point) {
        this._pt = param1;
    }

    public get rect(): Rectangle {
        return this._rect;
    }

    public get depth(): number {
        return this._depth;
    }

    public set depth(param1: number) {
        if (this._depth !== param1) {
            RasterData.s_needsSort = true;
            this._depth = param1;
        }
    }

    public set blendMode(param1: string) {
        this._blendMode = param1;
    }

    public set filter(param1: BitmapFilter) {
        this._filter = param1;
    }

    public set scaleX(param1: number) {
        this._scaleX = param1 * 100 >> 0;
    }

    public set scaleY(param1: number) {
        this._scaleY = param1 * 100 >> 0;
    }

    public set alpha(param1: number) {
        this._alpha = (Math.ceil(param1 * 255) << 24) >>> 0;
    }

    public get visible(): boolean {
        return this._visible;
    }

    public set visible(param1: boolean) {
        if (this._cleared) {
            return;
        }

        let idx: int = 0;

        if (!this._visible && param1) {
            if (this._unSorted) {
                as3.vset(RasterData.s_unsortedData, RasterData.s_unsortedData.length, this);
            } else {
                as3.vset(RasterData.s_visibleData, RasterData.s_visibleData.length, this);
            }
            RasterData.s_needsSort = true;
        } else if (this._visible && !param1) {
            if (this._unSorted) {
                idx = RasterData.s_unsortedData.indexOf(this) | 0;

                if (idx >= 0) {
                    RasterData.s_unsortedData.splice(idx, 1);
                }
            } else {
                idx = RasterData.s_visibleData.indexOf(this) | 0;

                if (idx >= 0) {
                    RasterData.s_visibleData.splice(idx, 1);
                }
            }
            RasterData.s_needsSort = true;
        }
        this._visible = param1;
    }

    public clone(): RasterData {
        return new RasterData(this._data, this._pt, this._depth);
    }

    public clear(param1: boolean = false): void {
        if (this._cleared) {
            return;
        }
        let idx: int = RasterData.s_rasterData.indexOf(this) | 0;

        if (idx >= 0) {
            RasterData.s_rasterData.splice(idx, 1);
        }
        if (this._visible) {
            if (this._unSorted) {
                idx = RasterData.s_unsortedData.indexOf(this) | 0;

                if (idx >= 0) {
                    RasterData.s_unsortedData.splice(idx, 1);
                }
            } else {
                idx = RasterData.s_visibleData.indexOf(this) | 0;

                if (idx >= 0) {
                    RasterData.s_visibleData.splice(idx, 1);
                }
            }
        }
        if (param1 && this._data instanceof BitmapData) {
            (as3.as(this._data, BitmapData)).dispose();
        }
        this._data = null;
        this._pt = null;
        this._rect = null;
        this._blendMode = null;
        this._cleared = true;
    }
}
