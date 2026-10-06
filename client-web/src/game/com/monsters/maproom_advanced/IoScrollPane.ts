import * as as3 from "as3";
import { int } from "as3";
import { Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { IoMapUi } from "@game";

/**
 * Inferno-only: a scrolling area for the map room's lists (bookmarks, alliance, filters, search results).
 * Put rows into `content`, then call refresh(height of the rows). Scrolls with the wheel, the bar on the
 * right (drag the handle, or click above / below it) or by dragging the list itself (for fingers).
 */
export class IoScrollPane extends Sprite {
    static {
        as3.fields(this, { content: null, _mask: null, _track: null, _thumb: null, _w: 0, _h: 0, _contentH: 0, _offset: 0, _dragFrom: 0, _pressY: 0, _pressOffset: 0, _pressing: false, onScroll: null, dragged: false });
    }

    public static readonly BAR_W: int = 9;
    public content: Sprite;
    private _mask: Shape;
    private _track: Sprite;
    private _thumb: Sprite;
    private _w: int;
    private _h: int;
    private _contentH: number;
    private _offset: number;
    private _dragFrom: number;
    private _pressY: number;
    private _pressOffset: number;
    private _pressing: boolean;
    /** Called after every scroll with the pane (the Alliances window's Outposts tab loads more near the end). */
    public onScroll: Function;
    /** True while the last press has moved the list: the click that ends it is not a click on a row. */
    public dragged: boolean;

    public $ctor(w?: int, h?: int): void {
        super.$ctor();
        this.content = new Sprite();
        this.addChild(this.content);
        this._mask = new Shape();
        this.addChild(this._mask);
        this.content.mask = this._mask;
        this._track = new Sprite();
        this._track.buttonMode = true;
        this.addChild(this._track);
        this._thumb = new Sprite();
        this._thumb.buttonMode = true;
        this.addChild(this._thumb);
        this.setSize(w, h);
        this.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.onWheel));
        this._track.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onTrack));
        this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onThumbDown));
        this.content.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onPress));
        // Rows' clicks that end a drag of the list are swallowed here, before they reach the rows.
        this.content.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onContentClick), true);
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
    }

    /** The width the rows can use (the bar takes the rest). */
    public get innerWidth(): int {
        return (this._w - IoScrollPane.BAR_W - 2) | 0;
    }

    public get viewHeight(): int {
        return this._h;
    }

    public setSize(w: int, h: int): void {
        this._w = w;
        this._h = h;
        this._mask.graphics.clear();
        this._mask.graphics.beginFill(16711680, 1);
        this._mask.graphics.drawRect(0, 0, w, h);
        this._mask.graphics.endFill();
        this.graphics.clear();
        IoMapUi.hitArea(this.graphics, w, h);
        this.refresh(this._contentH);
    }

    /** The rows have changed: they are this tall now. Keeps the scroll position where it can. */
    public refresh(contentH: number): void {
        this._contentH = contentH;
        this.scrollTo(this._offset);
    }

    public scrollTo(offset: number): void {
        let max: number = Math.max(0, this._contentH - this._h);
        this._offset = Math.max(0, Math.min(max, offset));
        this.content.y = -Math.round(this._offset);
        this.drawBar();
        if (this.onScroll != null) {
            this.onScroll(this);
        }
    }

    /** How far there is still to scroll before the end of the rows. */
    public get remaining(): number {
        return Math.max(0, this._contentH - this._h - this._offset);
    }

    /** Scrolls just enough to show the rows from y to y + h. */
    public reveal(y: number, h: number): void {
        if (y < this._offset) {
            this.scrollTo(y);
        } else if (y + h > this._offset + this._h) {
            this.scrollTo(y + h - this._h);
        }
    }

    public get offset(): number {
        return this._offset;
    }

    private drawBar(): void {
        let x: int = (this._w - IoScrollPane.BAR_W) | 0;
        let thumbH: number = 0;
        let room: number = 0;
        this._track.graphics.clear();
        this._thumb.graphics.clear();
        if (this._contentH <= this._h + 0.5) {
            this._track.visible = this._thumb.visible = false;
            return;
        }
        this._track.visible = this._thumb.visible = true;
        IoMapUi.roundBox(this._track.graphics, x, 0, IoScrollPane.BAR_W, this._h, 13876626, 1, -1, 4);
        thumbH = Math.max(24, this._h * this._h / this._contentH);
        room = this._h - thumbH;
        IoMapUi.roundBox(this._thumb.graphics, x + 1, 0, IoScrollPane.BAR_W - 2, thumbH, IoMapUi.EDGE, 1, -1, 3);
        this._thumb.y = Math.round(room * this._offset / (this._contentH - this._h));
    }

    private onWheel(e: MouseEvent): void {
        e.stopPropagation();
        if (this._contentH > this._h) {
            this.scrollTo(this._offset + (e.delta > 0 ? -1 : 1) * 60);
        }
    }

    private onTrack(e: MouseEvent): void {
        e.stopPropagation();
        this.scrollTo(this._offset + (this.mouseY < this._thumb.y ? -1 : 1) * (this._h - 24));
    }

    private onThumbDown(e: MouseEvent): void {
        e.stopPropagation();
        this._dragFrom = this.mouseY - this._thumb.y;
        this.stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onThumbMove));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onThumbUp));
    }

    private onThumbMove(e: MouseEvent): void {
        let thumbH: number = this._thumb.height;
        let room: number = this._h - thumbH;
        let y: number = Math.max(0, Math.min(room, this.mouseY - this._dragFrom));
        if (room > 0) {
            this.scrollTo(y / room * (this._contentH - this._h));
        }
    }

    private onThumbUp(e: Event = null): void {
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onThumbMove));
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onThumbUp));
        }
    }

    private onPress(e: MouseEvent): void {
        this.dragged = false;
        if (this._contentH <= this._h || !this.stage) {
            return;
        }
        this._pressing = true;
        this._pressY = this.mouseY;
        this._pressOffset = this._offset;
        this.stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onPressMove));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onPressUp));
    }

    private onPressMove(e: MouseEvent): void {
        if (!this._pressing) {
            return;
        }
        if (Math.abs(this.mouseY - this._pressY) > 6) {
            this.dragged = true;
        }
        if (this.dragged) {
            this.scrollTo(this._pressOffset - (this.mouseY - this._pressY));
        }
    }

    private onPressUp(e: Event = null): void {
        this._pressing = false;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onPressMove));
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onPressUp));
        }
    }

    private onContentClick(e: MouseEvent): void {
        if (this.dragged) {
            this.dragged = false;
            e.stopImmediatePropagation();
        }
    }

    private onRemoved(e: Event): void {
        this.onThumbUp();
        this.onPressUp();
    }
}
