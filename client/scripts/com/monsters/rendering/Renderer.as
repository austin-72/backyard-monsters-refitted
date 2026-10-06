package com.monsters.rendering {
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.display.Shape;
    import flash.filters.BitmapFilter;
    import flash.geom.ColorTransform;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.utils.getTimer;

    use namespace renderer_friend;

    public class Renderer {

        renderer_friend static var _debug:Boolean;

        private static var _debugShape:Shape;

        renderer_friend var _canvas:BitmapData;

        renderer_friend var _viewRect:Rectangle;

        private const _matrix:Matrix = new Matrix();

        private const _pt:Point = new Point();

        private const _bm:Bitmap = new Bitmap();

        private const _alphaCt:ColorTransform = new ColorTransform();

        private var _curCopyIndex:uint;

        private var _curDrawIndex:uint;

        // ---- Inferno-only: partial redraw ------------------------------------------------------------
        // The whole yard used to be drawn again every frame: the 8-megapixel ground, then every building,
        // shadow and monster, moved or not. Now each frame finds what changed since the last one (moved,
        // animated, appeared, gone, drawn differently) and draws again only there, clipped. It needs to
        // know when a bitmap's pixels change, which the browser build can tell (a version on every
        // BitmapData) and Flash cannot: in Flash every frame is still drawn whole.

        /** 0: as the server says (flag io_fullredraw), 1: partial, 2: whole every frame (tests, comparing). */
        public static var ioMode:int = 0;

        /** What the frames did: whole, partial, nothing to do; rectangles and pixels drawn again (tests). */
        public static const ioStats:Object = {"full": 0, "partial": 0, "idle": 0, "rects": 0, "area": 0, "swept": 0};

        private var _frame:uint = 0;

        private var _drawn:Vector.<RasterData> = new Vector.<RasterData>();

        private var _drawnNext:Vector.<RasterData> = new Vector.<RasterData>();

        private var _forceFull:Boolean = true;

        private var _dirty:Vector.<Rectangle> = new Vector.<Rectangle>();

        /** This frame's strip of the sweep (see addSweep). */
        private var _sweep:Vector.<Rectangle> = new Vector.<Rectangle>();

        private var _shadows:Boolean = true;

        /** Where the sweep got to (0..1 down the view) and when (see addSweep). */
        private var _sweepPos:Number = 0;

        private var _sweepAt:int = -1;

        private const _src:Rectangle = new Rectangle();

        private var _mx:Number = 0;

        private var _my:Number = 0;

        private var _mw:Number = 0;

        private var _mh:Number = 0;

        private var _mver:Number = 0;

        public function Renderer(param1:BitmapData, param2:Rectangle) {
            super();
            this.renderer_friend::_canvas = param1;
            this.renderer_friend::_viewRect = param2;
        }

        public static function get debug():Boolean {
            return renderer_friend::_debug;
        }

        public static function set debug(param1:Boolean):void {
            renderer_friend::_debug = param1;
            if (renderer_friend::_debug) {
                _debugShape = _debugShape || new Shape();
                RasterData.renderer_friend::showDebug();
            }
            else {
                _debugShape = null;
                RasterData.renderer_friend::hideDebug();
            }
        }

        public function set canvas(param1:BitmapData):void {
            this.renderer_friend::_canvas = param1;
            this._forceFull = true;
        }

        /** The next frame is drawn whole (the yard changed under the renderer's feet). */
        public function ioRedrawAll():void {
            this._forceFull = true;
        }

        // ---- Inferno-only, browser build: frame interpolation ------------------------------------------------
        // The page can show made-up frames between the game's (its "Frame interpolation" setting). The player
        // (client-web, display/core interp) moves the display objects part of the way; this does the same for
        // what is drawn into the yard: each entry part of the way between where it was at the game's last two
        // frames, drawn, then put back at once. ioInterp is the player's object, found on the stage (never in
        // Flash: there is nothing there to find).

        private var _ipReal:int = 0;

        private var _ipTick:Number = NaN;

        private const _ipApplied:Vector.<RasterData> = new Vector.<RasterData>();

        /** The player's interpolation object, or null (Flash, or the page has none). */
        private static function ioInterp():Object {
            var s:Object = GLOBAL._ROOT ? GLOBAL._ROOT.stage : null;
            if (s && "$ioInterp" in s) {
                return s["$ioInterp"];
            }
            return null;
        }

        public function render():void {
            var ip:Object = ioInterp();
            var a:Number = 1;
            if (ip) {
                ip.hook = this.ioInterpolate;
                if (ip.on) {
                    this.ioRecord();
                    this._ipTick = Number(ip.tick);
                    a = Number(ip.first);
                }
                else {
                    this._ipTick = NaN;
                }
            }
            if (a < 1) {
                this.ioLerp(a);
            }
            try {
                this.ioDraw();
            }
            finally {
                if (a < 1) {
                    this.ioUnlerp();
                }
            }
        }

        /** Called by the player for a made-up frame: the yard `a` of the way between the game's last two frames. */
        public function ioInterpolate(a:Number, tick:Number):void {
            var lerp:Boolean = a < 1 && tick === this._ipTick;
            if (lerp) {
                this.ioLerp(a);
            }
            try {
                this.ioDraw();
            }
            finally {
                if (lerp) {
                    this.ioUnlerp();
                }
            }
        }

        /** At a game frame: where each entry is now, and where it was at the last one (if it was drawn then). */
        private function ioRecord():void {
            var lists:Array = [RasterData.renderer_friend::s_unsortedData, RasterData.renderer_friend::s_visibleData];
            var list:Vector.<RasterData> = null;
            var e:RasterData = null;
            var p:Point = null;
            var i:int = 0;
            ++this._ipReal;
            for each (list in lists) {
                i = 0;
                while (i < list.length) {
                    e = list[i++];
                    if (!e || !(p = e.renderer_friend::_pt)) {
                        continue;
                    }
                    if (e.renderer_friend::_ipSeen == this._ipReal - 1) {
                        e.renderer_friend::_ipX0 = e.renderer_friend::_ipX1;
                        e.renderer_friend::_ipY0 = e.renderer_friend::_ipY1;
                    }
                    else {
                        e.renderer_friend::_ipX0 = p.x;
                        e.renderer_friend::_ipY0 = p.y;
                    }
                    e.renderer_friend::_ipX1 = p.x;
                    e.renderer_friend::_ipY1 = p.y;
                    e.renderer_friend::_ipSeen = this._ipReal;
                }
            }
        }

        /** Every entry that moved since the last game frame (not one that jumped) part of the way. */
        private function ioLerp(a:Number):void {
            var lists:Array = [RasterData.renderer_friend::s_unsortedData, RasterData.renderer_friend::s_visibleData];
            var list:Vector.<RasterData> = null;
            var e:RasterData = null;
            var p:Point = null;
            var i:int = 0;
            var dx:Number = 0;
            var dy:Number = 0;
            this._ipApplied.length = 0;
            for each (list in lists) {
                i = 0;
                while (i < list.length) {
                    e = list[i++];
                    if (!e || !(p = e.renderer_friend::_pt) || e.renderer_friend::_ipSeen != this._ipReal) {
                        continue;
                    }
                    dx = e.renderer_friend::_ipX1 - e.renderer_friend::_ipX0;
                    dy = e.renderer_friend::_ipY1 - e.renderer_friend::_ipY0;
                    if (dx == 0 && dy == 0 || Math.abs(dx) + Math.abs(dy) > 200 || p.x != e.renderer_friend::_ipX1 || p.y != e.renderer_friend::_ipY1) {
                        continue;
                    }
                    e.renderer_friend::_ipSx = p.x;
                    e.renderer_friend::_ipSy = p.y;
                    p.x = e.renderer_friend::_ipX0 + dx * a;
                    p.y = e.renderer_friend::_ipY0 + dy * a;
                    this._ipApplied.push(e);
                }
            }
        }

        /** Back where they are (last first: entries that share a point get its real place back last). */
        private function ioUnlerp():void {
            var i:int = this._ipApplied.length - 1;
            var e:RasterData = null;
            while (i >= 0) {
                e = this._ipApplied[i];
                e.renderer_friend::_pt.x = e.renderer_friend::_ipSx;
                e.renderer_friend::_pt.y = e.renderer_friend::_ipSy;
                i--;
            }
            this._ipApplied.length = 0;
        }

        private function ioDraw():void {
            var _loc1_:Vector.<RasterData> = RasterData.renderer_friend::s_visibleData;
            var r:Rectangle = null;
            var all:Boolean = false;
            this._curCopyIndex = this._curDrawIndex = 0;
            if (RasterData.renderer_friend::s_needsSort) {
                this.sortByDepth(_loc1_);
                RasterData.renderer_friend::s_needsSort = false;
            }
            // Inferno-only: shadows under buildings (server flag io_shadows), hidden while a building is held
            // (moved in move mode, or a new one being placed) unless io_moveshadows: drawing is lighter then
            var held:Boolean = GLOBAL._newBuilding != null || (GLOBAL._selectedBuilding != null && GLOBAL._selectedBuilding._moving);
            this._shadows = !GLOBAL.INFERNO_ONLY || (GLOBAL.ioFlag("io_shadows", 1) > 0 && (!held || GLOBAL.ioFlag("io_moveshadows", 0) > 0));
            var partial:Boolean = ioMode == 1 || (ioMode == 0 && GLOBAL.INFERNO_ONLY && GLOBAL.ioFlag("io_fullredraw", 0) <= 0);
            partial = partial && ("$version" in this.renderer_friend::_canvas);
            all = this.ioFindChanges(partial);
            this.renderer_friend::_canvas.lock();
            if (all) {
                // Two passes instead of concat(): that built a new list of everything in the yard every frame.
                this.rasterize(RasterData.renderer_friend::s_unsortedData);
                this.rasterize(_loc1_);
                ++ioStats.full;
            }
            else {
                if (this._dirty.length == 0) {
                    ++ioStats.idle;
                }
                else {
                    for each (r in this._dirty) {
                        this.rasterizeIn(RasterData.renderer_friend::s_unsortedData, r);
                        this.rasterizeIn(_loc1_, r);
                        ioStats.area += r.width * r.height;
                    }
                    ioStats.rects += this._dirty.length;
                    ++ioStats.partial;
                }
                if (this._sweep.length) {
                    // drawn again as it should already be: not logged as a change (a change would join the
                    // screen's own and could tip it into repainting everything), only noted as swept: the
                    // screen repaints the strip on its own, so whatever this puts right shows
                    Object(this.renderer_friend::_canvas)["$quiet"] = true;
                    for each (r in this._sweep) {
                        this.rasterizeIn(RasterData.renderer_friend::s_unsortedData, r);
                        this.rasterizeIn(_loc1_, r);
                        Object(this.renderer_friend::_canvas)["$noteSwept"](r.x, r.y, r.width, r.height);
                        ioStats.swept += r.width * r.height;
                    }
                    Object(this.renderer_friend::_canvas)["$quiet"] = false;
                }
            }
            this.renderer_friend::_canvas.unlock();
        }

        /** A shadow under a building or a mushroom (drawn first, at the shadow depth). */
        private function isShadow(e:RasterData):Boolean {
            return e.renderer_friend::_unSorted && e.renderer_friend::_depth == 1; // MAP.DEPTH_SHADOW
        }

        private static function versionOf(b:BitmapData):Number {
            return "$version" in b ? Number(Object(b)["$version"]) : NaN;
        }

        /** Where the entry is drawn now (padded for a filter's glow) into _mx.._mh, its pixels' version into _mver. */
        private function measure(e:RasterData):void {
            var data:Object = e.renderer_friend::_data;
            var bmd:BitmapData = data as BitmapData;
            var sx:Number = e.renderer_friend::_scaleX * 0.01;
            var sy:Number = e.renderer_friend::_scaleY * 0.01;
            var b:Rectangle = null;
            // (a filter draws outside the picture: a glow round a monster under a Sulfur Bomb; without its
            // reach, the old glow's edge was left on the ground as the monster walked)
            var pad:Number = e.renderer_friend::_filter ? filterPad(e.renderer_friend::_filter) : 0;
            if (bmd) {
                this._mx = e.renderer_friend::_pt.x;
                this._my = e.renderer_friend::_pt.y;
                this._mw = bmd.width * sx;
                this._mh = bmd.height * sy;
                this._mver = versionOf(bmd);
                // a big bitmap (the ground) logs where it changes, so only there is drawn again
                if (bmd.width * bmd.height >= 262144 && "$trackChanges" in bmd && !Object(bmd)["$track"]) {
                    Object(bmd)["$trackChanges"]();
                }
            }
            else {
                b = data is DisplayObject ? DisplayObject(data).getBounds(DisplayObject(data)) : new Rectangle();
                if (data is DisplayObject) {
                    pad += displayPad(DisplayObject(data), 0);
                }
                this._mx = e.renderer_friend::_pt.x + b.x * sx;
                this._my = e.renderer_friend::_pt.y + b.y * sy;
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
        private static function filterPad(f:Object):Number {
            var p:Number = 0;
            if (!f) {
                return 0;
            }
            if ("$padding" in f) {
                p = Number(f["$padding"]());
            }
            else {
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
        private static function displayPad(o:DisplayObject, level:int):Number {
            var own:Number = 0;
            var inner:Number = 0;
            var f:Object = null;
            var i:int = 0;
            var c:DisplayObjectContainer = o as DisplayObjectContainer;
            var list:Array = o.filters;
            if (list && list.length) {
                for each (f in list) {
                    own = Math.max(own, filterPad(f));
                }
            }
            if (c && level < 4) {
                while (i < c.numChildren) {
                    inner = Math.max(inner, displayPad(c.getChildAt(i), level + 1));
                    i++;
                }
            }
            return own + inner;
        }

        private function addDirty(x:Number, y:Number, w:Number, h:Number):void {
            var x0:int = Math.max(0, Math.floor(x) - 1);
            var y0:int = Math.max(0, Math.floor(y) - 1);
            var x1:int = Math.min(this.renderer_friend::_canvas.width, Math.ceil(x + w) + 1);
            var y1:int = Math.min(this.renderer_friend::_canvas.height, Math.ceil(y + h) + 1);
            if (x1 > x0 && y1 > y0) {
                this._dirty.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
            }
        }

        /**
         * Compares everything to be drawn now with how it was drawn last frame and collects the rectangles
         * to draw again in _dirty. True when the whole canvas is to be drawn (first frame, most of it
         * changed, or partial redraw off).
         */
        private function ioFindChanges(partial:Boolean):Boolean {
            var lists:Array = [RasterData.renderer_friend::s_unsortedData, RasterData.renderer_friend::s_visibleData];
            var list:Vector.<RasterData> = null;
            var e:RasterData = null;
            var i:int = 0;
            var full:Boolean = false;
            var same:Boolean = false;
            var bmd:BitmapData = null;
            var sub:Object = null;
            var b:Array = null;
            var swap:Vector.<RasterData> = null;
            this._dirty.length = 0;
            this._sweep.length = 0;
            if (!partial) {
                this._forceFull = true; // (when it is switched on again: from a whole frame)
                return true;
            }
            full = this._forceFull;
            this._forceFull = false;
            ++this._frame;
            this._drawnNext.length = 0;
            for each (list in lists) {
                i = 0;
                while (i < list.length) {
                    e = list[i++];
                    if (!e || e.renderer_friend::_cleared || !e.renderer_friend::_pt || e.renderer_friend::_rsFrame === this._frame) {
                        continue;
                    }
                    if (!this._shadows && this.isShadow(e)) {
                        continue;
                    }
                    this.measure(e);
                    if (!full) {
                        same = e.renderer_friend::_rsHas && e.renderer_friend::_rsX == this._mx && e.renderer_friend::_rsY == this._my && e.renderer_friend::_rsW == this._mw && e.renderer_friend::_rsH == this._mh && e.renderer_friend::_rsData === e.renderer_friend::_data && e.renderer_friend::_rsAlpha == e.renderer_friend::_alpha && e.renderer_friend::_rsBlend == e.renderer_friend::_blendMode && e.renderer_friend::_rsFilter === e.renderer_friend::_filter && e.renderer_friend::_rsDepth == e.renderer_friend::_depth;
                        if (!e.renderer_friend::_rsHas) {
                            this.addDirty(this._mx, this._my, this._mw, this._mh);
                        }
                        else if (!same) {
                            this.addDirty(e.renderer_friend::_rsX, e.renderer_friend::_rsY, e.renderer_friend::_rsW, e.renderer_friend::_rsH);
                            this.addDirty(this._mx, this._my, this._mw, this._mh);
                        }
                        else if (!(this._mver === e.renderer_friend::_rsVer)) {
                            // the same bitmap in the same place, its pixels changed: where it says, if it
                            // keeps a log (a big one, drawn as is), otherwise all of it
                            bmd = e.renderer_friend::_data as BitmapData;
                            sub = null;
                            if (bmd && !e.renderer_friend::_filter && (e.renderer_friend::_scaleX & e.renderer_friend::_scaleY) === 100 && "$dirtySince" in bmd) {
                                sub = Object(bmd)["$dirtySince"](e.renderer_friend::_rsVer);
                            }
                            if (sub) {
                                for each (b in sub) {
                                    this.addDirty(this._mx + b[0], this._my + b[1], b[2] - b[0], b[3] - b[1]);
                                }
                            }
                            else {
                                this.addDirty(this._mx, this._my, this._mw, this._mh);
                            }
                        }
                    }
                    e.renderer_friend::_rsHas = true;
                    e.renderer_friend::_rsFrame = this._frame;
                    e.renderer_friend::_rsX = this._mx;
                    e.renderer_friend::_rsY = this._my;
                    e.renderer_friend::_rsW = this._mw;
                    e.renderer_friend::_rsH = this._mh;
                    e.renderer_friend::_rsVer = this._mver;
                    e.renderer_friend::_rsData = e.renderer_friend::_data;
                    e.renderer_friend::_rsAlpha = e.renderer_friend::_alpha;
                    e.renderer_friend::_rsBlend = e.renderer_friend::_blendMode;
                    e.renderer_friend::_rsFilter = e.renderer_friend::_filter;
                    e.renderer_friend::_rsDepth = e.renderer_friend::_depth;
                    this._drawnNext.push(e);
                }
            }
            // drawn last frame, not now (gone, hidden, out of view): where it was is drawn again
            for each (e in this._drawn) {
                if (e.renderer_friend::_rsFrame !== this._frame) {
                    if (!full && e.renderer_friend::_rsHas) {
                        this.addDirty(e.renderer_friend::_rsX, e.renderer_friend::_rsY, e.renderer_friend::_rsW, e.renderer_friend::_rsH);
                    }
                    e.renderer_friend::_rsHas = false;
                }
            }
            swap = this._drawn;
            this._drawn = this._drawnNext;
            this._drawnNext = swap;
            if (full) {
                this._dirty.length = 0;
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
        private function addSweep():void {
            var ms:Number = GLOBAL._flags && GLOBAL._flags.hasOwnProperty("io_sweepms") ? Number(GLOBAL._flags.io_sweepms) : 1000;
            var v:Rectangle = this.renderer_friend::_viewRect;
            var now:int = getTimer();
            var to:Number = 0;
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
            }
            else if (to <= 1) {
                this.addStrip(v, this._sweepPos, to);
            }
            else {
                this.addStrip(v, this._sweepPos, 1);
                this.addStrip(v, 0, to - 1);
            }
            this._sweepPos = to % 1;
        }

        /** The part of the view from a to b (0..1, top to bottom), whole pixels, inside the canvas. */
        private function addStrip(v:Rectangle, a:Number, b:Number):void {
            var x0:int = Math.max(0, Math.floor(v.x));
            var y0:int = Math.max(0, Math.floor(v.y + a * v.height));
            var x1:int = Math.min(this.renderer_friend::_canvas.width, Math.ceil(v.x + v.width));
            var y1:int = Math.min(this.renderer_friend::_canvas.height, Math.ceil(v.y + b * v.height));
            if (x1 > x0 && y1 > y0) {
                this._sweep.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
            }
        }

        /** Tile size of the dirty-tile grid (tileDirty), and the grid (reused). */
        private static const TILE:int = 32;

        private var _tiles:Vector.<int> = new Vector.<int>();

        private var _tilesW:int = 0;

        /**
         * Many changes (a battle: every monster, its shadow, every shot) become the 32-pixel tiles they touch,
         * then rows of touched tiles, joined downwards where rows match. Merging hundreds of rectangles
         * pairwise until none overlapped cost more than drawing them (it started again after every merge),
         * and past 24 everything became one box round the lot: most of the yard drawn again.
         */
        private function tileDirty():void {
            var d:Vector.<Rectangle> = this._dirty;
            var cw:int = this.renderer_friend::_canvas.width;
            var ch:int = this.renderer_friend::_canvas.height;
            var t:int = int(GLOBAL.ioFlag("io_tile", d.length > 400 ? TILE * 2 : TILE));
            var cols:int = int((cw + t - 1) / t);
            var rows:int = int((ch + t - 1) / t);
            var n:int = cols * rows;
            var r:Rectangle = null;
            var c0:int = 0;
            var c1:int = 0;
            var r0:int = 0;
            var r1:int = 0;
            var minR:int = rows;
            var maxR:int = -1;
            var minC:int = cols;
            var maxC:int = -1;
            var x:int = 0;
            var y:int = 0;
            var run:int = 0;
            var key:int = 0;
            var open:Object = {};
            var next:Object = null;
            var k:String = null;
            var out:Vector.<Rectangle> = new Vector.<Rectangle>();
            if (this._tiles.length != n || this._tilesW != cols) {
                this._tiles = new Vector.<int>(n);
                this._tilesW = cols;
            }
            for each (r in d) {
                c0 = int(r.x / t);
                c1 = int((r.x + r.width - 1) / t);
                r0 = int(r.y / t);
                r1 = int((r.y + r.height - 1) / t);
                if (c0 < 0) {
                    c0 = 0;
                }
                if (r0 < 0) {
                    r0 = 0;
                }
                if (c1 >= cols) {
                    c1 = cols - 1;
                }
                if (r1 >= rows) {
                    r1 = rows - 1;
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
                        this._tiles[y * cols + x] = 1;
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
                    if (this._tiles[y * cols + x] == 0) {
                        x++;
                        continue;
                    }
                    run = x;
                    while (x <= maxC && this._tiles[y * cols + x] != 0) {
                        this._tiles[y * cols + x] = 0;
                        x++;
                    }
                    key = run * 65536 + x;
                    r = open[key] as Rectangle;
                    if (r) {
                        r.height += t; // the same run as the row above: that rectangle grows down
                    }
                    else {
                        r = new Rectangle(run * t, y * t, (x - run) * t, t);
                        out.push(r);
                    }
                    next[key] = r;
                }
                open = next;
                y++;
            }
            d.length = 0;
            for each (r in out) {
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
        private function mergeDirty():Boolean {
            var d:Vector.<Rectangle> = this._dirty;
            var merged:Boolean = d.length <= 12;
            var i:int = 0;
            var j:int = 0;
            var a:Rectangle = null;
            var b:Rectangle = null;
            var area:Number = 0;
            if (!merged) {
                this.tileDirty();
            }
            while (merged) {
                merged = false;
                i = 0;
                outer: while (i < d.length) {
                    a = d[i];
                    j = i + 1;
                    while (j < d.length) {
                        b = d[j];
                        if (a.x <= b.right && b.x <= a.right && a.y <= b.bottom && b.y <= a.bottom) {
                            d[i] = a.union(b);
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
                a = d[0];
                for each (b in d) {
                    a = a.union(b);
                }
                d.length = 0;
                d.push(a);
            }
            for each (a in d) {
                area += a.width * a.height;
            }
            if (area > this.renderer_friend::_canvas.width * this.renderer_friend::_canvas.height * 0.7) {
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
        private function ioWholeView(area:Number):void {
            var v:Rectangle = this.renderer_friend::_viewRect;
            var d:Vector.<Rectangle> = this._dirty;
            var cw:int = this.renderer_friend::_canvas.width;
            var ch:int = this.renderer_friend::_canvas.height;
            var x0:int = 0;
            var y0:int = 0;
            var x1:int = 0;
            var y1:int = 0;
            var r:Rectangle = null;
            var keep:Vector.<Rectangle> = null;
            var inView:Number = 0;
            if (!v || d.length < 8) {
                return;
            }
            x0 = Math.max(0, Math.floor(v.x));
            y0 = Math.max(0, Math.floor(v.y));
            x1 = Math.min(cw, Math.ceil(v.x + v.width));
            y1 = Math.min(ch, Math.ceil(v.y + v.height));
            if (x1 <= x0 || y1 <= y0) {
                return;
            }
            for each (r in d) {
                inView += Math.max(0, Math.min(x1, r.x + r.width) - Math.max(x0, r.x)) * Math.max(0, Math.min(y1, r.y + r.height) - Math.max(y0, r.y));
            }
            if (inView < (x1 - x0) * (y1 - y0) * GLOBAL.ioFlag("io_viewall", 35) / 100) {
                return;
            }
            keep = new Vector.<Rectangle>();
            keep.push(new Rectangle(x0, y0, x1 - x0, y1 - y0));
            for each (r in d) {
                if (r.x < x0 || r.y < y0 || r.x + r.width > x1 || r.y + r.height > y1) {
                    // (reaches outside the view: the parts outside it)
                    outside(keep, r, x0, y0, x1, y1);
                }
            }
            d.length = 0;
            for each (r in keep) {
                d.push(r);
            }
        }

        /** Draws, in order, the part of each entry inside r (it was drawn whole there before: the same pixels). */
        private function rasterizeIn(param1:Vector.<RasterData>, r:Rectangle):void {
            var entry:RasterData = null;
            var entryBmd:BitmapData = null;
            var i:int = 0;
            var len:int = int(param1.length);
            var px:Number = 0;
            var py:Number = 0;
            var x0:Number = 0;
            var y0:Number = 0;
            var x1:Number = 0;
            var y1:Number = 0;
            // (the rectangle's edges once, not as getters for every entry)
            var rx:Number = r.x;
            var ry:Number = r.y;
            var rr:Number = r.x + r.width;
            var rb:Number = r.y + r.height;
            while (i < len) {
                entry = param1[i++];
                if (!entry || entry.renderer_friend::_cleared || !entry.renderer_friend::_pt || !entry.renderer_friend::_rsHas) {
                    continue;
                }
                if (entry.renderer_friend::_rsX >= rr || entry.renderer_friend::_rsX + entry.renderer_friend::_rsW <= rx || entry.renderer_friend::_rsY >= rb || entry.renderer_friend::_rsY + entry.renderer_friend::_rsH <= ry) {
                    continue;
                }
                entryBmd = entry.renderer_friend::_data as BitmapData;
                if (entryBmd && !entry.renderer_friend::_blendMode && !entry.renderer_friend::_filter && (entry.renderer_friend::_scaleX & entry.renderer_friend::_scaleY) === 100 && entry.renderer_friend::_alpha === 4278190080) {
                    // (copyPixels puts a bitmap at whole pixels, rounded)
                    px = Math.round(entry.renderer_friend::_pt.x);
                    py = Math.round(entry.renderer_friend::_pt.y);
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
                    this.renderer_friend::_canvas.copyPixels(entryBmd, this._src, this._pt);
                }
                else {
                    // (no clip when all of it is inside: a clip costs a save, a path and a restore)
                    this.drawEntry(entry, entryBmd, entry.renderer_friend::_rsX >= rx && entry.renderer_friend::_rsY >= ry && entry.renderer_friend::_rsX + entry.renderer_friend::_rsW <= rr && entry.renderer_friend::_rsY + entry.renderer_friend::_rsH <= rb ? null : r);
                }
            }
        }

        /** The parts of r outside the box x0..x1, y0..y1 (up to four rectangles) onto out. */
        private static function outside(out:Vector.<Rectangle>, r:Rectangle, x0:int, y0:int, x1:int, y1:int):void {
            var rx0:Number = r.x;
            var ry0:Number = r.y;
            var rx1:Number = r.x + r.width;
            var ry1:Number = r.y + r.height;
            var my0:Number = Math.max(ry0, y0);
            var my1:Number = Math.min(ry1, y1);
            if (rx1 <= x0 || rx0 >= x1 || ry1 <= y0 || ry0 >= y1) {
                out.push(r); // (none of it inside)
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
        private function filteredBitmap(entry:RasterData, bmd:BitmapData):Bitmap {
            var bm:Bitmap = entry.renderer_friend::_ioBm;
            var f:BitmapFilter = entry.renderer_friend::_filter;
            if (!bm) {
                bm = entry.renderer_friend::_ioBm = new Bitmap();
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
        private function drawEntry(entry:RasterData, entryBmd:BitmapData, clip:Rectangle):void {
            this._pt.x = entry.renderer_friend::_pt.x;
            this._pt.y = entry.renderer_friend::_pt.y;
            if (entryBmd && !entry.renderer_friend::_blendMode && !entry.renderer_friend::_filter && (entry.renderer_friend::_scaleX & entry.renderer_friend::_scaleY) === 100) {
                this._matrix.createBox(1, 1, 0, this._pt.x, this._pt.y);
                this._alphaCt.alphaMultiplier = (entry.renderer_friend::_alpha >>> 24) / 255;
                this.renderer_friend::_canvas.draw(entryBmd, this._matrix, this._alphaCt, null, clip);
                return;
            }
            this._matrix.createBox(entry.renderer_friend::_scaleX * 0.01, entry.renderer_friend::_scaleY * 0.01, 0, this._pt.x, this._pt.y);
            if (Boolean(entry.renderer_friend::_filter) && Boolean(entryBmd)) {
                this.renderer_friend::_canvas.draw(this.filteredBitmap(entry, entryBmd), this._matrix, null, entry.renderer_friend::_blendMode, clip);
            }
            else {
                this.renderer_friend::_canvas.draw(entry.renderer_friend::_data, this._matrix, null, entry.renderer_friend::_blendMode, clip);
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
        private function sortByDepth(param1:Vector.<RasterData>):void {
            var i:int = 1;
            var j:int = 0;
            var item:RasterData = null;
            var depth:Number = NaN;
            var length:int = int(param1.length);
            var budget:int = length * 12;
            while (i < length) {
                item = param1[i];
                depth = item.renderer_friend::_depth;
                j = i - 1;
                while (j >= 0 && param1[j].renderer_friend::_depth > depth) {
                    param1[j + 1] = param1[j];
                    j--;
                    if (--budget < 0) {
                        param1[j + 1] = item;
                        param1.sort(this.sortRasterData);
                        return;
                    }
                }
                param1[j + 1] = item;
                i++;
            }
        }

        private function cull(param1:Vector.<RasterData>):void {
            var _loc3_:RasterData = null;
            var _loc4_:Rectangle = null;
            var _loc2_:Vector.<RasterData> = param1;
            for each (_loc3_ in _loc2_) {
                (_loc4_ = _loc3_.renderer_friend::_rect).x = _loc3_.renderer_friend::_pt.x;
                _loc4_.y = _loc3_.renderer_friend::_pt.y;
                if (this.renderer_friend::_viewRect.intersects(_loc4_)) {
                    _loc2_[_loc2_.length] = _loc3_;
                }
            }
        }

        private function sortRasterData(param1:RasterData, param2:RasterData):Number {
            return param1.renderer_friend::_depth - param2.renderer_friend::_depth;
        }

        private function rasterize(param1:Vector.<RasterData>):void {
            var entries:Vector.<RasterData> = null;
            var entry:RasterData = null;
            var entryBmd:BitmapData = null;
            var i:int = 0;

            entries = param1;
            var len:int = int(entries.length);

            while (i < len) {
                entry = entries[i];
                if (!entry || entry.renderer_friend::_cleared || !entry.renderer_friend::_pt || (!this._shadows && this.isShadow(entry))) {
                    i++;
                    continue;
                }
                entryBmd = entry.renderer_friend::_data as BitmapData;
                this._pt.x = entry.renderer_friend::_pt.x;
                this._pt.y = entry.renderer_friend::_pt.y;
                if (entryBmd && !entry.renderer_friend::_blendMode && !entry.renderer_friend::_filter && (entry.renderer_friend::_scaleX & entry.renderer_friend::_scaleY) === 100) {
                    if (entry.renderer_friend::_alpha === 4278190080) {
                        this.renderer_friend::_canvas.copyPixels(entryBmd, entryBmd.rect, this._pt);
                    }
                    else {
                        // Half see-through (a building being moved or placed): drawn at that opacity. It
                        // was copied through an alpha mask, which in the browser meant a scratch canvas
                        // that made the browser draw out everything queued so far that frame, once for
                        // every layer of the building: most of the time moving a building took.
                        this._matrix.createBox(1, 1, 0, this._pt.x, this._pt.y);
                        this._alphaCt.alphaMultiplier = (entry.renderer_friend::_alpha >>> 24) / 255;
                        this.renderer_friend::_canvas.draw(entryBmd, this._matrix, this._alphaCt);
                    }
                }
                else {
                    this._matrix.createBox(entry.renderer_friend::_scaleX * 0.01, entry.renderer_friend::_scaleY * 0.01, 0, this._pt.x, this._pt.y);
                    if (Boolean(entry.renderer_friend::_filter) && Boolean(entryBmd)) {
                        this.renderer_friend::_canvas.draw(this.filteredBitmap(entry, entryBmd), this._matrix, null, entry.renderer_friend::_blendMode);
                    }
                    else {
                        this.renderer_friend::_canvas.draw(entry.renderer_friend::_data, this._matrix, null, entry.renderer_friend::_blendMode);
                    }
                }
                i++;
            }
        }
    }
}
