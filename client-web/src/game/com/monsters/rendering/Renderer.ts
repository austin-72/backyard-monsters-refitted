import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, Shape } from "flash/display";
import { BitmapFilter } from "flash/filters";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { GLOBAL, RasterData } from "@game";

// AS3 namespace renderer_friend: members declared in it are plain properties in TypeScript.

export class Renderer extends ASObject {
    static {
        as3.fields(this, { _canvas: null, _viewRect: null, _matrix: null, _pt: null, _bm: null, _alphaCt: null, _curCopyIndex: 0, _curDrawIndex: 0, _frame: 0, _drawn: null, _drawnNext: null, _forceFull: true, _dirty: null, _sweep: null, _shadows: true, _sweepPos: 0, _sweepAt: -1, _src: null, _mx: 0, _my: 0, _mw: 0, _mh: 0, _mver: 0, _ipReal: 0, _ipTick: NaN, _ipApplied: null, _tiles: null, _tilesW: 0 });
    }

    public static _debug: boolean = false;

    private static _debugShape: Shape = null;

    // ---- Inferno-only: partial redraw ------------------------------------------------------------
    // The whole yard used to be drawn again every frame: the 8-megapixel ground, then every building,
    // shadow and monster, moved or not. Now each frame finds what changed since the last one (moved,
    // animated, appeared, gone, drawn differently) and draws again only there, clipped. It needs to
    // know when a bitmap's pixels change, which the browser build can tell (a version on every
    // BitmapData) and Flash cannot: in Flash every frame is still drawn whole.
    /** 0: as the server says (flag io_fullredraw), 1: partial, 2: whole every frame (tests, comparing). */
    public static ioMode: int = 0;

    /** What the frames did: whole, partial, nothing to do; rectangles and pixels drawn again (tests). */
    public static readonly ioStats: any = { "full": 0, "partial": 0, "idle": 0, "rects": 0, "area": 0, "swept": 0 };

    /** Tile size of the dirty-tile grid (tileDirty), and the grid (reused). */
    private static readonly TILE: int = 32;
    public _canvas: BitmapData;
    public _viewRect: Rectangle;
    private _matrix: Matrix;
    private _pt: Point;
    private _bm: Bitmap;
    private _alphaCt: ColorTransform;
    private _curCopyIndex: uint;
    private _curDrawIndex: uint;
    private _frame: uint;
    private _drawn: Vector<RasterData>;
    private _drawnNext: Vector<RasterData>;
    private _forceFull: boolean;
    private _dirty: Vector<Rectangle>;
    /** This frame's strip of the sweep (see addSweep). */
    private _sweep: Vector<Rectangle>;
    private _shadows: boolean;
    /** Where the sweep got to (0..1 down the view) and when (see addSweep). */
    private _sweepPos: number;
    private _sweepAt: int;
    private _src: Rectangle;
    private _mx: number;
    private _my: number;
    private _mw: number;
    private _mh: number;
    private _mver: number;
    // ---- Inferno-only, browser build: frame interpolation ------------------------------------------------
    // The page can show made-up frames between the game's (its "Frame interpolation" setting). The player
    // (client-web, display/core interp) moves the display objects part of the way; this does the same for
    // what is drawn into the yard: each entry part of the way between where it was at the game's last two
    // frames, drawn, then put back at once. ioInterp is the player's object, found on the stage (never in
    // Flash: there is nothing there to find).
    private _ipReal: int;
    private _ipTick: number;
    private _ipApplied: Vector<RasterData>;
    private _tiles: Vector<int>;
    private _tilesW: int;

    public $ctor(param1?: BitmapData, param2?: Rectangle): void {
        this._matrix = new Matrix();
        this._pt = new Point();
        this._bm = new Bitmap();
        this._alphaCt = new ColorTransform();
        this._drawn = new Vector<RasterData>(0, false, RasterData);
        this._drawnNext = new Vector<RasterData>(0, false, RasterData);
        this._dirty = new Vector<Rectangle>(0, false, Rectangle);
        this._sweep = new Vector<Rectangle>(0, false, Rectangle);
        this._src = new Rectangle();
        this._ipTick = NaN;
        this._ipApplied = new Vector<RasterData>(0, false, RasterData);
        this._tiles = new Vector<int>(0, false, int);
        super.$ctor();
        this._canvas = param1;
        this._viewRect = param2;
    }

    public static get debug(): boolean {
        return Renderer._debug;
    }

    public static set debug(param1: boolean) {
        Renderer._debug = param1;
        if (Renderer._debug) {
            Renderer._debugShape = Renderer._debugShape || new Shape();
            RasterData.showDebug();
        } else {
            Renderer._debugShape = null;
            RasterData.hideDebug();
        }
    }

