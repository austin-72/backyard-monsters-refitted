import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, Graphics, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { System } from "flash/system";
import { TextField, TextFieldAutoSize } from "flash/text";
import { ByteArray, Dictionary, Timer } from "flash/utils";
import { BASE, Base64, BasePlanner, BasePlannerEvent, BasePlannerNodeEvent, BasePlannerPopup_BottomLayout, BasePlannerPopup_CLIP, BasePlannerPopup_DisplayViewContainer, BasePlannerPopup_ExplorerContainer, BasePlannerPopup_ExplorerHeader, BasePlannerPopup_ToolTip, BasePlannerPopup_ToolsLayout, BasePlannerPopup_ZoomLayout, BasePlannerTransferConfirmation, Button, Button_CLIP, Checkbox, GLOBAL, IoTextPrompt, IoToolTile, KEYS, PLANNER, POPUPS, POPUPSETTINGS, PlannerDesignView, PlannerExplorer, PlannerNode, PlannerTemplate, SOUNDS, STORE, ScrollSetV, buttonFullscreenFrame_CLIP, frame, frame1_button_fullscreen, io_pt_clear_w, io_pt_clear_y, io_pt_expand_w, io_pt_expand_y, io_pt_flipx_w, io_pt_flipx_y, io_pt_flipy_w, io_pt_flipy_y, io_pt_move_w, io_pt_move_y, io_pt_redo_w, io_pt_redo_y, io_pt_rotate_w, io_pt_rotate_y, io_pt_select_w, io_pt_select_y, io_pt_store_w, io_pt_store_y, io_pt_undo_w, io_pt_undo_y, io_pt_walls_w, io_pt_walls_y } from "@game";

export class BasePlannerPopup extends Sprite {
    static {
        as3.fields(this, { mcFrame: null, displayCanvas: null, sideBar: null, sideBarScrollBar: null, sideBarHeader: null, bottomMenu: null, toolMenu: null, storeMenu: null, inventoryMenu: null, zoomMenu: null, toolTipMenu: null, buildingExplorer: null, designView: null, fullscreenButton: null, _guideMC: null, _mcFrame: null, _plannerTemplate: null, _hasBeenSaved: false, _currentTool: null, _PLANNER_SIDEBAR_WIDTH: 190, _PLANNER_BOTTOMBAR_SPACING: 60, _PLANNER_TOP_MARGIN: 10, _PLANNER_BOTTOM_MARGIN: 5, _PLANNER_RIGHT_MARGIN: 10, _PLANNER_LEFT_MARGIN: 10, _PLANNER_HEADER_MARGIN: 32, _bSave: null, _bApply: null, _bLoad: null, _bClear: null, _isTemplateApplicable: true, _confirmationPopup: null, _clearConfirmationPopup: null, _ioTools: null, _ioButtons: null, _ioFullscreen: null, _ioBarHeight: 0, _ioStatusTimer: null, _ioHistory: null, _ioHistoryAt: -1, _ioHistoryPending: false, _ioRestoring: false });
    }

    private static _layoutSpacing: Point = new Point(10, 10);

    private static _layoutOffset: Point = new Point(0, 0);

    public static readonly EXPLORER_BUILDING_CLICK: string = "explorer_click";

    public static readonly EXPLORER_UPDATE: string = "explorer_update";

    public static readonly DESIGN_CLEAR_EXPLORER: string = "design_explorer_clear";

    public static readonly DESIGN_BUILDING_STORE: string = "design_building_store";

    public static readonly DESIGN_BUILDING_PLACE: string = "design_building_place";

    public static readonly DESIGN_BUILDING_INVALID: string = "design_building_invalid";

    public static readonly DESIGN_TOOL_UPDATE: string = "design_tool_update";

    public static readonly PLANNER_HINT: string = "planner_hint";

    public static readonly PLANNER_HINT_HIDE: string = "planner_hide";

    private static readonly IO_GAP: int = 2;

    private static readonly IO_GROUP_GAP: int = 12;

    /** Tools: [id, caption, icon]; null starts a new group. */
    private static readonly IO_LAYOUT: any[] = [["undo", "Undo", "undo"], ["redo", "Redo", "redo"], null, ["move", "Move", "move"], ["store", "Store", "store"], null, ["area", "Select", "select"], ["deselect", "Clear", "clear"], null, ["wall", "Walls", "walls"], null, ["flipx", "Flip L-R", "flipx"], ["flipy", "Flip T-B", "flipy"], ["rotate", "Rotate", "rotate"], null, ["export", "Export", "export"], ["import", "Import", "import"]];

    /** At the right end of the toolbar. */
    private static readonly IO_UTILITY: any[] = [["expand", "Expand", "expand"]];

    // ---- Inferno-only (3 October): a layout as text, to give to another player (Export) or take one
    // from them (Import). Only where each building stands, by its type: no levels, no decorations. The
    // text is "BYML1:" and base64 of [[type, x, y], ...].
    private static readonly IO_LAYOUT_PREFIX: string = "BYML1:";

    // ---- Undo / Redo
    // A snapshot of the plan (which buildings are on it, where, and what is in storage) is kept after
    // every change (STATE_CHANGE from the design view, Clear). Undo and Redo put a snapshot back and
    // rebuild the plan and the storage list from it. Loading another layout starts a new history.
    private static readonly IO_HISTORY_MAX: int = 100;
    public mcFrame: frame;
    public displayCanvas: BasePlannerPopup_DisplayViewContainer;
    public sideBar: BasePlannerPopup_ExplorerContainer;
    private sideBarScrollBar: ScrollSetV;
    public sideBarHeader: BasePlannerPopup_ExplorerHeader;
    public bottomMenu: BasePlannerPopup_BottomLayout;
    public toolMenu: BasePlannerPopup_ToolsLayout;
    public storeMenu: Sprite;
    public inventoryMenu: Sprite;
    public zoomMenu: BasePlannerPopup_ZoomLayout;
    public toolTipMenu: BasePlannerPopup_ToolTip;
    public buildingExplorer: PlannerExplorer;
    public designView: PlannerDesignView;
    public fullscreenButton: Sprite;
    private _guideMC: BasePlannerPopup_CLIP;
    private _mcFrame: Sprite;
    private _plannerTemplate: PlannerTemplate;
    private _hasBeenSaved: boolean;
    private _currentTool: string;
    private _PLANNER_SIDEBAR_WIDTH: int;
    private _PLANNER_BOTTOMBAR_SPACING: int;
    private _PLANNER_TOP_MARGIN: int;
    private _PLANNER_BOTTOM_MARGIN: int;
    private _PLANNER_RIGHT_MARGIN: int;
    private _PLANNER_LEFT_MARGIN: int;
    private _PLANNER_HEADER_MARGIN: int;
    private _bSave: Button;
    private _bApply: Button;
    private _bLoad: Button;
    private _bClear: Button;
    private _isTemplateApplicable: boolean;
    private _confirmationPopup: BasePlannerTransferConfirmation;
    private _clearConfirmationPopup: BasePlannerTransferConfirmation;
    // ---------------------------------------------------------------------------------------------
    // Inferno-only toolbar across the top of the plan (PlannerDesignView: "Planner tools"). It holds
    // every tool, so the old icon menu is hidden. Expand yard sits at its right end; Full screen is a
    // round button beside the window's close X. Hovering a tool says what it does (the tooltip under
    // the plan), which is also where the result of an action is shown for a few seconds.
    // ---------------------------------------------------------------------------------------------
    private _ioTools: Sprite;
    private _ioButtons: any;
    private _ioFullscreen: Sprite;
    private _ioBarHeight: int;
    private _ioStatusTimer: Timer;
    private _ioHistory: any[];
    private _ioHistoryAt: int;
    private _ioHistoryPending: boolean;
    private _ioRestoring: boolean;

