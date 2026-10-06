import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, DisplayObject, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BASE, GLOBAL, POPUPS, frame2_background, frame2_bottom_left, frame2_bottom_right, frame2_filler_bottom, frame2_filler_left, frame2_filler_right, frame2_filler_top, frame2_top_left, frame2_top_right, frame3_background, frame3_bottom_left, frame3_bottom_right, frame3_filler_bottom, frame3_filler_left, frame3_filler_right, frame3_filler_top, frame3_top_left, frame3_top_right, frame_button_close, frame_button_help } from "@game";

export class frame extends MovieClip {
    static {
        as3.fields(this, { _customCloseFunction: null, _bottomLeft: null, _bottomRight: null, _topLeft: null, _topRight: null, _fillerLeft: null, _fillerRight: null, _fillerTop: null, _fillerBottom: null, _buttonClose: null, _buttonHelp: null, _background: null, _frameMC: null, _frameDO: null, _backgroundMC: null, _backgroundDO: null });
    }

    public _customCloseFunction: Function;
    private _bottomLeft: Bitmap;
    private _bottomRight: Bitmap;
    private _topLeft: Bitmap;
    private _topRight: Bitmap;
    private _fillerLeft: Bitmap;
    private _fillerRight: Bitmap;
    private _fillerTop: Bitmap;
    private _fillerBottom: Bitmap;
    private _buttonClose: Bitmap;
    private _buttonHelp: Bitmap;
    private _background: Bitmap;
    private _frameMC: MovieClip;
    private _frameDO: DisplayObject;
    private _backgroundMC: MovieClip;
    private _backgroundDO: DisplayObject;

    public $ctor(param1: boolean = true): void {
        super.$ctor();
        if (param1) {
            this.Setup();
        }
    }