    public set canvas(param1: BitmapData) {
        this._canvas = param1;
        this._forceFull = true;
    }

    /** The next frame is drawn whole (the yard changed under the renderer's feet). */
    public ioRedrawAll(): void {
        this._forceFull = true;
    }

    /** The player's interpolation object, or null (Flash, or the page has none). */
    private static ioInterp(): any {
        let s: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        if (s && "$ioInterp" in s) {
            return s["$ioInterp"];
        }
        return null;
    }

    public render(): void {
        let ip: any = Renderer.ioInterp();
        let a: number = 1;
        if (ip) {
            ip.hook = as3.bind(this, this.ioInterpolate);
            if (ip.on) {
                this.ioRecord();
                this._ipTick = Number(ip.tick);
                a = Number(ip.first);
            } else {
                this._ipTick = NaN;
            }
        }
        if (a < 1) {
            this.ioLerp(a);
        }
        try {
            this.ioDraw();
        } finally {
            if (a < 1) {
                this.ioUnlerp();
            }
        }
    }

    /** Called by the player for a made-up frame: the yard `a` of the way between the game's last two frames. */
    public ioInterpolate(a: number, tick: number): void {
        let lerp: boolean = a < 1 && tick === this._ipTick;
        if (lerp) {
            this.ioLerp(a);
        }
        try {
            this.ioDraw();
        } finally {
            if (lerp) {
                this.ioUnlerp();
            }
        }
    }

    /** At a game frame: where each entry is now, and where it was at the last one (if it was drawn then). */
    private ioRecord(): void {
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        let list: Vector<RasterData> = null;
        let e: RasterData = null;
        let p: Point = null;
        let i: int = 0;
        ++this._ipReal;
        for (list of as3.values(lists)) {
            i = 0;
            while (i < list.length) {
                e = as3.vget(list, i++);
                if (!e || !(p = e._pt)) {
                    continue;
                }
                if (e._ipSeen == this._ipReal - 1) {
                    e._ipX0 = e._ipX1;
                    e._ipY0 = e._ipY1;
                } else {
                    e._ipX0 = p.x;
                    e._ipY0 = p.y;
                }
                e._ipX1 = p.x;
                e._ipY1 = p.y;
                e._ipSeen = this._ipReal;
            }
        }
    }

    /** Every entry that moved since the last game frame (not one that jumped) part of the way. */
    private ioLerp(a: number): void {
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        let list: Vector<RasterData> = null;
        let e: RasterData = null;
        let p: Point = null;
        let i: int = 0;
        let dx: number = 0;
        let dy: number = 0;
        as3.vsetLength(this._ipApplied, 0);
        for (list of as3.values(lists)) {
            i = 0;
            while (i < list.length) {
                e = as3.vget(list, i++);
                if (!e || !(p = e._pt) || e._ipSeen != this._ipReal) {
                    continue;
                }
                dx = e._ipX1 - e._ipX0;
                dy = e._ipY1 - e._ipY0;
                if (dx == 0 && dy == 0 || Math.abs(dx) + Math.abs(dy) > 200 || p.x != e._ipX1 || p.y != e._ipY1) {
                    continue;
                }
                e._ipSx = p.x;
                e._ipSy = p.y;
                p.x = e._ipX0 + dx * a;
                p.y = e._ipY0 + dy * a;
                this._ipApplied.push(e);
            }
        }
    }

    /** Back where they are (last first: entries that share a point get its real place back last). */
    private ioUnlerp(): void {
        let i: int = (this._ipApplied.length - 1) | 0;
        let e: RasterData = null;
        while (i >= 0) {
            e = as3.vget(this._ipApplied, i);
            e._pt.x = e._ipSx;
            e._pt.y = e._ipSy;
            i--;
        }
        as3.vsetLength(this._ipApplied, 0);
    }

