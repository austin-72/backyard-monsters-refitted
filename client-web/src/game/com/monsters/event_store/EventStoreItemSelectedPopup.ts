import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { EventStoreItemSelectedPopupMC, EventStorePrize, GLOBAL, ImageCache, KEYS, POPUPS, POPUPSETTINGS, ReplayableEventHandler, RewardHandler, SingletonLock } from "@game";

export class EventStoreItemSelectedPopup extends EventStoreItemSelectedPopupMC {
    static {
        as3.fields(this, { m_PrizeBeingDisplayed: null, m_TitleImage: null, m_PreviewImage: null });
    }

    private static s_Instance: EventStoreItemSelectedPopup = null;
    private m_PrizeBeingDisplayed: EventStorePrize;
    private m_TitleImage: Bitmap;
    private m_PreviewImage: Bitmap;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
        this.m_TitleImage = new Bitmap();
        this.titleImageHolder.addChild(this.m_TitleImage);
        this.m_PreviewImage = new Bitmap();
        this.previewImageHolder.addChild(this.m_PreviewImage);
    }

    public static get instance(): EventStoreItemSelectedPopup {
        return EventStoreItemSelectedPopup.s_Instance = EventStoreItemSelectedPopup.s_Instance || new EventStoreItemSelectedPopup(new SingletonLock());
    }

    public Show(param1: EventStorePrize): void {
        let _loc4_: int = 0;
        if (this.m_PrizeBeingDisplayed != null) {
            this.Hide();
        }
        this.m_PrizeBeingDisplayed = param1;
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        POPUPS.Add(this);
        POPUPSETTINGS.AlignToCenter(this);
        if (Boolean(ReplayableEventHandler.activeEvent) && Boolean(ReplayableEventHandler.activeEvent.eventStoreTitleImage)) {
            ImageCache.GetImageWithCallBack(ReplayableEventHandler.activeEvent.eventStoreTitleImage, as3.bind(this, this.OnTitleImageLoaded));
        } else {
            ImageCache.GetImageWithCallBack("events/hellraisers/hellraisers_event_store_title.png", as3.bind(this, this.OnTitleImageLoaded));
        }
        ImageCache.GetImageWithCallBack(this.m_PrizeBeingDisplayed.previewImageURL, as3.bind(this, this.OnPreviewImageLoaded));
        let _loc2_: uint = ReplayableEventHandler.eventXP;
        let _loc3_: string = KEYS.Get(this.m_PrizeBeingDisplayed.nameKey);
        this.prizeNameText.htmlText = KEYS.Get("prize_title", { "v1": _loc3_ });
        this.descriptionText.htmlText = KEYS.Get(this.m_PrizeBeingDisplayed.descriptionKey);
        this.experienceDisplay.xpBalanceText.htmlText = KEYS.Get("event_store_xp_balance", { "v1": _loc2_ });
        this.xpCostText.htmlText = KEYS.Get("event_store_cost", { "v1": this.m_PrizeBeingDisplayed.xpCost });
        if (this.m_PrizeBeingDisplayed.lockIcon.visible) {
            this.purchaseButton.Setup(KEYS.Get("event_store_prize_locked"));
            this.purchaseButton.Enabled = false;
        } else if (_loc2_ < this.m_PrizeBeingDisplayed.xpCost) {
            _loc4_ = (this.m_PrizeBeingDisplayed.xpCost - _loc2_) | 0;
            this.purchaseButton.Setup(KEYS.Get("event_store_xp_needed", { "v1": _loc4_ }));
            this.purchaseButton.Enabled = false;
        } else {
            this.purchaseButton.Setup(KEYS.Get("event_store_purchase"));
            this.purchaseButton.Enabled = true;
            this.purchaseButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnPurchaseClicked));
        }
    }

    private OnTitleImageLoaded(param1: string, param2: BitmapData): void {
        this.m_TitleImage.bitmapData = param2;
        this.m_TitleImage.x = -(this.m_TitleImage.width * 0.5);
    }

    private OnPreviewImageLoaded(param1: string, param2: BitmapData): void {
        this.m_PreviewImage.bitmapData = param2;
    }

    public Hide(): void {
        if (this.m_PrizeBeingDisplayed == null) {
            return;
        }
        this.purchaseButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnPurchaseClicked));
        this.purchaseButton.Enabled = false;
        this.m_TitleImage.bitmapData = null;
        this.m_PreviewImage.bitmapData = null;
        POPUPS.Remove(this);
        GLOBAL.BlockerRemove();
        this.m_PrizeBeingDisplayed = null;
    }

    private OnPurchaseClicked(param1: MouseEvent): void {
        if (this.m_PrizeBeingDisplayed == null) {
            return;
        }
        if (this.m_PrizeBeingDisplayed.correspondingReward == null) {
            return;
        }
        if (ReplayableEventHandler.eventXP < this.m_PrizeBeingDisplayed.xpCost) {
            return;
        }
        ReplayableEventHandler.eventXP = (ReplayableEventHandler.eventXP - this.m_PrizeBeingDisplayed.xpCost) >>> 0;
        RewardHandler.instance.addAndApplyReward(this.m_PrizeBeingDisplayed.correspondingReward);
        if (this.m_PrizeBeingDisplayed.correspondingRewardValue) {
            this.m_PrizeBeingDisplayed.correspondingReward.value = this.m_PrizeBeingDisplayed.correspondingRewardValue;
        }
    }
}
