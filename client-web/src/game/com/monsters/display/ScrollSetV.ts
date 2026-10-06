import * as as3 from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ScrollSet_CLIP } from "@game";

export class ScrollSetV extends ScrollSet_CLIP {
    static {
        as3.fields(this, { _defaultScrollHeight: NaN, _content: null, _mask: null, _scroller: null, _track: null });
    }

    private _defaultScrollHeight: number;
    private _content: DisplayObject;
    private _mask: DisplayObject;
    private _scroller: MovieClip;
    private _track: DisplayObject;

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
}