    private ioDraw(): void {
        let _loc1_: Vector<RasterData> = RasterData.s_visibleData;
        let r: Rectangle = null;
        let all: boolean = false;
        this._curCopyIndex = this._curDrawIndex = 0;
        if (RasterData.s_needsSort) {
            this.sortByDepth(_loc1_);
            RasterData.s_needsSort = false;
        }
        // Inferno-only: shadows under buildings (server flag io_shadows), hidden while a building is held
        // (moved in move mode, or a new one being placed) unless io_moveshadows: drawing is lighter then
        let held: boolean = GLOBAL._newBuilding != null || (GLOBAL._selectedBuilding != null && GLOBAL._selectedBuilding._moving);
        this._shadows = !GLOBAL.INFERNO_ONLY || (GLOBAL.ioFlag("io_shadows", 1) > 0 && (!held || GLOBAL.ioFlag("io_moveshadows", 0) > 0));
        let partial: boolean = Renderer.ioMode == 1 || (Renderer.ioMode == 0 && GLOBAL.INFERNO_ONLY && GLOBAL.ioFlag("io_fullredraw", 0) <= 0);
        partial = partial && ("$version" in this._canvas);
        all = this.ioFindChanges(partial);
        this._canvas.lock();
        if (all) {
            // Two passes instead of concat(): that built a new list of everything in the yard every frame.
            this.rasterize(RasterData.s_unsortedData);
            this.rasterize(_loc1_);
            ++Renderer.ioStats.full;
        } else {
            if (this._dirty.length == 0) {
                ++Renderer.ioStats.idle;
            } else {
                for (r of (this._dirty ?? [])) {
                    this.rasterizeIn(RasterData.s_unsortedData, r);
                    this.rasterizeIn(_loc1_, r);
                    Renderer.ioStats.area += r.width * r.height;
                }
                Renderer.ioStats.rects += this._dirty.length;
                ++Renderer.ioStats.partial;
            }
            if (this._sweep.length) {
                // drawn again as it should already be: not logged as a change (a change would join the
                // screen's own and could tip it into repainting everything), only noted as swept: the
                // screen repaints the strip on its own, so whatever this puts right shows
                Object(this._canvas)["$quiet"] = true;
                for (r of (this._sweep ?? [])) {
                    this.rasterizeIn(RasterData.s_unsortedData, r);
                    this.rasterizeIn(_loc1_, r);
                    Object(this._canvas)["$noteSwept"](r.x, r.y, r.width, r.height);
                    Renderer.ioStats.swept += r.width * r.height;
                }
                Object(this._canvas)["$quiet"] = false;
            }
        }
        this._canvas.unlock();
    }

    /** A shadow under a building or a mushroom (drawn first, at the shadow depth). */
    private isShadow(e: RasterData): boolean {
        return e._unSorted && e._depth == 1;
    }

    private static versionOf(b: BitmapData): number {
        return "$version" in b ? Number(Object(b)["$version"]) : NaN;
    }

    /** Where the entry is drawn now (padded for a filter's glow) into _mx.._mh, its pixels' version into _mver. */
    private measure(e: RasterData): void {
        let data: any = e._data;
        let bmd: BitmapData = as3.as(data, BitmapData);
        let sx: number = e._scaleX * 0.01;
        let sy: number = e._scaleY * 0.01;
        let b: Rectangle = null;
        // (a filter draws outside the picture: a glow round a monster under a Sulfur Bomb; without its
        // reach, the old glow's edge was left on the ground as the monster walked)
        let pad: number = Number(e._filter ? Renderer.filterPad(e._filter) : 0);
        if (bmd) {
            this._mx = e._pt.x;
            this._my = e._pt.y;
            this._mw = bmd.width * sx;
            this._mh = bmd.height * sy;
            this._mver = Renderer.versionOf(bmd);
            // a big bitmap (the ground) logs where it changes, so only there is drawn again
            if (bmd.width * bmd.height >= 262144 && "$trackChanges" in bmd && !Object(bmd)["$track"]) {
                Object(bmd)["$trackChanges"]();
            }
        } else {
            b = data instanceof DisplayObject ? as3.cast(data, DisplayObject).getBounds(as3.cast(data, DisplayObject)) : new Rectangle();
            if (data instanceof DisplayObject) {
                pad += Renderer.displayPad(as3.cast(data, DisplayObject), 0);
            }
            this._mx = e._pt.x + b.x * sx;
            this._my = e._pt.y + b.y * sy;
            this._mw = b.width * sx;
            this._mh = b.height * sy;
            // not a bitmap (a building's shadow clip, a flag): in Flash counted as changed every frame; the
            // browser build can tell whether anything in it changed (a signature of its content), so a
            // still clip is not drawn again every frame (fps pass, 4 October)
            this._mver = "$contentSig" in data ? Number(data["$contentSig"]()) : NaN;
        }
        if (this._mw < 0) {
            // (drawn mirrored: the box is to the left of the point)
            this._mx += this._mw;
            this._mw = -this._mw;
        }
        if (this._mh < 0) {
            this._my += this._mh;
            this._mh = -this._mh;
        }
        this._mx -= pad;
        this._my -= pad;
        this._mw += pad * 2;
        this._mh += pad * 2;
    }

    /** How far a filter draws outside what it is on (pixels, rounded up, with a margin). */
    private static filterPad(f: any): number {
        let p: number = 0;
        if (!f) {
            return 0;
        }
        if ("$padding" in f) {
            p = Number(f["$padding"]());
        } else {
            if ("blurX" in f) {
                p = Math.max(Number(f["blurX"]), Number(f["blurY"])) * 1.5;
            }
            if ("distance" in f) {
                p += Math.abs(Number(f["distance"]));
            }
        }
        return Math.ceil(p) + 4;
    }

