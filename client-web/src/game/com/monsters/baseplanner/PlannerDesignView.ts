import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Graphics, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Dictionary, getTimer } from "flash/utils";
import { planWorkerAvailable, planWorkerEstimate } from "flash/_planPaths";
import { BASE, BasePlannerNodeEvent, BasePlannerPopup, BasePlannerPopup_xSpot, BaseTemplateNode, BuildingItem, Checkbox, DashedLine, GAME, GLOBAL, HitTestBitmap, IoMapUi, IoPlanPaths, IoPlanShare, IoTd, KEYS, PlannerNode, PlannerTemplate, STORE } from "@game";

export class PlannerDesignView extends Sprite {
    static {
        as3.fields(this, { _canvas: null, _layerSelectBuildings: null, _layerSelectRanges: null, _layerShroud: null, _layerSetBuildings: null, _layerSetRanges: null, _layerGround: null, displayData: null, displayInventory: null, fontSize: null, xSpot: null, zoomMax: 2, zoomMin: 0.25, zoomStep: 0.25, rangeCheckboxesFlags: 0, _isAddingBuilding: false, _dragging: false, _dragged: false, _dragOffset: null, _dragPoint: null, _windowRect: null, GRASSCOLOR: 6723891, BOUNDS_LINE_COLOR: 16777215, BOUNDS_DASHEDLINE_COLOR: 15658734, BOUNDS_LINE_WEIGHT: 2, MAX_YARD_DIMENSIONS: null, YARD_EXPANSIONS: null, currentTool: "selectmove", toolTarget: null, _selectMoveDragging: false, _selectMoveTarget: null, _selectMoveInventoryBuilding: false, _selectMoveDragPoint: null, _ioDragW: NaN, _ioDragH: NaN, ioTakeWall: null, ioWallsLeft: null, ioPlacingLine: false, ioStatus: null, _ioSelection: null, _ioOverlay: null, _ioStart: null, _ioGroupDragging: false, _ioGroupAnchor: null, _ioGroupOffset: null, _ioGroupOrigins: null, _ioGroupMembers: null, _ioGroupLastDX: 0, _ioGroupLastDY: 0, _ioClickHandled: false, _ioWallSize: 0, _ioWallMode: "line", _ioGridOn: false, _ioGrid: null, _ioRulerOn: false, _ioRulerStart: null, _ioRulerLabel: null, _ioRuler: null, _ioRulerEnd: null, _ioRulerCells: NaN, _ioHoverItem: null, _ioHoverRange: null, _ioCoverOn: false, _ioCover: null, _ioCoverCounts: null, _ioCoverCols: 0, _ioCoverRows: 0, _ioCoverMissed: 0, _ioMovers: null, _ioMoversCount: 0, ioGhosts: null, ioGhostRoom: null, _ioGhostLayer: null, _ioGhostType: 0, _ioCompare: null, _ioCompareRows: null, _ioCompareCounts: null, _ioWallHover: null, _ioPathKind: null, _ioPathMarks: null, _ioPathResults: null, _ioPaths: null, _ioPathDirty: false, _ioPathLast: 0, _ioPathListening: false, _ioRemoved: false, _ioPathGen: 0, _ioPathShown: 0, _ioPathAsked: false });
    }

    public static zoomValue: number = 0.5;

    public static readonly CHECKBOX_GROUND: uint = 0;

    public static readonly CHECKBOX_AIR: uint = 1;

    public static readonly CHECKBOX_TRAP: uint = 2;

    private static readonly SIDEBAR_WIDTH: int = 140;

    private static readonly BOTTOMBAR_HEIGHT: int = 50;

    private static readonly SCROLL_ACTIVATION_PIXEL_THRESHOLD: int = 20;

    public static SHOULD_SHOW_MOREINFO: boolean = true;

    public static SHOULD_SHOW_FORTIFICATION: boolean = false;

    public static readonly BUILDING_CLICK: string = "building_clicked";

    public static readonly BUILDING_OVER: string = "building_over";

    public static readonly BUILDING_OUT: string = "building_out";

    public static readonly BUILDING_PLACED: string = "building_placed";

    public static readonly CANVAS_CLICK: string = "view_clicked";

    public static readonly STATE_CHANGE: string = "design_statechange";

    private static readonly ADD_INVENTORY_PAINTMODE: boolean = true;

    public static readonly TOOL_SELECTMOVE: string = "selectmove";

    public static readonly TOOL_STORE: string = "storebuilding";

    /** Inferno-only planner tools (see the "Planner tools" section at the end of this class). */
    public static readonly TOOL_AREASELECT: string = "areaselect";

    public static readonly TOOL_WALLLINE: string = "wallline";

    /** Inferno-only (QoL #685): a click on the plan puts a planned building (a "ghost") there, or takes one away. */
    public static readonly TOOL_IOGHOST: string = "ioghost";

    /** Inferno-only (20 October): placing a path estimate's monster (IoPlanPaths), of the kind ioPathKind. */
    public static readonly TOOL_IOPATH: string = "iopath";

    /** The path estimates' colours: towers, loot, anything. */
    public static readonly IO_PATH_COLOURS: any = { "towers": 0xFF5A3C, "loot": 0xFFD24A, "any": 0x5FC8FF };

    public static readonly MOUSE_POSITION_SNAP_THRESHHOLD: int = 5;

    /** Slack, in planner units, around a footprint before two buildings count as far apart. */
    private static readonly IO_NEAR: number = 4;

    private static readonly IO_SELECT_GLOW: GlowFilter = new GlowFilter(0xFFD24A, 1, 8, 8, 4, 2);

    /** Inferno-only (QoL #689): the range circles' colours (ground, air, traps). */
    public static readonly IO_RANGE_GROUND: uint = 0xFF9A2E;

    public static readonly IO_RANGE_AIR: uint = 0x4FC8FF;

    public static readonly IO_RANGE_TRAP: uint = 0xE048FF;

    /** Inferno-only (QoL #692, #691): one cell of the planner's grid, in the yard's units (a wall is two across). */
    public static readonly IO_CELL: int = 10;

    /** How near (yard units) an edge pulls a building being moved flush to it, with the grid on. */
    private static readonly IO_EDGE_SNAP: number = 8;
    private _canvas: Sprite;
    private _layerSelectBuildings: Sprite;
    private _layerSelectRanges: Sprite;
    private _layerShroud: Sprite;
    private _layerSetBuildings: Sprite;
    private _layerSetRanges: Sprite;
    private _layerGround: Sprite;
    private displayData: Vector<PlannerNode>;
    private displayInventory: Vector<BuildingItem>;
    private fontSize: Point;
    public xSpot: MovieClip;
    public zoomMax: number;
    public zoomMin: number;
    public zoomStep: number;
    private rangeCheckboxesFlags: uint;
    private _isAddingBuilding: boolean;
    public _dragging: boolean;
    public _dragged: boolean;
    private _dragOffset: Point;
    public _dragPoint: Point;
    public _windowRect: Rectangle;
    private GRASSCOLOR: uint;
    private BOUNDS_LINE_COLOR: uint;
    private BOUNDS_DASHEDLINE_COLOR: uint;
    private BOUNDS_LINE_WEIGHT: uint;
    private MAX_YARD_DIMENSIONS: Point;
    private YARD_EXPANSIONS: any[];
    public currentTool: string;
    public toolTarget: any;
    public _selectMoveDragging: boolean;
    public _selectMoveTarget: BuildingItem;
    public _selectMoveInventoryBuilding: boolean;
    public _selectMoveDragPoint: Point;
    private _ioDragW: number;
    private _ioDragH: number;
    // ---------------------------------------------------------------------------------------------
    // Planner tools (inferno-only): select an area, move the selection together, flip / rotate,
    // and lay a straight line of walls from storage. Buttons: BasePlannerPopup.ioAddTools().
    // ---------------------------------------------------------------------------------------------
    /** Set by the popup: returns a wall from storage (not yet placed), or null when there are none left. */
    public ioTakeWall: Function;
    /** Set by the popup: how many walls are in storage. */
    public ioWallsLeft: Function;
    /** True while the wall line places its walls (the storage list then takes out exactly those). */
    public ioPlacingLine: boolean;
    /** Set by the popup: shows a line in the toolbar's status strip. */
    public ioStatus: Function;
    private _ioSelection: Vector<BuildingItem>;
    private _ioOverlay: Sprite;
    private _ioStart: Point;
    private _ioGroupDragging: boolean;
    private _ioGroupAnchor: BuildingItem;
    private _ioGroupOffset: Point;
    private _ioGroupOrigins: Vector<Point>;
    /** The selection as a set, for the overlap checks of a group move (see ioValidateInGroup). */
    private _ioGroupMembers: Dictionary;
    /** The snapped offset last applied by ioGroupTick: moves that don't change it change nothing. */
    private _ioGroupLastDX: int;
    private _ioGroupLastDY: int;
    private _ioClickHandled: boolean;
    // ---- Wall line
    private _ioWallSize: int;
    /** (QoL #695) The walls tool's drag: "line" (walls along it), "erase" (Shift: walls under it to storage), "box" (Alt: its outline). */
    private _ioWallMode: string;
    // ---- (QoL #692) The grid, and (QoL #691) the ruler
    private _ioGridOn: boolean;
    private _ioGrid: Sprite;
    private _ioRulerOn: boolean;
    private _ioRulerStart: Point;
    private _ioRulerLabel: TextField;
    /** The ruler's line and its label, over the plan. */
    private _ioRuler: Sprite;
    private _ioRulerEnd: Point;
    /** The ruler's last distance, in cells (NaN: nothing measured). */
    private _ioRulerCells: number;
    /** (QoL #689) The building whose own range is drawn (under the pointer, or being moved), and that drawing. */
    private _ioHoverItem: BuildingItem;
    private _ioHoverRange: Sprite;
    /** (QoL #690) The coverage map: on, its shading (on the ground), how many towers reach each square, and the buildings none reaches. */
    private _ioCoverOn: boolean;
    private _ioCover: Sprite;
    private _ioCoverCounts: number[];
    private _ioCoverCols: int;
    private _ioCoverRows: int;
    private _ioCoverMissed: int;
    /** (QoL #683) Apply's movers, marked while its confirmation is up, and how many. */
    private _ioMovers: Sprite;
    private _ioMoversCount: int;
    /** (QoL #685) Set by the popup: the plan's planned buildings (PlannerTemplate.ioGhosts), drawn under the buildings. */
    public ioGhosts: any[];
    /** (QoL #685) Set by the popup: how many more of a kind can be planned. */
    public ioGhostRoom: Function;
    private _ioGhostLayer: Sprite;
    private _ioGhostType: int;
    /** (QoL #693) Another plan over this one: its drawing, its places ([type, x, y, id?]), and what differs. */
    private _ioCompare: Sprite;
    private _ioCompareRows: any[];
    private _ioCompareCounts: any;
    /** (20 October) The walls tool's one wall under the pointer, where a line would start. */
    private _ioWallHover: Sprite;
    /** (20 October) The path estimates: the kind being placed, where each kind's monster stands ({kind: Point}), what
     * each worked out ({kind: IoPlanPaths.estimate}), their drawing, and its redrawing (at most every 120 ms). */
    private _ioPathKind: string;
    private _ioPathMarks: any;
    private _ioPathResults: any;
    private _ioPaths: Sprite;
    private _ioPathDirty: boolean;
    private _ioPathLast: int;
    private _ioPathListening: boolean;

    public $ctor(param1?: Vector<PlannerNode>): void {
        this.MAX_YARD_DIMENSIONS = new Point(3240, 2600);
        this.YARD_EXPANSIONS = [new Point(1000, 800), new Point(1100, 880), new Point(1220, 980), new Point(1340, 1080), new Point(1480, 1180), new Point(1620, 1300), new Point(1780, 1420)];
        this._ioDragW = NaN;
        this._ioDragH = NaN;
        this._ioSelection = new Vector<BuildingItem>(0, false, BuildingItem);
        this._ioGroupLastDX = int.MIN_VALUE;
        this._ioGroupLastDY = int.MIN_VALUE;
        this.fontSize = new Point(14, 12);
        this._windowRect = new Rectangle(35, 65, 565, 425);
        super.$ctor();
        this.displayData = param1;
    }

