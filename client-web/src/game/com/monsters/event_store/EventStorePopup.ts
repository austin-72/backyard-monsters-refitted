import * as as3 from "as3";
import { Vector, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { ButtonBrown, EventStoreDisplayGrid, EventStorePopupMC, ImageCache, KEYS, POPUPS, ReplayableEventHandler, SingletonLock } from "@game";

export class EventStorePopup extends EventStorePopupMC {
    static {
        as3.fields(this, { m_TabButtons: null, m_TabDisplays: null, m_EventStoreDisplayGrid: null, m_TitleImage: null, m_SelectedTabButton: null, m_IsShowing: false });
    }

    private static s_Instance: EventStorePopup = null;
    private m_TabButtons: Vector<ButtonBrown>;
    private m_TabDisplays: Vector<DisplayObject>;
    private m_EventStoreDisplayGrid: EventStoreDisplayGrid;
    private m_TitleImage: Bitmap;
    private m_SelectedTabButton: ButtonBrown;
    private m_IsShowing: boolean;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
        this.m_TitleImage = new Bitmap();
        this.titleImageHolder.addChild(this.m_TitleImage);
        this.m_TabButtons = new Vector<ButtonBrown>(0, false, ButtonBrown);
        this.m_TabDisplays = new Vector<DisplayObject>(0, false, DisplayObject);
        let _loc2_: ButtonBrown = as3.as(this.tabButton1, ButtonBrown);
        _loc2_.SetupKey("event_store_details_tab");
        _loc2_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnTabButtonClicked));
        this.m_TabButtons.push(_loc2_);
        let _loc3_: DisplayObject = new Sprite();
        this.m_TabDisplays.push(_loc3_);
        this.displayContainer.addChild(_loc3_);
        let _loc4_: ButtonBrown = null;
        (_loc4_ = as3.as(this.tabButton2, ButtonBrown)).SetupKey("event_store_prizes_tab");
        _loc4_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnTabButtonClicked));
        this.m_TabButtons.push(_loc4_);
        this.m_EventStoreDisplayGrid = new EventStoreDisplayGrid(this.displayContainer);
        this.m_TabDisplays.push(this.m_EventStoreDisplayGrid);
        this.displayContainer.addChild(this.m_EventStoreDisplayGrid);
    }

    public static get instance(): EventStorePopup {
        return EventStorePopup.s_Instance = EventStorePopup.s_Instance || new EventStorePopup(new SingletonLock());
    }

    public Show(param1: uint = 1): void {
        if (this.m_IsShowing == true) {
            return;
        }
        if (ReplayableEventHandler.activeEvent == null) {
        }
        POPUPS.Push(this);
        this.m_IsShowing = true;
        if (Boolean(ReplayableEventHandler.activeEvent) && Boolean(ReplayableEventHandler.activeEvent.eventStoreTitleImage)) {
            ImageCache.GetImageWithCallBack(ReplayableEventHandler.activeEvent.eventStoreTitleImage, as3.bind(this, this.OnTitleImageLoaded));
        } else {
            ImageCache.GetImageWithCallBack("events/hellraisers/hellraisers_event_store_title.png", as3.bind(this, this.OnTitleImageLoaded));
        }
        let _loc2_: uint = ReplayableEventHandler.eventXP;
        this.experienceDisplay.xpBalanceText.htmlText = KEYS.Get("event_store_xp_balance", { "v1": _loc2_ });
        this.m_EventStoreDisplayGrid.Populate();
        this.SelectTab(as3.vget(this.m_TabButtons, param1));
    }

    private OnTitleImageLoaded(param1: string, param2: BitmapData): void {
        this.m_TitleImage.bitmapData = param2;
        this.m_TitleImage.x = -(this.m_TitleImage.width * 0.5);
    }

    public Hide(): void {
        if (this.m_IsShowing == false) {
            return;
        }
        this.m_EventStoreDisplayGrid.Clear();
        this.m_TitleImage.bitmapData = null;
        POPUPS.Next();
        this.m_IsShowing = false;
    }

    private OnTabButtonClicked(param1: MouseEvent): void {
        let _loc2_: ButtonBrown = as3.as(param1.currentTarget, ButtonBrown);
        if (_loc2_ == null || _loc2_ == this.m_SelectedTabButton) {
            return;
        }
        this.SelectTab(_loc2_);
    }

    private SelectTab(param1: ButtonBrown): void {
        let _loc4_: ButtonBrown = null;
        let _loc5_: DisplayObject = null;
        let _loc2_: uint = this.m_TabButtons.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = as3.vget(this.m_TabButtons, _loc3_);
            _loc5_ = as3.vget(this.m_TabDisplays, _loc3_);
            if (_loc4_ == param1) {
                _loc4_.Highlight = true;
                _loc5_.visible = true;
                this.m_SelectedTabButton = _loc4_;
                this.displayContainer.gotoAndStop("tabSelected" + (_loc3_ + 1));
            } else {
                _loc4_.Highlight = false;
                _loc5_.visible = false;
            }
            _loc3_++;
        }
    }
}
