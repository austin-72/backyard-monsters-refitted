import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { BASE, BasePlannerNodeEvent, BasePlannerPopup, BasePlannerPopup_xSpot, BuildingItem, Checkbox, DashedLine, GAME, GLOBAL, HitTestBitmap, PlannerNode, STORE } from "@game";

export class PlannerDesignView extends Sprite {
    static {
        as3.fields(this, { _canvas: null, _layerSelectBuildings: null, _layerSelectRanges: null, _layerShroud: null, _layerSetBuildings: null, _layerSetRanges: null, _layerGround: null, displayData: null, displayInventory: null, fontSize: null, xSpot: null, zoomMax: 2, zoomMin: 0.25, zoomStep: 0.25, rangeCheckboxesFlags: 0, _isAddingBuilding: false, _dragging: false, _dragged: false, _dragOffset: null, _dragPoint: null, _windowRect: null, GRASSCOLOR: 6723891, BOUNDS_LINE_COLOR: 16777215, BOUNDS_DASHEDLINE_COLOR: 15658734, BOUNDS_LINE_WEIGHT: 2, MAX_YARD_DIMENSIONS: null, YARD_EXPANSIONS: null, currentTool: "selectmove", toolTarget: null, _selectMoveDragging: false, _selectMoveTarget: null, _selectMoveInventoryBuilding: false, _selectMoveDragPoint: null, _ioDragW: NaN, _ioDragH: NaN, ioTakeWall: null, ioWallsLeft: null, ioPlacingLine: false, ioStatus: null, _ioSelection: null, _ioOverlay: null, _ioStart: null, _ioGroupDragging: false, _ioGroupAnchor: null, _ioGroupOffset: null, _ioGroupOrigins: null, _ioGroupMembers: null, _ioGroupLastDX: 0, _ioGroupLastDY: 0, _ioClickHandled: false, _ioWallSize: 0 });
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

    public static readonly MOUSE_POSITION_SNAP_THRESHHOLD: int = 5;

    /** Slack, in planner units, around a footprint before two buildings count as far apart. */
    private static readonly IO_NEAR: number = 4;

    private static readonly IO_SELECT_GLOW: GlowFilter = new GlowFilter(0xFFD24A, 1, 8, 8, 4, 2);
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
        this.populateBuildingItems(this.displayData);
        this.drawRanges();
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
        if (this.currentTool == PlannerDesignView.TOOL_SELECTMOVE) {
            if (this._selectMoveDragging) {
            }
        }
    }

    public canvasDragStart(param1: MouseEvent = null): void {
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT || this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            this.ioToolStart();
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
        if (!param1.target instanceof BuildingItem) {
            return;
        }
        _loc2_ = as3.as(param1.target, BuildingItem);
        if (_loc2_.props.type == "enemy") {
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
    }

    public onBuildingOut(param1: BasePlannerNodeEvent): void {
        if (!this._selectMoveDragging) {
            this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT_HIDE, param1.node));
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
        this.redrawRanges();
    }

