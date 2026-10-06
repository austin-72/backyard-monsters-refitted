import * as as3 from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ScrollSetH_CLIP } from "@game";

export class ScrollSetH extends ScrollSetH_CLIP {
    static {
        as3.fields(this, { _defaultScrollWidth: NaN, _content: null, _mask: null, _scroller: null, _track: null });
    }

    private _defaultScrollWidth: number;
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
        this._defaultScrollWidth = this._scroller.width;
        this._track = this.mcBG;
        this._track.width = param2.width;
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onMouseDown));
        this._content.addEventListener(Event.RESIZE, as3.bind(this, this.onContentResize));
        this.onContentResize();
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
}