    /** How far the filters on o and inside it draw outside its bounds (a few levels down). */
    private static displayPad(o: DisplayObject, level: int): number {
        let own: number = 0;
        let inner: number = 0;
        let f: any = null;
        let i: int = 0;
        let c: DisplayObjectContainer = as3.as(o, DisplayObjectContainer);
        let list: any[] = o.filters;
        if (list && list.length) {
            for (f of as3.values(list)) {
                own = Math.max(own, Renderer.filterPad(f));
            }
        }
        if (c && level < 4) {
            while (i < c.numChildren) {
                inner = Math.max(inner, Renderer.displayPad(c.getChildAt(i), (level + 1) | 0));
                i++;
            }
        }
        return own + inner;
    }

    private addDirty(x: number, y: number, w: number, h: number): void {
        let x0: int = Math.max(0, Math.floor(x) - 1) | 0;
        let y0: int = Math.max(0, Math.floor(y) - 1) | 0;
        let x1: int = Math.min(this._canvas.width, Math.ceil(x + w) + 1) | 0;
        let y1: int = Math.min(this._canvas.height, Math.ceil(y + h) + 1) | 0;
        if (x1 > x0 && y1 > y0) {
            this._dirty.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
        }
    }

    /**
     * Compares everything to be drawn now with how it was drawn last frame and collects the rectangles
     * to draw again in _dirty. True when the whole canvas is to be drawn (first frame, most of it
     * changed, or partial redraw off).
     */
    private ioFindChanges(partial: boolean): boolean {
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        let list: Vector<RasterData> = null;
        let e: RasterData = null;
        let i: int = 0;
        let full: boolean = false;
        let same: boolean = false;
        let bmd: BitmapData = null;
        let sub: any = null;
        let b: any[] = null;
        let swap: Vector<RasterData> = null;
        as3.vsetLength(this._dirty, 0);
        as3.vsetLength(this._sweep, 0);
        if (!partial) {
            this._forceFull = true;
            // (when it is switched on again: from a whole frame)
            return true;
        }
        full = this._forceFull;
        this._forceFull = false;
        ++this._frame;
        as3.vsetLength(this._drawnNext, 0);
        for (list of as3.values(lists)) {
            i = 0;
            while (i < list.length) {
                e = as3.vget(list, i++);
                if (!e || e._cleared || !e._pt || e._rsFrame === this._frame) {
                    continue;
                }
                if (!this._shadows && this.isShadow(e)) {
                    continue;
                }
                this.measure(e);
                if (!full) {
                    same = e._rsHas && e._rsX == this._mx && e._rsY == this._my && e._rsW == this._mw && e._rsH == this._mh && e._rsData === e._data && e._rsAlpha == e._alpha && e._rsBlend == e._blendMode && e._rsFilter === e._filter && e._rsDepth == e._depth;
                    if (!e._rsHas) {
                        this.addDirty(this._mx, this._my, this._mw, this._mh);
                    } else if (!same) {
                        this.addDirty(e._rsX, e._rsY, e._rsW, e._rsH);
                        this.addDirty(this._mx, this._my, this._mw, this._mh);
                    } else if (!(this._mver === e._rsVer)) {
                        // the same bitmap in the same place, its pixels changed: where it says, if it
                        // keeps a log (a big one, drawn as is), otherwise all of it
                        bmd = as3.as(e._data, BitmapData);
                        sub = null;
                        if (bmd && !e._filter && (e._scaleX & e._scaleY) === 100 && "$dirtySince" in bmd) {
                            sub = Object(bmd)["$dirtySince"](e._rsVer);
                        }
                        if (sub) {
                            for (b of as3.values(sub)) {
                                this.addDirty(Number(this._mx + b[0]), Number(this._my + b[1]), b[2] - b[0], b[3] - b[1]);
                            }
                        } else {
                            this.addDirty(this._mx, this._my, this._mw, this._mh);
                        }
                    }
                }
                e._rsHas = true;
                e._rsFrame = this._frame;
                e._rsX = this._mx;
                e._rsY = this._my;
                e._rsW = this._mw;
                e._rsH = this._mh;
                e._rsVer = this._mver;
                e._rsData = e._data;
                e._rsAlpha = e._alpha;
                e._rsBlend = e._blendMode;
                e._rsFilter = e._filter;
                e._rsDepth = e._depth;
                this._drawnNext.push(e);
            }
        }
        // drawn last frame, not now (gone, hidden, out of view): where it was is drawn again
        for (e of (this._drawn ?? [])) {
            if (e._rsFrame !== this._frame) {
                if (!full && e._rsHas) {
                    this.addDirty(e._rsX, e._rsY, e._rsW, e._rsH);
                }
                e._rsHas = false;
            }
        }
        swap = this._drawn;
        this._drawn = this._drawnNext;
        this._drawnNext = swap;
        if (full) {
            as3.vsetLength(this._dirty, 0);
            this._sweepAt = -1;
            return true;
        }
        this.addSweep();
        return this.mergeDirty();
    }

