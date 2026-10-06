import * as as3 from "as3";
import { ASObject, Vector, uint } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, EnumYardType, GLOBAL, ImageCache, KEYS, MAP, MapRoom3, MapRoom3Cell, MapRoom3CellMouseover, MapRoomManager, POPUPSETTINGS, SOUNDS, TUTORIAL, TweenLite, UI_BOTTOM, UI_VISITOR, popup_mr2tutorial } from "@game";

export class MapRoom3Tutorial extends ASObject {
    static {
        as3.fields(this, { m_started: false, m_tutorialStep: 0, m_currImageUrl: null, m_bigPopup: null, m_tutorialId: 0, m_target: null });
    }

    private static readonly k_ID_START: uint = 0;

    private static readonly k_ID_HALFWAY: uint = 1;

    private static readonly k_ID_FINISHED: uint = 2;

    public static readonly k_STEP_OPENMAP: uint = 0;

    public static readonly k_STEP_CLICKWM: uint = 1;

    public static readonly k_STEP_SCOUTWM: uint = 2;

    public static readonly k_STEP_ATTACKWM: uint = 3;

    public static readonly k_STEP_HOLD: uint = 4;

    public static readonly k_STEP_COUNQURED: uint = 5;

    public static readonly k_STEP_FORTIFICATION_ARM: uint = 6;

    public static readonly k_STEP_FINISHED: uint = 7;

    public static readonly k_MAX_STEP: uint = 8;

    private static m_instance: MapRoom3Tutorial = null;
    private m_started: boolean;
    private m_tutorialStep: uint;
    private m_currImageUrl: string;
    private m_bigPopup: popup_mr2tutorial;
    private m_tutorialId: uint;
    private m_target: any;

    public $ctor(param1?: InstanceEnforcer): void {
        super.$ctor();
        if (!param1) {
            throw new Error(this + " must be used as a singleton.");
        }
    }

    public static get instance(): MapRoom3Tutorial {
        MapRoom3Tutorial.m_instance = MapRoom3Tutorial.m_instance || new MapRoom3Tutorial(new InstanceEnforcer());
        return MapRoom3Tutorial.m_instance;
    }

    public get tutorialId(): uint {
        return this.m_tutorialId;
    }

    public get tutorialStep(): uint {
        return this.m_tutorialStep;
    }

    public get allowScrolling(): boolean {
        return !this.m_started || this.m_tutorialStep < MapRoom3Tutorial.k_STEP_CLICKWM || this.m_tutorialStep > MapRoom3Tutorial.k_STEP_ATTACKWM;
    }

    public get isStarted(): boolean {
        return this.m_started;
    }

    public get isHolding(): boolean {
        return this.m_tutorialStep === MapRoom3Tutorial.k_STEP_HOLD;
    }

    public isClickableCell(param1: MapRoom3Cell): boolean {
        return !this.m_target || param1 == this.m_target || TUTORIAL.hasFinished;
    }

    public importData(param1: any): void {
    }