    public Setup(param1: boolean = true, param2: Function = null): void {
        let _loc4_: MovieClip = null;
        let _loc5_: int = 0;
        this.Clear();
        this._customCloseFunction = param2;
        let _loc3_: boolean = false;
        if (_loc3_) {
            this._buttonHelp = new Bitmap(new frame_button_help(0, 0));
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            this._bottomLeft = new Bitmap(new frame3_bottom_left(0, 0));
            this._bottomRight = new Bitmap(new frame3_bottom_right(0, 0));
            this._topLeft = new Bitmap(new frame3_top_left(0, 0));
            this._topRight = new Bitmap(new frame3_top_right(0, 0));
            this._fillerTop = new Bitmap(new frame3_filler_top(0, 0));
            this._fillerLeft = new Bitmap(new frame3_filler_left(0, 0));
            this._fillerRight = new Bitmap(new frame3_filler_right(0, 0));
            this._fillerBottom = new Bitmap(new frame3_filler_bottom(0, 0));
            this._background = new Bitmap(new frame3_background(0, 0));
            this._buttonClose = new Bitmap(new frame_button_close(0, 0));
            this.resize();
        } else {
            this._bottomLeft = new Bitmap(new frame2_bottom_left(0, 0));
            this._bottomRight = new Bitmap(new frame2_bottom_right(0, 0));
            this._topLeft = new Bitmap(new frame2_top_left(0, 0));
            this._topRight = new Bitmap(new frame2_top_right(0, 0));
            this._fillerTop = new Bitmap(new frame2_filler_top(0, 0));
            this._fillerLeft = new Bitmap(new frame2_filler_left(0, 0));
            this._fillerRight = new Bitmap(new frame2_filler_right(0, 0));
            this._fillerBottom = new Bitmap(new frame2_filler_bottom(0, 0));
            this._background = new Bitmap(new frame2_background(0, 0));
            this._buttonClose = new Bitmap(new frame_button_close(0, 0));
            this.resize();
        }
        this._frameMC = new MovieClip();
        this._frameMC.mouseEnabled = false;
        this._frameMC.addChild(this._background);
        this._frameMC.addChild(this._fillerTop);
        if (this.height > 100) {
            this._frameMC.addChild(this._fillerLeft);
        }
        if (this.height > 95) {
            this._frameMC.addChild(this._fillerRight);
        }
        this._frameMC.addChild(this._fillerBottom);
        this._frameMC.addChild(this._bottomLeft);
        this._frameMC.addChild(this._bottomRight);
        this._frameMC.addChild(this._topLeft);
        this._frameMC.addChild(this._topRight);
        if (param1) {
            (_loc4_ = new MovieClip()).addChild(this._buttonClose);
            _loc4_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BtnClose));
            _loc4_.buttonMode = true;
            this._frameMC.addChild(_loc4_);
        }
        if (param1 && _loc3_) {
            (_loc4_ = new MovieClip()).addChild(this._buttonHelp);
            _loc4_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BtnHelp));
            _loc4_.buttonMode = true;
            this._frameMC.addChild(_loc4_);
        }
        if (this.parent) {
            this._frameDO = this.parent.addChild(this._frameMC);
            _loc5_ = this.parent.getChildIndex(this);
            this.parent.setChildIndex(this._frameDO, _loc5_);
        }
        this.visible = false;
    }

    protected resized(param1: Event): void {
    }

    public Clear(): void {
        if (Boolean(this._bottomLeft) && Boolean(this._bottomLeft.bitmapData)) {
            this._bottomLeft.bitmapData.dispose();
            this._bottomLeft.bitmapData = null;
        }
        if (Boolean(this._bottomRight) && Boolean(this._bottomRight.bitmapData)) {
            this._bottomRight.bitmapData.dispose();
            this._bottomRight.bitmapData = null;
        }
        if (Boolean(this._topLeft) && Boolean(this._topLeft.bitmapData)) {
            this._topLeft.bitmapData.dispose();
            this._topLeft.bitmapData = null;
        }
        if (Boolean(this._topRight) && Boolean(this._topRight.bitmapData)) {
            this._topRight.bitmapData.dispose();
            this._topRight.bitmapData = null;
        }
        if (Boolean(this._fillerTop) && Boolean(this._fillerTop.bitmapData)) {
            this._fillerTop.bitmapData.dispose();
            this._fillerTop.bitmapData = null;
        }
        if (Boolean(this._fillerLeft) && Boolean(this._fillerLeft.bitmapData)) {
            this._fillerLeft.bitmapData.dispose();
            this._fillerLeft.bitmapData = null;
        }
        if (Boolean(this._fillerRight) && Boolean(this._fillerRight.bitmapData)) {
            this._fillerRight.bitmapData.dispose();
            this._fillerRight.bitmapData = null;
        }
        if (Boolean(this._fillerBottom) && Boolean(this._fillerBottom.bitmapData)) {
            this._fillerBottom.bitmapData.dispose();
            this._fillerBottom.bitmapData = null;
        }
        if (Boolean(this._background) && Boolean(this._background.bitmapData)) {
            this._background.bitmapData.dispose();
            this._background.bitmapData = null;
        }
        if (Boolean(this._buttonClose) && Boolean(this._buttonClose.bitmapData)) {
            this._buttonClose.bitmapData.dispose();
            this._buttonClose.bitmapData = null;
        }
        try {
            if (this._frameDO.parent) {
                this._frameDO.parent.removeChild(this._frameDO);
            }
            if (this._backgroundDO.parent) {
                this._backgroundDO.parent.removeChild(this._backgroundDO);
            }
        } catch (e) {
        }
    }

    private BtnClose(param1: MouseEvent = null): void {
        if ("Hide" in this.parent) {
            (as3.as(this.parent, Object)).Hide();
        } else if (Boolean(this._customCloseFunction)) {
            this._customCloseFunction();
        } else {
            POPUPS.Next();
        }
        if (this.parent) {
            this.parent.dispatchEvent(new Event(Event.CLOSE));
        }
    }

    public resize(): void {
        if (BASE.isInfernoMainYardOrOutpost) {
            this._topLeft.x = this.x - 31;
            this._topLeft.y = this.y - 18;
            this._topRight.x = this.x + this.width - 80;
            this._topRight.y = this.y - 18;
            this._bottomLeft.x = this.x - 31;
            this._bottomLeft.y = this.y + this.height - 69 + 20;
            this._bottomRight.x = this.x + this.width - 80;
            this._bottomRight.y = this.y + this.height - 66 + 17;
            this._background.x = this.x + 10;
            this._background.y = this.y + 10;
            this._background.width = this.width - 20;
            this._background.height = this.height - 20;
            this._buttonClose.x = this.x + this.width - 32;
            this._buttonClose.y = this.y - 5;
            if (this._buttonHelp) {
                this._buttonHelp.x = this.x + this.width - 55;
            }
            if (this._buttonHelp) {
                this._buttonHelp.y = this.y - 5;
            }
            this._fillerTop.x = this.x + 56;
            this._fillerTop.y = this.y - 7;
            this._fillerTop.width = this.width - 105;
            this._fillerLeft.x = this.x - 8;
            this._fillerLeft.y = this.y + 50;
            this._fillerLeft.height = this.height - 80;
            this._fillerRight.x = this.x + this.width - 16;
            this._fillerRight.y = this.y + 50;
            this._fillerRight.height = this.height - 95;
            this._fillerBottom.x = this.x + 40;
            this._fillerBottom.y = this.y + this.height - 11;
            this._fillerBottom.width = this.width - 90;
        } else {
            this._topLeft.x = this.x - 11;
            this._topLeft.y = this.y - 10;
            this._topRight.x = this.x + this.width - 66 + 11;
            this._topRight.y = this.y - 9;
            this._bottomLeft.x = this.x - 12;
            this._bottomLeft.y = this.y + this.height - 69 + 15;
            this._bottomRight.x = this.x + this.width - 68 + 11;
            this._bottomRight.y = this.y + this.height - 66 + 16;
            this._background.x = this.x + 10;
            this._background.y = this.y + 10;
            this._background.width = this.width - 20;
            this._background.height = this.height - 20;
            this._buttonClose.x = this.x + this.width - 20;
            this._buttonClose.y = this.y - 10;
            if (this._buttonHelp) {
                this._buttonHelp.x = this.x + this.width - 48;
            }
            if (this._buttonHelp) {
                this._buttonHelp.y = this.y - 11;
            }
            this._fillerTop.x = this.x + 56;
            this._fillerTop.y = this.y - 7;
            this._fillerTop.width = this.width - 105;
            this._fillerLeft.x = this.x - 8;
            this._fillerLeft.y = this.y + 50;
            this._fillerLeft.height = this.height - 100;
            this._fillerRight.x = this.x + this.width - 16;
            this._fillerRight.y = this.y + 50;
            this._fillerRight.height = this.height - 95;
            this._fillerBottom.x = this.x + 40;
            this._fillerBottom.y = this.y + this.height - 11;
            this._fillerBottom.width = this.width - 90;
        }
    }

    /**
     * Inferno-only: puts a button just left of this frame's close X, in the same row (the Yard Planner's
     * Full screen). Call again after each Setup(), which clears the frame.
     */
    public ioAddBesideClose(param1: DisplayObject): void {
        if (!this._buttonClose || !this._frameMC) {
            return;
        }
        param1.x = this._buttonClose.x - this._buttonClose.width - 3;
        param1.y = this._buttonClose.y;
        this._frameMC.addChild(param1);
    }

    private BtnHelp(param1: MouseEvent = null): void {
        if ("Help" in this.parent) {
            (as3.as(this.parent, MovieClip)).Help();
        }
    }

    private BtnFullScreen(param1: MouseEvent = null): void {
        GLOBAL.goFullScreen();
        if ("FullScreen" in this.parent) {
            (as3.as(this.parent, MovieClip)).FullScreen();
        }
    }
}