    /**
     * A safety net: the view is drawn again from scratch a strip at a time, top to bottom, so all of it
     * once every io_sweepms (server config redrawSweepMs, 1 second; 0 turns it off). Whatever a partial
     * redraw might ever leave behind lasts no longer than that, and no frame costs much more for it
     * (at 40 frames a second, a strip is a fortieth of the view). The strip covers the time since the
     * last frame, so a slow device sweeps just as often, in bigger strips. The strip is drawn without
     * logging it as a change, and noted as swept instead (see render): the screen repaints it apart from
     * its changes, so that it cannot tip the screen into repainting everything.
     */
    private addSweep(): void {
        let ms: number = Number(GLOBAL._flags && GLOBAL._flags.hasOwnProperty("io_sweepms") ? Number(GLOBAL._flags.io_sweepms) : 1000);
        let v: Rectangle = this._viewRect;
        let now: int = getTimer();
        let to: number = 0;
        if (!(ms > 0) || !v || v.height <= 0) {
            return;
        }
        if (this._sweepAt < 0) {
            this._sweepAt = now;
            return;
        }
        to = this._sweepPos + (now - this._sweepAt) / ms;
        this._sweepAt = now;
        if (to - this._sweepPos >= 1) {
            // (a long pause: the whole view)
            this.addStrip(v, 0, 1);
        } else if (to <= 1) {
            this.addStrip(v, this._sweepPos, to);
        } else {
            this.addStrip(v, this._sweepPos, 1);
            this.addStrip(v, 0, to - 1);
        }
        this._sweepPos = to % 1;
    }

    /** The part of the view from a to b (0..1, top to bottom), whole pixels, inside the canvas. */
    private addStrip(v: Rectangle, a: number, b: number): void {
        let x0: int = Math.max(0, Math.floor(v.x)) | 0;
        let y0: int = Math.max(0, Math.floor(v.y + a * v.height)) | 0;
        let x1: int = Math.min(this._canvas.width, Math.ceil(v.x + v.width)) | 0;
        let y1: int = Math.min(this._canvas.height, Math.ceil(v.y + b * v.height)) | 0;
        if (x1 > x0 && y1 > y0) {
            this._sweep.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
        }
    }

    /**
     * Many changes (a battle: every monster, its shadow, every shot) become the 32-pixel tiles they touch,
     * then rows of touched tiles, joined downwards where rows match. Merging hundreds of rectangles
     * pairwise until none overlapped cost more than drawing them (it started again after every merge),
     * and past 24 everything became one box round the lot: most of the yard drawn again.
     */
    private tileDirty(): void {
        let d: Vector<Rectangle> = this._dirty;
        let cw: int = this._canvas.width;
        let ch: int = this._canvas.height;
        let t: int = GLOBAL.ioFlag("io_tile", Number(d.length > 400 ? Renderer.TILE * 2 : Renderer.TILE)) | 0;
        let cols: int = ((cw + t - 1) / t) | 0;
        let rows: int = ((ch + t - 1) / t) | 0;
        let n: int = (cols * rows) | 0;
        let r: Rectangle = null;
        let c0: int = 0;
        let c1: int = 0;
        let r0: int = 0;
        let r1: int = 0;
        let minR: int = rows;
        let maxR: int = -1;
        let minC: int = cols;
        let maxC: int = -1;
        let x: int = 0;
        let y: int = 0;
        let run: int = 0;
        let key: int = 0;
        let open: any = {};
        let next: any = null;
        let k: string = null;
        let out: Vector<Rectangle> = new Vector<Rectangle>(0, false, Rectangle);
        if (this._tiles.length != n || this._tilesW != cols) {
            this._tiles = new Vector<int>(n, false, int);
            this._tilesW = cols;
        }
        for (r of (d ?? [])) {
            c0 = (r.x / t) | 0;
            c1 = ((r.x + r.width - 1) / t) | 0;
            r0 = (r.y / t) | 0;
            r1 = ((r.y + r.height - 1) / t) | 0;
            if (c0 < 0) {
                c0 = 0;
            }
            if (r0 < 0) {
                r0 = 0;
            }
            if (c1 >= cols) {
                c1 = (cols - 1) | 0;
            }
            if (r1 >= rows) {
                r1 = (rows - 1) | 0;
            }
            if (c0 < minC) {
                minC = c0;
            }
            if (c1 > maxC) {
                maxC = c1;
            }
            if (r0 < minR) {
                minR = r0;
            }
            if (r1 > maxR) {
                maxR = r1;
            }
            y = r0;
            while (y <= r1) {
                x = c0;
                while (x <= c1) {
                    as3.vset(this._tiles, y * cols + x, 1);
                    x++;
                }
                y++;
            }
        }
        y = minR;
        while (y <= maxR) {
            next = {};
            x = minC;
            while (x <= maxC) {
                if (as3.vget(this._tiles, y * cols + x) == 0) {
                    x++;
                    continue;
                }
                run = x;
                while (x <= maxC && as3.vget(this._tiles, y * cols + x) != 0) {
                    as3.vset(this._tiles, y * cols + x, 0);
                    x++;
                }
                key = (run * 65536 + x) | 0;
                r = as3.as(open[key], Rectangle);
                if (r) {
                    r.height += t;
                } else {
                    r = new Rectangle(run * t, y * t, (x - run) * t, t);
                    out.push(r);
                }
                next[key] = r;
            }
            open = next;
            y++;
        }
        as3.vsetLength(d, 0);
        for (r of (out ?? [])) {
            // (inside the canvas)
            if (r.right > cw) {
                r.width = cw - r.x;
            }
            if (r.bottom > ch) {
                r.height = ch - r.y;
            }
            if (r.width > 0 && r.height > 0) {
                d.push(r);
            }
        }
    }

