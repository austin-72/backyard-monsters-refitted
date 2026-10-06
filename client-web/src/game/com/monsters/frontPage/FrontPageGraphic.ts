import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Video } from "flash/media";
import { NetStream } from "flash/net";
import { CarouselCategoryButton2, Category, Elastic, Expo, FrontPageEvent, ImageCache, KEYS, TweenLite, VideoUtils, com_monsters_frontPage_messages_Message as Message, frontpage_featuredItem_CLIP, popup_frontpage_CLIP } from "@game";

export class FrontPageGraphic extends popup_frontpage_CLIP {
    static {
        as3.fields(this, { _activeMessage: null, _media: null, _videoStream: null, _carousel: null, _container: null });
    }

    public static readonly MEDIA_WIDTH: uint = 620;

    public static readonly MEDIA_HEIGHT: uint = 340;
    private _activeMessage: Message;
    private _media: DisplayObject;
    private _videoStream: NetStream;
    private _carousel: Sprite;
    private _container: frontpage_featuredItem_CLIP;

    public $ctor(param1: Message = null): void {
        super.$ctor();
        this.bNext.visible = false;
        this.bPrev.visible = false;
        this.bNext.tLabel.htmlText = KEYS.Get("btn_next");
        this.bPrev.tLabel.htmlText = KEYS.Get("btn_prev");
        this.bNext.mouseChildren = false;
        this.bPrev.mouseChildren = false;
        this.bNext.buttonMode = true;
        this.bPrev.buttonMode = true;
        this.bNext.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedNext));
        this.bPrev.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedPrevious));
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.rollOver));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.rollOut));
        if (param1) {
            this.showMessage(param1);
        }
    }

    private rollOver(param1: MouseEvent): void {
        this.tweenNavigationButtonAlphaTo(1);
    }

    private rollOut(param1: MouseEvent): void {
        this.tweenNavigationButtonAlphaTo(0);
    }

    private tweenNavigationButtonAlphaTo(param1: int): void {
        TweenLite.to(this.bNext, 0.25, { "alpha": param1 });
        TweenLite.to(this.bPrev, 0.25, { "alpha": param1 });
    }

    private clickedNext(param1: MouseEvent): void {
        this.dispatchEvent(new FrontPageEvent(FrontPageEvent.NEXT));
    }

    private clickedPrevious(param1: MouseEvent): void {
        this.dispatchEvent(new FrontPageEvent(FrontPageEvent.PREVIOUS));
    }

    public destroy(): void {
        this.bNext.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedNext));
        this.bPrev.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedPrevious));
        this.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.rollOver));
        this.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.rollOut));
    }

    public updateCategories(param1: Category, param2: Vector<Category>): void {
        let _loc5_: int = 0;
        let _loc6_: Category = null;
        let _loc7_: CarouselCategory = null;
        if (this._carousel) {
            this.mcCarousel.removeChild(this._carousel);
        }
        this._carousel = new Sprite();
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        _loc5_ = 0;
        while (_loc5_ < param2.length) {
            _loc6_ = as3.vget(param2, _loc5_);
            (_loc7_ = new CarouselCategory(_loc6_, _loc6_ == param1)).addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedCategory), false, 0, true);
            _loc7_.x = _loc3_;
            this._carousel.addChild(_loc7_);
            _loc3_ = (_loc3_ + _loc7_.width) | 0;
            if (_loc5_ + 1 < param2.length) {
                _loc3_ += 5;
            }
            if (_loc4_ == 0) {
                _loc4_ = (_loc7_.width / 2) | 0;
            }
            _loc5_++;
        }
        this._carousel.x = -(this._carousel.width * 0.5) + _loc4_;
        this.mcCarousel.addChild(this._carousel);
    }

    protected clickedCategory(param1: MouseEvent): void {
        let _loc2_: CarouselCategory = as3.as(param1.currentTarget, CarouselCategory);
        this.dispatchEvent(new FrontPageEvent(FrontPageEvent.CHANGE_CATEGORY, _loc2_.category));
    }

    public showMessage(param1: Message): void {
        this._container = this.createMessageContainer();
        this._container.tTitle.htmlText = param1.title;
        this._container.tBody.htmlText = param1.body;
        if (this._media) {
            this.clearMedia();
        }
        if (param1.videoURL) {
            this.loadVideo(param1.videoURL);
        } else if (param1.imageURL) {
            ImageCache.GetImageWithCallBack(param1.imageURL, as3.bind(this, this.loadedImage));
        }
        param1.setupButton(this._container.bAction);
    }

    private createMessageContainer(): frontpage_featuredItem_CLIP {
        if (this._container) {
            TweenLite.to(this._container, 0.5, { "alpha": 0, "onComplete": as3.bind(this, this.removeOldContainer), "onCompleteParams": [this._container] });
        }
        this._container = new frontpage_featuredItem_CLIP();
        this.mcContainer.addChildAt(this._container, 0);
        return this._container;
    }

    private removeOldContainer(param1: frontpage_featuredItem_CLIP): void {
        this.mcContainer.removeChild(param1);
        param1 = null;
    }

    private loadVideo(param1: string): void {
        this._media = new Video(FrontPageGraphic.MEDIA_WIDTH, FrontPageGraphic.MEDIA_HEIGHT);
        this._videoStream = VideoUtils.getVideoStream(as3.as(this._media, Video), param1);
        VideoUtils.loopStream(this._videoStream);
        this._container.mcImage.addChild(this._media);
    }

    private clearMedia(): void {
        if (this._videoStream) {
            this._videoStream.close();
        }
    }

    private loadedImage(param1: string, param2: BitmapData): void {
        this._media = new Bitmap(param2);
        this._container.mcImage.addChild(this._media);
    }
}

