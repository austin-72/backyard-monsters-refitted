package com.monsters.maproom_advanced {
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Graphics;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

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
    public class IoMapLod extends Sprite {

        /** Room at the bottom for the legend (two lines), above the window frame's bottom border. */
        public static const LEGEND_H:int = 44;

        private static const PAD:int = 6;

        /** A portal to the Depths of Hell: light purple, a darker ring. */
        public static const PORTAL_COLOUR:uint = 0xD7B8FF;

        public static const PORTAL_RING:uint = 0x4A2470;

        /** Your flinger range on the map: your blue, see-through. */
        private static const RANGE_ARGB:uint = 0x663887E7;

        /** The terrain picture of the last world drawn (a world's terrain never changes). */
        private static var s_terrain:BitmapData = null;

        private static var s_terrainWorld:String = null;

        private var _viewW:int;

        private var _viewH:int;

        private var _mapH:int;

        private var _focus:Point;

        private var _spanX:int;

        private var _spanY:int;

        private var _onPick:Function;

        /** 1, 2 or 4: how many times the whole-world view. */
        private var _zoom:int = 1;

        /** The cell (fractional) in the middle of the view. */
        private var _cx:Number = 200;

        private var _cy:Number = 200;

        private var _fit:Number = 1;

        private var _scale:Number = 1;

        private var _clip:Sprite;

        private var _world:Sprite;

        private var _bitmap:Bitmap;

        private var _range:Bitmap;

        private var _rangeData:BitmapData;

        private var _rangeVersion:int = -1;

        private var _dots:Shape;

        private var _marks:Shape;

        private var _portals:Shape;

        private var _pins:Sprite;

        private var _hover:Shape;

        private var _tip:Sprite;

        private var _tipText:TextField;

        private var _loading:TextField;

        private var _legend:Sprite;

        /** What the dots were drawn for: the snapshot, the filters, the zoom, the bookmarks. */
        private var _drawnKey:String = null;

        /** Player yards by x * 10000 + y, for hovering (only the ones shown). */
        private var _byKey:Object = {};

        private var _pressing:Boolean = false;

        private var _dragging:Boolean = false;

        private var _pressX:Number = 0;

        private var _pressY:Number = 0;

        private var _pressCx:Number = 0;

        private var _pressCy:Number = 0;

        /** Called when the view moves or zooms (the minimap follows it). */
        public var onViewChanged:Function = null;

        /** Called with the cell under the pointer (x, y), or (-1, -1) when it leaves (the coordinates). */
        public var onPointer:Function = null;

        /** Called with the snapshot cell of the yard under the pointer, or null (the cell information). */
        public var onHover:Function = null;

        public function IoMapLod(viewW:int, viewH:int, focus:Point, spanX:int, spanY:int, onPick:Function, zoom:int = 1, centre:Point = null) {
            super();
            this._viewW = viewW;
            this._viewH = viewH;
            this._mapH = viewH - LEGEND_H;
            this._focus = focus;
            this._spanX = spanX;
            this._spanY = spanY;
            this._onPick = onPick;
            this._zoom = zoom;
            if (centre && zoom > 1) {
                this._cx = centre.x + 0.5;
                this._cy = centre.y + 0.5;
            }
            graphics.beginFill(0x0C0605, 1);
            graphics.drawRect(0, 0, viewW, viewH);
            graphics.endFill();
            this._clip = new Sprite();
            addChild(this._clip);
            var clipMask:Shape = new Shape();
            clipMask.graphics.beginFill(0xFF0000, 1);
            clipMask.graphics.drawRect(0, 0, viewW, this._mapH);
            clipMask.graphics.endFill();
            addChild(clipMask);
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
            this._loading = IoMapUi.label("Loading the world map...", 14, 0xFFE0C0, true, viewW, TextFormatAlign.CENTER);
            this._loading.y = int(this._mapH * 0.5 - 10);
            addChild(this._loading);
            this._legend = this.makeLegend();
            this._legend.x = 0;
            this._legend.y = this._mapH + 3;
            addChild(this._legend);
            this._tip = new Sprite();
            this._tip.mouseEnabled = false;
            this._tip.mouseChildren = false;
            this._tip.visible = false;
            this._tipText = IoMapUi.label("", 11, 0xFFFFFF, false, 220);
            this._tipText.multiline = true;
            this._tipText.wordWrap = true;
            this._tipText.x = 6;
            this._tipText.y = 3;
            this._tip.addChild(this._tipText);
            addChild(this._tip);
            mouseChildren = false;
            buttonMode = true;
            addEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
            addEventListener(MouseEvent.ROLL_OUT, this.onOut);
            addEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            this.Redraw();
        }

        // ---- the view

        public function get zoom():int {
            return this._zoom;
        }

        /** The cell in the middle of the view. */
        public function get centre():Point {
            return new Point(Math.floor(this._cx), Math.floor(this._cy));
        }

        public function get centreX():Number {
            return this._cx;
        }

        public function get centreY():Number {
            return this._cy;
        }

        /** How many cells across and down the view shows. */
        public function get spanCellsX():Number {
            return this._viewW / this._scale;
        }

        public function get spanCellsY():Number {
            return this._mapH / this._scale;
        }

        /** Pixels per cell. */
        public function get scale():Number {
            return this._scale;
        }

        /** The height of the map above the legend. */
        public function get mapHeight():int {
            return this._mapH;
        }

        /**
         * Zooms to 1, 2 or 4 times the whole world. The cell at the anchor (a point in this view; the middle
         * when not given) stays where it is.
         */
        public function setZoom(zoom:int, anchorX:Number = -1, anchorY:Number = -1):void {
            var oldScale:Number = this._scale;
            var ax:Number = anchorX >= 0 ? anchorX : this._viewW * 0.5;
            var ay:Number = anchorY >= 0 ? anchorY : this._mapH * 0.5;
            var cellX:Number = this._cx + (ax - this._viewW * 0.5) / oldScale;
            var cellY:Number = this._cy + (ay - this._mapH * 0.5) / oldScale;
            this._zoom = Math.max(1, Math.min(4, zoom));
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
        public function centreOn(cellX:Number, cellY:Number):void {
            this._cx = cellX;
            this._cy = cellY;
            this.place();
        }

        /** The cell at a point of this view, or null off the world. */
        public function cellAt(localX:Number, localY:Number):Point {
            if (!IoMapSnapshot.ready || this._scale <= 0 || localY >= this._mapH) {
                return null;
            }
            var x:int = Math.floor((localX - this._world.x) / this._scale);
            var y:int = Math.floor((localY - this._world.y) / this._scale);
            if (x < 0 || y < 0 || x >= IoMapSnapshot.width || y >= IoMapSnapshot.height) {
                return null;
            }
            return new Point(x, y);
        }

        /** Keeps the world in the view (up to its edges in the middle) and puts the drawing where the centre says. */
        private function place():void {
            var w:int = IoMapSnapshot.width;
            var h:int = IoMapSnapshot.height;
            var halfW:Number = this._viewW * 0.5 / this._scale;
            var halfH:Number = this._mapH * 0.5 / this._scale;
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
        public function Tick():void {
            if (IoMapSnapshot.ready && this.drawKey() != this._drawnKey) {
                this.Redraw();
            }
        }

        private function drawKey():String {
            return IoMapSnapshot.version + "/" + IoMapFilters.version + "/" + this._zoom + "/" + MapRoom._bookmarks.length + "/" + ioBookmarkStamp() + "/" + IoUnderworld.portals.length;
        }

        /** Changes when a bookmark is added, renamed, moved or removed. */
        private static function ioBookmarkStamp():String {
            var stamp:String = "";
            for each (var bookmark:Object in MapRoom._bookmarks) {
                stamp += bookmark.name + bookmark.location.x + "," + bookmark.location.y + ";";
            }
            return stamp;
        }

        public function Redraw():void {
            var w:int = IoMapSnapshot.width;
            var h:int = IoMapSnapshot.height;
            if (!IoMapSnapshot.ready) {
                this._loading.visible = true;
                return;
            }
            this._loading.visible = false;
            this._drawnKey = this.drawKey();
            this._fit = Math.min((this._viewW - PAD * 2) / w, (this._mapH - PAD * 2) / h);
            this._scale = this._fit * this._zoom;
            this.drawTerrain(w, h);
            this.drawRange(w, h);
            this.drawDots();
            this.drawMarks();
            this.drawPortals();
            this.drawPins();
            this.place();
        }

        public function Cleanup():void {
            removeEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
            removeEventListener(MouseEvent.ROLL_OUT, this.onOut);
            removeEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            this.endPress();
            this._onPick = null;
            this.onViewChanged = null;
            this.onPointer = null;
            this.onHover = null;
            if (this._rangeData) {
                this._rangeData.dispose();
                this._rangeData = null;
            }
            if (parent) {
                parent.removeChild(this);
            }
        }

        // ---- drawing

        /** The world's terrain, one pixel per cell (the minimap shows it too); null before the snapshot. */
        public static function terrain():BitmapData {
            var w:int = IoMapSnapshot.width;
            var h:int = IoMapSnapshot.height;
            var world:String = IoMapSnapshot.world;
            var pixels:Vector.<uint> = null;
            var x:int = 0;
            var y:int = 0;
            if (!IoMapSnapshot.ready) {
                return s_terrain && s_terrainWorld == world ? s_terrain : null;
            }
            if (!s_terrain || s_terrainWorld != world) {
                pixels = new Vector.<uint>(w * h, true);
                while (x < w) {
                    y = 0;
                    while (y < h) {
                        pixels[y * w + x] = terrainColour(IoMapSnapshot.HeightAt(x, y));
                        y++;
                    }
                    x++;
                }
                if (s_terrain) {
                    s_terrain.dispose();
                }
                s_terrain = new BitmapData(w, h, false, 0);
                s_terrain.setVector(new Rectangle(0, 0, w, h), pixels);
                s_terrainWorld = world;
            }
            return s_terrain;
        }

        private function drawTerrain(w:int, h:int):void {
            this._bitmap.bitmapData = terrain();
            this._bitmap.smoothing = false;
            this._bitmap.scaleX = this._bitmap.scaleY = this._scale;
        }

        /**
         * The Inferno map's colours, taken from its tiles (hell-maproom2, 30 September: lava below 100, bone
         * 100-109, netherrack 110-169, black volcanic rock from 170), dimmed to about half so the yards' dots
         * stand out on them.
         */
        private static function terrainColour(height:int):uint {
            if (height < 0) {
                return 0x0C0605;
            }
            if (height < 80) {
                return 0x2A1208;
            }
            if (height < 90) {
                return 0x361A0B;
            }
            if (height < 100) {
                return 0x4A200A;
            }
            // bone fields (the inferno-maproom2 pack's shore tiles: dark rock under bones), the higher one sparser
            if (height < 105) {
                return 0x24211D;
            }
            if (height < 110) {
                return 0x1E1B19;
            }
            if (height < 170) {
                return mix(0x4E1810, 0x360D0A, (height - 110) / 60);
            }
            return mix(0x1B1311, 0x2D1F13, Math.min(1, (height - 170) / 40));
        }

        private static function mix(from:uint, to:uint, t:Number):uint {
            var r:int = ((from >> 16) & 255) + (((to >> 16) & 255) - ((from >> 16) & 255)) * t;
            var g:int = ((from >> 8) & 255) + (((to >> 8) & 255) - ((from >> 8) & 255)) * t;
            var b:int = (from & 255) + ((to & 255) - (from & 255)) * t;
            return (r << 16) | (g << 8) | b;
        }

        /**
         * Every cell one of your yards' flingers reaches, as MapRoomPopup highlights them on the map: the main
         * yard's range from its flinger level (as upgraded in the yard), an outpost's from its own, both with
         * the alliance war powerup. Drawn once per snapshot.
         */
        private function drawRange(w:int, h:int):void {
            var pixels:Vector.<uint> = null;
            var cell:Array = null;
            var main:Boolean = false;
            var level:int = 0;
            var range:int = 0;
            this._range.visible = IoMapFilters.range;
            if (!IoMapFilters.range) {
                return;
            }
            if (this._rangeVersion != IoMapSnapshot.version || !this._rangeData) {
                this._rangeVersion = IoMapSnapshot.version;
                pixels = new Vector.<uint>(w * h, true);
                for each (cell in IoMapSnapshot.cells) {
                    if (int(cell[2]) < 2 || int(cell[3]) != LOGIN._playerID) {
                        continue;
                    }
                    main = int(cell[2]) == 2;
                    level = int(cell[6]);
                    if (main && GLOBAL._playerFlingerLevel) {
                        level = Math.max(level, GLOBAL._playerFlingerLevel.Get());
                    }
                    if (level <= 0) {
                        continue;
                    }
                    range = int(POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [BUILDING5.getFlingerRange(level, main)]));
                    markRange(pixels, w, h, int(cell[0]), int(cell[1]), range);
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
        private static function markRange(pixels:Vector.<uint>, w:int, h:int, fromX:int, fromY:int, range:int):void {
            var q:int = fromX;
            var r:int = fromY - (fromX - (fromX & 1)) / 2;
            var dq:int = -range;
            var dr:int = 0;
            var x:int = 0;
            var y:int = 0;
            while (dq <= range) {
                dr = Math.max(-range, -dq - range);
                while (dr <= Math.min(range, -dq + range)) {
                    x = q + dq;
                    y = r + dr + (x - (x & 1)) / 2;
                    x = (x % w + w) % w;
                    y = (y % h + h) % h;
                    pixels[y * w + x] = RANGE_ARGB;
                    dr++;
                }
                dq++;
            }
        }

        private function mainRadius():Number {
            return Math.max(3, 2 + this._scale * 1.2);
        }

        private function outpostRadius():Number {
            return Math.max(1.8, 1 + this._scale * 0.7);
        }

        private function drawDots():void {
            var cell:Array = null;
            var player:Object = null;
            var pass:int = 0;
            var main:Boolean = false;
            var mine:Boolean = false;
            var relation:int = 0;
            var px:Number = NaN;
            var py:Number = NaN;
            var g:Graphics = this._dots.graphics;
            var mainR:Number = this.mainRadius();
            var outpostR:Number = this.outpostRadius();
            g.clear();
            this._byKey = {};
            // outposts first, then main yards, then the player's own on top
            while (pass < 3) {
                for each (cell in IoMapSnapshot.cells) {
                    if (int(cell[2]) < 2) {
                        continue; // wild monster yards are not on the world map
                    }
                    main = int(cell[2]) == 2;
                    mine = int(cell[3]) == LOGIN._playerID;
                    if (pass == 0 && (main || mine) || pass == 1 && (!main || mine) || pass == 2 && !mine) {
                        continue;
                    }
                    player = IoMapSnapshot.PlayerInfo(int(cell[3])) || {};
                    relation = IoMapUi.relation(int(cell[3]), int(player.alliance));
                    if (!IoMapFilters.shows(relation, main)) {
                        continue;
                    }
                    px = (int(cell[0]) + 0.5) * this._scale;
                    py = (int(cell[1]) + 0.5) * this._scale;
                    g.lineStyle(main ? 1 : 0.5, 0x000000, 0.9);
                    g.beginFill(IoMapUi.relationColour(relation), 1);
                    g.drawCircle(px, py, main ? mainR : outpostR);
                    g.endFill();
                    this._byKey[int(cell[0]) * 10000 + int(cell[1])] = cell;
                }
                pass++;
            }
        }

        private function portalRadius():Number {
            return Math.max(4, 2.6 + this._scale * 1.2);
        }

        /** The portals' overworld ends (they sit on lava, where no yard is). */
        private function drawPortals():void {
            var g:Graphics = this._portals.graphics;
            var p:Array = null;
            var r:Number = this.portalRadius();
            g.clear();
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            for each (p in IoUnderworld.portals) {
                if (!p || IoUnderworld.isUnder(int(p[0]), int(p[1]))) {
                    continue;
                }
                g.lineStyle(1.2, PORTAL_RING, 1);
                g.beginFill(PORTAL_COLOUR, 1);
                g.drawCircle((int(p[0]) + 0.5) * this._scale, (int(p[1]) + 0.5) * this._scale, r);
                g.endFill();
            }
        }

        /** The portal nearest the mouse, if the mouse is on (or next to) its dot: [overworld x, y, underworld x, y]. */
        private function portalNear():Array {
            var best:Array = null;
            var bestDistance:Number = Number.MAX_VALUE;
            var fx:Number = (mouseX - this._world.x) / this._scale - 0.5;
            var fy:Number = (mouseY - this._world.y) / this._scale - 0.5;
            var distance:Number = NaN;
            for each (var p:Array in IoUnderworld.portals) {
                if (!p) {
                    continue;
                }
                distance = Math.sqrt((int(p[0]) - fx) * (int(p[0]) - fx) + (int(p[1]) - fy) * (int(p[1]) - fy)) * this._scale;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = p;
                }
            }
            return best && bestDistance <= this.portalRadius() + 5 ? best : null;
        }

        /** The part of the world the map showed before zooming out. */
        private function drawMarks():void {
            var g:Graphics = this._marks.graphics;
            g.clear();
            if (this._focus && this._zoom == 1) {
                g.lineStyle(1.5, 0xFFF0D0, 0.9);
                g.drawRect((this._focus.x - this._spanX * 0.5) * this._scale, (this._focus.y - this._spanY * 0.5) * this._scale, this._spanX * this._scale, this._spanY * this._scale);
            }
        }

        /** Bookmarks as pins; zoomed in, with their names. */
        private function drawPins():void {
            var bookmark:Object = null;
            var name:TextField = null;
            var px:Number = NaN;
            var py:Number = NaN;
            var size:Number = this._zoom >= 2 ? 16 : 12;
            while (this._pins.numChildren > 0) {
                this._pins.removeChildAt(0);
            }
            this._pins.graphics.clear();
            if (!IoMapFilters.bookmarks) {
                return;
            }
            for each (bookmark in MapRoom._bookmarks) {
                px = (int(bookmark.location.x) + 0.5) * this._scale;
                py = (int(bookmark.location.y) + 0.5) * this._scale;
                IoMapUi.pin(this._pins.graphics, px, py, IoMapUi.GOLD, size);
                if (this._zoom >= 2) {
                    name = IoMapUi.label(String(bookmark.name), 10, 0xFFF0C8, true, 160);
                    name.width = name.textWidth + 8;
                    name.x = px + size * 0.4;
                    name.y = py - size - 2;
                    this._pins.graphics.beginFill(0x180E08, 0.75);
                    this._pins.graphics.drawRoundRect(name.x - 1, name.y + 1, name.width, 15, 8, 8);
                    this._pins.graphics.endFill();
                    this._pins.addChild(name);
                }
            }
        }

        // ---- hover, drag and click

        /** The player yard nearest the mouse, within a few cells (the dots are bigger than a cell). */
        private function yardNear(at:Point):Array {
            var best:Array = null;
            var bestDistance:Number = Number.MAX_VALUE;
            var reach:int = Math.max(2, Math.ceil(6 / this._scale));
            var dx:int = -reach;
            var dy:int = 0;
            var cell:Array = null;
            var distance:Number = NaN;
            var fx:Number = (mouseX - this._world.x) / this._scale - 0.5;
            var fy:Number = (mouseY - this._world.y) / this._scale - 0.5;
            while (dx <= reach) {
                dy = -reach;
                while (dy <= reach) {
                    cell = this._byKey[(at.x + dx) * 10000 + (at.y + dy)] as Array;
                    if (cell) {
                        distance = (int(cell[0]) - fx) * (int(cell[0]) - fx) + (int(cell[1]) - fy) * (int(cell[1]) - fy);
                        // main yards win a close call
                        if (int(cell[2]) == 2) {
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

        private function onMove(e:MouseEvent):void {
            if (this._dragging) {
                return;
            }
            var at:Point = this.cellAt(mouseX, mouseY);
            var portal:Array = at ? this.portalNear() : null;
            var yard:Array = at && !portal ? this.yardNear(at) : null;
            var player:Object = null;
            var alliance:Object = null;
            var text:String = null;
            var relation:int = 0;
            var g:Graphics = this._hover.graphics;
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
                text = "<b>Portal to the " + IoUnderworld.NAME + "</b><br>" + IoMapUi.coord(int(portal[0]), int(portal[1])) + "<br>Click to go down";
                g.lineStyle(2, 0xFFFFFF, 1);
                g.drawCircle((int(portal[0]) + 0.5) * this._scale, (int(portal[1]) + 0.5) * this._scale, this.portalRadius() + 1.5);
            }
            else if (yard) {
                player = IoMapSnapshot.PlayerInfo(int(yard[3])) || {};
                alliance = int(player.alliance) ? IoMapSnapshot.AllianceInfo(int(player.alliance)) : null;
                relation = IoMapUi.relation(int(yard[3]), int(player.alliance));
                text = "<b>" + IoMapUi.escape(String(player.name || "?")) + "</b>  level " + (int(player.level) || int(yard[11])) + "<br>" + (int(yard[2]) == 2 ? "Main yard" : "Outpost") + " at " + IoMapUi.coord(int(yard[0]), int(yard[1])) + (alliance ? "<br>" + IoMapUi.escape(String(alliance.name)) + (relation == IoMapUi.YOU ? "" : " · " + IoMapUi.RELATION_NAMES[relation].toLowerCase()) : "");
                g.lineStyle(2, 0xFFFFFF, 1);
                g.drawCircle((int(yard[0]) + 0.5) * this._scale, (int(yard[1]) + 0.5) * this._scale, this.mainRadius() + 1.5);
            }
            else {
                text = IoMapUi.coord(at.x, at.y) + "<br>Click to go there";
            }
            this._tipText.htmlText = text;
            this._tipText.height = this._tipText.textHeight + 6;
            this._tipText.width = Math.min(220, this._tipText.textWidth + 8);
            this._tip.graphics.clear();
            this._tip.graphics.lineStyle(1, 0x7A4A2A, 1);
            this._tip.graphics.beginFill(0x1E100A, 0.92);
            this._tip.graphics.drawRoundRect(0, 0, this._tipText.width + 12, this._tipText.height + 6, 8, 8);
            this._tip.graphics.endFill();
            this._tip.x = Math.min(mouseX + 14, this._viewW - this._tip.width - 4);
            this._tip.y = Math.min(mouseY + 14, this._mapH - this._tip.height - 2);
            this._tip.visible = true;
        }

        private function onOut(e:MouseEvent):void {
            this._tip.visible = false;
            this._hover.graphics.clear();
            if (this.onPointer != null && !this._dragging) {
                this.onPointer(-1, -1);
            }
        }

        private function onDown(e:MouseEvent):void {
            if (!stage || mouseY >= this._mapH) {
                return;
            }
            this._pressing = true;
            this._dragging = false;
            this._pressX = mouseX;
            this._pressY = mouseY;
            this._pressCx = this._cx;
            this._pressCy = this._cy;
            stage.addEventListener(MouseEvent.MOUSE_MOVE, this.onDragMove);
            stage.addEventListener(MouseEvent.MOUSE_UP, this.onUp);
            stage.addEventListener(Event.MOUSE_LEAVE, this.onLeave);
        }

        private function onDragMove(e:MouseEvent):void {
            if (!this._pressing) {
                return;
            }
            if (!this._dragging && Point.distance(new Point(mouseX, mouseY), new Point(this._pressX, this._pressY)) > 5) {
                this._dragging = true;
                this._tip.visible = false;
                this._hover.graphics.clear();
            }
            if (this._dragging) {
                this._cx = this._pressCx - (mouseX - this._pressX) / this._scale;
                this._cy = this._pressCy - (mouseY - this._pressY) / this._scale;
                this.place();
            }
        }

        private function onUp(e:MouseEvent):void {
            var click:Boolean = this._pressing && !this._dragging;
            this.endPress();
            if (click) {
                this.pick();
            }
        }

        private function onLeave(e:Event):void {
            this.endPress();
        }

        private function endPress():void {
            this._pressing = false;
            this._dragging = false;
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onDragMove);
                stage.removeEventListener(MouseEvent.MOUSE_UP, this.onUp);
                stage.removeEventListener(Event.MOUSE_LEAVE, this.onLeave);
            }
        }

        private function pick():void {
            var at:Point = this.cellAt(mouseX, mouseY);
            var portal:Array = at ? this.portalNear() : null;
            var yard:Array = at && !portal ? this.yardNear(at) : null;
            if (!at || this._onPick == null) {
                return;
            }
            SOUNDS.Play("click1");
            if (portal) {
                // through the portal: the map goes to its end in the Depths of Hell
                this._onPick(int(portal[2]), int(portal[3]));
                return;
            }
            if (yard) {
                at = new Point(int(yard[0]), int(yard[1]));
            }
            this._onPick(at.x, at.y);
        }

        // ---- legend

        /** Two lines, each in the middle: who (the colours), and what (the marks). */
        private function makeLegend():Sprite {
            var legend:Sprite = new Sprite();
            var who:Sprite = new Sprite();
            var what:Sprite = new Sprite();
            var g:Graphics = who.graphics;
            var x:Number = 0;
            var text:TextField = null;
            var i:int = 0;
            legend.mouseEnabled = false;
            legend.mouseChildren = false;
            legend.addChild(who);
            legend.addChild(what);
            while (i < IoMapUi.RELATION_NAMES.length) {
                g.lineStyle(1, 0x000000, 0.9);
                g.beginFill(IoMapUi.relationColour(i), 1);
                g.drawCircle(x + 4, 8, 4);
                g.endFill();
                text = legendText(IoMapUi.RELATION_NAMES[i], x + 9, 0);
                who.addChild(text);
                x += 9 + text.width + 6;
                i++;
            }
            who.x = Math.round((this._viewW - (x - 6)) * 0.5);
            g = what.graphics;
            x = 0;
            g.lineStyle(1, 0x000000, 0.9);
            g.beginFill(0xFFFFFF, 1);
            g.drawCircle(x + 5, 23, 5);
            g.endFill();
            text = legendText("Main yard", x + 13, 15);
            what.addChild(text);
            x += 13 + text.width + 8;
            g.lineStyle(0.5, 0x000000, 0.9);
            g.beginFill(0xFFFFFF, 1);
            g.drawCircle(x + 3, 23, 2.5);
            g.endFill();
            text = legendText("Outpost", x + 8, 15);
            what.addChild(text);
            x += 8 + text.width + 8;
            g.lineStyle();
            g.beginFill(RANGE_ARGB & 0xFFFFFF, 0.55);
            g.drawRect(x, 18, 12, 10);
            g.endFill();
            text = legendText("Your flinger range", x + 16, 15);
            what.addChild(text);
            x += 16 + text.width + 8;
            IoMapUi.pin(g, x + 5, 29, IoMapUi.GOLD, 12);
            text = legendText("Bookmark", x + 12, 15);
            what.addChild(text);
            x += 12 + text.width + 8;
            if (GLOBAL.INFERNO_ONLY) {
                g.lineStyle(1.2, PORTAL_RING, 1);
                g.beginFill(PORTAL_COLOUR, 1);
                g.drawCircle(x + 4, 23, 4);
                g.endFill();
                text = legendText("Portal to the " + IoUnderworld.NAME, x + 11, 15);
                what.addChild(text);
                x += 11 + text.width;
            }
            what.x = Math.round((this._viewW - x) * 0.5);
            return legend;
        }

        private static function legendText(value:String, x:Number, y:Number):TextField {
            var text:TextField = IoMapUi.label(value, 10, 0xE8D8C8, false, 160);
            text.x = x;
            text.y = y;
            text.width = text.textWidth + 6;
            return text;
        }
    }
}