    /** Overlapping rectangles become one; many become rows of tiles (tileDirty). True when that is most of the canvas. */
    private mergeDirty(): boolean {
        let d: Vector<Rectangle> = this._dirty;
        let merged: boolean = d.length <= 12;
        let i: int = 0;
        let j: int = 0;
        let a: Rectangle = null;
        let b: Rectangle = null;
        let area: number = 0;
        if (!merged) {
            this.tileDirty();
        }
        while (merged) {
            merged = false;
            i = 0;
            outer:
            while (i < d.length) {
                a = as3.vget(d, i);
                j = (i + 1) | 0;
                while (j < d.length) {
                    b = as3.vget(d, j);
                    if (a.x <= b.right && b.x <= a.right && a.y <= b.bottom && b.y <= a.bottom) {
                        as3.vset(d, i, a.union(b));
                        d.splice(j, 1);
                        merged = true;
                        break outer;
                    }
                    j++;
                }
                i++;
            }
        }
        if (d.length > 400) {
            a = as3.vget(d, 0);
            for (b of (d ?? [])) {
                a = a.union(b);
            }
            as3.vsetLength(d, 0);
            d.push(a);
        }
        for (a of (d ?? [])) {
            area += a.width * a.height;
        }
        if (area > this._canvas.width * this._canvas.height * 0.7) {
            return true;
        }
        this.ioWholeView(area);
        return false;
    }

    /**
     * When changes cover much of what is on screen (a battle), the part of the yard on screen is drawn again
     * as one rectangle: each thing in it once, not once for every rectangle it crosses (with a hundred
     * rectangles that was most of a battle's drawing). Changes off screen keep their own rectangles.
     * Server flag io_viewall: the share of the view (percent, default 35) from which this happens.
     */
    private ioWholeView(area: number): void {
        let v: Rectangle = this._viewRect;
        let d: Vector<Rectangle> = this._dirty;
        let cw: int = this._canvas.width;
        let ch: int = this._canvas.height;
        let x0: int = 0;
        let y0: int = 0;
        let x1: int = 0;
        let y1: int = 0;
        let r: Rectangle = null;
        let keep: Vector<Rectangle> = null;
        let inView: number = 0;
        if (!v || d.length < 8) {
            return;
        }
        x0 = Math.max(0, Math.floor(v.x)) | 0;
        y0 = Math.max(0, Math.floor(v.y)) | 0;
        x1 = Math.min(cw, Math.ceil(v.x + v.width)) | 0;
        y1 = Math.min(ch, Math.ceil(v.y + v.height)) | 0;
        if (x1 <= x0 || y1 <= y0) {
            return;
        }
        for (r of (d ?? [])) {
            inView += Math.max(0, Math.min(x1, r.x + r.width) - Math.max(x0, r.x)) * Math.max(0, Math.min(y1, r.y + r.height) - Math.max(y0, r.y));
        }
        if (inView < (x1 - x0) * (y1 - y0) * GLOBAL.ioFlag("io_viewall", 35) / 100) {
            return;
        }
        keep = new Vector<Rectangle>(0, false, Rectangle);
        keep.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
        for (r of (d ?? [])) {
            if (r.x < x0 || r.y < y0 || r.x + r.width > x1 || r.y + r.height > y1) {
                // (reaches outside the view: the parts outside it)
                Renderer.outside(keep, r, x0, y0, x1, y1);
            }
        }
        as3.vsetLength(d, 0);
        for (r of (keep ?? [])) {
            d.push(r);
        }
    }