    public $ctor(param1?: PlannerTemplate): void {
        this._ioButtons = {};
        this._ioHistory = [];
        super.$ctor();
        this._plannerTemplate = param1;
        this.setup();
        this.Resize();
    }

    public setup(): void {
        this.configPopupTemplate();
        this.buildingExplorer.addEventListener(PlannerExplorer.EXPLORER_ITEM_CLICK, as3.bind(this, this.onExplorerItemClick));
        if (!BasePlanner.canSave) {
            this._bLoad.Enabled = false;
            this._bLoad.mouseEnabled = false;
            this._bSave.Enabled = false;
            this._bSave.mouseEnabled = false;
            this._bSave.mouseChildren = false;
            this._bSave.enabled = false;
        }
    }

    private set canApply(param1: boolean) {
        this._bApply.Enabled = param1;
        this._isTemplateApplicable = param1;
    }

    private checkIfApplicable(): boolean {
        let _loc2_: string = null;
        let _loc1_: int = 0;
        while (_loc1_ < this._plannerTemplate.inventoryData.length) {
            _loc2_ = as3.vget(this._plannerTemplate.inventoryData, _loc1_).category;
            if (_loc2_ != PlannerNode.TYPE_DECORATION && _loc2_ != PlannerNode.TYPE_MISC) {
                return false;
            }
            _loc1_++;
        }
        return true;
    }

    public redraw(): void {
        this.buildingExplorer.redraw();
        this.designView.redraw();
        this.sideBarScrollBar.checkResize();
    }

