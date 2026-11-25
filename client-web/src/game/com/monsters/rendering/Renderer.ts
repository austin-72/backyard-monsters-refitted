import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, Shape } from "flash/display";
import { BitmapFilter } from "flash/filters";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { GLOBAL, IoLighting, IoTilt, MAP, RasterData } from "@game";
import { GL_MIN, GlYard, glBlendOf, glRememberBlack, glRememberedBlack, type GlSource } from "flash/_glYard";
import { player } from "flash/display/core";

// AS3 namespace renderer_friend: members declared in it are plain properties in TypeScript.

export class Renderer extends ASObject {
    static {
        as3.fields(this, { _canvas: null, _viewRect: null, _matrix: null, _pt: null, _bm: null, _alphaCt: null, _curCopyIndex: 0, _curDrawIndex: 0, _frame: 0, _drawn: null, _drawnNext: null, _forceFull: true, _dirty: null, _sweep: null, _shadows: true, _sweepPos: 0, _sweepAt: -1, _src: null, _mx: 0, _my: 0, _mw: 0, _mh: 0, _mver: 0, _ipReal: 0, _ipTick: NaN, _ipApplied: null, _tiles: null, _tilesW: 0, _viewAll: false, _lens: null, _lensBm: null, _lensOn: false, _lensHid: false, _lensF: 1, _lensX: 0, _lensY: 0, _lensRaw: 0, _lensRawAt: 0, _lensFull: false, _fullStale: false, _lensClip: null, _lensView: null, _lensExposed: null, _lensScreen: 0, _ioLensNx: 0, _ioLensNy: 0 });
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

    /** Inferno-only (19 October): the yard's changes logged once a rectangle (ioDraw), false: every copy, as before (tests). */
    public static ioQuiet: boolean = true;

    /** What the frames did: whole, partial, nothing to do; rectangles and pixels drawn again (tests). */
    public static readonly ioStats: any = { "full": 0, "partial": 0, "idle": 0, "rects": 0, "area": 0, "swept": 0, "lens": 0, "lensFull": 0, "lensScroll": 0, "vcN": 0, "vcRects": 0, "vcView": 0, "vcYes": 0, "vcSkip": 0 };

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
    /** This frame redraws all of the view (ioWholeView): the sweep's strip, inside it, is drawn already. */
    private _viewAll: boolean;
    private _tilesW: int;
    // ---- Inferno-only (QoL #223): the zoomed-in yard drawn at the screen's resolution (see ioLensPlan) -------------
    /** The lens canvas (opaque), and the Bitmap that shows it in place of the yard's canvas. */
    private _lens: BitmapData;
    private _lensBm: Bitmap;
    /** Drawing into the lens canvas now; the yard's canvas hidden by it (put back when the lens goes). */
    private _lensOn: boolean;
    private _lensHid: boolean;
    /** Lens pixels per canvas pixel, and the canvas point at the lens canvas's top left (lens pixels on whole pixels). */
    private _lensF: number;
    private _lensX: number;
    private _lensY: number;
    /** The resolution the screen asks for (lens pixels per canvas pixel) and when it last changed (getTimer). */
    private _lensRaw: number;
    private _lensRawAt: int;
    /** The next lens drawing draws all of it. */
    private _lensFull: boolean;
    /** The yard's canvas was not drawn while the lens was on: drawn whole when it is shown again. */
    private _fullStale: boolean;
    /** Scratch: the lens pixels a rectangle covers; the part of the canvas on screen; canvas rectangles uncovered by a scroll. */
    private _lensClip: Rectangle;
    private _lensView: Rectangle;
    private _lensExposed: any[];
    /** The screen's pixels per canvas pixel now (the zoom times the page's resolution). */
    private _lensScreen: number;
    /** Where the lens canvas's top left goes (ioLensOrigin). */
    private _ioLensNx: number;
    private _ioLensNy: number;

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
        this._lensClip = new Rectangle();
        this._lensView = new Rectangle();
        this._lensExposed = [];
        super.$ctor();
        this._canvas = param1;
        this._viewRect = param2;
    }

    /** QoL #223: 0: the lens canvas when zoomed in (server flag io_lens, default on), -1: never (tests, comparing). */
    public static ioLensMode: int = 0;

    /** The most lens pixels per canvas pixel (2: four times the pixels). */
    private static readonly LENS_RES: number = 2;

    /** Less than this many lens pixels per canvas pixel is not worth a lens canvas: the yard's canvas, as before. */
    private static readonly LENS_MIN: number = 1.2;

    /** The lens canvas's largest side and its most pixels (6 megapixels: 24 MB, under the yard canvas's 32). */
    private static readonly LENS_SIDE: int = 4096;

    private static readonly LENS_AREA: number = 6000000;

    /** Room round the part on screen, each side (a share of it): a small pan or pinch out stays inside. */
    private static readonly LENS_MARGIN: number = 0.1;

    /** How long the resolution asked for must keep still before it is followed (a pinch going on: not every frame). */
    private static readonly LENS_SETTLE_MS: int = 250;

    /** The renderer that drew last (ioLensInfo). */
    private static _ioLast: Renderer = null;

