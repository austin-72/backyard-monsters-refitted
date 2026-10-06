import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GLOBAL, ImageCache, KEYS, POPUPSETTINGS, SOUNDS, SubscriptionHandler, print, subscriptions_promo_popup } from "@game";

export class SubscriptionJoinPopup extends subscriptions_promo_popup {
    static {
        as3.fields(this, { _DAVECLUB_IMAGEURL: "subscriptions/", _DAVECLUB_BENEFIT_IMAGEURL: null, rewardIndex: 0, circleNavigation: null });
    }

    private _DAVECLUB_IMAGEURL: string;
    private _DAVECLUB_BENEFIT_IMAGEURL: any[];
    public rewardIndex: int;
    private circleNavigation: any[];

    public $ctor(): void {
        this._DAVECLUB_BENEFIT_IMAGEURL = ["daveClub_slot01.png", "daveClub_slot02.png", "daveClub_slot03.png", "daveClub_slot04.png", "daveClub_slot05.png", "daveClub_slot06.v2.png"];
        super.$ctor();
        POPUPSETTINGS.AlignToCenter(this);
        this.circleNavigation = [this.mcCircle1, this.mcCircle2, this.mcCircle3, this.mcCircle4, this.mcCircle5, this.mcCircle6];
        this.visible = false;
        this.setup();
    }

    public setup(): void {
        ImageCache.GetImageWithCallBack(this._DAVECLUB_IMAGEURL + "daveclub_promo_BG_buttons.v2.png", as3.bind(this, this.daveClubImageLoaded), true, 1, "", [this.mcImageBG]);
        ImageCache.GetImageWithCallBack(this._DAVECLUB_IMAGEURL + "daveClub_promo_pricetag_995.png", as3.bind(this, this.daveClubImageLoaded), true, 1, "", [this.mcImagePrice]);
        let _loc1_: int = 0;
        while (_loc1_ < this.circleNavigation.length) {
            this.circleNavigation[_loc1_].gotoAndStop("off");
            _loc1_++;
        }
        this.tDescription1.htmlText = KEYS.Get("daveClub_promo_desc1");
        this.tDescription2.htmlText = KEYS.Get("daveClub_promo_desc2");
        this.mcArrowLeft.buttonMode = true;
        this.mcArrowLeft.mouseChildren = false;
        this.mcArrowLeft.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onArrowClickPrev));
        this.mcArrowRight.buttonMode = true;
        this.mcArrowRight.mouseChildren = false;
        this.mcArrowRight.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onArrowClickNext));
        this.bCancel.buttonMode = true;
        this.bCancel.mouseChildren = false;
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onCancelClick));
        this.bJoin.buttonMode = true;
        this.bJoin.mouseChildren = false;
        this.bJoin.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onJoinClick));
        this.changePortrait(0);
    }

    public update(): void {
    }

    public changePortrait(param1: int = 0): void {
        if (param1 < 0) {
            param1 = (this._DAVECLUB_BENEFIT_IMAGEURL.length - 1) | 0;
        }
        if (param1 >= this._DAVECLUB_BENEFIT_IMAGEURL.length) {
            param1 = 0;
        }
        ImageCache.GetImageWithCallBack(this._DAVECLUB_IMAGEURL + this._DAVECLUB_BENEFIT_IMAGEURL[param1], as3.bind(this, this.daveClubImageLoaded), true, 1, "", [this.mcImageSlot]);
        this.rewardIndex = param1;
        let _loc2_: int = 0;
        while (_loc2_ < this.circleNavigation.length) {
            if (_loc2_ == this.rewardIndex) {
                (as3.as(this.circleNavigation[_loc2_], MovieClip)).gotoAndStop("on");
            } else {
                (as3.as(this.circleNavigation[_loc2_], MovieClip)).gotoAndStop("off");
            }
            _loc2_++;
        }
    }

    private onArrowClickPrev(param1: MouseEvent): void {
        this.changePortrait((this.rewardIndex - 1) | 0);
    }

    private onArrowClickNext(param1: MouseEvent): void {
        this.changePortrait((this.rewardIndex + 1) | 0);
    }

    public onJoinClick(param1: MouseEvent = null): void {
        print("|SubscriptionJoinPopup| - join clicked");
        this.dispatchEvent(new Event(SubscriptionHandler.JOIN));
    }

    public onCancelClick(param1: MouseEvent = null): void {
        print("|SubscriptionJoinPopup| - cancel clicked");
        this.dispatchEvent(new Event(Event.CLOSE));
    }

    private daveClubImageLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc5_: Bitmap = null;
        let _loc4_: MovieClip = null;
        _loc4_ = as3.cast(param3[0], MovieClip);
        if (_loc4_) {
            while (_loc4_.numChildren > 0) {
                _loc4_.removeChildAt(0);
            }
            _loc5_ = new Bitmap(param2);
            _loc4_.addChild(_loc5_);
            _loc4_.visible = true;
        }
        if (!this.visible) {
            this.visible = true;
        }
    }

    public Hide(): void {
        this.mcArrowLeft.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onArrowClickPrev));
        this.mcArrowRight.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onArrowClickNext));
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onCancelClick));
        this.bJoin.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onJoinClick));
        SOUNDS.Play("close");
    }

    public Resize(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
    }
}