    /** Draws, in order, the part of each entry inside r (it was drawn whole there before: the same pixels). */
    private rasterizeIn(param1: Vector<RasterData>, r: Rectangle): void {
        let entry: RasterData = null;
        let entryBmd: BitmapData = null;
        let i: int = 0;
        let len: int = param1.length | 0;
        let px: number = 0;
        let py: number = 0;
        let x0: number = 0;
        let y0: number = 0;
        let x1: number = 0;
        let y1: number = 0;
        // (the rectangle's edges once, not as getters for every entry)
        let rx: number = r.x;
        let ry: number = r.y;
        let rr: number = r.x + r.width;
        let rb: number = r.y + r.height;
        while (i < len) {
            entry = as3.vget(param1, i++);
            if (!entry || entry._cleared || !entry._pt || !entry._rsHas) {
                continue;
            }
            if (entry._rsX >= rr || entry._rsX + entry._rsW <= rx || entry._rsY >= rb || entry._rsY + entry._rsH <= ry) {
                continue;
            }
            entryBmd = as3.as(entry._data, BitmapData);
            if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX & entry._scaleY) === 100 && entry._alpha === 4278190080) {
                // (copyPixels puts a bitmap at whole pixels, rounded)
                px = Math.round(entry._pt.x);
                py = Math.round(entry._pt.y);
                x0 = Math.max(r.x, px);
                y0 = Math.max(r.y, py);
                x1 = Math.min(r.right, px + entryBmd.width);
                y1 = Math.min(r.bottom, py + entryBmd.height);
                if (x1 <= x0 || y1 <= y0) {
                    continue;
                }
                this._src.x = x0 - px;
                this._src.y = y0 - py;
                this._src.width = x1 - x0;
                this._src.height = y1 - y0;
                this._pt.x = x0;
                this._pt.y = y0;
                this._canvas.copyPixels(entryBmd, this._src, this._pt);
            } else {
                // (no clip when all of it is inside: a clip costs a save, a path and a restore)
                this.drawEntry(entry, entryBmd, entry._rsX >= rx && entry._rsY >= ry && entry._rsX + entry._rsW <= rr && entry._rsY + entry._rsH <= rb ? null : r);
            }
        }
    }

    /** The parts of r outside the box x0..x1, y0..y1 (up to four rectangles) onto out. */
    private static outside(out: Vector<Rectangle>, r: Rectangle, x0: int, y0: int, x1: int, y1: int): void {
        let rx0: number = r.x;
        let ry0: number = r.y;
        let rx1: number = r.x + r.width;
        let ry1: number = r.y + r.height;
        let my0: number = Math.max(ry0, y0);
        let my1: number = Math.min(ry1, y1);
        if (rx1 <= x0 || rx0 >= x1 || ry1 <= y0 || ry0 >= y1) {
            out.push(r);
            // (none of it inside)
            return;
        }
        if (ry0 < y0) {
            out.push(new Rectangle(rx0, ry0, rx1 - rx0, y0 - ry0));
        }
        if (ry1 > y1) {
            out.push(new Rectangle(rx0, y1, rx1 - rx0, ry1 - y1));
        }
        if (my1 > my0) {
            if (rx0 < x0) {
                out.push(new Rectangle(rx0, my0, x0 - rx0, my1 - my0));
            }
            if (rx1 > x1) {
                out.push(new Rectangle(x1, my0, rx1 - x1, my1 - my0));
            }
        }
    }

    /** The entry's own Bitmap of its picture with its filter (see RasterData._ioBm). */
    private filteredBitmap(entry: RasterData, bmd: BitmapData): Bitmap {
        let bm: Bitmap = entry._ioBm;
        let f: BitmapFilter = entry._filter;
        if (!bm) {
            bm = entry._ioBm = new Bitmap();
        }
        if (bm.bitmapData != bmd) {
            bm.bitmapData = bmd;
        }
        // (set every time, as before: the filter may have been changed in place, a glow pulsing; the
        // browser build compares the filter's values, so an unchanged glow still finds its picture)
        bm.filters = [f];
        return bm;
    }

    /** An entry that is not a plain copy: see-through, blended, filtered, scaled, or not a bitmap; clipped to clip (or not). */
    private drawEntry(entry: RasterData, entryBmd: BitmapData, clip: Rectangle): void {
        this._pt.x = entry._pt.x;
        this._pt.y = entry._pt.y;
        if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX & entry._scaleY) === 100) {
            this._matrix.createBox(1, 1, 0, this._pt.x, this._pt.y);
            this._alphaCt.alphaMultiplier = (entry._alpha >>> 24) / 255;
            this._canvas.draw(as3.cast(entryBmd, IBitmapDrawable), this._matrix, this._alphaCt, null, clip);
            return;
        }
        this._matrix.createBox(entry._scaleX * 0.01, entry._scaleY * 0.01, 0, this._pt.x, this._pt.y);
        if (Boolean(entry._filter) && Boolean(entryBmd)) {
            this._canvas.draw(as3.cast(this.filteredBitmap(entry, entryBmd), IBitmapDrawable), this._matrix, null, entry._blendMode, clip);
        } else {
            this._canvas.draw(entry._data, this._matrix, null, entry._blendMode, clip);
        }
    }

    /**
     * The list needs sorting almost every frame during a battle, because every moving monster
     * changes depth, yet it is nearly in order each time: buildings never move. Vector.sort()
     * with a compare function costs thousands of function calls regardless; an insertion sort is
     * close to free on a nearly sorted list, and it is stable, so equal depths do not flicker.
     * When the list really is out of order (a yard has just loaded) it gives up early and the
     * built-in sort does the job.
     */
    private sortByDepth(param1: Vector<RasterData>): void {
        let i: int = 1;
        let j: int = 0;
        let item: RasterData = null;
        let depth: number = NaN;
        let length: int = param1.length | 0;
        let budget: int = (length * 12) | 0;
        while (i < length) {
            item = as3.vget(param1, i);
            depth = item._depth;
            j = (i - 1) | 0;
            while (j >= 0 && as3.vget(param1, j)._depth > depth) {
                as3.vset(param1, j + 1, as3.vget(param1, j));
                j--;
                if (--budget < 0) {
                    as3.vset(param1, j + 1, item);
                    as3.sort(param1, as3.bind(this, this.sortRasterData));
                    return;
                }
            }
            as3.vset(param1, j + 1, item);
            i++;
        }
    }

    private cull(param1: Vector<RasterData>): void {
        let _loc3_: RasterData = null;
        let _loc4_: Rectangle = null;
        let _loc2_: Vector<RasterData> = param1;
        for (_loc3_ of (_loc2_ ?? [])) {
            (_loc4_ = _loc3_._rect).x = _loc3_._pt.x;
            _loc4_.y = _loc3_._pt.y;
            if (this._viewRect.intersects(_loc4_)) {
                as3.vset(_loc2_, _loc2_.length, _loc3_);
            }
        }
    }

    private sortRasterData(param1: RasterData, param2: RasterData): number {
        return param1._depth - param2._depth;
    }

    private rasterize(param1: Vector<RasterData>): void {
        let entries: Vector<RasterData> = null;
        let entry: RasterData = null;
        let entryBmd: BitmapData = null;
        let i: int = 0;

        entries = param1;
        let len: int = entries.length | 0;

        while (i < len) {
            entry = as3.vget(entries, i);
            if (!entry || entry._cleared || !entry._pt || (!this._shadows && this.isShadow(entry))) {
                i++;
                continue;
            }
            entryBmd = as3.as(entry._data, BitmapData);
            this._pt.x = entry._pt.x;
            this._pt.y = entry._pt.y;
            if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX & entry._scaleY) === 100) {
                if (entry._alpha === 4278190080) {
                    this._canvas.copyPixels(entryBmd, entryBmd.rect, this._pt);
                } else {
                    // Half see-through (a building being moved or placed): drawn at that opacity. It
                    // was copied through an alpha mask, which in the browser meant a scratch canvas
                    // that made the browser draw out everything queued so far that frame, once for
                    // every layer of the building: most of the time moving a building took.
                    this._matrix.createBox(1, 1, 0, this._pt.x, this._pt.y);
                    this._alphaCt.alphaMultiplier = (entry._alpha >>> 24) / 255;
                    this._canvas.draw(as3.cast(entryBmd, IBitmapDrawable), this._matrix, this._alphaCt);
                }
            } else {
                this._matrix.createBox(entry._scaleX * 0.01, entry._scaleY * 0.01, 0, this._pt.x, this._pt.y);
                if (Boolean(entry._filter) && Boolean(entryBmd)) {
                    this._canvas.draw(as3.cast(this.filteredBitmap(entry, entryBmd), IBitmapDrawable), this._matrix, null, entry._blendMode);
                } else {
                    this._canvas.draw(entry._data, this._matrix, null, entry._blendMode);
                }
            }
            i++;
        }
    }
}