    public configPopupTemplate(param1: int = 0, param2: int = 0): void {
        let _loc3_: Point = null;
        let _loc6_: Checkbox = null;
        let _loc7_: Checkbox = null;
        let _loc8_: Checkbox = null;
        let _loc9_: Checkbox = null;
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
        (as3.as(this.mcFrame, frame)).Setup(true, as3.bind(this, this.Hide));
        _loc3_ = new Point(this._PLANNER_LEFT_MARGIN, this._PLANNER_TOP_MARGIN);
        if (!this.sideBar) {
            this.sideBar = new BasePlannerPopup_ExplorerContainer();
        }
        this.sideBar.x = BasePlannerPopup._layoutSpacing.x + _loc3_.x;
        this.sideBar.y = BasePlannerPopup._layoutSpacing.y + _loc3_.y + this._PLANNER_HEADER_MARGIN;
        this.sideBar.mcScroller.visible = false;
        this.sideBar.mcframe.width = this._PLANNER_SIDEBAR_WIDTH;
        this.sideBar.mcframe.height = param2 - (this.sideBar.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
        this.sideBar.canvasmask.width = this._PLANNER_SIDEBAR_WIDTH;
        this.sideBar.canvasmask.height = param2 - (this.sideBar.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
        this.sideBar.bg.width = this._PLANNER_SIDEBAR_WIDTH;
        this.sideBar.bg.height = param2 - (this.sideBar.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN);
        if (!this.sideBarHeader) {
            this.sideBarHeader = new BasePlannerPopup_ExplorerHeader();
        }
        this.sideBarHeader.tLabel.htmlText = KEYS.Get("basePlanner_explorerHeader");
        this.sideBarHeader.x = BasePlannerPopup._layoutSpacing.x + _loc3_.x;
        this.sideBarHeader.y = BasePlannerPopup._layoutSpacing.y + _loc3_.y;
        this.addChild(this.sideBarHeader);
        if (!this.buildingExplorer) {
            this.buildingExplorer = new PlannerExplorer(this._plannerTemplate.inventoryData);
            this.buildingExplorer.setup();
            this.buildingExplorer.addEventListener(BasePlannerPopup.EXPLORER_BUILDING_CLICK, as3.bind(this, this.onExplorerItemClick));
            this.buildingExplorer.addEventListener(BasePlannerPopup.PLANNER_HINT, as3.bind(this, this.onToolTipNodeHint));
            this.buildingExplorer.addEventListener(BasePlannerPopup.PLANNER_HINT_HIDE, as3.bind(this, this.onToolTipNodeHide));
            this.buildingExplorer.addEventListener(BasePlannerPopup.EXPLORER_UPDATE, as3.bind(this, this.onExplorerChange));
            this.buildingExplorer.x = 0;
            this.buildingExplorer.y = 0;
            this.sideBar.canvas.getChildAt(0).height = 0;
            this.sideBar.canvas.addChild(this.buildingExplorer);
        }
        BasePlannerPopup._layoutOffset.x = this.sideBar.x + this.sideBar.canvasmask.width;
        BasePlannerPopup._layoutOffset.y = this.sideBar.y + this.sideBar.canvasmask.height;
        this.addChild(this.sideBar);
        if (!this.sideBarScrollBar) {
            this.createExplorerScrollBar(this.sideBar.canvas);
        } else {
            this.sideBarScrollBar.checkResize();
            this.sideBarScrollBar.x = this.sideBar.canvas.x + this.sideBar.canvas.width - this.sideBarScrollBar.width + this._PLANNER_LEFT_MARGIN;
            this.sideBarScrollBar.y = this.sideBar.canvas.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_TOP_MARGIN + this._PLANNER_HEADER_MARGIN;
            this.addChild(this.sideBarScrollBar);
        }
        if (!this.displayCanvas) {
            this.displayCanvas = new BasePlannerPopup_DisplayViewContainer();
            this.addChild(this.displayCanvas);
        }
        if (param1 == 0) {
            param1 = this.mcFrame.width | 0;
        }
        if (param2 == 0) {
            param2 = this.mcFrame.height | 0;
        }
        this.displayCanvas.x = BasePlannerPopup._layoutOffset.x;
        this.displayCanvas.y = BasePlannerPopup._layoutSpacing.y + _loc3_.y;
        this.displayCanvas.mcframemask.width = param1 - (this.displayCanvas.x + BasePlannerPopup._layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
        this.displayCanvas.mcframemask.height = param2 - (this.displayCanvas.y + BasePlannerPopup._layoutSpacing.y - 1 + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
        this.displayCanvas.mcframe.width = param1 - (this.displayCanvas.x + BasePlannerPopup._layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
        this.displayCanvas.mcframe.height = param2 - (this.displayCanvas.y + BasePlannerPopup._layoutSpacing.y - 1 + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
        this.displayCanvas.canvasmask.width = param1 - (this.displayCanvas.x + BasePlannerPopup._layoutSpacing.x + this._PLANNER_RIGHT_MARGIN);
        this.displayCanvas.canvasmask.height = param2 - (this.displayCanvas.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_BOTTOM_MARGIN) - this._PLANNER_BOTTOMBAR_SPACING;
        if (!this.designView) {
            this.designView = new PlannerDesignView(this._plannerTemplate.displayData);
            this.designView.setup();
            this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_PLACE, as3.bind(this, this.onDesignItemPlace));
            this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_STORE, as3.bind(this, this.onDesignItemStore));
            this.designView.addEventListener(BasePlannerPopup.DESIGN_BUILDING_INVALID, as3.bind(this, this.onDesignItemInvalid));
            this.designView.addEventListener(BasePlannerPopup.DESIGN_CLEAR_EXPLORER, as3.bind(this, this.onClearExplorerSelections));
            this.designView.addEventListener(BasePlannerPopup.PLANNER_HINT, as3.bind(this, this.onToolTipNodeHint));
            this.designView.addEventListener(BasePlannerPopup.PLANNER_HINT_HIDE, as3.bind(this, this.onToolTipNodeHide));
            this.designView.addEventListener(BasePlannerPopup.DESIGN_TOOL_UPDATE, as3.bind(this, this.onToolUpdate));
            this.designView.addEventListener(PlannerDesignView.STATE_CHANGE, as3.bind(this, this.onDesignStateChange));
            // Wall line tool: walls come out of storage one at a time (placing one takes it out).
            this.designView.ioTakeWall = as3.bind(this, this.ioTakeWall);
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
            this._bSave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSaveClick));
            this._bSave.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.onToolTipHint), [KEYS.Get("basePlanner_saveTool")]));
            this._bSave.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
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
            this._bLoad.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onLoadClick));
            this._bLoad.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.onToolTipHint), [KEYS.Get("basePlanner_loadTool")]));
            this._bLoad.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
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
            this._bApply.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onApplyClick));
            this._bApply.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.onToolTipHint), [KEYS.Get("basePlanner_applyTool")]));
            this._bApply.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
            this.bottomMenu.addChild(this._bApply);
            this.bottomMenu.removeChild(this.bottomMenu.btnApply);
            this._bClear = new Button_CLIP();
            this._bClear.x = this.bottomMenu.btnClear.x;
            this._bClear.y = this.bottomMenu.btnClear.y;
            this._bClear.width = this.bottomMenu.btnClear.width;
            this._bClear.height = this.bottomMenu.btnClear.height;
            this._bClear.SetupKey("basePlanner_btnClear");
            this._bClear.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClearClick));
            this._bClear.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.onToolTipHint), [KEYS.Get("basePlanner_clearTool")]));
            this._bClear.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
            this.bottomMenu.addChild(this._bClear);
            this.bottomMenu.removeChild(this.bottomMenu.btnClear);
            _loc6_ = Checkbox.Replace(this.bottomMenu.check1);
            this.bottomMenu.addChild(_loc6_);
            _loc6_.addEventListener(Checkbox.CHECK_EVENT, as3.bind(this, this.onCheckboxClick));
            (_loc7_ = Checkbox.Replace(this.bottomMenu.check2)).addEventListener(Checkbox.CHECK_EVENT, as3.bind(this, this.onCheckboxClick));
            this.bottomMenu.addChild(_loc7_);
            (_loc8_ = Checkbox.Replace(this.bottomMenu.check3)).addEventListener(Checkbox.CHECK_EVENT, as3.bind(this, this.onCheckboxClick));
            this.bottomMenu.addChild(_loc8_);
            if (this.bottomMenu.check4) {
                (_loc9_ = Checkbox.Replace(this.bottomMenu.check4)).addEventListener(Checkbox.CHECK_EVENT, as3.bind(this, this.onCheckboxClick));
                this.bottomMenu.addChild(_loc9_);
            }
            this.bottomMenu.check1_txt.htmlText = KEYS.Get("basePlanner_groundrange");
            this.bottomMenu.check2_txt.htmlText = KEYS.Get("basePlanner_aerialrange");
            this.bottomMenu.check3_txt.htmlText = KEYS.Get("basePlanner_minerange");
            if (this.bottomMenu.check4_txt) {
                this.bottomMenu.check4_txt.htmlText = KEYS.Get("basePlanner_moreinfo");
            }
            // Inferno-only: on one line, smaller if need be (longer languages wrapped to a hidden second line)
            for (const $value of as3.values(["check1_txt", "check2_txt", "check3_txt", "check4_txt"])) {
                let ioCheck: string = as3.str($value);
                if (this.bottomMenu[ioCheck]) {
                    GLOBAL.ioFitText(as3.as(this.bottomMenu[ioCheck], TextField), 7);
                }
            }
        }
        let _loc4_: int = 520;
        this.bottomMenu.x = param1 - (BasePlannerPopup._layoutSpacing.x + _loc4_) + _loc3_.x;
        this.bottomMenu.y = this.displayCanvas.y + this.displayCanvas.canvasmask.height;
        if (!this.toolMenu) {
            this.toolMenu = new BasePlannerPopup_ToolsLayout();
            this.addChild(this.toolMenu);
            this.toolMenu.mcSelectMove.gotoAndStop(1);
            this.toolMenu.mcSelectMove.buttonMode = true;
            this.toolMenu.mcSelectMove.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onToolClick));
            this.toolMenu.mcSelectMove.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onToolOver));
            this.toolMenu.mcSelectMove.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolOut));
            this.toolMenu.mcStore.gotoAndStop(1);
            this.toolMenu.mcStore.buttonMode = true;
            this.toolMenu.mcStore.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onToolClick));
            this.toolMenu.mcStore.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onToolOver));
            this.toolMenu.mcStore.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolOut));
            if (GLOBAL.yardExpansionsBought >= GLOBAL.yardExpansionsMax) {
                this.toolMenu.mcExpand.enabled = false;
                this.toolMenu.mcExpand.mouseEnabled = false;
                this.toolMenu.mcExpand.gotoAndStop("off");
            } else if (BASE.isMainYardOrInfernoMainYard) {
                this.toolMenu.mcExpand.gotoAndStop(1);
                this.toolMenu.mcExpand.buttonMode = true;
                this.toolMenu.mcExpand.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onStoreOpen));
                this.toolMenu.mcExpand.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onToolOver));
                this.toolMenu.mcExpand.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolOut));
                this.toolMenu.mcExpand.visible = true;
            } else {
                this.toolMenu.mcExpand.visible = false;
            }
        }
        this.toolMenu.x = BasePlannerPopup._layoutOffset.x + 50;
        this.toolMenu.y = BasePlannerPopup._layoutSpacing.y + _loc3_.y;
        if (!this.zoomMenu) {
            this.zoomMenu = new BasePlannerPopup_ZoomLayout();
            this.addChild(this.zoomMenu);
            if (GLOBAL.DOES_USE_SCROLL) {
                this.displayCanvas.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.onScroll));
            }
            this.zoomMenu.btnUp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onZoomUp));
            this.zoomMenu.btnDown.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onZoomDown));
            this.zoomMenu.scrollbar.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onZoomScroll));
        }
        this.zoomMenu.x = BasePlannerPopup._layoutOffset.x + 25;
        this.zoomMenu.y = BasePlannerPopup._layoutSpacing.y + 10;
        this.zoomScrollerUpdate();
        if (!this.fullscreenButton) {
            this.fullscreenButton = new Sprite();
            this.fullscreenButton.addChild(new buttonFullscreenFrame_CLIP());
            this.fullscreenButton.addEventListener(MouseEvent.CLICK, GLOBAL.goFullScreen);
        }
        this._mcFrame.addChild(this.fullscreenButton);
        this.fullscreenButton.x = param1 - (BasePlannerPopup._layoutSpacing.x + 50) + _loc3_.x;
        this.fullscreenButton.y = -10;
        // Inferno-only: the toolbar replaces the tool icons and holds Full screen (ioAddTools).
        this.ioAddTools();
        if (!this.toolTipMenu) {
            this.toolTipMenu = new BasePlannerPopup_ToolTip();
            this.toolTipMenu.mouseEnabled = false;
            this.addChild(this.toolTipMenu);
        }
        let _loc5_: int = this.displayCanvas.canvasmask.width | 0;
        this.toolTipMenu.x = this.displayCanvas.x + this.displayCanvas.canvasmask.width / 2;
        this.toolTipMenu.y = this.displayCanvas.y + this.displayCanvas.canvasmask.height - 40;
        this.onToolTipHide();
        this.onToolUpdate();
        this.x = -(this.width / 2);
        this.y = -(this.height / 2);
    }

    public onToolTipNodeHint(param1: BasePlannerNodeEvent): void {
        if (!this.toolTipMenu.hitTestPoint(this.stage.mouseX, this.mouseY)) {
            this.onToolTipHint(null, param1.node.displayNameFull);
        }
    }

    public onToolTipMouseHint(param1: Function, param2: any[]): Function {
        let method: Function = null;
        let additionalArguments: any[] = null;
        method = param1;
        additionalArguments = param2;
        return (param1: MouseEvent): void => {
            method.apply(null, [param1].concat(additionalArguments));
        };
    }

    public onToolTipHint(param1: Event, param2: string): void {
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

    public onToolTipNodeHide(param1: BasePlannerNodeEvent): void {
        this.onToolTipHide();
    }

    public onToolTipHide(param1: MouseEvent = null): void {
        this.toolTipMenu.visible = false;
    }

    public onToolUpdate(param1: Event = null): void {
        this.onToolReset();
        this.ioHighlightTools();
        if (this.designView.currentTool == PlannerDesignView.TOOL_SELECTMOVE) {
            this.toolMenu.mcSelectMove.gotoAndStop("over");
        } else if (this.designView.currentTool == PlannerDesignView.TOOL_STORE) {
            this.toolMenu.mcStore.gotoAndStop("over");
        }
        if (GLOBAL.yardExpansionsBought >= GLOBAL.yardExpansionsMax) {
            this.toolMenu.mcExpand.enabled = false;
            this.toolMenu.mcExpand.mouseEnabled = false;
            this.toolMenu.mcExpand.gotoAndStop("off");
        } else if (BASE.isMainYardOrInfernoMainYard) {
            this.toolMenu.mcExpand.visible = true;
        } else {
            this.toolMenu.mcExpand.visible = false;
        }
    }

    public onToolReset(param1: Event = null): void {
        this.toolMenu.mcSelectMove.gotoAndStop("out");
        this.toolMenu.mcStore.gotoAndStop("out");
        this.toolMenu.mcExpand.gotoAndStop("out");
    }

    public onToolClick(param1: MouseEvent): void {
        if (param1.target == this.toolMenu.mcSelectMove) {
            this.designView.setTool(PlannerDesignView.TOOL_SELECTMOVE);
        }
        if (param1.target == this.toolMenu.mcStore) {
            this.designView.setTool(PlannerDesignView.TOOL_STORE);
        }
        this.onToolUpdate();
    }

    public onToolOver(param1: MouseEvent): void {
        param1.target.gotoAndStop("over");
        if (param1.target == this.toolMenu.mcSelectMove) {
            this.onToolTipHint(null, KEYS.Get("basePlanner_moveTool"));
        } else if (param1.target == this.toolMenu.mcStore) {
            this.onToolTipHint(null, KEYS.Get("basePlanner_storageTool"));
        } else if (param1.target == this.toolMenu.mcExpand) {
            this.onToolTipHint(null, KEYS.Get("basePlanner_expandTool"));
        }
    }

    public onToolOut(param1: MouseEvent): void {
        this.onToolUpdate();
        this.onToolTipHide();
    }

    public onStoreOpen(param1: MouseEvent = null): void {
        if (BASE.isMainYardOrInfernoMainYard) {
            STORE.ShowB(1, 1, [GLOBAL.yardExpansionItem]);
            if (STORE._mc) {
                STORE._mc.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onStoreClosed));
            }
        }
    }

    public onStoreClosed(param1: Event = null): void {
        this.designView.redraw();
        this.onToolUpdate();
    }

    public onCheckboxClick(param1: Event = null): void {
        let _loc2_: Checkbox = null;
        if (param1.target instanceof Checkbox) {
            _loc2_ = as3.as(param1.target, Checkbox);
            this.designView.toggleView(_loc2_);
        }
    }

    public removeSelection(): void {
        this.designView.removeSelection();
    }

    protected onScroll(param1: MouseEvent): void {
        if (param1.delta < 0) {
            this.onZoomDown(null);
        } else {
            this.onZoomUp(null);
        }
    }

    public onZoomUp(param1: MouseEvent = null): void {
        let _loc2_: number = PlannerDesignView.zoomValue;
        if (_loc2_ < this.designView.zoomMax) {
            _loc2_ = Math.min(_loc2_ + this.designView.zoomStep, this.designView.zoomMax);
            this.designView.setZoom(_loc2_);
        }
        this.zoomScrollerUpdate();
    }

    public onZoomDown(param1: MouseEvent = null): void {
        let _loc2_: number = PlannerDesignView.zoomValue;
        if (_loc2_ > this.designView.zoomMin) {
            _loc2_ = Math.max(_loc2_ - this.designView.zoomStep, this.designView.zoomMin);
            this.designView.setZoom(_loc2_);
        }
        this.zoomScrollerUpdate();
    }

    public onZoomScroll(param1: MouseEvent = null): void {
    }

    public zoomScrollerUpdate(): void {
        let _loc1_: number = 42;
        let _loc2_: number = 107;
        let _loc3_: number = _loc2_ - _loc1_;
        let _loc4_: number = this.designView.zoomMax - this.designView.zoomMin;
        let _loc5_: number = _loc2_ - _loc3_ / _loc4_ * PlannerDesignView.zoomValue;
        this.zoomMenu.scrollbar.y = _loc5_;
    }

    private createExplorerScrollBar(param1: Sprite): void {
        param1.mask = this.sideBar.canvasmask;
        this.sideBarScrollBar = new ScrollSetV(param1, this.sideBar.canvasmask);
        this.sideBarScrollBar.x = param1.x + param1.width - this.sideBarScrollBar.width + this._PLANNER_LEFT_MARGIN;
        this.sideBarScrollBar.y = param1.y + BasePlannerPopup._layoutSpacing.y + this._PLANNER_TOP_MARGIN;
        this.addChild(this.sideBarScrollBar);
    }

    protected onApplyClick(param1: MouseEvent): void {
        if (this._isTemplateApplicable) {
            // Inferno-only: nor a plan with buildings that overlap or stand past the yard's edge (one saved
            // from a layout imported before Import checked them)
            if (GLOBAL.INFERNO_ONLY) {
                let rows: any[] = [];
                for (let node of as3.values(this.ioLayoutNodes(true))) {
                    rows.push([node.type, node.x, node.y]);
                }
                let refused: string = this.ioCheckLayout(rows);
                if (refused) {
                    GLOBAL.Message("<b>This plan can't be applied.</b><br><br>" + refused + "<br><br>Move them inside your yard and apart first.");
                    return;
                }
            }
            this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.APPLY));
        } else {
            GLOBAL.Message(KEYS.Get("basePlanner_cantApply"));
        }
    }

    protected onLoadClick(param1: MouseEvent): void {
        this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.LOAD));
    }

    protected onSaveClick(param1: MouseEvent): void {
        this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.SAVE));
    }

    protected onClearClick(param1: MouseEvent): void {
        if (this._clearConfirmationPopup) {
            return;
        }
        this._clearConfirmationPopup = new BasePlannerTransferConfirmation();
        this._clearConfirmationPopup.tBody.htmlText = KEYS.Get("basePlanner_unsaved");
        this._clearConfirmationPopup.bCancel.SetupKey("basePlanner_btnClear");
        this._clearConfirmationPopup.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedClearInConfirmationClear), false, 0, true);
        if (BasePlanner.canSave == false) {
            this._clearConfirmationPopup.bConfirm.Enabled = false;
        } else {
            this._clearConfirmationPopup.bConfirm.Enabled = true;
            this._clearConfirmationPopup.bConfirm.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedSaveInConfirmationClear), false, 0, true);
        }
        this._clearConfirmationPopup.addEventListener(Event.CLOSE, as3.bind(this, this.clickedCloseInConfirmationClear), false, 0, true);
        POPUPS.Add(this._clearConfirmationPopup);
        POPUPSETTINGS.AlignToCenter(this._clearConfirmationPopup);
    }

    protected clickedCloseInConfirmationClear(param1: Event): void {
        this.removeClearConfirmationPopup();
    }

    protected clickedSaveInConfirmationClear(param1: MouseEvent): void {
        this.removeClearConfirmationPopup();
        this.onSaveClick(null);
    }

    protected clickedClearInConfirmationClear(param1: MouseEvent): void {
        this.removeClearConfirmationPopup();
        this.clear();
    }

    private removeClearConfirmationPopup(): void {
        if (this._clearConfirmationPopup) {
            POPUPS.Remove(this._clearConfirmationPopup);
            this._clearConfirmationPopup = null;
        }
    }

    private clear(): void {
        let _loc3_: string = null;
        let _loc1_: int = this._plannerTemplate.displayData.length | 0;
        let _loc2_: int = (_loc1_ - 1) | 0;
        while (_loc2_ >= 0) {
            _loc3_ = as3.vget(this._plannerTemplate.displayData, _loc2_).category;
            if (_loc3_ != PlannerNode.TYPE_MISC) {
                this._plannerTemplate.inventoryData.push(as3.vget(this._plannerTemplate.displayData, _loc2_));
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

    public onExplorerChange(param1: Event = null): void {
        this.sideBarScrollBar.checkResize();
        this.changedPlannerData();
        this.onToolUpdate();
    }

    public onClearExplorerSelections(param1: Event = null): void {
        this.buildingExplorer.clearSelections();
    }

    public onExplorerItemClick(param1: BasePlannerNodeEvent = null): void {
        this.removeSelection();
        this.designView.addInventoryItem(param1.node);
        this.changedPlannerData();
        this.onToolUpdate();
    }

    public onDesignItemPlace(param1: BasePlannerNodeEvent = null): void {
        this.buildingExplorer.removeBuilding(param1);
        this.changedPlannerData();
    }

    public onDesignItemStore(param1: BasePlannerNodeEvent = null): void {
        this.buildingExplorer.addElement(param1.node);
        this.designView.spliceDisplayData(param1.node);
        this.changedPlannerData();
    }

    public onDesignItemInvalid(param1: BasePlannerNodeEvent = null): void {
        this.buildingExplorer.clearSelections();
    }

    public changedPlannerData(): void {
        this.canApply = this.checkIfApplicable();
    }

    public onDesignStateChange(param1: Event = null): void {
        this.hasBeenSaved = false;
        this.ioHistoryChanged();
        GLOBAL.UpdateAFKTimer();
    }

    public Remove(): void {
        if (this.designView) {
            this.designView.remove();
            this.displayCanvas.canvas.removeChild(this.designView);
            this.designView = null;
        }
        if (this.displayCanvas) {
            this.removeChild(this.displayCanvas);
            this.displayCanvas = null;
        }
        if (this.buildingExplorer) {
            this.buildingExplorer.clear();
            this.sideBar.canvas.removeChild(this.buildingExplorer);
            this.buildingExplorer = null;
        }
        if (this.sideBar) {
            this.removeChild(this.sideBar);
            this.sideBar = null;
        }
        if (this.mcFrame) {
            (as3.as(this.mcFrame, frame)).Clear();
            this.mcFrame = null;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        if (!this.hasBeenSaved && BasePlanner.canSave) {
            if (this._confirmationPopup) {
                return;
            }
            this._confirmationPopup = new BasePlannerTransferConfirmation();
            this._confirmationPopup.tBody.htmlText = KEYS.Get("basePlanner_unsaved");
            this._confirmationPopup.bCancel.SetupKey("basePlanner_btnDiscard");
            this._confirmationPopup.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedDiscardInConfirmation), false, 0, true);
            this._confirmationPopup.bConfirm.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedSaveInConfirmation), false, 0, true);
            this._confirmationPopup.addEventListener(Event.CLOSE, as3.bind(this, this.clickedCloseInConfirmation), false, 0, true);
            POPUPS.Add(this._confirmationPopup);
            POPUPSETTINGS.AlignToCenter(this._confirmationPopup);
        } else {
            PLANNER.Hide();
        }
    }

    protected clickedCloseInConfirmation(param1: Event): void {
        this.removeConfirmationPopup();
    }

    private removeConfirmationPopup(): void {
        POPUPS.Remove(this._confirmationPopup);
        this._confirmationPopup = null;
    }

    protected clickedDiscardInConfirmation(param1: Event): void {
        PLANNER.Hide();
        this.removeConfirmationPopup();
    }

    protected clickedSaveInConfirmation(param1: Event): void {
        this.removeConfirmationPopup();
        this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.SAVE));
    }

    public Resize(): void {
        if (GLOBAL.INFERNO_ONLY) {
            // Placed by the frame itself, not by everything drawn around it: the frame's corner art and
            // close X sit above its top edge, and centring on the whole clip pushed them off-screen.
            // A little shorter than the screen, with the top edge far enough down to show them.
            this.configPopupTemplate((GLOBAL._SCREEN.width - 30) | 0, (GLOBAL._SCREEN.height - 60) | 0);
            this.x = GLOBAL._SCREENCENTER.x - this._guideMC.guideBG.width / 2;
            this.y = GLOBAL._SCREENCENTER.y - this._guideMC.guideBG.height / 2 + 6;
            return;
        }
        this.configPopupTemplate((GLOBAL._SCREEN.width - 30) | 0, (GLOBAL._SCREEN.height - 30) | 0);
        this.x = GLOBAL._SCREENCENTER.x + -(this._mcFrame.width / 2) + 10;
        this.y = GLOBAL._SCREENCENTER.y + -(this._mcFrame.height / 2) + 10;
    }

    public debugBreakTrace(): void {
    }

    public get hasBeenSaved(): boolean {
        return this._hasBeenSaved;
    }

    public set hasBeenSaved(param1: boolean) {
        this._hasBeenSaved = param1;
        if (param1) {
            this._bSave.Enabled = !BASE.isOutpost;
            this._bSave.enabled = !BASE.isOutpost;
            this._bSave.mouseEnabled = !BASE.isOutpost;
        } else {
            this._bSave.Enabled = BasePlanner.canSave;
            this._bSave.enabled = BasePlanner.canSave;
            this._bSave.mouseEnabled = BasePlanner.canSave;
        }
    }

    private static ioIcon(param1: string, param2: boolean): BitmapData {
        switch (param1) {
            case "undo":
                return as3.cast(param2 ? new io_pt_undo_y(0, 0) : new io_pt_undo_w(0, 0), BitmapData);
            case "redo":
                return as3.cast(param2 ? new io_pt_redo_y(0, 0) : new io_pt_redo_w(0, 0), BitmapData);
            case "move":
                return as3.cast(param2 ? new io_pt_move_y(0, 0) : new io_pt_move_w(0, 0), BitmapData);
            case "store":
                return as3.cast(param2 ? new io_pt_store_y(0, 0) : new io_pt_store_w(0, 0), BitmapData);
            case "select":
                return as3.cast(param2 ? new io_pt_select_y(0, 0) : new io_pt_select_w(0, 0), BitmapData);
            case "walls":
                return as3.cast(param2 ? new io_pt_walls_y(0, 0) : new io_pt_walls_w(0, 0), BitmapData);
            case "clear":
                return as3.cast(param2 ? new io_pt_clear_y(0, 0) : new io_pt_clear_w(0, 0), BitmapData);
            case "flipx":
                return as3.cast(param2 ? new io_pt_flipx_y(0, 0) : new io_pt_flipx_w(0, 0), BitmapData);
            case "flipy":
                return as3.cast(param2 ? new io_pt_flipy_y(0, 0) : new io_pt_flipy_w(0, 0), BitmapData);
            case "rotate":
                return as3.cast(param2 ? new io_pt_rotate_y(0, 0) : new io_pt_rotate_w(0, 0), BitmapData);
        }
        if (param1 == "export" || param1 == "import") {
            return BasePlannerPopup.ioDrawShareIcon(param1 == "export", param2);
        }
        return as3.cast(param2 ? new io_pt_expand_y(0, 0) : new io_pt_expand_w(0, 0), BitmapData);
    }

    /** Export / Import's pictures, drawn (a tray with an arrow out of it, or into it). */
    private static ioDrawShareIcon(out: boolean, yellow: boolean): BitmapData {
        let c: uint = (yellow ? 0xFFD24A : 0xFFFFFF) >>> 0;
        let sh: Shape = new Shape();
        let g: Graphics = sh.graphics;
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
        } else {
            g.drawRect(11, 3, 4, 9);
            g.moveTo(7, 11);
            g.lineTo(13, 18);
            g.lineTo(19, 11);
        }
        g.endFill();
        let bd: BitmapData = new BitmapData(26, 26, true, 0);
        bd.draw(as3.cast(sh, IBitmapDrawable));
        return bd;
    }

    private ioLayoutNodes(placedOnly: boolean): any[] {
        let out: any[] = [];
        let node: PlannerNode = null;
        for (node of (this._plannerTemplate.displayData ?? [])) {
            if (node.category != PlannerNode.TYPE_DECORATION) {
                out.push(node);
            }
        }
        if (!placedOnly) {
            for (node of (this._plannerTemplate.inventoryData ?? [])) {
                if (node.category != PlannerNode.TYPE_DECORATION) {
                    out.push(node);
                }
            }
        }
        return out;
    }

    private ioExportLayout(): void {
        let rows: any[] = [];
        for (let node of as3.values(this.ioLayoutNodes(true))) {
            rows.push([node.type, node.x | 0, node.y | 0]);
        }
        if (!rows.length) {
            this.ioSetStatus("Nothing on the plan to export.");
            return;
        }
        let code: string = BasePlannerPopup.IO_LAYOUT_PREFIX + Base64.encode(JSON.stringify(rows));
        try {
            System.setClipboard(code);
        } catch (e) {
        }
        IoTextPrompt.Show("Export layout", "Copied: give this text to another player (it says where each of your " + rows.length + " buildings stands; no levels, no decorations).", code, 0, "OK", (t: string): void => {
        });
    }

    private ioImportLayout(): void {
        IoTextPrompt.Show("Import layout", "Paste a layout another player exported. Your buildings move to where theirs stand on the plan; then Apply it.", "", 0, "Import", as3.bind(this, this.ioApplyLayout));
    }

    private ioApplyLayout(text: string): void {
        let rows: any[] = null;
        try {
            text = String(text || "").replace(/\s+/g, "");
            if (text.indexOf(BasePlannerPopup.IO_LAYOUT_PREFIX) != 0) {
                throw new Error("prefix");
            }
            // (Base64.decode reads nothing back from text ending in "=": the bytes are read from the start here)
            let bytes: ByteArray = Base64.decodeToByteArray(text.substr(BasePlannerPopup.IO_LAYOUT_PREFIX.length));
            bytes.position = 0;
            rows = as3.as(JSON.parse(bytes.readUTFBytes(bytes.length)), Array);
        } catch (e) {
            rows = null;
        }
        if (!rows || !rows.length) {
            GLOBAL.Message("That isn't a layout: it should start with " + BasePlannerPopup.IO_LAYOUT_PREFIX + ".");
            return;
        }
        // a layout with buildings that overlap, or past the edge of this yard, isn't taken at all
        let refused: string = this.ioCheckLayout(rows);
        if (refused) {
            GLOBAL.Message("<b>This layout can't be imported.</b><br><br>" + refused + "<br><br>Your plan hasn't changed.");
            return;
        }
        this.designView.ioClearSelection();
        // (what was already overlapping before is left as it was)
        let wrongBefore: any[] = this.designView.ioInvalidNodes();
        let mine: any[] = this.ioLayoutNodes(false);
        let used: Dictionary = new Dictionary();
        let placed: int = 0;
        let missing: int = 0;
        let node: PlannerNode = null;
        let taken: any[] = [];
        for (let row of as3.values(rows)) {
            if (!(as3.is(row, Array)) || row.length < 3) {
                continue;
            }
            let type: int = row[0] | 0;
            let hit: PlannerNode = null;
            for (node of as3.values(mine)) {
                if (!used.get(node) && node.type == type) {
                    hit = node;
                    break;
                }
            }
            if (!hit) {
                missing++;
                continue;
            }
            used.set(hit, true);
            hit.x = Number(row[1]);
            hit.y = Number(row[2]);
            hit.stored = 0;
            taken.push(hit);
            placed++;
        }
        // what the layout has no place for stays where it was, and decorations too, unless now in the way:
        // then it goes to storage (a plan with buildings in storage can't be applied until they're placed)
        let display: Vector<PlannerNode> = this._plannerTemplate.displayData;
        let inventory: Vector<PlannerNode> = this._plannerTemplate.inventoryData;
        let keep: Vector<PlannerNode> = new Vector<PlannerNode>(0, false, PlannerNode);
        let stored: int = 0;
        let storedBuildings: int = 0;
        for (node of (display ?? [])) {
            if (used.get(node)) {
                keep.push(node);
            } else if (this.ioOverlapsAny(node, taken)) {
                node.store();
                inventory.push(node);
                stored++;
                if (node.category != PlannerNode.TYPE_DECORATION) {
                    storedBuildings++;
                }
            } else {
                keep.push(node);
            }
        }
        for (node of (inventory ?? [])) {
            if (node.category != PlannerNode.TYPE_DECORATION && node.category != PlannerNode.TYPE_MISC && taken.indexOf(node) < 0 && storedBuildings == 0) {
                storedBuildings = -1;
            }
        }
        for (node of as3.values(taken)) {
            if (keep.indexOf(node) < 0) {
                keep.push(node);
                let at: int = inventory.indexOf(node) | 0;
                if (at >= 0) {
                    inventory.splice(at, 1);
                }
            }
        }
        as3.vsetLength(display, 0);
        for (node of (keep ?? [])) {
            display.push(node);
        }
        this.designView.ioRebuild();
        // what still overlaps something goes to storage too: first what the layout didn't place, then (if
        // anything still overlaps) the layout's own
        // (one at a time for the layout's own: of two that overlap, only one has to go)
        for (let pass: int = 0; pass < 24; pass++) {
            let wrong: any[] = this.designView.ioInvalidNodes();
            let moved: int = 0;
            for (let w: int = (wrong.length - 1) | 0; w >= 0; w--) {
                node = as3.cast(wrong[w], PlannerNode);
                if (taken.indexOf(node) < 0 && wrongBefore.indexOf(node) >= 0) {
                    continue;
                }
                if (pass > 0 || taken.indexOf(node) < 0) {
                    let at2: int = display.indexOf(node) | 0;
                    if (at2 < 0) {
                        continue;
                    }
                    display.splice(at2, 1);
                    node.store();
                    inventory.push(node);
                    stored++;
                    moved++;
                    if (node.category != PlannerNode.TYPE_DECORATION) {
                        storedBuildings = (storedBuildings < 0 ? 1 : storedBuildings + 1) | 0;
                    }
                    if (pass > 0) {
                        break;
                    }
                }
            }
            if (moved) {
                this.designView.ioRebuild();
            } else if (pass > 0) {
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
    private ioCheckLayout(rows: any[]): string {
        let sizes: any = {};
        let names: any = {};
        let node: PlannerNode = null;
        for (node of as3.values(this.ioLayoutNodes(false))) {
            if (!sizes[node.type] && node.building && node.building._footprint && node.building._footprint[0]) {
                sizes[node.type] = new Point(node.building._footprint[0].width, node.building._footprint[0].height);
                names[node.type] = node.name;
            }
        }
        let snap: int = PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        let halfW: number = GLOBAL._mapWidth / 2;
        let halfH: number = GLOBAL._mapHeight / 2;
        let rects: any[] = [];
        let rectNames: any[] = [];
        let outside: int = 0;
        let outsideNames: any[] = [];
        let bad: int = 0;
        for (let row of as3.values(rows)) {
            if (!(as3.is(row, Array)) || row.length < 3) {
                bad++;
                continue;
            }
            let type: int = row[0] | 0;
            let x: number = Number(row[1]);
            let y: number = Number(row[2]);
            if (!isFinite(x) || !isFinite(y)) {
                bad++;
                continue;
            }
            x = ((x / snap) | 0) * snap;
            y = ((y / snap) | 0) * snap;
            let size: Point = as3.as(sizes[type], Point);
            let w: number = Number(size ? size.x : 20);
            let h: number = Number(size ? size.y : 20);
            let props: any = type > 0 ? GLOBAL._buildingProps[type - 1] : null;
            let name: string = as3.str(names[type] || (props && props.name ? KEYS.Get(as3.str(props.name)) : "building"));
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
        let overlaps: int = 0;
        let overlapPair: string = null;
        for (let i: int = 0; i < rects.length; i++) {
            for (let j: int = (i + 1) | 0; j < rects.length; j++) {
                if ((as3.as(rects[i], Rectangle)).intersects(as3.as(rects[j], Rectangle))) {
                    overlaps++;
                    overlapPair ||= rectNames[i] + " and " + rectNames[j];
                }
            }
        }
        let why: any[] = [];
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

    private static ioRect(node: PlannerNode): Rectangle {
        let size: number = 20;
        if (node.building && node.building._footprint && node.building._footprint[0]) {
            size = Math.max(Number(node.building._footprint[0].width), Number(node.building._footprint[0].height));
        }
        return new Rectangle(node.x, node.y, size, size);
    }

    private ioOverlapsAny(node: PlannerNode, others: any[]): boolean {
        let r: Rectangle = BasePlannerPopup.ioRect(node);
        for (let o of as3.values(others)) {
            if (r.intersects(BasePlannerPopup.ioRect(o))) {
                return true;
            }
        }
        return false;
    }

    private ioAddTools(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.toolMenu || !this.displayCanvas) {
            return;
        }
        this.toolMenu.visible = false;
        if (this.fullscreenButton) {
            this.fullscreenButton.visible = false;
        }
        let spec: any[] = null;
        if (!this._ioTools) {
            this._ioTools = new Sprite();
            this.addChild(this._ioTools);
            for (spec of as3.values(BasePlannerPopup.IO_LAYOUT.concat(BasePlannerPopup.IO_UTILITY))) {
                if (!spec) {
                    continue;
                }
                let tile: IoToolTile = new IoToolTile(as3.str(spec[0]), as3.str(spec[1]), BasePlannerPopup.ioIcon(as3.str(spec[2]), false), BasePlannerPopup.ioIcon(as3.str(spec[2]), true), true);
                tile.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioToolClick));
                tile.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.ioShowHint), [BasePlannerPopup.ioHint(as3.str(spec[0]))]));
                tile.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
                this._ioTools.addChild(tile);
                this._ioButtons[spec[0]] = tile;
            }
            this._ioFullscreen = new Sprite();
            this._ioFullscreen.addChild(new Bitmap(new frame1_button_fullscreen(0, 0)));
            this._ioFullscreen.buttonMode = true;
            this._ioFullscreen.addEventListener(MouseEvent.CLICK, GLOBAL.goFullScreen);
            this._ioFullscreen.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.ioShowHint), ["Full screen on or off."]));
            this._ioFullscreen.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHistoryTick));
        }
        // Beside the window's close X (the frame is rebuilt by each layout).
        this.mcFrame.ioAddBesideClose(this._ioFullscreen);
        let expandable: boolean = BASE.isMainYardOrInfernoMainYard && GLOBAL.yardExpansionsBought < GLOBAL.yardExpansionsMax;
        let expand: IoToolTile = as3.as(this._ioButtons["expand"], IoToolTile);
        expand.visible = expandable;

        // Tiles left to right in groups, wrapping to a new row when the plan is narrow. Expand takes
        // the right end of the first row.
        let width: int = this.displayCanvas.canvasmask.width | 0;
        let rowEnd: int = (expandable ? width - 6 - IoToolTile.W - BasePlannerPopup.IO_GROUP_GAP : width - 6) | 0;
        let x: int = 6;
        let y: int = 4;
        let pendingGap: boolean = false;
        for (spec of as3.values(BasePlannerPopup.IO_LAYOUT)) {
            if (!spec) {
                pendingGap = true;
                continue;
            }
            let t: IoToolTile = as3.as(this._ioButtons[spec[0]], IoToolTile);
            if (pendingGap && x > 6) {
                x += BasePlannerPopup.IO_GROUP_GAP;
            }
            pendingGap = false;
            if (x + IoToolTile.W > rowEnd && x > 6) {
                x = 6;
                y += 44;
                rowEnd = (width - 6) | 0;
            }
            t.x = x;
            t.y = y;
            x = (x + (IoToolTile.W + BasePlannerPopup.IO_GAP)) | 0;
        }
        expand.x = width - 6 - IoToolTile.W;
        expand.y = 4;
        this._ioBarHeight = (y + 44 + 4) | 0;

        this._ioTools.graphics.clear();
        this._ioTools.graphics.lineStyle(1, 8016950, 1);
        this._ioTools.graphics.beginFill(2364943, 0.9);
        this._ioTools.graphics.drawRect(0, 0, width, this._ioBarHeight);
        this._ioTools.graphics.endFill();
        this._ioTools.x = this.displayCanvas.x;
        this._ioTools.y = this.displayCanvas.y;

        // The zoom control sits under the toolbar instead of behind it.
        if (this.zoomMenu) {
            this.zoomMenu.y = this.displayCanvas.y + this._ioBarHeight + 8;
        }
        if (this.designView) {
            this.designView.ioStatus = as3.bind(this, this.ioSetStatus);
            this.designView.ioWallsLeft = as3.bind(this, this.ioWallsLeft);
        }
        this.ioHistoryRecord();
    }

    private static ioHint(param1: string): string {
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
    private ioShowHint(param1: Event, param2: string): void {
        if (this._ioStatusTimer) {
            this._ioStatusTimer.stop();
        }
        this.onToolTipHint(param1, param2);
    }

    /** What an action did (from the design view or a tool): shown in the tooltip for a few seconds. */
    private ioSetStatus(param1: string): void {
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
            this._ioStatusTimer.addEventListener(TimerEvent.TIMER_COMPLETE, (e: TimerEvent): void => {
                this.onToolTipHide();
            });
        }
        this._ioStatusTimer.reset();
        this._ioStatusTimer.start();
    }

    private ioToolClick(param1: MouseEvent): void {
        let id: string = (as3.as(param1.currentTarget, IoToolTile)).id;
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
                this.ioSetStatus(BasePlannerPopup.ioHint("wall") + " (" + this.ioWallsLeft() + " in storage)");
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
    private ioConfirmStoreSelection(): void {
        let count: int = this.designView.ioSelectionCount;
        GLOBAL.Message("Confirm moving " + (count == 1 ? "the selected item" : "the " + count + " selected items") + " to storage?", "Yes", (): void => {
            if (this.designView) {
                let stored: int = this.designView.ioStoreSelection();
                this.ioSetStatus(stored + (stored == 1 ? " building" : " buildings") + " moved to storage.");
            }
        }, null, "No", (): void => {
        });
    }

    private ioHighlightTools(): void {
        if (!this._ioTools || !this.designView) {
            return;
        }
        let tool: string = this.designView.currentTool;
        (as3.as(this._ioButtons["move"], IoToolTile)).active = tool == PlannerDesignView.TOOL_SELECTMOVE;
        (as3.as(this._ioButtons["store"], IoToolTile)).active = tool == PlannerDesignView.TOOL_STORE;
        (as3.as(this._ioButtons["area"], IoToolTile)).active = tool == PlannerDesignView.TOOL_AREASELECT;
        (as3.as(this._ioButtons["wall"], IoToolTile)).active = tool == PlannerDesignView.TOOL_WALLLINE;
    }

    private ioSnapshot(): any {
        let node: PlannerNode = null;
        let placed: any[] = [];
        for (node of (this._plannerTemplate.displayData ?? [])) {
            placed.push([node, node.x, node.y]);
        }
        let stored: any[] = [];
        for (node of (this._plannerTemplate.inventoryData ?? [])) {
            stored.push(node);
        }
        return { "template": this._plannerTemplate, "placed": placed, "stored": stored };
    }

    private static ioSameSnapshot(param1: any, param2: any): boolean {
        let i: int = 0;
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
    private ioHistoryChanged(): void {
        if (!this._ioRestoring) {
            this._ioHistoryPending = true;
        }
    }

    private ioHistoryTick(param1: Event): void {
        if (this._ioHistoryPending) {
            this._ioHistoryPending = false;
            this.ioHistoryRecord();
        }
    }

    private ioHistoryRecord(): void {
        if (!this._plannerTemplate || this._ioRestoring) {
            return;
        }
        let snap: any = this.ioSnapshot();
        if (this._ioHistoryAt >= 0 && this._ioHistory[this._ioHistoryAt].template != snap.template) {
            this._ioHistory = [];
            this._ioHistoryAt = -1;
        }
        if (this._ioHistoryAt >= 0 && BasePlannerPopup.ioSameSnapshot(this._ioHistory[this._ioHistoryAt], snap)) {
            this.ioHistoryButtons();
            return;
        }
        this._ioHistory.splice(this._ioHistoryAt + 1, this._ioHistory.length);
        this._ioHistory.push(snap);
        if (this._ioHistory.length > BasePlannerPopup.IO_HISTORY_MAX) {
            this._ioHistory.shift();
        }
        this._ioHistoryAt = (this._ioHistory.length - 1) | 0;
        this.ioHistoryButtons();
    }

    private ioHistoryButtons(): void {
        if (!this._ioButtons["undo"]) {
            return;
        }
        (as3.as(this._ioButtons["undo"], IoToolTile)).alpha = Number(this._ioHistoryAt > 0 ? 1 : 0.4);
        (as3.as(this._ioButtons["redo"], IoToolTile)).alpha = Number(this._ioHistoryAt < this._ioHistory.length - 1 ? 1 : 0.4);
    }

    public ioUndo(): void {
        this.ioHistoryTick(null);
        if (this._ioHistoryAt <= 0) {
            this.ioSetStatus("Nothing to undo.");
            return;
        }
        this._ioHistoryAt--;
        this.ioRestore(this._ioHistory[this._ioHistoryAt]);
        this.ioSetStatus("Undone.");
    }

    public ioRedo(): void {
        this.ioHistoryTick(null);
        if (this._ioHistoryAt >= this._ioHistory.length - 1) {
            this.ioSetStatus("Nothing to redo.");
            return;
        }
        this._ioHistoryAt++;
        this.ioRestore(this._ioHistory[this._ioHistoryAt]);
        this.ioSetStatus("Redone.");
    }

    private ioRestore(param1: any): void {
        let entry: any[] = null;
        let node: PlannerNode = null;
        if (param1.template != this._plannerTemplate || !this.designView) {
            return;
        }
        this._ioRestoring = true;
        try {
            this.designView.ioClearSelection();
            as3.vsetLength(this._plannerTemplate.displayData, 0);
            for (entry of as3.values(param1.placed)) {
                node = as3.as(entry[0], PlannerNode);
                node.x = Number(entry[1]);
                node.y = Number(entry[2]);
                this._plannerTemplate.displayData.push(node);
            }
            as3.vsetLength(this._plannerTemplate.inventoryData, 0);
            for (node of as3.values(param1.stored)) {
                this._plannerTemplate.inventoryData.push(node);
            }
            this.buildingExplorer.redraw();
            this.designView.ioRebuild();
            this.sideBarScrollBar.checkResize();
            this.changedPlannerData();
            this.onToolUpdate();
            this.hasBeenSaved = false;
        } finally {
            this._ioRestoring = false;
        }
        this.ioHistoryButtons();
    }

    /**
     * A wall still in storage, or null. Placing it takes it out of storage; one already on the plan
     * is never handed out again, so the same wall cannot be placed twice.
     */
    private ioTakeWall(): PlannerNode {
        let node: PlannerNode = null;
        for (node of (this._plannerTemplate.inventoryData ?? [])) {
            if (node.category == PlannerNode.TYPE_WALL && this._plannerTemplate.displayData.indexOf(node) == -1) {
                return node;
            }
        }
        return null;
    }

    private ioWallsLeft(): int {
        let count: int = 0;
        let node: PlannerNode = null;
        for (node of (this._plannerTemplate.inventoryData ?? [])) {
            if (node.category == PlannerNode.TYPE_WALL && this._plannerTemplate.displayData.indexOf(node) == -1) {
                count++;
            }
        }
        return count;
    }
}
