import * as as3 from "as3";
import { DisplayObject, MovieClip, Stage } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { GLOBAL, IoPinchZoom, ScrollSet_CLIP } from "@game";

export class ScrollSetV extends ScrollSet_CLIP {
    static {
        as3.fields(this, { _defaultScrollHeight: NaN, _content: null, _mask: null, _scroller: null, _track: null, _ioPress: NaN, _ioPressContent: NaN, _ioSwiped: false, _ioSwipeStage: null });
    }

    private _defaultScrollHeight: number;
    private _content: DisplayObject;
    private _mask: DisplayObject;
    private _scroller: MovieClip;
    private _track: DisplayObject;
    /** Inferno-only (QoL #545): a finger dragging the list itself: where it went down, the list then, if it moved. */
    private _ioPress: number;
    private _ioPressContent: number;
    private _ioSwiped: boolean;
    private _ioSwipeStage: Stage;

    public $ctor(param1?: DisplayObject, param2?: DisplayObject, param3: boolean = false): void {
        super.$ctor();
        this._content = param1;
        this._mask = param2;
        this._scroller = this.mcScroller;
        this._scroller.buttonMode = param3;
        this._defaultScrollHeight = this._scroller.height;
        this._scroller.y = 0;
        this._track = this.mcBG;
        this._track.height = param2.height;
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onMouseDown));
        this._content.addEventListener(Event.RESIZE, as3.bind(this, this.onContentResize));
        this._content.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onContentResize));
        this.onContentResize();
        this.mcScroller.gotoAndStop(1);
        // (Inferno-only, QoL #545: swipe to scroll: a finger dragging the list moves it, and the bar with it; the tap
        // that ends a swipe is no click on a row)
        if (GLOBAL.INFERNO_ONLY) {
            this._content.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ioSwipeDown));
            this._content.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioSwipeClick), true);
        }
    }

    public checkResize(): void {
        this.onContentResize();
    }

    public scrollToBottom(): void {
        this.onContentResize();
        if (this._content.height <= this._mask.height) {
            this._content.y = this._mask.y;
            this._scroller.y = 0;
            return;
        }
        this._content.y = this._mask.y - (this._content.height - this._mask.height);
        this._scroller.y = this.height - this._scroller.height;
    }

    protected onContentResize(param1: Event = null): void {
        this.visible = this._content.height <= this._mask.height ? false : true;
        this.updateScrollerSize();
    }

    protected onMouseDown(param1: MouseEvent): void {
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
        this._scroller.startDrag(false, new Rectangle(this._scroller.x, 0, 0, this.height - this._scroller.height));
    }

    protected onMouseUp(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
        this._scroller.stopDrag();
    }

    protected onEnterFrame(param1: Event): void {
        let _loc2_: number = this._scroller.y / (this.height - this._scroller.height);
        this._content.y = this._mask.y + _loc2_ * -(this._content.height - this._mask.height);
    }

    private updateScrollerSize(): void {
        this._scroller.height = this._defaultScrollHeight * (this._mask.height / this._content.height);
        this._track.height = this._mask.height;
        if (this._content.y < -this._content.height || this._content.height <= this._mask.height) {
            this._content.y = 0;
            this._scroller.y = 0;
        }
    }

    /** How far the list can scroll (0: it fits). */
    private ioRange(): number {
        return Number(this._content.height - this._mask.height);
    }

    private ioSwipeDown(param1: MouseEvent): void {
        this._ioSwiped = false;
        if (!IoPinchZoom.fingerDown || !this.stage || !this.visible || !this._content.parent || this.ioRange() <= 0) {
            return;
        }
        this.ioSwipeEnd();
        this._ioPress = this._content.parent.mouseY;
        this._ioPressContent = this._content.y;
        this._ioSwipeStage = this.stage;
        this._ioSwipeStage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioSwipeMove));
        this._ioSwipeStage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioSwipeEnd));
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioSwipeEnd));
    }

    private ioSwipeMove(param1: MouseEvent): void {
        if (!this._content.parent) {
            this.ioSwipeEnd();
            return;
        }
        let d: number = this._content.parent.mouseY - this._ioPress;
        if (!this._ioSwiped && Math.abs(d) > 8) {
            this._ioSwiped = true;
        }
        let range: number = this.ioRange();
        if (!this._ioSwiped || range <= 0) {
            return;
        }
        let y: number = Math.max(this._mask.y - range, Math.min(this._mask.y, this._ioPressContent + d));
        this._content.y = Math.round(y);
        // (the bar where its own drag would have put the list: onEnterFrame the other way round)
        let room: number = this.height - this._scroller.height;
        if (room > 0) {
            this._scroller.y = Math.max(0, Math.min(room, (this._mask.y - y) / range * room));
        }
    }

    private ioSwipeEnd(param1: Event = null): void {
        if (this._ioSwipeStage) {
            this._ioSwipeStage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ioSwipeMove));
            this._ioSwipeStage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioSwipeEnd));
            this._ioSwipeStage = null;
        }
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioSwipeEnd));
    }

    private ioSwipeClick(param1: MouseEvent): void {
        if (this._ioSwiped) {
            this._ioSwiped = false;
            param1.stopImmediatePropagation();
        }
    }
}
