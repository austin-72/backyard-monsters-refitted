import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, Graphics, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { ColorTransform, Point } from "flash/geom";
import { GLOBAL, IoMapLod, IoMapSnapshot, IoMapUi, IoUnderworld, LOGIN } from "@game";

/**
 * Inferno-only: the minimap, at the top of the panel right of the map. The whole world small (the world
 * map's terrain), your yards and the portals to the Depths of Hell (light purple) on it, and a box round
 * the part the map shows. Click or drag in it to move the map there.
 */
export class IoMapMinimap extends Sprite {
    static {
        as3.fields(this, { _size: 0, _body: null, _terrain: null, _yards: null, _view: null, _onPick: null, _drawnVersion: -1, _drawnPortals: -1, _dragging: false, _vx: 0, _vy: 0, _vw: 0, _vh: 0 });
    }

    private _size: int;
    private _body: Sprite;
    private _terrain: Bitmap;
    private _yards: Shape;
    private _view: Shape;
    private _onPick: Function;
    private _drawnVersion: int;
    private _drawnPortals: int;
    private _dragging: boolean;
    /** The view box, in cells: middle and size. */
    private _vx: number;
    private _vy: number;
    private _vw: number;
    private _vh: number;

    /**
     * onPick(cellX, cellY, done): the map is to move so that cell is in the middle; done is false while
     * the mouse is still dragging.
     */
    public $ctor(size?: int, onPick?: Function): void {
        super.$ctor();
        this._size = size;
        this._onPick = onPick;
        IoMapUi.roundBox(this.graphics, -3, -3, size + 6, size + 6, 787973, 1, 0x3B2819, 4, 2);
        this._body = new Sprite();
        this._body.buttonMode = true;
        this._body.mouseChildren = false;
        this.addChild(this._body);
        let inner: Sprite = new Sprite();
        this._body.addChild(inner);
        this._terrain = new Bitmap();
        inner.addChild(this._terrain);
        this._yards = new Shape();
        inner.addChild(this._yards);
        this._view = new Shape();
        inner.addChild(this._view);
        let clip: Shape = new Shape();
        clip.graphics.beginFill(16711680, 1);
        clip.graphics.drawRect(0, 0, size, size);
        clip.graphics.endFill();
        this._body.addChild(clip);
        inner.mask = clip;
        IoMapUi.hitArea(this._body.graphics, size, size);
        this._body.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_WHEEL, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.onRemoved));
        this.Redraw();
    }

    public get size(): int {
        return this._size;
    }

    /** Draws the world again when a new snapshot has come. */
    public Redraw(): void {
        let scale: number = NaN;
        let cell: any[] = null;
        let g: Graphics = this._yards.graphics;
        if (!IoMapSnapshot.ready || this._drawnVersion == IoMapSnapshot.version && this._drawnPortals == IoUnderworld.portals.length) {
            return;
        }
        this._drawnVersion = IoMapSnapshot.version;
        this._drawnPortals = IoUnderworld.portals.length;
        this._terrain.bitmapData = IoMapLod.terrain();
        this._terrain.smoothing = true;
        // Small, the world map's dim colours run together: brighter here, so the lava shows.
        this._terrain.transform.colorTransform = new ColorTransform(1.7, 1.5, 1.4);
        scale = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
        this._terrain.scaleX = this._terrain.scaleY = scale;
        g.clear();
        g.lineStyle(1, 0, 0.6);
        for (cell of as3.values(IoMapSnapshot.cells)) {
            if ((cell[2] | 0) >= 2 && (cell[3] | 0) == LOGIN._playerID) {
                g.beginFill(IoMapUi.relationColour(IoMapUi.YOU), 1);
                g.drawCircle(((cell[0] | 0) + 0.5) * scale, ((cell[1] | 0) + 0.5) * scale, (cell[2] | 0) == 2 ? 2.5 : 1.6);
                g.endFill();
            }
        }
        // (the portals on top: they are small here, and a yard can be next to one)
        if (GLOBAL.INFERNO_ONLY) {
            g.lineStyle(1, IoMapLod.PORTAL_RING, 0.9);
            for (let portal of as3.values(IoUnderworld.portals)) {
                if (portal && !IoUnderworld.isUnder(portal[0] | 0, portal[1] | 0)) {
                    g.beginFill(IoMapLod.PORTAL_COLOUR, 1);
                    g.drawCircle(((portal[0] | 0) + 0.5) * scale, ((portal[1] | 0) + 0.5) * scale, 2.2);
                    g.endFill();
                }
            }
        }
        this.drawView();
    }

    /** The part of the world the map shows: its middle and size, in cells. */
    public setView(centreX: number, centreY: number, spanX: number, spanY: number): void {
        if (this._dragging) {
            return;
        }
        this._vx = centreX;
        this._vy = centreY;
        this._vw = spanX;
        this._vh = spanY;
        this.drawView();
    }

    private drawView(): void {
        let g: Graphics = this._view.graphics;
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let scale: number = this._size / Math.max(w, h);
        let bw: number = Math.max(4, Math.min(this._size, this._vw * scale));
        let bh: number = Math.max(4, Math.min(this._size, this._vh * scale));
        let left: number = (this._vx - this._vw * 0.5) * scale;
        let top: number = (this._vy - this._vh * 0.5) * scale;
        let dx: int = 0;
        let dy: int = 0;
        let bx: number = NaN;
        let by: number = NaN;
        g.clear();
        g.lineStyle(1.5, 16773328, 1);
        // The map wraps round the world's edges: so does the box, in a corner into all four corners.
        for (dx = -1; dx <= 1; dx++) {
            for (dy = -1; dy <= 1; dy++) {
                bx = left + dx * w * scale;
                by = top + dy * h * scale;
                if (bx < this._size && bx + bw > 0 && by < this._size && by + bh > 0) {
                    g.drawRect(bx, by, bw, bh);
                }
            }
        }
    }

    private cellUnderMouse(): Point {
        let scale: number = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
        let x: int = Math.max(0, Math.min(IoMapSnapshot.width - 1, Math.floor(this._body.mouseX / scale))) | 0;
        let y: int = Math.max(0, Math.min(IoMapSnapshot.height - 1, Math.floor(this._body.mouseY / scale))) | 0;
        return new Point(x, y);
    }

    private onDown(e: MouseEvent): void {
        e.stopPropagation();
        if (!IoMapSnapshot.ready || !this.stage) {
            return;
        }
        this._dragging = true;
        this.stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.stage.addEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.onUp));
        this.onMove(null);
    }

    private onMove(e: MouseEvent): void {
        let at: Point = this.cellUnderMouse();
        this._vx = at.x + 0.5;
        this._vy = at.y + 0.5;
        this.drawView();
        if (this._onPick != null) {
            this._onPick(at.x, at.y, false);
        }
    }

    private onUp(e: Event): void {
        let at: Point = this.cellUnderMouse();
        this.stopDragging();
        if (this._onPick != null) {
            this._onPick(at.x, at.y, true);
        }
    }

    private stopDragging(): void {
        this._dragging = false;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
            this.stage.removeEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.onUp));
        }
    }

    private onRemoved(e: Event): void {
        this.stopDragging();
    }

    public Cleanup(): void {
        this.stopDragging();
        this._onPick = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
