import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Timer } from "flash/utils";
import { BASE, Chat, EventsBar_CLIP, GLOBAL, IReplayableEventUI, ImageCache, KEYS, ReplayableEvent } from "@game";

export class ReplayableEventUI extends EventsBar_CLIP implements IReplayableEventUI {
    static {
        as3.implement(this, [IReplayableEventUI]);
        as3.fields(this, { points: 0, _timer: null, _phase: 0, _finalcountdown: 86400, _image: null, _titlelogo: null, _event: null, BASEIMAGEURL: "specialevent/", eventText_tLabel: null, eventText_barProgressTxt: null, eventText_bActionTxt: null });
    }

    public static CLICKED_ACTION: string = "eventBarAction";

    public static CLICKED_INFO: string = "eventBarInfo";
    private points: int;
    private _timer: Timer;
    private _phase: int;
    private _finalcountdown: int;
    private _image: string;
    private _titlelogo: string;
    private _event: ReplayableEvent;
    private BASEIMAGEURL: string;
    private eventText_tLabel: any[];
    private eventText_barProgressTxt: any[];
    private eventText_bActionTxt: any[];

    public $ctor(): void {
        this.eventText_tLabel = ["tLabel", "tLabel"];
        this.eventText_barProgressTxt = ["fp_infobar_progressbar", "fp_infobar_progressbar"];
        this.eventText_bActionTxt = ["btn_info", "btn_info"];
        super.$ctor();
    }

    public get eventUI(): DisplayObject {
        return this;
    }

    public setup(param1: ReplayableEvent): void {
        this._event = param1;
        this.bHelp.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowInfoPopup));
        this.bHelp.buttonMode = true;
        let _loc2_: int = 1;
        if (BASE.isInfernoMainYardOrOutpost) {
            _loc2_ = 2;
        }
        this.mcBG.gotoAndStop(_loc2_);
        this.bAction.gotoAndStop(_loc2_);
        this.mcLogo.visible = false;
        this.mcLogo.enabled = false;
        this.mcLogo.mouseEnabled = false;
        this.gotoAndStop(this.phase);
        if (Boolean(this._event.buttonCopy) && this.phase > 1) {
            this.bActionTxt.htmlText = this._event.buttonCopy;
            this.bActionTxt.mouseEnabled = false;
            this.bActionTxt.visible = true;
            this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowEventPopup));
            this.bAction.buttonMode = true;
            this.bAction.visible = true;
            this.bAction.enabled = true;
            this.mcBG.width = 290;
            this.bHelp.x = 272;
        } else {
            this.bActionTxt.mouseEnabled = false;
            this.bActionTxt.visible = false;
            this.bAction.visible = false;
            this.bAction.enabled = false;
            this.mcBG.width = 290;
            this.bHelp.x = 272;
        }
        this.updateImage();
    }

    public update(): void {
        this.Tick();
    }

    private Tick(param1: any = null): void {
        this.updateText();
        this.Resize();
    }

    private get phase(): number {
        if (this._event.hasEventStarted) {
            this._phase = 2;
        } else {
            this._phase = 1;
        }
        return this._phase;
    }

    private updateText(): void {
        let _loc2_: string = null;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: string = null;
        if (this.tTitle) {
            this.tTitle.htmlText = this._event.name;
            this.tTitle.mouseEnabled = false;
            if (this._event.titleImage) {
                this.tTitle.visible = false;
            }
        }
        let _loc1_: int = this._event.timeUntilNextDate | 0;
        if (_loc1_ <= 0) {
            this.tLabel.htmlText = "<b>DATE NOT INITIALIZED!</b>";
        } else {
            _loc2_ = GLOBAL.ToTime(_loc1_, true);
            this.tLabel.htmlText = "<b>" + _loc2_ + "</b>";
        }
        this.tLabel.mouseEnabled = false;
        if (this.currentFrame > 1) {
            _loc3_ = 0;
            _loc4_ = this._event.progress | 0;
            _loc5_ = 1;
            _loc5_ = 1;
            _loc4_ = this._event.progress | 0;
            _loc6_ = this.PhaseKey(this.eventText_barProgressTxt);
            _loc3_ = Math.min(100, Math.floor(this._event.progress * 100));
            this.barProgressTxt.htmlText = "" + _loc6_ + " - " + _loc3_ + " %" + "";
            this.barProgress.mcBar.width = Math.min(100, this._event.progress * 100);
        } else if (this.phase > 1) {
            this.tLabel.htmlText = "<b>" + KEYS.Get("refresh_to_start_event") + "<b>";
        }
    }

    private updateImage(): void {
        let _loc1_: string = null;
        let _loc2_: string = null;
        if (Boolean(this._event.imageURL) && this._event.imageURL != this._image) {
            _loc1_ = this._event.imageURL;
            this._image = _loc1_;
            ImageCache.GetImageWithCallBack(this._image, as3.bind(this, this.onImageLoaded));
        }
        if (!this._event.hasEventStarted && this._event.titleImage && this._event.titleImage != this._titlelogo) {
            _loc2_ = this._event.titleImage;
            this._titlelogo = _loc2_;
            ImageCache.GetImageWithCallBack(this._titlelogo, as3.bind(this, this.onLogoLoaded));
        } else if (this._event.hasEventStarted && this.mcLogo.visible) {
            this.mcLogo.visible = false;
        }
    }

    private onImageLoaded(param1: string, param2: BitmapData): void {
        while (this.mcImage.numChildren) {
            this.mcImage.removeChildAt(0);
        }
        this.mcImage.addChild(new Bitmap(param2));
    }

    private onLogoLoaded(param1: string, param2: BitmapData): void {
        while (this.mcLogo.numChildren) {
            this.mcLogo.removeChildAt(0);
        }
        let _loc3_: Bitmap = new Bitmap(param2);
        _loc3_.y = -5;
        this.mcLogo.addChild(_loc3_);
        this.mcLogo.visible = true;
    }

    private ShowEventPopup(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(ReplayableEventUI.CLICKED_ACTION));
    }

    private ShowInfoPopup(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(ReplayableEventUI.CLICKED_INFO));
    }

    private Hide(): void {
        if (Boolean(this) && Boolean(this.parent)) {
            this.bHelp.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowInfoPopup));
            this.bAction.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowEventPopup));
            this.parent.removeChild(this);
        }
    }

    private Resize(): void {
        GLOBAL.RefreshScreen();
        this.x = (GLOBAL._SCREEN.x + 5 + 30) | 0;
        this.y = (GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - this.mcHit.height - 10) | 0;
        if (Chat._bymChat && Chat._bymChat.chatBox && Boolean(Chat._bymChat.chatBox.background)) {
            this.y = (Chat._bymChat.y + Chat._bymChat.chatBox.y + Chat._bymChat.chatBox.background.y - 53) | 0;
        }
    }

    private PhaseKey(param1: any[], param2: boolean = true): string {
        if (this.phase - 1 < param1.length - 1) {
            if (param2) {
                return KEYS.Get(as3.str(param1[this.phase - 1]));
            }
            return as3.str(param1[this.phase - 1]);
        }
        if (param2) {
            return KEYS.Get(as3.str(param1[param1.length - 1]));
        }
        return as3.str(param1[param1.length - 1]);
    }
}
