package com.monsters.baseplanner.popups {
    import com.monsters.kits.IoTextPrompt;
    import com.hurlant.util.Base64;
    import flash.utils.ByteArray;
    import flash.utils.Dictionary;
    import flash.system.System;
    import flash.geom.Rectangle;
    import flash.display.Graphics;
    import flash.display.Shape;
    import flash.display.Bitmap;
    import flash.events.TimerEvent;
    import flash.utils.Timer;
    import com.monsters.baseplanner.BasePlanner;
    import com.monsters.baseplanner.PlannerDesignView;
    import com.monsters.baseplanner.PlannerExplorer;
    import com.monsters.baseplanner.PlannerNode;
    import com.monsters.baseplanner.PlannerTemplate;
    import com.monsters.baseplanner.components.IoToolTile;
    import com.monsters.baseplanner.events.BasePlannerEvent;
    import com.monsters.baseplanner.events.BasePlannerNodeEvent;
    import com.monsters.baseplanner.popups.transfer.BasePlannerTransferConfirmation;
    import com.monsters.display.ScrollSetV;
    import flash.display.BitmapData;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextField;

    public class BasePlannerPopup extends Sprite {

        private static var _layoutSpacing:Point = new Point(10, 10);

        private static var _layoutOffset:Point = new Point(0, 0);

        public static const EXPLORER_BUILDING_CLICK:String = "explorer_click";

        public static const EXPLORER_UPDATE:String = "explorer_update";

        public static const DESIGN_CLEAR_EXPLORER:String = "design_explorer_clear";

        public static const DESIGN_BUILDING_STORE:String = "design_building_store";

        public static const DESIGN_BUILDING_PLACE:String = "design_building_place";

        public static const DESIGN_BUILDING_INVALID:String = "design_building_invalid";

        public static const DESIGN_TOOL_UPDATE:String = "design_tool_update";

        public static const PLANNER_HINT:String = "planner_hint";

        public static const PLANNER_HINT_HIDE:String = "planner_hide";

        public var mcFrame:frame;

        public var displayCanvas:BasePlannerPopup_DisplayViewContainer;

        public var sideBar:BasePlannerPopup_ExplorerContainer;

        private var sideBarScrollBar:ScrollSetV;

        public var sideBarHeader:BasePlannerPopup_ExplorerHeader;

        public var bottomMenu:BasePlannerPopup_BottomLayout;

        public var toolMenu:BasePlannerPopup_ToolsLayout;

        public var storeMenu:Sprite;

        public var inventoryMenu:Sprite;

        public var zoomMenu:BasePlannerPopup_ZoomLayout;

        public var toolTipMenu:BasePlannerPopup_ToolTip;

        public var buildingExplorer:PlannerExplorer;

        public var designView:PlannerDesignView;

        public var fullscreenButton:Sprite;

        private var _guideMC:BasePlannerPopup_CLIP;

        private var _mcFrame:Sprite;

        private var _plannerTemplate:PlannerTemplate;

        private var _hasBeenSaved:Boolean;

        private var _currentTool:String;

        private const _PLANNER_SIDEBAR_WIDTH:int = 190;

        private const _PLANNER_BOTTOMBAR_SPACING:int = 60;

        private const _PLANNER_TOP_MARGIN:int = 10;

        private const _PLANNER_BOTTOM_MARGIN:int = 5;

        private const _PLANNER_RIGHT_MARGIN:int = 10;

        private const _PLANNER_LEFT_MARGIN:int = 10;

        private const _PLANNER_HEADER_MARGIN:int = 32;

        private var _bSave:Button;

        private var _bApply:Button;

        private var _bLoad:Button;

        private var _bClear:Button;

        private var _isTemplateApplicable:Boolean = true;

        private var _confirmationPopup:BasePlannerTransferConfirmation;

        private var _clearConfirmationPopup:BasePlannerTransferConfirmation;

        public function BasePlannerPopup(param1:PlannerTemplate) {
            super();
            this._plannerTemplate = param1;
            this.setup();
            this.Resize();
        }

        public function setup():void {
            this.configPopupTemplate();
            this.buildingExplorer.addEventListener(PlannerExplorer.EXPLORER_ITEM_CLICK, this.onExplorerItemClick);
            if (!BasePlanner.canSave) {
                this._bLoad.Enabled = false;
                this._bLoad.mouseEnabled = false;
                this._bSave.Enabled = false;
                this._bSave.mouseEnabled = false;
                this._bSave.mouseChildren = false;
                this._bSave.enabled = false;
            }
        }

        private function set canApply(param1:Boolean):void {
            this._bApply.Enabled = param1;
            this._isTemplateApplicable = param1;
        }

        private function checkIfApplicable():Boolean {
            var _loc2_:String = null;
            var _loc1_:int = 0;
            while (_loc1_ < this._plannerTemplate.inventoryData.length) {
                _loc2_ = this._plannerTemplate.inventoryData[_loc1_].category;
                if (_loc2_ != PlannerNode.TYPE_DECORATION && _loc2_ != PlannerNode.TYPE_MISC) {
                    return false;
                }
                _loc1_++;
            }
            return true;
        }

        public function redraw():void {
            this.buildingExplorer.redraw();
            this.designView.redraw();
            this.sideBarScrollBar.checkResize();
        }

        public function configPopupTemplate(param1:int = 0, param2:int = 0):void {
            var _loc3_:Point = null;
            var _loc6_:Checkbox = null;
            var _loc7_:Checkbox = null;
            var _loc8_:Checkbox = null;
            var _loc9_:Checkbox = null;
            if (!this._guideMC) {
                this._guideMC = new BasePlannerPopup_CLIP();
            }
            if (!this._mcFrame) {
                this._mcFrame = new Sprite();
                this.addChild(this._mcFrame);
            }
            if (!this.mcFrame) {
                this.mcFrame = new frame(false);
                this.mcFrame.addChild(this._guideMC.guideBG);
                this._mcFrame.addChild(this.mcFrame);
            }
            if (param1 != 0) {
                this._guideMC.guideBG.width = param1;
            }
            if (param2 != 0) {
                this._guideMC.guideBG.height = param2;
            }
            this.mcFrame.width = this._guideMC.guideBG.width;
            this.mcFrame.height = this._guideMC.guideBG.height;
            (this.mcFrame as frame).Setup(true, this.Hide);
            _loc3_ = new Point(this._PLANNER_LEFT_MARGIN, this._PLANNER_TOP_MARGIN);
            if (!this.sideBar) {
                this.sideBar = new BasePlannerPopup_ExplorerContainer();
            }
            this.sideBar.x = _layoutSpacing.x + _loc3_.x;
            this.sideBar.y = _layoutSpacing.y + _loc3_.y + this._PLANNER_HEADER_MARGIN;
            this.sideBar.mcScroller.visible = false;
            this.sideBar.mcframe.width = this._PLANNER_SIDEBAR_WIDTH;
            this.sideBar.mcframe.height = param2 - (this.sideBar.y + _layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
            this.sideBar.canvasmask.width = this._PLANNER_SIDEBAR_WIDTH;
            this.sideBar.canvasmask.height = param2 - (this.sideBar.y + _layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
            this.sideBar.bg.width = this._PLANNER_SIDEBAR_WIDTH;
            this.sideBar.bg.height = param2 - (this.sideBar.y + _layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
            if (!this.sideBarHeader) {
                this.sideBarHeader = new BasePlannerPopup_ExplorerHeader();
            }
            this.sideBarHeader.tLabel.htmlText = KEYS.Get("basePlanner_explorerHeader");
            this.sideBarHeader.x = _layoutSpacing.x + _loc3_.x;
            this.sideBarHeader.y = _layoutSpacing.y + _loc3_.y;
            addChild(this.sideBarHeader);
            if (!this.buildingExplorer) {
                this.buildingExplorer = new PlannerExplorer(this._plannerTemplate.inventoryData);
                this.buildingExplorer.setup();
                this.buildingExplorer.addEventListener(BasePlannerPopup.EXPLORER_BUILDING_CLICK, this.onExplorerItemClick);
                this.buildingExplorer.addEventListener(BasePlannerPopup.PLANNER_HINT, this.onToolTipNodeHint);
                this.buildingExplorer.addEventListener(BasePlannerPopup.PLANNER_HINT_HIDE, this.onToolTipNodeHide);
                this.buildingExplorer.addEventListener(BasePlannerPopup.EXPLORER_UPDATE, this.onExplorerChange);
                this.buildingExplorer.x = 0;
                this.buildingExplorer.y = 0;
                this.sideBar.canvas.getChildAt(0).height = 0;
                this.sideBar.canvas.addChild(this.buildingExplorer);
            }
            _layoutOffset.x = this.sideBar.x + this.sideBar.canvasmask.width;
            _layoutOffset.y = this.sideBar.y + this.sideBar.canvasmask.height;
            this.addChild(this.sideBar);
            if (!this.sideBarScrollBar) {
                this.createExplorerScrollBar(this.sideBar.canvas);
            }
            else {
                this.sideBarScrollBar.checkResize();
                this.sideBarScrollBar.x = this.sideBar.canvas.x + this.sideBar.canvas.width - this.sideBarScrollBar.width + this._PLANNER_LEFT_MARGIN;
                this.sideBarScrollBar.y = this.sideBar.canvas.y + _layoutSpacing.y + this._PLANNER_TOP_MARGIN + this._PLANNER_HEADER_MARGIN;
                addChild(this.sideBarScrollBar); // on top; addChildAt(x, numChildren) is out of range when x is already a child (the browser runtime throws)
            }
            if (!this.displayCanvas) {
                this.displayCanvas = new BasePlannerPopup_DisplayViewContainer();
                this.addChild(this.displayCanvas);
            }
            if (param1 == 0) {
                param1 = this.mcFrame.width;
            }
            if (param2 == 0) {
                param2 = this.mcFrame.height;
            }
            this.displayCanvas.x = _layoutOffset.x;
            this.displayCanvas.y = _layoutSpacing.y + _loc3_.y;
            this.displayCanvas.mcframemask.width = param1 - (this.displayCanvas.x + _layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
            this.displayCanvas.mcframemask.height = param2 - (this.displayCanvas.y + _layoutSpacing.y - 1 + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
            this.displayCanvas.mcframe.width = param1 - (this.displayCanvas.x + _layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
            this.displayCanvas.mcframe.height = param2 - (this.displayCanvas.y + _layoutSpacing.y - 1 + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
            this.displayCanvas.canvasmask.width = param1 - (this.displayCanvas.x + _layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
            this.displayCanvas.canvasmask.height = param2 - (this.displayCanvas.y + _layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
            if (!this.designView) {
                this.designView = new PlannerDesignView(this._plannerTemplate.displayData);
                this.designView.setup();
                this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_PLACE, this.onDesignItemPlace);
                this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_STORE, this.onDesignItemStore);
                this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_INVALID, this.onDesignItemInvalid);
                this.designView.addEventListener(BasePlannerPopup.DESIGN_CLEAR_EXPLORER, this.onClearExplorerSelections);
                this.designView.addEventListener(BasePlannerPopup.PLANNER_HINT, this.onToolTipNodeHint);
                this.designView.addEventListener(BasePlannerPopup.PLANNER_HINT_HIDE, this.onToolTipNodeHide);
                this.designView.addEventListener(BasePlannerPopup.DESIGN_TOOL_UPDATE, this.onToolUpdate);
                this.designView.addEventListener(PlannerDesignView.STATE_CHANGE, this.onDesignStateChange);
                // Wall line tool: walls come out of storage one at a time (placing one takes it out).
                this.designView.ioTakeWall = this.ioTakeWall;
            }
            this.displayCanvas.canvas.addChild(this.designView);
            this.designView.recenter();
            if (!this.bottomMenu) {
                this.bottomMenu = new BasePlannerPopup_BottomLayout();
                this.addChild(this.bottomMenu);
                this._bSave = new Button_CLIP();
                this._bSave.x = this.bottomMenu.btnSave.x;
                this._bSave.y = this.bottomMenu.btnSave.y;
                this._bSave.width = this.bottomMenu.btnSave.width;
                this._bSave.height = this.bottomMenu.btnSave.height;
                this._bSave.SetupKey("basePlanner_btnSave");
                this._bSave.addEventListener(MouseEvent.CLICK, this.onSaveClick);
                this._bSave.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.onToolTipHint, [KEYS.Get("basePlanner_saveTool")]));
                this._bSave.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                this.bottomMenu.addChild(this._bSave);
                this.bottomMenu.removeChild(this.bottomMenu.btnSave);
                if (!BasePlanner.canSave) {
                    this._bSave.mouseEnabled = this._bSave.enabled = this._bSave.Enabled = false;
                }
                this._bLoad = new Button_CLIP();
                this._bLoad.x = this.bottomMenu.btnLoad.x;
                this._bLoad.y = this.bottomMenu.btnLoad.y;
                this._bLoad.width = this.bottomMenu.btnLoad.width;
                this._bLoad.height = this.bottomMenu.btnLoad.height;
                this._bLoad.SetupKey("basePlanner_btnLoad");
                this._bLoad.addEventListener(MouseEvent.CLICK, this.onLoadClick);
                this._bLoad.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.onToolTipHint, [KEYS.Get("basePlanner_loadTool")]));
                this._bLoad.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                this.bottomMenu.addChild(this._bLoad);
                this.bottomMenu.removeChild(this.bottomMenu.btnLoad);
                if (!BasePlanner.canSave) {
                    this._bLoad.mouseEnabled = this._bLoad.enabled = false;
                }
                this._bApply = new Button_CLIP();
                this._bApply.x = this.bottomMenu.btnApply.x;
                this._bApply.y = this.bottomMenu.btnApply.y;
                this._bApply.width = this.bottomMenu.btnApply.width;
                this._bApply.height = this.bottomMenu.btnApply.height;
                this._bApply.SetupKey("basePlanner_btnApply");
                this._bApply.addEventListener(MouseEvent.CLICK, this.onApplyClick);
                this._bApply.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.onToolTipHint, [KEYS.Get("basePlanner_applyTool")]));
                this._bApply.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                this.bottomMenu.addChild(this._bApply);
                this.bottomMenu.removeChild(this.bottomMenu.btnApply);
                this._bClear = new Button_CLIP();
                this._bClear.x = this.bottomMenu.btnClear.x;
                this._bClear.y = this.bottomMenu.btnClear.y;
                this._bClear.width = this.bottomMenu.btnClear.width;
                this._bClear.height = this.bottomMenu.btnClear.height;
                this._bClear.SetupKey("basePlanner_btnClear");
                this._bClear.addEventListener(MouseEvent.CLICK, this.onClearClick);
                this._bClear.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.onToolTipHint, [KEYS.Get("basePlanner_clearTool")]));
                this._bClear.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                this.bottomMenu.addChild(this._bClear);
                this.bottomMenu.removeChild(this.bottomMenu.btnClear);
                _loc6_ = Checkbox.Replace(this.bottomMenu.check1);
                this.bottomMenu.addChild(_loc6_);
                _loc6_.addEventListener(Checkbox.CHECK_EVENT, this.onCheckboxClick);
                (_loc7_ = Checkbox.Replace(this.bottomMenu.check2)).addEventListener(Checkbox.CHECK_EVENT, this.onCheckboxClick);
                this.bottomMenu.addChild(_loc7_);
                (_loc8_ = Checkbox.Replace(this.bottomMenu.check3)).addEventListener(Checkbox.CHECK_EVENT, this.onCheckboxClick);
                this.bottomMenu.addChild(_loc8_);
                if (this.bottomMenu.check4) {
                    (_loc9_ = Checkbox.Replace(this.bottomMenu.check4)).addEventListener(Checkbox.CHECK_EVENT, this.onCheckboxClick);
                    this.bottomMenu.addChild(_loc9_);
                }
                this.bottomMenu.check1_txt.htmlText = KEYS.Get("basePlanner_groundrange");
                this.bottomMenu.check2_txt.htmlText = KEYS.Get("basePlanner_aerialrange");
                this.bottomMenu.check3_txt.htmlText = KEYS.Get("basePlanner_minerange");
                if (this.bottomMenu.check4_txt) {
                    this.bottomMenu.check4_txt.htmlText = KEYS.Get("basePlanner_moreinfo");
                }
                // Inferno-only: on one line, smaller if need be (longer languages wrapped to a hidden second line)
                for each (var ioCheck:String in ["check1_txt", "check2_txt", "check3_txt", "check4_txt"]) {
                    if (this.bottomMenu[ioCheck]) {
                        GLOBAL.ioFitText(this.bottomMenu[ioCheck] as TextField, 7);
                    }
                }
            }
            var _loc4_:int = 520;
            this.bottomMenu.x = param1 - (_layoutSpacing.x + _loc4_) + _loc3_.x;
            this.bottomMenu.y = this.displayCanvas.y + this.displayCanvas.canvasmask.height;
            if (!this.toolMenu) {
                this.toolMenu = new BasePlannerPopup_ToolsLayout();
                this.addChild(this.toolMenu);
                this.toolMenu.mcSelectMove.gotoAndStop(1);
                this.toolMenu.mcSelectMove.buttonMode = true;
                this.toolMenu.mcSelectMove.addEventListener(MouseEvent.CLICK, this.onToolClick);
                this.toolMenu.mcSelectMove.addEventListener(MouseEvent.ROLL_OVER, this.onToolOver);
                this.toolMenu.mcSelectMove.addEventListener(MouseEvent.ROLL_OUT, this.onToolOut);
                this.toolMenu.mcStore.gotoAndStop(1);
                this.toolMenu.mcStore.buttonMode = true;
                this.toolMenu.mcStore.addEventListener(MouseEvent.CLICK, this.onToolClick);
                this.toolMenu.mcStore.addEventListener(MouseEvent.ROLL_OVER, this.onToolOver);
                this.toolMenu.mcStore.addEventListener(MouseEvent.ROLL_OUT, this.onToolOut);
                if (GLOBAL.yardExpansionsBought >= GLOBAL.yardExpansionsMax) {
                    this.toolMenu.mcExpand.enabled = false;
                    this.toolMenu.mcExpand.mouseEnabled = false;
                    this.toolMenu.mcExpand.gotoAndStop("off");
                }
                else if (BASE.isMainYardOrInfernoMainYard) {
                    this.toolMenu.mcExpand.gotoAndStop(1);
                    this.toolMenu.mcExpand.buttonMode = true;
                    this.toolMenu.mcExpand.addEventListener(MouseEvent.CLICK, this.onStoreOpen);
                    this.toolMenu.mcExpand.addEventListener(MouseEvent.ROLL_OVER, this.onToolOver);
                    this.toolMenu.mcExpand.addEventListener(MouseEvent.ROLL_OUT, this.onToolOut);
                    this.toolMenu.mcExpand.visible = true;
                }
                else {
                    this.toolMenu.mcExpand.visible = false;
                }
            }
            this.toolMenu.x = _layoutOffset.x + 50;
            this.toolMenu.y = _layoutSpacing.y + _loc3_.y;
            if (!this.zoomMenu) {
                this.zoomMenu = new BasePlannerPopup_ZoomLayout();
                this.addChild(this.zoomMenu);
                if (GLOBAL.DOES_USE_SCROLL) {
                    this.displayCanvas.addEventListener(MouseEvent.MOUSE_WHEEL, this.onScroll);
                }
                this.zoomMenu.btnUp.addEventListener(MouseEvent.CLICK, this.onZoomUp);
                this.zoomMenu.btnDown.addEventListener(MouseEvent.CLICK, this.onZoomDown);
                this.zoomMenu.scrollbar.addEventListener(MouseEvent.CLICK, this.onZoomScroll);
            }
            this.zoomMenu.x = _layoutOffset.x + 25;
            this.zoomMenu.y = _layoutSpacing.y + 10;
            this.zoomScrollerUpdate();
            if (!this.fullscreenButton) {
                this.fullscreenButton = new Sprite();
                this.fullscreenButton.addChild(new buttonFullscreenFrame_CLIP());
                this.fullscreenButton.addEventListener(MouseEvent.CLICK, GLOBAL.goFullScreen);
            }
            this._mcFrame.addChild(this.fullscreenButton);
            this.fullscreenButton.x = param1 - (_layoutSpacing.x + 50) + _loc3_.x;
            this.fullscreenButton.y = -10;
            // Inferno-only: the toolbar replaces the tool icons and holds Full screen (ioAddTools).
            this.ioAddTools();
            if (!this.toolTipMenu) {
                this.toolTipMenu = new BasePlannerPopup_ToolTip();
                this.toolTipMenu.mouseEnabled = false;
                this.addChild(this.toolTipMenu);
            }
            var _loc5_:int = this.displayCanvas.canvasmask.width;
            this.toolTipMenu.x = this.displayCanvas.x + this.displayCanvas.canvasmask.width / 2;
            this.toolTipMenu.y = this.displayCanvas.y + this.displayCanvas.canvasmask.height - 40;
            this.onToolTipHide();
            this.onToolUpdate();
            this.x = -(this.width / 2);
            this.y = -(this.height / 2);
        }

        public function onToolTipNodeHint(param1:BasePlannerNodeEvent):void {
            if (!this.toolTipMenu.hitTestPoint(stage.mouseX, mouseY)) {
                this.onToolTipHint(null, param1.node.displayNameFull);
            }
        }

        public function onToolTipMouseHint(param1:Function, param2:Array):Function {
            var method:Function = param1;
            var additionalArguments:Array = param2;
            return function(param1:MouseEvent):void {
                method.apply(null, [param1].concat(additionalArguments));
            };
        }

        public function onToolTipHint(param1:Event, param2:String):void {
            this.toolTipMenu.tLabel.htmlText = param2;
            this.toolTipMenu.tLabel.autoSize = TextFieldAutoSize.CENTER;
            this.toolTipMenu.tLabel.width = 140;
            while (this.toolTipMenu.tLabel.height > 20) {
                this.toolTipMenu.tLabel.width += 2;
            }
            this.toolTipMenu.tLabel.x = -(this.toolTipMenu.tLabel.width / 2);
            this.toolTipMenu.mcBG.width = this.toolTipMenu.tLabel.width + 20;
            this.toolTipMenu.visible = true;
        }

        public function onToolTipNodeHide(param1:BasePlannerNodeEvent):void {
            this.onToolTipHide();
        }

        public function onToolTipHide(param1:MouseEvent = null):void {
            this.toolTipMenu.visible = false;
        }

        public function onToolUpdate(param1:Event = null):void {
            this.onToolReset();
            this.ioHighlightTools();
            if (this.designView.currentTool == PlannerDesignView.TOOL_SELECTMOVE) {
                this.toolMenu.mcSelectMove.gotoAndStop("over");
            }
            else if (this.designView.currentTool == PlannerDesignView.TOOL_STORE) {
                this.toolMenu.mcStore.gotoAndStop("over");
            }
            if (GLOBAL.yardExpansionsBought >= GLOBAL.yardExpansionsMax) {
                this.toolMenu.mcExpand.enabled = false;
                this.toolMenu.mcExpand.mouseEnabled = false;
                this.toolMenu.mcExpand.gotoAndStop("off");
            }
            else if (BASE.isMainYardOrInfernoMainYard) {
                this.toolMenu.mcExpand.visible = true;
            }
            else {
                this.toolMenu.mcExpand.visible = false;
            }
        }

        public function onToolReset(param1:Event = null):void {
            this.toolMenu.mcSelectMove.gotoAndStop("out");
            this.toolMenu.mcStore.gotoAndStop("out");
            this.toolMenu.mcExpand.gotoAndStop("out");
        }

        public function onToolClick(param1:MouseEvent):void {
            if (param1.target == this.toolMenu.mcSelectMove) {
                this.designView.setTool(PlannerDesignView.TOOL_SELECTMOVE);
            }
            if (param1.target == this.toolMenu.mcStore) {
                this.designView.setTool(PlannerDesignView.TOOL_STORE);
            }
            this.onToolUpdate();
        }

        public function onToolOver(param1:MouseEvent):void {
            param1.target.gotoAndStop("over");
            if (param1.target == this.toolMenu.mcSelectMove) {
                this.onToolTipHint(null, KEYS.Get("basePlanner_moveTool"));
            }
            else if (param1.target == this.toolMenu.mcStore) {
                this.onToolTipHint(null, KEYS.Get("basePlanner_storageTool"));
            }
            else if (param1.target == this.toolMenu.mcExpand) {
                this.onToolTipHint(null, KEYS.Get("basePlanner_expandTool"));
            }
        }

        public function onToolOut(param1:MouseEvent):void {
            this.onToolUpdate();
            this.onToolTipHide();
        }

        public function onStoreOpen(param1:MouseEvent = null):void {
            if (BASE.isMainYardOrInfernoMainYard) {
                STORE.ShowB(1, 1, [GLOBAL.yardExpansionItem]);
                if (STORE._mc) {
                    STORE._mc.addEventListener(Event.REMOVED_FROM_STAGE, this.onStoreClosed);
                }
            }
        }

        public function onStoreClosed(param1:Event = null):void {
            this.designView.redraw();
            this.onToolUpdate();
        }

        public function onCheckboxClick(param1:Event = null):void {
            var _loc2_:Checkbox = null;
            if (param1.target is Checkbox) {
                _loc2_ = param1.target as Checkbox;
                this.designView.toggleView(_loc2_);
            }
        }

        public function removeSelection():void {
            this.designView.removeSelection();
        }

        protected function onScroll(param1:MouseEvent):void {
            if (param1.delta < 0) {
                this.onZoomDown(null);
            }
            else {
                this.onZoomUp(null);
            }
        }

        public function onZoomUp(param1:MouseEvent = null):void {
            var _loc2_:Number = PlannerDesignView.zoomValue;
            if (_loc2_ < this.designView.zoomMax) {
                _loc2_ = Math.min(_loc2_ + this.designView.zoomStep, this.designView.zoomMax);
                this.designView.setZoom(_loc2_);
            }
            this.zoomScrollerUpdate();
        }

        public function onZoomDown(param1:MouseEvent = null):void {
            var _loc2_:Number = PlannerDesignView.zoomValue;
            if (_loc2_ > this.designView.zoomMin) {
                _loc2_ = Math.max(_loc2_ - this.designView.zoomStep, this.designView.zoomMin);
                this.designView.setZoom(_loc2_);
            }
            this.zoomScrollerUpdate();
        }

        public function onZoomScroll(param1:MouseEvent = null):void {
        }

        public function zoomScrollerUpdate():void {
            var _loc1_:Number = 42;
            var _loc2_:Number = 107;
            var _loc3_:Number = _loc2_ - _loc1_;
            var _loc4_:Number = this.designView.zoomMax - this.designView.zoomMin;
            var _loc5_:Number = _loc2_ - _loc3_ / _loc4_ * PlannerDesignView.zoomValue;
            this.zoomMenu.scrollbar.y = _loc5_;
        }

        private function createExplorerScrollBar(param1:Sprite):void {
            param1.mask = this.sideBar.canvasmask;
            this.sideBarScrollBar = new ScrollSetV(param1, this.sideBar.canvasmask);
            this.sideBarScrollBar.x = param1.x + param1.width - this.sideBarScrollBar.width + this._PLANNER_LEFT_MARGIN;
            this.sideBarScrollBar.y = param1.y + _layoutSpacing.y + this._PLANNER_TOP_MARGIN;
            addChild(this.sideBarScrollBar); // on top; addChildAt(x, numChildren) is out of range when x is already a child (the browser runtime throws)
        }

        protected function onApplyClick(param1:MouseEvent):void {
            if (this._isTemplateApplicable) {
                // Inferno-only: nor a plan with buildings that overlap or stand past the yard's edge (one saved
                // from a layout imported before Import checked them)
                if (GLOBAL.INFERNO_ONLY) {
                    var rows:Array = [];
                    for each (var node:PlannerNode in this.ioLayoutNodes(true)) {
                        rows.push([node.type, node.x, node.y]);
                    }
                    var refused:String = this.ioCheckLayout(rows);
                    if (refused) {
                        GLOBAL.Message("<b>This plan can't be applied.</b><br><br>" + refused + "<br><br>Move them inside your yard and apart first.");
                        return;
                    }
                }
                dispatchEvent(new BasePlannerEvent(BasePlannerEvent.APPLY));
            }
            else {
                GLOBAL.Message(KEYS.Get("basePlanner_cantApply"));
            }
        }

        protected function onLoadClick(param1:MouseEvent):void {
            dispatchEvent(new BasePlannerEvent(BasePlannerEvent.LOAD));
        }

        protected function onSaveClick(param1:MouseEvent):void {
            dispatchEvent(new BasePlannerEvent(BasePlannerEvent.SAVE));
        }

        protected function onClearClick(param1:MouseEvent):void {
            if (this._clearConfirmationPopup) {
                return;
            }
            this._clearConfirmationPopup = new BasePlannerTransferConfirmation();
            this._clearConfirmationPopup.tBody.htmlText = KEYS.Get("basePlanner_unsaved");
            this._clearConfirmationPopup.bCancel.SetupKey("basePlanner_btnClear");
            this._clearConfirmationPopup.bCancel.addEventListener(MouseEvent.CLICK, this.clickedClearInConfirmationClear, false, 0, true);
            if (BasePlanner.canSave == false) {
                this._clearConfirmationPopup.bConfirm.Enabled = false;
            }
            else {
                this._clearConfirmationPopup.bConfirm.Enabled = true;
                this._clearConfirmationPopup.bConfirm.addEventListener(MouseEvent.CLICK, this.clickedSaveInConfirmationClear, false, 0, true);
            }
            this._clearConfirmationPopup.addEventListener(Event.CLOSE, this.clickedCloseInConfirmationClear, false, 0, true);
            POPUPS.Add(this._clearConfirmationPopup);
            POPUPSETTINGS.AlignToCenter(this._clearConfirmationPopup);
        }

        protected function clickedCloseInConfirmationClear(param1:Event):void {
            this.removeClearConfirmationPopup();
        }

        protected function clickedSaveInConfirmationClear(param1:MouseEvent):void {
            this.removeClearConfirmationPopup();
            this.onSaveClick(null);
        }

        protected function clickedClearInConfirmationClear(param1:MouseEvent):void {
            this.removeClearConfirmationPopup();
            this.clear();
        }

        private function removeClearConfirmationPopup():void {
            if (this._clearConfirmationPopup) {
                POPUPS.Remove(this._clearConfirmationPopup);
                this._clearConfirmationPopup = null;
            }
        }

        private function clear():void {
            var _loc3_:String = null;
            var _loc1_:int = int(this._plannerTemplate.displayData.length);
            var _loc2_:int = _loc1_ - 1;
            while (_loc2_ >= 0) {
                _loc3_ = this._plannerTemplate.displayData[_loc2_].category;
                if (_loc3_ != PlannerNode.TYPE_MISC) {
                    this._plannerTemplate.inventoryData.push(this._plannerTemplate.displayData[_loc2_]);
                    this._plannerTemplate.displayData.splice(_loc2_, 1);
                }
                _loc2_--;
            }
            this.redraw();
            this.sideBarScrollBar.checkResize();
            this.changedPlannerData();
            this.zoomScrollerUpdate();
            this.designView.redrawRanges();
            this.onDesignStateChange();
        }

        public function onExplorerChange(param1:Event = null):void {
            this.sideBarScrollBar.checkResize();
            this.changedPlannerData();
            this.onToolUpdate();
        }

        public function onClearExplorerSelections(param1:Event = null):void {
            this.buildingExplorer.clearSelections();
        }

        public function onExplorerItemClick(param1:BasePlannerNodeEvent = null):void {
            this.removeSelection();
            this.designView.addInventoryItem(param1.node);
            this.changedPlannerData();
            this.onToolUpdate();
        }

        public function onDesignItemPlace(param1:BasePlannerNodeEvent = null):void {
            this.buildingExplorer.removeBuilding(param1);
            this.changedPlannerData();
        }

        public function onDesignItemStore(param1:BasePlannerNodeEvent = null):void {
            this.buildingExplorer.addElement(param1.node);
            this.designView.spliceDisplayData(param1.node);
            this.changedPlannerData();
        }

        public function onDesignItemInvalid(param1:BasePlannerNodeEvent = null):void {
            this.buildingExplorer.clearSelections();
        }

        public function changedPlannerData():void {
            this.canApply = this.checkIfApplicable();
        }

        public function onDesignStateChange(param1:Event = null):void {
            this.hasBeenSaved = false;
            this.ioHistoryChanged();
            GLOBAL.UpdateAFKTimer();
        }

        public function Remove():void {
            if (this.designView) {
                this.designView.remove();
                this.displayCanvas.canvas.removeChild(this.designView);
                this.designView = null;
            }
            if (this.displayCanvas) {
                removeChild(this.displayCanvas);
                this.displayCanvas = null;
            }
            if (this.buildingExplorer) {
                this.buildingExplorer.clear();
                this.sideBar.canvas.removeChild(this.buildingExplorer);
                this.buildingExplorer = null;
            }
            if (this.sideBar) {
                removeChild(this.sideBar);
                this.sideBar = null;
            }
            if (this.mcFrame) {
                (this.mcFrame as frame).Clear();
                this.mcFrame = null;
            }
        }

        public function Hide(param1:MouseEvent = null):void {
            if (!this.hasBeenSaved && BasePlanner.canSave) {
                if (this._confirmationPopup) {
                    return;
                }
                this._confirmationPopup = new BasePlannerTransferConfirmation();
                this._confirmationPopup.tBody.htmlText = KEYS.Get("basePlanner_unsaved");
                this._confirmationPopup.bCancel.SetupKey("basePlanner_btnDiscard");
                this._confirmationPopup.bCancel.addEventListener(MouseEvent.CLICK, this.clickedDiscardInConfirmation, false, 0, true);
                this._confirmationPopup.bConfirm.addEventListener(MouseEvent.CLICK, this.clickedSaveInConfirmation, false, 0, true);
                this._confirmationPopup.addEventListener(Event.CLOSE, this.clickedCloseInConfirmation, false, 0, true);
                POPUPS.Add(this._confirmationPopup);
                POPUPSETTINGS.AlignToCenter(this._confirmationPopup);
            }
            else {
                PLANNER.Hide();
            }
        }

        protected function clickedCloseInConfirmation(param1:Event):void {
            this.removeConfirmationPopup();
        }

        private function removeConfirmationPopup():void {
            POPUPS.Remove(this._confirmationPopup);
            this._confirmationPopup = null;
        }

        protected function clickedDiscardInConfirmation(param1:Event):void {
            PLANNER.Hide();
            this.removeConfirmationPopup();
        }

        protected function clickedSaveInConfirmation(param1:Event):void {
            this.removeConfirmationPopup();
            dispatchEvent(new BasePlannerEvent(BasePlannerEvent.SAVE));
        }

        public function Resize():void {
            if (GLOBAL.INFERNO_ONLY) {
                // Placed by the frame itself, not by everything drawn around it: the frame's corner art and
                // close X sit above its top edge, and centring on the whole clip pushed them off-screen.
                // A little shorter than the screen, with the top edge far enough down to show them.
                this.configPopupTemplate(GLOBAL._SCREEN.width - 30, GLOBAL._SCREEN.height - 60);
                this.x = GLOBAL._SCREENCENTER.x - this._guideMC.guideBG.width / 2;
                this.y = GLOBAL._SCREENCENTER.y - this._guideMC.guideBG.height / 2 + 6;
                return;
            }
            this.configPopupTemplate(GLOBAL._SCREEN.width - 30, GLOBAL._SCREEN.height - 30);
            this.x = GLOBAL._SCREENCENTER.x + -(this._mcFrame.width / 2) + 10;
            this.y = GLOBAL._SCREENCENTER.y + -(this._mcFrame.height / 2) + 10;
        }

        public function debugBreakTrace():void {
        }

        public function get hasBeenSaved():Boolean {
            return this._hasBeenSaved;
        }

        public function set hasBeenSaved(param1:Boolean):void {
            this._hasBeenSaved = param1;
            if (param1) {
                this._bSave.Enabled = !BASE.isOutpost;
                this._bSave.enabled = !BASE.isOutpost;
                this._bSave.mouseEnabled = !BASE.isOutpost;
            }
            else {
                this._bSave.Enabled = BasePlanner.canSave;
                this._bSave.enabled = BasePlanner.canSave;
                this._bSave.mouseEnabled = BasePlanner.canSave;
            }
        }
    
        // ---------------------------------------------------------------------------------------------
        // Inferno-only toolbar across the top of the plan (PlannerDesignView: "Planner tools"). It holds
        // every tool, so the old icon menu is hidden. Expand yard sits at its right end; Full screen is a
        // round button beside the window's close X. Hovering a tool says what it does (the tooltip under
        // the plan), which is also where the result of an action is shown for a few seconds.
        // ---------------------------------------------------------------------------------------------

        private var _ioTools:Sprite = null;

        private var _ioButtons:Object = {};

        private var _ioFullscreen:Sprite = null;

        private var _ioBarHeight:int = 0;

        private var _ioStatusTimer:Timer = null;

        private static const IO_GAP:int = 2;

        private static const IO_GROUP_GAP:int = 12;

        /** Tools: [id, caption, icon]; null starts a new group. */
        private static const IO_LAYOUT:Array = [
                ["undo", "Undo", "undo"], ["redo", "Redo", "redo"], null,
                ["move", "Move", "move"], ["store", "Store", "store"], null,
                ["area", "Select", "select"], ["deselect", "Clear", "clear"], null,
                ["wall", "Walls", "walls"], null,
                ["flipx", "Flip L-R", "flipx"], ["flipy", "Flip T-B", "flipy"], ["rotate", "Rotate", "rotate"], null,
                ["export", "Export", "export"], ["import", "Import", "import"]
            ];

        /** At the right end of the toolbar. */
        private static const IO_UTILITY:Array = [["expand", "Expand", "expand"]];

        private static function ioIcon(param1:String, param2:Boolean):BitmapData {
            switch (param1) {
                case "undo":
                    return param2 ? new io_pt_undo_y(0, 0) : new io_pt_undo_w(0, 0);
                case "redo":
                    return param2 ? new io_pt_redo_y(0, 0) : new io_pt_redo_w(0, 0);
                case "move":
                    return param2 ? new io_pt_move_y(0, 0) : new io_pt_move_w(0, 0);
                case "store":
                    return param2 ? new io_pt_store_y(0, 0) : new io_pt_store_w(0, 0);
                case "select":
                    return param2 ? new io_pt_select_y(0, 0) : new io_pt_select_w(0, 0);
                case "walls":
                    return param2 ? new io_pt_walls_y(0, 0) : new io_pt_walls_w(0, 0);
                case "clear":
                    return param2 ? new io_pt_clear_y(0, 0) : new io_pt_clear_w(0, 0);
                case "flipx":
                    return param2 ? new io_pt_flipx_y(0, 0) : new io_pt_flipx_w(0, 0);
                case "flipy":
                    return param2 ? new io_pt_flipy_y(0, 0) : new io_pt_flipy_w(0, 0);
                case "rotate":
                    return param2 ? new io_pt_rotate_y(0, 0) : new io_pt_rotate_w(0, 0);
            }
            if (param1 == "export" || param1 == "import") {
                return ioDrawShareIcon(param1 == "export", param2);
            }
            return param2 ? new io_pt_expand_y(0, 0) : new io_pt_expand_w(0, 0);
        }

        /** Export / Import's pictures, drawn (a tray with an arrow out of it, or into it). */
        private static function ioDrawShareIcon(out:Boolean, yellow:Boolean):BitmapData {
            var c:uint = yellow ? 0xFFD24A : 0xFFFFFF;
            var sh:Shape = new Shape();
            var g:Graphics = sh.graphics;
            g.lineStyle(2, c, 1);
            g.moveTo(4, 15);
            g.lineTo(4, 22);
            g.lineTo(22, 22);
            g.lineTo(22, 15);
            g.lineStyle(0, 0, 0);
            g.beginFill(c, 1);
            if (out) {
                g.drawRect(11, 9, 4, 9);
                g.moveTo(7, 10);
                g.lineTo(13, 3);
                g.lineTo(19, 10);
            }
            else {
                g.drawRect(11, 3, 4, 9);
                g.moveTo(7, 11);
                g.lineTo(13, 18);
                g.lineTo(19, 11);
            }
            g.endFill();
            var bd:BitmapData = new BitmapData(26, 26, true, 0);
            bd.draw(sh);
            return bd;
        }

        // ---- Inferno-only (3 October): a layout as text, to give to another player (Export) or take one
        // from them (Import). Only where each building stands, by its type: no levels, no decorations. The
        // text is "BYML1:" and base64 of [[type, x, y], ...].

        private static const IO_LAYOUT_PREFIX:String = "BYML1:";

        private function ioLayoutNodes(placedOnly:Boolean):Array {
            var out:Array = [];
            var node:PlannerNode = null;
            for each (node in this._plannerTemplate.displayData) {
                if (node.category != PlannerNode.TYPE_DECORATION) {
                    out.push(node);
                }
            }
            if (!placedOnly) {
                for each (node in this._plannerTemplate.inventoryData) {
                    if (node.category != PlannerNode.TYPE_DECORATION) {
                        out.push(node);
                    }
                }
            }
            return out;
        }

        private function ioExportLayout():void {
            var rows:Array = [];
            for each (var node:PlannerNode in this.ioLayoutNodes(true)) {
                rows.push([node.type, int(node.x), int(node.y)]);
            }
            if (!rows.length) {
                this.ioSetStatus("Nothing on the plan to export.");
                return;
            }
            var code:String = IO_LAYOUT_PREFIX + Base64.encode(JSON.stringify(rows));
            try {
                System.setClipboard(code);
            }
            catch (e:Error) {
            }
            IoTextPrompt.Show("Export layout", "Copied: give this text to another player (it says where each of your " + rows.length + " buildings stands; no levels, no decorations).", code, 0, "OK", function(t:String):void {
                });
        }

        private function ioImportLayout():void {
            IoTextPrompt.Show("Import layout", "Paste a layout another player exported. Your buildings move to where theirs stand on the plan; then Apply it.", "", 0, "Import", this.ioApplyLayout);
        }

        private function ioApplyLayout(text:String):void {
            var rows:Array = null;
            try {
                text = String(text || "").replace(/\s+/g, "");
                if (text.indexOf(IO_LAYOUT_PREFIX) != 0) {
                    throw new Error("prefix");
                }
                // (Base64.decode reads nothing back from text ending in "=": the bytes are read from the start here)
                var bytes:ByteArray = Base64.decodeToByteArray(text.substr(IO_LAYOUT_PREFIX.length));
                bytes.position = 0;
                rows = JSON.parse(bytes.readUTFBytes(bytes.length)) as Array;
            }
            catch (e:Error) {
                rows = null;
            }
            if (!rows || !rows.length) {
                GLOBAL.Message("That isn't a layout: it should start with " + IO_LAYOUT_PREFIX + ".");
                return;
            }
            // a layout with buildings that overlap, or past the edge of this yard, isn't taken at all
            var refused:String = this.ioCheckLayout(rows);
            if (refused) {
                GLOBAL.Message("<b>This layout can't be imported.</b><br><br>" + refused + "<br><br>Your plan hasn't changed.");
                return;
            }
            this.designView.ioClearSelection();
            // (what was already overlapping before is left as it was)
            var wrongBefore:Array = this.designView.ioInvalidNodes();
            var mine:Array = this.ioLayoutNodes(false);
            var used:Dictionary = new Dictionary();
            var placed:int = 0;
            var missing:int = 0;
            var node:PlannerNode = null;
            var taken:Array = [];
            for each (var row:Array in rows) {
                if (!(row is Array) || row.length < 3) {
                    continue;
                }
                var type:int = int(row[0]);
                var hit:PlannerNode = null;
                for each (node in mine) {
                    if (!used[node] && node.type == type) {
                        hit = node;
                        break;
                    }
                }
                if (!hit) {
                    missing++;
                    continue;
                }
                used[hit] = true;
                hit.x = Number(row[1]);
                hit.y = Number(row[2]);
                hit.stored = 0;
                taken.push(hit);
                placed++;
            }
            // what the layout has no place for stays where it was, and decorations too, unless now in the way:
            // then it goes to storage (a plan with buildings in storage can't be applied until they're placed)
            var display:Vector.<PlannerNode> = this._plannerTemplate.displayData;
            var inventory:Vector.<PlannerNode> = this._plannerTemplate.inventoryData;
            var keep:Vector.<PlannerNode> = new Vector.<PlannerNode>();
            var stored:int = 0;
            var storedBuildings:int = 0;
            for each (node in display) {
                if (used[node]) {
                    keep.push(node);
                }
                else if (this.ioOverlapsAny(node, taken)) {
                    node.store();
                    inventory.push(node);
                    stored++;
                    if (node.category != PlannerNode.TYPE_DECORATION) {
                        storedBuildings++;
                    }
                }
                else {
                    keep.push(node);
                }
            }
            for each (node in inventory) {
                if (node.category != PlannerNode.TYPE_DECORATION && node.category != PlannerNode.TYPE_MISC && taken.indexOf(node) < 0 && storedBuildings == 0) {
                    storedBuildings = -1; // (some were in storage already)
                }
            }
            for each (node in taken) {
                if (keep.indexOf(node) < 0) {
                    keep.push(node);
                    var at:int = inventory.indexOf(node);
                    if (at >= 0) {
                        inventory.splice(at, 1);
                    }
                }
            }
            display.length = 0;
            for each (node in keep) {
                display.push(node);
            }
            this.designView.ioRebuild();
            // what still overlaps something goes to storage too: first what the layout didn't place, then (if
            // anything still overlaps) the layout's own
            // (one at a time for the layout's own: of two that overlap, only one has to go)
            for (var pass:int = 0; pass < 24; pass++) {
                var wrong:Array = this.designView.ioInvalidNodes();
                var moved:int = 0;
                for (var w:int = wrong.length - 1; w >= 0; w--) {
                    node = wrong[w];
                    if (taken.indexOf(node) < 0 && wrongBefore.indexOf(node) >= 0) {
                        continue; // (overlapping already before the import)
                    }
                    if (pass > 0 || taken.indexOf(node) < 0) {
                        var at2:int = display.indexOf(node);
                        if (at2 < 0) {
                            continue;
                        }
                        display.splice(at2, 1);
                        node.store();
                        inventory.push(node);
                        stored++;
                        moved++;
                        if (node.category != PlannerNode.TYPE_DECORATION) {
                            storedBuildings = storedBuildings < 0 ? 1 : storedBuildings + 1;
                        }
                        if (pass > 0) {
                            break;
                        }
                    }
                }
                if (moved) {
                    this.designView.ioRebuild();
                }
                else if (pass > 0) {
                    break;
                }
            }
            this.buildingExplorer.redraw();
            this.sideBarScrollBar.checkResize();
            this.changedPlannerData();
            this.onToolUpdate();
            this.hasBeenSaved = false;
            this.ioHistoryRecord();
            GLOBAL.Message("<b>Layout imported.</b><br><br>" + placed + " of your buildings moved into place" + (missing ? "; " + missing + " of the layout's are buildings you don't have" : "") + (stored ? "; " + stored + " in the way went to storage" : "") + ". " + (storedBuildings != 0 ? "Place the buildings in storage, then Apply it to your yard." : "Look it over, then Apply it to your yard."));
        }

        /**
         * Why a layout can't be imported, or null. Refused: any of its buildings past the edge of this yard (its
         * size now: GLOBAL._mapWidth x _mapHeight, as the planner draws it), or any two of them overlapping
         * (footprints as the planner's own checks; a type you have none of is sized by the smallest
         * footprint, 20, for the edge and left out of the overlaps, since it won't be placed).
         */
        private function ioCheckLayout(rows:Array):String {
            var sizes:Object = {};
            var names:Object = {};
            var node:PlannerNode = null;
            for each (node in this.ioLayoutNodes(false)) {
                if (!sizes[node.type] && node.building && node.building._footprint && node.building._footprint[0]) {
                    sizes[node.type] = new Point(node.building._footprint[0].width, node.building._footprint[0].height);
                    names[node.type] = node.name;
                }
            }
            var snap:int = PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
            var halfW:Number = GLOBAL._mapWidth / 2;
            var halfH:Number = GLOBAL._mapHeight / 2;
            var rects:Array = [];
            var rectNames:Array = [];
            var outside:int = 0;
            var outsideNames:Array = [];
            var bad:int = 0;
            for each (var row:* in rows) {
                if (!(row is Array) || row.length < 3) {
                    bad++;
                    continue;
                }
                var type:int = int(row[0]);
                var x:Number = Number(row[1]);
                var y:Number = Number(row[2]);
                if (!isFinite(x) || !isFinite(y)) {
                    bad++;
                    continue;
                }
                x = int(x / snap) * snap;
                y = int(y / snap) * snap;
                var size:Point = sizes[type] as Point;
                var w:Number = size ? size.x : 20;
                var h:Number = size ? size.y : 20;
                var props:Object = type > 0 ? GLOBAL._buildingProps[type - 1] : null;
                var name:String = names[type] || (props && props.name ? KEYS.Get(props.name) : "building");
                if (x < -halfW || y < -halfH || x > halfW - w || y > halfH - h) {
                    outside++;
                    if (outsideNames.indexOf(name) < 0) {
                        outsideNames.push(name);
                    }
                    continue;
                }
                if (size) {
                    rects.push(new Rectangle(x, y, w, h));
                    rectNames.push(name);
                }
            }
            var overlaps:int = 0;
            var overlapPair:String = null;
            for (var i:int = 0; i < rects.length; i++) {
                for (var j:int = i + 1; j < rects.length; j++) {
                    if ((rects[i] as Rectangle).intersects(rects[j] as Rectangle)) {
                        overlaps++;
                        overlapPair ||= rectNames[i] + " and " + rectNames[j];
                    }
                }
            }
            var why:Array = [];
            if (bad) {
                why.push(bad + (bad == 1 ? " of its entries isn't" : " of its entries aren't") + " a building and a place.");
            }
            if (outside) {
                why.push(outside + (outside == 1 ? " building stands" : " buildings stand") + " outside your yard (" + outsideNames.slice(0, 3).join(", ") + (outsideNames.length > 3 ? "..." : "") + "): your yard is " + GLOBAL._mapWidth + " x " + GLOBAL._mapHeight + ".");
            }
            if (overlaps) {
                why.push(overlaps + (overlaps == 1 ? " pair of buildings overlaps" : " pairs of buildings overlap") + " (" + overlapPair + (overlaps > 1 ? ", ..." : "") + ").");
            }
            return why.length ? why.join("<br>") : null;
        }

        private static function ioRect(node:PlannerNode):Rectangle {
            var size:Number = 20;
            if (node.building && node.building._footprint && node.building._footprint[0]) {
                size = Math.max(node.building._footprint[0].width, node.building._footprint[0].height);
            }
            return new Rectangle(node.x, node.y, size, size);
        }

        private function ioOverlapsAny(node:PlannerNode, others:Array):Boolean {
            var r:Rectangle = ioRect(node);
            for each (var o:PlannerNode in others) {
                if (r.intersects(ioRect(o))) {
                    return true;
                }
            }
            return false;
        }

        private function ioAddTools():void {
            if (!GLOBAL.INFERNO_ONLY || !this.toolMenu || !this.displayCanvas) {
                return;
            }
            this.toolMenu.visible = false;
            if (this.fullscreenButton) {
                this.fullscreenButton.visible = false;
            }
            var spec:Array = null;
            if (!this._ioTools) {
                this._ioTools = new Sprite();
                this.addChild(this._ioTools);
                for each (spec in IO_LAYOUT.concat(IO_UTILITY)) {
                    if (!spec) {
                        continue;
                    }
                    var tile:IoToolTile = new IoToolTile(spec[0], spec[1], ioIcon(spec[2], false), ioIcon(spec[2], true), true);
                    tile.addEventListener(MouseEvent.CLICK, this.ioToolClick);
                    tile.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.ioShowHint, [ioHint(spec[0])]));
                    tile.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                    this._ioTools.addChild(tile);
                    this._ioButtons[spec[0]] = tile;
                }
                this._ioFullscreen = new Sprite();
                this._ioFullscreen.addChild(new Bitmap(new frame1_button_fullscreen(0, 0)));
                this._ioFullscreen.buttonMode = true;
                this._ioFullscreen.addEventListener(MouseEvent.CLICK, GLOBAL.goFullScreen);
                this._ioFullscreen.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(this.ioShowHint, ["Full screen on or off."]));
                this._ioFullscreen.addEventListener(MouseEvent.ROLL_OUT, this.onToolTipHide);
                addEventListener(Event.ENTER_FRAME, this.ioHistoryTick);
            }
            // Beside the window's close X (the frame is rebuilt by each layout).
            this.mcFrame.ioAddBesideClose(this._ioFullscreen);
            var expandable:Boolean = BASE.isMainYardOrInfernoMainYard && GLOBAL.yardExpansionsBought < GLOBAL.yardExpansionsMax;
            var expand:IoToolTile = this._ioButtons["expand"] as IoToolTile;
            expand.visible = expandable;

            // Tiles left to right in groups, wrapping to a new row when the plan is narrow. Expand takes
            // the right end of the first row.
            var width:int = int(this.displayCanvas.canvasmask.width);
            var rowEnd:int = expandable ? width - 6 - IoToolTile.W - IO_GROUP_GAP : width - 6;
            var x:int = 6;
            var y:int = 4;
            var pendingGap:Boolean = false;
            for each (spec in IO_LAYOUT) {
                if (!spec) {
                    pendingGap = true;
                    continue;
                }
                var t:IoToolTile = this._ioButtons[spec[0]] as IoToolTile;
                if (pendingGap && x > 6) {
                    x += IO_GROUP_GAP;
                }
                pendingGap = false;
                if (x + IoToolTile.W > rowEnd && x > 6) {
                    x = 6;
                    y += 44;
                    rowEnd = width - 6;
                }
                t.x = x;
                t.y = y;
                x += IoToolTile.W + IO_GAP;
            }
            expand.x = width - 6 - IoToolTile.W;
            expand.y = 4;
            this._ioBarHeight = y + 44 + 4;

            this._ioTools.graphics.clear();
            this._ioTools.graphics.lineStyle(1, 0x7A5436, 1);
            this._ioTools.graphics.beginFill(0x24160F, 0.9);
            this._ioTools.graphics.drawRect(0, 0, width, this._ioBarHeight);
            this._ioTools.graphics.endFill();
            this._ioTools.x = this.displayCanvas.x;
            this._ioTools.y = this.displayCanvas.y;

            // The zoom control sits under the toolbar instead of behind it.
            if (this.zoomMenu) {
                this.zoomMenu.y = this.displayCanvas.y + this._ioBarHeight + 8;
            }
            if (this.designView) {
                this.designView.ioStatus = this.ioSetStatus;
                this.designView.ioWallsLeft = this.ioWallsLeft;
            }
            this.ioHistoryRecord();
        }

        private static function ioHint(param1:String):String {
            switch (param1) {
                case "undo":
                    return "Undo the last change.";
                case "redo":
                    return "Redo the change you undid.";
                case "move":
                    return "Move: click a building to pick it up, click again to put it down.";
                case "store":
                    return "Store: click a building to put it into storage (or store the whole selection).";
                case "area":
                    return "Select: drag a box around buildings. Then click one of them to move them all.";
                case "wall":
                    return "Walls: drag across the yard to lay walls from storage. Green fits, red is blocked.";
                case "deselect":
                    return "Clear the selection.";
                case "flipx":
                    return "Flip the selection (or the whole layout) left to right.";
                case "flipy":
                    return "Flip the selection (or the whole layout) top to bottom.";
                case "rotate":
                    return "Rotate the selection (or the whole layout) 90 degrees.";
                case "expand":
                    return "Buy the next yard expansion.";
                case "export":
                    return "Export: this layout as text, for another player to import (building types only).";
                case "import":
                    return "Import: paste a layout another player exported.";
            }
            return "";
        }

        /** A hover hint: replaces any action message still showing. */
        private function ioShowHint(param1:Event, param2:String):void {
            if (this._ioStatusTimer) {
                this._ioStatusTimer.stop();
            }
            this.onToolTipHint(param1, param2);
        }

        /** What an action did (from the design view or a tool): shown in the tooltip for a few seconds. */
        private function ioSetStatus(param1:String):void {
            if (!this.toolTipMenu) {
                return;
            }
            if (!param1) {
                this.onToolTipHide();
                return;
            }
            this.onToolTipHint(null, param1);
            if (!this._ioStatusTimer) {
                this._ioStatusTimer = new Timer(3500, 1);
                this._ioStatusTimer.addEventListener(TimerEvent.TIMER_COMPLETE, function(e:TimerEvent):void {
                        onToolTipHide();
                    });
            }
            this._ioStatusTimer.reset();
            this._ioStatusTimer.start();
        }

        private function ioToolClick(param1:MouseEvent):void {
            var id:String = (param1.currentTarget as IoToolTile).id;
            if (!this.designView) {
                return;
            }
            SOUNDS.Play("click1");
            switch (id) {
                case "undo":
                    this.ioUndo();
                    return;
                case "redo":
                    this.ioRedo();
                    return;
                case "move":
                    this.designView.setTool(PlannerDesignView.TOOL_SELECTMOVE);
                    break;
                case "store":
                    if (this.designView.ioSelectionCount > 0) {
                        this.ioConfirmStoreSelection();
                        return;
                    }
                    this.designView.setTool(PlannerDesignView.TOOL_STORE);
                    break;
                case "area":
                    this.designView.setTool(PlannerDesignView.TOOL_AREASELECT);
                    break;
                case "wall":
                    this.designView.setTool(PlannerDesignView.TOOL_WALLLINE);
                    this.ioSetStatus(ioHint("wall") + " (" + this.ioWallsLeft() + " in storage)");
                    this.onToolUpdate();
                    return;
                case "deselect":
                    this.designView.ioClearSelection();
                    this.ioSetStatus("Selection cleared.");
                    return;
                case "expand":
                    this.onStoreOpen(null);
                    return;
                case "export":
                    this.ioExportLayout();
                    return;
                case "import":
                    this.ioImportLayout();
                    return;
                default:
                    this.designView.ioTransform(id);
                    return;
            }
            this.onToolUpdate();
        }

        /** Store with buildings selected: the whole selection goes to storage, once confirmed. */
        private function ioConfirmStoreSelection():void {
            var count:int = this.designView.ioSelectionCount;
            GLOBAL.Message("Confirm moving " + (count == 1 ? "the selected item" : "the " + count + " selected items") + " to storage?", "Yes", function():void {
                    if (designView) {
                        var stored:int = designView.ioStoreSelection();
                        ioSetStatus(stored + (stored == 1 ? " building" : " buildings") + " moved to storage.");
                    }
                }, null, "No", function():void {
                });
        }

        private function ioHighlightTools():void {
            if (!this._ioTools || !this.designView) {
                return;
            }
            var tool:String = this.designView.currentTool;
            (this._ioButtons["move"] as IoToolTile).active = tool == PlannerDesignView.TOOL_SELECTMOVE;
            (this._ioButtons["store"] as IoToolTile).active = tool == PlannerDesignView.TOOL_STORE;
            (this._ioButtons["area"] as IoToolTile).active = tool == PlannerDesignView.TOOL_AREASELECT;
            (this._ioButtons["wall"] as IoToolTile).active = tool == PlannerDesignView.TOOL_WALLLINE;
        }

        // ---- Undo / Redo
        // A snapshot of the plan (which buildings are on it, where, and what is in storage) is kept after
        // every change (STATE_CHANGE from the design view, Clear). Undo and Redo put a snapshot back and
        // rebuild the plan and the storage list from it. Loading another layout starts a new history.

        private static const IO_HISTORY_MAX:int = 100;

        private var _ioHistory:Array = [];

        private var _ioHistoryAt:int = -1;

        private var _ioHistoryPending:Boolean = false;

        private var _ioRestoring:Boolean = false;

        private function ioSnapshot():Object {
            var node:PlannerNode = null;
            var placed:Array = [];
            for each (node in this._plannerTemplate.displayData) {
                placed.push([node, node.x, node.y]);
            }
            var stored:Array = [];
            for each (node in this._plannerTemplate.inventoryData) {
                stored.push(node);
            }
            return {"template": this._plannerTemplate, "placed": placed, "stored": stored};
        }

        private static function ioSameSnapshot(param1:Object, param2:Object):Boolean {
            var i:int = 0;
            if (param1.template != param2.template || param1.placed.length != param2.placed.length || param1.stored.length != param2.stored.length) {
                return false;
            }
            while (i < param1.placed.length) {
                if (param1.placed[i][0] != param2.placed[i][0] || param1.placed[i][1] != param2.placed[i][1] || param1.placed[i][2] != param2.placed[i][2]) {
                    return false;
                }
                i++;
            }
            i = 0;
            while (i < param1.stored.length) {
                if (param1.stored[i] != param2.stored[i]) {
                    return false;
                }
                i++;
            }
            return true;
        }

        /** After a change: recorded on the next frame, when every part of the change has landed. */
        private function ioHistoryChanged():void {
            if (!this._ioRestoring) {
                this._ioHistoryPending = true;
            }
        }

        private function ioHistoryTick(param1:Event):void {
            if (this._ioHistoryPending) {
                this._ioHistoryPending = false;
                this.ioHistoryRecord();
            }
        }

        private function ioHistoryRecord():void {
            if (!this._plannerTemplate || this._ioRestoring) {
                return;
            }
            var snap:Object = this.ioSnapshot();
            if (this._ioHistoryAt >= 0 && this._ioHistory[this._ioHistoryAt].template != snap.template) {
                this._ioHistory = [];
                this._ioHistoryAt = -1;
            }
            if (this._ioHistoryAt >= 0 && ioSameSnapshot(this._ioHistory[this._ioHistoryAt], snap)) {
                this.ioHistoryButtons();
                return;
            }
            this._ioHistory.splice(this._ioHistoryAt + 1, this._ioHistory.length);
            this._ioHistory.push(snap);
            if (this._ioHistory.length > IO_HISTORY_MAX) {
                this._ioHistory.shift();
            }
            this._ioHistoryAt = this._ioHistory.length - 1;
            this.ioHistoryButtons();
        }

        private function ioHistoryButtons():void {
            if (!this._ioButtons["undo"]) {
                return;
            }
            (this._ioButtons["undo"] as IoToolTile).alpha = this._ioHistoryAt > 0 ? 1 : 0.4;
            (this._ioButtons["redo"] as IoToolTile).alpha = this._ioHistoryAt < this._ioHistory.length - 1 ? 1 : 0.4;
        }

        public function ioUndo():void {
            this.ioHistoryTick(null);
            if (this._ioHistoryAt <= 0) {
                this.ioSetStatus("Nothing to undo.");
                return;
            }
            this._ioHistoryAt--;
            this.ioRestore(this._ioHistory[this._ioHistoryAt]);
            this.ioSetStatus("Undone.");
        }

        public function ioRedo():void {
            this.ioHistoryTick(null);
            if (this._ioHistoryAt >= this._ioHistory.length - 1) {
                this.ioSetStatus("Nothing to redo.");
                return;
            }
            this._ioHistoryAt++;
            this.ioRestore(this._ioHistory[this._ioHistoryAt]);
            this.ioSetStatus("Redone.");
        }

        private function ioRestore(param1:Object):void {
            var entry:Array = null;
            var node:PlannerNode = null;
            if (param1.template != this._plannerTemplate || !this.designView) {
                return;
            }
            this._ioRestoring = true;
            try {
                this.designView.ioClearSelection();
                this._plannerTemplate.displayData.length = 0;
                for each (entry in param1.placed) {
                    node = entry[0] as PlannerNode;
                    node.x = entry[1];
                    node.y = entry[2];
                    this._plannerTemplate.displayData.push(node);
                }
                this._plannerTemplate.inventoryData.length = 0;
                for each (node in param1.stored) {
                    this._plannerTemplate.inventoryData.push(node);
                }
                this.buildingExplorer.redraw();
                this.designView.ioRebuild();
                this.sideBarScrollBar.checkResize();
                this.changedPlannerData();
                this.onToolUpdate();
                this.hasBeenSaved = false;
            }
            finally {
                this._ioRestoring = false;
            }
            this.ioHistoryButtons();
        }

        /**
         * A wall still in storage, or null. Placing it takes it out of storage; one already on the plan
         * is never handed out again, so the same wall cannot be placed twice.
         */
        private function ioTakeWall():PlannerNode {
            var node:PlannerNode = null;
            for each (node in this._plannerTemplate.inventoryData) {
                if (node.category == PlannerNode.TYPE_WALL && this._plannerTemplate.displayData.indexOf(node) == -1) {
                    return node;
                }
            }
            return null;
        }

        private function ioWallsLeft():int {
            var count:int = 0;
            var node:PlannerNode = null;
            for each (node in this._plannerTemplate.inventoryData) {
                if (node.category == PlannerNode.TYPE_WALL && this._plannerTemplate.displayData.indexOf(node) == -1) {
                    count++;
                }
            }
            return count;
        }
    }
}
