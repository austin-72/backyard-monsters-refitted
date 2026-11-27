import * as as3 from "as3";
import { DisplayObject, MovieClip, Stage } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { GLOBAL, IoPinchZoom, ScrollSet, ScrollSetH_CLIP } from "@game";

export class ScrollSetH extends ScrollSetH_CLIP {
    static {
        as3.fields(this, { _defaultScrollWidth: NaN, _content: null, _mask: null, _scroller: null, _track: null, _ioPress: NaN, _ioPressContent: NaN, _ioSwiped: false, _ioSwipeStage: null });
    }

    private _defaultScrollWidth: number;
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
        this._defaultScrollWidth = this._scroller.width;
        this._track = this.mcBG;
        this._track.width = param2.width;
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onMouseDown));
        this._content.addEventListener(Event.RESIZE, as3.bind(this, this.onContentResize));
        this.onContentResize();
        // (Inferno-only, QoL #545: swipe to scroll: a finger dragging the row sideways moves it, and the bar with it;
        // the tap that ends a swipe is no click on an item)
        if (GLOBAL.INFERNO_ONLY) {
            this._content.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ioSwipeDown));
            this._content.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioSwipeClick), true);
            // (27 November: and the mouse wheel over it)
            IoPinchZoom.wheel(this, this._mask, (steps: number): boolean => {
                return this.ioScrollBy(-steps * ScrollSet.IO_WHEEL_STEP);
            });
        }
    }

    protected onContentResize(param1: Event = null): void {
        this.visible = this._content.width <= this._mask.width ? false : true;
        this.updateScrollerSize();
    }

    protected onMouseDown(param1: MouseEvent): void {
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
        this._scroller.startDrag(false, new Rectangle(0, this._scroller.y, this.width - this._scroller.width, 0));
    }

    protected onMouseUp(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
        this._scroller.stopDrag();
    }

    protected onEnterFrame(param1: Event): void {
        let _loc2_: number = this._scroller.x / (this.width - this._scroller.width);
        this._content.x = this._mask.x + _loc2_ * -(this._content.width - this._mask.width);
    }

    private updateScrollerSize(): void {
        this._scroller.width = this._defaultScrollWidth * (this._mask.width / this._content.width);
    }

    /** How far the row can scroll (0: it fits). */
    private ioRange(): number {
        return Number(this._content.width - this._mask.width);
    }

    private ioSwipeDown(param1: MouseEvent): void {
        this._ioSwiped = false;
        if (!IoPinchZoom.fingerDown || !this.stage || !this.visible || !this._content.parent || this.ioRange() <= 0) {
            return;
        }
        this.ioSwipeEnd();
        this._ioPress = this._content.parent.mouseX;
        this._ioPressContent = this._content.x;
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
        let d: number = this._content.parent.mouseX - this._ioPress;
        if (!this._ioSwiped && Math.abs(d) > 8) {
            this._ioSwiped = true;
        }
        let range: number = this.ioRange();
        if (!this._ioSwiped || range <= 0) {
            return;
        }
        this.ioPlace(this._ioPressContent + d);
    }

    /** 27 November: the wheel: the content moved by d (up / left negative); whether it moved. */
    private ioScrollBy(d: number): boolean {
        if (!this.stage || !this.visible || this.ioRange() <= 0) {
            return false;
        }
        let was: number = this._content.x;
        this.ioPlace(was + d);
        return this._content.x != was;
    }

    /** The content at x (kept within its range), and the bar where its own drag would have put it. */
    private ioPlace(x: number): void {
        let range: number = this.ioRange();
        x = Math.max(this._mask.x - range, Math.min(this._mask.x, x));
        this._content.x = Math.round(x);
        // (the bar where its own drag would have put the row: onEnterFrame the other way round)
        let room: number = this.width - this._scroller.width;
        if (room > 0) {
            this._scroller.x = Math.max(0, Math.min(room, (this._mask.x - x) / range * room));
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