    public setup(): void {
        this.clearAllLayers();
        if (this._canvas) {
            this.clearLayer(this._canvas);
        }
        this._canvas = new Sprite();
        this.addChild(this._canvas);
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.canvasDragStart));
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onCanvasClick));
        if (GLOBAL.INFERNO_ONLY) {
            // (20 October: the walls tool's wall under the pointer)
            this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioHoverMove));
            this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.ioHoverOut));
            this._ioWallHover = null;
            this._ioPaths = null;
        }
        this._canvas.addChild(this._layerGround);
        this._canvas.addChild(this._layerSetBuildings);
        this._canvas.addChild(this._layerSetRanges);
        this._canvas.addChild(this._layerShroud);
        this._canvas.addChild(this._layerSelectRanges);
        this._canvas.addChild(this._layerSelectBuildings);
        this.setZoom(PlannerDesignView.zoomValue);
        this.centerView();
        this.displayInventory = new Vector<BuildingItem>(0, false, BuildingItem);
        this.fillGrass(this._layerGround);
        this.drawYardBounds();
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #692: the grid over the ground; QoL #691: a measure from before is gone with the old view)
            if (this._ioGridOn) {
                this.ioDrawGrid();
            }
            this.ioRulerClear();
            this._ioHoverItem = null;
        }
        this.populateBuildingItems(this.displayData);
        this.drawRanges();
        // (Inferno-only, QoL #685, #693: the planned buildings, and a plan compared with this one)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioDrawGhosts();
            this.ioDrawCompare();
        }
        this.recenter();
    }

    public centerView(): void {
        this._canvas.x = 260;
        this._canvas.y = 290;
    }

    public populateBuildingItems(param1: Vector<PlannerNode>): void {
        let _loc4_: BuildingItem = null;
        this._ioSelection = new Vector<BuildingItem>(0, false, BuildingItem);
        this._ioGroupDragging = false;
        let _loc2_: int = 1;
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            (_loc4_ = new BuildingItem(as3.vget(param1, _loc3_))).addEventListener(PlannerDesignView.BUILDING_CLICK, as3.bind(this, this.onBuildingClick));
            _loc4_.addEventListener(PlannerDesignView.BUILDING_OVER, as3.bind(this, this.onBuildingOver));
            _loc4_.addEventListener(PlannerDesignView.BUILDING_OUT, as3.bind(this, this.onBuildingOut));
            this._layerSetBuildings.addChild(_loc4_);
            this.displayInventory.push(_loc4_);
            _loc3_++;
        }
    }

    private drawYardBounds(): void {
        let _loc5_: Rectangle = null;
        let _loc6_: Rectangle = null;
        let _loc8_: Sprite = null;
        let _loc9_: DashedLine = null;
        let _loc1_: int = 1;
        if (STORE._storeData.ENL) {
            _loc1_ = (STORE._storeData.ENL.q + 1) | 0;
        }
        let _loc2_: int = 0;
        if (STORE._storeData.ENL) {
            _loc2_ = STORE._storeData.ENL.q | 0;
        }
        let _loc3_: Point = new Point();
        let _loc4_: Point = new Point();
        _loc3_ = as3.cast(this.YARD_EXPANSIONS[_loc2_], Point);
        _loc4_ = as3.cast(this.YARD_EXPANSIONS[Math.min(_loc2_ + 1, this.YARD_EXPANSIONS.length - 1)], Point);
        if (GLOBAL.INFERNO_ONLY) {
            // Draw the yard the game is really using (STORE.ProcessPurchases works it out from the
            // expansions bought, ENLI included) and, while one is left to buy, the next size up,
            // worked out the same way: 10% more, rounded up to whole 20s.
            _loc2_ = GLOBAL.yardExpansionsBought;
            _loc3_ = new Point(GLOBAL._mapWidth, GLOBAL._mapHeight);
            _loc4_ = new Point(Math.ceil(GLOBAL._mapWidth * 1.1 / 20) * 20, Math.ceil(GLOBAL._mapHeight * 1.1 / 20) * 20);
        }
        _loc5_ = new Rectangle(-_loc3_.x / 2, -_loc3_.y / 2, _loc3_.x, _loc3_.y);
        if (GLOBAL.INFERNO_ONLY ? _loc2_ < GLOBAL.yardExpansionsMax : Math.min(_loc2_ + 1, this.YARD_EXPANSIONS.length - 1) > _loc2_) {
            _loc6_ = new Rectangle(-_loc4_.x / 2, -_loc4_.y / 2, _loc4_.x, _loc4_.y);
        }
        if (Boolean(_loc6_) && !BASE.isOutpost) {
            (_loc8_ = new Sprite()).graphics.beginFill(16777215, 0.25);
            _loc8_.graphics.drawRect(_loc6_.x, _loc6_.y, _loc6_.width, _loc6_.height);
            _loc8_.graphics.endFill();
            this._layerGround.addChild(_loc8_);
            (_loc9_ = new DashedLine(this.BOUNDS_LINE_WEIGHT, this.BOUNDS_DASHEDLINE_COLOR, new Array(8, 4, 2, 4))).moveTo(_loc6_.x, _loc6_.y);
            _loc9_.lineTo(_loc6_.x + _loc6_.width, _loc6_.y);
            _loc9_.lineTo(_loc6_.x + _loc6_.width, _loc6_.y + _loc6_.height);
            _loc9_.lineTo(_loc6_.x, _loc6_.y + _loc6_.height);
            _loc9_.lineTo(_loc6_.x, _loc6_.y);
            this._layerGround.addChild(_loc9_);
        }
        let _loc7_: Sprite = null;
        (_loc7_ = new Sprite()).graphics.lineStyle(this.BOUNDS_LINE_WEIGHT, this.BOUNDS_LINE_COLOR, 1);
        _loc7_.graphics.beginFill(16777215, 0.25);
        _loc7_.graphics.drawRect(_loc5_.x, _loc5_.y, _loc5_.width, _loc5_.height);
        _loc7_.graphics.endFill();
        this._layerGround.addChild(_loc7_);
    }

    public setZoom(param1: number): void {
        if (param1 > 0 && param1 < 10) {
            PlannerDesignView.zoomValue = param1;
            this._canvas.scaleX = this._canvas.scaleY = PlannerDesignView.zoomValue;
            this.dealWithZoomReposition();
            // (Inferno-only, QoL #692: the grid's finest lines only while they are far enough apart to see; QoL #691:
            // the ruler's line and label the same size on the screen at any zoom)
            if (GLOBAL.INFERNO_ONLY && this._ioGridOn && this._ioGrid && this._ioGrid.parent == this._layerGround) {
                this.ioDrawGrid();
            }
            if (GLOBAL.INFERNO_ONLY && this._ioRuler && this._ioRuler.parent == this._canvas) {
                this.ioRulerDraw();
            }
            // (20 October: the path estimates' lines and marks the same size on the screen at any zoom)
            if (GLOBAL.INFERNO_ONLY && this._ioPaths && this._ioPaths.parent == this._canvas) {
                // (21 October: drawn again at the new size; worked out again only when the plan has changed)
                this.ioPaintPaths();
            }
        }
    }

    private dealWithZoomReposition(): void {
        this._dragOffset = new Point(this._canvas.x - this.mouseX, this._canvas.y - this.mouseY);
        this.checkDragBounds();
    }

    public fillGrass(param1: Sprite): void {
        let _loc2_: Sprite = new Sprite();
        _loc2_.graphics.beginFill(this.GRASSCOLOR, 1);
        _loc2_.graphics.drawRect(0, 0, this.MAX_YARD_DIMENSIONS.x, this.MAX_YARD_DIMENSIONS.y);
        _loc2_.graphics.endFill();
        _loc2_.x = -(_loc2_.width / 2);
        _loc2_.y = -(_loc2_.height / 2);
        this.xSpot = new BasePlannerPopup_xSpot();
        this.xSpot.x = _loc2_.width / 2;
        this.xSpot.y = _loc2_.height / 2;
        this.xSpot.rotation = 45;
        _loc2_.addChild(this.xSpot);
        param1.addChild(_loc2_);
    }

    public onCanvasClick(param1: MouseEvent = null): void {
        if (this._ioClickHandled) {
            // The same click already reached a building (onBuildingClick runs first).
            this._ioClickHandled = false;
            return;
        }
        if (this._ioGroupDragging) {
            this.ioGroupDrop();
            return;
        }
        // (Inferno-only, QoL #685: planning a building; not after the view was dragged)
        if (GLOBAL.INFERNO_ONLY && this.currentTool == PlannerDesignView.TOOL_IOGHOST) {
            if (!this._dragged) {
                this.ioGhostClick();
            }
            return;
        }
        // (Inferno-only, 20 October: a path estimate's monster set down, or taken away with Shift)
        if (GLOBAL.INFERNO_ONLY && this.currentTool == PlannerDesignView.TOOL_IOPATH) {
            if (!this._dragged && this._ioPathKind) {
                if (param1 && param1.shiftKey) {
                    this.ioPathRemove(this._ioPathKind);
                } else {
                    this.ioPathPlace(this._ioPathKind, this.ioCanvasPoint());
                }
            }
            return;
        }
        if (this.currentTool == PlannerDesignView.TOOL_SELECTMOVE) {
            if (this._selectMoveDragging) {
            }
        }
    }

    public canvasDragStart(param1: MouseEvent = null): void {
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT || this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            // (Inferno-only, QoL #695: with the walls tool, Shift-drag erases walls and Alt-drag draws a box)
            this._ioWallMode = GLOBAL.INFERNO_ONLY && param1 ? (param1.shiftKey ? "erase" : (param1.altKey ? "box" : "line")) : "line";
            this.ioToolStart();
            return;
        }
        // (Inferno-only, QoL #691: with the ruler on, a drag on empty ground measures instead of moving the view; a
        // press on a building is as before)
        if (GLOBAL.INFERNO_ONLY && this._ioRulerOn && !this._selectMoveDragging && !this._ioGroupDragging && !this._isAddingBuilding && !this.ioOnBuilding(param1)) {
            // (and the release, over a building or not, is no click on one: BuildingItem.onMouseUp)
            this._dragged = true;
            this.ioRulerStart();
            return;
        }
        this._dragging = true;
        this._dragged = false;
        this._dragOffset = new Point(this._canvas.x - this.mouseX, this._canvas.y - this.mouseY);
        this._dragPoint = new Point(this._canvas.x, this._canvas.y);
        // (the canvas's size, once for the drag: measuring every building in it on every move of the pointer
        // was most of what dragging the view cost; fps pass, 4 October)
        this._ioDragW = this._canvas.width;
        this._ioDragH = this._canvas.height;
        // (while the view is dragged nothing in it changes: drawn once as a bitmap and moved, not every
        // building drawn again every frame; fps pass, 4 October)
        if (GLOBAL.INFERNO_ONLY) {
            this._canvas.cacheAsBitmap = true;
        }
        GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.canvasDrag));
        GAME._instance.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.canvasDragStop));
        GAME._instance.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.canvasDragStop));
    }

    public canvasDragStop(param1: MouseEvent = null): void {
        this._dragging = false;
        if (GLOBAL.INFERNO_ONLY) {
            this._canvas.cacheAsBitmap = false;
        }
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.canvasDrag));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.canvasDragStop));
        GAME._instance.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.canvasDragStop));
    }

    public canvasDrag(param1: Event = null): void {
        if (this._dragged) {
            this.checkDragBounds();
            return;
        }
        let _loc2_: number = this._canvas.x - (this.mouseX + this._dragOffset.x);
        let _loc3_: number = this._canvas.y - (this.mouseY + this._dragOffset.y);
        if (Math.abs(_loc2_) > PlannerDesignView.SCROLL_ACTIVATION_PIXEL_THRESHOLD || Math.abs(_loc3_) > PlannerDesignView.SCROLL_ACTIVATION_PIXEL_THRESHOLD) {
            this._dragOffset.x += _loc2_;
            this._dragOffset.y += _loc3_;
            this.checkDragBounds();
        }
    }

    private checkDragBounds(): void {
        let cw: number = this._dragging && !isNaN(this._ioDragW) ? this._ioDragW : this._canvas.width;
        let chh: number = this._dragging && !isNaN(this._ioDragH) ? this._ioDragH : this._canvas.height;
        let _loc1_: number = this.mouseX + this._dragOffset.x;
        if (_loc1_ > cw / 2) {
            _loc1_ = cw / 2;
        } else if (_loc1_ < GLOBAL._SCREEN.width - cw / 2 - PlannerDesignView.SIDEBAR_WIDTH) {
            _loc1_ = GLOBAL._SCREEN.width - cw / 2 - PlannerDesignView.SIDEBAR_WIDTH;
        }
        if (cw < GLOBAL._SCREEN.width) {
            _loc1_ = GLOBAL._SCREEN.width / 2 - PlannerDesignView.SIDEBAR_WIDTH;
        }
        this._canvas.x = _loc1_;
        _loc1_ = this.mouseY + this._dragOffset.y;
        if (_loc1_ > chh / 2) {
            _loc1_ = chh / 2;
        } else if (_loc1_ < GLOBAL._SCREEN.height - chh / 2 - PlannerDesignView.BOTTOMBAR_HEIGHT) {
            _loc1_ = GLOBAL._SCREEN.height - chh / 2 - PlannerDesignView.BOTTOMBAR_HEIGHT;
        }
        if (chh < GLOBAL._SCREEN.height) {
            _loc1_ = GLOBAL._SCREEN.height / 2 - PlannerDesignView.BOTTOMBAR_HEIGHT;
        }
        this._canvas.y = _loc1_;
        this._dragged = true;
    }

    public recenter(): void {
        this._canvas.x = GLOBAL._SCREEN.width / 2 - PlannerDesignView.SIDEBAR_WIDTH;
        this._canvas.y = GLOBAL._SCREEN.height / 2 - PlannerDesignView.BOTTOMBAR_HEIGHT;
    }

    public addInventoryItem(param1: PlannerNode): void {
        let _loc2_: BuildingItem = null;
        let _loc3_: Point = null;
        let _loc4_: any = false;
        if (!this._isAddingBuilding) {
            this._isAddingBuilding = true;
            _loc2_ = new BuildingItem(param1);
            _loc2_.addEventListener(PlannerDesignView.BUILDING_CLICK, as3.bind(this, this.onBuildingClick));
            _loc2_.addEventListener(PlannerDesignView.BUILDING_OVER, as3.bind(this, this.onBuildingOver));
            _loc2_.addEventListener(PlannerDesignView.BUILDING_OUT, as3.bind(this, this.onBuildingOut));
            _loc2_.x = 0;
            _loc2_.y = 0;
            _loc3_ = new Point(0, 0);
            if (this._dragPoint) {
                _loc3_ = this._dragPoint;
            }
            _loc2_.x = -(_loc2_.mc.width / 2);
            _loc2_.y = -(_loc2_.mc.height / 2);
            _loc2_.x += ((this.mouseX - this._canvas.x) / this._canvas.scaleX) | 0;
            _loc2_.y += ((this.mouseY - this._canvas.y) / this._canvas.scaleY) | 0;
            this._layerSetBuildings.addChild(_loc2_);
            this.displayInventory.push(_loc2_);
            this.addMode(_loc2_);
        } else {
            _loc4_ = param1.type == this._selectMoveTarget.node.type;
            if (this._selectMoveDragging) {
                this.cancelAddInventory(this._selectMoveTarget);
                if (!_loc4_) {
                    this.addInventoryItem(param1);
                }
            }
        }
    }

    public cancelAddInventory(param1: BuildingItem): void {
        this._selectMoveDragging = false;
        this._isAddingBuilding = false;
        this._selectMoveInventoryBuilding = false;
        this.currentTool = PlannerDesignView.TOOL_SELECTMOVE;
        this.removeBuildingItem(param1);
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.dragBuildingTick));
    }

    public addMode(param1: BuildingItem): void {
        this.currentTool = PlannerDesignView.TOOL_SELECTMOVE;
        this.toolTarget = param1;
        this.dragBuilding(param1, true);
    }

    public setTool(param1: string): void {
        if (this.currentTool == param1) {
            return;
        }
        this.currentTool = param1;
        if (GLOBAL.INFERNO_ONLY && param1 != PlannerDesignView.TOOL_WALLLINE) {
            this.ioHoverOut();
        }
        this.dispatchEvent(new Event(BasePlannerPopup.DESIGN_TOOL_UPDATE));
        if (param1) {
            this.removeSelection();
        }
    }

    public removeSelection(): void {
        if (this._selectMoveTarget) {
            this.cancelDragBuilding(this._selectMoveTarget);
        }
    }

    public onBuildingClick(param1: BasePlannerNodeEvent): void {
        let _loc2_: BuildingItem = null;
        let _loc3_: PlannerNode = null;
        this.toolTarget = as3.as(param1.target, Object);
        // ("!x instanceof y" is "(!x) instanceof y", never true: a click on anything but a building went on and failed
        // on its props)
        if (!(param1.target instanceof BuildingItem)) {
            return;
        }
        _loc2_ = as3.as(param1.target, BuildingItem);
        if (_loc2_.props.type == "enemy") {
            return;
        }
        // Inferno-only (Hellgate Defense): the arena's own walls and the Hall stay put; towers move but aren't stored
        if (IoTd.plannerLocked(_loc2_.node) && !this._ioGroupDragging && !this._selectMoveDragging) {
            this.ioSay(KEYS.Get("io_t3m_pl_arena_fixed"));
            return;
        }
        if (this.currentTool == PlannerDesignView.TOOL_STORE && IoTd.plannerKept(_loc2_.node) && !this._ioGroupDragging && !this._selectMoveDragging) {
            this.ioSay(KEYS.Get("io_t3m_pl_tower_nostore"));
            return;
        }
        if (this._ioGroupDragging) {
            this._ioClickHandled = true;
            this.ioGroupDrop();
            return;
        }
        if (this.currentTool == PlannerDesignView.TOOL_SELECTMOVE && !this._selectMoveDragging && this._ioSelection.length > 1 && this._ioSelection.indexOf(_loc2_) != -1) {
            this._ioClickHandled = true;
            this.ioGroupPickUp(_loc2_);
            return;
        }
        if (this.currentTool == PlannerDesignView.TOOL_SELECTMOVE || this._selectMoveDragging) {
            this.dragBuilding(_loc2_);
        } else if (this.currentTool == PlannerDesignView.TOOL_STORE) {
            this.storeBuilding(_loc2_);
            this.redrawRanges();
        }
    }

    public onBuildingOver(param1: BasePlannerNodeEvent): void {
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT, param1.node));
        // (Inferno-only, QoL #689: a tower's own range while the pointer is on it)
        if (GLOBAL.INFERNO_ONLY && !this._selectMoveDragging) {
            this.ioShowHoverRange(as3.as(param1.target, BuildingItem));
        }
    }

    public onBuildingOut(param1: BasePlannerNodeEvent): void {
        if (!this._selectMoveDragging) {
            this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT_HIDE, param1.node));
            if (GLOBAL.INFERNO_ONLY) {
                this.ioHideHoverRange();
            }
        }
    }

    public storeBuilding(param1: BuildingItem): void {
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_STORE, param1.node));
        this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        this.removeBuildingItem(param1);
    }

    public spliceDisplayData(param1: PlannerNode): void {
        this.displayData.splice(this.displayData.indexOf(param1), 1);
    }

    public removeBuildingItem(param1: BuildingItem): void {
        let _loc2_: int = 0;
        // (Inferno-only, QoL #689: nor the range of one taken off the plan)
        if (GLOBAL.INFERNO_ONLY && param1 && param1 == this._ioHoverItem) {
            this.ioHideHoverRange();
        }
        while (_loc2_ < this.displayInventory.length) {
            if (param1 == as3.vget(this.displayInventory, _loc2_)) {
                as3.vget(this.displayInventory, _loc2_).parent.removeChild(as3.vget(this.displayInventory, _loc2_));
                this.displayInventory.splice(_loc2_, 1);
                param1 = null;
                return;
            }
            _loc2_++;
        }
    }

    public dragBuilding(param1: BuildingItem, param2: boolean = false): void {
        if (this._selectMoveDragging && this._selectMoveTarget != param1) {
            return;
        }
        this._selectMoveTarget = param1;
        if (param2) {
            this._selectMoveInventoryBuilding = true;
            if (this.currentTool) {
                this.setTool("");
            }
        }
        if (!this._selectMoveDragging) {
            this.startDragBuilding(param1);
        } else {
            this.stopDragBuilding(param1);
        }
    }

    public startDragBuilding(param1: BuildingItem): void {
        let _loc2_: boolean = false;
        if (this._selectMoveDragging) {
            return;
        }
        this._selectMoveDragging = true;
        this.sortBuildingOrder(param1, "front");
        param1.setPositionReference();
        if (_loc2_) {
            this._selectMoveDragPoint = new Point(param1.x - (this.mouseX - this._canvas.x) / this._canvas.scaleX, param1.y - (this.mouseY - this._canvas.y) / this._canvas.scaleY);
        } else {
            this._selectMoveDragPoint = new Point(0 - param1.widthsize / 2 * param1.scale, 0 - param1.widthsize / 2 * param1.scale);
        }
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.dragBuildingTick));
    }

    public stepDragBuilding(param1: BuildingItem): void {
    }

    public dragBuildingTick(param1: Event): void {
        this._selectMoveTarget.toggleInvalid(!this.validateBuilding(this._selectMoveTarget));
        this._selectMoveTarget.x = ((((this.mouseX - this._canvas.x) / this._canvas.scaleX + this._selectMoveDragPoint.x) / PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) | 0) * PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        this._selectMoveTarget.y = ((((this.mouseY - this._canvas.y) / this._canvas.scaleY + this._selectMoveDragPoint.y) / PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) | 0) * PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        // (Inferno-only, QoL #692: with the grid on, pulled flush to a building's edge or the yard's when near one)
        if (GLOBAL.INFERNO_ONLY && this._ioGridOn) {
            this.ioEdgeSnap(this._selectMoveTarget);
            this._selectMoveTarget.toggleInvalid(!this.validateBuilding(this._selectMoveTarget));
        }
        this.redrawRanges();
        // (Inferno-only, QoL #689: its own range goes with it)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioShowHoverRange(this._selectMoveTarget);
        }
    }

    public stopDragBuilding(param1: BuildingItem, param2: boolean = false): void {
        this._selectMoveDragging = false;
        this._isAddingBuilding = false;
        // Inferno-only (7 October): put down on the planner's 5-unit steps, as the yard's own are. A building
        // taken from storage and put down before the pointer moved kept the odd spot it was first drawn at
        // (half its size off the pointer), which Apply's check rounded and the yard didn't.
        if (GLOBAL.INFERNO_ONLY) {
            param1.x = PlannerDesignView.ioSnap(param1.x);
            param1.y = PlannerDesignView.ioSnap(param1.y);
        }
        if (this.validateBuilding(param1)) {
            param1.toggleInvalid(false);
            param1.setPositionReference();
            this.updateNodeReference(param1);
            if (this._selectMoveInventoryBuilding) {
                this.displayData.push(param1.node);
                this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_PLACE, param1.node));
            }
            this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        } else {
            if (this._selectMoveInventoryBuilding) {
                if (PlannerDesignView.ADD_INVENTORY_PAINTMODE && !param2) {
                    this._selectMoveDragging = true;
                    this._isAddingBuilding = true;
                    return;
                }
                this.removeBuildingItem(param1);
                this.dispatchEvent(new Event(BasePlannerPopup.DESIGN_CLEAR_EXPLORER));
            }
            param1.resetPositionReference();
            this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
        }
        if (!this._selectMoveDragging) {
            this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.dragBuildingTick));
            param1.toggleInvalid(false);
            this._selectMoveInventoryBuilding = false;
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        }
    }

    public cancelDragBuilding(param1: BuildingItem): void {
        this._selectMoveDragging = false;
        this._isAddingBuilding = false;
        // (Inferno-only, QoL #689: its own range isn't left where it was carried to)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioHideHoverRange();
        }
        if (this._selectMoveInventoryBuilding) {
            this.removeBuildingItem(param1);
            this.dispatchEvent(new Event(BasePlannerPopup.DESIGN_CLEAR_EXPLORER));
        }
        param1.resetPositionReference();
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
        if (!this._selectMoveDragging) {
            this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.dragBuildingTick));
            param1.toggleInvalid(false);
            this._selectMoveInventoryBuilding = false;
            this._selectMoveTarget = null;
        }
    }

    public updateNodeReference(param1: BuildingItem): void {
        let _loc2_: int = 0;
        while (_loc2_ < this.displayData.length) {
            if (as3.vget(this.displayData, _loc2_) == param1.node) {
                as3.vget(this.displayData, _loc2_).x = param1.node.x;
                as3.vget(this.displayData, _loc2_).y = param1.node.y;
                return;
            }
            _loc2_++;
        }
    }

    public sortBuildingOrder(param1: BuildingItem, param2: string = "front"): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc3_: Sprite = as3.as(param1.parent, Sprite);
        if (!_loc3_) {
            return;
        }
        switch (param2) {
            case "back":
            case "bottom":
                _loc3_.setChildIndex(param1, 0);
                break;
            case "front":
            case "top":
            default:
                _loc3_.addChild(param1);
        }
    }

    /**
     * Inferno-only (7 October): do two of the plan's buildings overlap? Worked out from their footprints, in the
     * yard's own units (as the yard and Apply's check work it out), not from the pictures on the screen: the
     * pixel test's answer changed with the zoom (an overlap smaller than a pixel wasn't one), and the planner
     * could show a building as fitting where Apply then found it didn't.
     */
    public static ioOverlap(param1: BuildingItem, param2: BuildingItem): boolean {
        return param1.x < param2.x + param2.size.width * param2.scale && param2.x < param1.x + param1.size.width * param1.scale && param1.y < param2.y + param2.size.height * param2.scale && param2.y < param1.y + param1.size.height * param1.scale;
    }

    public validateBuilding(param1: BuildingItem): boolean {
        let _loc2_: int = 0;
        while (_loc2_ < this.displayInventory.length) {
            if (as3.vget(this.displayInventory, _loc2_) != param1) {
                if (GLOBAL.INFERNO_ONLY ? PlannerDesignView.ioOverlap(param1, as3.vget(this.displayInventory, _loc2_)) : HitTestBitmap.complexHitTestObject(param1.mc, as3.vget(this.displayInventory, _loc2_).mc)) {
                    return false;
                }
            }
            _loc2_++;
        }
        let _loc3_: int = 0;
        if (STORE._storeData.ENL) {
            _loc3_ = STORE._storeData.ENL.q | 0;
        }
        let _loc4_: Point = as3.cast(this.YARD_EXPANSIONS[_loc3_], Point);
        if (GLOBAL.INFERNO_ONLY) {
            // The same yard drawYardBounds() shows: the size the game really uses. The stock table
            // above could differ from it, so buildings were refused (or allowed) past the drawn edge.
            _loc4_ = new Point(GLOBAL._mapWidth, GLOBAL._mapHeight);
        }
        if (param1.category != BuildingItem.TYPE_DECORATION) {
            if (param1.x < -_loc4_.x / 2 || param1.y < -_loc4_.y / 2 || param1.x > _loc4_.x / 2 - param1.widthsize || param1.y > _loc4_.y / 2 - param1.widthsize) {
                return false;
            }
        } else if (param1.x < -this.MAX_YARD_DIMENSIONS.x / 2 || param1.y < -this.MAX_YARD_DIMENSIONS.y / 2 || param1.x > this.MAX_YARD_DIMENSIONS.x / 2 - param1.widthsize || param1.y > this.MAX_YARD_DIMENSIONS.y / 2 - param1.widthsize) {
            return false;
        }
        return true;
    }

    public Bounds(): void {
    }

    public clearAllLayers(): void {
        if (this._layerSelectBuildings) {
            this.clearLayer(this._layerSelectBuildings);
        }
        this._layerSelectBuildings = new Sprite();
        this._layerSelectBuildings.mouseEnabled = false;
        if (this._layerSelectRanges) {
            this.clearLayer(this._layerSelectRanges);
        }
        this._layerSelectRanges = new Sprite();
        this._layerSelectRanges.mouseEnabled = false;
        if (this._layerShroud) {
            this.clearLayer(this._layerShroud);
        }
        this._layerShroud = new Sprite();
        this._layerShroud.mouseEnabled = false;
        if (this._layerSetBuildings) {
            this.clearLayer(this._layerSetBuildings);
        }
        this._layerSetBuildings = new Sprite();
        this._layerSetBuildings.mouseEnabled = false;
        if (this._layerSetRanges) {
            this.clearLayer(this._layerSetRanges);
        }
        this._layerSetRanges = new Sprite();
        this._layerSetRanges.mouseEnabled = false;
        if (this._layerGround) {
            this.clearLayer(this._layerGround);
        }
        this._layerGround = new Sprite();
        this._layerGround.mouseEnabled = false;
    }

    public clearLayer(param1: Sprite): void {
        while (param1.numChildren) {
            if ("remove" in param1.getChildAt(0)) {
                (as3.as(param1.getChildAt(0), Object)).remove();
            }
            param1.removeChildAt(0);
        }
    }

    public remove(): void {
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.canvasDragStart));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onCanvasClick));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.canvasDrag));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.canvasDragStop));
        GAME._instance.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.canvasDragStop));
        // (Inferno-only, 21 October, bug report #91) a wall line, an area or a ruler being dragged when the planner
        // closed (the mouse let go outside the game, then the planner shut): its listeners stayed, and the next
        // mouse release anywhere, in a planner opened again, ended that drag in the closed one, which had nothing
        // left ("currentTool", "removeBuilding" of nothing)
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioToolMove));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioToolEnd));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioRulerMove));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRulerEnd));
        if (this._ioPathListening) {
            this._ioPathListening = false;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPathTick));
        }
        this._ioStart = null;
        this._ioRemoved = true;
        this.clearAllLayers();
    }

    /** (21 October) remove() was called: the planner is closed (a drag still under way ends without doing anything). */
    private _ioRemoved: boolean;

    /** (21 October) The estimates' generations: the last asked for, the one drawn; one asked of the background thread. */
    private _ioPathGen: int;
    private _ioPathShown: int;
    private _ioPathAsked: boolean;

    public redraw(param1: Vector<PlannerNode> = null): void {
        this.setup();
    }

    public toggleView(param1: Checkbox): void {
        switch (param1.name) {
            case "check1":
                this.rangeCheckboxesFlags = (this.rangeCheckboxesFlags ^ 1 << PlannerDesignView.CHECKBOX_GROUND) >>> 0;
                break;
            case "check2":
                this.rangeCheckboxesFlags = (this.rangeCheckboxesFlags ^ 1 << PlannerDesignView.CHECKBOX_AIR) >>> 0;
                break;
            case "check3":
                this.rangeCheckboxesFlags = (this.rangeCheckboxesFlags ^ 1 << PlannerDesignView.CHECKBOX_TRAP) >>> 0;
                break;
            case "check4":
                this.toggleMoreInfo(param1.Checked);
        }
        this.redrawRanges();
    }

    private toggleMoreInfo(param1: boolean = false): void {
        if (!PlannerDesignView.SHOULD_SHOW_MOREINFO) {
            return;
        }
        let _loc2_: int = 0;
        while (_loc2_ < this.displayInventory.length) {
            as3.vget(this.displayInventory, _loc2_).toggleMoreInfo(param1, PlannerDesignView.SHOULD_SHOW_FORTIFICATION);
            _loc2_++;
        }
    }

    public redrawRanges(): void {
        this.clearRanges();
        this.drawRanges();
    }

    private clearRanges(): void {
        while (this._layerSetRanges.numChildren) {
            this._layerSetRanges.removeChildAt(0);
        }
    }

    private drawRanges(): void {
        let _loc2_: BuildingItem = null;
        let _loc3_: boolean = false;
        let _loc1_: Sprite = new Sprite();
        let _loc4_: int = 0;
        while (_loc4_ < this._layerSetBuildings.numChildren) {
            _loc3_ = false;
            _loc2_ = as3.as(this._layerSetBuildings.getChildAt(_loc4_), BuildingItem);
            if (Boolean(this.rangeCheckboxesFlags & 1 << PlannerDesignView.CHECKBOX_TRAP) && _loc2_.category == BuildingItem.TYPE_TRAP) {
                _loc3_ = true;
            } else if (_loc2_.rangeCategory()) {
                switch (_loc2_.rangeCategory()) {
                    case 1:
                    case 2:
                        _loc3_ = Boolean(this.rangeCheckboxesFlags & 1 << _loc2_.rangeCategory() - 1);
                        break;
                    case 3:
                        _loc3_ = Boolean(this.rangeCheckboxesFlags & 1 << PlannerDesignView.CHECKBOX_GROUND || this.rangeCheckboxesFlags & 1 << PlannerDesignView.CHECKBOX_AIR);
                }
            }
            if (_loc3_ && GLOBAL.INFERNO_ONLY) {
                // (QoL #689: in the colour of what it reaches: ground, air (both: two rings), or a trap's)
                _loc1_.mouseEnabled = false;
                this.ioDrawRange(_loc1_.graphics, _loc2_, false);
                this._layerSetRanges.addChild(_loc1_);
            } else if (_loc3_) {
                _loc1_.mouseEnabled = false;
                _loc1_.graphics.lineStyle(3, 16777215, 0.25);
                _loc1_.graphics.beginFill(16711680, 0.1);
                _loc1_.graphics.drawCircle(_loc2_.x + _loc2_.widthsize / 2, _loc2_.y + _loc2_.widthsize / 2, _loc2_.node.range * _loc2_.scale);
                this._layerSetRanges.addChild(_loc1_);
                _loc1_.graphics.endFill();
            }
            _loc4_++;
        }
        // (Inferno-only, QoL #690: the coverage map, drawn again with the ranges whenever something moves)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioDrawCoverage();
            // (20 October: the path estimates worked out again for the plan as it is now)
            this.ioQueuePaths();
        }
    }

    private ioSay(param1: string): void {
        if (this.ioStatus != null) {
            this.ioStatus(param1);
        } else {
            GLOBAL.Message(param1);
        }
    }

    public get ioSelectionCount(): int {
        return this._ioSelection.length | 0;
    }

    private ioCanvasPoint(): Point {
        return new Point((this.mouseX - this._canvas.x) / this._canvas.scaleX, (this.mouseY - this._canvas.y) / this._canvas.scaleY);
    }

    private static ioSnap(param1: number): int {
        return (Math.round(param1 / PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) * PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) | 0;
    }

    private ioOverlayLayer(): Sprite {
        if (!this._ioOverlay || this._ioOverlay.parent != this._canvas) {
            this._ioOverlay = new Sprite();
            this._ioOverlay.mouseEnabled = false;
            this._ioOverlay.mouseChildren = false;
            this._canvas.addChild(this._ioOverlay);
        }
        return this._ioOverlay;
    }

    private ioToolStart(): void {
        this.ioHoverOut();
        this._ioStart = this.ioCanvasPoint();
        GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioToolMove));
        GAME._instance.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioToolEnd));
    }

    private ioToolMove(param1: MouseEvent = null): void {
        let end: Point = this.ioCanvasPoint();
        let layer: Sprite = this.ioOverlayLayer();
        let spot: Point = null;
        layer.graphics.clear();
        // (QoL #695: Shift or Alt pressed once the drag has started counts too)
        if (GLOBAL.INFERNO_ONLY && param1 && this._ioWallMode == "line") {
            this._ioWallMode = param1.shiftKey ? "erase" : (param1.altKey ? "box" : "line");
        }
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT) {
            layer.graphics.lineStyle(2, 16765514, 0.9);
            layer.graphics.beginFill(16765514, 0.12);
            layer.graphics.drawRect(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y));
            layer.graphics.endFill();
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE && this._ioWallMode == "erase") {
            this.ioPreviewErase(layer.graphics, this._ioStart, end);
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            let size: int = this.ioWallSize();
            let left: int = this.ioWallsLeft != null ? this.ioWallsLeft() | 0 : 9999;
            let fits: int = 0;
            let blocked: int = 0;
            // (QoL #695: Alt, the outline of the box from where the drag started)
            for (spot of ((this._ioWallMode == "box" ? this.ioWallBoxSpots(this._ioStart, end, size) : this.ioWallSpots(this._ioStart, end, size)) ?? [])) {
                let free: boolean = this.ioSpotFree(spot, size);
                let colour: uint = (!free ? 0xE04848 : (fits < left ? 0x5FD35F : 0x9A9A9A)) >>> 0;
                if (free) {
                    fits++;
                } else {
                    blocked++;
                }
                layer.graphics.lineStyle(1, 16777215, 0.7);
                layer.graphics.beginFill(colour, 0.45);
                layer.graphics.drawRect(spot.x, spot.y, size, size);
                layer.graphics.endFill();
            }
            this.ioSay(KEYS.Get(Math.min(fits, left) == 1 ? "io_t3m_pl_wall_will_one" : "io_t3m_pl_wall_will_n", { "v1": Math.min(fits, left) }) + (blocked > 0 ? KEYS.Get(blocked == 1 ? "io_t3m_pl_blocked_red_one" : "io_t3m_pl_blocked_red_n", { "v1": blocked }) : "") + (fits > left ? KEYS.Get("io_t3m_pl_more_grey", { "v1": fits - left }) : "") + ".");
        }
    }

    private ioToolEnd(param1: MouseEvent = null): void {
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioToolMove));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioToolEnd));
        if (this._ioRemoved || !this._ioStart) {
            return;
        }
        let end: Point = this.ioCanvasPoint();
        if (this._ioOverlay) {
            this._ioOverlay.graphics.clear();
        }
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT) {
            this.ioSelectArea(new Rectangle(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y)));
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE && this._ioWallMode == "erase") {
            this.ioEraseWalls(this._ioStart, end);
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE && this._ioWallMode == "box") {
            this.ioPlaceWallSpots(this.ioWallBoxSpots(this._ioStart, end, this.ioWallSize()));
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            this.ioPlaceWallLine(this._ioStart, end);
        }
        this._ioStart = null;
        this._ioWallMode = "line";
    }

    // ---- Selection
    private ioSelectArea(param1: Rectangle): void {
        let item: BuildingItem = null;
        this.ioClearSelection();
        if (param1.width < 4 && param1.height < 4) {
            this.ioSay(KEYS.Get("io_t3m_pl_sel_cleared"));
            return;
        }
        for (item of (this.displayInventory ?? [])) {
            if (item.props && item.props.type == "enemy" || IoTd.plannerLocked(item.node)) {
                continue;
            }
            if (param1.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                this._ioSelection.push(item);
                item.filters = [PlannerDesignView.IO_SELECT_GLOW];
            }
        }
        this.ioSay(this._ioSelection.length > 0 ? KEYS.Get("io_t3m_pl_n_selected", { "v1": this._ioSelection.length }) : KEYS.Get("io_t3m_pl_box_empty"));
    }

    /** Store for the whole selection (after the popup's confirmation). Returns how many went to storage. */
    public ioStoreSelection(): int {
        let item: BuildingItem = null;
        let stored: int = 0;
        let items: Vector<BuildingItem> = as3.cast(this._ioSelection.concat(), Vector);
        this.ioClearSelection();
        for (item of (items ?? [])) {
            if (this.displayInventory.indexOf(item) == -1 || !this.ioStorable(item)) {
                continue;
            }
            this.storeBuilding(item);
            stored++;
        }
        this.redrawRanges();
        return stored;
    }

    /** What the Store tool can take: the same buildings a click with it would store. */
    private ioStorable(param1: BuildingItem): boolean {
        return !(param1.props && param1.props.type == "enemy") && !IoTd.plannerKept(param1.node);
    }

    /** Undo / Redo: rebuild the plan from its data, keeping where the view is looking. */
    /**
     * Inferno-only (the planner's Import): the plan's items that overlap another one. (Only overlaps: a yard's
     * own buildings can stand past the edge validateBuilding knows.)
     */
    public ioInvalidNodes(): any[] {
        let out: any[] = [];
        let n: int = this.displayInventory.length | 0;
        for (let i: int = 0; i < n; i++) {
            let a: BuildingItem = as3.vget(this.displayInventory, i);
            for (let j: int = 0; a && j < n; j++) {
                let b: BuildingItem = as3.vget(this.displayInventory, j);
                if (b && b != a && PlannerDesignView.ioOverlap(a, b)) {
                    out.push(a.node);
                    break;
                }
            }
        }
        return out;
    }

    public ioRebuild(): void {
        let viewX: number = Number(this._canvas ? this._canvas.x : 0);
        let viewY: number = Number(this._canvas ? this._canvas.y : 0);
        let hadCanvas: boolean = this._canvas != null;
        this.ioClearSelection();
        this.setup();
        if (hadCanvas) {
            this._canvas.x = viewX;
            this._canvas.y = viewY;
        }
    }

    public ioClearSelection(): void {
        let item: BuildingItem = null;
        for (item of (this._ioSelection ?? [])) {
            item.filters = [];
        }
        this._ioSelection = new Vector<BuildingItem>(0, false, BuildingItem);
    }

    // ---- Moving the selection together
    private ioGroupPickUp(param1: BuildingItem): void {
        let item: BuildingItem = null;
        this._ioGroupDragging = true;
        this._ioGroupAnchor = param1;
        this._ioGroupOrigins = new Vector<Point>(0, false, Point);
        this._ioGroupMembers = new Dictionary();
        this._ioGroupLastDX = this._ioGroupLastDY = int.MIN_VALUE;
        for (item of (this._ioSelection ?? [])) {
            this._ioGroupMembers.set(item, true);
            this._ioGroupOrigins.push(new Point(item.x, item.y));
            this.sortBuildingOrder(item, "front");
        }
        let here: Point = this.ioCanvasPoint();
        this._ioGroupOffset = new Point(param1.x - here.x, param1.y - here.y);
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioGroupTick));
        this.ioSay(KEYS.Get("io_t3m_pl_moving_n", { "v1": this._ioSelection.length }));
    }

    private ioGroupTick(param1: Event = null): void {
        let here: Point = this.ioCanvasPoint();
        let anchorIndex: int = this._ioSelection.indexOf(this._ioGroupAnchor) | 0;
        let dx: int = (PlannerDesignView.ioSnap(here.x + this._ioGroupOffset.x) - as3.vget(this._ioGroupOrigins, anchorIndex).x) | 0;
        let dy: int = (PlannerDesignView.ioSnap(here.y + this._ioGroupOffset.y) - as3.vget(this._ioGroupOrigins, anchorIndex).y) | 0;
        // Pointer moves come far more often than the group moves one snap step (phones send several a
        // frame); each check costs a pixel overlap test per nearby building, so only redo it on a step.
        if (dx == this._ioGroupLastDX && dy == this._ioGroupLastDY) {
            return;
        }
        this._ioGroupLastDX = dx;
        this._ioGroupLastDY = dy;
        let i: int = 0;
        while (i < this._ioSelection.length) {
            as3.vget(this._ioSelection, i).x = as3.vget(this._ioGroupOrigins, i).x + dx;
            as3.vget(this._ioSelection, i).y = as3.vget(this._ioGroupOrigins, i).y + dy;
            i++;
        }
        for (let item of (this._ioSelection ?? [])) {
            item.toggleInvalid(!this.ioValidateInGroup(item));
        }
        this.redrawRanges();
    }

    /**
     * validateBuilding for one building of a group being moved: the other buildings of the group are
     * skipped. They move with it, so how they overlap it never changes, while testing them was the
     * expensive part: buildings next to each other (a row of walls) always need the pixel test.
     */
    private ioValidateInGroup(param1: BuildingItem): boolean {
        let other: BuildingItem = null;
        let i: int = 0;
        // Each building's picture is sized to its footprint (BuildingItem: mc.width/height = size), so
        // footprints that don't come near each other can't overlap. Checking that from the positions is
        // plain arithmetic; the bounding-box step of complexHitTestObject measures both pictures every time,
        // which was most of the cost (60 walls against 225 buildings: 13,500 measurements per step).
        let left: number = param1.x - PlannerDesignView.IO_NEAR;
        let top: number = param1.y - PlannerDesignView.IO_NEAR;
        let right: number = param1.x + param1.size.width * param1.scale + PlannerDesignView.IO_NEAR;
        let bottom: number = param1.y + param1.size.height * param1.scale + PlannerDesignView.IO_NEAR;
        while (i < this.displayInventory.length) {
            other = as3.vget(this.displayInventory, i);
            i++;
            if (other == param1 || this._ioGroupMembers.get(other)) {
                continue;
            }
            if (other.x > right || other.y > bottom || other.x + other.size.width * other.scale < left || other.y + other.size.height * other.scale < top) {
                continue;
            }
            // (exactly, from the footprints: ioOverlap)
            if (PlannerDesignView.ioOverlap(param1, other)) {
                return false;
            }
        }
        // The yard edges (validateBuilding's second half), checked with the others left out.
        return this.ioInsideYard(param1);
    }

    private ioInsideYard(param1: BuildingItem): boolean {
        let expansion: int = 0;
        if (STORE._storeData.ENL) {
            expansion = STORE._storeData.ENL.q | 0;
        }
        let size: Point = as3.cast(this.YARD_EXPANSIONS[expansion], Point);
        if (GLOBAL.INFERNO_ONLY) {
            size = new Point(GLOBAL._mapWidth, GLOBAL._mapHeight);
        }
        if (param1.category != BuildingItem.TYPE_DECORATION) {
            return !(param1.x < -size.x / 2 || param1.y < -size.y / 2 || param1.x > size.x / 2 - param1.widthsize || param1.y > size.y / 2 - param1.widthsize);
        }
        return !(param1.x < -this.MAX_YARD_DIMENSIONS.x / 2 || param1.y < -this.MAX_YARD_DIMENSIONS.y / 2 || param1.x > this.MAX_YARD_DIMENSIONS.x / 2 - param1.widthsize || param1.y > this.MAX_YARD_DIMENSIONS.y / 2 - param1.widthsize);
    }

    private ioGroupDrop(): void {
        let item: BuildingItem = null;
        let ok: boolean = true;
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioGroupTick));
        this._ioGroupDragging = false;
        for (item of (this._ioSelection ?? [])) {
            if (!this.ioValidateInGroup(item)) {
                ok = false;
                break;
            }
        }
        let i: int = 0;
        while (i < this._ioSelection.length) {
            item = as3.vget(this._ioSelection, i);
            item.toggleInvalid(false);
            if (ok) {
                item.setPositionReference();
                this.updateNodeReference(item);
            } else {
                item.x = as3.vget(this._ioGroupOrigins, i).x;
                item.y = as3.vget(this._ioGroupOrigins, i).y;
            }
            i++;
        }
        if (ok) {
            this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        }
        this.ioSay(ok ? KEYS.Get("io_t3m_pl_moved") : KEYS.Get("io_t3m_pl_went_back"));
        this.redrawRanges();
    }

    // ---- Flip and rotate (the selection, or the whole layout when nothing is selected)
    /** param1: "flipx" (left-right), "flipy" (top-bottom) or "rotate" (90 degrees clockwise). */
    public ioTransform(param1: string): void {
        let items: Vector<BuildingItem> = new Vector<BuildingItem>(0, false, BuildingItem);
        let item: BuildingItem = null;
        let origins: Vector<Point> = new Vector<Point>(0, false, Point);
        let reverted: Vector<boolean> = new Vector<boolean>(0, false, Boolean);
        let left: number = Number.MAX_VALUE;
        let top: number = Number.MAX_VALUE;
        let right: number = -Number.MAX_VALUE;
        let bottom: number = -Number.MAX_VALUE;
        let i: int = 0;
        if (this._selectMoveDragging || this._ioGroupDragging) {
            return;
        }
        for (item of ((this._ioSelection.length > 0 ? this._ioSelection : this.displayInventory) ?? [])) {
            if (item.props && item.props.type == "enemy" || IoTd.plannerLocked(item.node)) {
                continue;
            }
            items.push(item);
            origins.push(new Point(item.x, item.y));
            reverted.push(false);
            left = Math.min(left, item.x);
            top = Math.min(top, item.y);
            right = Math.max(right, item.x + item.widthsize);
            bottom = Math.max(bottom, item.y + item.widthsize);
        }
        if (items.length == 0) {
            return;
        }
        let cx: number = (left + right) / 2;
        let cy: number = (top + bottom) / 2;
        for (item of (items ?? [])) {
            let half: number = item.widthsize / 2;
            let px: number = item.x + half;
            let py: number = item.y + half;
            let nx: number = px;
            let ny: number = py;
            if (param1 == "flipx") {
                nx = cx * 2 - px;
            } else if (param1 == "flipy") {
                ny = cy * 2 - py;
            } else {
                nx = cx - (py - cy);
                ny = cy + (px - cx);
            }
            item.x = PlannerDesignView.ioSnap(nx - half);
            item.y = PlannerDesignView.ioSnap(ny - half);
        }
        // Anything that no longer fits goes back where it was; repeat until nothing changes.
        let changed: boolean = true;
        let rounds: int = 0;
        while (changed && rounds++ <= items.length) {
            changed = false;
            i = 0;
            while (i < items.length) {
                if (!as3.vget(reverted, i) && !this.validateBuilding(as3.vget(items, i))) {
                    as3.vget(items, i).x = as3.vget(origins, i).x;
                    as3.vget(items, i).y = as3.vget(origins, i).y;
                    as3.vset(reverted, i, true);
                    changed = true;
                }
                i++;
            }
        }
        // A building sent back may find another one moved onto its old spot: then undo it all.
        let stayed: int = 0;
        i = 0;
        while (i < items.length) {
            if (as3.vget(reverted, i)) {
                stayed++;
                if (!this.validateBuilding(as3.vget(items, i))) {
                    let j: int = 0;
                    while (j < items.length) {
                        as3.vget(items, j).x = as3.vget(origins, j).x;
                        as3.vget(items, j).y = as3.vget(origins, j).y;
                        j++;
                    }
                    this.redrawRanges();
                    this.ioSay(KEYS.Get("io_t3m_pl_nofit_yard"));
                    return;
                }
            }
            i++;
        }
        i = 0;
        while (i < items.length) {
            if (!as3.vget(reverted, i)) {
                as3.vget(items, i).setPositionReference();
                this.updateNodeReference(as3.vget(items, i));
            }
            i++;
        }
        this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        this.redrawRanges();
        this.ioSay(stayed > 0 ? KEYS.Get(stayed == 1 ? "io_t3m_pl_stayed_one" : "io_t3m_pl_stayed_n", { "v1": stayed }) : KEYS.Get("io_t3m_pl_done"));
    }

    /** How big a wall is on the plan, measured from a wall in storage (the planner sizes by footprint). */
    private ioWallSize(): int {
        let node: PlannerNode = null;
        if (this._ioWallSize <= 0 && this.ioTakeWall != null) {
            node = as3.as(this.ioTakeWall(), PlannerNode);
            if (node) {
                this._ioWallSize = new BuildingItem(node).widthsize | 0;
            }
        }
        return this._ioWallSize > 0 ? this._ioWallSize : 20;
    }

    /**
     * Top-left corners of the walls along a straight line from the start point towards the end point,
     * at any angle. Only the start is snapped (to the planner's 5-unit steps, like dragging a building);
     * there is no wall grid. Each next wall is exactly one wall further along the line's main direction
     * (and the matching part of a wall along the other), so neighbours never overlap, diagonals included.
     */
    private ioWallSpots(param1: Point, param2: Point, param3: int): Vector<Point> {
        let spots: Vector<Point> = new Vector<Point>(0, false, Point);
        let half: number = param3 / 2;
        let sx: int = PlannerDesignView.ioSnap(param1.x - half);
        let sy: int = PlannerDesignView.ioSnap(param1.y - half);
        let dx: number = (param2.x - half) - sx;
        let dy: number = (param2.y - half) - sy;
        let major: number = Math.max(Math.abs(dx), Math.abs(dy));
        let count: int = (Math.floor(major / param3) + 1) | 0;
        let stepX: number = Number(major == 0 ? 0 : dx / major * param3);
        let stepY: number = Number(major == 0 ? 0 : dy / major * param3);
        let horizontal: boolean = Math.abs(dx) >= Math.abs(dy);
        let i: int = 0;
        while (i < count && i < 500) {
            // The main axis moves a whole wall each step (exact); the other is rounded to 5.
            let x: number = sx + stepX * i;
            let y: number = sy + stepY * i;
            spots.push(new Point(horizontal ? Math.round(x) : PlannerDesignView.ioSnap(x), horizontal ? PlannerDesignView.ioSnap(y) : Math.round(y)));
            i++;
        }
        return spots;
    }

    /** Quick check for the preview: inside the yard and not overlapping any building's square. */
    private ioSpotFree(param1: Point, param2: int): boolean {
        let item: BuildingItem = null;
        let yard: Point = as3.cast(GLOBAL.INFERNO_ONLY ? new Point(GLOBAL._mapWidth, GLOBAL._mapHeight) : this.YARD_EXPANSIONS[STORE._storeData.ENL ? STORE._storeData.ENL.q | 0 : 0], Point);
        if (param1.x < -yard.x / 2 || param1.y < -yard.y / 2 || param1.x > yard.x / 2 - param2 || param1.y > yard.y / 2 - param2) {
            return false;
        }
        let spot: Rectangle = new Rectangle(param1.x, param1.y, param2, param2);
        for (item of (this.displayInventory ?? [])) {
            if (spot.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                return false;
            }
        }
        return true;
    }

    private ioPlaceWallLine(param1: Point, param2: Point): void {
        this.ioPlaceWallSpots(this.ioWallSpots(param1, param2, this.ioWallSize()));
    }

    /** Walls from storage on these spots, those free of anything (a line's, or a box's outline: QoL #695). */
    private ioPlaceWallSpots(param1: Vector<Point>): void {
        let spot: Point = null;
        let node: PlannerNode = null;
        let item: BuildingItem = null;
        let placed: int = 0;
        let blocked: int = 0;
        let ranOut: boolean = false;
        if (this.ioTakeWall == null) {
            return;
        }
        let size: int = this.ioWallSize();
        this.ioPlacingLine = true;
        for (spot of (param1 ?? [])) {
            node = as3.as(this.ioTakeWall(), PlannerNode);
            if (!node) {
                ranOut = true;
                break;
            }
            if (!this.ioSpotFree(spot, size)) {
                blocked++;
                continue;
            }
            item = new BuildingItem(node);
            item.addEventListener(PlannerDesignView.BUILDING_CLICK, as3.bind(this, this.onBuildingClick));
            item.addEventListener(PlannerDesignView.BUILDING_OVER, as3.bind(this, this.onBuildingOver));
            item.addEventListener(PlannerDesignView.BUILDING_OUT, as3.bind(this, this.onBuildingOut));
            // Free by the same test the green preview squares use (checked above, before taking the wall).
            item.x = spot.x;
            item.y = spot.y;
            this._layerSetBuildings.addChild(item);
            this.displayInventory.push(item);
            item.setPositionReference();
            this.displayData.push(node);
            this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_PLACE, node));
            placed++;
        }
        this.ioPlacingLine = false;
        if (placed > 0) {
            this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
            this.redrawRanges();
        }
        let report: string = placed > 0 ? KEYS.Get(placed == 1 ? "io_t3m_pl_placed_one" : "io_t3m_pl_placed_n", { "v1": placed }) : KEYS.Get("io_t3m_pl_placed_none");
        if (blocked > 0) {
            report += KEYS.Get(blocked == 1 ? "io_t3m_pl_blocked_one" : "io_t3m_pl_blocked_n", { "v1": blocked });
        }
        if (ranOut) {
            report += placed > 0 ? KEYS.Get("io_t3m_pl_out_of_walls") : KEYS.Get("io_t3m_pl_no_walls_stored");
        }
        this.ioSay(report + (ranOut ? "" : "."));
    }

    // ---- Inferno-only (QoL #695): the walls tool's Shift-drag (erase) and Alt-drag (box)
    /**
     * The spots of a box's outline of walls, from the corner where the drag started (snapped as a line's start is)
     * to the one under the pointer, in order round the box: a box that runs out of walls stops in one piece.
     */
    private ioWallBoxSpots(param1: Point, param2: Point, param3: int): Vector<Point> {
        let spots: Vector<Point> = new Vector<Point>(0, false, Point);
        let half: number = param3 / 2;
        let sx: int = PlannerDesignView.ioSnap(param1.x - half);
        let sy: int = PlannerDesignView.ioSnap(param1.y - half);
        let ex: number = (param2.x - half) - sx;
        let ey: number = (param2.y - half) - sy;
        let cols: int = Math.min(Math.floor(Math.abs(ex) / param3) + 1, 200) | 0;
        let rows: int = Math.min(Math.floor(Math.abs(ey) / param3) + 1, 200) | 0;
        let dirX: int = ex < 0 ? -1 : 1;
        let dirY: int = ey < 0 ? -1 : 1;
        let at = (c: int, r: int): void => {
            spots.push(new Point(sx + dirX * c * param3, sy + dirY * r * param3));
        };
        let i: int = 0;
        for (i = 0; i < cols; i++) {
            at(i, 0);
        }
        for (i = 1; i < rows; i++) {
            at((cols - 1) | 0, i);
        }
        if (rows > 1) {
            for (i = (cols - 2) | 0; i >= 0; i--) {
                at(i, (rows - 1) | 0);
            }
        }
        if (cols > 1) {
            for (i = (rows - 2) | 0; i >= 1; i--) {
                at(0, i);
            }
        }
        return spots;
    }

    /** The box a drag covers (a click: the spot under the pointer). */
    private static ioDragBox(param1: Point, param2: Point): Rectangle {
        return new Rectangle(Math.min(param1.x, param2.x) - 1, Math.min(param1.y, param2.y) - 1, Math.abs(param2.x - param1.x) + 2, Math.abs(param2.y - param1.y) + 2);
    }

    /** The walls a Shift-drag takes back to storage: those it touches that a click with Store would store. */
    private ioWallsIn(param1: Rectangle): BuildingItem[] {
        let out: BuildingItem[] = [];
        for (let item of (this.displayInventory ?? [])) {
            if (item.category == BuildingItem.TYPE_WALL && !IoTd.plannerLocked(item.node) && this.ioStorable(item) && param1.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                out.push(item);
            }
        }
        return out;
    }

    /** The erase box, and the walls in it in red. */
    private ioPreviewErase(param1: Graphics, param2: Point, param3: Point): void {
        let box: Rectangle = PlannerDesignView.ioDragBox(param2, param3);
        param1.lineStyle(2, 0xE04848, 0.9);
        param1.beginFill(0xE04848, 0.1);
        param1.drawRect(box.x, box.y, box.width, box.height);
        param1.endFill();
        let walls: BuildingItem[] = this.ioWallsIn(box);
        for (let item of walls) {
            param1.lineStyle(1, 16777215, 0.7);
            param1.beginFill(0xE04848, 0.5);
            param1.drawRect(item.x, item.y, item.widthsize, item.widthsize);
            param1.endFill();
        }
        this.ioSay(KEYS.Get("io_plan_walls_erase_preview", { "v1": walls.length }));
    }

    /** Shift-drag let go: the walls in the box go back to storage. */
    private ioEraseWalls(param1: Point, param2: Point): void {
        let walls: BuildingItem[] = this.ioWallsIn(PlannerDesignView.ioDragBox(param1, param2));
        for (let item of walls) {
            let at: int = this._ioSelection.indexOf(item) | 0;
            if (at >= 0) {
                item.filters = [];
                this._ioSelection.splice(at, 1);
            }
            this.storeBuilding(item);
        }
        if (walls.length > 0) {
            this.redrawRanges();
        }
        this.ioSay(KEYS.Get("io_plan_walls_erased", { "v1": walls.length }));
    }

    // ---- Inferno-only (QoL #689): range circles in colours, and a tower's own range on hover
    /** The range checkboxes on (1 << CHECKBOX_GROUND, CHECKBOX_AIR, CHECKBOX_TRAP). */
    public get ioRangeFlags(): uint {
        return this.rangeCheckboxesFlags >>> 0;
    }

    /**
     * A building's range in the colour of what it reaches: ground, air (a tower that hits both: two rings, the air
     * one just inside), or a trap's. `hover`: its own range, drawn whatever the checkboxes say, a little stronger.
     */
    private ioDrawRange(param1: Graphics, param2: BuildingItem, param3: boolean): void {
        let r: number = param2.node.range * param2.scale;
        if (!(r > 0)) {
            return;
        }
        let flags: uint = (param3 ? 7 : this.rangeCheckboxesFlags) >>> 0;
        let colours: uint[] = [];
        if (param2.category == BuildingItem.TYPE_TRAP) {
            if (flags & 1 << PlannerDesignView.CHECKBOX_TRAP) {
                colours.push(PlannerDesignView.IO_RANGE_TRAP);
            }
        } else {
            let kind: uint = param2.rangeCategory();
            if ((kind == 1 || kind == 3) && flags & 1 << PlannerDesignView.CHECKBOX_GROUND) {
                colours.push(PlannerDesignView.IO_RANGE_GROUND);
            }
            if ((kind == 2 || kind == 3) && flags & 1 << PlannerDesignView.CHECKBOX_AIR) {
                colours.push(PlannerDesignView.IO_RANGE_AIR);
            }
        }
        let cx: number = param2.x + param2.widthsize / 2;
        let cy: number = param2.y + param2.widthsize / 2;
        let i: int = 0;
        for (let colour of colours) {
            param1.lineStyle(param3 ? 4 : 3, colour >>> 0, param3 ? 0.95 : 0.75);
            param1.beginFill(colour >>> 0, i == 0 ? (param3 ? 0.16 : 0.08) : 0);
            param1.drawCircle(cx, cy, Math.max(1, r - i * 6));
            param1.endFill();
            i++;
        }
    }

    /** The range of the building under the pointer (or being moved), if it has one. */
    private ioShowHoverRange(param1: BuildingItem): void {
        if (!param1 || !param1.node || !this._layerSelectRanges) {
            return;
        }
        if (!this._ioHoverRange || this._ioHoverRange.parent != this._layerSelectRanges) {
            this._ioHoverRange = new Sprite();
            this._ioHoverRange.name = "ioPlanHoverRange";
            this._ioHoverRange.mouseEnabled = false;
            this._ioHoverRange.mouseChildren = false;
            this._layerSelectRanges.addChild(this._ioHoverRange);
        }
        this._ioHoverItem = param1;
        this._ioHoverRange.graphics.clear();
        this.ioDrawRange(this._ioHoverRange.graphics, param1, true);
    }

    private ioHideHoverRange(): void {
        this._ioHoverItem = null;
        if (this._ioHoverRange) {
            this._ioHoverRange.graphics.clear();
        }
    }

    /** The building whose own range is showing, or null. */
    public get ioHoverItem(): BuildingItem {
        return this._ioHoverItem;
    }

    // ---- Inferno-only (QoL #692): the grid, edges that pull a moved building flush, and the arrow keys
    public get ioGridOn(): boolean {
        return this._ioGridOn;
    }

    public ioSetGrid(param1: boolean): void {
        this._ioGridOn = param1;
        if (param1) {
            this.ioDrawGrid();
        } else if (this._ioGrid && this._ioGrid.parent) {
            this._ioGrid.parent.removeChild(this._ioGrid);
        }
    }

    /**
     * The grid over the yard, a line every cell (IO_CELL) and a stronger one every ten; zoomed out, the finest lines
     * every 2, 5 or 10 cells so they stay apart. Lines one pixel wide on the screen at any zoom.
     */
    private ioDrawGrid(): void {
        if (!this._layerGround) {
            return;
        }
        if (!this._ioGrid) {
            this._ioGrid = new Sprite();
            this._ioGrid.name = "ioPlanGridLines";
            this._ioGrid.mouseEnabled = false;
            this._ioGrid.mouseChildren = false;
        }
        if (this._ioGrid.parent != this._layerGround) {
            this._layerGround.addChild(this._ioGrid);
        }
        let g: Graphics = this._ioGrid.graphics;
        g.clear();
        let zoom: number = this._canvas && this._canvas.scaleX > 0 ? this._canvas.scaleX : PlannerDesignView.zoomValue;
        let cell: int = PlannerDesignView.IO_CELL;
        let step: int = cell;
        for (let every of [2, 5, 10]) {
            if (step * zoom >= 6) {
                break;
            }
            step = (cell * every) | 0;
        }
        let w: number = GLOBAL._mapWidth;
        let h: number = GLOBAL._mapHeight;
        let left: number = -w / 2;
        let top: number = -h / 2;
        let thin: number = 1 / zoom;
        for (let x: number = Math.ceil(left / step) * step; x <= w / 2; x += step) {
            g.lineStyle(thin, 0, x % (cell * 10) == 0 ? 0.32 : 0.14);
            g.moveTo(x, top);
            g.lineTo(x, top + h);
        }
        for (let y: number = Math.ceil(top / step) * step; y <= h / 2; y += step) {
            g.lineStyle(thin, 0, y % (cell * 10) == 0 ? 0.32 : 0.14);
            g.moveTo(left, y);
            g.lineTo(left + w, y);
        }
    }

    /**
     * With the grid on, a building being moved is pulled flush against a building beside it, lined up with one just
     * above or below it, or against the yard's edge, when one is within IO_EDGE_SNAP of where the pointer puts it.
     */
    private ioEdgeSnap(param1: BuildingItem): void {
        if (!param1 || !param1.size) {
            return;
        }
        let near: number = PlannerDesignView.IO_EDGE_SNAP;
        let w: number = param1.size.width * param1.scale;
        let h: number = param1.size.height * param1.scale;
        let x: number = param1.x;
        let y: number = param1.y;
        let bestX: number = NaN;
        let bestY: number = NaN;
        let gapX: number = near + 1;
        let gapY: number = near + 1;
        let tryX = (to: number): void => {
            let d: number = Math.abs(to - x);
            if (d <= near && d < gapX) {
                gapX = d;
                bestX = to;
            }
        };
        let tryY = (to: number): void => {
            let d: number = Math.abs(to - y);
            if (d <= near && d < gapY) {
                gapY = d;
                bestY = to;
            }
        };
        if (param1.category != BuildingItem.TYPE_DECORATION) {
            tryX(-GLOBAL._mapWidth / 2);
            tryX(GLOBAL._mapWidth / 2 - param1.widthsize);
            tryY(-GLOBAL._mapHeight / 2);
            tryY(GLOBAL._mapHeight / 2 - param1.widthsize);
        }
        for (let other of (this.displayInventory ?? [])) {
            if (other == param1 || !other.size) {
                continue;
            }
            let ow: number = other.size.width * other.scale;
            let oh: number = other.size.height * other.scale;
            // beside it (their spans across the other way overlap): flush against its side
            if (other.y < y + h && y < other.y + oh) {
                tryX(other.x + ow);
                tryX(other.x - w);
            }
            if (other.x < x + w && x < other.x + ow) {
                tryY(other.y + oh);
                tryY(other.y - h);
            }
            // just above or below it (or just left or right): the same edges lined up
            if (Math.abs(y - (other.y + oh)) <= near || Math.abs(y + h - other.y) <= near) {
                tryX(other.x);
                tryX(other.x + ow - w);
            }
            if (Math.abs(x - (other.x + ow)) <= near || Math.abs(x + w - other.x) <= near) {
                tryY(other.y);
                tryY(other.y + oh - h);
            }
        }
        if (!isNaN(bestX)) {
            param1.x = Math.round(bestX);
        }
        if (!isNaN(bestY)) {
            param1.y = Math.round(bestY);
        }
    }

    /**
     * The arrow keys: the selection (Select's box) one cell (IO_CELL) that way, if it all still fits; else nothing
     * moves. Not while a building or the selection is being carried. True when it moved.
     */
    public ioNudge(param1: int, param2: int): boolean {
        if (this._selectMoveDragging || this._ioGroupDragging || this._isAddingBuilding) {
            return false;
        }
        let items: BuildingItem[] = [];
        for (let item of (this._ioSelection ?? [])) {
            if (this.displayInventory.indexOf(item) != -1) {
                items.push(item);
            }
        }
        if (items.length == 0) {
            this.ioSay(KEYS.Get("io_plan_nudge_none"));
            return false;
        }
        let step: int = PlannerDesignView.IO_CELL;
        let origins: Point[] = [];
        this._ioGroupMembers = new Dictionary();
        for (let item of items) {
            this._ioGroupMembers.set(item, true);
            origins.push(new Point(item.x, item.y));
            item.x += param1 * step;
            item.y += param2 * step;
        }
        let ok: boolean = true;
        for (let item of items) {
            if (!this.ioValidateInGroup(item)) {
                ok = false;
                break;
            }
        }
        let i: int = 0;
        for (let item of items) {
            if (ok) {
                item.setPositionReference();
                this.updateNodeReference(item);
            } else {
                item.x = origins[i].x;
                item.y = origins[i].y;
            }
            i++;
        }
        if (!ok) {
            this.ioSay(KEYS.Get("io_plan_nudge_blocked"));
            return false;
        }
        this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        this.redrawRanges();
        return true;
    }

    // ---- Inferno-only (QoL #691): the ruler
    public get ioRulerOn(): boolean {
        return this._ioRulerOn;
    }

    public ioSetRuler(param1: boolean): void {
        this._ioRulerOn = param1;
        if (!param1) {
            this.ioRulerClear();
        }
    }

    /** The last distance measured, in cells (NaN: none showing). */
    public get ioRulerCells(): number {
        return this._ioRulerCells;
    }

    /** Was the press on one of the plan's buildings (or something on one)? */
    private ioOnBuilding(param1: MouseEvent): boolean {
        let d: any = param1 ? param1.target : null;
        while (d && d != this) {
            if (d instanceof BuildingItem) {
                return true;
            }
            d = d.parent;
        }
        return false;
    }

    /** A press on empty ground with the ruler on: measured from here to wherever the pointer is let go. */
    private ioRulerStart(): void {
        this.ioRulerClear();
        this._ioRulerStart = this.ioCanvasPoint();
        this._ioRulerCells = 0;
        GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioRulerMove));
        GAME._instance.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRulerEnd));
        this.ioRulerMove();
    }

    private ioRulerMove(param1: MouseEvent = null): void {
        if (!this._ioRulerStart) {
            return;
        }
        this.ioRulerMeasure(this.ioCanvasPoint());
    }

    private ioRulerEnd(param1: MouseEvent = null): void {
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioRulerMove));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRulerEnd));
        if (!this._ioRulerStart) {
            return;
        }
        this.ioRulerMeasure(this.ioCanvasPoint());
        this.ioSay(this._ioRulerLabel ? this._ioRulerLabel.text : "");
    }

    /**
     * Measures from the ruler's start to `param1` (the plan's units) and draws it: the distance in cells (IO_CELL),
     * and how many across and down. A test can call it to measure without the mouse (after ioRulerStart).
     */
    public ioRulerMeasure(param1: Point): void {
        if (!this._ioRulerStart || !param1) {
            return;
        }
        if (!this._ioRuler || this._ioRuler.parent != this._canvas) {
            this._ioRuler = new Sprite();
            this._ioRuler.name = "ioPlanMeasure";
            this._ioRuler.mouseEnabled = false;
            this._ioRuler.mouseChildren = false;
            this._canvas.addChild(this._ioRuler);
            this._ioRulerLabel = new TextField();
            this._ioRulerLabel.name = "ioPlanMeasureLabel";
            this._ioRulerLabel.selectable = false;
            this._ioRulerLabel.mouseEnabled = false;
            this._ioRulerLabel.defaultTextFormat = new TextFormat("Verdana", 12, 0xFFF4E0, true);
            this._ioRulerLabel.autoSize = TextFieldAutoSize.LEFT;
            this._ioRulerLabel.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            this._ioRuler.addChild(this._ioRulerLabel);
        }
        let dx: number = param1.x - this._ioRulerStart.x;
        let dy: number = param1.y - this._ioRulerStart.y;
        let cell: int = PlannerDesignView.IO_CELL;
        this._ioRulerCells = Math.round(Math.sqrt(dx * dx + dy * dy) / cell * 10) / 10;
        this._ioRulerLabel.text = KEYS.Get("io_plan_ruler_cells", { "v1": this._ioRulerCells, "v2": Math.round(Math.abs(dx) / cell), "v3": Math.round(Math.abs(dy) / cell) });
        this._ioRulerEnd = param1;
        this.ioRulerDraw();
    }

    /** The ruler's line and label, drawn for the zoom now. */
    private ioRulerDraw(): void {
        let end: Point = this._ioRulerEnd;
        if (!this._ioRuler || !end || !this._ioRulerStart) {
            return;
        }
        let k: number = 1 / (this._canvas && this._canvas.scaleX > 0 ? this._canvas.scaleX : 1);
        let g: Graphics = this._ioRuler.graphics;
        g.clear();
        g.lineStyle(4 * k, 0, 0.5);
        g.moveTo(this._ioRulerStart.x, this._ioRulerStart.y);
        g.lineTo(end.x, end.y);
        g.lineStyle(2 * k, 0xFFD24A, 1);
        g.moveTo(this._ioRulerStart.x, this._ioRulerStart.y);
        g.lineTo(end.x, end.y);
        g.beginFill(0xFFD24A, 1);
        g.drawCircle(this._ioRulerStart.x, this._ioRulerStart.y, 3 * k);
        g.drawCircle(end.x, end.y, 3 * k);
        g.endFill();
        this._ioRulerLabel.scaleX = this._ioRulerLabel.scaleY = k;
        this._ioRulerLabel.x = end.x + 10 * k;
        this._ioRulerLabel.y = end.y - 22 * k;
    }

    /** The measure taken away (the ruler off, a press elsewhere, the plan drawn again). */
    public ioRulerClear(): void {
        if (GAME._instance) {
            GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioRulerMove));
            GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRulerEnd));
        }
        this._ioRulerStart = null;
        this._ioRulerEnd = null;
        this._ioRulerCells = NaN;
        if (this._ioRuler && this._ioRuler.parent) {
            this._ioRuler.parent.removeChild(this._ioRuler);
        }
        this._ioRuler = null;
        this._ioRulerLabel = null;
    }

    // ---- Inferno-only (QoL #690): the coverage map
    /** The coverage map's squares, in the yard's units: two cells (IO_CELL) across. */
    public static readonly IO_COVER_STEP: int = 20;

    /** The shading for 1, 2, 3, and 4 or more towers reaching a square, and how strong. */
    public static readonly IO_COVER_FILLS: any[] = [0xFFF07A, 0xFFB43C, 0xFF6A28, 0xE0203C];

    private static readonly IO_COVER_ALPHAS: any[] = [0.2, 0.28, 0.34, 0.4];

    /** The outline of a building no tower reaches. */
    public static readonly IO_UNCOVERED: uint = 0xFF2A2A;

    public get ioCoverageOn(): boolean {
        return this._ioCoverOn;
    }

    public ioSetCoverage(param1: boolean): void {
        this._ioCoverOn = param1;
        this.redrawRanges();
    }

    /** How many buildings no tower reaches (with the map on; 0 with it off). */
    public get ioUncoveredCount(): int {
        return this._ioCoverMissed | 0;
    }

    /** How many towers reach this spot of the plan (the yard's units), as the map shades it; 0 off the yard or with the map off. */
    public ioCoverageAt(param1: number, param2: number): int {
        if (!this._ioCoverOn || !this._ioCoverCounts) {
            return 0;
        }
        let step: int = PlannerDesignView.IO_COVER_STEP;
        let c: int = Math.floor((param1 + GLOBAL._mapWidth / 2) / step) | 0;
        let r: int = Math.floor((param2 + GLOBAL._mapHeight / 2) / step) | 0;
        if (c < 0 || r < 0 || c >= this._ioCoverCols || r >= this._ioCoverRows) {
            return 0;
        }
        return this._ioCoverCounts[r * this._ioCoverCols + c] | 0;
    }

    /**
     * The plan's towers as the range circles draw them: [centre x, centre y, range], each building with an attack (its
     * attackType) and a range, traps and a tribe's buildings left out.
     */
    private ioTowers(): any[] {
        let out: any[] = [];
        for (let item of (this.displayInventory ?? [])) {
            if (!item || !item.node || item.category == BuildingItem.TYPE_TRAP || item.props && item.props.type == "enemy" || !(item.rangeCategory() > 0)) {
                continue;
            }
            let r: number = item.node.range * item.scale;
            if (r > 0) {
                out.push([item.x + item.widthsize / 2, item.y + item.widthsize / 2, r]);
            }
        }
        return out;
    }

    /** What the map outlines when no tower reaches it: buildings, not walls, traps, decorations, a tribe's or the arena's own. */
    private ioCoverable(param1: BuildingItem): boolean {
        if (!param1 || !param1.node || !param1.size) {
            return false;
        }
        let c: string = param1.category;
        if (c == BuildingItem.TYPE_WALL || c == BuildingItem.TYPE_TRAP || c == BuildingItem.TYPE_DECORATION || c == BuildingItem.TYPE_MISC) {
            return false;
        }
        return !(param1.props && param1.props.type == "enemy") && !IoTd.plannerLocked(param1.node);
    }

    /**
     * The ground shaded by how many towers reach each square (IO_COVER_STEP across, a square counts when its middle is in
     * reach), and the buildings no tower reaches (their middle out of every range) outlined in red. Off: taken away.
     */
    private ioDrawCoverage(): void {
        if (!this._ioCoverOn) {
            if (this._ioCover && this._ioCover.parent) {
                this._ioCover.parent.removeChild(this._ioCover);
            }
            this._ioCoverCounts = null;
            this._ioCoverMissed = 0;
            return;
        }
        if (!this._layerGround || !this._layerSetRanges) {
            return;
        }
        if (!this._ioCover) {
            this._ioCover = new Sprite();
            this._ioCover.name = "ioPlan2CoverageMap";
            this._ioCover.mouseEnabled = false;
            this._ioCover.mouseChildren = false;
        }
        if (this._ioCover.parent != this._layerGround) {
            // (under the grid's lines, when they show)
            if (this._ioGrid && this._ioGrid.parent == this._layerGround) {
                this._layerGround.addChildAt(this._ioCover, this._layerGround.getChildIndex(this._ioGrid));
            } else {
                this._layerGround.addChild(this._ioCover);
            }
        }
        let step: int = PlannerDesignView.IO_COVER_STEP;
        let w: number = GLOBAL._mapWidth;
        let h: number = GLOBAL._mapHeight;
        let left: number = -w / 2;
        let top: number = -h / 2;
        let cols: int = Math.ceil(w / step) | 0;
        let rows: int = Math.ceil(h / step) | 0;
        let counts: number[] = [];
        for (let i: int = 0; i < cols * rows; i++) {
            counts.push(0);
        }
        let towers: any[] = this.ioTowers();
        for (let t of towers) {
            let cx: number = Number(t[0]);
            let cy: number = Number(t[1]);
            let r: number = Number(t[2]);
            let r2: number = r * r;
            let c0: int = Math.max(0, Math.floor((cx - r - left) / step)) | 0;
            let c1: int = Math.min(cols - 1, Math.floor((cx + r - left) / step)) | 0;
            let r0: int = Math.max(0, Math.floor((cy - r - top) / step)) | 0;
            let r1: int = Math.min(rows - 1, Math.floor((cy + r - top) / step)) | 0;
            for (let row: int = r0; row <= r1; row++) {
                let dy: number = top + (row + 0.5) * step - cy;
                for (let col: int = c0; col <= c1; col++) {
                    let dx: number = left + (col + 0.5) * step - cx;
                    if (dx * dx + dy * dy <= r2) {
                        counts[row * cols + col]++;
                    }
                }
            }
        }
        let g: Graphics = this._ioCover.graphics;
        g.clear();
        for (let row: int = 0; row < rows; row++) {
            let col: int = 0;
            while (col < cols) {
                let n: int = Math.min(counts[row * cols + col], 4) | 0;
                if (n <= 0) {
                    col++;
                    continue;
                }
                // (a run of squares with the same shading, one rectangle)
                let start: int = col;
                while (col < cols && (Math.min(counts[row * cols + col], 4) | 0) == n) {
                    col++;
                }
                let x0: number = left + start * step;
                let y0: number = top + row * step;
                let x1: number = Math.min(left + col * step, left + w);
                let y1: number = Math.min(top + (row + 1) * step, top + h);
                g.beginFill(PlannerDesignView.IO_COVER_FILLS[n - 1] >>> 0, Number(PlannerDesignView.IO_COVER_ALPHAS[n - 1]));
                g.drawRect(x0, y0, x1 - x0, y1 - y0);
                g.endFill();
            }
        }
        this._ioCoverCounts = counts;
        this._ioCoverCols = cols;
        this._ioCoverRows = rows;
        // the buildings no tower reaches, outlined (over the buildings: the ranges' layer, emptied with the ranges)
        let missed: int = 0;
        let outline: Sprite = new Sprite();
        outline.name = "ioPlan2Uncovered";
        outline.mouseEnabled = false;
        outline.mouseChildren = false;
        for (let item of (this.displayInventory ?? [])) {
            if (!this.ioCoverable(item)) {
                continue;
            }
            let bw: number = item.size.width * item.scale;
            let bh: number = item.size.height * item.scale;
            let mx: number = item.x + bw / 2;
            let my: number = item.y + bh / 2;
            let reached: boolean = false;
            for (let t of towers) {
                let dx: number = mx - Number(t[0]);
                let dy: number = my - Number(t[1]);
                if (dx * dx + dy * dy <= Number(t[2]) * Number(t[2])) {
                    reached = true;
                    break;
                }
            }
            if (!reached) {
                missed++;
                outline.graphics.lineStyle(3, PlannerDesignView.IO_UNCOVERED, 0.95);
                outline.graphics.drawRect(item.x - 2, item.y - 2, bw + 4, bh + 4);
            }
        }
        this._layerSetRanges.addChild(outline);
        this._ioCoverMissed = missed;
    }

    // ---- Inferno-only (QoL #683, #684): Apply's movers, and the selection
    /** The selection's buildings (Select's box), those still on the plan. */
    public ioSelectedNodes(): PlannerNode[] {
        let out: PlannerNode[] = [];
        for (let item of (this._ioSelection ?? [])) {
            if (item && item.node && this.displayInventory.indexOf(item) != -1) {
                out.push(item.node);
            }
        }
        return out;
    }

    /**
     * While Apply's confirmation is up: each building it moves outlined (blue) where the plan puts it, a ghost where it
     * stands in the yard now and an arrow from there; one it puts down from storage outlined in gold. param1: [node, the
     * spot it stands on now (the plan's units), or null: from storage].
     */
    public ioShowMovers(param1: any[]): void {
        this.ioClearMovers();
        if (!this._canvas || !param1 || !param1.length) {
            return;
        }
        let items: Dictionary = new Dictionary();
        for (let item of (this.displayInventory ?? [])) {
            if (item && item.node) {
                items.set(item.node, item);
            }
        }
        let k: number = 1 / (this._canvas.scaleX > 0 ? this._canvas.scaleX : 1);
        let s: Sprite = new Sprite();
        s.name = "ioPlan2Movers";
        s.mouseEnabled = false;
        s.mouseChildren = false;
        let g: Graphics = s.graphics;
        let shown: int = 0;
        for (let entry of param1) {
            let node: PlannerNode = as3.as(entry[0], PlannerNode);
            let from: Point = as3.as(entry[1], Point);
            let item: BuildingItem = as3.as(items.get(node), BuildingItem);
            if (!node || !item) {
                continue;
            }
            let w: number = item.size.width * item.scale;
            let h: number = item.size.height * item.scale;
            if (from) {
                g.lineStyle(1.5 * k, 0xFFFFFF, 0.8);
                g.beginFill(0xFFFFFF, 0.22);
                g.drawRect(from.x, from.y, w, h);
                g.endFill();
                let ax: number = from.x + w / 2;
                let ay: number = from.y + h / 2;
                let bx: number = item.x + w / 2;
                let by: number = item.y + h / 2;
                g.lineStyle(2 * k, 0x5FE0FF, 0.9);
                g.moveTo(ax, ay);
                g.lineTo(bx, by);
                let len: number = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
                if (len > 12 * k) {
                    let a: number = Math.atan2(by - ay, bx - ax);
                    for (let side of [-0.5, 0.5]) {
                        g.moveTo(bx, by);
                        g.lineTo(bx - Math.cos(a + side) * 9 * k, by - Math.sin(a + side) * 9 * k);
                    }
                }
            }
            g.lineStyle(3 * k, from ? 0x5FE0FF : 0xFFD24A, 1);
            g.drawRect(item.x - 2 * k, item.y - 2 * k, w + 4 * k, h + 4 * k);
            shown++;
        }
        this._canvas.addChild(s);
        this._ioMovers = s;
        this._ioMoversCount = shown;
    }

    public ioClearMovers(): void {
        if (this._ioMovers && this._ioMovers.parent) {
            this._ioMovers.parent.removeChild(this._ioMovers);
        }
        this._ioMovers = null;
        this._ioMoversCount = 0;
    }

    /** How many buildings are marked as Apply's movers (0: none showing). */
    public get ioMoversShown(): int {
        return this._ioMovers && this._ioMovers.parent ? this._ioMoversCount | 0 : 0;
    }

    // ---- Inferno-only (QoL #685): planned buildings ("ghosts")
    /** The kind the next click plans (0: none chosen). */
    public get ioGhostType(): int {
        return this._ioGhostType | 0;
    }

    /** Plans this kind: each click on the plan puts one there, until no more can be planned. */
    public ioStartGhost(param1: int): void {
        this._ioGhostType = param1;
        this.setTool(PlannerDesignView.TOOL_IOGHOST);
    }

    /** How many buildings are planned. */
    public get ioGhostCount(): int {
        return this.ioGhosts ? this.ioGhosts.length | 0 : 0;
    }

    private static ioGhostName(param1: int): string {
        let props: any = GLOBAL._buildingProps[param1 - 1];
        return props && props.name ? KEYS.Get(String(props.name)) : KEYS.Get("str_building");
    }

    private ioGhostRect(param1: any): Rectangle {
        let size: Point = IoPlanShare.GhostSize(param1.type | 0);
        return new Rectangle(Number(param1.x), Number(param1.y), size.x, size.y);
    }

    /** The planned buildings: pale squares with dashed-looking edges and their names, under the buildings. */
    public ioDrawGhosts(): void {
        if (this._ioGhostLayer && this._ioGhostLayer.parent) {
            this._ioGhostLayer.parent.removeChild(this._ioGhostLayer);
        }
        this._ioGhostLayer = null;
        if (!this._canvas || !this._layerSetBuildings || !this.ioGhosts || !this.ioGhosts.length) {
            return;
        }
        let layer: Sprite = new Sprite();
        layer.name = "ioPlan3Ghosts";
        layer.mouseEnabled = false;
        layer.mouseChildren = false;
        let g: Graphics = layer.graphics;
        for (let ghost of this.ioGhosts) {
            let r: Rectangle = this.ioGhostRect(ghost);
            g.lineStyle(2, 0xBFE6FF, 0.95);
            g.beginFill(0xFFFFFF, 0.2);
            g.drawRect(r.x, r.y, r.width, r.height);
            g.endFill();
            // (its corners marked, so it reads as a place, not a building)
            let c: number = Math.min(10, r.width / 3);
            g.lineStyle(3, 0x5FB8FF, 1);
            for (let corner of [[r.x, r.y, 1, 1], [r.right, r.y, -1, 1], [r.x, r.bottom, 1, -1], [r.right, r.bottom, -1, -1]]) {
                g.moveTo(corner[0] + corner[2] * c, corner[1]);
                g.lineTo(corner[0], corner[1]);
                g.lineTo(corner[0], corner[1] + corner[3] * c);
            }
            if (r.width >= 40) {
                let label: TextField = IoMapUi.label(PlannerDesignView.ioGhostName(ghost.type | 0), 10, 0xFFFFFF, true, (r.width - 4) | 0, "center");
                label.wordWrap = true;
                label.multiline = true;
                label.height = 30;
                label.x = r.x + 2;
                label.y = r.y + r.height / 2 - 8;
                layer.addChild(label);
            }
        }
        this._canvas.addChildAt(layer, this._canvas.getChildIndex(this._layerSetBuildings));
        this._ioGhostLayer = layer;
    }

    /** The planned building under this spot of the plan, or -1. */
    public ioGhostAt(param1: Point): int {
        for (let i: int = (this.ioGhosts ? this.ioGhosts.length - 1 : -1) | 0; i >= 0; i--) {
            if (this.ioGhostRect(this.ioGhosts[i]).containsPoint(param1)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * A click with the planning tool: on a planned building, it goes; elsewhere, one of the kind chosen is planned there
     * (centred on the click, inside the yard, on nothing else, while more of that kind can be had).
     */
    public ioGhostClick(param1: Point = null): boolean {
        if (!this.ioGhosts || !this._canvas) {
            return false;
        }
        let p: Point = param1 ? param1 : this.ioCanvasPoint();
        let hit: int = this.ioGhostAt(p);
        if (hit >= 0) {
            let gone: any = this.ioGhosts[hit];
            this.ioGhosts.splice(hit, 1);
            this.ioDrawGhosts();
            this.ioDrawCompare();
            this.ioSay(KEYS.Get("io_plan3_ghost_removed", { "v1": PlannerDesignView.ioGhostName(gone.type | 0) }));
            this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
            return true;
        }
        let type: int = this._ioGhostType | 0;
        if (type <= 0) {
            return false;
        }
        let name: string = PlannerDesignView.ioGhostName(type);
        let room: int = this.ioGhostRoom != null ? this.ioGhostRoom(type) | 0 : 1;
        if (room <= 0) {
            this.ioSay(KEYS.Get("io_plan3_ghost_full", { "v1": name }));
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
            return false;
        }
        let size: Point = IoPlanShare.GhostSize(type);
        let x: int = PlannerDesignView.ioSnap(p.x - size.x / 2);
        let y: int = PlannerDesignView.ioSnap(p.y - size.y / 2);
        let r: Rectangle = new Rectangle(x, y, size.x, size.y);
        if (r.x < -GLOBAL._mapWidth / 2 || r.y < -GLOBAL._mapHeight / 2 || r.right > GLOBAL._mapWidth / 2 || r.bottom > GLOBAL._mapHeight / 2) {
            this.ioSay(KEYS.Get("io_plan3_ghost_outside"));
            return false;
        }
        for (let item of (this.displayInventory ?? [])) {
            if (item && item.size && r.intersects(new Rectangle(item.x, item.y, item.size.width * item.scale, item.size.height * item.scale))) {
                this.ioSay(KEYS.Get("io_plan3_ghost_taken"));
                return false;
            }
        }
        for (let other of this.ioGhosts) {
            if (r.intersects(this.ioGhostRect(other))) {
                this.ioSay(KEYS.Get("io_plan3_ghost_taken"));
                return false;
            }
        }
        this.ioGhosts.push(new BaseTemplateNode(x, y, PlannerTemplate.IO_GHOST_ID, type));
        this.ioDrawGhosts();
        this.ioDrawCompare();
        this.ioSay(KEYS.Get("io_plan3_ghost_placed", { "v1": name, "v2": room - 1 }));
        this.dispatchEvent(new Event(PlannerDesignView.STATE_CHANGE));
        if (room - 1 <= 0) {
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        }
        return true;
    }

    // ---- Inferno-only (QoL #693): another plan over this one
    /** The colours: a building the other plan has elsewhere, one only it has, one only this plan has. */
    public static readonly IO_CMP_MOVED: uint = 0x5FE0FF;

    public static readonly IO_CMP_THERE: uint = 0xFFD24A;

    public static readonly IO_CMP_HERE: uint = 0xFF5A3C;

    /** Shows a plan over this one: rows [type, x, y, id] (id: this yard's building, when the plan is this yard's). */
    public ioShowCompare(param1: any[]): void {
        this._ioCompareRows = param1 ? param1.slice() : null;
        this.ioDrawCompare();
    }

    public ioClearCompare(): void {
        this._ioCompareRows = null;
        this.ioDrawCompare();
    }

    public get ioCompareOn(): boolean {
        return this._ioCompareRows != null;
    }

    /** { same, moved, there, here } as last drawn (null with nothing compared). */
    public get ioCompareCounts(): any {
        return this._ioCompareCounts;
    }

    /**
     * The other plan's buildings as pale ghosts where it puts them. Matched with this plan's by building (its id, the same
     * kind) or else by kind and spot: one in the same spot is only faintly outlined; one this plan has elsewhere is
     * outlined in blue with a line from where this plan has it; one only the other plan has, in gold; and this plan's
     * buildings the other doesn't have are outlined in red. Decorations are left out on both sides.
     */
    public ioDrawCompare(): void {
        if (this._ioCompare && this._ioCompare.parent) {
            this._ioCompare.parent.removeChild(this._ioCompare);
        }
        this._ioCompare = null;
        if (!this._ioCompareRows || !this._canvas) {
            this._ioCompareCounts = null;
            return;
        }
        let byId: any = {};
        let bySpot: any = {};
        let sizes: any = {};
        let items: any[] = [];
        for (let item of (this.displayInventory ?? [])) {
            // (decorations and the misc row aren't compared: Export's codes and the kits have none)
            if (!item || !item.node || !item.size || item.props && item.props.type == "enemy" || item.category == BuildingItem.TYPE_DECORATION || item.category == BuildingItem.TYPE_MISC) {
                continue;
            }
            items.push(item);
            let n: PlannerNode = item.node;
            if (n.id > 0 && n.id != PlannerTemplate._DECORATION_ID) {
                byId[String(n.id)] = item;
            }
            let key: string = n.type + ":" + (item.x | 0) + ":" + (item.y | 0);
            if (!bySpot[key]) {
                bySpot[key] = [];
            }
            bySpot[key].push(item);
            if (!sizes[n.type]) {
                sizes[n.type] = new Point(item.size.width * item.scale, item.size.height * item.scale);
            }
        }
        let used: Dictionary = new Dictionary();
        let counts: any = { "same": 0, "moved": 0, "there": 0, "here": 0 };
        let k: number = 1 / (this._canvas.scaleX > 0 ? this._canvas.scaleX : 1);
        let s: Sprite = new Sprite();
        s.name = "ioPlan3Compare";
        s.mouseEnabled = false;
        s.mouseChildren = false;
        let g: Graphics = s.graphics;
        let snap: int = PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        let pending: any[] = [];
        let drawn: any[] = [];
        // (first by building, then by kind and spot)
        for (let row of this._ioCompareRows) {
            if (!row || (row[0] | 0) <= 0) {
                continue;
            }
            let type: int = row[0] | 0;
            let rowProps: any = GLOBAL._buildingProps[type - 1];
            if (!rowProps || (rowProps.group | 0) < 1 || (rowProps.group | 0) > 3 || rowProps.type == "decoration" || rowProps.type == "enemy") {
                continue;
            }
            let x: number = ((Number(row[1]) / snap) | 0) * snap;
            let y: number = ((Number(row[2]) / snap) | 0) * snap;
            let id: number = row.length > 3 ? Number(row[3]) : 0;
            let hit: BuildingItem = id > 0 && id != PlannerTemplate._DECORATION_ID ? as3.as(byId[String(id)], BuildingItem) : null;
            if (hit && (hit.node.type | 0) == type && !used.get(hit)) {
                used.set(hit, true);
                drawn.push([type, x, y, hit]);
            } else {
                pending.push([type, x, y]);
            }
        }
        for (let row of pending) {
            let list: any[] = bySpot[row[0] + ":" + row[1] + ":" + row[2]];
            let hit: BuildingItem = null;
            for (let candidate of (list ?? [])) {
                if (!used.get(candidate)) {
                    hit = as3.as(candidate, BuildingItem);
                    break;
                }
            }
            if (hit) {
                used.set(hit, true);
            }
            drawn.push([row[0], row[1], row[2], hit]);
        }
        for (let d of drawn) {
            let type: int = d[0] | 0;
            let size: Point = as3.as(sizes[type], Point) || IoPlanShare.GhostSize(type);
            let x: number = Number(d[1]);
            let y: number = Number(d[2]);
            let hit: BuildingItem = as3.as(d[3], BuildingItem);
            let same: boolean = hit != null && (hit.x | 0) == (x | 0) && (hit.y | 0) == (y | 0);
            if (same) {
                counts.same++;
                g.lineStyle(1 * k, 0xFFFFFF, 0.45);
                g.beginFill(0xFFFFFF, 0.1);
                g.drawRect(x, y, size.x, size.y);
                g.endFill();
                continue;
            }
            let colour: uint = (hit ? PlannerDesignView.IO_CMP_MOVED : PlannerDesignView.IO_CMP_THERE) >>> 0;
            if (hit) {
                counts.moved++;
                let hw: number = hit.size.width * hit.scale;
                let hh: number = hit.size.height * hit.scale;
                g.lineStyle(2 * k, colour, 0.85);
                g.moveTo(hit.x + hw / 2, hit.y + hh / 2);
                g.lineTo(x + size.x / 2, y + size.y / 2);
            } else {
                counts.there++;
            }
            g.lineStyle(3 * k, colour, 1);
            g.beginFill(0xFFFFFF, 0.28);
            g.drawRect(x, y, size.x, size.y);
            g.endFill();
        }
        for (let item of items) {
            if (used.get(item)) {
                continue;
            }
            counts.here++;
            let w: number = item.size.width * item.scale;
            let h: number = item.size.height * item.scale;
            g.lineStyle(3 * k, PlannerDesignView.IO_CMP_HERE, 1);
            g.drawRect(item.x - 2 * k, item.y - 2 * k, w + 4 * k, h + 4 * k);
        }
        this._canvas.addChild(s);
        this._ioCompare = s;
        this._ioCompareCounts = counts;
    }

    // ---- Inferno-only (20 October): the walls tool's wall under the pointer
    /** With the walls tool and no drag yet: one wall where a line would start, green (free), grey (none left) or red. */
    private ioHoverMove(param1: MouseEvent = null): void {
        if (this.currentTool != PlannerDesignView.TOOL_WALLLINE || this._ioStart || this._dragging || !this._canvas) {
            this.ioHoverOut();
            return;
        }
        let p: Point = this.ioCanvasPoint();
        let size: int = this.ioWallSize();
        let spot: Point = new Point(PlannerDesignView.ioSnap(p.x - size / 2), PlannerDesignView.ioSnap(p.y - size / 2));
        let free: boolean = this.ioSpotFree(spot, size);
        let left: int = this.ioWallsLeft != null ? this.ioWallsLeft() | 0 : 9999;
        if (!this._ioWallHover || this._ioWallHover.parent != this._canvas) {
            this._ioWallHover = new Sprite();
            this._ioWallHover.name = "ioPlanWallGhost";
            this._ioWallHover.mouseEnabled = false;
            this._ioWallHover.mouseChildren = false;
            this._canvas.addChild(this._ioWallHover);
        }
        let g: Graphics = this._ioWallHover.graphics;
        g.clear();
        g.lineStyle(1, 16777215, 0.85);
        g.beginFill((!free ? 0xE04848 : (left > 0 ? 0x5FD35F : 0x9A9A9A)) >>> 0, 0.55);
        g.drawRect(spot.x, spot.y, size, size);
        g.endFill();
        this._ioWallHover.visible = true;
        // (where it is, for a test: the wall's top-left on the plan, and whether it's free)
        (this._ioWallHover as any).$ioSpot = [spot.x, spot.y, free];
    }

    private ioHoverOut(param1: MouseEvent = null): void {
        if (this._ioWallHover) {
            this._ioWallHover.graphics.clear();
            this._ioWallHover.visible = false;
        }
    }

    // ---- Inferno-only (20 October): path estimates (IoPlanPaths)
    /** The kind of monster the path tool sets down ("towers", "loot", "any"); the tool on (or off, null). */
    public get ioPathKind(): string {
        return this.currentTool == PlannerDesignView.TOOL_IOPATH ? this._ioPathKind : null;
    }

    public ioSetPathTool(kind: string): void {
        this._ioPathKind = kind;
        if (kind) {
            if (this.currentTool == PlannerDesignView.TOOL_IOPATH) {
                // (already on, for another kind: only the kind changes)
                this.dispatchEvent(new Event(BasePlannerPopup.DESIGN_TOOL_UPDATE));
            } else {
                this.setTool(PlannerDesignView.TOOL_IOPATH);
            }
        } else if (this.currentTool == PlannerDesignView.TOOL_IOPATH) {
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        }
    }

    /** Where each kind's monster stands ({kind: Point}). */
    public get ioPathMarks(): any {
        return this._ioPathMarks || {};
    }

    /** What a kind's estimate worked out (IoPlanPaths.estimate), null with no monster of that kind set down. */
    public ioPathResult(kind: string): any {
        if (this._ioPathDirty) {
            this.ioDrawPaths();
        }
        return this._ioPathResults ? this._ioPathResults[kind] : null;
    }

    /** A kind's monster set down at `p` (plan units): its path worked out and drawn, and said. */
    public ioPathPlace(kind: string, p: Point): any {
        if (!this._ioPathMarks) {
            this._ioPathMarks = {};
        }
        this._ioPathMarks[kind] = new Point(Math.round(p.x), Math.round(p.y));
        this.ioDrawPaths();
        let r: any = this._ioPathResults ? this._ioPathResults[kind] : null;
        this.ioSay(this.ioPathSummary(kind, r));
        return r;
    }

    public ioPathRemove(kind: string): void {
        if (this._ioPathMarks && this._ioPathMarks[kind]) {
            delete this._ioPathMarks[kind];
            this.ioDrawPaths();
            this.ioSay(KEYS.Get("io_plan4_path_removed", { "v1": KEYS.Get("io_plan4_path_" + kind) }));
        }
    }

    /** Every estimate taken away (the plan's view rebuilt keeps them; a new planner session starts with none). */
    public ioPathClear(): void {
        this._ioPathMarks = {};
        this.ioDrawPaths();
    }

    /** One line on an estimate: the first target and how far, how many stops shown, how many walls broken. */
    public ioPathSummary(kind: string, r: any): string {
        let name: string = KEYS.Get("io_plan4_path_" + kind);
        if (!r || r.none || !r.legs || !r.legs.length) {
            return KEYS.Get("io_plan4_path_nothing", { "v1": name });
        }
        let walls: int = 0;
        let first: any = null;
        let cells: int = 0;
        for (let leg of r.legs) {
            cells += leg.cells | 0;
            if (leg.wall) {
                walls++;
            } else if (!first) {
                first = leg;
            }
        }
        let firstName: string = first && first.item && first.item.node ? first.item.node.name : "?";
        return KEYS.Get(walls == 1 ? "io_plan4_path_said_one" : "io_plan4_path_said", { "v1": name, "v2": firstName, "v3": (r.legs.length - walls) | 0, "v4": walls }) + (r.fallback ? KEYS.Get("io_plan4_path_fallback") : "");
    }

    /** Drawn again soon (at most every 120 ms: a building being dragged asks on every move). */
    private ioQueuePaths(): void {
        if (!this._ioPathMarks || !this.ioHasPathMarks()) {
            if (this._ioPaths && this._ioPaths.parent) {
                this.ioDrawPaths();
            }
            return;
        }
        this._ioPathDirty = true;
        if (!this._ioPathListening) {
            this._ioPathListening = true;
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPathTick));
        }
    }

    private ioHasPathMarks(): boolean {
        for (let k of IoPlanPaths.KINDS) {
            if (this._ioPathMarks && this._ioPathMarks[k]) {
                return true;
            }
        }
        return false;
    }

    private ioPathTick(param1: Event = null): void {
        if (!this._ioPathDirty) {
            this._ioPathListening = false;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPathTick));
            return;
        }
        if (getTimer() - this._ioPathLast >= 120) {
            this.ioDrawPathsSoon();
        }
    }

    /** The buildings on the plan (not in storage), as the estimates see them. */
    private ioPlanItems(): BuildingItem[] {
        let out: BuildingItem[] = [];
        for (let item of (this.displayInventory ?? [])) {
            if (item && item.parent == this._layerSetBuildings && item.node && item.node.building) {
                out.push(item);
            }
        }
        return out;
    }

    /** Where an estimate is worked out for a monster set down at `at`: the yard and round it, and round the monster. */
    private ioPathArea(at: Point): Rectangle {
        let yard: Rectangle = new Rectangle(-GLOBAL._mapWidth / 2 - 400, -GLOBAL._mapHeight / 2 - 400, GLOBAL._mapWidth + 800, GLOBAL._mapHeight + 800);
        return yard.union(new Rectangle(at.x - 150, at.y - 150, 300, 300));
    }

    /** Every estimate worked out again, here, now, and drawn. */
    private ioDrawPaths(): void {
        this._ioPathDirty = false;
        this._ioPathLast = getTimer();
        this._ioPathShown = ++this._ioPathGen;
        this._ioPathResults = {};
        if (this._canvas && this.ioHasPathMarks()) {
            let items: BuildingItem[] = this.ioPlanItems();
            for (let kind of IoPlanPaths.KINDS) {
                let at: Point = as3.as(this._ioPathMarks[kind], Point);
                if (at) {
                    this._ioPathResults[kind] = IoPlanPaths.estimate(items, at, kind, this.ioPathArea(at));
                }
            }
        }
        this.ioPaintPaths();
    }

    /**
     * (Inferno-only, 21 October, the user's: more of the game on other threads) every estimate worked out again in the
     * planner's background thread (flash/_planPaths), and drawn when it comes back; the last ones stay drawn till
     * then. One at a time: a building still being dragged asks again once it's back (ioPathTick). Without the thread,
     * worked out here, as before.
     */
    private ioDrawPathsSoon(): void {
        if (!GLOBAL.INFERNO_ONLY || !this._canvas || !this.ioHasPathMarks() || !planWorkerAvailable()) {
            this.ioDrawPaths();
            return;
        }
        if (this._ioPathAsked) {
            return;
        }
        this._ioPathDirty = false;
        this._ioPathLast = getTimer();
        let gen: int = ++this._ioPathGen;
        let items: BuildingItem[] = this.ioPlanItems();
        let jobs: any[] = [];
        for (let kind of IoPlanPaths.KINDS) {
            let at: Point = as3.as(this._ioPathMarks[kind], Point);
            if (at) {
                let area: Rectangle = this.ioPathArea(at);
                jobs.push({ "kind": kind, "sx": at.x, "sy": at.y, "ax": area.x, "ay": area.y, "aw": area.width, "ah": area.height });
            }
        }
        this._ioPathAsked = true;
        let asked: boolean = planWorkerEstimate(IoPlanPaths.snapshot(items), jobs, (out: any): void => {
            this._ioPathAsked = false;
            if (this._ioRemoved) {
                return;
            }
            if (!out) {
                this.ioDrawPaths();
                return;
            }
            // (a newer one already drawn: worked out here meanwhile)
            if (gen <= this._ioPathShown) {
                return;
            }
            this._ioPathShown = gen;
            let results: any = {};
            for (let kind in out) {
                results[kind] = IoPlanPaths.withItems(items, out[kind]);
            }
            this._ioPathResults = results;
            this.ioPaintPaths();
        });
        if (!asked) {
            this._ioPathAsked = false;
            this.ioDrawPaths();
        }
    }

    /** The estimates as worked out last, drawn: its monster, its path leg by leg, each stop numbered, each wall it breaks crossed. */
    private ioPaintPaths(): void {
        if (this._ioPaths && this._ioPaths.parent) {
            this._ioPaths.parent.removeChild(this._ioPaths);
        }
        this._ioPaths = null;
        if (!this._canvas || !this.ioHasPathMarks()) {
            return;
        }
        let s: Sprite = new Sprite();
        s.name = "ioPlan4Paths";
        s.mouseEnabled = false;
        s.mouseChildren = false;
        let g: Graphics = s.graphics;
        let k: number = 1 / Math.max(0.05, this._canvas.scaleX);
        for (let kind of IoPlanPaths.KINDS) {
            let at: Point = as3.as(this._ioPathMarks[kind], Point);
            let r: any = this._ioPathResults ? this._ioPathResults[kind] : null;
            if (!at || !r) {
                continue;
            }
            let colour: uint = PlannerDesignView.IO_PATH_COLOURS[kind] >>> 0;
            let n: int = 0;
            for (let li: int = 0; li < r.legs.length; li++) {
                let leg: any = r.legs[li];
                let pts: number[] = leg.points;
                let alpha: number = Math.max(0.4, 0.95 - li * 0.06);
                // (a dark edge under the line, so it shows on any ground)
                for (let pass: int = 0; pass < 2; pass++) {
                    g.lineStyle((pass == 0 ? 6 : 3) * k, pass == 0 ? 0x1A0A04 : colour, pass == 0 ? alpha * 0.55 : alpha);
                    g.moveTo(pts[0], pts[1]);
                    for (let i: int = 2; i < pts.length; i += 2) {
                        g.lineTo(pts[i], pts[i + 1]);
                    }
                }
                let item: BuildingItem = leg.item;
                if (!item) {
                    continue;
                }
                if (leg.wall) {
                    // a wall it breaks: a red cross over it
                    let wx: number = item.x + 10;
                    let wy: number = item.y + 10;
                    g.lineStyle(4 * k, 0x1A0A04, 0.8);
                    g.moveTo(wx - 8 * k, wy - 8 * k);
                    g.lineTo(wx + 8 * k, wy + 8 * k);
                    g.moveTo(wx + 8 * k, wy - 8 * k);
                    g.lineTo(wx - 8 * k, wy + 8 * k);
                    g.lineStyle(2.5 * k, 0xFF3030, 1);
                    g.moveTo(wx - 7 * k, wy - 7 * k);
                    g.lineTo(wx + 7 * k, wy + 7 * k);
                    g.moveTo(wx + 7 * k, wy - 7 * k);
                    g.lineTo(wx - 7 * k, wy + 7 * k);
                } else {
                    // a building destroyed: its number, in the kind's colour (each kind's a little to one side, so
                    // two kinds' numbers on one building both show)
                    n++;
                    let side: number = (IoPlanPaths.KINDS.indexOf(kind) - 1) * 11 * k;
                    let cx: number = item.x + item.size.width / 2 + side;
                    let cy: number = item.y + item.size.height / 2 + side;
                    g.lineStyle(2 * k, 0x1A0A04, 1);
                    g.beginFill(colour, 1);
                    g.drawCircle(cx, cy, 10 * k);
                    g.endFill();
                    let label: TextField = IoMapUi.label(String(n), 11, 0x1A0A04, true, 30, "center");
                    label.scaleX = label.scaleY = k;
                    label.x = cx - 15 * k;
                    label.y = cy - 8 * k;
                    s.addChild(label);
                }
            }
            // its monster: a ringed disc with the kind's letter
            g.lineStyle(3 * k, 0xFFFFFF, 1);
            g.beginFill(colour, 1);
            g.drawCircle(at.x, at.y, 13 * k);
            g.endFill();
            g.lineStyle(1.5 * k, 0x1A0A04, 1);
            g.drawCircle(at.x, at.y, 15 * k);
            let tag: TextField = IoMapUi.label(KEYS.Get("io_plan4_path_tag_" + kind), 12, 0x1A0A04, true, 30, "center");
            tag.scaleX = tag.scaleY = k;
            tag.x = at.x - 15 * k;
            tag.y = at.y - 9 * k;
            s.addChild(tag);
        }
        this._canvas.addChild(s);
        this._ioPaths = s;
    }
}
