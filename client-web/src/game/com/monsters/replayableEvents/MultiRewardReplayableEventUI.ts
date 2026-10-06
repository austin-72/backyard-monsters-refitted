import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Chat, EventRewardRibbon, GLOBAL, IReplayableEventUI, ImageCache, MultiRewardEventsBar, ReplayableEvent, ReplayableEventQuota, TweenLite } from "@game";

export class MultiRewardReplayableEventUI extends MultiRewardEventsBar implements IReplayableEventUI {
    static {
        as3.implement(this, [IReplayableEventUI]);
        as3.fields(this, { _event: null, m_progressBarFill: null, m_rewardGraphics: null, k_BUFFER: 0.25 });
    }

    public static CLICKED_ACTION: string = "eventBarAction";

    public static CLICKED_INFO: string = "eventBarInfo";

    public static readonly k_REWARD_COLOR: uint = 15924337;

    public static readonly k_PROGRESS_COLOR: uint = 8567294;
    private _event: ReplayableEvent;
    private m_progressBarFill: Shape;
    private m_rewardGraphics: Vector<RewardGraphics>;
    private k_BUFFER: number;

    public $ctor(): void {
        this.m_rewardGraphics = new Vector<RewardGraphics>(0, false, RewardGraphics);
        super.$ctor();
    }

    public get eventUI(): DisplayObject {
        return this;
    }

    public setup(param1: ReplayableEvent): void {
        let _loc2_: uint = 0;
        let _loc3_: int = 0;
        let _loc4_: uint = 0;
        let _loc6_: uint = 0;
        let _loc7_: ReplayableEventQuota = null;
        let _loc8_: int = 0;
        let _loc9_: EventRewardRibbon = null;
        let _loc10_: number = NaN;
        let _loc11_: Sprite = null;
        this._event = param1;
        this.tScore.visible = false;
        this.tScore.mouseEnabled = false;
        this.buttonHelp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowInfoPopup));
        this.buttonHelp.buttonMode = true;
        if (this._event.buttonCopy) {
            this.buttonAction.stop();
            this.buttonAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowEventPopup), false, 0, true);
            this.buttonAction.buttonMode = true;
            this.buttonActionLabel.text = this._event.buttonCopy;
            this.buttonActionLabel.mouseEnabled = false;
        } else {
            this.buttonActionLabel.visible = false;
            this.buttonAction.visible = false;
        }
        this.progressBarOverlay.visible = true;
        this.progressBarOverlay.mouseEnabled = false;
        if (this._event.imageURL) {
            ImageCache.GetImageWithCallBack(this._event.imageURL, as3.bind(this, this.onImageLoaded));
        }
        if (this._event.titleImage) {
            ImageCache.GetImageWithCallBack(this._event.titleImage, as3.bind(this, this.onLogoLoaded));
        }
        _loc2_ = 0;
        _loc4_ = 3;
        _loc6_ = 0;
        while (_loc6_ < _loc4_) {
            this.getChildByName("reward" + _loc6_).visible = false;
            _loc6_++;
        }
        let _loc5_: uint = this._event.rewards.length >>> 0;
        _loc6_ = 0;
        while (_loc6_ < _loc5_) {
            if (!((_loc7_ = as3.vget(this._event.rewards, _loc6_)).rewardID == null || _loc7_.rewardID == "")) {
                _loc8_ = (_loc4_ - (_loc5_ - 1) + _loc2_) | 0;
                if ((_loc9_ = as3.as(this.getChildByName("reward" + String(_loc8_ - 1)), EventRewardRibbon)) == null) {
                    break;
                }
                _loc9_.visible = true;
                ImageCache.GetImageWithCallBack(_loc7_.imageURL, as3.bind(this, this.onRewardImageLoaded), true, 4, "", [_loc9_]);
                _loc10_ = as3.vget(this._event.rewards, _loc6_).quota / this._event.maxScore - (_loc2_ > 0 ? as3.vget(this._event.rewards, _loc6_ - 1).quota / this._event.maxScore : 0);
                (_loc11_ = new Sprite()).x = _loc3_ + 2;
                _loc11_.y = 1;
                _loc11_.graphics.beginFill(MultiRewardReplayableEventUI.k_REWARD_COLOR);
                _loc11_.graphics.drawRect(0, 0, _loc10_ * this.progressBarFillMask.width, this.progressBarFillMask.height - 2);
                this.progressBarFill.addChild(_loc11_);
                _loc3_ = (_loc3_ + _loc11_.width) | 0;
                this.m_rewardGraphics.push(new RewardGraphics(_loc11_, _loc9_));
                _loc2_++;
                if (_loc2_ >= _loc4_) {
                    break;
                }
            }
            _loc6_++;
        }
        this.m_progressBarFill = new Shape();
        this.m_progressBarFill.x += 2;
        this.progressBarFill.addChild(this.m_progressBarFill);
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
    }

    private removedFromStage(param1: Event): void {
        this.m_rewardGraphics = null;
    }

    public update(): void {
        let _loc1_: int = this._event.timeUntilNextDate | 0;
        if (_loc1_ <= 0) {
            this.timeLabel.htmlText = "<b>DATE NOT INITIALIZED!</b>";
        } else {
            this.timeLabel.htmlText = "<b>" + GLOBAL.ToTime(_loc1_, true) + "</b>";
        }
        if (this._event.hasEventStarted) {
            this.m_progressBarFill.graphics.clear();
            this.m_progressBarFill.graphics.beginFill(MultiRewardReplayableEventUI.k_PROGRESS_COLOR);
            this.m_progressBarFill.graphics.drawRect(0, 0, this._event.progress * this.progressBarFillMask.width, this.progressBarFillMask.height);
            this.m_progressBarFill.graphics.endFill();
        }
        if (this._event.buttonCopy) {
            this.buttonActionLabel.text = this._event.buttonCopy;
        }
        this.tScore.htmlText = "<b>" + Math.max(this._event.score, 0) + "/" + this._event.maxScore + "</b>";
        this.Resize();
    }

    private Resize(): void {
        this.x = GLOBAL._SCREEN.x | 0;
        this.y = (GLOBAL._SCREEN.y + (GLOBAL._SCREEN.height - this.mcBackground.height)) | 0;
        if (Chat._bymChat && Chat._bymChat.chatBox && Boolean(Chat._bymChat.chatBox.background)) {
            this.y = (Chat._bymChat.y + Chat._bymChat.chatBox.y + Chat._bymChat.chatBox.background.y - this.mcBackground.height) | 0;
        }
    }

    private onImageLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        let _loc4_: Sprite = null;
        (_loc4_ = new Sprite()).addChild(_loc3_);
        _loc4_.mouseEnabled = false;
        _loc4_.mouseChildren = false;
        this.addChildAt(_loc4_, 0);
        _loc4_.y -= _loc4_.height + this.k_BUFFER;
    }

    private onLogoLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        this.addChild(_loc3_);
        _loc3_.visible = true;
    }

    private onRewardImageLoaded(param1: string, param2: BitmapData, param3: any[]): void {
        let _loc4_: EventRewardRibbon = as3.as(param3[0], EventRewardRibbon);
        while (_loc4_.rewardImage0.numChildren) {
            _loc4_.rewardImage0.removeChildAt(0);
        }
        _loc4_.rewardImage0.addChild(new Bitmap(param2));
        _loc4_.visible = true;
    }

    private ShowEventPopup(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(MultiRewardReplayableEventUI.CLICKED_ACTION));
    }

    private ShowInfoPopup(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(MultiRewardReplayableEventUI.CLICKED_INFO));
    }
}

