import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { GLOBAL, ScrollSet_CLIP, TweenLite } from "@game";

export class ScrollSet extends ScrollSet_CLIP {
    static {
        as3.fields(this, { _IsInitialized: false, _Container: null, _ContainerHeight: 0, _Mask: null, _ScrollBarHeight: NaN, _OffsetY: 0, _Easing: 1, _Margin: 1, _Thresh: 0.03, _BottomPadding: 0, _AutoHideEnabled: true, isHiddenWhileUnnecessary: false, _MinScrollerHeight: NaN, _IsDragging: false });
    }

    public static readonly BROWN: int = 0;

    public static readonly GREY: int = 1;

    private static readonly NUM_COLORS: int = 2;
    private _IsInitialized: boolean;
    private _Container: Sprite;
    private _ContainerHeight: int;
    private _Mask: MovieClip;
    private _ScrollBarHeight: number;
    private _OffsetY: number;
    private _Easing: number;
    private _Margin: number;
    private _Thresh: number;
    private _BottomPadding: number;
    private _AutoHideEnabled: boolean;
    public isHiddenWhileUnnecessary: boolean;
    private _MinScrollerHeight: number;
    private _IsDragging: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public Init(param1: Sprite, param2: MovieClip, param3: int = 0, param4: number = 0, param5: number = 128, param6: number = 30, param7: number = 0): void {
        let _loc8_: number = NaN;
        this._Container = param1;
        this._ContainerHeight = param1.height | 0;
        this._Mask = param2;
        this._ScrollBarHeight = param5;
        this._MinScrollerHeight = param6;
        this._OffsetY = param4;
        this._BottomPadding = param7;
        param3 = GLOBAL.InfernoMode() ? 1 : 0;
        if (param3 < 0 || param3 >= ScrollSet.NUM_COLORS) {
            return;
        }
        switch (param3) {
            case ScrollSet.BROWN:
                this.mcScroller.gotoAndStop(1);
                break;
            case ScrollSet.GREY:
                this.mcScroller.gotoAndStop(2);
        }
        this.mcScroller.y = this._Margin;
        this.mcBG.height = param5;
        this.mcScroller.useHandCursor = true;
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Show), false, 0, true);
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Hide), false, 0, true);
        this._Container.addEventListener(Event.RESIZE, as3.bind(this, this.onResize), false, 0, true);
        this.mcScroller.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ScrollerDown), false, 0, true);
        if (Boolean(this.parent) && param1.height < this._Mask.height) {
            this.parent.removeChild(this);
        } else {
            if (param1.height == 0) {
                param1.height = 1;
            }
            _loc8_ = param5 * (param2.height / param1.height);
            this.mcScroller.height = _loc8_ < param6 ? param6 : _loc8_;
            this.Show();
        }
        this._IsInitialized = true;
    }

    protected onResize(param1: MouseEvent): void {
        this.Update();
    }

    public Update(): void {
        this.ResizeScroller();
        if (this._Mask.height != this._ScrollBarHeight) {
            this.ResizeScrollBar();
        }
        this._ContainerHeight = this._Container.height | 0;
        if (this.mcScroller.height + this.mcScroller.y > this._Mask.height) {
            this.mcScroller.y = this._Mask.height - this.mcScroller.height;
        }
        if (this.isHiddenWhileUnnecessary) {
            if (this._ContainerHeight <= this._Mask.height) {
                this.visible = false;
            } else {
                this.visible = true;
            }
        }
        let _loc1_: int = GLOBAL.InfernoMode() ? 1 : 0;
        if (_loc1_ < 0 || _loc1_ >= ScrollSet.NUM_COLORS) {
            return;
        }
        switch (_loc1_) {
            case ScrollSet.BROWN:
                this.mcScroller.gotoAndStop(1);
                break;
            case ScrollSet.GREY:
                this.mcScroller.gotoAndStop(2);
        }
    }

    private ResizeScroller(): void {
        let _loc1_: number = this._Mask.height / this._Container.height;
        _loc1_ = Math.min(_loc1_, 1);
        let _loc2_: number = this.mcBG.height * _loc1_;
        _loc2_ = _loc2_ < this._MinScrollerHeight ? this._MinScrollerHeight : _loc2_;
        _loc2_ = Math.min(_loc2_, this._ScrollBarHeight);
        this.mcScroller.height = _loc2_;
    }

    private ResizeScrollBar(): void {
        this._ScrollBarHeight = this._Mask.height;
        this.mcBG.height = this._Mask.height;
    }

    private ScrollerDown(param1: MouseEvent): void {
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.OnStageUp));
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.OnDrag));
        let _loc2_: Rectangle = new Rectangle(this.mcScroller.x, this.mcBG.y + this._Margin, 0, this.mcBG.height - this.mcScroller.height - 2 * this._Margin);
        this.mcScroller.startDrag(false, _loc2_);
        this._IsDragging = true;
    }

    private OnDrag(param1: Event = null): void {
        let _loc4_: int = 0;
        let _loc2_: number = (this._Margin + this.mcScroller.y) / (this.mcBG.height - this.mcScroller.height - this._Margin);
        if (_loc2_ < this._Thresh) {
            _loc2_ = 0;
        }
        if (_loc2_ > 1 - this._Thresh) {
            _loc2_ = 1;
        }
        let _loc3_: number = this._OffsetY - _loc2_ * (this._ContainerHeight - this._Mask.height + this._BottomPadding);
        if (this._Easing != 0) {
            _loc4_ = (this._Container.y - (this._Container.y - _loc3_) / this._Easing) | 0;
            this._Container.y = _loc4_;
        } else {
            this._Container.y = _loc3_ | 0;
        }
    }

    private OnStageUp(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.OnDrag));
        this.mcScroller.stopDrag();
        this._IsDragging = false;
    }

    public Show(param1: MouseEvent = null): void {
        TweenLite.to(this, 0.3, { "alpha": 1 });
    }

    public Hide(param1: MouseEvent = null): void {
        if (!this._IsDragging && this._AutoHideEnabled) {
            TweenLite.to(this, 0.3, { "alpha": 0.2 });
        }
    }

    public Resync(): void {
        this.OnDrag();
    }

    public ScrollTo(param1: number, param2: boolean = false): void {
        let oldEase: number = NaN;
        let tgtY: number = NaN;
        oldEase = NaN;
        let pctY: number = param1;
        let instant: boolean = param2;
        if (!this._IsInitialized) {
            return;
        }
        TweenLite.killTweensOf(this.mcScroller);
        oldEase = this._Easing;
        this._Easing = 1;
        tgtY = pctY * (this.mcBG.height - this.mcScroller.height - this._Margin) + this._Margin;
        if (instant) {
            this.mcScroller.y = tgtY;
            this.OnDrag();
        } else {
            TweenLite.to(this.mcScroller, 0.6, { "y": tgtY, "onUpdate": as3.bind(this, this.OnDrag), "onComplete": (): void => {
                this._Easing = oldEase;
            } });
        }
    }

    public get AutoHideEnabled(): boolean {
        return this._AutoHideEnabled;
    }

    public set AutoHideEnabled(param1: boolean) {
        this._AutoHideEnabled = param1;
    }

    public get BottomPadding(): number {
        return this._BottomPadding;
    }

    public set BottomPadding(param1: number) {
        this._BottomPadding = param1;
    }

    public get ContainerHeight(): number {
        return this._ContainerHeight;
    }

    public set ContainerHeight(param1: number) {
        this._ContainerHeight = param1 | 0;
    }

    public get ScrollerBarHeight(): number {
        return this._ScrollBarHeight;
    }

    public set ScrollerBarHeight(param1: number) {
        this._ScrollBarHeight = param1;
    }

    public get Easing(): number {
        return this._Easing;
    }

    public set Easing(param1: number) {
        this._Easing = param1;
    }

    public get IsDragging(): boolean {
        return this._IsDragging;
    }
}
