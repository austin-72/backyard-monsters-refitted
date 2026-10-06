import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, Graphics, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BUILDING5, GLOBAL, IoMapFilters, IoMapSnapshot, IoMapUi, IoUnderworld, LOGIN, POWERUPS, SOUNDS, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: the world map, the map room's three widest zoom steps (MapRoomPopup: World, World 2x,
 * World 4x). The whole world in low detail: the terrain as a picture (one pixel per cell), player main
 * yards as big dots and outposts as small ones, coloured by how the player stands with their owner (the
 * colours of the name bars on the map). No wild monster yards.
 *
 * On top, as the Filters say: your flinger range (every cell your yards reach) and your bookmarks. The
 * filters also choose whose yards show, main yards and / or outposts. The portals to the Depths of Hell
 * (IoUnderworld) are light purple dots: a click on one goes down through it (the user's, 4 October).
 *
 * The map is dragged to move around, its edges as far as the middle of the view. Hovering a dot names
 * the player; a click goes to the map there. Everything comes from the world snapshot (IoMapSnapshot): nothing is asked of the
 * server for it.
 */
export class IoMapLod extends Sprite {
    static {
        as3.fields(this, { _viewW: 0, _viewH: 0, _mapH: 0, _focus: null, _spanX: 0, _spanY: 0, _onPick: null, _zoom: 1, _cx: 200, _cy: 200, _fit: 1, _scale: 1, _clip: null, _world: null, _bitmap: null, _range: null, _rangeData: null, _rangeVersion: -1, _dots: null, _marks: null, _portals: null, _pins: null, _hover: null, _tip: null, _tipText: null, _loading: null, _legend: null, _drawnKey: null, _byKey: null, _pressing: false, _dragging: false, _pressX: 0, _pressY: 0, _pressCx: 0, _pressCy: 0, onViewChanged: null, onPointer: null, onHover: null });
    }

    /** Room at the bottom for the legend (two lines), above the window frame's bottom border. */
    public static readonly LEGEND_H: int = 44;

    private static readonly PAD: int = 6;

    /** A portal to the Depths of Hell: light purple, a darker ring. */
    public static readonly PORTAL_COLOUR: uint = 14137599;

    public static readonly PORTAL_RING: uint = 4858992;

    /** Your flinger range on the map: your blue, see-through. */
    private static readonly RANGE_ARGB: uint = 1714980839;

    /** The terrain picture of the last world drawn (a world's terrain never changes). */
    private static s_terrain: BitmapData = null;

    private static s_terrainWorld: string = null;
    private _viewW: int;
    private _viewH: int;
    private _mapH: int;
    private _focus: Point;
    private _spanX: int;
    private _spanY: int;
    private _onPick: Function;
    /** 1, 2 or 4: how many times the whole-world view. */
    private _zoom: int;
    /** The cell (fractional) in the middle of the view. */
    private _cx: number;
    private _cy: number;
    private _fit: number;
    private _scale: number;
    private _clip: Sprite;
    private _world: Sprite;
    private _bitmap: Bitmap;
    private _range: Bitmap;
    private _rangeData: BitmapData;
    private _rangeVersion: int;
    private _dots: Shape;
    private _marks: Shape;
    private _portals: Shape;
    private _pins: Sprite;
    private _hover: Shape;
    private _tip: Sprite;
    private _tipText: TextField;
    private _loading: TextField;
    private _legend: Sprite;
    /** What the dots were drawn for: the snapshot, the filters, the zoom, the bookmarks. */
    private _drawnKey: string;
    /** Player yards by x * 10000 + y, for hovering (only the ones shown). */
    private _byKey: any;
    private _pressing: boolean;
    private _dragging: boolean;
    private _pressX: number;
    private _pressY: number;
    private _pressCx: number;
    private _pressCy: number;
    /** Called when the view moves or zooms (the minimap follows it). */
    public onViewChanged: Function;
    /** Called with the cell under the pointer (x, y), or (-1, -1) when it leaves (the coordinates). */
    public onPointer: Function;
    /** Called with the snapshot cell of the yard under the pointer, or null (the cell information). */
    public onHover: Function;

    public $ctor(viewW?: int, viewH?: int, focus?: Point, spanX?: int, spanY?: int, onPick?: Function, zoom: int = 1, centre: Point = null): void {
        this._byKey = {};
        super.$ctor();
        this._viewW = viewW;
        this._viewH = viewH;
        this._mapH = (viewH - IoMapLod.LEGEND_H) | 0;
        this._focus = focus;
        this._spanX = spanX;
        this._spanY = spanY;
        this._onPick = onPick;
        this._zoom = zoom;
        if (centre && zoom > 1) {
            this._cx = centre.x + 0.5;
            this._cy = centre.y + 0.5;
        }
        this.graphics.beginFill(787973, 1);
        this.graphics.drawRect(0, 0, viewW, viewH);
        this.graphics.endFill();
        this._clip = new Sprite();
        this.addChild(this._clip);
        let clipMask: Shape = new Shape();
        clipMask.graphics.beginFill(16711680, 1);
        clipMask.graphics.drawRect(0, 0, viewW, this._mapH);
        clipMask.graphics.endFill();
        this.addChild(clipMask);
        this._clip.mask = clipMask;
        this._world = new Sprite();
        this._clip.addChild(this._world);
        this._bitmap = new Bitmap();
        this._world.addChild(this._bitmap);
        this._range = new Bitmap();
        this._world.addChild(this._range);
        this._dots = new Shape();
        this._world.addChild(this._dots);
        this._marks = new Shape();
        this._world.addChild(this._marks);
        this._portals = new Shape();
        this._world.addChild(this._portals);
        this._pins = new Sprite();
        this._world.addChild(this._pins);
        this._hover = new Shape();
        this._world.addChild(this._hover);
        this._loading = IoMapUi.label("Loading the world map...", 14, 16769216, true, viewW, TextFormatAlign.CENTER);
        this._loading.y = (this._mapH * 0.5 - 10) | 0;
        this.addChild(this._loading);
        this._legend = this.makeLegend();
        this._legend.x = 0;
        this._legend.y = this._mapH + 3;
        this.addChild(this._legend);
        this._tip = new Sprite();
        this._tip.mouseEnabled = false;
        this._tip.mouseChildren = false;
        this._tip.visible = false;
        this._tipText = IoMapUi.label("", 11, 16777215, false, 220);
        this._tipText.multiline = true;
        this._tipText.wordWrap = true;
        this._tipText.x = 6;
        this._tipText.y = 3;
        this._tip.addChild(this._tipText);
        this.addChild(this._tip);
        this.mouseChildren = false;
        this.buttonMode = true;
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOut));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.Redraw();
    }

    // ---- the view
    public get zoom(): int {
        return this._zoom;
    }

    /** The cell in the middle of the view. */
    public get centre(): Point {
        return new Point(Math.floor(this._cx), Math.floor(this._cy));
    }

    public get centreX(): number {
        return this._cx;
    }

    public get centreY(): number {
        return this._cy;
    }

    /** How many cells across and down the view shows. */
    public get spanCellsX(): number {
        return this._viewW / this._scale;
    }

    public get spanCellsY(): number {
        return this._mapH / this._scale;
    }

    /** Pixels per cell. */
    public get scale(): number {
        return this._scale;
    }

    /** The height of the map above the legend. */
    public get mapHeight(): int {
        return this._mapH;
    }

    /**
     * Zooms to 1, 2 or 4 times the whole world. The cell at the anchor (a point in this view; the middle
     * when not given) stays where it is.
     */
    public setZoom(zoom: int, anchorX: number = -1, anchorY: number = -1): void {
        let oldScale: number = this._scale;
        let ax: number = anchorX >= 0 ? anchorX : this._viewW * 0.5;
        let ay: number = anchorY >= 0 ? anchorY : this._mapH * 0.5;
        let cellX: number = this._cx + (ax - this._viewW * 0.5) / oldScale;
        let cellY: number = this._cy + (ay - this._mapH * 0.5) / oldScale;
        this._zoom = Math.max(1, Math.min(4, zoom)) | 0;
        this._scale = this._fit * this._zoom;
        this._cx = cellX - (ax - this._viewW * 0.5) / this._scale;
        this._cy = cellY - (ay - this._mapH * 0.5) / this._scale;
        if (this._zoom == 1) {
            // the whole world: in the middle
            this._cx = IoMapSnapshot.width * 0.5;
            this._cy = IoMapSnapshot.height * 0.5;
        }
        this._drawnKey = null;
        this.Redraw();
    }

    /** Moves the view so a cell is in the middle (as far as the world's edges let it). */
    public centreOn(cellX: number, cellY: number): void {
        this._cx = cellX;
        this._cy = cellY;
        this.place();
    }

    /** The cell at a point of this view, or null off the world. */
    public cellAt(localX: number, localY: number): Point {
        if (!IoMapSnapshot.ready || this._scale <= 0 || localY >= this._mapH) {
            return null;
        }
        let x: int = Math.floor((localX - this._world.x) / this._scale) | 0;
        let y: int = Math.floor((localY - this._world.y) / this._scale) | 0;
        if (x < 0 || y < 0 || x >= IoMapSnapshot.width || y >= IoMapSnapshot.height) {
            return null;
        }
        return new Point(x, y);
    }

    /** Keeps the world in the view (up to its edges in the middle) and puts the drawing where the centre says. */
    private place(): void {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let halfW: number = this._viewW * 0.5 / this._scale;
        let halfH: number = this._mapH * 0.5 / this._scale;
        // The world's edges can be dragged as far as the middle of the view, to look at them better.
        this._cx = Math.max(0, Math.min(w, this._cx));
        this._cy = Math.max(0, Math.min(h, this._cy));
        this._world.x = Math.round(this._viewW * 0.5 - this._cx * this._scale);
        this._world.y = Math.round(this._mapH * 0.5 - this._cy * this._scale);
        if (this.onViewChanged != null) {
            this.onViewChanged();
        }
    }

    // ---- updates
    /** The map calls this every second: redraws when a new snapshot has arrived or the filters changed. */
    public Tick(): void {
        if (IoMapSnapshot.ready && this.drawKey() != this._drawnKey) {
            this.Redraw();
        }
    }

    private drawKey(): string {
        return IoMapSnapshot.version + "/" + IoMapFilters.version + "/" + this._zoom + "/" + MapRoom._bookmarks.length + "/" + IoMapLod.ioBookmarkStamp() + "/" + IoUnderworld.portals.length;
    }

    /** Changes when a bookmark is added, renamed, moved or removed. */
    private static ioBookmarkStamp(): string {
        let stamp: string = "";
        for (let bookmark of as3.values(MapRoom._bookmarks)) {
            stamp += bookmark.name + bookmark.location.x + "," + bookmark.location.y + ";";
        }
        return stamp;
    }

    public Redraw(): void {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        if (!IoMapSnapshot.ready) {
            this._loading.visible = true;
            return;
        }
        this._loading.visible = false;
        this._drawnKey = this.drawKey();
        this._fit = Math.min((this._viewW - IoMapLod.PAD * 2) / w, (this._mapH - IoMapLod.PAD * 2) / h);
        this._scale = this._fit * this._zoom;
        this.drawTerrain(w, h);
        this.drawRange(w, h);
        this.drawDots();
        this.drawMarks();
        this.drawPortals();
        this.drawPins();
        this.place();
    }

    public Cleanup(): void {
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOut));
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.endPress();
        this._onPick = null;
        this.onViewChanged = null;
        this.onPointer = null;
        this.onHover = null;
        if (this._rangeData) {
            this._rangeData.dispose();
            this._rangeData = null;
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    // ---- drawing
    /** The world's terrain, one pixel per cell (the minimap shows it too); null before the snapshot. */
    public static terrain(): BitmapData {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let world: string = IoMapSnapshot.world;
        let pixels: Vector<uint> = null;
        let x: int = 0;
        let y: int = 0;
        if (!IoMapSnapshot.ready) {
            return IoMapLod.s_terrain && IoMapLod.s_terrainWorld == world ? IoMapLod.s_terrain : null;
        }
        if (!IoMapLod.s_terrain || IoMapLod.s_terrainWorld != world) {
            pixels = new Vector<uint>(w * h, true, uint);
            while (x < w) {
                y = 0;
                while (y < h) {
                    as3.vset(pixels, y * w + x, IoMapLod.terrainColour(IoMapSnapshot.HeightAt(x, y)));
                    y++;
                }
                x++;
            }
            if (IoMapLod.s_terrain) {
                IoMapLod.s_terrain.dispose();
            }
            IoMapLod.s_terrain = new BitmapData(w, h, false, 0);
            IoMapLod.s_terrain.setVector(new Rectangle(0, 0, w, h), pixels);
            IoMapLod.s_terrainWorld = world;
        }
        return IoMapLod.s_terrain;
    }

    private drawTerrain(w: int, h: int): void {
        this._bitmap.bitmapData = IoMapLod.terrain();
        this._bitmap.smoothing = false;
        this._bitmap.scaleX = this._bitmap.scaleY = this._scale;
    }

    /**
     * The Inferno map's colours, taken from its tiles (hell-maproom2, 30 September: lava below 100, bone
     * 100-109, netherrack 110-169, black volcanic rock from 170), dimmed to about half so the yards' dots
     * stand out on them.
     */
    private static terrainColour(height: int): uint {
        if (height < 0) {
            return 787973;
        }
        if (height < 80) {
            return 2757128;
        }
        if (height < 90) {
            return 3545611;
        }
        if (height < 100) {
            return 4857866;
        }
        // bone fields (the inferno-maproom2 pack's shore tiles: dark rock under bones), the higher one sparser
        if (height < 105) {
            return 2367773;
        }
        if (height < 110) {
            return 1973017;
        }
        if (height < 170) {
            return IoMapLod.mix(5117968, 3542282, (height - 110) / 60);
        }
        return IoMapLod.mix(1774353, 2957075, Math.min(1, (height - 170) / 40));
    }

    private static mix(from: uint, to: uint, t: number): uint {
        let r: int = (((from >> 16) & 255) + (((to >> 16) & 255) - ((from >> 16) & 255)) * t) | 0;
        let g: int = (((from >> 8) & 255) + (((to >> 8) & 255) - ((from >> 8) & 255)) * t) | 0;
        let b: int = ((from & 255) + ((to & 255) - (from & 255)) * t) | 0;
        return ((r << 16) | (g << 8) | b) >>> 0;
    }

    /**
     * Every cell one of your yards' flingers reaches, as MapRoomPopup highlights them on the map: the main
     * yard's range from its flinger level (as upgraded in the yard), an outpost's from its own, both with
     * the alliance war powerup. Drawn once per snapshot.
     */
    private drawRange(w: int, h: int): void {
        let pixels: Vector<uint> = null;
        let cell: any[] = null;
        let main: boolean = false;
        let level: int = 0;
        let range: int = 0;
        this._range.visible = IoMapFilters.range;
        if (!IoMapFilters.range) {
            return;
        }
        if (this._rangeVersion != IoMapSnapshot.version || !this._rangeData) {
            this._rangeVersion = IoMapSnapshot.version;
            pixels = new Vector<uint>(w * h, true, uint);
            for (cell of as3.values(IoMapSnapshot.cells)) {
                if ((cell[2] | 0) < 2 || (cell[3] | 0) != LOGIN._playerID) {
                    continue;
                }
                main = (cell[2] | 0) == 2;
                level = cell[6] | 0;
                if (main && GLOBAL._playerFlingerLevel) {
                    level = Math.max(level, GLOBAL._playerFlingerLevel.Get()) | 0;
                }
                if (level <= 0) {
                    continue;
                }
                range = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [BUILDING5.getFlingerRange(level, main)]) | 0;
                IoMapLod.markRange(pixels, w, h, cell[0] | 0, cell[1] | 0, range);
            }
            if (!this._rangeData || this._rangeData.width != w || this._rangeData.height != h) {
                if (this._rangeData) {
                    this._rangeData.dispose();
                }
                this._rangeData = new BitmapData(w, h, true, 0);
            }
            this._rangeData.setVector(new Rectangle(0, 0, w, h), pixels);
            this._range.bitmapData = this._rangeData;
        }
        this._range.smoothing = false;
        this._range.scaleX = this._range.scaleY = this._scale;
    }

    /** The cells within a hex distance of a cell (odd-q offset rows, as the map; the world wraps). */
    private static markRange(pixels: Vector<uint>, w: int, h: int, fromX: int, fromY: int, range: int): void {
        let q: int = fromX;
        let r: int = (fromY - (fromX - (fromX & 1)) / 2) | 0;
        let dq: int = (-range) | 0;
        let dr: int = 0;
        let x: int = 0;
        let y: int = 0;
        while (dq <= range) {
            dr = Math.max(-range, -dq - range) | 0;
            while (dr <= Math.min(range, -dq + range)) {
                x = (q + dq) | 0;
                y = (r + dr + (x - (x & 1)) / 2) | 0;
                x = ((x % w + w) % w) | 0;
                y = ((y % h + h) % h) | 0;
                as3.vset(pixels, y * w + x, IoMapLod.RANGE_ARGB);
                dr++;
            }
            dq++;
        }
    }

    private mainRadius(): number {
        return Math.max(3, 2 + this._scale * 1.2);
    }

    private outpostRadius(): number {
        return Math.max(1.8, 1 + this._scale * 0.7);
    }

    private drawDots(): void {
        let cell: any[] = null;
        let player: any = null;
        let pass: int = 0;
        let main: boolean = false;
        let mine: boolean = false;
        let relation: int = 0;
        let px: number = NaN;
        let py: number = NaN;
        let g: Graphics = this._dots.graphics;
        let mainR: number = this.mainRadius();
        let outpostR: number = this.outpostRadius();
        g.clear();
        this._byKey = {};
        // outposts first, then main yards, then the player's own on top
        while (pass < 3) {
            for (cell of as3.values(IoMapSnapshot.cells)) {
                if ((cell[2] | 0) < 2) {
                    continue;
                }
                main = (cell[2] | 0) == 2;
                mine = (cell[3] | 0) == LOGIN._playerID;
                if (pass == 0 && (main || mine) || pass == 1 && (!main || mine) || pass == 2 && !mine) {
                    continue;
                }
                player = IoMapSnapshot.PlayerInfo(cell[3] | 0) || {};
                relation = IoMapUi.relation(cell[3] | 0, player.alliance | 0);
                if (!IoMapFilters.shows(relation, main)) {
                    continue;
                }
                px = ((cell[0] | 0) + 0.5) * this._scale;
                py = ((cell[1] | 0) + 0.5) * this._scale;
                g.lineStyle(Number(main ? 1 : 0.5), 0, 0.9);
                g.beginFill(IoMapUi.relationColour(relation), 1);
                g.drawCircle(px, py, main ? mainR : outpostR);
                g.endFill();
                this._byKey[(cell[0] | 0) * 10000 + (cell[1] | 0)] = cell;
            }
            pass++;
        }
    }

    private portalRadius(): number {
        return Math.max(4, 2.6 + this._scale * 1.2);
    }

    /** The portals' overworld ends (they sit on lava, where no yard is). */
    private drawPortals(): void {
        let g: Graphics = this._portals.graphics;
        let p: any[] = null;
        let r: number = this.portalRadius();
        g.clear();
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        for (p of as3.values(IoUnderworld.portals)) {
            if (!p || IoUnderworld.isUnder(p[0] | 0, p[1] | 0)) {
                continue;
            }
            g.lineStyle(1.2, IoMapLod.PORTAL_RING, 1);
            g.beginFill(IoMapLod.PORTAL_COLOUR, 1);
            g.drawCircle(((p[0] | 0) + 0.5) * this._scale, ((p[1] | 0) + 0.5) * this._scale, r);
            g.endFill();
        }
    }

    /** The portal nearest the mouse, if the mouse is on (or next to) its dot: [overworld x, y, underworld x, y]. */
    private portalNear(): any[] {
        let best: any[] = null;
        let bestDistance: number = Number.MAX_VALUE;
        let fx: number = (this.mouseX - this._world.x) / this._scale - 0.5;
        let fy: number = (this.mouseY - this._world.y) / this._scale - 0.5;
        let distance: number = NaN;
        for (let p of as3.values(IoUnderworld.portals)) {
            if (!p) {
                continue;
            }
            distance = Math.sqrt(((p[0] | 0) - fx) * ((p[0] | 0) - fx) + ((p[1] | 0) - fy) * ((p[1] | 0) - fy)) * this._scale;
            if (distance < bestDistance) {
                bestDistance = distance;
                best = p;
            }
        }
        return best && bestDistance <= this.portalRadius() + 5 ? best : null;
    }

    /** The part of the world the map showed before zooming out. */
    private drawMarks(): void {
        let g: Graphics = this._marks.graphics;
        g.clear();
        if (this._focus && this._zoom == 1) {
            g.lineStyle(1.5, 16773328, 0.9);
            g.drawRect((this._focus.x - this._spanX * 0.5) * this._scale, (this._focus.y - this._spanY * 0.5) * this._scale, this._spanX * this._scale, this._spanY * this._scale);
        }
    }

    /** Bookmarks as pins; zoomed in, with their names. */
    private drawPins(): void {
        let bookmark: any = null;
        let name: TextField = null;
        let px: number = NaN;
        let py: number = NaN;
        let size: number = this._zoom >= 2 ? 16 : 12;
        while (this._pins.numChildren > 0) {
            this._pins.removeChildAt(0);
        }
        this._pins.graphics.clear();
        if (!IoMapFilters.bookmarks) {
            return;
        }
        for (bookmark of as3.values(MapRoom._bookmarks)) {
            px = ((bookmark.location.x | 0) + 0.5) * this._scale;
            py = ((bookmark.location.y | 0) + 0.5) * this._scale;
            IoMapUi.pin(this._pins.graphics, px, py, IoMapUi.GOLD, size);
            if (this._zoom >= 2) {
                name = IoMapUi.label(String(bookmark.name), 10, 16773320, true, 160);
                name.width = name.textWidth + 8;
                name.x = px + size * 0.4;
                name.y = py - size - 2;
                this._pins.graphics.beginFill(1576456, 0.75);
                this._pins.graphics.drawRoundRect(name.x - 1, name.y + 1, name.width, 15, 8, 8);
                this._pins.graphics.endFill();
                this._pins.addChild(name);
            }
        }
    }

    // ---- hover, drag and click
    /** The player yard nearest the mouse, within a few cells (the dots are bigger than a cell). */
    private yardNear(at: Point): any[] {
        let best: any[] = null;
        let bestDistance: number = Number.MAX_VALUE;
        let reach: int = Math.max(2, Math.ceil(6 / this._scale)) | 0;
        let dx: int = (-reach) | 0;
        let dy: int = 0;
        let cell: any[] = null;
        let distance: number = NaN;
        let fx: number = (this.mouseX - this._world.x) / this._scale - 0.5;
        let fy: number = (this.mouseY - this._world.y) / this._scale - 0.5;
        while (dx <= reach) {
            dy = (-reach) | 0;
            while (dy <= reach) {
                cell = as3.as(this._byKey[(at.x + dx) * 10000 + (at.y + dy)], Array);
                if (cell) {
                    distance = ((cell[0] | 0) - fx) * ((cell[0] | 0) - fx) + ((cell[1] | 0) - fy) * ((cell[1] | 0) - fy);
                    // main yards win a close call
                    if ((cell[2] | 0) == 2) {
                        distance -= 0.5;
                    }
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = cell;
                    }
                }
                dy++;
            }
            dx++;
        }
        // Only when the mouse is on (or next to) the dot itself.
        if (best && Math.sqrt(bestDistance) * this._scale > this.mainRadius() + 6) {
            return null;
        }
        return best;
    }

    private onMove(e: MouseEvent): void {
        if (this._dragging) {
            return;
        }
        let at: Point = this.cellAt(this.mouseX, this.mouseY);
        let portal: any[] = at ? this.portalNear() : null;
        let yard: any[] = at && !portal ? this.yardNear(at) : null;
        let player: any = null;
        let alliance: any = null;
        let text: string = null;
        let relation: int = 0;
        let g: Graphics = this._hover.graphics;
        g.clear();
        if (this.onPointer != null) {
            this.onPointer(at ? at.x : -1, at ? at.y : -1);
        }
        if (this.onHover != null) {
            this.onHover(yard);
        }
        if (!at) {
            this._tip.visible = false;
            return;
        }
        if (portal) {
            text = "<b>Portal to the " + IoUnderworld.NAME + "</b><br>" + IoMapUi.coord(portal[0] | 0, portal[1] | 0) + "<br>Click to go down";
            g.lineStyle(2, 16777215, 1);
            g.drawCircle(((portal[0] | 0) + 0.5) * this._scale, ((portal[1] | 0) + 0.5) * this._scale, this.portalRadius() + 1.5);
        } else if (yard) {
            player = IoMapSnapshot.PlayerInfo(yard[3] | 0) || {};
            alliance = player.alliance | 0 ? IoMapSnapshot.AllianceInfo(player.alliance | 0) : null;
            relation = IoMapUi.relation(yard[3] | 0, player.alliance | 0);
            text = "<b>" + IoMapUi.escape(String(player.name || "?")) + "</b>  level " + (player.level | 0 || yard[11] | 0) + "<br>" + ((yard[2] | 0) == 2 ? "Main yard" : "Outpost") + " at " + IoMapUi.coord(yard[0] | 0, yard[1] | 0) + (alliance ? "<br>" + IoMapUi.escape(String(alliance.name)) + (relation == IoMapUi.YOU ? "" : " · " + IoMapUi.RELATION_NAMES[relation].toLowerCase()) : "");
            g.lineStyle(2, 16777215, 1);
            g.drawCircle(((yard[0] | 0) + 0.5) * this._scale, ((yard[1] | 0) + 0.5) * this._scale, this.mainRadius() + 1.5);
        } else {
            text = IoMapUi.coord(at.x | 0, at.y | 0) + "<br>Click to go there";
        }
        this._tipText.htmlText = text;
        this._tipText.height = this._tipText.textHeight + 6;
        this._tipText.width = Math.min(220, this._tipText.textWidth + 8);
        this._tip.graphics.clear();
        this._tip.graphics.lineStyle(1, 8014378, 1);
        this._tip.graphics.beginFill(1970186, 0.92);
        this._tip.graphics.drawRoundRect(0, 0, this._tipText.width + 12, this._tipText.height + 6, 8, 8);
        this._tip.graphics.endFill();
        this._tip.x = Math.min(this.mouseX + 14, this._viewW - this._tip.width - 4);
        this._tip.y = Math.min(this.mouseY + 14, this._mapH - this._tip.height - 2);
        this._tip.visible = true;
    }

    private onOut(e: MouseEvent): void {
        this._tip.visible = false;
        this._hover.graphics.clear();
        if (this.onPointer != null && !this._dragging) {
            this.onPointer(-1, -1);
        }
    }

    private onDown(e: MouseEvent): void {
        if (!this.stage || this.mouseY >= this._mapH) {
            return;
        }
        this._pressing = true;
        this._dragging = false;
        this._pressX = this.mouseX;
        this._pressY = this.mouseY;
        this._pressCx = this._cx;
        this._pressCy = this._cy;
        this.stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onDragMove));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.stage.addEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.onLeave));
    }

    private onDragMove(e: MouseEvent): void {
        if (!this._pressing) {
            return;
        }
        if (!this._dragging && Point.distance(new Point(this.mouseX, this.mouseY), new Point(this._pressX, this._pressY)) > 5) {
            this._dragging = true;
            this._tip.visible = false;
            this._hover.graphics.clear();
        }
        if (this._dragging) {
            this._cx = this._pressCx - (this.mouseX - this._pressX) / this._scale;
            this._cy = this._pressCy - (this.mouseY - this._pressY) / this._scale;
            this.place();
        }
    }

    private onUp(e: MouseEvent): void {
        let click: boolean = this._pressing && !this._dragging;
        this.endPress();
        if (click) {
            this.pick();
        }
    }

    private onLeave(e: Event): void {
        this.endPress();
    }

    private endPress(): void {
        this._pressing = false;
        this._dragging = false;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onDragMove));
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
            this.stage.removeEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.onLeave));
        }
    }

    private pick(): void {
        let at: Point = this.cellAt(this.mouseX, this.mouseY);
        let portal: any[] = at ? this.portalNear() : null;
        let yard: any[] = at && !portal ? this.yardNear(at) : null;
        if (!at || this._onPick == null) {
            return;
        }
        SOUNDS.Play("click1");
        if (portal) {
            // through the portal: the map goes to its end in the Depths of Hell
            this._onPick(portal[2] | 0, portal[3] | 0);
            return;
        }
        if (yard) {
            at = new Point(yard[0] | 0, yard[1] | 0);
        }
        this._onPick(at.x, at.y);
    }

    // ---- legend
    /** Two lines, each in the middle: who (the colours), and what (the marks). */
    private makeLegend(): Sprite {
        let legend: Sprite = new Sprite();
        let who: Sprite = new Sprite();
        let what: Sprite = new Sprite();
        let g: Graphics = who.graphics;
        let x: number = 0;
        let text: TextField = null;
        let i: int = 0;
        legend.mouseEnabled = false;
        legend.mouseChildren = false;
        legend.addChild(who);
        legend.addChild(what);
        while (i < IoMapUi.RELATION_NAMES.length) {
            g.lineStyle(1, 0, 0.9);
            g.beginFill(IoMapUi.relationColour(i), 1);
            g.drawCircle(x + 4, 8, 4);
            g.endFill();
            text = IoMapLod.legendText(as3.str(IoMapUi.RELATION_NAMES[i]), x + 9, 0);
            who.addChild(text);
            x += 9 + text.width + 6;
            i++;
        }
        who.x = Math.round((this._viewW - (x - 6)) * 0.5);
        g = what.graphics;
        x = 0;
        g.lineStyle(1, 0, 0.9);
        g.beginFill(16777215, 1);
        g.drawCircle(x + 5, 23, 5);
        g.endFill();
        text = IoMapLod.legendText("Main yard", x + 13, 15);
        what.addChild(text);
        x += 13 + text.width + 8;
        g.lineStyle(0.5, 0, 0.9);
        g.beginFill(16777215, 1);
        g.drawCircle(x + 3, 23, 2.5);
        g.endFill();
        text = IoMapLod.legendText("Outpost", x + 8, 15);
        what.addChild(text);
        x += 8 + text.width + 8;
        g.lineStyle();
        g.beginFill((IoMapLod.RANGE_ARGB & 0xFFFFFF) >>> 0, 0.55);
        g.drawRect(x, 18, 12, 10);
        g.endFill();
        text = IoMapLod.legendText("Your flinger range", x + 16, 15);
        what.addChild(text);
        x += 16 + text.width + 8;
        IoMapUi.pin(g, x + 5, 29, IoMapUi.GOLD, 12);
        text = IoMapLod.legendText("Bookmark", x + 12, 15);
        what.addChild(text);
        x += 12 + text.width + 8;
        if (GLOBAL.INFERNO_ONLY) {
            g.lineStyle(1.2, IoMapLod.PORTAL_RING, 1);
            g.beginFill(IoMapLod.PORTAL_COLOUR, 1);
            g.drawCircle(x + 4, 23, 4);
            g.endFill();
            text = IoMapLod.legendText("Portal to the " + IoUnderworld.NAME, x + 11, 15);
            what.addChild(text);
            x += 11 + text.width;
        }
        what.x = Math.round((this._viewW - x) * 0.5);
        return legend;
    }

    private static legendText(value: string, x: number, y: number): TextField {
        let text: TextField = IoMapUi.label(value, 10, 15259848, false, 160);
        text.x = x;
        text.y = y;
        text.width = text.textWidth + 6;
        return text;
    }
}
