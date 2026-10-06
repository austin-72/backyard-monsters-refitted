import * as as3 from "as3";
import { uint } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { EventStoreDisplayItem, EventStoreItemSelectedPopup, ImageCache, KEYS, ReplayableEventHandler, Reward, RewardHandler, RewardLibrary } from "@game";

export class EventStorePrize extends EventStoreDisplayItem {
    static {
        as3.fields(this, { m_Id: null, m_NameKey: null, m_DescriptionKey: null, m_ImageURL: null, m_LockedImageURL: null, m_PreviewImageURL: null, m_CorrespondingReward: null, m_CorrespondingRewardValue: NaN, m_XPCost: 0, m_Image: null });
    }

    private m_Id: string;
    private m_NameKey: string;
    private m_DescriptionKey: string;
    private m_ImageURL: string;
    private m_LockedImageURL: string;
    private m_PreviewImageURL: string;
    private m_CorrespondingReward: Reward;
    private m_CorrespondingRewardValue: number;
    private m_XPCost: uint;
    private m_Image: Bitmap;

    public $ctor(param1?: any): void {
        this.m_Image = new Bitmap();
        super.$ctor();
        this.m_Id = as3.str(param1.id);
        this.m_NameKey = as3.str(param1.name_key);
        this.m_DescriptionKey = as3.str(param1.description_key);
        this.m_ImageURL = as3.str(param1.image);
        this.m_LockedImageURL = as3.str(param1.locked_image);
        this.m_PreviewImageURL = as3.str(param1.preview_image);
        this.m_XPCost = param1.xpcost >>> 0;
        this.m_Image = new Bitmap();
        this.buttonMode = true;
        this.nameText.htmlText = KEYS.Get(this.m_NameKey);
        this.imageHolder.addChild(this.m_Image);
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnClicked), false, 0, true);
        let _loc2_: uint = ReplayableEventHandler.eventXP;
        if (_loc2_ < this.m_XPCost) {
            this.xpText.htmlText = _loc2_ + "/" + this.m_XPCost;
            this.xpBarBlue.visible = false;
            this.xpBarGreen.visible = true;
            this.xpBarYellow.visible = false;
        } else {
            this.xpText.htmlText = KEYS.Get("event_store_prize_unlocked");
            this.xpBarBlue.visible = false;
            this.xpBarGreen.visible = false;
            this.xpBarYellow.visible = true;
        }
        let _loc3_: string = String(param1.correspondingRewardId);
        this.m_CorrespondingRewardValue = Number(param1.correspondingRewardValue);
        this.m_CorrespondingReward = RewardHandler.instance.getRewardByID(_loc3_);
        if (this.m_CorrespondingReward != null && this.m_CorrespondingReward.value >= this.m_CorrespondingRewardValue) {
            this.lockIcon.visible = false;
            this.tickIcon.visible = true;
            this.xpBarBlue.visible = true;
            this.xpBarGreen.visible = false;
            this.xpBarYellow.visible = false;
            this.xpText.htmlText = KEYS.Get("event_store_prize_purchased");
            ImageCache.GetImageWithCallBack(this.m_ImageURL, as3.bind(this, this.OnImageLoaded));
            return;
        }
        if (this.m_CorrespondingReward == null) {
            this.m_CorrespondingReward = RewardLibrary.getRewardByID(_loc3_);
        }
        if (this.m_CorrespondingReward == null) {
            this.lockIcon.visible = true;
            this.tickIcon.visible = false;
            ImageCache.GetImageWithCallBack(this.m_LockedImageURL, as3.bind(this, this.OnImageLoaded));
            return;
        }
        let _loc4_: string = null;
        if ((_loc4_ = String(param1.requiredReward)) == null || _loc4_ == "") {
            this.lockIcon.visible = false;
            this.tickIcon.visible = false;
            ImageCache.GetImageWithCallBack(this.m_ImageURL, as3.bind(this, this.OnImageLoaded));
            return;
        }
        let _loc5_: Reward = RewardHandler.instance.getRewardByID(_loc4_);
        let _loc6_: number = Number(param1.requiredRewardValue);
        if (_loc5_ == null || _loc5_.value < _loc6_) {
            this.lockIcon.visible = true;
            this.tickIcon.visible = false;
            ImageCache.GetImageWithCallBack(this.m_LockedImageURL, as3.bind(this, this.OnImageLoaded));
            return;
        }
        this.lockIcon.visible = false;
        this.tickIcon.visible = false;
        ImageCache.GetImageWithCallBack(this.m_ImageURL, as3.bind(this, this.OnImageLoaded));
    }

    public get id(): string {
        return this.m_Id;
    }

    public get nameKey(): string {
        return this.m_NameKey;
    }

    public get descriptionKey(): string {
        return this.m_DescriptionKey;
    }

    public get imageURL(): string {
        return this.m_ImageURL;
    }

    public get lockedImageURL(): string {
        return this.m_LockedImageURL;
    }

    public get previewImageURL(): string {
        return this.m_PreviewImageURL;
    }

    public get correspondingReward(): Reward {
        return this.m_CorrespondingReward;
    }

    public get correspondingRewardValue(): number {
        return this.m_CorrespondingRewardValue;
    }

    public get xpCost(): uint {
        return this.m_XPCost;
    }

    private OnImageLoaded(param1: string, param2: BitmapData): void {
        if (this.m_Image != null) {
            this.m_Image.bitmapData = param2;
        }
    }

    public Destroy(): void {
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnClicked));
        this.imageHolder.removeChild(this.m_Image);
        this.m_Image.bitmapData = null;
        this.m_Image = null;
        this.m_CorrespondingReward = null;
    }

    private OnClicked(param1: MouseEvent): void {
        EventStoreItemSelectedPopup.instance.Show(this);
    }
}
