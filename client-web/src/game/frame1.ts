import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, DisplayObject, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { GLOBAL, POPUPS, frame1_bottom_left, frame1_bottom_middle, frame1_bottom_right, frame1_button_close, frame1_button_fullscreen, frame1_button_help, frame1_filler_bottom, frame1_filler_left, frame1_filler_right, frame1_filler_top, frame1_top_left, frame1_top_middle, frame1_top_middle_2, frame1_top_right } from "@game";

export class frame1 extends MovieClip {
    static {
        as3.fields(this, { _bottomLeft: null, _bottomRight: null, _topLeft: null, _topRight: null, _topMiddle: null, _bottomMiddle: null, _fillerLeft: null, _fillerRight: null, _fillerTop: null, _fillerBottom: null, _buttonClose: null, _buttonHelp: null, _buttonFullScreen: null, _background: null, _frameMC: null, _frameDO: null, _backgroundMC: null, _backgroundDO: null });
    }

    private _bottomLeft: Bitmap;
    private _bottomRight: Bitmap;
    private _topLeft: Bitmap;
    private _topRight: Bitmap;
    private _topMiddle: Bitmap;
    private _bottomMiddle: Bitmap;
    private _fillerLeft: Bitmap;
    private _fillerRight: Bitmap;
    private _fillerTop: Bitmap;
    private _fillerBottom: Bitmap;
    private _buttonClose: Bitmap;
    private _buttonHelp: Bitmap;
    private _buttonFullScreen: Bitmap;
    private _background: Bitmap;
    private _frameMC: MovieClip;
    private _frameDO: DisplayObject;
    private _backgroundMC: MovieClip;
    private _backgroundDO: DisplayObject;

    public $ctor(): void {
        super.$ctor();
        this.Setup(true, false, false);
    }

