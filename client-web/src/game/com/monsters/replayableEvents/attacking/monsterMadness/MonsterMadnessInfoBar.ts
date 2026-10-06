import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { Timer } from "flash/utils";
import { BASE, Chat, GLOBAL, ImageCache, KEYS, MonsterMadness, MonsterMadnessBar_CLIP } from "@game";

export class MonsterMadnessInfoBar extends MonsterMadnessBar_CLIP {
    static {
        as3.fields(this, { points: 0, _timer: null, eventstage: 0, _finalcountdown: 86400, _image: null, BASEIMAGEURL: "specialevent/monstermadness/" });
    }

    public points: int;
    public _timer: Timer;
    public eventstage: int;
    private _finalcountdown: int;
    private _image: string;
    private BASEIMAGEURL: string;

    public $ctor(): void {
        super.$ctor();
    }

    public static ShowEventPopup(param1: MouseEvent = null): void {
        MonsterMadness.showPopup(true);
    }

    public Setup(): void {
        if (MonsterMadness.stage <= 0) {
            return;
        }
        this.addEventListener(MouseEvent.CLICK, MonsterMadnessInfoBar.ShowEventPopup);
        this.buttonMode = true;
        this.mouseChildren = false;
        this.bActionTxt.htmlText = KEYS.Get("btn_info");
        this.bActionTxt.mouseEnabled = false;
        this.bAction.addEventListener(MouseEvent.CLICK, MonsterMadnessInfoBar.ShowEventPopup);
        let _loc1_: int = 1;
        if (BASE.isInfernoMainYardOrOutpost) {
            _loc1_ = 2;
        }
        this.mcBG.gotoAndStop(_loc1_);
        this.bAction.gotoAndStop(_loc1_);
        this.Update();
        GLOBAL._layerUI.addChild(this);
    }

    public Update(): void {
        if (MonsterMadness.stage > 1) {
            this.gotoAndStop(2);
        } else {
            this.gotoAndStop(1);
        }
        this.updateText();
        this.updateImage();
        this.Resize();
    }

    public updateText(): void {
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc1_: int = MonsterMadness.stage | 0;
        let _loc2_: int = MonsterMadness.timeUntilNextPhase | 0;
        let _loc3_: string = GLOBAL.ToTime(_loc2_);
        this.tLabel.htmlText = "<b>" + _loc3_ + "</b>";
        if (_loc1_ > 1 && _loc1_ < 5) {
            _loc4_ = 0;
            _loc5_ = MonsterMadness.points | 0;
            _loc6_ = MonsterMadness.POINTS_GOAL1;
            if (_loc1_ == 2) {
                _loc6_ = MonsterMadness.POINTS_GOAL1;
                _loc7_ = KEYS.Get("mm_infobar_progressbar");
            } else if (_loc1_ == 3) {
                _loc6_ = (MonsterMadness.POINTS_GOAL2 - MonsterMadness.POINTS_GOAL1) | 0;
                _loc5_ = (MonsterMadness.points - MonsterMadness.POINTS_GOAL1) | 0;
                _loc7_ = KEYS.Get("mm_infobar_progressbar2");
            } else if (_loc1_ == 4) {
                _loc6_ = (MonsterMadness.POINTS_GOAL3 - MonsterMadness.POINTS_GOAL2) | 0;
                _loc5_ = (MonsterMadness.points - MonsterMadness.POINTS_GOAL2) | 0;
                _loc7_ = KEYS.Get("mm_infobar_progressbar3");
            }
            _loc4_ = Math.min(100, (_loc5_ / _loc6_ * 100) | 0);
            this.barProgressTxt.htmlText = "" + _loc7_ + _loc4_ + " %" + "";
            this.barProgress.mcBar.width = Math.min(100, 100 / _loc6_ * _loc5_);
        }
    }

    public updateImage(): void {
        let _loc1_: int = MonsterMadness.stage | 0;
        let _loc2_: string = "1";
        if (_loc1_ == 3) {
            _loc2_ = "2.v4";
        } else if (_loc1_ == 4) {
            _loc2_ = "3.v3";
        } else {
            _loc2_ = "1.v3";
        }
        if (this._image != this.BASEIMAGEURL + "mm_infoicon_" + _loc2_ + ".png") {
            this._image = this.BASEIMAGEURL + "mm_infoicon_" + _loc2_ + ".png";
            ImageCache.GetImageWithCallBack(this._image, as3.bind(this, this.onImageLoaded));
        }
    }

    public onImageLoaded(param1: string, param2: BitmapData): void {
        while (this.mcImage.numChildren) {
            this.mcImage.removeChildAt(0);
        }
        this.mcImage.addChild(new Bitmap(param2));
    }

    public Hide(): void {
        if (Boolean(this) && Boolean(this.parent)) {
            this.parent.removeChild(this);
        }
    }

    public Resize(): void {
        GLOBAL.RefreshScreen();
        this.x = (GLOBAL._SCREEN.x + 5 + 30) | 0;
        this.y = (GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - this.mcHit.height - 10) | 0;
        if (Boolean(Chat._bymChat) && Boolean(Chat._bymChat.chatBox.background)) {
            this.y = (Chat._bymChat.y + Chat._bymChat.chatBox.y + Chat._bymChat.chatBox.background.y - 53) | 0;
        }
    }
}