class RewardGraphics extends ASObject {
    static {
        as3.fields(this, { ribbon: null, fill: null, width: NaN, height: NaN });
    }

    public ribbon: EventRewardRibbon;
    public fill: Sprite;
    private width: number;
    private height: number;

    public $ctor(param1?: Sprite, param2?: EventRewardRibbon): void {
        super.$ctor();
        this.width = param1.width;
        this.height = param1.height;
        this.ribbon = param2;
        this.fill = param1;
        this.fill.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnProgressBarSectionMouseOver), false, 0, true);
        this.ribbon.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnProgressBarSectionMouseOver), false, 0, true);
        this.fill.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnProgressBarSectionMouseOut), false, 0, true);
        this.ribbon.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnProgressBarSectionMouseOut), false, 0, true);
        this.OnProgressBarSectionMouseOut();
        this.fill.buttonMode = true;
        this.ribbon.buttonMode = true;
    }

    protected OnProgressBarSectionMouseOut(param1: Event = null): void {
        TweenLite.to(this.ribbon.rewardImage0, 0.25, { "y": 0 });
        TweenLite.to(this.ribbon.rewardRibbon0, 0.25, { "y": 0 });
        this.SendRewardToBack(this.ribbon);
        this.redraw(0);
    }

    protected OnProgressBarSectionMouseOver(param1: Event): void {
        TweenLite.to(this.ribbon.rewardImage0, 0.25, { "y": -50 });
        TweenLite.to(this.ribbon.rewardRibbon0, 0.25, { "y": -50, "onComplete": as3.bind(this, this.BringRewardToFront), "onCompleteParams": [this.ribbon] });
        this.redraw(1);
    }

    private redraw(param1: number): void {
        this.fill.graphics.clear();
        this.fill.graphics.lineStyle(1, 11053224);
        this.fill.graphics.beginFill(MultiRewardReplayableEventUI.k_REWARD_COLOR, param1);
        this.fill.graphics.drawRect(0, 0, this.width, this.height);
    }

    private BringRewardToFront(param1: DisplayObject): void {
    }

    private SendRewardToBack(param1: DisplayObject): void {
    }
}
