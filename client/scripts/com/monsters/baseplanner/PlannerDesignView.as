package com.monsters.baseplanner {
    import com.monsters.baseplanner.components.BuildingItem;
    import com.monsters.baseplanner.components.DashedLine;
    import com.monsters.baseplanner.components.HitTestBitmap;
    import com.monsters.baseplanner.events.BasePlannerNodeEvent;
    import com.monsters.baseplanner.popups.BasePlannerPopup;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.filters.GlowFilter;
    import flash.utils.Dictionary;

    public class PlannerDesignView extends Sprite {

        public static var zoomValue:Number = 0.5;

        public static const CHECKBOX_GROUND:uint = 0;

        public static const CHECKBOX_AIR:uint = 1;

        public static const CHECKBOX_TRAP:uint = 2;

        private static const SIDEBAR_WIDTH:int = 140;

        private static const BOTTOMBAR_HEIGHT:int = 50;

        private static const SCROLL_ACTIVATION_PIXEL_THRESHOLD:int = 20;

        public static var SHOULD_SHOW_MOREINFO:Boolean = true;

        public static var SHOULD_SHOW_FORTIFICATION:Boolean = false;

        public static const BUILDING_CLICK:String = "building_clicked";

        public static const BUILDING_OVER:String = "building_over";

        public static const BUILDING_OUT:String = "building_out";

        public static const BUILDING_PLACED:String = "building_placed";

        public static const CANVAS_CLICK:String = "view_clicked";

        public static const STATE_CHANGE:String = "design_statechange";

        private static const ADD_INVENTORY_PAINTMODE:Boolean = true;

        public static const TOOL_SELECTMOVE:String = "selectmove";

        public static const TOOL_STORE:String = "storebuilding";

        /** Inferno-only planner tools (see the "Planner tools" section at the end of this class). */
        public static const TOOL_AREASELECT:String = "areaselect";

        public static const TOOL_WALLLINE:String = "wallline";

        public static const MOUSE_POSITION_SNAP_THRESHHOLD:int = 5;

        private var _canvas:Sprite;

        private var _layerSelectBuildings:Sprite;

        private var _layerSelectRanges:Sprite;

        private var _layerShroud:Sprite;

        private var _layerSetBuildings:Sprite;

        private var _layerSetRanges:Sprite;

        private var _layerGround:Sprite;

        private var displayData:Vector.<PlannerNode>;

        private var displayInventory:Vector.<BuildingItem>;

        private var fontSize:Point;

        public var xSpot:MovieClip;

        public const zoomMax:Number = 2;

        public const zoomMin:Number = 0.25;

        public const zoomStep:Number = 0.25;

        private var rangeCheckboxesFlags:uint = 0;

        private var _isAddingBuilding:Boolean = false;

        public var _dragging:Boolean = false;

        public var _dragged:Boolean = false;

        private var _dragOffset:Point;

        public var _dragPoint:Point;

        public var _windowRect:Rectangle;

        private const GRASSCOLOR:uint = 6723891;

        private const BOUNDS_LINE_COLOR:uint = 16777215;

        private const BOUNDS_DASHEDLINE_COLOR:uint = 15658734;

        private const BOUNDS_LINE_WEIGHT:uint = 2;

        private const MAX_YARD_DIMENSIONS:Point = new Point(3240, 2600);

        private const YARD_EXPANSIONS:Array = [new Point(1000, 800), new Point(1100, 880), new Point(1220, 980), new Point(1340, 1080), new Point(1480, 1180), new Point(1620, 1300), new Point(1780, 1420)];

        public var currentTool:String = "selectmove";

        public var toolTarget:Object;

        public var _selectMoveDragging:Boolean = false;

        public var _selectMoveTarget:BuildingItem;

        public var _selectMoveInventoryBuilding:Boolean = false;

        public var _selectMoveDragPoint:Point;

        public function PlannerDesignView(param1:Vector.<PlannerNode>) {
            this.fontSize = new Point(14, 12);
            this._windowRect = new Rectangle(35, 65, 565, 425);
            super();
            this.displayData = param1;
        }

        public function setup():void {
            this.clearAllLayers();
            if (this._canvas) {
                this.clearLayer(this._canvas);
            }
            this._canvas = new Sprite();
            this.addChild(this._canvas);
            addEventListener(MouseEvent.MOUSE_DOWN, this.canvasDragStart);
            addEventListener(MouseEvent.CLICK, this.onCanvasClick);
            this._canvas.addChild(this._layerGround);
            this._canvas.addChild(this._layerSetBuildings);
            this._canvas.addChild(this._layerSetRanges);
            this._canvas.addChild(this._layerShroud);
            this._canvas.addChild(this._layerSelectRanges);
            this._canvas.addChild(this._layerSelectBuildings);
            this.setZoom(zoomValue);
            this.centerView();
            this.displayInventory = new Vector.<BuildingItem>();
            this.fillGrass(this._layerGround);
            this.drawYardBounds();
            this.populateBuildingItems(this.displayData);
            this.drawRanges();
            this.recenter();
        }

        public function centerView():void {
            this._canvas.x = 260;
            this._canvas.y = 290;
        }

        public function populateBuildingItems(param1:Vector.<PlannerNode>):void {
            var _loc4_:BuildingItem = null;
            this._ioSelection = new Vector.<BuildingItem>();
            this._ioGroupDragging = false;
            var _loc2_:int = 1;
            var _loc3_:int = 0;
            while (_loc3_ < param1.length) {
                (_loc4_ = new BuildingItem(param1[_loc3_])).addEventListener(BUILDING_CLICK, this.onBuildingClick);
                _loc4_.addEventListener(BUILDING_OVER, this.onBuildingOver);
                _loc4_.addEventListener(BUILDING_OUT, this.onBuildingOut);
                this._layerSetBuildings.addChild(_loc4_);
                this.displayInventory.push(_loc4_);
                _loc3_++;
            }
        }

        private function drawYardBounds():void {
            var _loc5_:Rectangle = null;
            var _loc6_:Rectangle = null;
            var _loc8_:Sprite = null;
            var _loc9_:DashedLine = null;
            var _loc1_:int = 1;
            if (STORE._storeData.ENL) {
                _loc1_ = STORE._storeData.ENL.q + 1;
            }
            var _loc2_:int = 0;
            if (STORE._storeData.ENL) {
                _loc2_ = int(STORE._storeData.ENL.q);
            }
            var _loc3_:Point = new Point();
            var _loc4_:Point = new Point();
            _loc3_ = this.YARD_EXPANSIONS[_loc2_];
            _loc4_ = this.YARD_EXPANSIONS[Math.min(_loc2_ + 1, this.YARD_EXPANSIONS.length - 1)];
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
            var _loc7_:Sprite;
            (_loc7_ = new Sprite()).graphics.lineStyle(this.BOUNDS_LINE_WEIGHT, this.BOUNDS_LINE_COLOR, 1);
            _loc7_.graphics.beginFill(16777215, 0.25);
            _loc7_.graphics.drawRect(_loc5_.x, _loc5_.y, _loc5_.width, _loc5_.height);
            _loc7_.graphics.endFill();
            this._layerGround.addChild(_loc7_);
        }

        public function setZoom(param1:Number):void {
            if (param1 > 0 && param1 < 10) {
                zoomValue = param1;
                this._canvas.scaleX = this._canvas.scaleY = zoomValue;
                this.dealWithZoomReposition();
            }
        }

        private function dealWithZoomReposition():void {
            this._dragOffset = new Point(this._canvas.x - mouseX, this._canvas.y - mouseY);
            this.checkDragBounds();
        }

        public function fillGrass(param1:Sprite):void {
            var _loc2_:Sprite = new Sprite();
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

        public function onCanvasClick(param1:MouseEvent = null):void {
            if (this._ioClickHandled) {
                // The same click already reached a building (onBuildingClick runs first).
                this._ioClickHandled = false;
                return;
            }
            if (this._ioGroupDragging) {
                this.ioGroupDrop();
                return;
            }
            if (this.currentTool == TOOL_SELECTMOVE) {
                if (this._selectMoveDragging) {
                }
            }
        }

        public function canvasDragStart(param1:MouseEvent = null):void {
            if (this.currentTool == TOOL_AREASELECT || this.currentTool == TOOL_WALLLINE) {
                this.ioToolStart();
                return;
            }
            this._dragging = true;
            this._dragged = false;
            this._dragOffset = new Point(this._canvas.x - mouseX, this._canvas.y - mouseY);
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
            GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, this.canvasDrag);
            GAME._instance.addEventListener(MouseEvent.MOUSE_UP, this.canvasDragStop);
            GAME._instance.addEventListener(MouseEvent.ROLL_OUT, this.canvasDragStop);
        }

        public function canvasDragStop(param1:MouseEvent = null):void {
            this._dragging = false;
            if (GLOBAL.INFERNO_ONLY) {
                this._canvas.cacheAsBitmap = false;
            }
            GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, this.canvasDrag);
            GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, this.canvasDragStop);
            GAME._instance.removeEventListener(MouseEvent.ROLL_OUT, this.canvasDragStop);
        }

        public function canvasDrag(param1:Event = null):void {
            if (this._dragged) {
                this.checkDragBounds();
                return;
            }
            var _loc2_:Number = this._canvas.x - (mouseX + this._dragOffset.x);
            var _loc3_:Number = this._canvas.y - (mouseY + this._dragOffset.y);
            if (Math.abs(_loc2_) > SCROLL_ACTIVATION_PIXEL_THRESHOLD || Math.abs(_loc3_) > SCROLL_ACTIVATION_PIXEL_THRESHOLD) {
                this._dragOffset.x += _loc2_;
                this._dragOffset.y += _loc3_;
                this.checkDragBounds();
            }
        }

        private var _ioDragW:Number = NaN;

        private var _ioDragH:Number = NaN;

        private function checkDragBounds():void {
            var cw:Number = this._dragging && !isNaN(this._ioDragW) ? this._ioDragW : this._canvas.width;
            var chh:Number = this._dragging && !isNaN(this._ioDragH) ? this._ioDragH : this._canvas.height;
            var _loc1_:Number = mouseX + this._dragOffset.x;
            if (_loc1_ > cw / 2) {
                _loc1_ = cw / 2;
            }
            else if (_loc1_ < GLOBAL._SCREEN.width - cw / 2 - SIDEBAR_WIDTH) {
                _loc1_ = GLOBAL._SCREEN.width - cw / 2 - SIDEBAR_WIDTH;
            }
            if (cw < GLOBAL._SCREEN.width) {
                _loc1_ = GLOBAL._SCREEN.width / 2 - SIDEBAR_WIDTH;
            }
            this._canvas.x = _loc1_;
            _loc1_ = mouseY + this._dragOffset.y;
            if (_loc1_ > chh / 2) {
                _loc1_ = chh / 2;
            }
            else if (_loc1_ < GLOBAL._SCREEN.height - chh / 2 - BOTTOMBAR_HEIGHT) {
                _loc1_ = GLOBAL._SCREEN.height - chh / 2 - BOTTOMBAR_HEIGHT;
            }
            if (chh < GLOBAL._SCREEN.height) {
                _loc1_ = GLOBAL._SCREEN.height / 2 - BOTTOMBAR_HEIGHT;
            }
            this._canvas.y = _loc1_;
            this._dragged = true;
        }

        public function recenter():void {
            this._canvas.x = GLOBAL._SCREEN.width / 2 - SIDEBAR_WIDTH;
            this._canvas.y = GLOBAL._SCREEN.height / 2 - BOTTOMBAR_HEIGHT;
        }

        public function addInventoryItem(param1:PlannerNode):void {
            var _loc2_:BuildingItem = null;
            var _loc3_:Point = null;
            var _loc4_:* = false;
            if (!this._isAddingBuilding) {
                this._isAddingBuilding = true;
                _loc2_ = new BuildingItem(param1);
                _loc2_.addEventListener(BUILDING_CLICK, this.onBuildingClick);
                _loc2_.addEventListener(BUILDING_OVER, this.onBuildingOver);
                _loc2_.addEventListener(BUILDING_OUT, this.onBuildingOut);
                _loc2_.x = 0;
                _loc2_.y = 0;
                _loc3_ = new Point(0, 0);
                if (this._dragPoint) {
                    _loc3_ = this._dragPoint;
                }
                _loc2_.x = -(_loc2_.mc.width / 2);
                _loc2_.y = -(_loc2_.mc.height / 2);
                _loc2_.x += int((mouseX - this._canvas.x) / this._canvas.scaleX);
                _loc2_.y += int((mouseY - this._canvas.y) / this._canvas.scaleY);
                this._layerSetBuildings.addChild(_loc2_);
                this.displayInventory.push(_loc2_);
                this.addMode(_loc2_);
            }
            else {
                _loc4_ = param1.type == this._selectMoveTarget.node.type;
                if (this._selectMoveDragging) {
                    this.cancelAddInventory(this._selectMoveTarget);
                    if (!_loc4_) {
                        this.addInventoryItem(param1);
                    }
                }
            }
        }

        public function cancelAddInventory(param1:BuildingItem):void {
            this._selectMoveDragging = false;
            this._isAddingBuilding = false;
            this._selectMoveInventoryBuilding = false;
            this.currentTool = TOOL_SELECTMOVE;
            this.removeBuildingItem(param1);
            dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
            removeEventListener(MouseEvent.MOUSE_MOVE, this.dragBuildingTick);
        }

        public function addMode(param1:BuildingItem):void {
            this.currentTool = TOOL_SELECTMOVE;
            this.toolTarget = param1;
            this.dragBuilding(param1, true);
        }

        public function setTool(param1:String):void {
            if (this.currentTool == param1) {
                return;
            }
            this.currentTool = param1;
            dispatchEvent(new Event(BasePlannerPopup.DESIGN_TOOL_UPDATE));
            if (param1) {
                this.removeSelection();
            }
        }

        public function removeSelection():void {
            if (this._selectMoveTarget) {
                this.cancelDragBuilding(this._selectMoveTarget);
            }
        }

        public function onBuildingClick(param1:BasePlannerNodeEvent):void {
            var _loc2_:BuildingItem = null;
            var _loc3_:PlannerNode = null;
            this.toolTarget = param1.target as Object;
            if (!param1.target is BuildingItem) {
                return;
            }
            _loc2_ = param1.target as BuildingItem;
            if (_loc2_.props.type == "enemy") {
                return;
            }
            if (this._ioGroupDragging) {
                this._ioClickHandled = true;
                this.ioGroupDrop();
                return;
            }
            if (this.currentTool == TOOL_SELECTMOVE && !this._selectMoveDragging && this._ioSelection.length > 1 && this._ioSelection.indexOf(_loc2_) != -1) {
                this._ioClickHandled = true;
                this.ioGroupPickUp(_loc2_);
                return;
            }
            if (this.currentTool == TOOL_SELECTMOVE || this._selectMoveDragging) {
                this.dragBuilding(_loc2_);
            }
            else if (this.currentTool == TOOL_STORE) {
                this.storeBuilding(_loc2_);
                this.redrawRanges();
            }
        }

        public function onBuildingOver(param1:BasePlannerNodeEvent):void {
            dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT, param1.node));
        }

        public function onBuildingOut(param1:BasePlannerNodeEvent):void {
            if (!this._selectMoveDragging) {
                dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT_HIDE, param1.node));
            }
        }

        public function storeBuilding(param1:BuildingItem):void {
            dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_STORE, param1.node));
            dispatchEvent(new Event(STATE_CHANGE));
            this.removeBuildingItem(param1);
        }

        public function spliceDisplayData(param1:PlannerNode):void {
            this.displayData.splice(this.displayData.indexOf(param1), 1);
        }

        public function removeBuildingItem(param1:BuildingItem):void {
            var _loc2_:int = 0;
            while (_loc2_ < this.displayInventory.length) {
                if (param1 == this.displayInventory[_loc2_]) {
                    this.displayInventory[_loc2_].parent.removeChild(this.displayInventory[_loc2_]);
                    this.displayInventory.splice(_loc2_, 1);
                    param1 = null;
                    return;
                }
                _loc2_++;
            }
        }

        public function dragBuilding(param1:BuildingItem, param2:Boolean = false):void {
            if (this._selectMoveDragging && this._selectMoveTarget != param1) {
                return; // a different building is already being dragged.
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
            }
            else {
                this.stopDragBuilding(param1);
            }
        }

        public function startDragBuilding(param1:BuildingItem):void {
            var _loc2_:Boolean = false;
            if (this._selectMoveDragging) {
                return;
            }
            this._selectMoveDragging = true;
            this.sortBuildingOrder(param1, "front");
            param1.setPositionReference();
            if (_loc2_) {
                this._selectMoveDragPoint = new Point(param1.x - (this.mouseX - this._canvas.x) / this._canvas.scaleX, param1.y - (this.mouseY - this._canvas.y) / this._canvas.scaleY);
            }
            else {
                this._selectMoveDragPoint = new Point(0 - param1.widthsize / 2 * param1.scale, 0 - param1.widthsize / 2 * param1.scale);
            }
            addEventListener(MouseEvent.MOUSE_MOVE, this.dragBuildingTick);
        }

        public function stepDragBuilding(param1:BuildingItem):void {
        }

        public function dragBuildingTick(param1:Event):void {
            this._selectMoveTarget.toggleInvalid(!this.validateBuilding(this._selectMoveTarget));
            this._selectMoveTarget.x = int(((this.mouseX - this._canvas.x) / this._canvas.scaleX + this._selectMoveDragPoint.x) / MOUSE_POSITION_SNAP_THRESHHOLD) * MOUSE_POSITION_SNAP_THRESHHOLD;
            this._selectMoveTarget.y = int(((this.mouseY - this._canvas.y) / this._canvas.scaleY + this._selectMoveDragPoint.y) / MOUSE_POSITION_SNAP_THRESHHOLD) * MOUSE_POSITION_SNAP_THRESHHOLD;
            this.redrawRanges();
        }

        public function stopDragBuilding(param1:BuildingItem, param2:Boolean = false):void {
            this._selectMoveDragging = false;
            this._isAddingBuilding = false;
            if (this.validateBuilding(param1)) {
                param1.toggleInvalid(false);
                param1.setPositionReference();
                this.updateNodeReference(param1);
                if (this._selectMoveInventoryBuilding) {
                    this.displayData.push(param1.node);
                    dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_PLACE, param1.node));
                }
                dispatchEvent(new Event(STATE_CHANGE));
            }
            else {
                if (this._selectMoveInventoryBuilding) {
                    if (ADD_INVENTORY_PAINTMODE && !param2) {
                        this._selectMoveDragging = true;
                        this._isAddingBuilding = true;
                        return;
                    }
                    this.removeBuildingItem(param1);
                    dispatchEvent(new Event(BasePlannerPopup.DESIGN_CLEAR_EXPLORER));
                }
                param1.resetPositionReference();
                dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
            }
            if (!this._selectMoveDragging) {
                removeEventListener(MouseEvent.MOUSE_MOVE, this.dragBuildingTick);
                param1.toggleInvalid(false);
                this._selectMoveInventoryBuilding = false;
                this.setTool(TOOL_SELECTMOVE);
            }
        }

        public function cancelDragBuilding(param1:BuildingItem):void {
            this._selectMoveDragging = false;
            this._isAddingBuilding = false;
            if (this._selectMoveInventoryBuilding) {
                this.removeBuildingItem(param1);
                dispatchEvent(new Event(BasePlannerPopup.DESIGN_CLEAR_EXPLORER));
            }
            param1.resetPositionReference();
            dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_INVALID, param1.node));
            if (!this._selectMoveDragging) {
                removeEventListener(MouseEvent.MOUSE_MOVE, this.dragBuildingTick);
                param1.toggleInvalid(false);
                this._selectMoveInventoryBuilding = false;
                this._selectMoveTarget = null;
            }
        }

        public function updateNodeReference(param1:BuildingItem):void {
            var _loc2_:int = 0;
            while (_loc2_ < this.displayData.length) {
                if (this.displayData[_loc2_] == param1.node) {
                    this.displayData[_loc2_].x = param1.node.x;
                    this.displayData[_loc2_].y = param1.node.y;
                    return;
                }
                _loc2_++;
            }
        }

        public function sortBuildingOrder(param1:BuildingItem, param2:String = "front"):void {
            var _loc4_:int = 0;
            var _loc5_:int = 0;
            var _loc3_:Sprite = param1.parent as Sprite;
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

        public function validateBuilding(param1:BuildingItem):Boolean {
            var _loc2_:int = 0;
            while (_loc2_ < this.displayInventory.length) {
                if (this.displayInventory[_loc2_] != param1) {
                    if (HitTestBitmap.complexHitTestObject(param1.mc, this.displayInventory[_loc2_].mc)) {
                        return false;
                    }
                }
                _loc2_++;
            }
            var _loc3_:int = 0;
            if (STORE._storeData.ENL) {
                _loc3_ = int(STORE._storeData.ENL.q);
            }
            var _loc4_:Point = this.YARD_EXPANSIONS[_loc3_];
            if (GLOBAL.INFERNO_ONLY) {
                // The same yard drawYardBounds() shows: the size the game really uses. The stock table
                // above could differ from it, so buildings were refused (or allowed) past the drawn edge.
                _loc4_ = new Point(GLOBAL._mapWidth, GLOBAL._mapHeight);
            }
            if (param1.category != BuildingItem.TYPE_DECORATION) {
                if (param1.x < -_loc4_.x / 2 || param1.y < -_loc4_.y / 2 || param1.x > _loc4_.x / 2 - param1.widthsize || param1.y > _loc4_.y / 2 - param1.widthsize) {
                    return false;
                }
            }
            else if (param1.x < -this.MAX_YARD_DIMENSIONS.x / 2 || param1.y < -this.MAX_YARD_DIMENSIONS.y / 2 || param1.x > this.MAX_YARD_DIMENSIONS.x / 2 - param1.widthsize || param1.y > this.MAX_YARD_DIMENSIONS.y / 2 - param1.widthsize) {
                return false;
            }
            return true;
        }

        public function Bounds():void {
        }

        public function clearAllLayers():void {
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

        public function clearLayer(param1:Sprite):void {
            while (param1.numChildren) {
                if ("remove" in param1.getChildAt(0)) {
                    (param1.getChildAt(0) as Object).remove();
                }
                param1.removeChildAt(0);
            }
        }

        public function remove():void {
            removeEventListener(MouseEvent.MOUSE_DOWN, this.canvasDragStart);
            removeEventListener(MouseEvent.CLICK, this.onCanvasClick);
            GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, this.canvasDrag);
            GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, this.canvasDragStop);
            GAME._instance.removeEventListener(MouseEvent.ROLL_OUT, this.canvasDragStop);
            this.clearAllLayers();
        }

        public function redraw(param1:Vector.<PlannerNode> = null):void {
            this.setup();
        }

        public function toggleView(param1:Checkbox):void {
            switch (param1.name) {
                case "check1":
                    this.rangeCheckboxesFlags ^= 1 << CHECKBOX_GROUND;
                    break;
                case "check2":
                    this.rangeCheckboxesFlags ^= 1 << CHECKBOX_AIR;
                    break;
                case "check3":
                    this.rangeCheckboxesFlags ^= 1 << CHECKBOX_TRAP;
                    break;
                case "check4":
                    this.toggleMoreInfo(param1.Checked);
            }
            this.redrawRanges();
        }

        private function toggleMoreInfo(param1:Boolean = false):void {
            if (!SHOULD_SHOW_MOREINFO) {
                return;
            }
            var _loc2_:int = 0;
            while (_loc2_ < this.displayInventory.length) {
                this.displayInventory[_loc2_].toggleMoreInfo(param1, SHOULD_SHOW_FORTIFICATION);
                _loc2_++;
            }
        }

        public function redrawRanges():void {
            this.clearRanges();
            this.drawRanges();
        }

        private function clearRanges():void {
            while (this._layerSetRanges.numChildren) {
                this._layerSetRanges.removeChildAt(0);
            }
        }

        private function drawRanges():void {
            var _loc2_:BuildingItem = null;
            var _loc3_:Boolean = false;
            var _loc1_:Sprite = new Sprite();
            var _loc4_:int = 0;
            while (_loc4_ < this._layerSetBuildings.numChildren) {
                _loc3_ = false;
                _loc2_ = this._layerSetBuildings.getChildAt(_loc4_) as BuildingItem;
                if (Boolean(this.rangeCheckboxesFlags & 1 << CHECKBOX_TRAP) && _loc2_.category == BuildingItem.TYPE_TRAP) {
                    _loc3_ = true;
                }
                else if (_loc2_.rangeCategory()) {
                    switch (_loc2_.rangeCategory()) {
                        case 1:
                        case 2:
                            _loc3_ = Boolean(this.rangeCheckboxesFlags & 1 << _loc2_.rangeCategory() - 1);
                            break;
                        case 3:
                            _loc3_ = Boolean(this.rangeCheckboxesFlags & 1 << CHECKBOX_GROUND || this.rangeCheckboxesFlags & 1 << CHECKBOX_AIR);
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
    
        // ---------------------------------------------------------------------------------------------
        // Planner tools (inferno-only): select an area, move the selection together, flip / rotate,
        // and lay a straight line of walls from storage. Buttons: BasePlannerPopup.ioAddTools().
        // ---------------------------------------------------------------------------------------------

        /** Set by the popup: returns a wall from storage (not yet placed), or null when there are none left. */
        public var ioTakeWall:Function = null;

        /** Set by the popup: how many walls are in storage. */
        public var ioWallsLeft:Function = null;

        /** True while the wall line places its walls (the storage list then takes out exactly those). */
        public var ioPlacingLine:Boolean = false;

        /** Set by the popup: shows a line in the toolbar's status strip. */
        public var ioStatus:Function = null;

        private function ioSay(param1:String):void {
            if (this.ioStatus != null) {
                this.ioStatus(param1);
            }
            else {
                GLOBAL.Message(param1);
            }
        }

        private var _ioSelection:Vector.<BuildingItem> = new Vector.<BuildingItem>();

        private var _ioOverlay:Sprite = null;

        private var _ioStart:Point = null;

        private var _ioGroupDragging:Boolean = false;

        private var _ioGroupAnchor:BuildingItem = null;

        private var _ioGroupOffset:Point = null;

        private var _ioGroupOrigins:Vector.<Point> = null;

        /** Slack, in planner units, around a footprint before two buildings count as far apart. */
        private static const IO_NEAR:Number = 4;

        /** The selection as a set, for the overlap checks of a group move (see ioValidateInGroup). */
        private var _ioGroupMembers:Dictionary = null;

        /** The snapped offset last applied by ioGroupTick: moves that don't change it change nothing. */
        private var _ioGroupLastDX:int = int.MIN_VALUE;

        private var _ioGroupLastDY:int = int.MIN_VALUE;

        private var _ioClickHandled:Boolean = false;

        private static const IO_SELECT_GLOW:GlowFilter = new GlowFilter(0xFFD24A, 1, 8, 8, 4, 2);

        public function get ioSelectionCount():int {
            return this._ioSelection.length;
        }

        private function ioCanvasPoint():Point {
            return new Point((mouseX - this._canvas.x) / this._canvas.scaleX, (mouseY - this._canvas.y) / this._canvas.scaleY);
        }

        private static function ioSnap(param1:Number):int {
            return Math.round(param1 / MOUSE_POSITION_SNAP_THRESHHOLD) * MOUSE_POSITION_SNAP_THRESHHOLD;
        }

        private function ioOverlayLayer():Sprite {
            if (!this._ioOverlay || this._ioOverlay.parent != this._canvas) {
                this._ioOverlay = new Sprite();
                this._ioOverlay.mouseEnabled = false;
                this._ioOverlay.mouseChildren = false;
                this._canvas.addChild(this._ioOverlay);
            }
            return this._ioOverlay;
        }

        private function ioToolStart():void {
            this._ioStart = this.ioCanvasPoint();
            GAME._instance.addEventListener(MouseEvent.MOUSE_MOVE, this.ioToolMove);
            GAME._instance.addEventListener(MouseEvent.MOUSE_UP, this.ioToolEnd);
        }

        private function ioToolMove(param1:MouseEvent = null):void {
            var end:Point = this.ioCanvasPoint();
            var layer:Sprite = this.ioOverlayLayer();
            var spot:Point = null;
            layer.graphics.clear();
            if (this.currentTool == TOOL_AREASELECT) {
                layer.graphics.lineStyle(2, 0xFFD24A, 0.9);
                layer.graphics.beginFill(0xFFD24A, 0.12);
                layer.graphics.drawRect(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y));
                layer.graphics.endFill();
            }
            else if (this.currentTool == TOOL_WALLLINE) {
                var size:int = this.ioWallSize();
                var left:int = this.ioWallsLeft != null ? int(this.ioWallsLeft()) : 9999;
                var fits:int = 0;
                var blocked:int = 0;
                for each (spot in this.ioWallSpots(this._ioStart, end, size)) {
                    var free:Boolean = this.ioSpotFree(spot, size);
                    var colour:uint = !free ? 0xE04848 : (fits < left ? 0x5FD35F : 0x9A9A9A);
                    if (free) {
                        fits++;
                    }
                    else {
                        blocked++;
                    }
                    layer.graphics.lineStyle(1, 0xFFFFFF, 0.7);
                    layer.graphics.beginFill(colour, 0.45);
                    layer.graphics.drawRect(spot.x, spot.y, size, size);
                    layer.graphics.endFill();
                }
                this.ioSay(Math.min(fits, left) + " wall" + (Math.min(fits, left) == 1 ? "" : "s") + " will be placed" + (blocked > 0 ? ", " + blocked + " spot" + (blocked == 1 ? "" : "s") + " blocked (red)" : "") + (fits > left ? ", " + (fits - left) + " more than you have in storage (grey)" : "") + ".");
            }
        }

        private function ioToolEnd(param1:MouseEvent = null):void {
            GAME._instance.removeEventListener(MouseEvent.MOUSE_MOVE, this.ioToolMove);
            GAME._instance.removeEventListener(MouseEvent.MOUSE_UP, this.ioToolEnd);
            var end:Point = this.ioCanvasPoint();
            if (this._ioOverlay) {
                this._ioOverlay.graphics.clear();
            }
            if (this.currentTool == TOOL_AREASELECT) {
                this.ioSelectArea(new Rectangle(Math.min(this._ioStart.x, end.x), Math.min(this._ioStart.y, end.y), Math.abs(end.x - this._ioStart.x), Math.abs(end.y - this._ioStart.y)));
                this.setTool(TOOL_SELECTMOVE);
            }
            else if (this.currentTool == TOOL_WALLLINE) {
                this.ioPlaceWallLine(this._ioStart, end);
            }
            this._ioStart = null;
        }

        // ---- Selection

        private function ioSelectArea(param1:Rectangle):void {
            var item:BuildingItem = null;
            this.ioClearSelection();
            if (param1.width < 4 && param1.height < 4) {
                this.ioSay("Selection cleared.");
                return; // a click, not a box: just clears the selection
            }
            for each (item in this.displayInventory) {
                if (item.props && item.props.type == "enemy") {
                    continue;
                }
                if (param1.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                    this._ioSelection.push(item);
                    item.filters = [IO_SELECT_GLOW];
                }
            }
            this.ioSay(this._ioSelection.length > 0 ? this._ioSelection.length + " selected. Click one of them to move them all, or use Flip / Rotate." : "Nothing in that box.");
        }

        /** Store for the whole selection (after the popup's confirmation). Returns how many went to storage. */
        public function ioStoreSelection():int {
            var item:BuildingItem = null;
            var stored:int = 0;
            var items:Vector.<BuildingItem> = this._ioSelection.concat();
            this.ioClearSelection();
            for each (item in items) {
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
        private function ioStorable(param1:BuildingItem):Boolean {
            return !(param1.props && param1.props.type == "enemy");
        }

        /** Undo / Redo: rebuild the plan from its data, keeping where the view is looking. */
        /**
         * Inferno-only (the planner's Import): the plan's items that overlap another one. (Only overlaps: a yard's
         * own buildings can stand past the edge validateBuilding knows.)
         */
        public function ioInvalidNodes():Array {
            var out:Array = [];
            var n:int = this.displayInventory.length;
            for (var i:int = 0; i < n; i++) {
                var a:BuildingItem = this.displayInventory[i];
                for (var j:int = 0; a && j < n; j++) {
                    var b:BuildingItem = this.displayInventory[j];
                    if (b && b != a && HitTestBitmap.complexHitTestObject(a.mc, b.mc)) {
                        out.push(a.node);
                        break;
                    }
                }
            }
            return out;
        }

        public function ioRebuild():void {
            var viewX:Number = this._canvas ? this._canvas.x : 0;
            var viewY:Number = this._canvas ? this._canvas.y : 0;
            var hadCanvas:Boolean = this._canvas != null;
            this.ioClearSelection();
            this.setup();
            if (hadCanvas) {
                this._canvas.x = viewX;
                this._canvas.y = viewY;
            }
        }

        public function ioClearSelection():void {
            var item:BuildingItem = null;
            for each (item in this._ioSelection) {
                item.filters = [];
            }
            this._ioSelection = new Vector.<BuildingItem>();
        }

        // ---- Moving the selection together

        private function ioGroupPickUp(param1:BuildingItem):void {
            var item:BuildingItem = null;
            this._ioGroupDragging = true;
            this._ioGroupAnchor = param1;
            this._ioGroupOrigins = new Vector.<Point>();
            this._ioGroupMembers = new Dictionary();
            this._ioGroupLastDX = this._ioGroupLastDY = int.MIN_VALUE;
            for each (item in this._ioSelection) {
                this._ioGroupMembers[item] = true;
                this._ioGroupOrigins.push(new Point(item.x, item.y));
                this.sortBuildingOrder(item, "front");
            }
            var here:Point = this.ioCanvasPoint();
            this._ioGroupOffset = new Point(param1.x - here.x, param1.y - here.y);
            addEventListener(MouseEvent.MOUSE_MOVE, this.ioGroupTick);
            this.ioSay("Moving " + this._ioSelection.length + " buildings: click to put them down.");
        }

        private function ioGroupTick(param1:Event = null):void {
            var here:Point = this.ioCanvasPoint();
            var anchorIndex:int = this._ioSelection.indexOf(this._ioGroupAnchor);
            var dx:int = ioSnap(here.x + this._ioGroupOffset.x) - this._ioGroupOrigins[anchorIndex].x;
            var dy:int = ioSnap(here.y + this._ioGroupOffset.y) - this._ioGroupOrigins[anchorIndex].y;
            // Pointer moves come far more often than the group moves one snap step (phones send several a
            // frame); each check costs a pixel overlap test per nearby building, so only redo it on a step.
            if (dx == this._ioGroupLastDX && dy == this._ioGroupLastDY) {
                return;
            }
            this._ioGroupLastDX = dx;
            this._ioGroupLastDY = dy;
            var i:int = 0;
            while (i < this._ioSelection.length) {
                this._ioSelection[i].x = this._ioGroupOrigins[i].x + dx;
                this._ioSelection[i].y = this._ioGroupOrigins[i].y + dy;
                i++;
            }
            for each (var item:BuildingItem in this._ioSelection) {
                item.toggleInvalid(!this.ioValidateInGroup(item));
            }
            this.redrawRanges();
        }

        /**
         * validateBuilding for one building of a group being moved: the other buildings of the group are
         * skipped. They move with it, so how they overlap it never changes, while testing them was the
         * expensive part: buildings next to each other (a row of walls) always need the pixel test.
         */
        private function ioValidateInGroup(param1:BuildingItem):Boolean {
            var other:BuildingItem = null;
            var i:int = 0;
            // Each building's picture is sized to its footprint (BuildingItem: mc.width/height = size), so
            // footprints that don't come near each other can't overlap. Checking that from the positions is
            // plain arithmetic; the bounding-box step of complexHitTestObject measures both pictures every time,
            // which was most of the cost (60 walls against 225 buildings: 13,500 measurements per step).
            var left:Number = param1.x - IO_NEAR;
            var top:Number = param1.y - IO_NEAR;
            var right:Number = param1.x + param1.size.width * param1.scale + IO_NEAR;
            var bottom:Number = param1.y + param1.size.height * param1.scale + IO_NEAR;
            while (i < this.displayInventory.length) {
                other = this.displayInventory[i];
                i++;
                if (other == param1 || this._ioGroupMembers[other]) {
                    continue;
                }
                if (other.x > right || other.y > bottom || other.x + other.size.width * other.scale < left || other.y + other.size.height * other.scale < top) {
                    continue;
                }
                // The planner's pictures are solid squares (BasePlannerPopup_DisplayItem_Building, scaled to the
                // footprint), so two overlap exactly when their boxes do by a pixel or more: the pixel test
                // (drawing both into a bitmap and reading it back) gave the same answer at many times the cost
                // while a group is dragged (fps pass, 4 October).
                var box:Rectangle = HitTestBitmap.intersectionRectangle(param1.mc, other.mc);
                if (box.width >= 1 && box.height >= 1) {
                    return false;
                }
            }
            // The yard edges (validateBuilding's second half), checked with the others left out.
            return this.ioInsideYard(param1);
        }

        private function ioInsideYard(param1:BuildingItem):Boolean {
            var expansion:int = 0;
            if (STORE._storeData.ENL) {
                expansion = int(STORE._storeData.ENL.q);
            }
            var size:Point = this.YARD_EXPANSIONS[expansion];
            if (GLOBAL.INFERNO_ONLY) {
                size = new Point(GLOBAL._mapWidth, GLOBAL._mapHeight);
            }
            if (param1.category != BuildingItem.TYPE_DECORATION) {
                return !(param1.x < -size.x / 2 || param1.y < -size.y / 2 || param1.x > size.x / 2 - param1.widthsize || param1.y > size.y / 2 - param1.widthsize);
            }
            return !(param1.x < -this.MAX_YARD_DIMENSIONS.x / 2 || param1.y < -this.MAX_YARD_DIMENSIONS.y / 2 || param1.x > this.MAX_YARD_DIMENSIONS.x / 2 - param1.widthsize || param1.y > this.MAX_YARD_DIMENSIONS.y / 2 - param1.widthsize);
        }

        private function ioGroupDrop():void {
            var item:BuildingItem = null;
            var ok:Boolean = true;
            removeEventListener(MouseEvent.MOUSE_MOVE, this.ioGroupTick);
            this._ioGroupDragging = false;
            for each (item in this._ioSelection) {
                if (!this.ioValidateInGroup(item)) {
                    ok = false;
                    break;
                }
            }
            var i:int = 0;
            while (i < this._ioSelection.length) {
                item = this._ioSelection[i];
                item.toggleInvalid(false);
                if (ok) {
                    item.setPositionReference();
                    this.updateNodeReference(item);
                }
                else {
                    item.x = this._ioGroupOrigins[i].x;
                    item.y = this._ioGroupOrigins[i].y;
                }
                i++;
            }
            if (ok) {
                dispatchEvent(new Event(STATE_CHANGE));
            }
            this.ioSay(ok ? "Moved." : "They would not all fit there, so they went back.");
            this.redrawRanges();
        }

        // ---- Flip and rotate (the selection, or the whole layout when nothing is selected)

        /** param1: "flipx" (left-right), "flipy" (top-bottom) or "rotate" (90 degrees clockwise). */
        public function ioTransform(param1:String):void {
            var items:Vector.<BuildingItem> = new Vector.<BuildingItem>();
            var item:BuildingItem = null;
            var origins:Vector.<Point> = new Vector.<Point>();
            var reverted:Vector.<Boolean> = new Vector.<Boolean>();
            var left:Number = Number.MAX_VALUE;
            var top:Number = Number.MAX_VALUE;
            var right:Number = -Number.MAX_VALUE;
            var bottom:Number = -Number.MAX_VALUE;
            var i:int = 0;
            if (this._selectMoveDragging || this._ioGroupDragging) {
                return;
            }
            for each (item in (this._ioSelection.length > 0 ? this._ioSelection : this.displayInventory)) {
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
            var cx:Number = (left + right) / 2;
            var cy:Number = (top + bottom) / 2;
            for each (item in items) {
                var half:Number = item.widthsize / 2;
                var px:Number = item.x + half;
                var py:Number = item.y + half;
                var nx:Number = px;
                var ny:Number = py;
                if (param1 == "flipx") {
                    nx = cx * 2 - px;
                }
                else if (param1 == "flipy") {
                    ny = cy * 2 - py;
                }
                else {
                    nx = cx - (py - cy);
                    ny = cy + (px - cx);
                }
                item.x = ioSnap(nx - half);
                item.y = ioSnap(ny - half);
            }
            // Anything that no longer fits goes back where it was; repeat until nothing changes.
            var changed:Boolean = true;
            var rounds:int = 0;
            while (changed && rounds++ <= items.length) {
                changed = false;
                i = 0;
                while (i < items.length) {
                    if (!reverted[i] && !this.validateBuilding(items[i])) {
                        items[i].x = origins[i].x;
                        items[i].y = origins[i].y;
                        reverted[i] = true;
                        changed = true;
                    }
                    i++;
                }
            }
            // A building sent back may find another one moved onto its old spot: then undo it all.
            var stayed:int = 0;
            i = 0;
            while (i < items.length) {
                if (reverted[i]) {
                    stayed++;
                    if (!this.validateBuilding(items[i])) {
                        var j:int = 0;
                        while (j < items.length) {
                            items[j].x = origins[j].x;
                            items[j].y = origins[j].y;
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
                if (!reverted[i]) {
                    items[i].setPositionReference();
                    this.updateNodeReference(items[i]);
                }
                i++;
            }
            dispatchEvent(new Event(STATE_CHANGE));
            this.redrawRanges();
            this.ioSay(stayed > 0 ? stayed + " building" + (stayed == 1 ? "" : "s") + " did not fit and stayed where " + (stayed == 1 ? "it was." : "they were.") : "Done.");
        }

        // ---- Wall line

        private var _ioWallSize:int = 0;

        /** How big a wall is on the plan, measured from a wall in storage (the planner sizes by footprint). */
        private function ioWallSize():int {
            var node:PlannerNode = null;
            if (this._ioWallSize <= 0 && this.ioTakeWall != null) {
                node = this.ioTakeWall() as PlannerNode;
                if (node) {
                    this._ioWallSize = int(new BuildingItem(node).widthsize);
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
        private function ioWallSpots(param1:Point, param2:Point, param3:int):Vector.<Point> {
            var spots:Vector.<Point> = new Vector.<Point>();
            var half:Number = param3 / 2;
            var sx:int = ioSnap(param1.x - half);
            var sy:int = ioSnap(param1.y - half);
            var dx:Number = (param2.x - half) - sx;
            var dy:Number = (param2.y - half) - sy;
            var major:Number = Math.max(Math.abs(dx), Math.abs(dy));
            var count:int = Math.floor(major / param3) + 1;
            var stepX:Number = major == 0 ? 0 : dx / major * param3;
            var stepY:Number = major == 0 ? 0 : dy / major * param3;
            var horizontal:Boolean = Math.abs(dx) >= Math.abs(dy);
            var i:int = 0;
            while (i < count && i < 500) {
                // The main axis moves a whole wall each step (exact); the other is rounded to 5.
                var x:Number = sx + stepX * i;
                var y:Number = sy + stepY * i;
                spots.push(new Point(horizontal ? Math.round(x) : ioSnap(x), horizontal ? ioSnap(y) : Math.round(y)));
                i++;
            }
            return spots;
        }

        /** Quick check for the preview: inside the yard and not overlapping any building's square. */
        private function ioSpotFree(param1:Point, param2:int):Boolean {
            var item:BuildingItem = null;
            var yard:Point = GLOBAL.INFERNO_ONLY ? new Point(GLOBAL._mapWidth, GLOBAL._mapHeight) : this.YARD_EXPANSIONS[STORE._storeData.ENL ? int(STORE._storeData.ENL.q) : 0];
            if (param1.x < -yard.x / 2 || param1.y < -yard.y / 2 || param1.x > yard.x / 2 - param2 || param1.y > yard.y / 2 - param2) {
                return false;
            }
            var spot:Rectangle = new Rectangle(param1.x, param1.y, param2, param2);
            for each (item in this.displayInventory) {
                if (spot.intersects(new Rectangle(item.x, item.y, item.widthsize, item.widthsize))) {
                    return false;
                }
            }
            return true;
        }

        private function ioPlaceWallLine(param1:Point, param2:Point):void {
            var spot:Point = null;
            var node:PlannerNode = null;
            var item:BuildingItem = null;
            var placed:int = 0;
            var blocked:int = 0;
            var ranOut:Boolean = false;
            if (this.ioTakeWall == null) {
                return;
            }
            var size:int = this.ioWallSize();
            this.ioPlacingLine = true;
            for each (spot in this.ioWallSpots(param1, param2, size)) {
                node = this.ioTakeWall() as PlannerNode;
                if (!node) {
                    ranOut = true;
                    break;
                }
                if (!this.ioSpotFree(spot, size)) {
                    blocked++;
                    continue;
                }
                item = new BuildingItem(node);
                item.addEventListener(BUILDING_CLICK, this.onBuildingClick);
                item.addEventListener(BUILDING_OVER, this.onBuildingOver);
                item.addEventListener(BUILDING_OUT, this.onBuildingOut);
                // Free by the same test the green preview squares use (checked above, before taking the wall).
                item.x = spot.x;
                item.y = spot.y;
                this._layerSetBuildings.addChild(item);
                this.displayInventory.push(item);
                item.setPositionReference();
                this.displayData.push(node);
                dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.DESIGN_BUILDING_PLACE, node));
                placed++;
            }
            this.ioPlacingLine = false;
            if (placed > 0) {
                dispatchEvent(new Event(STATE_CHANGE));
                this.redrawRanges();
            }
            var report:String = placed > 0 ? "Placed " + placed + " wall" + (placed == 1 ? "" : "s") : "No walls placed";
            if (blocked > 0) {
                report += ", " + blocked + " spot" + (blocked == 1 ? "" : "s") + " blocked";
            }
            if (ranOut) {
                report += placed > 0 ? ". Storage is now out of walls." : ": there are no walls in storage.";
            }
            this.ioSay(report + (ranOut ? "" : "."));
        }
    }
}