    public stopDragBuilding(param1: BuildingItem, param2: boolean = false): void {
        this._selectMoveDragging = false;
        this._isAddingBuilding = false;
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

    public validateBuilding(param1: BuildingItem): boolean {
        let _loc2_: int = 0;
        while (_loc2_ < this.displayInventory.length) {
            if (as3.vget(this.displayInventory, _loc2_) != param1) {
                if (HitTestBitmap.complexHitTestObject(param1.mc, as3.vget(this.displayInventory, _loc2_).mc)) {
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
        this.clearAllLayers();
    }

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
            if (_loc3_) {
                _loc1_.mouseEnabled = false;
                _loc1_.graphics.lineStyle(3, 16777215, 0.25);
                _loc1_.graphics.beginFill(16711680, 0.1);
                _loc1_.graphics.drawCircle(_loc2_.x + _loc2_.widthsize / 2, _loc2_.y + _loc2_.widthsize / 2, _loc2_.node.range * _loc2_.scale);
                this._layerSetRanges.addChild(_loc1_);
                _loc1_.graphics.endFill();
            }
            _loc4_++;
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
        this._ioStart = this.ioCanvasPoint();
        GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioToolMove));
        GAME._instance.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioToolEnd));
    }

    private ioToolMove(param1: MouseEvent = null): void {
        let end: Point = this.ioCanvasPoint();
        let layer: Sprite = this.ioOverlayLayer();
        let spot: Point = null;
        layer.graphics.clear();
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT) {
            layer.graphics.lineStyle(2, 16765514, 0.9);
            layer.graphics.beginFill(16765514, 0.12);
            layer.graphics.drawRect(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y));
            layer.graphics.endFill();
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            let size: int = this.ioWallSize();
            let left: int = this.ioWallsLeft != null ? this.ioWallsLeft() | 0 : 9999;
            let fits: int = 0;
            let blocked: int = 0;
            for (spot of (this.ioWallSpots(this._ioStart, end, size) ?? [])) {
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
            this.ioSay(Math.min(fits, left) + " wall" + (Math.min(fits, left) == 1 ? "" : "s") + " will be placed" + (blocked > 0 ? ", " + blocked + " spot" + (blocked == 1 ? "" : "s") + " blocked (red)" : "") + (fits > left ? ", " + (fits - left) + " more than you have in storage (grey)" : "") + ".");
        }
    }

    private ioToolEnd(param1: MouseEvent = null): void {
        GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioToolMove));
        GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioToolEnd));
        let end: Point = this.ioCanvasPoint();
        if (this._ioOverlay) {
            this._ioOverlay.graphics.clear();
        }
        if (this.currentTool == PlannerDesignView.TOOL_AREASELECT) {
            this.ioSelectArea(new Rectangle(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y)));
            this.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        } else if (this.currentTool == PlannerDesignView.TOOL_WALLLINE) {
            this.ioPlaceWallLine(this._ioStart, end);
        }
        this._ioStart = null;
    }

    // ---- Selection
    private ioSelectArea(param1: Rectangle): void {
        let item: BuildingItem = null;
        this.ioClearSelection();
        if (param1.width < 4 && param1.height < 4) {
            this.ioSay("Selection cleared.");
            return;
        }
        for (item of (this.displayInventory ?? [])) {
            if (item.props && item.props.type == "enemy") {
                continue;
            }
            if (param1.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                this._ioSelection.push(item);
                item.filters = [PlannerDesignView.IO_SELECT_GLOW];
            }
        }
        this.ioSay(this._ioSelection.length > 0 ? this._ioSelection.length + " selected. Click one of them to move them all, or use Flip / Rotate." : "Nothing in that box.");
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
        return !(param1.props && param1.props.type == "enemy");
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
                if (b && b != a && HitTestBitmap.complexHitTestObject(a.mc, b.mc)) {
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
        this.ioSay("Moving " + this._ioSelection.length + " buildings: click to put them down.");
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
            // The planner's pictures are solid squares (BasePlannerPopup_DisplayItem_Building, scaled to the
            // footprint), so two overlap exactly when their boxes do by a pixel or more: the pixel test
            // (drawing both into a bitmap and reading it back) gave the same answer at many times the cost
            // while a group is dragged (fps pass, 4 October).
            let box: Rectangle = HitTestBitmap.intersectionRectangle(param1.mc, other.mc);
            if (box.width >= 1 && box.height >= 1) {
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
        this.ioSay(ok ? "Moved." : "They would not all fit there, so they went back.");
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
            if (item.props && item.props.type == "enemy") {
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
                    this.ioSay("That does not fit in the yard as it is. Nothing was moved.");
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
        this.ioSay(stayed > 0 ? stayed + " building" + (stayed == 1 ? "" : "s") + " did not fit and stayed where " + (stayed == 1 ? "it was." : "they were.") : "Done.");
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
        for (spot of (this.ioWallSpots(param1, param2, size) ?? [])) {
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
        let report: string = placed > 0 ? "Placed " + placed + " wall" + (placed == 1 ? "" : "s") : "No walls placed";
        if (blocked > 0) {
            report += ", " + blocked + " spot" + (blocked == 1 ? "" : "s") + " blocked";
        }
        if (ranOut) {
            report += placed > 0 ? ". Storage is now out of walls." : ": there are no walls in storage.";
        }
        this.ioSay(report + (ranOut ? "" : "."));
    }
}