    public Setup(param1: boolean = true, param2: boolean = false, param3: boolean = false, param4: int = 1, param5: int = 1, param6: int = 0): void {
        let _loc7_: MovieClip = null;
        this.Clear();
        this._bottomLeft = new Bitmap(new frame1_bottom_left(0, 0));
        this._bottomRight = new Bitmap(new frame1_bottom_right(0, 0));
        this._topLeft = new Bitmap(new frame1_top_left(0, 0));
        this._topRight = new Bitmap(new frame1_top_right(0, 0));
        if (param4 == 1) {
            this._topMiddle = new Bitmap(new frame1_top_middle(0, 0));
        }
        if (param4 == 2) {
            this._topMiddle = new Bitmap(new frame1_top_middle_2(0, 0));
        }
        this._bottomMiddle = new Bitmap(new frame1_bottom_middle(0, 0));
        this._fillerTop = new Bitmap(new frame1_filler_top(0, 0));
        this._fillerLeft = new Bitmap(new frame1_filler_left(0, 0));
        this._fillerRight = new Bitmap(new frame1_filler_right(0, 0));
        this._fillerBottom = new Bitmap(new frame1_filler_bottom(0, 0));
        if (param1) {
            this._buttonClose = new Bitmap(new frame1_button_close(0, 0));
        }
        if (param2) {
            this._buttonHelp = new Bitmap(new frame1_button_help(0, 0));
        }
        if (param3) {
            this._buttonFullScreen = new Bitmap(new frame1_button_fullscreen(0, 0));
        }
        this._topRight.x = this.x + this.width - 123 + 10;
        this._topRight.y = this.y - 8;
        this._topLeft.x = this.x - 12;
        this._topLeft.y = this.y - 10;
        this._bottomLeft.x = this.x - 8;
        this._bottomLeft.y = this.y + this.height - 64 + 15;
        this._bottomRight.x = this.x + this.width - 112 + 12;
        this._bottomRight.y = this.y + this.height - 158 + 12;
        this._topMiddle.x = this.x + ((this.width * 0.5) | 0) - 140;
        if (param4 == 1) {
            this._topMiddle.y = this.y - 11;
        }
        if (param4 == 2) {
            this._topMiddle.y = this.y - 15;
        }
        this._bottomMiddle.x = this.x + ((this.width * 0.5) | 0) - 195;
        this._bottomMiddle.y = this.y + this.height - 14;
        if (param1) {
            this._buttonClose.x = this.x + this.width - 20;
        }
        if (param1) {
            this._buttonClose.y = this.y - 7;
        }
        if (param2) {
            this._buttonHelp.x = this.x + this.width - 50;
        }
        if (param2) {
            this._buttonHelp.y = this.y - 7;
        }
        if (param3 && param2) {
            this._buttonFullScreen.x = this.x + this.width - 80;
        }
        if (param3 && !param2) {
            this._buttonFullScreen.x = this.x + this.width - 50;
        }
        if (param3) {
            this._buttonFullScreen.y = this.y - 7;
        }
        this._fillerTop.x = this.x + 42;
        this._fillerTop.y = this.y - 5;
        this._fillerTop.width = this.width - 153;
        this._fillerLeft.x = this.x - 4;
        this._fillerLeft.y = this.y + 172;
        this._fillerLeft.height = this.height - 219;
        this._fillerRight.x = this.x + this.width - 14;
        this._fillerRight.y = this.y + 39;
        this._fillerRight.height = this.height - 158;
        this._fillerBottom.x = this.x + 50;
        this._fillerBottom.y = this.y + this.height - 10;
        this._fillerBottom.width = this.width - 100;
        this._frameMC = new MovieClip();
        this._frameMC.mouseEnabled = false;
        this._frameMC.addChild(this._fillerTop);
        if (this.height - 219 > 0) {
            this._frameMC.addChild(this._fillerLeft);
        }
        if (this.height - 216 > 0) {
            this._frameMC.addChild(this._fillerRight);
        }
        this._frameMC.addChild(this._fillerBottom);
        this._frameMC.addChild(this._bottomLeft);
        this._frameMC.addChild(this._bottomRight);
        this._frameMC.addChild(this._topLeft);
        this._frameMC.addChild(this._topRight);
        if (param4 > 0) {
            this._frameMC.addChild(this._topMiddle);
        }
        if (param5 > 0) {
            this._frameMC.addChild(this._bottomMiddle);
        }
        this._backgroundMC = new MovieClip();
        if (param1) {
            (_loc7_ = new MovieClip()).addChild(this._buttonClose);
            _loc7_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BtnClose));
            _loc7_.buttonMode = true;
            this._frameMC.addChild(_loc7_);
        }
        if (param2) {
            (_loc7_ = new MovieClip()).addChild(this._buttonHelp);
            _loc7_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BtnHelp));
            _loc7_.buttonMode = true;
            this._frameMC.addChild(_loc7_);
        }
        if (param3) {
            (_loc7_ = new MovieClip()).addChild(this._buttonFullScreen);
            _loc7_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BtnFullScreen));
            _loc7_.buttonMode = true;
            this._frameMC.addChild(_loc7_);
        }
        this._frameDO = this.parent.addChild(this._frameMC);
        let _loc8_: int = this.parent.getChildIndex(this);
        this.parent.setChildIndex(this._frameDO, _loc8_);
        this._backgroundDO = this.parent.addChild(this._backgroundMC);
        this.parent.setChildIndex(this._backgroundDO, param6);
        this.visible = false;
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
        if (Boolean(this._topMiddle) && Boolean(this._topMiddle.bitmapData)) {
            this._topMiddle.bitmapData.dispose();
            this._topMiddle.bitmapData = null;
        }
        if (Boolean(this._bottomMiddle) && Boolean(this._bottomMiddle.bitmapData)) {
            this._bottomMiddle.bitmapData.dispose();
            this._bottomMiddle.bitmapData = null;
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
        if (Boolean(this._buttonHelp) && Boolean(this._buttonHelp.bitmapData)) {
            this._buttonHelp.bitmapData.dispose();
            this._buttonHelp.bitmapData = null;
        }
        if (Boolean(this._buttonFullScreen) && Boolean(this._buttonFullScreen.bitmapData)) {
            this._buttonFullScreen.bitmapData.dispose();
            this._buttonFullScreen.bitmapData = null;
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
            (as3.as(this.parent, MovieClip)).Hide();
        } else {
            POPUPS.Next();
        }
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