    /**
     * QoL #223 (tests): what the yard is drawn into now. on: the lens canvas (res lens pixels per canvas pixel, w x h,
     * its top left at canvas x, y; viewW x viewH: the canvas pixels on screen); off: the yard's canvas (canvasW x canvasH).
     */
    public static get ioLensInfo(): any {
        let r: Renderer = Renderer._ioLast;
        if (!r || !r._canvas) {
            return { "on": false };
        }
        // (a yard gone: its canvas disposed)
        try {
            return { "on": r._lensOn, "res": r._lensOn ? r._lensF : 1, "want": r._lensRaw, "w": r._lens ? r._lens.width : 0, "h": r._lens ? r._lens.height : 0, "x": r._lensX, "y": r._lensY, "viewW": r._lensView.width, "viewH": r._lensView.height, "canvasW": r._canvas.width, "canvasH": r._canvas.height, "shown": r._lensBm != null && r._lensBm.parent != null && r._lensBm.visible };
        } catch (e) {
            return { "on": false };
        }
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
        Renderer._ioLast = this;
        // (Inferno-only, 20 October: an admin's lighting and spooky yard kept with the yard before it's drawn)
        if (GLOBAL.INFERNO_ONLY) {
            IoLighting.beforeRender();
        }
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
        let tilted: boolean = false;
        let shown: boolean = false;
        try {
            shown = Renderer.ioShowAt(ip, a);
            tilted = this.ioTilt();
            this.ioDraw();
        } finally {
            if (tilted) {
                this.ioUntilt();
            }
            if (shown) {
                Renderer.ioUnshow();
            }
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
        let tilted: boolean = false;
        let shown: boolean = false;
        try {
            shown = Renderer.ioShowAt(Renderer.ioInterp(), a);
            tilted = this.ioTilt();
            this.ioDraw();
        } finally {
            if (tilted) {
                this.ioUntilt();
            }
            if (shown) {
                Renderer.ioUnshow();
            }
            if (lerp) {
                this.ioUnlerp();
            }
        }
    }

    // ---- Inferno-only (21 October, the user's: "when quickly clicking and dragging there are black bars on the side that
    // is now rendering"): the page's frame interpolation shows the yard's layers part of the way from where they were
    // to where they are now (display/core interp.apply), after the yard is drawn: the part on screen the card's picture
    // (ioGlPlan) and the lens canvas (ioLensWant) cover was worked out where the layers are now, not where they are
    // shown. A quick drag moves them up to 400 pixels a frame: shown part of the way back, a strip at the edge had
    // nothing over it (the yard's own canvas is hidden then): black. While the yard is drawn, its layers are put where
    // they are shown, as interp.apply puts them, and put back after.
    private static _ioShown: any[] = [];

    private static ioShowAt(ip: any, a: number): boolean {
        Renderer._ioShown.length = 0;
        if (!ip || !ip.on || !(a < 1) || !(a >= 0)) {
            return false;
        }
        let cc: any = MAP._canvasContainer;
        let max: number = Number(ip.maxJump);
        for (let d: any = cc ? cc.parent : null; d; d = d.parent) {
            let s0: number[] = d.$ip0;
            if (d.$ipT !== ip.tick || !s0) {
                continue;
            }
            let x: number = d.$x;
            let y: number = d.$y;
            if (x === s0[0] && y === s0[1] && d.$sx === s0[2] && d.$sy === s0[3] && d.$skewX === s0[4] && d.$skewY === s0[5]) {
                continue;
            }
            if (Math.abs(x - s0[0]) + Math.abs(y - s0[1]) > max) {
                continue;
            }
            Renderer._ioShown.push([d, x, y, d.$sx, d.$sy, d.$skewX, d.$skewY]);
            d.$x = s0[0] + (x - s0[0]) * a;
            d.$y = s0[1] + (y - s0[1]) * a;
            d.$sx = s0[2] + (d.$sx - s0[2]) * a;
            d.$sy = s0[3] + (d.$sy - s0[3]) * a;
            d.$skewX = s0[4] + Renderer.ioAngleStep(s0[4], d.$skewX) * a;
            d.$skewY = s0[5] + Renderer.ioAngleStep(s0[5], d.$skewY) * a;
            d.$matrixCache = null;
        }
        return Renderer._ioShown.length > 0;
    }

    private static ioUnshow(): void {
        for (let i: int = (Renderer._ioShown.length - 1) | 0; i >= 0; i--) {
            let s: any[] = Renderer._ioShown[i];
            let d: any = s[0];
            d.$x = s[1];
            d.$y = s[2];
            d.$sx = s[3];
            d.$sy = s[4];
            d.$skewX = s[5];
            d.$skewY = s[6];
            d.$matrixCache = null;
        }
        Renderer._ioShown.length = 0;
    }

    /** The shorter way round from angle a to b (radians), as interp.apply turns. */
    private static ioAngleStep(a: number, b: number): number {
        let d: number = (b - a) % (Math.PI * 2);
        if (d > Math.PI) {
            d -= Math.PI * 2;
        } else if (d < -Math.PI) {
            d += Math.PI * 2;
        }
        return d;
    }

    // ---- Inferno-only (14 October): the yard tilted (IoTilt; admins) ------------------------------------------------
    // The canvas is the yard's height times the tilt's k (the map squashes it back by its ground's scale and the
    // canvas's own: what is drawn here is drawn at its size on screen). While a frame is drawn, what lies on the
    // ground (the ground, shadows, footprints: unsorted or _ioFlat) is drawn at k times its y and its height; what
    // stands (buildings, monsters) is moved so that its foot (_ioFoot, else its picture's bottom) is at k times its
    // y, its picture as it is; the view's rectangle the same. All put back after.
    private _ioTiltMark: int = 0;
    private _ioTiltPts: any[] = [];
    private _ioTiltFlat: any[] = [];
    private _ioTiltView: number[] = [0, 0];

    private ioTilt(): boolean {
        let k: number = IoTilt.canvasK;
        if (k === 1 || !(k > 0)) {
            return false;
        }
        let mark: int = ++this._ioTiltMark;
        this._ioTiltPts.length = 0;
        this._ioTiltFlat.length = 0;
        let v: Rectangle = this._viewRect;
        this._ioTiltView[0] = v.y;
        this._ioTiltView[1] = v.height;
        v.y = v.y * k;
        v.height = v.height * k;
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        for (let list of lists) {
            let len: int = list.length | 0;
            for (let i: int = 0; i < len; i++) {
                let e: RasterData = as3.vget(list, i);
                if (!e || !e._pt || e._cleared) {
                    continue;
                }
                let flat: boolean = e._unSorted || e._ioFlat;
                if (flat) {
                    e._ioTs = e._scaleY;
                    e._scaleY = e._scaleY * k;
                    this._ioTiltFlat.push(e);
                }
                let p: any = e._pt;
                if (p.$ioTilt === mark) {
                    continue;
                }
                p.$ioTilt = mark;
                p.$ioTy = p.y;
                this._ioTiltPts.push(p);
                if (flat) {
                    p.y = p.y * k;
                } else {
                    let foot: number = e._ioFoot;
                    if (!(foot === foot)) {
                        foot = p.y + this.ioPictureBottom(e);
                    }
                    p.y = p.y + foot * (k - 1);
                }
            }
        }
        return true;
    }

    /** How far below its point an entry's picture ends (its foot when it says none). */
    private ioPictureBottom(e: RasterData): number {
        let bmd: BitmapData = as3.as(e._data, BitmapData);
        if (bmd) {
            return bmd.height * e._scaleY * 0.01;
        }
        let d: any = e._data;
        if (d instanceof DisplayObject) {
            let b: Rectangle = as3.cast(d, DisplayObject).getBounds(as3.cast(d, DisplayObject));
            return (b.y + b.height) * e._scaleY * 0.01;
        }
        return 0;
    }

    private ioUntilt(): void {
        for (let i: int = (this._ioTiltPts.length - 1) | 0; i >= 0; i--) {
            let p: any = this._ioTiltPts[i];
            p.y = p.$ioTy;
        }
        for (let e of this._ioTiltFlat) {
            e._scaleY = e._ioTs;
        }
        this._ioTiltPts.length = 0;
        this._ioTiltFlat.length = 0;
        this._viewRect.y = this._ioTiltView[0];
        this._viewRect.height = this._ioTiltView[1];
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
        this._ioShMerge = this._shadows && GLOBAL.INFERNO_ONLY && GLOBAL.ioFlag("io_shadowstack", 0) <= 0;
        let partial: boolean = Renderer.ioMode == 1 || (Renderer.ioMode == 0 && GLOBAL.INFERNO_ONLY && GLOBAL.ioFlag("io_fullredraw", 0) <= 0);
        partial = partial && ("$version" in this._canvas);
        // (Inferno-only, 21 October: drawn by the graphics card when it can: ioGlDraw)
        if (GLOBAL.INFERNO_ONLY && this.ioGlPlan(partial) && this.ioGlDraw()) {
            return;
        }
        // (QoL #223: zoomed in, the part of the yard on screen is drawn into the lens canvas instead, at the screen's
        // resolution: see ioLensPlan)
        let lens: boolean = GLOBAL.INFERNO_ONLY && this.ioLensPlan(partial);
        all = this.ioFindChanges(partial);
        if (lens) {
            this.ioLensDraw(all);
            return;
        }
        this._canvas.lock();
        // (Inferno-only, 19 October: drawn quietly, the change logged once for each rectangle drawn again (every copy
        // into it is clipped to it) or once for all of it: a battle logged every monster's every copy, a thousand
        // a frame, and the screen went through them all to find what to draw again)
        let quiet: boolean = Renderer.ioQuiet && GLOBAL.INFERNO_ONLY && "$touchRect" in this._canvas && !Object(this._canvas)["$quiet"];
        if (all) {
            if (quiet) {
                Object(this._canvas)["$quiet"] = true;
            }
            try {
                // Two passes instead of concat(): that built a new list of everything in the yard every frame.
                this.rasterize(RasterData.s_unsortedData);
                this.rasterize(_loc1_);
            } finally {
                if (quiet) {
                    Object(this._canvas)["$quiet"] = false;
                    Object(this._canvas)["$touch"]();
                }
            }
            ++Renderer.ioStats.full;
        } else {
            if (this._dirty.length == 0) {
                ++Renderer.ioStats.idle;
            } else {
                if (quiet) {
                    Object(this._canvas)["$quiet"] = true;
                }
                try {
                    for (r of (this._dirty ?? [])) {
                        this.rasterizeIn(RasterData.s_unsortedData, r);
                        this.rasterizeIn(_loc1_, r);
                        Renderer.ioStats.area += r.width * r.height;
                    }
                } finally {
                    if (quiet) {
                        Object(this._canvas)["$quiet"] = false;
                        for (r of (this._dirty ?? [])) {
                            Object(this._canvas)["$touchRect"](r.x, r.y, r.width, r.height);
                        }
                    }
                }
                Renderer.ioStats.rects += this._dirty.length;
                ++Renderer.ioStats.partial;
            }
            // (all of the view drawn again this frame, a battle: the strip is inside it, drawn already; drawing it twice
            // was a sixth of a battle's yard drawing, fps pass 11 October)
            if (this._sweep.length && !this._viewAll) {
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

    // ---- Inferno-only (QoL #223): the zoomed-in yard drawn at the screen's resolution ---------------------------------
    // The yard is drawn into one canvas as big as the yard (MAP._canvas, 4000 x 2000), shown inside the yard's layer; the
    // lens (IoPinchZoom: pinch, double tap, the wheel) scales that layer up, so zoomed in, each of the canvas's pixels
    // covered two or three of the screen's (more on a phone's sharp screen), copied without smoothing: blocky, and
    // anything drawn as shapes (outlines, flags, effects) no sharper than its pixels. Zoomed in, the part of the yard on
    // screen (and a margin round it) is drawn instead into a canvas of its own (the lens canvas) with as many pixels as
    // the screen gives it, at most LENS_RES per canvas pixel, its side at most LENS_SIDE and LENS_AREA pixels in all:
    // every picture drawn scaled, smoothly, from its own pixels, shapes drawn at that resolution. The lens canvas is
    // shown, in the yard's layer, where that part of the yard's canvas is (scaled down by the same factor), and the
    // yard's canvas is hidden; nothing else in the yard changes (the buildings' hit areas and the layers above are
    // display objects, as before; what the renderer draws, how and in what order is the same, only scaled).
    // It is drawn as the yard's canvas is: only what changed (ioFindChanges' rectangles, in the canvas's pixels), the
    // sweep, all of it when most changed. A pan moves its content (a copy of itself) and draws only the strip
    // uncovered; while a pinch goes on its resolution is kept (lowered at once when the part on screen would no longer
    // fit) and follows the zoom once it has kept still LENS_SETTLE_MS. Back at less than LENS_MIN lens pixels per canvas
    // pixel (zoomed out), with the resolution lowered (the page's Battery saver, Balanced or Fast, dynamic resolution
    // stepping down), without partial redraw, or in Flash: the yard's canvas, drawn whole once (it was left as it was
    // while the lens canvas was on), as before.

    /** The yard's canvas's part on screen into _lensView (canvas pixels), and the lens pixels per canvas pixel the screen asks for (0: no lens). */
    private ioLensWant(partial: boolean): number {
        let cc: Bitmap = MAP._canvasContainer;
        let s: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = s && "$ioView" in s ? s["$ioView"] : null;
        if (!partial || Renderer.ioLensMode < 0 || !view || view.saver || !cc || !cc.parent || !cc.stage || cc.bitmapData !== this._canvas || GLOBAL.ioFlag("io_lens", 1) <= 0) {
            return 0;
        }
        // (stage pixels per canvas pixel: the lens, the ground's own scale; across, the tilt does not change it)
        let p0: Point = cc.localToGlobal(new Point(0, 0));
        let p1: Point = cc.localToGlobal(new Point(1000, 0));
        let zoom: number = (p1.x - p0.x) / 1000;
        if (!(zoom > 1.01)) {
            return 0;
        }
        let raw: number = zoom * Number(view.px);
        this._lensScreen = raw;
        if (!(raw >= Renderer.LENS_MIN)) {
            return 0;
        }
        let a: Point = cc.globalToLocal(new Point(Number(view.x), Number(view.y)));
        let b: Point = cc.globalToLocal(new Point(Number(view.x) + Number(view.w), Number(view.y) + Number(view.h)));
        let x0: number = Math.max(0, Math.min(a.x, b.x));
        let y0: number = Math.max(0, Math.min(a.y, b.y));
        let x1: number = Math.min(this._canvas.width, Math.max(a.x, b.x));
        let y1: number = Math.min(this._canvas.height, Math.max(a.y, b.y));
        if (!(x1 - x0 >= 8) || !(y1 - y0 >= 8)) {
            return 0;
        }
        this._lensView.x = x0;
        this._lensView.y = y0;
        this._lensView.width = x1 - x0;
        this._lensView.height = y1 - y0;
        return Math.min(Renderer.LENS_RES, raw);
    }

    /** The resolution `want` brought inside the lens canvas's limits for the part on screen `v` (with its margin). */
    private static lensCap(want: number, v: Rectangle): number {
        let m: number = 1 + 2 * Renderer.LENS_MARGIN;
        return Math.min(want, Renderer.LENS_SIDE / (v.width * m + 4), Renderer.LENS_SIDE / (v.height * m + 4), Math.sqrt(Renderer.LENS_AREA / (v.width * v.height * m * m)));
    }

    /**
     * Before each drawing: whether the yard is drawn into the lens canvas this time (and where: its resolution, its
     * place, a pan's scroll), or into its own canvas (the lens canvas let go, the yard's canvas shown and drawn whole).
     */
    private ioLensPlan(partial: boolean): boolean {
        let want: number = 0;
        try {
            want = this.ioLensWant(partial);
        } catch (e) {
            want = 0;
        }
        if (want <= 0) {
            this._lensRaw = 0;
            this.ioLensOff();
            return false;
        }
        let v: Rectangle = this._lensView;
        let now: int = getTimer();
        if (Math.abs(want - this._lensRaw) > this._lensRaw * 0.01) {
            this._lensRaw = want;
            this._lensRawAt = now;
        }
        let settled: boolean = now - this._lensRawAt >= Renderer.LENS_SETTLE_MS;
        let target: number = Renderer.lensCap(want, v);
        if (!this._lensOn) {
            // (zooming in: the yard's canvas, as before, until the zoom keeps still)
            if (!settled || !this.ioLensStart(target)) {
                return false;
            }
        } else {
            let m: number = 1 + Renderer.LENS_MARGIN;
            let fit: number = Math.min(this._lens.width / (v.width * m), this._lens.height / (v.height * m));
            if (this._lensF > fit) {
                // (zooming out: more on screen than the lens canvas holds at its resolution: a lower one at once, with
                // room to go on a little before the next)
                let f: number = Math.min(target, fit * 0.92);
                if (f < Renderer.LENS_MIN) {
                    this.ioLensOff();
                    return false;
                }
                this.ioLensFocus(f);
            } else if (settled && Math.abs(target - this._lensF) > this._lensF * 0.03) {
                if (!this.ioLensStart(target)) {
                    return false;
                }
            } else if (!this.ioLensCovers()) {
                this.ioLensMove();
            }
        }
        if (!this.ioLensPlace()) {
            this.ioLensOff();
            return false;
        }
        return true;
    }

    /** The lens canvas at resolution f (made, or made again if too small or far too big), all of it to be drawn. */
    private ioLensStart(f: number): boolean {
        let v: Rectangle = this._lensView;
        if (!(f >= Renderer.LENS_MIN)) {
            this.ioLensOff();
            return false;
        }
        let m: number = 1 + 2 * Renderer.LENS_MARGIN;
        let w: int = (Math.ceil(v.width * f * m) + 2) | 0;
        let h: int = (Math.ceil(v.height * f * m) + 2) | 0;
        try {
            if (!this._lens || this._lens.width < w || this._lens.height < h || this._lens.width * this._lens.height > w * h * 2) {
                if (this._lens) {
                    this._lens.dispose();
                    this._lens = null;
                }
                this._lens = new BitmapData(w, h, false, 0);
                if (!this._lensBm) {
                    this._lensBm = new Bitmap();
                    this._lensBm.name = "ioLensCanvas";
                }
                this._lensBm.bitmapData = this._lens;
            }
        } catch (e) {
            this.ioLensOff();
            return false;
        }
        if (!this._lensOn) {
            this._lensOn = true;
            // (the yard's canvas is not drawn from now on)
            this._fullStale = true;
        }
        this.ioLensFocus(f);
        return true;
    }

    /** At resolution f, the lens canvas round the part on screen: all of it to be drawn. */
    private ioLensFocus(f: number): void {
        this._lensF = f;
        this.ioLensOrigin();
        this._lensX = this._ioLensNx;
        this._lensY = this._ioLensNy;
        this._lensFull = true;
        this._lensExposed.length = 0;
    }

    /** Where the lens canvas's top left goes for the part on screen now (_ioLensNx, _ioLensNy): round it, inside the yard's canvas, on whole lens pixels. */
    private ioLensOrigin(): void {
        let v: Rectangle = this._lensView;
        let f: number = this._lensF;
        let lw: number = this._lens.width / f;
        let lh: number = this._lens.height / f;
        let cw: number = this._canvas.width;
        let ch: number = this._canvas.height;
        let x: number = v.x + v.width / 2 - lw / 2;
        let y: number = v.y + v.height / 2 - lh / 2;
        x = lw <= cw ? Math.max(0, Math.min(cw - lw, x)) : (cw - lw) / 2;
        y = lh <= ch ? Math.max(0, Math.min(ch - lh, y)) : (ch - lh) / 2;
        // (still round all of the part on screen)
        x = Math.max(v.x + v.width - lw, Math.min(v.x, x));
        y = Math.max(v.y + v.height - lh, Math.min(v.y, y));
        this._ioLensNx = Math.floor(x * f) / f;
        this._ioLensNy = Math.floor(y * f) / f;
    }

    /** Is all of the part on screen inside the lens canvas? */
    private ioLensCovers(): boolean {
        let v: Rectangle = this._lensView;
        let f: number = this._lensF;
        return v.x >= this._lensX && v.y >= this._lensY && v.x + v.width <= this._lensX + this._lens.width / f && v.y + v.height <= this._lensY + this._lens.height / f;
    }

    /** A pan: the lens canvas moved round the part on screen, its content with it (one copy), the strips uncovered drawn. */
    private ioLensMove(): void {
        let L: BitmapData = this._lens;
        let f: number = this._lensF;
        this.ioLensOrigin();
        let nx: number = this._ioLensNx;
        let ny: number = this._ioLensNy;
        // (both on whole lens pixels: the content moves by whole pixels)
        let dx: int = Math.round((this._lensX - nx) * f) | 0;
        let dy: int = Math.round((this._lensY - ny) * f) | 0;
        if (dx == 0 && dy == 0) {
            return;
        }
        this._lensX = nx;
        this._lensY = ny;
        if (this._lensFull || Math.abs(dx) >= L.width || Math.abs(dy) >= L.height) {
            this._lensFull = true;
            return;
        }
        this._src.x = Math.max(0, -dx);
        this._src.y = Math.max(0, -dy);
        this._src.width = L.width - Math.abs(dx);
        this._src.height = L.height - Math.abs(dy);
        this._pt.x = Math.max(0, dx);
        this._pt.y = Math.max(0, dy);
        L.copyPixels(L, this._src, this._pt);
        ++Renderer.ioStats.lensScroll;
        // (what is uncovered, in the canvas's pixels)
        if (dx > 0) {
            this._lensExposed.push(new Rectangle(nx, ny, dx / f, L.height / f));
        } else if (dx < 0) {
            this._lensExposed.push(new Rectangle(nx + (L.width + dx) / f, ny, -dx / f, L.height / f));
        }
        if (dy > 0) {
            this._lensExposed.push(new Rectangle(nx, ny, L.width / f, dy / f));
        } else if (dy < 0) {
            this._lensExposed.push(new Rectangle(nx, ny + (L.height + dy) / f, L.width / f, -dy / f));
        }
    }

    /**
     * The lens canvas's Bitmap where its part of the yard's canvas is (in the same parent, just above it, scaled down by
     * the resolution), the yard's canvas hidden. False when it cannot be shown.
     */
    private ioLensPlace(): boolean {
        let cc: Bitmap = MAP._canvasContainer;
        let bm: Bitmap = this._lensBm;
        let par: DisplayObjectContainer = cc ? cc.parent : null;
        if (!par || !bm || !this._lens) {
            return false;
        }
        let f: number = this._lensF;
        if (bm.parent !== par) {
            par.addChildAt(bm, (par.getChildIndex(cc) + 1) | 0);
        }
        bm.x = cc.x + this._lensX * cc.scaleX;
        bm.y = cc.y + this._lensY * cc.scaleY;
        bm.scaleX = cc.scaleX / f;
        bm.scaleY = cc.scaleY / f;
        // (not moved part of the way by the page's frame interpolation: it jumps with its content, which the ground's own
        // in-between places already carry)
        Object(bm)["$ip0"] = null;
        // (shown larger than its pixels, at the most resolution: 21 October, the user's, not smoothed (blurred): sharp)
        if (bm.smoothing) {
            bm.smoothing = false;
        }
        if (!bm.visible) {
            bm.visible = true;
        }
        if (cc.visible) {
            cc.visible = false;
            this._lensHid = true;
        }
        return true;
    }

    /** The lens canvas let go: the yard's canvas shown again, drawn whole if it was left out meanwhile. */
    private ioLensOff(): void {
        if (!this._lensOn && !this._lens) {
            return;
        }
        this._lensOn = false;
        this._lensFull = false;
        this._lensExposed.length = 0;
        let cc: Bitmap = MAP._canvasContainer;
        if (this._lensHid && cc) {
            cc.visible = true;
        }
        this._lensHid = false;
        if (this._lensBm) {
            if (this._lensBm.parent) {
                this._lensBm.parent.removeChild(this._lensBm);
            }
            this._lensBm.bitmapData = null;
        }
        if (this._lens) {
            this._lens.dispose();
            this._lens = null;
        }
        if (this._fullStale) {
            this._fullStale = false;
            this._forceFull = true;
        }
    }

    /** This frame's drawing into the lens canvas: all of it, or what changed, the strips a pan uncovered and the sweep. */
    private ioLensDraw(all: boolean): void {
        let L: BitmapData = this._lens;
        let r: Rectangle = null;
        let f: number = this._lensF;
        ++Renderer.ioStats.lens;
        if (all || this._lensFull) {
            this._lensFull = false;
            this._lensExposed.length = 0;
            this.ioLensDrawIn(new Rectangle(this._lensX, this._lensY, L.width / f, L.height / f), false);
            ++Renderer.ioStats.lensFull;
            return;
        }
        for (r of (this._dirty ?? [])) {
            this.ioLensDrawIn(r, false);
        }
        for (r of this._lensExposed) {
            this.ioLensDrawIn(r, false);
        }
        this._lensExposed.length = 0;
        if (this._sweep.length && !this._viewAll) {
            // (as ioDraw's sweep: drawn again as it should be, noted as swept, not logged as a change)
            Object(L)["$quiet"] = true;
            for (r of (this._sweep ?? [])) {
                this.ioLensDrawIn(r, true);
            }
            Object(L)["$quiet"] = false;
        }
    }

    /**
     * The part of the yard's canvas r (its pixels) drawn into the lens canvas: the whole lens pixels it covers cleared,
     * then everything drawn there in order, scaled and smoothed, clipped to them.
     */
    private ioLensDrawIn(r: Rectangle, swept: boolean): void {
        let L: BitmapData = this._lens;
        let f: number = this._lensF;
        let ox: number = this._lensX;
        let oy: number = this._lensY;
        let x0: int = Math.max(0, Math.floor((r.x - ox) * f)) | 0;
        let y0: int = Math.max(0, Math.floor((r.y - oy) * f)) | 0;
        let x1: int = Math.min(L.width, Math.ceil((r.x + r.width - ox) * f)) | 0;
        let y1: int = Math.min(L.height, Math.ceil((r.y + r.height - oy) * f)) | 0;
        if (x1 <= x0 || y1 <= y0) {
            return;
        }
        let c: Rectangle = this._lensClip;
        c.x = x0;
        c.y = y0;
        c.width = x1 - x0;
        c.height = y1 - y0;
        // (19 October: drawn quietly, the change logged once for the rectangle (everything is clipped to it), as ioDraw)
        let quiet: boolean = !swept && !Object(L)["$quiet"];
        if (quiet) {
            Object(L)["$quiet"] = true;
        }
        try {
            L.fillRect(c, 4278190080);
            // (the canvas pixels those lens pixels show)
            let rx: number = ox + x0 / f;
            let ry: number = oy + y0 / f;
            let rr: number = ox + x1 / f;
            let rb: number = oy + y1 / f;
            this.ioLensList(RasterData.s_unsortedData, rx, ry, rr, rb);
            this.ioLensList(RasterData.s_visibleData, rx, ry, rr, rb);
        } finally {
            if (quiet) {
                Object(L)["$quiet"] = false;
                Object(L)["$touchRect"](x0, y0, x1 - x0, y1 - y0);
            }
        }
        if (swept) {
            Object(L)["$noteSwept"](x0, y0, x1 - x0, y1 - y0);
        }
    }

    /** Every entry of the list where it was measured this frame (ioFindChanges) inside rx..rr, ry..rb, in order. */
    private ioLensList(list: Vector<RasterData>, rx: number, ry: number, rr: number, rb: number): void {
        let len: int = list.length | 0;
        let merged: boolean = false;
        let i: int = 0;
        let e: RasterData = null;
        while (i < len) {
            e = as3.vget(list, i++);
            if (!e || e._cleared || !e._pt || !e._rsHas) {
                continue;
            }
            if (e._rsX >= rr || e._rsX + e._rsW <= rx || e._rsY >= rb || e._rsY + e._rsH <= ry) {
                continue;
            }
            if (this._ioShMerge && this.ioMerged(e)) {
                if (!merged) {
                    merged = true;
                    let f: number = this._lensF;
                    let c: Rectangle = this._lensClip;
                    this.ioShadowsInto(this._lens, list, i - 1, c.x, c.y, c.x + c.width, c.y + c.height, f, this._lensX, this._lensY, true, true);
                }
                continue;
            }
            // (no clip when all of it is inside, a pixel to spare: a plain copy is put at whole pixels, up to half a
            // pixel from where it was measured)
            this.ioLensEntry(e, e._rsX - 1 >= rx && e._rsY - 1 >= ry && e._rsX + e._rsW + 1 <= rr && e._rsY + e._rsH + 1 <= rb ? null : this._lensClip);
        }
    }

    /** One entry into the lens canvas: as rasterize and drawEntry draw it into the yard's canvas, scaled by the resolution and smoothed. */
    private ioLensEntry(e: RasterData, clip: Rectangle): void {
        let L: BitmapData = this._lens;
        let f: number = this._lensF;
        let bmd: BitmapData = as3.as(e._data, BitmapData);
        let px: number = e._pt.x;
        let py: number = e._pt.y;
        if (bmd && !e._blendMode && !e._filter && (e._scaleX === 100 && e._scaleY === 100)) {
            let ct: ColorTransform = null;
            if (e._alpha === 4278190080) {
                // (copied in the yard's canvas: at whole pixels, rounded)
                px = Math.round(px);
                py = Math.round(py);
            } else {
                this._alphaCt.alphaMultiplier = (e._alpha >>> 24) / 255;
                ct = this._alphaCt;
            }
            this._matrix.createBox(f, f, 0, (px - this._lensX) * f, (py - this._lensY) * f);
            L.draw(as3.cast(bmd, IBitmapDrawable), this._matrix, ct, null, clip, Renderer.ioSmooth(f, f));
            return;
        }
        this._matrix.createBox(e._scaleX * 0.01 * f, e._scaleY * 0.01 * f, 0, (px - this._lensX) * f, (py - this._lensY) * f);
        let smooth: boolean = Renderer.ioSmooth(e._scaleX * 0.01 * f, e._scaleY * 0.01 * f);
        if (Boolean(e._filter) && Boolean(bmd)) {
            let bm: Bitmap = this.filteredBitmap(e, bmd);
            let was: boolean = bm.smoothing;
            if (was !== smooth) {
                bm.smoothing = smooth;
            }
            L.draw(as3.cast(bm, IBitmapDrawable), this._matrix, null, e._blendMode, clip, smooth);
            if (was !== smooth) {
                bm.smoothing = was;
            }
        } else {
            L.draw(e._data, this._matrix, null, e._blendMode, clip, smooth);
        }
    }

    /**
     * Inferno-only (21 October, the user's: "Zooming in adds a blur currently (smoothing) - remove the blur"): a picture
     * drawn at sx x sy times its size is smoothed only when drawn smaller (zoomed out); larger, its pixels stay sharp,
     * as the yard's own canvas shows them zoomed in (the lens and the graphics card drew them smoothed: blurred).
     */
    private static ioSmooth(sx: number, sy: number): boolean {
        return Math.abs(sx) < 0.999 || Math.abs(sy) < 0.999;
    }

    // ---- Inferno-only (26 October, the user's: "Shadows that overlap should not make a darker shadow, just the same
    // color shadow"): the shadows on the ground (every unsorted entry at the shadow depth that is a picture: the
    // buildings', the workers', the pets', the monsters' cast shadows) were each drawn over the last, so where two
    // overlapped the ground was darkened twice. Now they are drawn together: each as how much it keeps of the ground
    // under it (its picture at its opacity on white: ioShadowPic, kept while it doesn't change), the darkest of them
    // at each pixel kept (a layer, "darken"), and that layer laid over the ground once ("multiply"): where they
    // overlap, as dark as the darkest. In the yard's canvas, the lens and on the graphics card (GlYard's layer).
    // Server flag io_shadowstack (1: drawn one by one, as before).
    private _ioShMerge: boolean = false;

    /** The layer (and its size); at most IO_SH_CHUNK pixels a side, a bigger part drawn a piece at a time. */
    private static _ioShLayer: HTMLCanvasElement = null;
    private static _ioShCtx: CanvasRenderingContext2D = null;
    private static readonly IO_SH_CHUNK: int = 1024;

    /** Drawn with the other shadows (see above). */
    private ioMerged(e: RasterData): boolean {
        if (!e._unSorted || e._depth != 1 || e._filter || !e._pt) {
            return false;
        }
        let d: any = e._data;
        return d instanceof BitmapData && !d.$disposed && d.$w > 0 && d.$h > 0;
    }

    /** The shadow as how much it keeps of the ground under it: on white, opaque (kept on the entry). */
    private static ioShadowPic(e: RasterData, bmd: BitmapData): BitmapData {
        let o: any = bmd;
        let a: number = (e._alpha >>> 24) / 255;
        let key: string = o.$version + "|" + a + "|" + o.$w + "x" + o.$h;
        let ent: any = e;
        let held: any = ent._ioShF;
        if (held && held.key === key && !held.bd.$disposed) {
            return held.bd;
        }
        let pic: any = held && !held.bd.$disposed && held.bd.$w === o.$w && held.bd.$h === o.$h ? held.bd : null;
        if (!pic) {
            if (held && held.bd && !held.bd.$disposed) {
                held.bd.dispose();
            }
            pic = new BitmapData(o.$w, o.$h, false, 0xFFFFFF);
        }
        let c: CanvasRenderingContext2D = pic.$ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = "source-over";
        c.globalAlpha = 1;
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, o.$w, o.$h);
        // (drawn over white, "multiply" or not, it comes out the same: what multiplying by it keeps)
        c.globalAlpha = Math.max(0, Math.min(1, a));
        c.drawImage(o.$canvas, 0, 0);
        c.globalAlpha = 1;
        pic.$touch();
        ent._ioShF = { "key": key, "bd": pic };
        return pic;
    }

    /** Where the entry's picture lands in the target (target pixels: (canvas - (ox, oy)) * f): [x, y, a, d]. */
    private static ioShadowAt(e: RasterData, f: number, ox: number, oy: number): number[] {
        let sx: number = e._scaleX * 0.01;
        let sy: number = e._scaleY * 0.01;
        let px: number = e._pt.x;
        let py: number = e._pt.y;
        if (!e._blendMode && sx === 1 && sy === 1 && e._alpha === 4278190080) {
            // (copied at whole pixels, as the yard's canvas puts a plain picture)
            px = Math.round(px);
            py = Math.round(py);
        }
        return [(px - ox) * f, (py - oy) * f, sx * f, sy * f];
    }

    /**
     * Every merged shadow of the list from `from` on, drawn together into the target's pixels x0..x1, y0..y1 (target
     * pixels: (canvas - (ox, oy)) * f). measured: only those measured this frame (ioFindChanges), as the partial
     * drawing draws. smooth: as the lens draws (the yard's canvas draws unsmoothed).
     */
    private ioShadowsInto(target: BitmapData, list: Vector<RasterData>, from: int, x0: number, y0: number, x1: number, y1: number, f: number, ox: number, oy: number, measured: boolean, smooth: boolean): void {
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.ceil(x1);
        y1 = Math.ceil(y1);
        if (x1 <= x0 || y1 <= y0) {
            return;
        }
        let len: int = list.length | 0;
        // (those in the part, with where each lands)
        let todo: any[] = [];
        let bx0: number = Infinity;
        let by0: number = Infinity;
        let bx1: number = -Infinity;
        let by1: number = -Infinity;
        for (let i: int = from; i < len; i++) {
            let e: RasterData = as3.vget(list, i);
            if (!e || e._cleared || !this.ioMerged(e) || (measured && !e._rsHas)) {
                continue;
            }
            let o: any = e._data;
            let at: number[] = Renderer.ioShadowAt(e, f, ox, oy);
            let w: number = o.$w * at[2];
            let h: number = o.$h * at[3];
            let l: number = Math.min(at[0], at[0] + w) - 1;
            let t: number = Math.min(at[1], at[1] + h) - 1;
            let r: number = l + Math.abs(w) + 2;
            let b: number = t + Math.abs(h) + 2;
            if (l >= x1 || t >= y1 || r <= x0 || b <= y0) {
                continue;
            }
            todo.push(e, at);
            bx0 = Math.min(bx0, l);
            by0 = Math.min(by0, t);
            bx1 = Math.max(bx1, r);
            by1 = Math.max(by1, b);
        }
        if (!todo.length) {
            return;
        }
        // (only where there are shadows)
        x0 = Math.max(x0, Math.floor(bx0));
        y0 = Math.max(y0, Math.floor(by0));
        x1 = Math.min(x1, Math.ceil(bx1));
        y1 = Math.min(y1, Math.ceil(by1));
        if (x1 <= x0 || y1 <= y0) {
            return;
        }
        const C: int = Renderer.IO_SH_CHUNK;
        if (!Renderer._ioShLayer) {
            Renderer._ioShLayer = document.createElement("canvas");
            Renderer._ioShLayer.width = Math.min(C, Math.max(64, x1 - x0));
            Renderer._ioShLayer.height = Math.min(C, Math.max(64, y1 - y0));
            Renderer._ioShCtx = Renderer._ioShLayer.getContext("2d");
        }
        let layer: HTMLCanvasElement = Renderer._ioShLayer;
        let lc: CanvasRenderingContext2D = Renderer._ioShCtx;
        let tc: CanvasRenderingContext2D = (target as any).$ctx;
        if (!lc || !tc) {
            return;
        }
        for (let cy: number = y0; cy < y1; cy += C) {
            for (let cx: number = x0; cx < x1; cx += C) {
                let cw: int = Math.min(C, x1 - cx) | 0;
                let ch: int = Math.min(C, y1 - cy) | 0;
                if (layer.width < cw || layer.height < ch) {
                    layer.width = Math.max(layer.width, cw);
                    layer.height = Math.max(layer.height, ch);
                }
                lc.setTransform(1, 0, 0, 1, 0, 0);
                lc.globalAlpha = 1;
                lc.globalCompositeOperation = "source-over";
                lc.clearRect(0, 0, cw, ch);
                lc.globalCompositeOperation = "darken";
                let any: boolean = false;
                for (let k: int = 0; k < todo.length; k += 2) {
                    let e: RasterData = todo[k];
                    let at: number[] = todo[k + 1];
                    let o: any = e._data;
                    let w: number = o.$w * at[2];
                    let h: number = o.$h * at[3];
                    let l: number = Math.min(at[0], at[0] + w);
                    let t: number = Math.min(at[1], at[1] + h);
                    if (l - 1 >= cx + cw || t - 1 >= cy + ch || l + Math.abs(w) + 1 <= cx || t + Math.abs(h) + 1 <= cy) {
                        continue;
                    }
                    let pic: any = Renderer.ioShadowPic(e, o);
                    lc.imageSmoothingEnabled = smooth && Renderer.ioSmooth(at[2], at[3]);
                    lc.setTransform(at[2], 0, 0, at[3], at[0] - cx, at[1] - cy);
                    lc.drawImage(pic.$canvas, 0, 0);
                    any = true;
                }
                if (!any) {
                    continue;
                }
                // (where no shadow was drawn the layer is clear: the ground there as it is)
                tc.save();
                tc.setTransform(1, 0, 0, 1, 0, 0);
                tc.globalAlpha = 1;
                tc.globalCompositeOperation = "multiply";
                tc.imageSmoothingEnabled = false;
                tc.drawImage(layer, 0, 0, cw, ch, cx, cy, cw, ch);
                tc.restore();
                Object(target)["$touchRect"](cx, cy, cw, ch);
            }
        }
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.globalCompositeOperation = "source-over";
    }

    /** The merged shadows on the graphics card: into its layer, the darkest kept, laid over what is drawn once. */
    private ioGlShadows(gl: GlYard, list: Vector<RasterData>, from: int, f: number, vx: number, vy: number, vr: number, vb: number): void {
        let len: int = list.length | 0;
        let begun: boolean = false;
        for (let i: int = from; i < len; i++) {
            let e: RasterData = as3.vget(list, i);
            if (!e || e._cleared || !this.ioMerged(e)) {
                continue;
            }
            let o: any = e._data;
            let at: number[] = Renderer.ioShadowAt(e, 1, 0, 0);
            let w: number = o.$w * at[2];
            let h: number = o.$h * at[3];
            let l: number = Math.min(at[0], at[0] + w);
            let t: number = Math.min(at[1], at[1] + h);
            if (l >= vr || t >= vb || l + Math.abs(w) <= vx || t + Math.abs(h) <= vy) {
                continue;
            }
            if (!begun) {
                begun = true;
                gl.layerBegin();
            }
            let pic: BitmapData = Renderer.ioShadowPic(e, o);
            gl.draw(Renderer.glSource(pic), 0, 0, o.$w, o.$h, at[2] * f, 0, 0, at[3] * f, (at[0] - vx) * f, (at[1] - vy) * f, 1, GL_MIN);
        }
        if (begun) {
            gl.layerEnd();
        }
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
        this._viewAll = false;
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
                        if (bmd && !e._filter && "$dirtySince" in bmd) {
                            sub = Object(bmd)["$dirtySince"](e._rsVer);
                        }
                        if (sub) {
                            // (drawn scaled, the yard's ground tilted (IoTilt): its changes scaled the same, a pixel round them)
                            let ssx: number = e._scaleX * 0.01, ssy: number = e._scaleY * 0.01;
                            let pad: number = ssx === 1 && ssy === 1 ? 0 : 1;
                            for (b of as3.values(sub)) {
                                this.addDirty(Number(this._mx + b[0] * ssx) - pad, Number(this._my + b[1] * ssy) - pad, (b[2] - b[0]) * ssx + pad * 2, (b[3] - b[1]) * ssy + pad * 2);
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
        if (inView < (x1 - x0) * (y1 - y0) * GLOBAL.ioFlag("io_viewall", 35) / 100 && !(GLOBAL.INFERNO_ONLY && this.ioViewCheaper(inView, x0, y0, x1, y1))) {
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
        this._viewAll = true;
    }

    /**
     * Inferno-only (19 October): would drawing all of the view again (each thing in it once) cost less than the
     * rectangles inside it (each thing once for every rectangle it crosses)? A copy costs about as much as 7,000 of its
     * pixels: 40 monsters in a bunch made thirty rectangles of tiles, each monster drawn eight times a frame, a
     * thousand copies; the whole view is a few hundred.
     */
    private ioViewCheaper(inView: number, x0: int, y0: int, x1: int, y1: int): boolean {
        let d: Vector<Rectangle> = this._dirty;
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        let rects: number[] = [];
        let r: Rectangle = null;
        let callsRects: number = 0;
        let callsView: number = 0;
        let viewArea: number = (x1 - x0) * (y1 - y0);
        let k: number = GLOBAL.ioFlag("io_copycost", 7000);
        if (!(k > 0)) {
            return false;
        }
        // (only those inside the view: the ones outside are drawn either way)
        for (r of (d ?? [])) {
            let a0: number = Math.max(x0, r.x);
            let b0: number = Math.max(y0, r.y);
            let a1: number = Math.min(x1, r.x + r.width);
            let b1: number = Math.min(y1, r.y + r.height);
            if (a1 > a0 && b1 > b0) {
                rects.push(a0, b0, a1, b1);
            }
        }
        let n: int = (rects.length / 4) | 0;
        if (n < 8) {
            ++Renderer.ioStats.vcSkip;
            return false;
        }
        Renderer.ioStats.vcN += n;
        // (enough rectangles already: past this the whole view is cheaper whatever)
        let enough: number = (viewArea - inView) / k;
        for (let list of lists) {
            let len: int = list.length | 0;
            for (let i: int = 0; i < len; i++) {
                let e: RasterData = as3.vget(list, i);
                if (!e || e._cleared || !e._pt || !e._rsHas || e._rsFrame !== this._frame) {
                    continue;
                }
                let ex0: number = e._rsX;
                let ey0: number = e._rsY;
                let ex1: number = ex0 + e._rsW;
                let ey1: number = ey0 + e._rsH;
                if (ex0 >= x1 || ex1 <= x0 || ey0 >= y1 || ey1 <= y0) {
                    continue;
                }
                callsView++;
                for (let j: int = 0; j < rects.length; j += 4) {
                    if (ex0 < rects[j + 2] && ex1 > rects[j] && ey0 < rects[j + 3] && ey1 > rects[j + 1]) {
                        callsRects++;
                    }
                }
            }
            if (callsRects - callsView > enough * 2) {
                Renderer.ioStats.vcRects += callsRects;
                Renderer.ioStats.vcView += callsView;
                ++Renderer.ioStats.vcYes;
                return true;
            }
        }
        Renderer.ioStats.vcRects += callsRects;
        Renderer.ioStats.vcView += callsView;
        if ((callsRects - callsView) * k > (viewArea - inView)) {
            ++Renderer.ioStats.vcYes;
            return true;
        }
        return false;
    }

    // ---- Inferno-only (21 October, the user's: 2000 monsters at 60 frames a second): the yard drawn by the graphics
    // card (flash/_glYard: WebGL 2). Each frame the part of the yard on screen is drawn whole into a canvas of its own,
    // at the screen's resolution (as the lens's: at most LENS_RES pixels a canvas pixel, within LENS_SIDE and
    // LENS_AREA), every entry in order as rasterize draws it into the yard's canvas: a bitmap as a quad of its
    // texture (uploaded when it changes), at whole pixels when it is a plain copy, scaled, see-through and blended as
    // there; a picture with a filter (a glow), or not a bitmap (a clip, a flag), drawn by the canvas into a picture
    // of its own first (again only when it changes). A monster's picture, a frame of its sprite sheet and its health
    // bar over it (SPRITES.GetFrame, ioOverlay), is drawn straight from the sheet: 2000 monsters, a handful of
    // textures, no picture of each sent to the card each frame. Shown where that part of the yard's canvas is, the
    // yard's canvas hidden (as the lens canvas is shown). Nothing changed since the last frame: not drawn again.
    // Not on (ioGlMode -1, flag io_gl 0, the page's setting off, no WebGL 2, the card lost) or a blend the card can't
    // do in a frame: drawn by the canvas as before.

    /** 0: on when the browser can (flag io_gl, the page's setting), 1: always when it can, -1: never (tests that read the yard's canvas). */
    public static ioGlMode: int = 0;

    private static _gl: GlYard = null;

    private static _glFailed: boolean = false;

    /** (26 October) The first frames read back (blackFrame), and how many came out black. */
    private static _glChecked: int = 0;
    private static _glBlackSeen: int = 0;

    private _glBd: BitmapData = null;

    private _glBm: Bitmap = null;

    private _glOn: boolean = false;

    private _glHid: boolean = false;

    private _glF: number = 1;

    private _glX: number = 0;

    private _glY: number = 0;

    private _glW: int = 0;

    private _glH: int = 0;

    private _glSig: number = NaN;

    /** For tests: monsters drawn straight from their sprite sheet, this frame so far and the last frame drawn. */
    private static _ioSheetN: int = 0;
    private static _ioSheetLast: int = 0;

    /** For tests: whether the graphics card drew the last frame, and its numbers. */
    public static get ioGlInfo(): any {
        let r: Renderer = Renderer._ioLast;
        let gl: GlYard = Renderer._gl;
        return { "on": !!(r && r._glOn), "available": !!gl && gl.ok, "software": !!gl && gl.software, "card": gl ? gl.renderer : "", "failed": Renderer._glFailed, "f": r ? r._glF : 0, "w": r ? r._glW : 0, "h": r ? r._glH : 0, "stats": gl ? { ...gl.stats } : null, "fromSheet": Renderer._ioSheetLast, "direct": !!(r && r._glDirect && r._glOn), "playerDirect": player.glDirect };
    }

    /** Whether this frame is drawn by the graphics card, and where (the part on screen, its resolution). */
    /** Inferno-only (21 October): a switch the server can turn off (the flag set to 0); on when not sent. */
    public static ioSwitch(name: string): boolean {
        let f: any = GLOBAL._flags;
        return !(f && f.hasOwnProperty(name) && Number(f[name]) === 0);
    }

    /**
     * Inferno-only (21 October, crowds): the part of the yard's canvas on screen now, in its pixels (x0, y0, x1, y1:
     * where the things drawn on it are placed); null when that can't be told (no canvas shown, a tilted yard).
     */
    public static ioOnScreen(): number[] {
        let cc: Bitmap = MAP._canvasContainer;
        let s: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = s && "$ioView" in s ? s["$ioView"] : null;
        if (!view || !cc || !cc.parent || !cc.stage || IoTilt.deg !== 0) {
            return null;
        }
        let a: Point = cc.globalToLocal(new Point(Number(view.x), Number(view.y)));
        let b: Point = cc.globalToLocal(new Point(Number(view.x) + Number(view.w), Number(view.y) + Number(view.h)));
        let r: number[] = [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)];
        if (!isFinite(r[0]) || !isFinite(r[1]) || !isFinite(r[2]) || !isFinite(r[3]) || !(r[2] - r[0] > 1) || !(r[3] - r[1] > 1)) {
            return null;
        }
        return r;
    }

    /** Inferno-only: frames drawn by the card, in a row the signature changed, and an entry it couldn't draw. */
    private _glTick: int = 0;
    private _glBusy: int = 0;
    private _glBad: boolean = false;
    private _glSigFresh: boolean = false;
    /** Inferno-only (21 October): shown straight from the card (player.glDirect) this frame. */
    private _glDirect: boolean = false;

    private ioGlPlan(partial: boolean): boolean {
        let want: boolean = Renderer.ioGlMode > 0 || (Renderer.ioGlMode == 0 && Renderer.ioSwitch("io_gl") && !(GLOBAL.ioPageSettings && GLOBAL.ioPageSettings.gl === false));
        let cc: Bitmap = MAP._canvasContainer;
        let s: any = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
        let view: any = s && "$ioView" in s ? s["$ioView"] : null;
        if (!want || Renderer.ioGlMode < 0 || Renderer._glFailed || !partial || !view || !cc || !cc.parent || !cc.stage || cc.bitmapData !== this._canvas) {
            this.ioGlOff();
            return false;
        }
        if (!Renderer._gl) {
            Renderer._gl = GlYard.create();
            if (!Renderer._gl) {
                Renderer._glFailed = true;
                this.ioGlOff();
                return false;
            }
        }
        if (!Renderer._gl.ok) {
            Renderer._glFailed = true;
            this.ioGlOff();
            return false;
        }
        // (26 October: a card whose frames came out black before, in this browser: the canvas)
        if (Renderer.ioGlMode < 1 && glRememberedBlack(Renderer._gl.renderer)) {
            Renderer._glFailed = true;
            this.ioGlOff();
            return false;
        }
        // (no real graphics card: the canvas is quicker, unless asked for anyway)
        if (Renderer._gl.software && Renderer.ioGlMode < 1) {
            this.ioGlOff();
            return false;
        }
        // (the part of the yard's canvas on screen, and the screen's pixels per canvas pixel)
        let p0: Point = cc.localToGlobal(new Point(0, 0));
        let p1: Point = cc.localToGlobal(new Point(1000, 0));
        let zoom: number = (p1.x - p0.x) / 1000;
        let a: Point = cc.globalToLocal(new Point(Number(view.x), Number(view.y)));
        let b: Point = cc.globalToLocal(new Point(Number(view.x) + Number(view.w), Number(view.y) + Number(view.h)));
        let x0: number = Math.max(0, Math.floor(Math.min(a.x, b.x)) - 1);
        let y0: number = Math.max(0, Math.floor(Math.min(a.y, b.y)) - 1);
        let x1: number = Math.min(this._canvas.width, Math.ceil(Math.max(a.x, b.x)) + 1);
        let y1: number = Math.min(this._canvas.height, Math.ceil(Math.max(a.y, b.y)) + 1);
        if (!(x1 - x0 >= 8) || !(y1 - y0 >= 8) || !(zoom > 0)) {
            this.ioGlOff();
            return false;
        }
        let vw: number = x1 - x0;
        let vh: number = y1 - y0;
        // (as many pixels as the screen gives it, at most LENS_RES a canvas pixel and within the lens's limits; the
        // Battery saver's lower resolution with it)
        let f: number = Math.min(Renderer.LENS_RES, Math.max(0.25, zoom * Number(view.px || 1)), Renderer.LENS_SIDE / vw, Renderer.LENS_SIDE / vh, Math.sqrt(Renderer.LENS_AREA / (vw * vh)));
        // (whole pixels of the canvas both ways)
        let w: int = Math.ceil(vw * f) | 0;
        let h: int = Math.ceil(vh * f) | 0;
        // (21 October: the yard shown straight from the card (player.glDirect): its canvas the game's canvas's size, a
        // pixel for each of the game's canvas, the part of the yard there; not on a tilted yard, nor one stretched or turned)
        let direct: boolean = false;
        let mainCanvas: any = player.glDirect && player.mainCtx ? player.mainCtx.canvas : null;
        if (mainCanvas && IoTilt.deg === 0 && mainCanvas.width >= 8 && mainCanvas.height >= 8) {
            let p2: Point = cc.localToGlobal(new Point(0, 1000));
            let zoomY: number = (p2.y - p0.y) / 1000;
            let px: number = Number(view.px || 1);
            // (22 October: and only with the screen inside the yard's canvas: past its edge, what the screen shows there
            // (the ground's border) is the game's canvas's; the card's picture covering all of the screen was black there)
            let dx0: number = (Number(view.x) - p0.x) / zoom;
            let dy0: number = (Number(view.y) - p0.y) / zoom;
            let inside: boolean = dx0 >= 0 && dy0 >= 0 && dx0 + Number(view.w) / zoom <= this._canvas.width && dy0 + Number(view.h) / zoom <= this._canvas.height;
            if (inside && Math.abs(zoomY - zoom) <= zoom * 1e-6 && Math.abs(p2.x - p0.x) < 1e-6 && Math.abs(p1.y - p0.y) < 1e-6 && px > 0) {
                f = zoom * px;
                x0 = dx0;
                y0 = dy0;
                w = mainCanvas.width | 0;
                h = mainCanvas.height | 0;
                direct = true;
            }
        }
        if (direct !== this._glDirect) {
            this._glDirect = direct;
            this._glSig = NaN;
        }
        if (f !== this._glF || x0 !== this._glX || y0 !== this._glY || w !== this._glW || h !== this._glH) {
            this._glSig = NaN;
        }
        this._glF = f;
        this._glX = x0;
        this._glY = y0;
        this._glW = w;
        this._glH = h;
        // (the lens canvas is not used meanwhile)
        this.ioLensOff();
        return true;
    }

    /** Inferno-only (21 October): the yard cleared (MAP.Clear): the card's picture under the game's canvas hidden. */
    public static ioGlLetGo(): void {
        if (Renderer._gl && player.glLayer === Renderer._gl.canvas) {
            player.showGlLayer(Renderer._gl.canvas, false);
        }
        // (22 October: the yard's pictures let go on the card too (its ground alone 32 MB); they were kept until the card
        // had drawn 600 frames without them, and a yard where nothing moves draws none)
        if (Renderer._gl && Renderer._gl.ok) {
            try {
                Renderer._gl.dispose();
            } catch (e) {
            }
        }
    }

    /** The graphics card's canvas let go: the yard's canvas shown again, drawn whole. */
    private ioGlOff(): void {
        if (Renderer._gl && player.glLayer === Renderer._gl.canvas) {
            player.showGlLayer(Renderer._gl.canvas, false);
        }
        if (this._glBd) {
            Object(this._glBd)["$ioHole"] = false;
        }
        this._glDirect = false;
        // (22 October: once only: the card's picture, made the first time, is kept, and every frame after the card was
        // turned off (the page's setting, a lost context, a blend it can't do) drew the whole yard again)
        if (!this._glOn && !(this._glBm && this._glBm.parent)) {
            return;
        }
        this._glOn = false;
        this._glSig = NaN;
        let cc: Bitmap = MAP._canvasContainer;
        if (this._glHid && cc) {
            cc.visible = true;
        }
        this._glHid = false;
        if (this._glBm && this._glBm.parent) {
            this._glBm.parent.removeChild(this._glBm);
        }
        // (the yard's canvas was left as it was meanwhile)
        this._forceFull = true;
    }

    /** An entry's picture as the card draws it (a BitmapData's canvas, its version, its changed parts). */
    private static glSource(b: BitmapData): GlSource {
        let o: any = b;
        let src: any = o.$ioGlSrc;
        if (!src) {
            src = o.$ioGlSrc = {
                "key": b,
                "image": o.$canvas,
                "w": o.$w,
                "h": o.$h,
                "ver": 0,
                "dirtySince": (v: number): any => o.$dirtySince(v),
                "pixels": (x: number, y: number, w: number, h: number): ImageData => o.$ctx.getImageData(x, y, w, h),
            };
        }
        src.image = o.$canvas;
        src.w = o.$w;
        src.h = o.$h;
        src.ver = o.$version;
        // (a big one, the ground: its changes logged, so only those are sent again)
        if (o.$w * o.$h >= 262144 && "$trackChanges" in o && !o.$track) {
            o.$trackChanges();
        }
        return src;
    }

    /** This frame drawn by the card; false: it can't (a blend it can't do), drawn by the canvas instead. */
    private ioGlDraw(): boolean {
        let gl: GlYard = Renderer._gl;
        let f: number = this._glF;
        let vx: number = this._glX;
        let vy: number = this._glY;
        let vr: number = vx + this._glW / f;
        let vb: number = vy + this._glH / f;
        // (a signature of what is drawn: nothing changed since the last frame, nothing drawn. 21 October: while every
        // frame changes (a battle), worked out only every 8th frame: it went through every entry for nothing)
        ++this._glTick;
        let sig: number = -1;
        if (this._glBusy < 8 || (this._glTick & 7) == 0) {
            sig = this.ioGlSignature(vx, vy, vr, vb);
            if (sig !== sig) {
                this.ioGlOff();
                return false;
            }
        }
        // (26 October: the card's context lost while nothing moved: the canvas at once, not when something next changes; the
        // card's picture under the game's canvas was left black meanwhile)
        if (!gl.ok) {
            Renderer._glFailed = true;
            this.ioGlOff();
            return false;
        }
        if (this._glOn && sig >= 0 && sig === this._glSig && this._glSigFresh && !this._forceFull) {
            this._glBusy = 0;
            ++Renderer.ioStats.idle;
            this.ioGlPlace();
            return true;
        }
        if (sig >= 0) {
            this._glBusy = this._glOn && sig !== this._glSig ? this._glBusy + 1 : 0;
        }
        // (_glSig describes the frame drawn now only when it was worked out for it)
        this._glSigFresh = sig >= 0;
        gl.begin(this._glW, this._glH);
        Renderer._ioSheetN = 0;
        this._glBad = false;
        try {
            this.ioGlList(gl, RasterData.s_unsortedData, f, vx, vy, vr, vb);
            this.ioGlList(gl, RasterData.s_visibleData, f, vx, vy, vr, vb);
        } catch (e) {
            // (anything the card failed at: the canvas from now on)
            Renderer._glFailed = true;
            this.ioGlOff();
            return false;
        }
        gl.end();
        // (a blend the card can't do, met without the signature: the canvas draws this frame, the signature looked at next)
        if (this._glBad) {
            this._glBusy = 0;
            this.ioGlOff();
            return false;
        }
        Renderer._ioSheetLast = Renderer._ioSheetN;
        if (!gl.ok) {
            Renderer._glFailed = true;
            this.ioGlOff();
            return false;
        }
        // (26 October, the user's: "some players have an issue with the GPU rendering turned on where the screen is
        // black": the first frames with pictures in them read back; black all over twice: the card can't draw this game,
        // the canvas from now on, and remembered in this browser)
        if (Renderer._glChecked < 4 && gl.stats.quads >= 8) {
            ++Renderer._glChecked;
            if (gl.blackFrame() && ++Renderer._glBlackSeen >= 2) {
                glRememberBlack(gl.renderer);
                Renderer._glFailed = true;
                this.ioGlOff();
                return false;
            }
        }
        if (sig >= 0) {
            this._glSig = sig;
        }
        this._forceFull = false;
        ++Renderer.ioStats.full;
        this.ioGlPlace();
        // (shown straight from the card, the game's canvas has nothing new to draw for it: not marked changed)
        if (!this._glDirect) {
            let bd: any = this._glBd;
            bd.$touch();
        }
        return true;
    }

    /**
     * What this frame would draw, as one number (each entry's picture, version, place, scale, alpha and blend, in
     * order); NaN: an entry the card can't draw (a blend it can't do).
     */
    private ioGlSignature(vx: number, vy: number, vr: number, vb: number): number {
        // (22 October: two 32-bit hashes, exact: the sums in doubles past 2^53 lost a pixel's move, a step of a fade;
        // places to 1/64 of a pixel, the blend and a glow's settings counted too)
        let h1: int = -2128831035;
        let h2: int = 0x1234567;
        let lists: any[] = [RasterData.s_unsortedData, RasterData.s_visibleData];
        for (let list of lists) {
            let len: int = list.length | 0;
            for (let i: int = 0; i < len; i++) {
                let e: RasterData = as3.vget(list, i);
                if (!e || e._cleared || !e._pt || (!this._shadows && this.isShadow(e))) {
                    continue;
                }
                if (e._blendMode && glBlendOf(e._blendMode) < 0) {
                    return NaN;
                }
                let d: any = e._data;
                let ver: number = d ? (d.$version !== undefined ? d.$version : ("$contentSig" in d ? Number(d.$contentSig()) : NaN)) : 0;
                if (ver !== ver) {
                    // (not known: drawn again every frame)
                    ver = Math.random() * 1e9;
                }
                let uid: number = d && d.$uid ? d.$uid : e._id * 2 + 1;
                let parts: number[] = Renderer._ioSigParts;
                parts[0] = uid | 0;
                parts[1] = ver | 0;
                parts[2] = (ver * 4096) | 0;
                parts[3] = Math.round(e._pt.x * 64) | 0;
                parts[4] = Math.round(e._pt.y * 64) | 0;
                parts[5] = Math.round(e._scaleX * 64) | 0;
                parts[6] = Math.round(e._scaleY * 64) | 0;
                parts[7] = e._alpha | 0;
                parts[8] = e._blendMode ? Renderer.ioStrHash(String(e._blendMode)) : 0;
                parts[9] = e._filter ? Renderer.ioStrHash(JSON.stringify(e._filter)) : 0;
                for (let k: int = 0; k < 10; k++) {
                    let v: int = parts[k] | 0;
                    h1 = Math.imul(h1 ^ v, 16777619);
                    h2 = Math.imul((h2 + v) | 0, 1540483477);
                    h2 = h2 ^ (h2 >>> 15);
                }
            }
            h1 = Math.imul(h1 ^ 0x5bd1e995, 16777619);
            h2 = Math.imul((h2 + 7) | 0, 1540483477);
        }
        // (53 bits, never negative: a number exactly)
        return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151);
    }

    private static _ioSigParts: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    private static ioStrHash(s: string): int {
        let h: int = -2128831035;
        for (let i: int = 0; i < s.length; i++) {
            h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        }
        return h;
    }

    private ioGlList(gl: GlYard, list: Vector<RasterData>, f: number, vx: number, vy: number, vr: number, vb: number): void {
        let len: int = list.length | 0;
        let merged: boolean = false;
        for (let i: int = 0; i < len; i++) {
            let e: RasterData = as3.vget(list, i);
            if (!e || e._cleared || !e._pt || (!this._shadows && this.isShadow(e))) {
                continue;
            }
            if (this._ioShMerge && this.ioMerged(e)) {
                if (!merged) {
                    merged = true;
                    this.ioGlShadows(gl, list, i, f, vx, vy, vr, vb);
                }
                continue;
            }
            this.ioGlEntry(gl, e, f, vx, vy, vr, vb);
        }
    }

    /** One entry, as rasterize draws it (see ioGlDraw). */
    private ioGlEntry(gl: GlYard, e: RasterData, f: number, vx: number, vy: number, vr: number, vb: number): void {
        let d0: any = e._data;
        let bmd: BitmapData = d0 instanceof BitmapData ? d0 : as3.as(d0, BitmapData);
        let blend: int = e._blendMode ? glBlendOf(e._blendMode) | 0 : 0;
        if (blend < 0) {
            this._glBad = true;
            return;
        }
        let alpha: number = (e._alpha >>> 24) / 255;
        let sx: number = e._scaleX * 0.01;
        let sy: number = e._scaleY * 0.01;
        let px: number = e._pt.x;
        let py: number = e._pt.y;
        if (bmd && !e._filter) {
            let o: any = bmd;
            if (o.$disposed) {
                return;
            }
            let plain: boolean = !e._blendMode && sx === 1 && sy === 1;
            if (plain && e._alpha === 4278190080) {
                px = Math.round(px);
                py = Math.round(py);
            }
            // (outside the part on screen: not drawn)
            let w: number = o.$w * sx;
            let h: number = o.$h * sy;
            let l: number = Math.min(px, px + w);
            let t: number = Math.min(py, py + h);
            if (l >= vr || t >= vb || l + Math.abs(w) <= vx || t + Math.abs(h) <= vy) {
                return;
            }
            let a: number = sx * f;
            let d: number = sy * f;
            let tx: number = (px - vx) * f;
            let ty: number = (py - vy) * f;
            // (a monster's frame of its sprite sheet, and its health bar, straight from where they are copied from)
            let sheet: any = o.$ioGfImg;
            if (sheet && o.$ioGfR && o.$ioGfKey != null && o.$ioGfVer === o.$version && sheet.$version === o.$ioGfImgVer && (o.$ioGfOver == null || o.$ioOv)) {
                let r: number[] = o.$ioGfR;
                Renderer.ioGlCopy(gl, sheet, o.$w, o.$h, r[0], r[1], r[2], r[3], r[4], r[5], a, d, tx, ty, alpha, blend);
                ++Renderer._ioSheetN;
                if (o.$ioGfOver != null) {
                    let ov: any[] = o.$ioOv;
                    Renderer.ioGlCopy(gl, ov[0], o.$w, o.$h, ov[1], ov[2], ov[3], ov[4], ov[5], ov[6], a, d, tx, ty, alpha, blend);
                }
                return;
            }
            gl.draw(Renderer.glSource(bmd), 0, 0, o.$w, o.$h, a, 0, 0, d, tx, ty, alpha, blend);
            return;
        }
        // (a glow, or not a bitmap: drawn by the canvas into a picture of its own, at this resolution)
        this.measure(e);
        let mx: number = this._mx;
        let my: number = this._my;
        let mw: number = this._mw;
        let mh: number = this._mh;
        if (!(mw > 0) || !(mh > 0) || mx >= vr || my >= vb || mx + mw <= vx || my + mh <= vy) {
            return;
        }
        let pic: BitmapData = this.ioGlPicture(e, bmd, f, mx, my, mw, mh);
        if (!pic) {
            return;
        }
        // (the picture's own pixels are 1/f of the canvas's)
        gl.draw(Renderer.glSource(pic), 0, 0, (pic as any).$w, (pic as any).$h, 1, 0, 0, 1, (mx - vx) * f - 1, (my - vy) * f - 1, 1, blend);
    }

    /**
     * Inferno-only (21 October, the user's: "sometimes there is a stray pixel or stray line of pixels" round animations):
     * the part of a sheet (rx, ry, rw, rh) that copyPixels put at (ox, oy) on a picture of pw x ph, drawn straight from
     * the sheet where the picture is (tx, ty, a and d its scale), exactly as copyPixels put it: its numbers rounded (a
     * Zagnoid's frames are 64.4 wide: the card drew a column of the next frame), and only what landed on the picture
     * (a frame bigger than its monster's picture was drawn whole: pixels the canvas never shows).
     */
    private static ioGlCopy(gl: GlYard, src: BitmapData, pw: number, ph: number, rx: number, ry: number, rw: number, rh: number, ox: number, oy: number, a: number, d: number, tx: number, ty: number, alpha: number, blend: int): void {
        let s: any = src;
        let sx: number = Math.round(rx);
        let sy: number = Math.round(ry);
        let w: number = Math.round(rw);
        let h: number = Math.round(rh);
        let dx: number = Math.round(ox);
        let dy: number = Math.round(oy);
        // (inside the sheet, as copyPixels clips it)
        if (sx < 0) {
            dx -= sx;
            w += sx;
            sx = 0;
        }
        if (sy < 0) {
            dy -= sy;
            h += sy;
            sy = 0;
        }
        w = Math.min(w, s.$w - sx);
        h = Math.min(h, s.$h - sy);
        // (and on the picture, as the canvas keeps only what lands on it)
        if (dx < 0) {
            sx -= dx;
            w += dx;
            dx = 0;
        }
        if (dy < 0) {
            sy -= dy;
            h += dy;
            dy = 0;
        }
        w = Math.min(w, pw - dx);
        h = Math.min(h, ph - dy);
        if (w <= 0 || h <= 0) {
            return;
        }
        gl.draw(Renderer.glSource(src), sx, sy, w, h, a, 0, 0, d, tx + dx * a, ty + dy * d, alpha, blend);
    }

    /** An entry drawn by the canvas into its own picture (kept while it doesn't change), f pixels a canvas pixel. */
    private ioGlPicture(e: RasterData, bmd: BitmapData, f: number, mx: number, my: number, mw: number, mh: number): BitmapData {
        let w: int = (Math.ceil(mw * f) + 2) | 0;
        let h: int = (Math.ceil(mh * f) + 2) | 0;
        if (w > 4096 || h > 4096 || w * h > 8388608) {
            return null;
        }
        let ent: any = e;
        let ver: number = this._mver;
        let fsig: string = e._filter ? JSON.stringify(e._filter) : "";
        let key: string = ver + "|" + f + "|" + e._scaleX + "|" + e._scaleY + "|" + (e._alpha >>> 24) + "|" + fsig + "|" + (mx - e._pt.x).toFixed(2) + "|" + (my - e._pt.y).toFixed(2) + "|" + w + "x" + h;
        let held: any = ent._ioGlPic;
        if (held && held.key === key && ver === ver && !held.bd.$disposed) {
            return held.bd;
        }
        let pic: BitmapData = held && !held.bd.$disposed && held.bd.width === w && held.bd.height === h ? held.bd : null;
        if (!pic) {
            if (held && held.bd && !held.bd.$disposed) {
                held.bd.dispose();
            }
            pic = new BitmapData(w, h, true, 0);
        } else {
            pic.fillRect(pic.rect, 0);
        }
        this._matrix.createBox(e._scaleX * 0.01 * f, e._scaleY * 0.01 * f, 0, (e._pt.x - mx) * f + 1, (e._pt.y - my) * f + 1);
        let ct: ColorTransform = null;
        if (e._alpha !== 4278190080) {
            this._alphaCt.alphaMultiplier = (e._alpha >>> 24) / 255;
            ct = this._alphaCt;
        }
        let smooth: boolean = Renderer.ioSmooth(e._scaleX * 0.01 * f, e._scaleY * 0.01 * f);
        if (e._filter && bmd) {
            let fb: Bitmap = this.filteredBitmap(e, bmd);
            let was: boolean = fb.smoothing;
            fb.smoothing = smooth;
            pic.draw(as3.cast(fb, IBitmapDrawable), this._matrix, ct, null, null, smooth);
            fb.smoothing = was;
        } else {
            pic.draw(e._data, this._matrix, ct, null, null, smooth);
        }
        ent._ioGlPic = { "key": key, "bd": pic };
        return pic;
    }

    /** The card's canvas where its part of the yard's canvas is (as the lens canvas is placed), the yard's canvas hidden. */
    private ioGlPlace(): void {
        let gl: GlYard = Renderer._gl;
        let cc: Bitmap = MAP._canvasContainer;
        let par: DisplayObjectContainer = cc ? cc.parent : null;
        if (!par) {
            return;
        }
        if (!this._glBd) {
            this._glBd = new BitmapData(1, 1, false, 0);
        }
        let bd: any = this._glBd;
        if (bd.$canvas !== gl.canvas || bd.$w !== gl.canvas.width || bd.$h !== gl.canvas.height) {
            bd.$canvas = gl.canvas;
            bd.$w = gl.canvas.width;
            bd.$h = gl.canvas.height;
            if (this._glBm) {
                this._glBm.bitmapData = null;
            }
        }
        if (!this._glBm) {
            this._glBm = new Bitmap();
            this._glBm.name = "ioGlCanvas";
        }
        let bm: Bitmap = this._glBm;
        if (bm.bitmapData !== this._glBd) {
            bm.bitmapData = this._glBd;
        }
        if (bm.parent !== par) {
            par.addChildAt(bm, (par.getChildIndex(cc) + 1) | 0);
        }
        // (shown straight from the card: under the game's canvas, which is left see-through where this picture is)
        if (Object(bd)["$ioHole"] !== this._glDirect) {
            Object(bd)["$ioHole"] = this._glDirect;
            bd.$touch();
        }
        player.showGlLayer(gl.canvas, this._glDirect);
        let f: number = this._glF;
        bm.x = cc.x + this._glX * cc.scaleX;
        bm.y = cc.y + this._glY * cc.scaleY;
        bm.scaleX = cc.scaleX / f;
        bm.scaleY = cc.scaleY / f;
        Object(bm)["$ip0"] = null;
        // (21 October: never shown smaller than its pixels; larger (kept within the lens's limits), not blurred)
        if (bm.smoothing) {
            bm.smoothing = false;
        }
        if (!bm.visible) {
            bm.visible = true;
        }
        if (cc.visible) {
            cc.visible = false;
            this._glHid = true;
        }
        this._glOn = true;
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
        let merged: boolean = false;
        while (i < len) {
            entry = as3.vget(param1, i++);
            if (!entry || entry._cleared || !entry._pt || !entry._rsHas) {
                continue;
            }
            if (entry._rsX >= rr || entry._rsX + entry._rsW <= rx || entry._rsY >= rb || entry._rsY + entry._rsH <= ry) {
                continue;
            }
            if (this._ioShMerge && this.ioMerged(entry)) {
                if (!merged) {
                    merged = true;
                    this.ioShadowsInto(this._canvas, param1, i - 1, rx, ry, rr, rb, 1, 0, 0, true, false);
                }
                continue;
            }
            entryBmd = as3.as(entry._data, BitmapData);
            if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX === 100 && entry._scaleY === 100) && entry._alpha === 4278190080) {
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
                // (no clip when all of it is inside, a pixel to spare (a picture drawn at a part of a pixel, smoothed): a
                // clip costs a save, a path and a restore; and nothing is drawn outside r, the change logged for it)
                this.drawEntry(entry, entryBmd, entry._rsX - 1 >= rx && entry._rsY - 1 >= ry && entry._rsX + entry._rsW + 1 <= rr && entry._rsY + entry._rsH + 1 <= rb ? null : r);
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
        if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX === 100 && entry._scaleY === 100)) {
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
        let merged: boolean = false;

        while (i < len) {
            entry = as3.vget(entries, i);
            if (!entry || entry._cleared || !entry._pt || (!this._shadows && this.isShadow(entry))) {
                i++;
                continue;
            }
            if (this._ioShMerge && this.ioMerged(entry)) {
                // (Inferno-only: every shadow at once, where the first is drawn: see ioShadowsInto)
                if (!merged) {
                    merged = true;
                    this.ioShadowsInto(this._canvas, entries, i, 0, 0, this._canvas.width, this._canvas.height, 1, 0, 0, false, false);
                }
                i++;
                continue;
            }
            entryBmd = as3.as(entry._data, BitmapData);
            this._pt.x = entry._pt.x;
            this._pt.y = entry._pt.y;
            if (entryBmd && !entry._blendMode && !entry._filter && (entry._scaleX === 100 && entry._scaleY === 100)) {
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