    public update(): void {
        let _loc1_: MapRoom3Cell = null;
        let _loc2_: Vector<MapRoom3Cell> = null;
        let _loc3_: MapRoom3CellMouseover = null;
        switch (this.m_tutorialStep) {
            case MapRoom3Tutorial.k_STEP_OPENMAP:
                BASE.BuildingDeselect();
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step33"), TUTORIAL.POINT_MAP, ["mc", UI_BOTTOM._mc.bMap, new Point(15, 15), -30], false, false, as3.bind(this, this.openedMapRoom));
                break;
            case MapRoom3Tutorial.k_STEP_CLICKWM:
                if (!MapRoomManager.instance.isOpen || !MapRoomManager.instance.isInMapRoom3) {
                    break;
                }
                TUTORIAL._container = MapRoom3.mapRoom3Window.scrollingCanvas;
                this.m_target = null;
                _loc2_ = MapRoomManager.instance.GetHexCellsInRange(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0, 1);
                for (_loc1_ of (_loc2_ ?? [])) {
                    if (_loc1_.cellType === EnumYardType.FORTIFICATION && (!this.m_target || _loc1_.baseLevel < (as3.as(this.m_target, MapRoom3Cell)).baseLevel)) {
                        if (_loc1_.isOwnedByPlayer) {
                            TUTORIAL._container = GLOBAL._layerMessages;
                            TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("btn_returnhome"), TUTORIAL.POINT_MAP, ["mc", UI_BOTTOM._mc.bMap, new Point(15, 15), -30], false, false, as3.bind(this, this.returnedHome));
                            this.m_target = null;
                            break;
                        }
                        this.m_target = _loc1_;
                    }
                }
                if (this.m_target) {
                    TUTORIAL.Add(6, new Point(this.m_target.cellGraphic.x + GLOBAL._SCREEN.width / 2 - 160, this.m_target.cellGraphic.y), KEYS.Get("tut_NWM_Step_2"), new Point(this.m_target.cellGraphic.x + this.m_target.cellGraphic.width * 0.5, this.m_target.cellGraphic.y + this.m_target.cellGraphic.height * 0.5), [], false, false, as3.bind(this, this.clickWMBase), null);
                    TUTORIAL._mcArrow.alpha = 0;
                    TweenLite.to(TUTORIAL._mcArrow, 0.75, { "autoAlpha": 1, "delay": 0.5, "overwrite": 1 });
                    MapRoom3.mapRoom3Window.NavigateToCell(as3.as(this.m_target, MapRoom3Cell));
                }
                break;
            case MapRoom3Tutorial.k_STEP_SCOUTWM:
                if (!MapRoomManager.instance.isOpen) {
                    break;
                }
                if (!MapRoom3.mapRoom3Window.mouseoverInfo || !MapRoom3.mapRoom3Window.mouseoverInfo.visible) {
                    this.rewind();
                } else {
                    TUTORIAL._container = GLOBAL._layerMessages;
                    _loc3_ = MapRoom3.mapRoom3Window.mouseoverInfo;
                    TUTORIAL.Add(6, new Point(100, 160), KEYS.Get("tut_NWM_Step_3"), new Point(_loc3_.x, _loc3_.y + 100), ["mc", _loc3_.scoutAttackButton, new Point(15, 15), 100], false, false, as3.bind(this, this.scoutWMBase), as3.bind(this, this.failScoutWMBase));
                    TUTORIAL._mcArrow.alpha = 0;
                    TweenLite.to(TUTORIAL._mcArrow, 0.75, { "autoAlpha": 1, "delay": 0.5, "overwrite": 1 });
                }
                break;
            case MapRoom3Tutorial.k_STEP_ATTACKWM:
                MAP.Focus(-200, 0);
                MAP.FocusTo(200, 0, 5, 0, 0, false);
                TUTORIAL.Add(6, TUTORIAL.BOBBOTTOMLEFTLOW, KEYS.Get("tut_NWM_Step_4"), TUTORIAL.POINT_MAP, ["mc", UI_VISITOR.mc.bAttack, new Point(15, 15), -30], false, false, as3.bind(this, this.attackWMBase));
                break;
            case MapRoom3Tutorial.k_STEP_HOLD:
                this.m_target = null;
                break;
            case MapRoom3Tutorial.k_STEP_COUNQURED:
                if (!MapRoomManager.instance.isOpen) {
                    this.rewind();
                } else {
                    TUTORIAL._container = MapRoom3.mapRoom3Window.scrollingCanvas;
                    this.m_target = null;
                    _loc2_ = MapRoomManager.instance.GetHexCellsInRange(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0, 1);
                    for (_loc1_ of (_loc2_ ?? [])) {
                        if (_loc1_.cellType === EnumYardType.FORTIFICATION && (!this.m_target || _loc1_.baseLevel < (as3.as(this.m_target, MapRoom3Cell)).baseLevel)) {
                            this.m_target = _loc1_;
                        }
                    }
                    if (this.m_target) {
                        TUTORIAL.Add(6, new Point(this.m_target.cellGraphic.x - 100, this.m_target.cellGraphic.y + 200), KEYS.Get("tut_NWM_Step_8"), new Point(this.m_target.cellGraphic.x + this.m_target.cellGraphic.width * 0.5, this.m_target.cellGraphic.y), [], true, false, null, null);
                        TUTORIAL._mcArrow.alpha = 0;
                        TweenLite.to(TUTORIAL._mcArrow, 0.75, { "autoAlpha": 1, "delay": 1, "overwrite": 1 });
                        MapRoom3.mapRoom3Window.NavigateToCell(as3.as(this.m_target, MapRoom3Cell));
                    }
                }
                break;
            case MapRoom3Tutorial.k_STEP_FORTIFICATION_ARM:
                TUTORIAL._container = MapRoom3.mapRoom3Window.scrollingCanvas;
                this.m_target = null;
                _loc2_ = MapRoomManager.instance.GetHexCellsInRange(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0, 1);
                for (_loc1_ of (_loc2_ ?? [])) {
                    if (_loc1_.cellType === EnumYardType.FORTIFICATION && (!this.m_target || _loc1_.baseLevel < (as3.as(this.m_target, MapRoom3Cell)).baseLevel)) {
                        this.m_target = _loc1_;
                    }
                }
                if (this.m_target) {
                    TUTORIAL.Add(6, new Point(this.m_target.cellGraphic.x - 100, this.m_target.cellGraphic.y + 200), KEYS.Get("tut_NWM_Step_8"), new Point(this.m_target.cellGraphic.x + this.m_target.cellGraphic.width * 0.5, this.m_target.cellGraphic.y), [], true, false, null, null);
                    TUTORIAL._mcArrow.alpha = 0;
                    TweenLite.to(TUTORIAL._mcArrow, 0.75, { "autoAlpha": 1, "delay": 1, "overwrite": 1 });
                    MapRoom3.mapRoom3Window.NavigateToCell(as3.as(this.m_target, MapRoom3Cell));
                }
        }
    }

    private openedMapRoom(): void {
        let _loc1_: MapRoom3Cell = as3.as(GLOBAL._currentCell, MapRoom3Cell);
        if (MapRoomManager.instance.isOpen && _loc1_ && _loc1_.isDataLoaded) {
            this.advance();
        }
    }

    private returnedHome(): void {
        if (!MapRoomManager.instance.isOpen && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.finish();
        }
    }

    private clickWMBase(): void {
        let _loc1_: MapRoom3CellMouseover = MapRoom3.mapRoom3Window.mouseoverInfo;
        if (_loc1_ && _loc1_.visible && _loc1_.scoutAttackButton.parent && _loc1_.scoutAttackButton.parent.visible && _loc1_.selectedCell == this.m_target) {
            this.advance();
        }
    }

    private scoutWMBase(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW) {
            TUTORIAL._container = GLOBAL._layerMessages;
            this.advance();
        }
    }

    private failScoutWMBase(): void {
        if (!MapRoom3.mapRoom3Window.mouseoverInfo || !MapRoom3.mapRoom3Window.mouseoverInfo.visible) {
            this.rewind();
        }
    }

    private attackWMBase(): void {
        if (GLOBAL.mode === GLOBAL.e_BASE_MODE.WMATTACK) {
            this.advance();
            TUTORIAL._stage = 111;
            TUTORIAL.Advance();
        }
    }

    private closedMapRoom(): void {
        if (!MapRoomManager.instance.isOpen) {
            TUTORIAL._container = GLOBAL._layerMessages;
            this.m_tutorialStep = 0;
            TUTORIAL._stage = 99;
            TUTORIAL.Advance();
        }
    }

    public advance(param1: Event = null): void {
        ++this.m_tutorialStep;
        TUTORIAL.clearStage();
        this.update();
    }

    private rewind(): void {
        --this.m_tutorialStep;
        TUTORIAL.clearStage();
        this.update();
    }

    private showBigDialog(param1: string, param2: string): void {
        this.hideBigDialog();
        GLOBAL.BlockerAdd();
        SOUNDS.Play("click1");
        this.m_bigPopup = new popup_mr2tutorial();
        this.m_bigPopup.tBody.htmlText = param1;
        this.m_bigPopup.bAction.SetupKey("btn_continue");
        this.m_bigPopup.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.advance), false, 0, true);
        this.m_bigPopup.bAction.Highlight = true;
        this.m_bigPopup.mcFrame.Setup(true, as3.bind(this, this.finish));
        this.m_currImageUrl = param2;
        ImageCache.GetImageWithCallBack(this.m_currImageUrl, as3.bind(this, this.imageLoaded));
        GLOBAL._layerTop.addChild(this.m_bigPopup);
        POPUPSETTINGS.AlignToCenter(this.m_bigPopup);
        POPUPSETTINGS.ScaleUp(this.m_bigPopup);
    }

    private imageLoaded(param1: string, param2: BitmapData): void {
        if (this.m_currImageUrl == param1 && this.m_bigPopup) {
            this.m_bigPopup.mcImageContainer.addChild(new Bitmap(param2));
        }
    }

    private showSmallDialog(param1: string): void {
        this.hideBigDialog();
        this.m_currImageUrl = "";
        GLOBAL.Message(param1, KEYS.Get("btn_continue"), as3.bind(this, this.advance));
    }

    public start(): void {
        if (!MapRoomManager.instance.isInMapRoom3 || this.m_tutorialStep >= MapRoom3Tutorial.k_STEP_FINISHED) {
            return;
        }
        this.m_started = true;
        this.update();
    }

    public finish(param1: Event = null): void {
        this.clear();
        TUTORIAL._stage = 129;
        TUTORIAL.Advance();
    }

    public clear(): void {
        this.m_started = false;
        this.m_tutorialStep = MapRoom3Tutorial.k_STEP_FINISHED;
        this.m_tutorialId = MapRoom3Tutorial.k_ID_FINISHED;
        TUTORIAL._container = GLOBAL._layerMessages;
    }

    public continueFromAttack(): void {
        this.m_tutorialStep = MapRoom3Tutorial.k_STEP_COUNQURED;
        this.update();
    }

    private hideBigDialog(): void {
        if (this.m_bigPopup) {
            GLOBAL.BlockerRemove();
            GLOBAL._layerTop.removeChild(this.m_bigPopup);
            this.m_bigPopup = null;
        }
    }
}

class InstanceEnforcer extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
