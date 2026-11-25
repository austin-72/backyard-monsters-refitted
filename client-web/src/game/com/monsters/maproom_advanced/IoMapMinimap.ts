import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, Graphics, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { ColorTransform, Point } from "flash/geom";
import { GLOBAL, IoMapFilters, IoMapLod, IoMapSnapshot, IoMapUi, IoUnderworld, LOGIN, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: the minimap, at the top of the panel right of the map. The whole world small (the world
 * map's terrain), your yards and the portals to the Depths of Hell (light purple) on it, and a box round
 * the part the map shows. Click or drag in it to move the map there.
 *
 * (QoL #72, 15 October) Damaged tribe yards (orange) and those ready to take over (red) are on it too.
 * (QoL #341, 15 October) While the map shows the Depths of Hell it is a minimap of them instead: their 10 x 10
 * platforms in the map's layout (odd columns half a cell down), yours and other players' outposts in the colours of
 * the name bars, damaged tribe yards orange, those ready to take over red, the portals light purple, and the box.
 */
export class IoMapMinimap extends Sprite {
    static {
        as3.fields(this, { _size: 0, _body: null, _terrain: null, _yards: null, _view: null, _onPick: null, _drawnVersion: -1, _drawnPortals: -1, _dragging: false, _vx: 0, _vy: 0, _vw: 0, _vh: 0, _depths: false, _drawnFilters: -1, _depthsKey: null });
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
    /** (QoL #341) it shows the Depths of Hell (the map does). */
    private _depths: boolean;
    /** (QoL #72) the filters it was drawn for (the tribe yards can be hidden). */
    private _drawnFilters: int;
    /** (QoL #341) what the Depths' cells were drawn as. */
    private _depthsKey: string;

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
        // (QoL #341: named by what it shows, for the tests)
        this._body.name = "ioMap3WorldMinimap";
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

    /** (QoL #341) The minimap of the world above, or of the Depths of Hell (the map shows them). */
    public setDepths(on: boolean): void {
        on = on && GLOBAL.INFERNO_ONLY;
        if (on == this._depths) {
            return;
        }
        this._depths = on;
        this._drawnVersion = -1;
        this._depthsKey = null;
        this._terrain.visible = !on;
        this._yards.graphics.clear();
        this._view.graphics.clear();
        // (the minimap's face, by what it shows: for the tests)
        this._body.name = on ? "ioMap3DepthsMinimap" : "ioMap3WorldMinimap";
        this.Redraw();
    }

    public get depths(): boolean {
        return this._depths;
    }

    /** Draws the world again when a new snapshot has come. */
    public Redraw(): void {
        let scale: number = NaN;
        let cell: any[] = null;
        let g: Graphics = this._yards.graphics;
        if (this._depths) {
            // (QoL #341)
            this.redrawDepths();
            return;
        }
        if (!IoMapSnapshot.ready || this._drawnVersion == IoMapSnapshot.version && this._drawnPortals == IoUnderworld.portals.length && this._drawnFilters == IoMapFilters.version) {
            return;
        }
        this._drawnVersion = IoMapSnapshot.version;
        this._drawnPortals = IoUnderworld.portals.length;
        this._drawnFilters = IoMapFilters.version;
        this._terrain.bitmapData = IoMapLod.terrain();
        this._terrain.smoothing = true;
        // Small, the world map's dim colours run together: brighter here, so the lava shows.
        this._terrain.transform.colorTransform = new ColorTransform(1.7, 1.5, 1.4);
        scale = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
        this._terrain.scaleX = this._terrain.scaleY = scale;
        g.clear();
        // (QoL #72: the damaged tribe yards, under your yards)
        if (GLOBAL.INFERNO_ONLY && IoMapFilters.camps) {
            for (cell of as3.values(IoMapSnapshot.cells)) {
                let state: int = IoMapSnapshot.CampState(cell);
                if (state == 0 || IoUnderworld.isUnder(cell[0] | 0, cell[1] | 0)) {
                    continue;
                }
                g.lineStyle();
                g.beginFill(state == 2 ? IoMapLod.CAMP_READY : IoMapLod.CAMP_DAMAGED, 1);
                IoMapLod.diamond(g, ((cell[0] | 0) + 0.5) * scale, ((cell[1] | 0) + 0.5) * scale, state == 2 ? 2 : 1.4);
                g.endFill();
            }
        }
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
        if (this._depths) {
            // (QoL #341: the Depths don't wrap)
            let cw: number = this.depthsColW();
            let rh: number = this.depthsRowH();
            g.clear();
            g.lineStyle(1.5, 16773328, 1);
            g.drawRect((this._vx - IoUnderworld.origin - this._vw * 0.5) * cw, (this._vy - IoUnderworld.origin - this._vh * 0.5) * rh, Math.max(4, this._vw * cw), Math.max(4, this._vh * rh));
            return;
        }
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
        if (this._depths) {
            // (QoL #341: a platform of the Depths; odd columns are half a cell down)
            let cw: number = this.depthsColW();
            let rh: number = this.depthsRowH();
            let n: int = IoUnderworld.size;
            let i: int = Math.max(0, Math.min(n - 1, Math.floor(this._body.mouseX / cw))) | 0;
            let j: int = Math.max(0, Math.min(n - 1, Math.floor((this._body.mouseY - ((IoUnderworld.origin + i) & 1 ? rh * 0.5 : 0)) / rh))) | 0;
            return new Point(IoUnderworld.origin + i, IoUnderworld.origin + j);
        }
        let scale: number = this._size / Math.max(IoMapSnapshot.width, IoMapSnapshot.height);
        let x: int = Math.max(0, Math.min(IoMapSnapshot.width - 1, Math.floor(this._body.mouseX / scale))) | 0;
        let y: int = Math.max(0, Math.min(IoMapSnapshot.height - 1, Math.floor(this._body.mouseY / scale))) | 0;
        return new Point(x, y);
    }

    private onDown(e: MouseEvent): void {
        e.stopPropagation();
        if (!IoMapSnapshot.ready && !this._depths || !this.stage) {
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

    // ---- (QoL #341) the Depths of Hell
    private depthsColW(): number {
        return this._size / Math.max(1, IoUnderworld.size);
    }

    /** (a row is a little shorter than a column is wide: room for the odd columns' half cell) */
    private depthsRowH(): number {
        return this._size / (Math.max(1, IoUnderworld.size) + 0.5);
    }

    /**
     * What is on a cell of the Depths, as a colour: its zone's data (getarea) when it has come, else the snapshot's.
     * A portal, a player's outpost (the name bars' colours), a tribe yard ready to take over or damaged, or a platform.
     */
    private static depthsColour(cellX: int, cellY: int): uint {
        let zone: any = MapRoom.ioZoneCell(cellX, cellY);
        let data: any = zone.loaded ? zone.data : null;
        let entry: any[] = data ? null : IoMapSnapshot.EntryAt(cellX, cellY);
        let base: int = 0;
        let uid: int = 0;
        let alliance: int = 0;
        let mine: boolean = false;
        let destroyed: boolean = false;
        let damage: int = 0;
        if (IoUnderworld.portalIndexAt(cellX, cellY) >= 0) {
            return IoMapLod.PORTAL_COLOUR;
        }
        if (data) {
            base = data.b | 0;
            uid = data.uid | 0;
            alliance = data.aid | 0;
            mine = (data.mine | 0) != 0;
            destroyed = (data.d | 0) != 0;
            damage = data.dm | 0;
        } else if (entry) {
            base = entry[2] | 0;
            uid = entry[3] | 0;
            mine = uid == LOGIN._playerID;
            let player: any = IoMapSnapshot.PlayerInfo(uid);
            alliance = player ? player.alliance | 0 : 0;
            destroyed = (entry[10] | 0) != 0;
            damage = entry[8] | 0;
        }
        if (base >= 2) {
            return IoMapUi.relationColour(mine ? IoMapUi.YOU : IoMapUi.relation(uid, alliance));
        }
        if (destroyed) {
            return IoMapLod.CAMP_READY;
        }
        if (damage > 0) {
            return IoMapLod.CAMP_DAMAGED;
        }
        return 6047302;
    }

    private redrawDepths(): void {
        let n: int = IoUnderworld.size;
        let cw: number = this.depthsColW();
        let rh: number = this.depthsRowH();
        let colours: any[] = [];
        let key: string = "";
        let g: Graphics = this._yards.graphics;
        for (let i: int = 0; i < n; i++) {
            for (let j: int = 0; j < n; j++) {
                let colour: uint = IoMapMinimap.depthsColour((IoUnderworld.origin + i) | 0, (IoUnderworld.origin + j) | 0);
                colours.push(colour);
                key += colour + ",";
            }
        }
        if (key == this._depthsKey) {
            return;
        }
        this._depthsKey = key;
        g.clear();
        // the lava round and between the platforms
        g.beginFill(3804680, 1);
        g.drawRect(0, 0, this._size, this._size);
        g.endFill();
        for (let i: int = 0; i < n; i++) {
            for (let j: int = 0; j < n; j++) {
                let colour: uint = colours[i * n + j] >>> 0;
                let x: number = i * cw;
                let y: number = j * rh + ((IoUnderworld.origin + i) & 1 ? rh * 0.5 : 0);
                let platform: boolean = colour == 6047302;
                g.lineStyle(1, platform ? 2759184 : 0, platform ? 1 : 0.7, true);
                g.beginFill(colour, 1);
                if (colour == IoMapLod.PORTAL_COLOUR) {
                    g.drawCircle(x + cw * 0.5, y + rh * 0.5, Math.min(cw, rh) * 0.42);
                } else {
                    g.drawRoundRect(x + 1.5, y + 1.5, cw - 3, rh - 3, 4, 4);
                }
                g.endFill();
            }
        }
        g.lineStyle();
        this.drawView();
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