class CarouselCategory extends Sprite {
    static {
        as3.fields(this, { category: null, button: null, _isActive: false });
    }

    private static readonly _DOES_DISPLAY_LABEL: boolean = false;

    private static readonly _TWEEN_SCALE_NORMAL: number = 0.5;

    private static readonly _TWEEN_SCALE_ON: number = 0.75;

    private static readonly _TWEEN_SCALE_EXTRA: number = 0.8;
    public category: Category;
    public button: CarouselCategoryButton2;
    private _isActive: boolean;

    public $ctor(param1?: Category, param2: boolean = false): void {
        super.$ctor();
        this.button = new CarouselCategoryButton2();
        this.button.buttonMode = true;
        this.addChild(this.button);
        this.category = param1;
        this.isActive = param2;
        this.button.tLabel.htmlText = param1.name;
        this.button.tLabel.visible = CarouselCategory._DOES_DISPLAY_LABEL;
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onRollOut), false, 0, true);
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onRollOver), false, 0, true);
        this.button.mcBar.gotoAndStop(1);
        TweenLite.to(this.button.mcBar, 0, { "scaleX": CarouselCategory._TWEEN_SCALE_NORMAL, "scaleY": CarouselCategory._TWEEN_SCALE_NORMAL, "ease": Expo.easeOut });
        this.toggleAnimations();
    }

    private onRollOut(param1: MouseEvent): void {
        if (!this._isActive) {
            this.onDeactivate();
        }
    }

    private onRollOver(param1: MouseEvent): void {
        TweenLite.to(this.button.mcBar, 0.75, { "scaleX": CarouselCategory._TWEEN_SCALE_ON, "scaleY": CarouselCategory._TWEEN_SCALE_ON, "ease": Elastic.easeOut, "delay": 0 });
    }

    private onActivate(param1: MouseEvent = null): void {
        TweenLite.killTweensOf(this.button.mcBar);
        TweenLite.to(this.button.mcBar, 0.25, { "scaleX": CarouselCategory._TWEEN_SCALE_EXTRA, "scaleY": CarouselCategory._TWEEN_SCALE_EXTRA, "ease": Elastic.easeOut });
        TweenLite.to(this.button.mcBar, 0.15, { "scaleX": CarouselCategory._TWEEN_SCALE_ON, "scaleY": CarouselCategory._TWEEN_SCALE_ON, "ease": Expo.easeOut, "delay": 0.25 });
        this.button.mcBar.gotoAndStop(1);
    }

    private onDeactivate(param1: MouseEvent = null): void {
        TweenLite.killTweensOf(this.button.mcBar);
        TweenLite.to(this.button.mcBar, 0.2, { "scaleX": CarouselCategory._TWEEN_SCALE_NORMAL, "scaleY": CarouselCategory._TWEEN_SCALE_NORMAL, "ease": Expo.easeOut });
        this.button.mcBar.gotoAndStop(2);
    }

    private toggleAnimations(): void {
        if (this._isActive) {
            this.onActivate();
        } else {
            this.onDeactivate();
        }
    }

    public set isActive(param1: boolean) {
        if (this._isActive != param1) {
            this._isActive = param1;
            this.toggleAnimations();
        }
    }
}
