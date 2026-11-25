import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, Graphics, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { Event, KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { System } from "flash/system";
import { TextField, TextFieldAutoSize, TextFieldType, TextFormat } from "flash/text";
import { ByteArray, Dictionary, Timer } from "flash/utils";
import { BASE, Base64, BasePlanner, BasePlannerEvent, BaseTemplate, BaseTemplateNode, BasePlannerNodeEvent, BasePlannerPopup_BottomLayout, BasePlannerPopup_CLIP, BasePlannerPopup_DisplayViewContainer, BasePlannerPopup_ExplorerContainer, BasePlannerPopup_ExplorerHeader, BasePlannerPopup_ToolsLayout, BasePlannerPopup_ToolTip, BasePlannerPopup_ZoomLayout, BasePlannerTransferConfirmation, BFOUNDATION, Button, Button_CLIP, buttonFullscreenFrame_CLIP, Checkbox, frame, frame1_button_fullscreen, GLOBAL, GRID, InstanceManager, io_pt_clear_w, io_pt_clear_y, io_pt_expand_w, io_pt_expand_y, io_pt_flipx_w, io_pt_flipx_y, io_pt_flipy_w, io_pt_flipy_y, io_pt_move_w, io_pt_move_y, io_pt_redo_w, io_pt_redo_y, io_pt_rotate_w, io_pt_rotate_y, io_pt_select_w, io_pt_select_y, io_pt_store_w, io_pt_store_y, io_pt_undo_w, io_pt_undo_y, io_pt_walls_w, io_pt_walls_y, IoHotkeys, IoKit, IoPlanShare, IoQuests, IoTd, IoTextPrompt, IoToolTile, KEYS, MESSAGE, PLANNER, PlannerDesignView, PlannerExplorer, PlannerNode, PlannerTemplate, POPUPS, POPUPSETTINGS, ScrollSetV, SOUNDS, STORE } from "@game";

export class BasePlannerPopup extends Sprite {
    static {
        as3.fields(this, { mcFrame: null, displayCanvas: null, sideBar: null, sideBarScrollBar: null, sideBarHeader: null, bottomMenu: null, toolMenu: null, storeMenu: null, inventoryMenu: null, zoomMenu: null, toolTipMenu: null, buildingExplorer: null, designView: null, fullscreenButton: null, _guideMC: null, _mcFrame: null, _plannerTemplate: null, _hasBeenSaved: false, _currentTool: null, _PLANNER_SIDEBAR_WIDTH: 190, _PLANNER_BOTTOMBAR_SPACING: 60, _PLANNER_TOP_MARGIN: 10, _PLANNER_BOTTOM_MARGIN: 5, _PLANNER_RIGHT_MARGIN: 10, _PLANNER_LEFT_MARGIN: 10, _PLANNER_HEADER_MARGIN: 32, _bSave: null, _bApply: null, _bLoad: null, _bClear: null, _isTemplateApplicable: true, _confirmationPopup: null, _clearConfirmationPopup: null, _ioTools: null, _ioButtons: null, _ioFullscreen: null, _ioBarHeight: 0, _ioStatusTimer: null, _ioHistory: null, _ioHistoryAt: -1, _ioHistoryPending: false, _ioRestoring: false, _ioLegend: null, _ioKeyStage: null, _ioWallsDirty: false, _ioApplySel: null, _ioApplyAsk: null, _ioCoverLegend: null, _ioCompareLegend: null, _ioCompareLabel: null });
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

    /** Tools: [id, caption (or its key, "io_..."), icon]; null starts a new group. (QoL #692, #691 and #690: Grid, Ruler and Coverage; QoL #685 and #693: Plan ahead and Compare; 20 October: the three path estimates) */
    private static readonly IO_LAYOUT: any[] = [["undo", "io_t3m_pl_t_undo", "undo"], ["redo", "io_t3m_pl_t_redo", "redo"], null, ["move", "io_t3m_pl_t_move", "move"], ["store", "io_t3m_pl_t_store", "store"], null, ["area", "io_t3m_pl_t_select", "select"], ["deselect", "io_t3m_pl_t_clear", "clear"], null, ["wall", "io_t3m_pl_t_walls", "walls"], ["ghost", "io_plan3_ghost", "ghost"], null, ["flipx", "io_t3m_pl_t_flipx", "flipx"], ["flipy", "io_t3m_pl_t_flipy", "flipy"], ["rotate", "io_t3m_pl_t_rotate", "rotate"], null, ["grid", "io_plan_grid", "grid"], ["ruler", "io_plan_ruler", "ruler"], ["coverage", "io_plan2_coverage", "coverage"], null, ["pathtowers", "io_plan4_path_towers", "pathtowers"], ["pathloot", "io_plan4_path_loot", "pathloot"], ["pathany", "io_plan4_path_any", "pathany"], null, ["export", "io_t3m_pl_t_export", "export"], ["import", "io_t3m_pl_t_import", "import"], ["compare", "io_plan3_compare_tool", "compare"]];

    /** At the right end of the toolbar. */
    private static readonly IO_UTILITY: any[] = [["expand", "io_t3m_pl_t_expand", "expand"]];

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
    /** (QoL #689) The range circles' colours, at the top right of the plan while any are shown. */
    private _ioLegend: Sprite;
    /** (QoL #692) The stage the arrow keys are listened on. */
    private _ioKeyStage: any;
    /** (QoL #695) The walls tool's "Walls (N left)" is redone on the next frame. */
    private _ioWallsDirty: boolean;
    /** (QoL #684) "Apply selection", left of Apply. */
    private _ioApplySel: Button;
    /** (QoL #683) Apply's confirmation while it is up (the plan marks what it moves meanwhile). */
    private _ioApplyAsk: MESSAGE;
    /** (QoL #690) The coverage map's colours, under the ranges' legend while the map is on. */
    private _ioCoverLegend: Sprite;
    /** (QoL #693) What Compare shows (its colours and counts), and the plan it compares with. */
    private _ioCompareLegend: Sprite;
    private _ioCompareLabel: string;

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
            // (Inferno-only, Hellgate Defense: the run's walls may stay in storage)
            if (_loc2_ != PlannerNode.TYPE_DECORATION && _loc2_ != PlannerNode.TYPE_MISC && !(IoTd.on && _loc2_ == PlannerNode.TYPE_WALL)) {
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
            // (Inferno-only, QoL #685: the plan's planned buildings, and how many more of a kind can be planned)
            if (GLOBAL.INFERNO_ONLY) {
                this.designView.ioGhosts = this._plannerTemplate.ioGhosts;
                this.designView.ioGhostRoom = (type: int): int => IoPlanShare.GhostRoom(type, this._plannerTemplate);
            }
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
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #684: "Apply selection", lit while the Select tool has buildings selected; placed by ioLayoutBottomBar)
                this._ioApplySel = new Button_CLIP();
                this._ioApplySel.name = "ioPlan2ApplySel";
                this._ioApplySel.y = this._bApply.y;
                this._ioApplySel.height = this._bApply.height;
                this._ioApplySel.Setup(KEYS.Get("io_plan2_apply_sel"));
                this._ioApplySel.Enabled = false;
                this._ioApplySel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioOnApplySelClick));
                this._ioApplySel.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.onToolTipHint), [KEYS.Get("io_plan2_apply_sel_hint")]));
                this._ioApplySel.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
                this.bottomMenu.addChild(this._ioApplySel);
            }
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
        // (Inferno-only, QoL #558: Save, Load, a gap, Clear, and Apply on its own at the right, with Apply selection)
        this.ioLayoutBottomBar();
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
        // (21 October, bug report #91: a closed planner's, nothing left to update)
        if (!this.designView || !this.toolMenu) {
            return;
        }
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
            // (Inferno-only, QoL #689: the legend shows which colours are on)
            if (GLOBAL.INFERNO_ONLY) {
                this.ioUpdateLegend();
            }
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
                    GLOBAL.Message(KEYS.Get("io_t3m_pl_cant_apply_refused", { "v1": refused }));
                    return;
                }
                // and the yard as it will be: the plan's buildings where the plan puts them, everything else
                // where it stands (7 October, the user's: "sometimes when yard planner places it'll place a
                // building in the wrong spot and it'll overlap something")
                let clash: string = this.ioYardClash();
                if (clash) {
                    GLOBAL.Message(KEYS.Get("io_t3m_pl_cant_apply_clash", { "v1": clash }));
                    return;
                }
                // Hellgate Defense: the run's walls and towers go inside the arena, and the maze must have a way through
                if (IoTd.on) {
                    let maze: any[] = [];
                    let outside: int = 0;
                    for (let n of as3.values(this.ioLayoutNodes(true))) {
                        let size: int = n.building && n.building._footprint && n.building._footprint[0] ? n.building._footprint[0].width | 0 : (n.type == 17 ? 20 : 70);
                        maze.push([n.type, n.x, n.y, size]);
                        if ((n.type == 17 || IoTd.isTowerType(n.type)) && !IoTd.plannerLocked(n) && IoTd.planWallOutside(n.x, n.y, size)) {
                            outside++;
                        }
                    }
                    let closed: string = outside > 0 ? KEYS.Get(outside == 1 ? "io_t3m_pl_td_outside_one" : "io_t3m_pl_td_outside_n", { "v1": outside }) : IoTd.planBlocker(maze);
                    if (closed) {
                        GLOBAL.Message(KEYS.Get("io_t3m_pl_maze_bad", { "v1": closed }));
                        return;
                    }
                }
                // (QoL #683: a click first says how many buildings Apply moves, and marks them on the plan; called from
                // code, with no click, it applies at once as before)
                if (param1 != null) {
                    this.ioAskApply(false);
                    return;
                }
            }
            this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.APPLY));
        } else if (GLOBAL.INFERNO_ONLY && this.ioUnplaced().length > 0) {
            // (QoL #682: which buildings the plan doesn't place (built since it was saved, most often), and a way
            // to keep them where they stand)
            let names: any = {};
            let order: any[] = [];
            for (let node of as3.values(this.ioUnplaced())) {
                let name: string = String(node.displayName || node.name || KEYS.Get("str_building"));
                if (!names[name]) {
                    names[name] = 0;
                    order.push(name);
                }
                names[name]++;
            }
            let list: string = order.slice(0, 8).map((n: string): string => (names[n] > 1 ? names[n] + " x " : "") + n).join(", ") + (order.length > 8 ? ", ..." : "");
            GLOBAL.Message(KEYS.Get("io_planner_unplaced", { "v1": list }), KEYS.Get("io_planner_keep_where"), as3.bind(this, this.ioPlaceWhereTheyStand), null, KEYS.Get("btn_cancel"), null);
        } else {
            GLOBAL.Message(KEYS.Get("basePlanner_cantApply"));
        }
    }

    /** The buildings left in the planner's storage that Apply needs placed (not decorations, nor the misc row). */
    private ioUnplaced(): PlannerNode[] {
        let out: PlannerNode[] = [];
        for (let node of (this._plannerTemplate.inventoryData ?? [])) {
            if (node.category != PlannerNode.TYPE_DECORATION && node.category != PlannerNode.TYPE_MISC && !(IoTd.on && node.category == PlannerNode.TYPE_WALL) && node.building) {
                out.push(node);
            }
        }
        return out;
    }

    /** "Keep them where they stand": each unplaced building onto the plan at its place in the yard now. */
    private ioPlaceWhereTheyStand(): void {
        for (let node of as3.values(this.ioUnplaced())) {
            let at: Point = GRID.FromISO(node.building.x, node.building.y);
            node.x = at.x;
            node.y = at.y;
            let i: int = this._plannerTemplate.inventoryData.indexOf(node) | 0;
            if (i >= 0) {
                this._plannerTemplate.inventoryData.splice(i, 1);
            }
            this._plannerTemplate.displayData.push(node);
        }
        this.redraw();
        this.sideBarScrollBar.checkResize();
        this.changedPlannerData();
        this.zoomScrollerUpdate();
        this.designView.redrawRanges();
        this.onDesignStateChange();
    }

    protected onLoadClick(param1: MouseEvent): void {
        // (Inferno-only, QoL #491: changes not saved yet are asked about first; Load replaced them at once)
        if (GLOBAL.INFERNO_ONLY && !this._hasBeenSaved && this._ioHistoryAt > 0) {
            GLOBAL.Message(KEYS.Get("io_planner_load_ask"), KEYS.Get("io_planner_load_yes"), (): void => {
                this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.LOAD));
            }, null, KEYS.Get("io_planner_load_no"), null);
            return;
        }
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
            if (_loc3_ != PlannerNode.TYPE_MISC && !IoTd.plannerKept(as3.vget(this._plannerTemplate.displayData, _loc2_))) {
                this._plannerTemplate.inventoryData.push(as3.vget(this._plannerTemplate.displayData, _loc2_));
                this._plannerTemplate.displayData.splice(_loc2_, 1);
            }
            _loc2_--;
        }
        // (Inferno-only, QoL #685: and the planned buildings)
        if (GLOBAL.INFERNO_ONLY && this._plannerTemplate.ioGhosts) {
            this._plannerTemplate.ioGhosts.length = 0;
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
        if (!this.buildingExplorer) {
            return;
        }
        this.buildingExplorer.removeBuilding(param1);
        this.changedPlannerData();
    }

    public onDesignItemStore(param1: BasePlannerNodeEvent = null): void {
        if (!this.buildingExplorer || !this.designView) {
            return;
        }
        this.buildingExplorer.addElement(param1.node);
        this.designView.spliceDisplayData(param1.node);
        this.changedPlannerData();
    }

    public onDesignItemInvalid(param1: BasePlannerNodeEvent = null): void {
        this.buildingExplorer.clearSelections();
    }

    public changedPlannerData(): void {
        this.canApply = this.checkIfApplicable();
        // (QoL #695: "Walls (N left)" redone on the next frame)
        this._ioWallsDirty = true;
    }

    public onDesignStateChange(param1: Event = null): void {
        this.hasBeenSaved = false;
        this.ioHistoryChanged();
        GLOBAL.UpdateAFKTimer();
        // (Inferno-only, QoL #693: what differs from the plan compared with, again)
        if (GLOBAL.INFERNO_ONLY && this.designView && this.designView.ioCompareOn) {
            this.designView.ioDrawCompare();
            this.ioUpdateLegend();
        }
    }

    public Remove(): void {
        // (Inferno-only, QoL #686: the layouts' chooser goes with the planner)
        if (GLOBAL.INFERNO_ONLY) {
            IoPlanShare.HideChooser();
        }
        // (Inferno-only, QoL #692: the arrow keys stop with the planner)
        if (this._ioKeyStage) {
            this._ioKeyStage.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.ioOnKey));
            this._ioKeyStage = null;
        }
        // (QoL #683: nor Apply's confirmation)
        if (this._ioApplyAsk) {
            let ask: MESSAGE = this._ioApplyAsk;
            this.ioEndApplyAsk();
            if (ask.parent) {
                ask.Hide();
            }
        }
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
            // (Inferno-only, QoL #678: outposts save plans too)
            let can: boolean = GLOBAL.INFERNO_ONLY ? BasePlanner.canSave : !BASE.isOutpost;
            this._bSave.Enabled = can;
            this._bSave.enabled = can;
            this._bSave.mouseEnabled = can;
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
        if (param1 == "grid" || param1 == "ruler") {
            return BasePlannerPopup.ioDrawMeasureIcon(param1 == "grid", param2);
        }
        if (param1 == "coverage") {
            return BasePlannerPopup.ioDrawCoverIcon(param2);
        }
        if (param1 == "ghost" || param1 == "compare") {
            return BasePlannerPopup.ioDrawPlanIcon(param1 == "ghost", param2);
        }
        if (param1 == "pathtowers" || param1 == "pathloot" || param1 == "pathany") {
            return BasePlannerPopup.ioDrawPathIcon(param1.substr(4), param2);
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

    /** Grid's picture (a square of nine) and the Ruler's (a ruler with its marks), drawn. (QoL #692, #691) */
    private static ioDrawMeasureIcon(grid: boolean, yellow: boolean): BitmapData {
        let c: uint = (yellow ? 0xFFD24A : 0xFFFFFF) >>> 0;
        let sh: Shape = new Shape();
        let g: Graphics = sh.graphics;
        if (grid) {
            g.lineStyle(2, c, 1);
            g.drawRect(4, 4, 18, 18);
            g.lineStyle(1.5, c, 1);
            g.moveTo(10, 4);
            g.lineTo(10, 22);
            g.moveTo(16, 4);
            g.lineTo(16, 22);
            g.moveTo(4, 10);
            g.lineTo(22, 10);
            g.moveTo(4, 16);
            g.lineTo(22, 16);
        } else {
            g.lineStyle(2, c, 1);
            g.moveTo(2, 18);
            g.lineTo(18, 2);
            g.lineTo(24, 8);
            g.lineTo(8, 24);
            g.lineTo(2, 18);
            g.lineStyle(1.5, c, 1);
            for (let i: int = 1; i <= 4; i++) {
                let x: number = 2 + i * 3.2;
                let y: number = 18 - i * 3.2;
                let len: number = i % 2 == 0 ? 5 : 3;
                g.moveTo(x, y);
                g.lineTo(x + len * 0.7, y + len * 0.7);
            }
        }
        let bd: BitmapData = new BitmapData(26, 26, true, 0);
        bd.draw(as3.cast(sh, IBitmapDrawable));
        return bd;
    }

    /** The coverage map's picture (QoL #690): three overlapping rings, the middle where they overlap filled. */
    /**
     * (20 October) A path estimate's picture: a winding dotted path from a monster's dot to what it goes for, a turret
     * (towers), a coin (loot) or a star (anything).
     */
    private static ioDrawPathIcon(kind: string, yellow: boolean): BitmapData {
        let c: uint = (yellow ? 0xFFD24A : 0xFFFFFF) >>> 0;
        let sh: Shape = new Shape();
        let g: Graphics = sh.graphics;
        g.beginFill(c, 1);
        g.drawCircle(4.5, 21.5, 3);
        g.endFill();
        // the dotted path
        let pts: number[] = [8, 20, 11, 17, 11, 13, 14, 11, 17, 12];
        for (let i: int = 0; i < pts.length; i += 2) {
            g.beginFill(c, 1);
            g.drawCircle(pts[i], pts[i + 1], 1.1);
            g.endFill();
        }
        g.lineStyle(1.6, c, 1);
        if (kind == "towers") {
            g.drawRect(17, 4, 7, 10);
            g.moveTo(17, 4);
            g.lineTo(17, 2);
            g.moveTo(20.5, 4);
            g.lineTo(20.5, 2);
            g.moveTo(24, 4);
            g.lineTo(24, 2);
        } else if (kind == "loot") {
            g.drawCircle(20.5, 7.5, 5);
            g.moveTo(20.5, 4.5);
            g.lineTo(20.5, 10.5);
        } else {
            g.lineStyle(0, 0, 0);
            g.beginFill(c, 1);
            for (let i: int = 0; i < 10; i++) {
                let a: number = -Math.PI / 2 + i * Math.PI / 5;
                let r: number = i % 2 == 0 ? 6 : 2.6;
                if (i == 0) {
                    g.moveTo(20.5 + Math.cos(a) * r, 8 + Math.sin(a) * r);
                } else {
                    g.lineTo(20.5 + Math.cos(a) * r, 8 + Math.sin(a) * r);
                }
            }
            g.endFill();
        }
        let bd: BitmapData = new BitmapData(26, 26, true, 0);
        bd.draw(as3.cast(sh, IBitmapDrawable));
        return bd;
    }

    private static ioDrawCoverIcon(yellow: boolean): BitmapData {
        let c: uint = (yellow ? 0xFFD24A : 0xFFFFFF) >>> 0;
        let sh: Shape = new Shape();
        let g: Graphics = sh.graphics;
        g.beginFill(c, 0.55);
        g.drawCircle(13, 13, 3.5);
        g.endFill();
        g.lineStyle(2, c, 1);
        g.drawCircle(9, 10, 6.5);
        g.drawCircle(17, 10, 6.5);
        g.drawCircle(13, 17, 6.5);
        let bd: BitmapData = new BitmapData(26, 26, true, 0);
        bd.draw(as3.cast(sh, IBitmapDrawable));
        return bd;
    }

    /**
     * Plan ahead's picture (QoL #685: a square drawn by its corners, a plus in it) and Compare's (QoL #693: two squares,
     * one over the other).
     */
    private static ioDrawPlanIcon(ghost: boolean, yellow: boolean): BitmapData {
        let c: uint = (yellow ? 0xFFD24A : 0xFFFFFF) >>> 0;
        let sh: Shape = new Shape();
        let g: Graphics = sh.graphics;
        if (ghost) {
            g.lineStyle(2, c, 1);
            for (let corner of [[4, 4, 1, 1], [22, 4, -1, 1], [4, 22, 1, -1], [22, 22, -1, -1]]) {
                g.moveTo(corner[0] + corner[2] * 6, corner[1]);
                g.lineTo(corner[0], corner[1]);
                g.lineTo(corner[0], corner[1] + corner[3] * 6);
            }
            g.moveTo(13, 8);
            g.lineTo(13, 18);
            g.moveTo(8, 13);
            g.lineTo(18, 13);
        } else {
            g.lineStyle(2, c, 1);
            g.drawRect(3, 3, 13, 13);
            g.lineStyle(2, c, 0.6);
            g.beginFill(c, 0.25);
            g.drawRect(10, 10, 13, 13);
            g.endFill();
        }
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
            this.ioSetStatus(KEYS.Get("io_t3m_pl_export_none"));
            return;
        }
        let code: string = BasePlannerPopup.IO_LAYOUT_PREFIX + Base64.encode(JSON.stringify(rows));
        try {
            System.setClipboard(code);
        } catch (e) {
        }
        let prompt: IoTextPrompt = IoTextPrompt.Show(KEYS.Get("io_t3m_pl_export_title"), KEYS.Get("io_t3m_pl_export_body", { "v1": rows.length }), code, 0, KEYS.Get("btn_ok"), (t: string): void => {
        });
        // (Inferno-only, QoL #688: or post it in chat, as a pill that opens the planner's Import)
        if (GLOBAL.INFERNO_ONLY) {
            IoPlanShare.AddExportShare(prompt, code, this.ioPlanName(), rows.length);
        }
    }

    /** The plan's name for a shared layout: its slot's, else the yard's. */
    private ioPlanName(): string {
        let name: string = String(this._plannerTemplate && this._plannerTemplate.name ? this._plannerTemplate.name : "");
        return name || String(BASE._baseName || KEYS.Get("io_t3m_pl_layout"));
    }

    private ioImportLayout(param1: string = ""): void {
        // (Inferno-only, QoL #673 #688: a layout copied from a visit or opened from chat in the last half hour is in the box)
        let initial: string = param1;
        if (GLOBAL.INFERNO_ONLY && !initial) {
            initial = IoPlanShare.TakePending();
        }
        let prompt: IoTextPrompt = IoTextPrompt.Show(KEYS.Get("io_t3m_pl_import_title"), KEYS.Get("io_t3m_pl_import_body"), initial, 0, KEYS.Get("io_t3m_pl_t_import"), as3.bind(this, this.ioApplyLayout));
        // (QoL #686: or take one of your own: your slots, your other yards', your kits)
        if (GLOBAL.INFERNO_ONLY) {
            IoPlanShare.AddImportChooser(prompt);
        }
    }

    /** Inferno-only (QoL #688): Import's window, its box holding this code (a pill clicked in chat). */
    public ioShowImport(param1: string): void {
        if (IoTd.on) {
            this.ioSetStatus(KEYS.Get("io_t3m_pl_not_arena"));
            return;
        }
        this.ioImportLayout(param1);
    }

    /** Inferno-only (QoL #686): an Import code taken into the plan, as Import's button does. */
    public ioImportCode(param1: string): void {
        this.ioApplyLayout(param1);
    }

    /** Inferno-only: a line in the planner's status strip for a few seconds. */
    public ioSay(param1: string): void {
        this.ioSetStatus(param1);
    }

    /** Inferno-only: the plan being edited. */
    public get ioTemplate(): PlannerTemplate {
        return this._plannerTemplate;
    }

    // ---- Inferno-only (QoL #693): Compare
    /** Shows a plan over this one (rows [type, x, y, id?]), labelled as where it is from. */
    public ioStartCompare(param1: any[], param2: string): void {
        if (!this.designView || !param1 || !param1.length) {
            return;
        }
        this._ioCompareLabel = param2;
        this.designView.ioShowCompare(param1);
        let c: any = this.designView.ioCompareCounts || {};
        this.ioSetStatus(KEYS.Get("io_plan3_compare_on", { "v1": c.moved | 0, "v2": c.there | 0, "v3": c.here | 0 }));
        this.ioHighlightTools();
        this.ioUpdateLegend();
    }

    public ioStopCompare(): void {
        if (this.designView) {
            this.designView.ioClearCompare();
        }
        this._ioCompareLabel = null;
        this.ioHighlightTools();
        this.ioUpdateLegend();
    }

    // ---- Inferno-only (QoL #685): Plan ahead
    /** Plans this kind of building: each click on the plan puts one there (the tool stays until another is chosen). */
    public ioStartGhost(param1: int): void {
        if (!this.designView || IoTd.on) {
            return;
        }
        this.designView.ioStartGhost(param1);
        let props: any = GLOBAL._buildingProps[param1 - 1];
        this.ioSetStatus(KEYS.Get("io_plan3_ghost_start", { "v1": props && props.name ? KEYS.Get(String(props.name)) : "" }));
        this.onToolUpdate();
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
            GLOBAL.Message(KEYS.Get("io_t3m_pl_not_layout", { "v1": BasePlannerPopup.IO_LAYOUT_PREFIX }));
            return;
        }
        this.ioApplyRows(rows);
    }

    /**
     * Inferno-only: a layout's places ([type, x, y] rows) taken into the plan, as Import's button does: each by the
     * nearest building of its kind (QoL #687). param2: a line said before what was done (12 November: a shared outpost
     * slot saved in another outpost, BasePlanner.loadTemplateAtSlot).
     */
    public ioApplyRows(rows: any[], param2: string = ""): void {
        if (!rows || !rows.length || !this.designView) {
            return;
        }
        // a layout with buildings that overlap, or past the edge of this yard, isn't taken at all
        let refused: string = this.ioCheckLayout(rows);
        if (refused) {
            GLOBAL.Message(KEYS.Get("io_t3m_pl_cant_import", { "v1": refused }));
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
        // (Inferno-only, QoL #687: each of the layout's places gets the nearest building of its kind, those already
        // standing on it first, so Apply moves the fewest; it was the first one of its kind in the plan's list)
        let nearest: any[] = GLOBAL.INFERNO_ONLY ? this.ioMatchNearest(rows, mine) : null;
        let rowAt: int = -1;
        for (let row of as3.values(rows)) {
            rowAt++;
            if (!(as3.is(row, Array)) || row.length < 3) {
                continue;
            }
            let type: int = row[0] | 0;
            let hit: PlannerNode = null;
            if (nearest) {
                hit = as3.as(nearest[rowAt], PlannerNode);
            } else {
                for (node of as3.values(mine)) {
                    if (!used.get(node) && node.type == type) {
                        hit = node;
                        break;
                    }
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
        GLOBAL.Message(param2 + KEYS.Get("io_t3m_pl_imported", { "v1": placed }) + (missing ? KEYS.Get("io_t3m_pl_imported_missing", { "v1": missing }) : "") + (stored ? KEYS.Get("io_t3m_pl_imported_stored", { "v1": stored }) : "") + ". " + (storedBuildings != 0 ? KEYS.Get("io_t3m_pl_imported_place") : KEYS.Get("io_t3m_pl_imported_look")));
    }

    /**
     * Inferno-only (QoL #687): which of your buildings takes each of a layout's places (rows: [type, x, y]; mine: the plan's
     * buildings, placed and in its storage). For each kind of building, every pairing of a place with a building is
     * ranked by how far the building stands from the place in the yard now, and taken nearest first (a building already
     * on its place first of all: it doesn't move), each place and each building once. One put down from storage (it
     * stands nowhere yet) goes last, as it costs a building from storage. Returns, for each row, its building or null
     * (more places of that kind than buildings).
     */
    private ioMatchNearest(rows: any[], mine: any[]): any[] {
        let out: any[] = [];
        let kinds: any = {};
        let order: any[] = [];
        for (let i: int = 0; i < rows.length; i++) {
            out.push(null);
            let row: any = rows[i];
            if (!(as3.is(row, Array)) || row.length < 3) {
                continue;
            }
            let t: string = String(row[0] | 0);
            if (!kinds[t]) {
                kinds[t] = { "rows": [], "nodes": [] };
                order.push(t);
            }
            kinds[t].rows.push(i);
        }
        for (let node of as3.values(mine)) {
            let kind: any = kinds[String(node.type | 0)];
            if (kind) {
                kind.nodes.push(node);
            }
        }
        for (let t of order) {
            let kind: any = kinds[t];
            let places: any[] = kind.rows;
            let nodes: any[] = kind.nodes;
            if (!nodes.length) {
                continue;
            }
            let pairs: any[] = [];
            for (let n: int = 0; n < nodes.length; n++) {
                let b: any = nodes[n].building;
                let at: Point = b && b._id != PlannerTemplate._DECORATION_ID ? GRID.FromISO(b.x, b.y) : null;
                for (let p: int = 0; p < places.length; p++) {
                    let row: any = rows[places[p]];
                    let dx: number = at ? Number(row[1]) - at.x : 0;
                    let dy: number = at ? Number(row[2]) - at.y : 0;
                    pairs.push([at ? dx * dx + dy * dy : 1e15, p, n]);
                }
            }
            // (ties: the layout's order, then the plan's, as before)
            pairs.sort((a: any[], c: any[]): number => (a[0] - c[0]) || (a[1] - c[1]) || (a[2] - c[2]));
            let placeDone: any = {};
            let nodeDone: any = {};
            let left: int = Math.min(places.length, nodes.length) | 0;
            for (let pair of pairs) {
                if (left <= 0) {
                    break;
                }
                if (placeDone[pair[1]] || nodeDone[pair[2]]) {
                    continue;
                }
                placeDone[pair[1]] = true;
                nodeDone[pair[2]] = true;
                out[places[pair[1]]] = nodes[pair[2]];
                left--;
            }
        }
        return out;
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
            let name: string = as3.str(names[type] || (props && props.name ? KEYS.Get(as3.str(props.name)) : KEYS.Get("io_t3m_pl_building")));
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
                    overlapPair ||= KEYS.Get("io_t3m_pl_a_and_b", { "v1": rectNames[i], "v2": rectNames[j] });
                }
            }
        }
        let why: any[] = [];
        if (bad) {
            why.push(KEYS.Get(bad == 1 ? "io_t3m_pl_bad_entry_one" : "io_t3m_pl_bad_entry_n", { "v1": bad }));
        }
        if (outside) {
            why.push(KEYS.Get(outside == 1 ? "io_t3m_pl_outside_one" : "io_t3m_pl_outside_n", { "v1": outside, "v2": outsideNames.slice(0, 3).join(", ") + (outsideNames.length > 3 ? "..." : ""), "v3": GLOBAL._mapWidth, "v4": GLOBAL._mapHeight }));
        }
        if (overlaps) {
            why.push(KEYS.Get(overlaps == 1 ? "io_t3m_pl_overlap_one" : "io_t3m_pl_overlap_n", { "v1": overlaps, "v2": overlapPair + (overlaps > 1 ? ", ..." : "") }));
        }
        return why.length ? why.join("<br>") : null;
    }

    /**
     * Inferno-only (7 October): what the yard will be once the plan is applied, checked exactly (each
     * building's footprint, in the yard's own units, at any zoom): the plan's buildings where the plan puts
     * them, those placed from storage too, and everything else where it stands now: what the plan doesn't
     * move (a building it has in storage that Apply leaves where it is, one the planner doesn't show). Only
     * clashes that Apply would make are reported (two buildings already overlapping in the yard, and moved
     * by nothing, don't stop it). Null when nothing clashes, else what clashes with what, and where.
     */
    private ioYardClash(only: PlannerNode[] = null): string {
        let at: Dictionary = new Dictionary();
        let gone: Dictionary = new Dictionary();
        let boxes: any[] = [];
        let node: PlannerNode = null;
        // (QoL #684, Apply selection: only these move; everything else stays where it stands, and nothing is taken away)
        let moving: Dictionary = null;
        if (only) {
            moving = new Dictionary();
            for (node of only) {
                moving.set(node, true);
            }
        }
        for (node of (this._plannerTemplate.displayData ?? [])) {
            if (!node.building || BASE.isBuildingIgnoredInYardPlannerSave(node.building)) {
                continue;
            }
            if (moving && !moving.get(node)) {
                continue;
            }
            if (node.building._id == PlannerTemplate._DECORATION_ID) {
                // (from storage: a new one there)
                let r: Rectangle = BasePlannerPopup.ioNodeRect(node);
                boxes.push({ "name": node.name, "r": r, "moved": true, "b": null });
            } else {
                at.set(node.building, new Point(node.x, node.y));
            }
        }
        // what Apply takes away (clickedApply): decorations left in storage, the arena's walls in storage
        for (node of (moving ? [] : this._plannerTemplate.inventoryData ?? [])) {
            if (node.building && node.building._id != PlannerTemplate._DECORATION_ID && (node.category == PlannerNode.TYPE_DECORATION || IoTd.on && node.type == 17 && !IoTd.plannerLocked(node))) {
                gone.set(node.building, true);
            }
        }
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || gone.get(b) || b._type == 7 || !b._footprint || !b._footprint.length || b === GLOBAL._newBuilding) {
                continue;
            }
            let now: Point = GRID.FromISO(b.x, b.y);
            let to: Point = as3.as(at.get(b), Point) || now;
            let moved: boolean = to.x != now.x || to.y != now.y;
            let props: any = GLOBAL._buildingProps[b._type - 1];
            let name: string = props && props.name ? KEYS.Get(String(props.name)) : "building";
            for (let f of as3.values(b._footprint)) {
                if (f && f.width > 0 && f.height > 0) {
                    boxes.push({ "name": name, "r": new Rectangle(to.x + f.x, to.y + f.y, f.width, f.height), "moved": moved, "b": b });
                }
            }
        }
        // (sorted by left edge: each box is only tried against those starting before its right edge)
        as3.sort(boxes, (a: any, c: any): int => {
            return as3.cast(a.r, Rectangle).x < as3.cast(c.r, Rectangle).x ? -1 : (as3.cast(a.r, Rectangle).x > as3.cast(c.r, Rectangle).x ? 1 : 0);
        });
        let n: int = boxes.length;
        for (let i: int = 0; i < n; i++) {
            let a: any = boxes[i];
            let ra: Rectangle = as3.cast(a.r, Rectangle);
            for (let j: int = (i + 1) | 0; j < n; j++) {
                let c: any = boxes[j];
                let rc: Rectangle = as3.cast(c.r, Rectangle);
                if (rc.x >= ra.right) {
                    break;
                }
                if ((a.moved || c.moved) && (a.b == null || a.b != c.b) && ra.intersects(rc)) {
                    let mover: any = a.moved ? a : c;
                    let other: any = mover === a ? c : a;
                    let fixed: boolean = other.b != null && at.get(other.b) == null;
                    return KEYS.Get(fixed ? "io_t3m_pl_clash_fixed" : "io_t3m_pl_clash", { "v1": mover.name, "v2": other.name });
                }
            }
        }
        return null;
    }

    /** A plan node's square: its building's footprint, or (a decoration from storage) its size. */
    private static ioNodeRect(node: PlannerNode): Rectangle {
        let w: number = 20;
        let h: number = 20;
        if (node.building && node.building._footprint && node.building._footprint[0]) {
            w = Number(node.building._footprint[0].width);
            h = Number(node.building._footprint[0].height);
        } else if (node.props && node.props.size) {
            w = h = Number(node.props.size);
        }
        return new Rectangle(node.x, node.y, w, h);
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
                let caption: string = as3.str(spec[1]);
                let keyed: boolean = caption.indexOf("io_") == 0;
                if (keyed) {
                    caption = KEYS.Get(caption);
                }
                let tile: IoToolTile = new IoToolTile(as3.str(spec[0]), caption, BasePlannerPopup.ioIcon(as3.str(spec[2]), false), BasePlannerPopup.ioIcon(as3.str(spec[2]), true), true);
                if (keyed) {
                    // (a translated caption made smaller if it's longer than the tile)
                    tile.setCaption(caption);
                }
                // (QoL #692, #691, #695: names a test can find)
                if (spec[0] == "grid") {
                    tile.name = "ioPlanGrid";
                } else if (spec[0] == "ruler") {
                    tile.name = "ioPlanRuler";
                } else if (spec[0] == "wall") {
                    tile.name = "ioPlanWalls";
                } else if (spec[0] == "coverage") {
                    // (QoL #690)
                    tile.name = "ioPlan2Coverage";
                } else if (spec[0] == "ghost") {
                    // (QoL #685)
                    tile.name = "ioPlan3Ghost";
                } else if (spec[0] == "compare") {
                    // (QoL #693)
                    tile.name = "ioPlan3Compare";
                } else if (spec[0] == "pathtowers" || spec[0] == "pathloot" || spec[0] == "pathany") {
                    // (20 October: the path estimates)
                    tile.name = "ioPlan4Path" + as3.str(spec[0]).substr(4);
                }
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
            this._ioFullscreen.addEventListener(MouseEvent.ROLL_OVER, this.onToolTipMouseHint(as3.bind(this, this.ioShowHint), [KEYS.Get("io_t3m_pl_h_fullscreen")]));
            this._ioFullscreen.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onToolTipHide));
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHistoryTick));
            // (QoL #692: the arrow keys move the selection one cell)
            this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.ioOnStage));
            // (QoL #689: the range circles' colours)
            this._ioLegend = this.ioMakeLegend();
            // (QoL #690: the coverage map's colours)
            this._ioCoverLegend = this.ioMakeCoverLegend();
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
        // (the UI kit's obsidian panel, 11 October; drawn when the bar is laid out, as it is on every resize)
        if (!IoKit.panel(this._ioTools.graphics, 0, 0, width, this._ioBarHeight)) {
            this._ioTools.graphics.lineStyle(1, 8016950, 1);
            this._ioTools.graphics.beginFill(2364943, 0.9);
            this._ioTools.graphics.drawRect(0, 0, width, this._ioBarHeight);
            this._ioTools.graphics.endFill();
        }
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
        // (QoL #689: the legend at the top right of the plan, under the toolbar: the zoom is at the left, and the
        // messages along the bottom can be wide)
        this.addChild(this._ioLegend);
        this._ioLegend.x = this.displayCanvas.x + width - this._ioLegend.width - 8;
        this._ioLegend.y = this.displayCanvas.y + this._ioBarHeight + 8;
        // (QoL #690: the coverage map's under it; placed by ioUpdateLegend)
        this.addChild(this._ioCoverLegend);
        this.ioUpdateLegend();
        this.ioRefreshWallsCaption();
        this.ioHistoryRecord();
    }

    // ---- Inferno-only (QoL #558, #684): the bottom bar
    /** The buttons' widths in the bar (the stock ones', and Apply selection's), and the gaps between them. */
    private static readonly IO_BAR_BUTTON: int = 70;

    private static readonly IO_BAR_SELECT: int = 84;

    /**
     * Save, Load, a gap, Clear, a gap, then Apply selection and Apply at the right end (where Apply was). The stock bar had
     * Clear, Save, Load, Apply side by side right of the check boxes; the row is longer now, so the bar (its check boxes
     * too) moves left as far as it needs to, never past the plan's left edge; on a narrow window the gaps, then the
     * buttons, get smaller first.
     */
    private ioLayoutBottomBar(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.bottomMenu || !this._bSave || !this._bLoad || !this._bClear || !this._bApply || !this._ioApplySel || !this.displayCanvas) {
            return;
        }
        // (the bar's own layout: the check boxes in 10 to 200, the buttons ending at 500, the plan's right edge)
        let right: number = 500;
        let boxRight: number = 206;
        let room: number = Math.max(0, this.bottomMenu.x + 10 - (this.displayCanvas.x + 4));
        let small: number = 4;
        let big: number = 18;
        let w: number = BasePlannerPopup.IO_BAR_BUTTON;
        let wSel: number = BasePlannerPopup.IO_BAR_SELECT;
        let avail: number = right - (boxRight - room);
        while (4 * w + wSel + 2 * small + 2 * big > avail && big > 6) {
            big -= 2;
        }
        if (4 * w + wSel + 2 * small + 2 * big > avail) {
            let k: number = Math.max(0.7, (avail - 2 * small - 2 * big) / (4 * w + wSel));
            w = Math.floor(w * k);
            wSel = Math.floor(wSel * k);
        }
        // right to left: Apply, Apply selection, (gap) Clear, (gap) Load, Save
        let row: any[] = [[this._bApply, w, small], [this._ioApplySel, wSel, big], [this._bClear, w, big], [this._bLoad, w, small], [this._bSave, w, 0]];
        let x: number = right;
        for (let spec of row) {
            x -= Number(spec[1]);
            spec.push(x);
            x -= Number(spec[2]);
        }
        let shift: number = Math.min(room, Math.max(0, boxRight - x));
        this.bottomMenu.x -= shift;
        for (let spec of row) {
            let b: Button = as3.as(spec[0], Button);
            b.width = Number(spec[1]);
            b.x = Number(spec[3]) + shift;
            // (the label fitted again for the width)
            if (b.label) {
                b.Setup(b.label);
            }
        }
    }

    /** (QoL #684) Whether Apply selection can go: buildings selected (Select's box), and not in the arena. */
    private ioCanApplySelection(): boolean {
        return GLOBAL.INFERNO_ONLY && !IoTd.on && this.designView != null && this.designView.ioSelectionCount > 0;
    }

    private ioOnApplySelClick(param1: MouseEvent = null): void {
        if (!this.ioCanApplySelection()) {
            this.ioSetStatus(KEYS.Get(IoTd.on ? "io_plan2_apply_sel_arena" : "io_plan2_apply_sel_none"));
            return;
        }
        this.ioAskApply(true);
    }

    // ---- Inferno-only (QoL #683, #684): what Apply moves, asked first; and Apply selection
    /**
     * What Apply moves: `moves`, [node, where it stands now] for each building the plan puts somewhere else; `storage`,
     * [node, null] for each it puts down from storage; `stay`, how many stay where they are. param1: only these (Apply
     * selection), or null: the whole plan.
     */
    public ioApplyMoves(param1: PlannerNode[] = null): any {
        let moves: any[] = [];
        let storage: any[] = [];
        let stay: int = 0;
        let list: any = param1 ? param1 : this._plannerTemplate.displayData;
        for (let node of (list ?? [])) {
            if (!node || !node.building || BASE.isBuildingIgnoredInYardPlannerSave(node.building)) {
                continue;
            }
            if (node.building._id == PlannerTemplate._DECORATION_ID) {
                storage.push([node, null]);
                continue;
            }
            let now: Point = GRID.FromISO(node.building.x, node.building.y);
            if ((now.x | 0) != (node.x | 0) || (now.y | 0) != (node.y | 0)) {
                moves.push([node, now]);
            } else {
                stay++;
            }
        }
        return { "moves": moves, "storage": storage, "stay": stay };
    }

    /** The selection Apply selection moves: its buildings in the yard (one put down from storage waits for Apply). */
    private ioSelectionToApply(): PlannerNode[] {
        let out: PlannerNode[] = [];
        if (!this.designView) {
            return out;
        }
        for (let node of this.designView.ioSelectedNodes()) {
            if (node.building && !BASE.isBuildingIgnoredInYardPlannerSave(node.building) && node.building._id != PlannerTemplate._DECORATION_ID && !IoTd.plannerLocked(node)) {
                out.push(node);
            }
        }
        return out;
    }

    /**
     * Apply's confirmation: "38 move · 212 stay" (Apply selection: how many of the selection move), and while it is up
     * the plan marks each building that moves (PlannerDesignView.ioShowMovers). Its Apply goes ahead; Cancel, Esc or
     * the X take the marks away. param1: Apply selection.
     */
    public ioAskApply(param1: boolean): void {
        if (!this.designView) {
            return;
        }
        this.ioEndApplyAsk();
        let text: string = null;
        let m: any = null;
        if (param1) {
            let picked: PlannerNode[] = this.ioSelectionToApply();
            let waiting: int = (this.designView.ioSelectedNodes().length - picked.length) | 0;
            m = this.ioApplyMoves(picked);
            if (m.moves.length == 0) {
                this.ioSetStatus(KEYS.Get(picked.length ? "io_plan2_apply_sel_still" : "io_plan2_apply_sel_none"));
                return;
            }
            text = KEYS.Get("io_plan2_apply_sel_ask", { "v1": m.moves.length, "v2": picked.length });
            if (waiting > 0) {
                text += "<br><br>" + KEYS.Get("io_plan2_apply_sel_waiting", { "v1": waiting });
            }
        } else {
            m = this.ioApplyMoves(null);
            text = KEYS.Get("io_plan2_apply_ask", { "v1": m.moves.length, "v2": m.stay });
            if (m.storage.length > 0) {
                text += "<br><br>" + KEYS.Get("io_plan2_apply_storage", { "v1": m.storage.length });
            }
        }
        this.designView.ioShowMovers(param1 ? m.moves : m.moves.concat(m.storage));
        this._ioApplyAsk = GLOBAL.Message(text, KEYS.Get(param1 ? "io_plan2_apply_sel" : "basePlanner_btnApply"), (): void => {
            this.ioEndApplyAsk();
            if (param1) {
                this.ioApplySelection();
            } else {
                this.dispatchEvent(new BasePlannerEvent(BasePlannerEvent.APPLY));
            }
        }, null, KEYS.Get("btn_cancel"), (): void => {
            this.ioEndApplyAsk();
        });
        if (this._ioApplyAsk) {
            this._ioApplyAsk.name = "ioPlan2ApplyAsk";
        }
    }

    /** Apply's confirmation gone (answered or closed): the marks go too. */
    private ioEndApplyAsk(): void {
        this._ioApplyAsk = null;
        if (this.designView) {
            this.designView.ioClearMovers();
        }
    }

    /** (QoL #683) Apply's confirmation is up (a test can answer it with ioApplyAsk.Action(null) / Action2(null)). */
    public get ioApplyAsk(): MESSAGE {
        return this._ioApplyAsk;
    }

    /**
     * (QoL #684) Apply selection: only the selected buildings go to their places on the plan; everything else stays where
     * it stands, and the planner stays open with the rest of the plan. Checked as Apply is (inside the yard, apart, and
     * not onto a building that stays), and undone with the line's Undo for a minute. True when it was applied.
     */
    public ioApplySelection(): boolean {
        if (!this.ioCanApplySelection()) {
            return false;
        }
        let nodes: PlannerNode[] = this.ioSelectionToApply();
        if (!nodes.length) {
            this.ioSetStatus(KEYS.Get("io_plan2_apply_sel_none"));
            return false;
        }
        let rows: any[] = [];
        for (let node of nodes) {
            rows.push([node.type, node.x, node.y]);
        }
        let refused: string = this.ioCheckLayout(rows) || this.ioYardClash(nodes);
        if (refused) {
            GLOBAL.Message(KEYS.Get("io_plan2_apply_sel_refused") + "<br><br>" + refused);
            return false;
        }
        let before: BaseTemplate = BASE.getTemplate();
        let applied: BaseTemplate = new BaseTemplate(this._plannerTemplate.name);
        for (let node of nodes) {
            applied.addNode(new BaseTemplateNode(node.x | 0, node.y | 0, node.id >>> 0, node.type >>> 0));
        }
        BASE.applyTemplate(applied);
        SOUNDS.Play("buildingplace");
        // (the line lower down than Apply's: the planner is still open, its toolbar at the top)
        BasePlanner.ioApplied(before, applied, true, GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - 190);
        IoQuests.event("planner_apply");
        this.designView.redrawRanges();
        return true;
    }

    // ---- Inferno-only (QoL #689): range circles in colours, and their legend
    /** The legend: a dot of each colour and what it is (the check boxes' own words), dimmed while that kind is off. */
    private ioMakeLegend(): Sprite {
        let legend: Sprite = new Sprite();
        legend.name = "ioPlanLegend";
        legend.mouseEnabled = false;
        legend.mouseChildren = false;
        let rows: any[] = [[PlannerDesignView.IO_RANGE_GROUND, "basePlanner_groundrange", PlannerDesignView.CHECKBOX_GROUND], [PlannerDesignView.IO_RANGE_AIR, "basePlanner_aerialrange", PlannerDesignView.CHECKBOX_AIR], [PlannerDesignView.IO_RANGE_TRAP, "basePlanner_minerange", PlannerDesignView.CHECKBOX_TRAP]];
        let title: TextField = new TextField();
        title.selectable = false;
        title.mouseEnabled = false;
        title.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFD24A, true);
        title.autoSize = TextFieldAutoSize.LEFT;
        title.text = KEYS.Get("io_plan_legend");
        title.x = 8;
        title.y = 4;
        legend.addChild(title);
        let w: number = title.width + 16;
        let y: number = 22;
        for (let row of as3.values(rows)) {
            let line: Sprite = new Sprite();
            line.name = "ioPlanLegend" + row[2];
            line.graphics.lineStyle(2, row[0] >>> 0, 1);
            line.graphics.beginFill(row[0] >>> 0, 0.35);
            line.graphics.drawCircle(6, 7, 5);
            line.graphics.endFill();
            let label: TextField = new TextField();
            label.selectable = false;
            label.mouseEnabled = false;
            label.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFF4E0, false);
            label.autoSize = TextFieldAutoSize.LEFT;
            label.htmlText = KEYS.Get(as3.str(row[1]));
            label.text = label.text.replace(/\s+/g, " ");
            label.x = 16;
            label.y = -1;
            line.addChild(label);
            line.x = 8;
            line.y = y;
            legend.addChild(line);
            w = Math.max(w, 8 + 16 + label.width + 10);
            y += 17;
        }
        legend.graphics.lineStyle(1, 0xFFB35A, 0.9);
        legend.graphics.beginFill(0x2A0E04, 0.85);
        legend.graphics.drawRoundRect(0, 0, Math.ceil(w), Math.ceil(y + 4), 10);
        legend.graphics.endFill();
        return legend;
    }

    /** Shown while any kind of range is on; a kind that is off is dimmed. */
    private ioUpdateLegend(): void {
        if (!this._ioLegend || !this.designView) {
            return;
        }
        let flags: uint = this.designView.ioRangeFlags;
        this._ioLegend.visible = flags != 0;
        for (let kind: int = 0; kind < 3; kind++) {
            let line: any = this._ioLegend.getChildByName("ioPlanLegend" + kind);
            if (line) {
                line.alpha = Number((flags & (1 << kind)) != 0 ? 1 : 0.4);
            }
        }
        // (QoL #690: the coverage map's legend, under the ranges' one when that shows, while the map is on)
        if (this._ioCoverLegend && this.displayCanvas) {
            this._ioCoverLegend.visible = this.designView.ioCoverageOn;
            this._ioCoverLegend.x = this.displayCanvas.x + this.displayCanvas.canvasmask.width - this._ioCoverLegend.width - 8;
            this._ioCoverLegend.y = this._ioLegend.visible ? this._ioLegend.y + this._ioLegend.height + 6 : this._ioLegend.y;
        }
        // (QoL #693: Compare's colours and counts, under the others)
        this.ioUpdateCompareLegend();
    }

    /** (QoL #693) "Compared with: Slot 3 · Name", then each colour with how many: built while Compare is on. */
    private ioUpdateCompareLegend(): void {
        if (this._ioCompareLegend && this._ioCompareLegend.parent) {
            this._ioCompareLegend.parent.removeChild(this._ioCompareLegend);
        }
        this._ioCompareLegend = null;
        if (!this.designView || !this.designView.ioCompareOn || !this.displayCanvas || !this._ioLegend) {
            return;
        }
        let c: any = this.designView.ioCompareCounts || {};
        let legend: Sprite = new Sprite();
        legend.name = "ioPlan3CompareLegend";
        legend.mouseEnabled = false;
        legend.mouseChildren = false;
        let title: TextField = new TextField();
        title.selectable = false;
        title.mouseEnabled = false;
        title.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFD24A, true);
        title.autoSize = TextFieldAutoSize.LEFT;
        title.text = KEYS.Get("io_plan3_compare_with", { "v1": String(this._ioCompareLabel || "") });
        title.x = 8;
        title.y = 4;
        legend.addChild(title);
        let w: number = title.width + 16;
        let y: number = 22;
        let rows: any[] = [[PlannerDesignView.IO_CMP_MOVED, "io_plan3_cmp_moved", c.moved], [PlannerDesignView.IO_CMP_THERE, "io_plan3_cmp_there", c.there], [PlannerDesignView.IO_CMP_HERE, "io_plan3_cmp_here", c.here], [0xFFFFFF, "io_plan3_cmp_same", c.same]];
        for (let row of rows) {
            let line: Sprite = new Sprite();
            line.graphics.lineStyle(2, row[0] >>> 0, 1);
            line.graphics.beginFill(0xFFFFFF, 0.25);
            line.graphics.drawRect(1, 2, 11, 11);
            line.graphics.endFill();
            let label: TextField = new TextField();
            label.selectable = false;
            label.mouseEnabled = false;
            label.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFF4E0, false);
            label.autoSize = TextFieldAutoSize.LEFT;
            label.text = KEYS.Get(String(row[1]), { "v1": row[2] | 0 });
            label.x = 16;
            label.y = -1;
            line.addChild(label);
            line.x = 8;
            line.y = y;
            legend.addChild(line);
            w = Math.max(w, 8 + 16 + label.width + 10);
            y += 17;
        }
        legend.graphics.lineStyle(1, 0xFFB35A, 0.9);
        legend.graphics.beginFill(0x2A0E04, 0.85);
        legend.graphics.drawRoundRect(0, 0, Math.ceil(w), Math.ceil(y + 4), 10);
        legend.graphics.endFill();
        let below: number = this._ioLegend.y;
        if (this._ioLegend.visible) {
            below = this._ioLegend.y + this._ioLegend.height + 6;
        }
        if (this._ioCoverLegend && this._ioCoverLegend.visible) {
            below = this._ioCoverLegend.y + this._ioCoverLegend.height + 6;
        }
        legend.x = this.displayCanvas.x + this.displayCanvas.canvasmask.width - legend.width - 8;
        legend.y = below;
        this.addChild(legend);
        this._ioCompareLegend = legend;
    }

    /** (QoL #690) The coverage map's legend: a square of each shading (1, 2, 3, 4+ towers) and the outline of a building none reaches. */
    private ioMakeCoverLegend(): Sprite {
        let legend: Sprite = new Sprite();
        legend.name = "ioPlan2CoverLegend";
        legend.mouseEnabled = false;
        legend.mouseChildren = false;
        let title: TextField = new TextField();
        title.selectable = false;
        title.mouseEnabled = false;
        title.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFD24A, true);
        title.autoSize = TextFieldAutoSize.LEFT;
        title.text = KEYS.Get("io_plan2_cover_legend");
        title.x = 8;
        title.y = 4;
        legend.addChild(title);
        let x: number = 8;
        let fills: any[] = PlannerDesignView.IO_COVER_FILLS;
        let swatches: Sprite = new Sprite();
        legend.addChild(swatches);
        for (let i: int = 0; i < fills.length; i++) {
            swatches.graphics.lineStyle(1, 0x000000, 0.5);
            swatches.graphics.beginFill(fills[i] >>> 0, 0.85);
            swatches.graphics.drawRect(x, 24, 12, 12);
            swatches.graphics.endFill();
            let n: TextField = new TextField();
            n.selectable = false;
            n.mouseEnabled = false;
            n.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFF4E0, false);
            n.autoSize = TextFieldAutoSize.LEFT;
            n.text = i == fills.length - 1 ? (i + 1) + "+" : String(i + 1);
            n.x = x + 13;
            n.y = 22;
            legend.addChild(n);
            x += 13 + n.width + 6;
        }
        let none: TextField = new TextField();
        none.selectable = false;
        none.mouseEnabled = false;
        none.defaultTextFormat = new TextFormat("Verdana", 10, 0xFFF4E0, false);
        none.autoSize = TextFieldAutoSize.LEFT;
        none.text = KEYS.Get("io_plan2_cover_none");
        none.x = 24;
        none.y = 39;
        legend.addChild(none);
        let w: number = Math.max(title.width + 16, x + 2, 24 + none.width + 10);
        swatches.graphics.lineStyle(2, PlannerDesignView.IO_UNCOVERED, 1);
        swatches.graphics.drawRect(9, 42, 11, 11);
        legend.graphics.lineStyle(1, 0xFFB35A, 0.9);
        legend.graphics.beginFill(0x2A0E04, 0.85);
        legend.graphics.drawRoundRect(0, 0, Math.ceil(w), 60, 10);
        legend.graphics.endFill();
        return legend;
    }

    // ---- Inferno-only (QoL #692): the arrow keys move the selection one cell
    private ioOnStage(param1: Event = null): void {
        if (this.stage && this._ioKeyStage != this.stage) {
            if (this._ioKeyStage) {
                this._ioKeyStage.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.ioOnKey));
            }
            this._ioKeyStage = this.stage;
            this._ioKeyStage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.ioOnKey));
        }
    }

    /** An arrow key: the selection one cell that way. Not while typing, nor with a message or window over the plan. */
    public ioOnKey(param1: KeyboardEvent): void {
        if (!GLOBAL.INFERNO_ONLY || !this.designView || !this.stage || !this.parent) {
            return;
        }
        if (param1.ctrlKey || param1.altKey || (param1 as any).metaKey) {
            return;
        }
        let focus: any = this.stage.focus;
        if (focus instanceof TextField && (focus as TextField).type == TextFieldType.INPUT) {
            return;
        }
        let dx: int = 0;
        let dy: int = 0;
        switch (param1.keyCode | 0) {
            case 37:
                dx = -1;
                break;
            case 39:
                dx = 1;
                break;
            case 38:
                dy = -1;
                break;
            case 40:
                dy = 1;
                break;
            default:
                return;
        }
        if (!this.ioKeysFree()) {
            return;
        }
        this.designView.ioNudge(dx, dy);
    }

    /** Nothing over the plan: no message, prompt, Save / Load window or confirmation, nor the Store. */
    private ioKeysFree(): boolean {
        if (this._confirmationPopup || this._clearConfirmationPopup || STORE._open || IoHotkeys.messageUp()) {
            return false;
        }
        if (PLANNER.basePlanner && PLANNER.basePlanner.ioTransferOpen) {
            return false;
        }
        let top: any = GLOBAL._layerTop;
        for (let i: int = 0; top && i < top.numChildren; i++) {
            let d: any = top.getChildAt(i);
            if (d && d.visible && (d instanceof IoTextPrompt || d instanceof MESSAGE || d.name == "ioPlan3Window")) {
                return false;
            }
        }
        return true;
    }

    // ---- Inferno-only (QoL #695): the walls tool says how many more walls can go on the plan
    /** "Walls (N left)": the walls the player has (on the plan and in its storage) less those on the plan. */
    private ioRefreshWallsCaption(): void {
        this._ioWallsDirty = false;
        let tile: IoToolTile = as3.as(this._ioButtons ? this._ioButtons["wall"] : null, IoToolTile);
        if (!tile || !this._plannerTemplate) {
            return;
        }
        tile.setCaption(KEYS.Get("io_plan_walls_left", { "v1": this.ioWallsLeft() }), (IoToolTile.W + BasePlannerPopup.IO_GROUP_GAP * 2 - 4) | 0);
    }

    private static ioHint(param1: string): string {
        switch (param1) {
            case "undo":
                return KEYS.Get("io_t3m_pl_h_undo");
            case "redo":
                return KEYS.Get("io_t3m_pl_h_redo");
            case "move":
                return KEYS.Get("io_t3m_pl_h_move");
            case "store":
                return KEYS.Get("io_t3m_pl_h_store");
            case "area":
                return KEYS.Get("io_t3m_pl_h_select");
            case "wall":
                // (QoL #695: Shift-drag erases, Alt-drag draws a box)
                return KEYS.Get("io_plan_walls_hint");
            case "grid":
                // (QoL #692)
                return KEYS.Get("io_plan_grid_hint");
            case "ruler":
                // (QoL #691)
                return KEYS.Get("io_plan_ruler_hint");
            case "coverage":
                // (QoL #690)
                return KEYS.Get("io_plan2_coverage_hint");
            case "ghost":
                // (QoL #685)
                return KEYS.Get("io_plan3_ghost_hint");
            case "compare":
                // (QoL #693)
                return KEYS.Get("io_plan3_compare_hint");
            case "pathtowers":
            case "pathloot":
            case "pathany":
                // (20 October)
                return KEYS.Get("io_plan4_path_" + param1.substr(4) + "_hint");
            case "deselect":
                return KEYS.Get("io_t3m_pl_h_clear");
            case "flipx":
                return KEYS.Get("io_t3m_pl_h_flipx");
            case "flipy":
                return KEYS.Get("io_t3m_pl_h_flipy");
            case "rotate":
                return KEYS.Get("io_t3m_pl_h_rotate");
            case "expand":
                return KEYS.Get("io_t3m_pl_h_expand");
            case "export":
                return KEYS.Get("io_t3m_pl_h_export");
            case "import":
                return KEYS.Get("io_t3m_pl_h_import");
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
        // Inferno-only (Hellgate Defense): no other yard's layout, and no yard expansions, in the arena
        if (IoTd.on && (id == "export" || id == "import" || id == "expand" || id == "ghost" || id == "compare")) {
            this.ioSetStatus(KEYS.Get("io_t3m_pl_not_arena"));
            return;
        }
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
                this.ioSetStatus(BasePlannerPopup.ioHint("wall") + KEYS.Get("io_t3m_pl_in_storage", { "v1": this.ioWallsLeft() }));
                this.ioRefreshWallsCaption();
                this.onToolUpdate();
                return;
            case "deselect":
                this.designView.ioClearSelection();
                this.ioSetStatus(KEYS.Get("io_t3m_pl_sel_cleared"));
                return;
            case "grid":
                // (QoL #692: the grid shown, and a building moved snaps to the edges near it)
                this.designView.ioSetGrid(!this.designView.ioGridOn);
                this.ioSetStatus(KEYS.Get(this.designView.ioGridOn ? "io_plan_grid_on" : "io_plan_grid_off"));
                this.ioHighlightTools();
                return;
            case "ruler":
                // (QoL #691: while on, a drag on empty ground measures in cells instead of moving the view)
                this.designView.ioSetRuler(!this.designView.ioRulerOn);
                this.ioSetStatus(KEYS.Get(this.designView.ioRulerOn ? "io_plan_ruler_on" : "io_plan_ruler_off"));
                this.ioHighlightTools();
                return;
            case "coverage":
                // (QoL #690: the ground shaded by how many towers reach it, and the buildings none reaches outlined)
                this.designView.ioSetCoverage(!this.designView.ioCoverageOn);
                this.ioSetStatus(this.designView.ioCoverageOn ? KEYS.Get("io_plan2_coverage_on", { "v1": this.designView.ioUncoveredCount }) : KEYS.Get("io_plan2_coverage_off"));
                this.ioHighlightTools();
                this.ioUpdateLegend();
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
            case "ghost":
                // (QoL #685: the kinds that can be planned; again while planning: back to Move)
                if (this.designView.currentTool == PlannerDesignView.TOOL_IOGHOST) {
                    this.designView.setTool(PlannerDesignView.TOOL_SELECTMOVE);
                    this.ioSetStatus(KEYS.Get("io_plan3_ghost_stop"));
                    this.onToolUpdate();
                    return;
                }
                IoPlanShare.ShowGhostChooser();
                return;
            case "pathtowers":
            case "pathloot":
            case "pathany":
                // (20 October: a path estimate's monster to set down; again while setting it down: back to Move)
                if (this.designView.ioPathKind == id.substr(4)) {
                    this.designView.ioSetPathTool(null);
                    this.ioSetStatus(KEYS.Get("io_plan4_path_stop"));
                } else {
                    this.designView.ioSetPathTool(id.substr(4));
                    this.ioSetStatus(BasePlannerPopup.ioHint(id));
                }
                this.ioHighlightTools();
                this.onToolUpdate();
                return;
            case "compare":
                // (QoL #693: a plan to compare with; again: the comparison goes)
                if (this.designView.ioCompareOn) {
                    this.ioStopCompare();
                    this.ioSetStatus(KEYS.Get("io_plan3_compare_off"));
                    return;
                }
                IoPlanShare.ShowChooser("compare");
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
        GLOBAL.Message(KEYS.Get(count == 1 ? "io_t3m_pl_confirm_store_one" : "io_t3m_pl_confirm_store_n", { "v1": count }), KEYS.Get("btn_yes"), (): void => {
            if (this.designView) {
                let stored: int = this.designView.ioStoreSelection();
                this.ioSetStatus(KEYS.Get(stored == 1 ? "io_t3m_pl_stored_one" : "io_t3m_pl_stored_n", { "v1": stored }));
            }
        }, null, KEYS.Get("btn_no"), (): void => {
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
        // (QoL #692, #691: the Grid and Ruler toggles lit while on)
        if (this._ioButtons["grid"]) {
            (as3.as(this._ioButtons["grid"], IoToolTile)).active = this.designView.ioGridOn;
        }
        if (this._ioButtons["ruler"]) {
            (as3.as(this._ioButtons["ruler"], IoToolTile)).active = this.designView.ioRulerOn;
        }
        // (QoL #690)
        if (this._ioButtons["coverage"]) {
            (as3.as(this._ioButtons["coverage"], IoToolTile)).active = this.designView.ioCoverageOn;
        }
        // (QoL #685, #693)
        if (this._ioButtons["ghost"]) {
            (as3.as(this._ioButtons["ghost"], IoToolTile)).active = tool == PlannerDesignView.TOOL_IOGHOST;
        }
        if (this._ioButtons["compare"]) {
            (as3.as(this._ioButtons["compare"], IoToolTile)).active = this.designView.ioCompareOn;
        }
        // (20 October: the path estimate being set down)
        for (let kind of ["towers", "loot", "any"]) {
            if (this._ioButtons["path" + kind]) {
                (as3.as(this._ioButtons["path" + kind], IoToolTile)).active = this.designView.ioPathKind == kind;
            }
        }
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
        // (Inferno-only, QoL #685: the planned buildings too, so Undo takes one away)
        let ghosts: any[] = [];
        for (let g of (this._plannerTemplate.ioGhosts ?? [])) {
            ghosts.push([g.type | 0, g.x | 0, g.y | 0]);
        }
        return { "template": this._plannerTemplate, "placed": placed, "stored": stored, "ghosts": ghosts };
    }

    private static ioSameSnapshot(param1: any, param2: any): boolean {
        let i: int = 0;
        if (param1.template != param2.template || param1.placed.length != param2.placed.length || param1.stored.length != param2.stored.length) {
            return false;
        }
        if (String(param1.ghosts || "") != String(param2.ghosts || "")) {
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
        if (this._ioWallsDirty) {
            this.ioRefreshWallsCaption();
        }
        // (QoL #684: Apply selection lit while there is a selection; QoL #683: Apply's marks gone with its confirmation)
        if (this._ioApplySel) {
            this._ioApplySel.Enabled = this.ioCanApplySelection();
        }
        if (this._ioApplyAsk && !this._ioApplyAsk.parent) {
            this.ioEndApplyAsk();
        }
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
            this.ioSetStatus(KEYS.Get("io_t3m_pl_nothing_undo"));
            return;
        }
        this._ioHistoryAt--;
        this.ioRestore(this._ioHistory[this._ioHistoryAt]);
        this.ioSetStatus(KEYS.Get("io_t3m_pl_undone"));
    }

    public ioRedo(): void {
        this.ioHistoryTick(null);
        if (this._ioHistoryAt >= this._ioHistory.length - 1) {
            this.ioSetStatus(KEYS.Get("io_t3m_pl_nothing_redo"));
            return;
        }
        this._ioHistoryAt++;
        this.ioRestore(this._ioHistory[this._ioHistoryAt]);
        this.ioSetStatus(KEYS.Get("io_t3m_pl_redone"));
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
            // (QoL #685)
            if (param1.ghosts && this._plannerTemplate.ioGhosts) {
                this._plannerTemplate.ioGhosts.length = 0;
                for (let g of param1.ghosts) {
                    this._plannerTemplate.ioGhosts.push(new BaseTemplateNode(g[1] | 0, g[2] | 0, PlannerTemplate.IO_GHOST_ID, g[0] | 0));
                }
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
