import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { BitmapData, Sprite } from "flash/display";
import { MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { Timer } from "flash/utils";
import { ArrowKeyState, GLOBAL, MapRoom3, MapRoom3Cell, MapRoom3CellGraphic, MapRoom3CellMouseover, MapRoom3Data, MapRoom3TileSetManager, MapRoom3Tutorial, Quad, TweenLite } from "@game";

export class MapRoom3Window extends Sprite {
    static {
        as3.fields(this, { RANGE_GLOW_FILTER: null, MOUSEOVER_RANGE_GLOW_FILTER: null, m_MapData: null, m_TileBuffer: null, m_TileLookup: null, m_BackgroundImage: null, m_ScrollingCanvas: null, m_BaseLayer: null, m_RangeAlphaLayer: null, m_RangeLayer: null, m_RangeGlowLayer: null, m_MouseoverRangeAlphaLayer: null, m_MouseoverRangeLayer: null, m_MouseoverRangeGlowLayer: null, m_CellOverlayLayer: null, m_TileLayer: null, m_InfoLayer: null, m_MouseoverInfo: null, m_MousedoverCellGraphic: null, m_SelectedCellGraphic: null, m_CenterPoint: null, m_CenterPointForLoading: null, m_CenterPointForLoadingLocked: false, m_TempStartDragPoint: null, m_StartDragPoint: null, m_StopDragPoint: null, m_DragTimer: null, m_Dragging: false, m_KeyScrollVelocity: 8 });
    }

    private static readonly RANGE_LAYER_ALPHA: number = 0.2;

    private static readonly RANGE_GLOW_BLUR_X: number = 50;

    private static readonly RANGE_GLOW_BLUR_Y: number = 50;

    private static readonly RANGE_GLOW_BLUR_STRENGTH: number = 2;

    private static readonly RANGE_GLOW_COLOUR: uint = 3381708;

    private static readonly MOUSEOVER_RANGE_GLOW_COLOUR: uint = 16711680;

    private static readonly KEY_SCROLL_START_VELOCITY: number = 8;

    private static readonly KEY_SCROLL_MAX_VELOCITY: number = 18;

    private static readonly KEY_SCROLL_ACCELERATION: number = 0.25;

    private static readonly k_MAX_FILTER_TOTAL_SIZE: number = 16777215;

    private static readonly k_MAX_FILTER_SIZE: number = 8191;
    private RANGE_GLOW_FILTER: GlowFilter;
    private MOUSEOVER_RANGE_GLOW_FILTER: GlowFilter;
    private m_MapData: MapRoom3Data;
    private m_TileBuffer: Vector<MapRoom3CellGraphic>;
    private m_TileLookup: any[];
    private m_BackgroundImage: BitmapData;
    private m_ScrollingCanvas: Sprite;
    private m_BaseLayer: Sprite;
    private m_RangeAlphaLayer: Sprite;
    private m_RangeLayer: Sprite;
    private m_RangeGlowLayer: Sprite;
    private m_MouseoverRangeAlphaLayer: Sprite;
    private m_MouseoverRangeLayer: Sprite;
    private m_MouseoverRangeGlowLayer: Sprite;
    private m_CellOverlayLayer: Sprite;
    private m_TileLayer: Sprite;
    private m_InfoLayer: Sprite;
    private m_MouseoverInfo: MapRoom3CellMouseover;
    private m_MousedoverCellGraphic: MapRoom3CellGraphic;
    private m_SelectedCellGraphic: MapRoom3CellGraphic;
    private m_CenterPoint: Point;
    private m_CenterPointForLoading: Point;
    private m_CenterPointForLoadingLocked: boolean;
    private m_TempStartDragPoint: Point;
    private m_StartDragPoint: Point;
    private m_StopDragPoint: Point;
    private m_DragTimer: Timer;
    private m_Dragging: boolean;
    private m_KeyScrollVelocity: number;

    public $ctor(param1?: MapRoom3Data): void {
        this.RANGE_GLOW_FILTER = new GlowFilter(MapRoom3Window.RANGE_GLOW_COLOUR, 0.5, MapRoom3Window.RANGE_GLOW_BLUR_X, MapRoom3Window.RANGE_GLOW_BLUR_Y, MapRoom3Window.RANGE_GLOW_BLUR_STRENGTH, 1, true, true);
        this.MOUSEOVER_RANGE_GLOW_FILTER = new GlowFilter(MapRoom3Window.MOUSEOVER_RANGE_GLOW_COLOUR, 0.5, MapRoom3Window.RANGE_GLOW_BLUR_X, MapRoom3Window.RANGE_GLOW_BLUR_Y, MapRoom3Window.RANGE_GLOW_BLUR_STRENGTH, 1, true, true);
        this.m_TileBuffer = new Vector<MapRoom3CellGraphic>(0, false, MapRoom3CellGraphic);
        this.m_TileLookup = new Array();
        this.m_MouseoverInfo = new MapRoom3CellMouseover();
        this.m_CenterPoint = new Point();
        this.m_CenterPointForLoading = new Point();
        super.$ctor();
        this.m_MapData = param1;
        this.m_ScrollingCanvas = new Sprite();
        this.m_ScrollingCanvas.mouseEnabled = false;
        this.addChild(this.m_ScrollingCanvas);
        this.m_BaseLayer = new Sprite();
        this.m_BaseLayer.mouseEnabled = false;
        this.m_ScrollingCanvas.addChild(this.m_BaseLayer);
        this.m_RangeAlphaLayer = new Sprite();
        this.m_RangeAlphaLayer.mouseEnabled = false;
        this.m_RangeAlphaLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_RangeAlphaLayer);
        this.m_RangeLayer = new Sprite();
        this.m_RangeLayer.mouseEnabled = false;
        this.m_RangeLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_RangeLayer);
        this.m_RangeAlphaLayer.mask = this.m_RangeLayer;
        this.m_RangeGlowLayer = new Sprite();
        this.m_RangeGlowLayer.mouseEnabled = false;
        this.m_RangeGlowLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_RangeGlowLayer);
        this.m_RangeGlowLayer.filters = [this.RANGE_GLOW_FILTER];
        this.m_MouseoverRangeAlphaLayer = new Sprite();
        this.m_MouseoverRangeAlphaLayer.mouseEnabled = false;
        this.m_MouseoverRangeAlphaLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_MouseoverRangeAlphaLayer);
        this.m_MouseoverRangeLayer = new Sprite();
        this.m_MouseoverRangeLayer.mouseEnabled = false;
        this.m_MouseoverRangeLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_MouseoverRangeLayer);
        this.m_MouseoverRangeAlphaLayer.mask = this.m_MouseoverRangeLayer;
        this.m_MouseoverRangeGlowLayer = new Sprite();
        this.m_MouseoverRangeGlowLayer.mouseEnabled = false;
        this.m_MouseoverRangeGlowLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_MouseoverRangeGlowLayer);
        this.m_MouseoverRangeGlowLayer.filters = [this.MOUSEOVER_RANGE_GLOW_FILTER];
        this.m_CellOverlayLayer = new Sprite();
        this.m_CellOverlayLayer.mouseEnabled = false;
        this.m_ScrollingCanvas.addChild(this.m_CellOverlayLayer);
        this.m_TileLayer = new Sprite();
        this.m_TileLayer.mouseEnabled = false;
        this.m_ScrollingCanvas.addChild(this.m_TileLayer);
        this.m_InfoLayer = new Sprite();
        this.m_InfoLayer.mouseEnabled = false;
        this.m_InfoLayer.mouseChildren = false;
        this.m_ScrollingCanvas.addChild(this.m_InfoLayer);
        this.m_DragTimer = new Timer(100, 1);
        this.m_DragTimer.addEventListener(TimerEvent.TIMER_COMPLETE, as3.bind(this, this.OnDragTimerComplete));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnMouseDown), false, 0, true);
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.OnMouseUp), false, 0, true);
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.OnMouseMoved), false, 0, true);
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseClicked), true, 0, true);
        this.m_MouseoverInfo.visible = false;
        this.addChild(this.m_MouseoverInfo);
        this.m_BackgroundImage = MapRoom3TileSetManager.instance.currentBackground;
        this.DrawBackground();
    }

    public get scrollingCanvas(): Sprite {
        return this.m_ScrollingCanvas;
    }

    public get baseLayer(): Sprite {
        return this.m_BaseLayer;
    }

    public get rangeAlphaLayer(): Sprite {
        return this.m_RangeAlphaLayer;
    }

    public get rangeLayer(): Sprite {
        return this.m_RangeLayer;
    }

    public get rangeGlowLayer(): Sprite {
        return this.m_RangeGlowLayer;
    }

    public get mouseoverRangeAlphaLayer(): Sprite {
        return this.m_MouseoverRangeAlphaLayer;
    }

    public get mouseoverRangeLayer(): Sprite {
        return this.m_MouseoverRangeLayer;
    }

    public get mouseoverRangeGlowLayer(): Sprite {
        return this.m_MouseoverRangeGlowLayer;
    }

    public get cellOverlayLayer(): Sprite {
        return this.m_CellOverlayLayer;
    }

    public get infoLayer(): Sprite {
        return this.m_InfoLayer;
    }

    public get centerPoint(): Point {
        return this.m_CenterPoint;
    }

    public get centerPointForLoading(): Point {
        return this.m_CenterPointForLoading;
    }

    public get mouseoverInfo(): MapRoom3CellMouseover {
        return this.m_MouseoverInfo;
    }

    public Init(param1: Point): void {
        if (param1 != null) {
            this.m_CenterPoint.x = param1.x;
            this.m_CenterPoint.y = param1.y;
        }
        this.CenterOn(this.m_CenterPoint);
    }

    public TickFast(): void {
        let _loc1_: uint = this.m_TileBuffer.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            as3.vget(this.m_TileBuffer, _loc2_).TickFast();
            _loc2_++;
        }
        this.KeyScroll();
    }

    private AdjustCenterPoint(): void {
        this.m_CenterPoint.x = (-(this.m_ScrollingCanvas.x - (GLOBAL.StageX + GLOBAL.StageWidth * 0.5) + (!(!(this.m_CenterPoint.y % 2)) ? MapRoom3CellGraphic.HEX_WIDTH * 0.5 : 0)) / MapRoom3CellGraphic.HEX_WIDTH) | 0;
        this.m_CenterPoint.y = (-(this.m_ScrollingCanvas.y - (GLOBAL.StageY + GLOBAL.StageHeight * 0.5)) / MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP) | 0;
        this.m_CenterPoint.x /= this.m_ScrollingCanvas.scaleX;
        this.m_CenterPoint.y /= this.m_ScrollingCanvas.scaleY;
        if (!this.m_CenterPointForLoadingLocked) {
            this.m_CenterPointForLoading.x = this.m_CenterPoint.x;
            this.m_CenterPointForLoading.y = this.m_CenterPoint.y;
        }
    }

    private OnDragTimerComplete(param1: TimerEvent): void {
        this.m_StartDragPoint = this.m_TempStartDragPoint.clone();
    }

    private OnMouseDown(param1: MouseEvent): void {
        this.m_StartDragPoint = null;
        this.m_TempStartDragPoint = new Point(param1.stageX, param1.stageY);
        this.m_DragTimer.start();
        this.m_Dragging = true;
    }

    private OnMouseUp(param1: MouseEvent): void {
        this.m_KeyScrollVelocity = MapRoom3Window.KEY_SCROLL_START_VELOCITY;
        this.m_Dragging = false;
        this.m_DragTimer.stop();
        this.m_StopDragPoint = new Point(param1.stageX, param1.stageY);
        if (this.m_StartDragPoint != null) {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
        }
    }

    private OnMouseClicked(param1: MouseEvent): void {
        let _loc2_: number = 0;
        let _loc3_: number = 0;
        if (this.m_StartDragPoint != null) {
            _loc2_ = Math.abs(this.m_StopDragPoint.x - this.m_StartDragPoint.x);
            _loc3_ = Math.abs(this.m_StopDragPoint.y - this.m_StartDragPoint.y);
        }
        if (_loc2_ > 1 || _loc3_ > 1) {
            param1.stopImmediatePropagation();
        }
    }

    private OnMouseMoved(param1: MouseEvent): void {
        if (this.m_Dragging == false) {
            return;
        }
        if (param1.buttonDown == false) {
            this.OnMouseUp(param1);
            return;
        }
        if (!MapRoom3Tutorial.instance.allowScrolling) {
            return;
        }
        let _loc2_: int = (param1.stageX - this.m_TempStartDragPoint.x) | 0;
        let _loc3_: int = (param1.stageY - this.m_TempStartDragPoint.y) | 0;
        if (_loc2_ == 0 && _loc3_ == 0) {
            return;
        }
        this.SetMousedoverCellGraphic(null);
        this.SetSelectedCellGraphic(null);
        this.m_ScrollingCanvas.x = this.AdjustHorizontalBounds((this.m_ScrollingCanvas.x + _loc2_) | 0);
        this.m_ScrollingCanvas.y = this.AdjustVerticalBounds((this.m_ScrollingCanvas.y + _loc3_) | 0);
        this.m_TempStartDragPoint.x += _loc2_;
        this.m_TempStartDragPoint.y += _loc3_;
        this.UpdateMap();
        this.m_CenterPointForLoadingLocked = false;
    }

    private KeyScroll(): void {
        let _loc1_: number = NaN;
        let _loc2_: number = NaN;
        if (this.m_Dragging) {
            return;
        }
        if (ArrowKeyState.ArrowKeyPressed) {
            _loc1_ = this.m_KeyScrollVelocity * ArrowKeyState.xDir;
            _loc2_ = this.m_KeyScrollVelocity * ArrowKeyState.yDir;
            if (this.m_KeyScrollVelocity < MapRoom3Window.KEY_SCROLL_MAX_VELOCITY) {
                this.m_KeyScrollVelocity += MapRoom3Window.KEY_SCROLL_ACCELERATION;
            } else {
                this.m_KeyScrollVelocity = MapRoom3Window.KEY_SCROLL_MAX_VELOCITY;
            }
            this.SetMousedoverCellGraphic(null);
            this.SetSelectedCellGraphic(null);
            this.m_ScrollingCanvas.x = this.AdjustHorizontalBounds((this.m_ScrollingCanvas.x + _loc1_) | 0);
            this.m_ScrollingCanvas.y = this.AdjustVerticalBounds((this.m_ScrollingCanvas.y + _loc2_) | 0);
            this.UpdateMap();
        } else {
            this.m_KeyScrollVelocity = MapRoom3Window.KEY_SCROLL_START_VELOCITY;
        }
    }

    public Clear(): void {
        let _loc1_: MapRoom3CellGraphic = null;
        TweenLite.killTweensOf(this.m_ScrollingCanvas, true);
        this.m_CenterPointForLoadingLocked = false;
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.OnMouseDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.OnMouseUp));
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.OnMouseMoved));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseClicked), true);
        this.m_DragTimer.removeEventListener(TimerEvent.TIMER_COMPLETE, as3.bind(this, this.OnDragTimerComplete));
        this.m_DragTimer = null;
        this.m_CenterPoint = null;
        this.m_CenterPointForLoading = null;
        this.m_TempStartDragPoint = null;
        this.m_StartDragPoint = null;
        this.m_StopDragPoint = null;
        this.m_MousedoverCellGraphic = null;
        this.m_SelectedCellGraphic = null;
        this.m_MouseoverInfo.Clear();
        this.removeChild(this.m_MouseoverInfo);
        this.m_MouseoverInfo = null;
        for (_loc1_ of (this.m_TileBuffer ?? [])) {
            _loc1_.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCellGraphicClicked));
            _loc1_.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnCellGraphicRollOver));
            _loc1_.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnCellGraphicRollOut));
            _loc1_.Clear();
            this.m_TileLayer.removeChild(_loc1_);
            _loc1_ = null;
        }
        as3.vsetLength(this.m_TileBuffer, 0);
        this.m_TileLookup.length = 0;
        this.m_ScrollingCanvas.removeChild(this.m_InfoLayer);
        this.m_ScrollingCanvas.removeChild(this.m_TileLayer);
        this.m_ScrollingCanvas.removeChild(this.m_CellOverlayLayer);
        this.m_ScrollingCanvas.removeChild(this.m_MouseoverRangeGlowLayer);
        this.m_ScrollingCanvas.removeChild(this.m_MouseoverRangeLayer);
        this.m_ScrollingCanvas.removeChild(this.m_MouseoverRangeAlphaLayer);
        this.m_ScrollingCanvas.removeChild(this.m_RangeGlowLayer);
        this.m_ScrollingCanvas.removeChild(this.m_RangeLayer);
        this.m_ScrollingCanvas.removeChild(this.m_RangeAlphaLayer);
        this.m_ScrollingCanvas.removeChild(this.m_BaseLayer);
        this.removeChild(this.m_ScrollingCanvas);
        this.m_BackgroundImage = null;
        this.m_ScrollingCanvas = null;
        this.m_BaseLayer = null;
        this.m_MouseoverRangeAlphaLayer = null;
        this.m_MouseoverRangeLayer = null;
        this.m_MouseoverRangeGlowLayer = null;
        this.m_RangeAlphaLayer = null;
        this.m_RangeLayer = null;
        this.m_RangeGlowLayer = null;
        this.m_CellOverlayLayer = null;
        this.m_TileLayer = null;
        this.m_InfoLayer = null;
        this.m_MapData = null;
    }

    public NavigateToCell(param1: MapRoom3Cell): void {
        if (param1 == null) {
            return;
        }
        let _loc2_: Point = new Point(param1.cellX, param1.cellY);
        this.NavigateToIndex(_loc2_);
    }

    public NavigateToIndex(param1: Point): void {
        this.m_CenterPointForLoading.x = param1.x;
        this.m_CenterPointForLoading.y = param1.y;
        this.m_CenterPointForLoadingLocked = true;
        TweenLite.killTweensOf(this.m_ScrollingCanvas, true);
        let _loc2_: int = this.AdjustHorizontalBounds((this.m_ScrollingCanvas.x - (param1.x - this.m_CenterPoint.x) * (MapRoom3CellGraphic.HEX_WIDTH * this.m_ScrollingCanvas.scaleX)) | 0);
        let _loc3_: int = this.AdjustVerticalBounds((this.m_ScrollingCanvas.y - (param1.y - this.m_CenterPoint.y) * (MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * this.m_ScrollingCanvas.scaleY)) | 0);
        TweenLite.to(this.m_ScrollingCanvas, 1, { "x": _loc2_, "y": _loc3_, "ease": Quad.easeInOut, "onUpdate": as3.bind(this, this.UpdateMap), "onComplete": as3.bind(this, this.OnNavigationComplete) });
        this.SetMousedoverCellGraphic(null);
        this.SetSelectedCellGraphic(null);
    }

    private OnNavigationComplete(): void {
        this.m_CenterPointForLoadingLocked = false;
    }

    private CenterOn(param1: Point): void {
        this.m_ScrollingCanvas.x = this.AdjustHorizontalBounds((-(this.m_CenterPoint.x * MapRoom3CellGraphic.HEX_WIDTH + (!(!(this.m_CenterPoint.y % 2)) ? MapRoom3CellGraphic.HEX_WIDTH * 0.5 : 0)) + (GLOBAL.StageX + GLOBAL.StageWidth * 0.5) - MapRoom3CellGraphic.HEX_WIDTH * 0.5) | 0);
        this.m_ScrollingCanvas.y = this.AdjustVerticalBounds((-this.m_CenterPoint.y * MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP + (GLOBAL.StageY + GLOBAL.StageHeight * 0.5) - MapRoom3CellGraphic.HEX_HEIGHT * 0.5) | 0);
        this.UpdateMap(true);
    }

    private GetBufferWidth(): int {
        return (((GLOBAL.StageWidth / (MapRoom3CellGraphic.HEX_WIDTH * this.m_ScrollingCanvas.scaleX)) | 0) + 5) | 0;
    }

    private GetBufferHeight(): int {
        return (((GLOBAL.StageHeight / (MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * this.m_ScrollingCanvas.scaleY)) | 0) + 4) | 0;
    }

    public Refresh(): void {
        let _loc1_: MapRoom3Cell = null;
        let _loc2_: MapRoom3Cell = null;
        if (this.m_MousedoverCellGraphic != null) {
            _loc1_ = this.m_MousedoverCellGraphic.cell;
            this.SetMousedoverCellGraphic(null);
        }
        if (this.m_SelectedCellGraphic != null) {
            _loc2_ = this.m_SelectedCellGraphic.cell;
            this.SetSelectedCellGraphic(null);
        }
        this.UpdateMap(true);
        if (_loc2_ != null) {
            this.SetSelectedCellGraphic(_loc2_.cellGraphic);
        } else if (_loc1_ != null) {
            this.SetMousedoverCellGraphic(_loc1_.cellGraphic);
        }
    }

    private UpdateMap(param1: boolean = false): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: MapRoom3Cell = null;
        let _loc15_: MapRoom3CellGraphic = null;
        let _loc16_: Vector<MapRoom3Cell> = null;
        let _loc19_: int = 0;
        let _loc20_: int = 0;
        let _loc21_: int = 0;
        let _loc22_: number = NaN;
        let _loc23_: number = NaN;
        this.AdjustCenterPoint();
        this.DrawBackground();
        this.DrawRangeAlphaLayer(this.m_RangeAlphaLayer);
        this.DrawRangeAlphaLayer(this.m_MouseoverRangeAlphaLayer);
        _loc2_ = this.GetBufferWidth();
        _loc3_ = this.GetBufferHeight();
        let _loc4_: int = (_loc2_ * _loc3_) | 0;
        let _loc5_: int = (this.m_CenterPoint.x - ((_loc2_ * 0.5) | 0)) | 0;
        let _loc6_: int = (this.m_CenterPoint.y - ((_loc3_ * 0.5) | 0)) | 0;
        let _loc17_: Vector<MapRoom3CellGraphic> = new Vector<MapRoom3CellGraphic>(0, false, MapRoom3CellGraphic);
        let _loc18_: Vector<MapRoom3CellGraphic> = new Vector<MapRoom3CellGraphic>(0, false, MapRoom3CellGraphic);
        for (_loc15_ of (this.m_TileBuffer ?? [])) {
            _loc14_ = _loc15_.cell;
            _loc8_ = (((_loc15_.x / MapRoom3CellGraphic.HEX_WIDTH) | 0) - _loc5_) | 0;
            _loc9_ = (((_loc15_.y / MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP) | 0) - _loc6_) | 0;
            if (param1 || _loc8_ < 0 || _loc9_ < 0 || _loc8_ >= _loc2_ || _loc9_ >= _loc3_) {
                this.m_TileLayer.removeChild(_loc15_);
                _loc18_.push(_loc15_);
                this.m_TileLookup[_loc15_.cellIndex] = null;
                _loc15_.x = 0;
                _loc15_.y = 0;
            } else {
                _loc17_.push(_loc15_);
            }
        }
        as3.vsetLength(this.m_TileBuffer, 0);
        this.m_TileBuffer = _loc17_;
        _loc7_ = 0;
        while (_loc7_ < _loc4_) {
            _loc8_ = (_loc7_ % _loc2_) | 0;
            _loc9_ = (_loc7_ / _loc2_) | 0;
            _loc10_ = (_loc8_ + _loc5_) | 0;
            _loc11_ = (_loc9_ + _loc6_) | 0;
            _loc14_ = this.m_MapData.GetMapRoom3Cell(_loc10_, _loc11_);
            _loc16_ = _loc14_.inAttackRangeOfCells;
            _loc13_ = 0;
            while (_loc14_ != null) {
                if (_loc14_.isBorder) {
                    _loc12_ = ((_loc11_ + this.m_MapData.mapHeight) % this.m_MapData.mapHeight * this.m_MapData.mapWidth + (_loc10_ + this.m_MapData.mapWidth) % this.m_MapData.mapWidth) | 0;
                } else {
                    _loc12_ = (_loc14_.cellY * this.m_MapData.mapWidth + _loc14_.cellX) | 0;
                }
                if (this.m_TileLookup[_loc12_] == null) {
                    if (_loc18_.length > 0) {
                        _loc15_ = as3.cast(_loc18_.pop(), MapRoom3CellGraphic);
                    } else {
                        _loc15_ = new MapRoom3CellGraphic();
                        _loc15_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCellGraphicClicked));
                        _loc15_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnCellGraphicRollOver));
                        _loc15_.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnCellGraphicRollOut));
                    }
                    this.m_TileBuffer.push(_loc15_);
                    _loc15_.cellIndex = _loc12_;
                    this.m_TileLookup[_loc12_] = _loc15_;
                    _loc15_.x = Number(_loc10_ * MapRoom3CellGraphic.HEX_WIDTH + (!(!(_loc11_ % 2)) ? MapRoom3CellGraphic.HEX_WIDTH * 0.5 : 0));
                    _loc15_.y = _loc11_ * MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP;
                    _loc15_.setMapCell(_loc14_);
                    _loc19_ = 0;
                    _loc20_ = this.m_TileLayer.numChildren;
                    while (_loc19_ < _loc20_) {
                        _loc21_ = ((_loc19_ + _loc20_) * 0.5) | 0;
                        _loc22_ = _loc15_.x - this.m_TileLayer.getChildAt(_loc21_).x;
                        _loc23_ = _loc15_.y - this.m_TileLayer.getChildAt(_loc21_).y;
                        if (_loc23_ < 0 || _loc23_ == 0 && _loc22_ <= 0) {
                            _loc20_ = _loc21_;
                        } else {
                            _loc19_ = (_loc21_ + 1) | 0;
                        }
                    }
                    this.m_TileLayer.addChildAt(_loc15_, _loc19_);
                }
                _loc14_ = null;
                if (_loc16_ != null && _loc13_ < _loc16_.length) {
                    _loc14_ = as3.vget(_loc16_, _loc13_++);
                    _loc10_ = _loc14_.cellX;
                    _loc11_ = _loc14_.cellY;
                }
            }
            _loc7_++;
        }
        for (_loc15_ of (_loc18_ ?? [])) {
            _loc15_.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCellGraphicClicked));
            _loc15_.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.OnCellGraphicRollOver));
            _loc15_.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.OnCellGraphicRollOut));
            _loc15_.Clear();
            _loc15_ = null;
        }
        as3.vsetLength(_loc18_, 0);
        this.m_RangeGlowLayer.visible = true;
        if (this.m_RangeGlowLayer.height >= MapRoom3Window.k_MAX_FILTER_SIZE || this.m_RangeGlowLayer.width >= MapRoom3Window.k_MAX_FILTER_SIZE || this.m_RangeGlowLayer.width * this.m_RangeGlowLayer.height >= MapRoom3Window.k_MAX_FILTER_TOTAL_SIZE) {
            this.m_RangeGlowLayer.visible = false;
        }
    }

    private OnCellGraphicClicked(param1: MouseEvent): void {
        let _loc2_: MapRoom3CellGraphic = as3.as(param1.currentTarget, MapRoom3CellGraphic);
        if (_loc2_ == null) {
            return;
        }
        if (!MapRoom3Tutorial.instance.isClickableCell(_loc2_.cell)) {
            return;
        }
        this.SetSelectedCellGraphic(_loc2_);
    }

    private OnCellGraphicRollOver(param1: MouseEvent): void {
        let _loc2_: MapRoom3CellGraphic = as3.as(param1.currentTarget, MapRoom3CellGraphic);
        if (_loc2_ == null) {
            return;
        }
        if (_loc2_ == this.m_SelectedCellGraphic) {
            return;
        }
        if (this.m_SelectedCellGraphic != null && _loc2_.cell == this.m_SelectedCellGraphic.cell) {
            return;
        }
        this.SetSelectedCellGraphic(null);
        this.SetMousedoverCellGraphic(_loc2_);
        MapRoom3.mapRoom3WindowHUD.DisplayCoordinatesOfCell(_loc2_.cell);
    }

    private OnCellGraphicRollOut(param1: MouseEvent): void {
        let _loc2_: MapRoom3CellGraphic = as3.as(param1.currentTarget, MapRoom3CellGraphic);
        if (_loc2_ == null) {
            return;
        }
        if (_loc2_ != this.m_MousedoverCellGraphic) {
            return;
        }
        if (_loc2_ == this.m_SelectedCellGraphic) {
            return;
        }
        if (this.m_SelectedCellGraphic != null && _loc2_.cell == this.m_SelectedCellGraphic.cell) {
            return;
        }
        this.SetSelectedCellGraphic(null);
        this.SetMousedoverCellGraphic(null);
    }

    private SetMousedoverCellGraphic(param1: MapRoom3CellGraphic): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        if (this.m_MousedoverCellGraphic == param1) {
            return;
        }
        if (this.m_MousedoverCellGraphic != null) {
            this.m_MouseoverInfo.Hide();
            this.m_MousedoverCellGraphic.mousedover = false;
            this.m_MousedoverCellGraphic = null;
        }
        if (param1 != null && param1.cell != null && param1.cell.DoesContainDisplayableBase()) {
            this.m_MousedoverCellGraphic = param1;
            this.m_MousedoverCellGraphic.mousedover = true;
            if (param1.cell.DoesContainDisplayableBase()) {
                _loc2_ = this.m_ScrollingCanvas.x + this.m_MousedoverCellGraphic.x * this.m_ScrollingCanvas.scaleX + MapRoom3CellGraphic.HEX_WIDTH * this.m_ScrollingCanvas.scaleX * 0.5;
                _loc3_ = this.m_ScrollingCanvas.y + this.m_MousedoverCellGraphic.y * this.m_ScrollingCanvas.scaleY + MapRoom3CellGraphic.HEX_HEIGHT * this.m_ScrollingCanvas.scaleY * 0.5;
                this.m_MouseoverInfo.Show(this.m_MousedoverCellGraphic.cell, _loc2_, _loc3_, false);
            }
        }
    }

    private SetSelectedCellGraphic(param1: MapRoom3CellGraphic): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        if (this.m_SelectedCellGraphic == param1) {
            return;
        }
        if (this.m_SelectedCellGraphic != null) {
            this.m_MouseoverInfo.Hide();
            this.m_SelectedCellGraphic.selected = false;
            this.m_SelectedCellGraphic = null;
        }
        if (param1 != null && param1.cell != null && param1.cell.DoesContainDisplayableBase()) {
            this.m_SelectedCellGraphic = param1;
            this.m_SelectedCellGraphic.selected = true;
            _loc2_ = this.m_ScrollingCanvas.x + this.m_SelectedCellGraphic.x * this.m_ScrollingCanvas.scaleX + MapRoom3CellGraphic.HEX_WIDTH * this.m_ScrollingCanvas.scaleX * 0.5;
            _loc3_ = this.m_ScrollingCanvas.y + this.m_SelectedCellGraphic.y * this.m_ScrollingCanvas.scaleY + MapRoom3CellGraphic.HEX_HEIGHT * this.m_ScrollingCanvas.scaleY * 0.5;
            this.m_MouseoverInfo.Show(this.m_SelectedCellGraphic.cell, _loc2_, _loc3_, true);
        }
    }

    public IsZoomedOut(): boolean {
        return this.m_ScrollingCanvas.scaleX < 1;
    }

    public Zoom(param1: number, param2: number = 0): void {
        if (this.m_ScrollingCanvas.scaleX == param1) {
            return;
        }
        if (param2 != 0) {
            TweenLite.to(this.m_ScrollingCanvas, param2, { "scaleX": param1, "ease": Quad.easeInOut, "onUpdate": as3.bind(this, this.OnZoomUpdate) });
        } else {
            this.m_ScrollingCanvas.scaleX = param1;
            this.OnZoomUpdate();
        }
    }

    private OnZoomUpdate(): void {
        let _loc1_: number = this.m_ScrollingCanvas.scaleX / this.m_ScrollingCanvas.scaleY;
        let _loc2_: int = (GLOBAL.StageX + GLOBAL.StageWidth * 0.5) | 0;
        let _loc3_: int = (GLOBAL.StageY + GLOBAL.StageHeight * 0.5) | 0;
        this.m_ScrollingCanvas.x -= _loc2_;
        this.m_ScrollingCanvas.y -= _loc3_;
        this.m_ScrollingCanvas.scaleX = this.m_ScrollingCanvas.scaleX;
        this.m_ScrollingCanvas.scaleY = this.m_ScrollingCanvas.scaleX;
        this.m_ScrollingCanvas.x *= _loc1_;
        this.m_ScrollingCanvas.y *= _loc1_;
        this.m_ScrollingCanvas.x += _loc2_;
        this.m_ScrollingCanvas.y += _loc3_;
        this.RANGE_GLOW_FILTER.blurX = MapRoom3Window.RANGE_GLOW_BLUR_X * this.m_ScrollingCanvas.scaleX;
        this.RANGE_GLOW_FILTER.blurY = MapRoom3Window.RANGE_GLOW_BLUR_Y * this.m_ScrollingCanvas.scaleY;
        this.m_RangeGlowLayer.filters = [this.RANGE_GLOW_FILTER];
        this.MOUSEOVER_RANGE_GLOW_FILTER.blurX = MapRoom3Window.RANGE_GLOW_BLUR_X * this.m_ScrollingCanvas.scaleX;
        this.MOUSEOVER_RANGE_GLOW_FILTER.blurY = MapRoom3Window.RANGE_GLOW_BLUR_Y * this.m_ScrollingCanvas.scaleY;
        this.m_MouseoverRangeGlowLayer.filters = [this.MOUSEOVER_RANGE_GLOW_FILTER];
        this.Resize();
    }

    public Resize(): void {
        this.m_ScrollingCanvas.x = this.AdjustHorizontalBounds(this.m_ScrollingCanvas.x | 0);
        this.m_ScrollingCanvas.y = this.AdjustVerticalBounds(this.m_ScrollingCanvas.y | 0);
        this.AdjustCenterPoint();
        this.SetMousedoverCellGraphic(null);
        this.SetSelectedCellGraphic(null);
        this.UpdateMap(true);
    }

    private AdjustHorizontalBounds(param1: int): int {
        let _loc2_: int = 0;
        _loc2_ = (MapRoom3CellGraphic.HEX_WIDTH * this.m_ScrollingCanvas.scaleX) | 0;
        let _loc3_: int = (GLOBAL.StageX + _loc2_ * 1.5) | 0;
        let _loc4_: int = (GLOBAL.StageX + GLOBAL.StageWidth - this.m_MapData.mapWidth * _loc2_ - _loc2_ * 2) | 0;
        if (param1 > _loc3_) {
            param1 = _loc3_;
        }
        if (param1 < _loc4_) {
            param1 = _loc4_;
        }
        return param1;
    }

    private AdjustVerticalBounds(param1: int): int {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        _loc2_ = (MapRoom3CellGraphic.HEX_HEIGHT * this.m_ScrollingCanvas.scaleY) | 0;
        _loc3_ = (MapRoom3CellGraphic.HEX_HEIGHT_OVERLAP * this.m_ScrollingCanvas.scaleY) | 0;
        let _loc4_: int = (GLOBAL.StageY + _loc2_ * 2) | 0;
        let _loc5_: int = (GLOBAL.StageY + GLOBAL.StageHeight - this.m_MapData.mapHeight * _loc3_ - _loc2_ * 3 + _loc3_) | 0;
        if (param1 > _loc4_) {
            param1 = _loc4_;
        }
        if (param1 < _loc5_) {
            param1 = _loc5_;
        }
        return param1;
    }

    private DrawBackground(): void {
        if (this.m_BackgroundImage == null) {
            return;
        }
        let _loc1_: Matrix = new Matrix();
        _loc1_.translate(this.m_ScrollingCanvas.x / this.m_ScrollingCanvas.scaleX % this.m_BackgroundImage.width, this.m_ScrollingCanvas.y / this.m_ScrollingCanvas.scaleY % this.m_BackgroundImage.height);
        _loc1_.scale(this.m_ScrollingCanvas.scaleX, this.m_ScrollingCanvas.scaleY);
        this.graphics.clear();
        this.graphics.beginBitmapFill(this.m_BackgroundImage, _loc1_, true);
        this.graphics.drawRect(GLOBAL.StageX, GLOBAL.StageY, GLOBAL.StageWidth, GLOBAL.StageHeight);
        this.graphics.endFill();
    }

    private DrawRangeAlphaLayer(param1: Sprite): void {
        param1.graphics.clear();
        param1.graphics.beginFill(16777215, MapRoom3Window.RANGE_LAYER_ALPHA);
        param1.graphics.drawRect((GLOBAL.StageX - this.m_ScrollingCanvas.x) / this.m_ScrollingCanvas.scaleX, (GLOBAL.StageY - this.m_ScrollingCanvas.y) / this.m_ScrollingCanvas.scaleY, GLOBAL.StageWidth / this.m_ScrollingCanvas.scaleX, GLOBAL.StageHeight / this.m_ScrollingCanvas.scaleY);
        param1.graphics.endFill();
    }
}
