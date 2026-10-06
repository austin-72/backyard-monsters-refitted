package com.monsters.maproom_advanced {
    import com.monsters.display.ImageCache;
    import com.monsters.maproom_advanced.hellmap.*;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.MovieClip;
    import flash.events.IOErrorEvent;
    import flash.geom.Point;

    /**
     * Inferno-only: the Underworld, called the Depths of Hell in the game (the user's name, 4 October; the code
     * keeps "underworld") (server: services/maproom/v2/underworld.ts, config/UnderworldConfig.ts).
     *
     * A 10 x 10 layer of the map below the Inferno. Its cells are in the same world as the overworld's, at x and y
     * 500-509, so taking them over, their outposts and attacks work as anywhere. The map shows one layer at a time:
     * it shows the underworld when it goes to a cell there (MapRoomPopup.GenerateCells: a portal, an outpost there
     * from the Outposts list, a link in chat), and the overworld again when it goes to one up here (Home...). While
     * it shows the underworld the map is 1000 cells wide (nothing wraps: around the island is lava, never asked for).
     *
     * Portals sit on lava at the centres of the world's biggest lava pools (io_portal on both ends' cells: [number,
     * overworld x, y, underworld x, y]). Range through them (ioreach tells which of the player's yards reach what):
     *  - in: an overworld yard with a portal within its Flinger range reaches the underworld cells next to its end;
     *  - in the underworld: an outpost there has no Flinger and reaches the cells next to it (range 1, no Declare War);
     *  - out: an underworld outpost next to a portal reaches the overworld cells within 5 of the portal.
     * Underworld takeovers cost twice as much (PopupTakeover).
     */
    public class IoUnderworld {

        /** The underworld's top left cell and size (the server's; getarea's io_under says so). */
        public static var origin:int = 500;

        public static var size:int = 10;

        /** An underworld outpost's range, and how far out of a portal an attack can go. */
        public static var outpostRange:int = 1;

        public static var exitRange:int = 5;

        /** How many times as much a takeover in the underworld costs. */
        public static var costMultiplier:int = 2;

        /** Every portal: [overworld x, y, underworld x, y]. */
        public static var portals:Array = [];

        /** The map is showing the underworld. */
        internal static var under:Boolean = false;

        /** The map's width and height while it shows the underworld (no wrapping: the island is in the middle). */
        private static const UNDER_MAP:int = 1000;

        private static var _overWidth:int = 400;

        private static var _overHeight:int = 400;

        /**
         * Around the island: lava, the same object for every cell. At the island's own level (125) and drawn with the
         * Depths' lava picture (depthsGround), so the lava sea and the lava between the platforms are one surface.
         */
        private static const VOID:Object = {"i": 125, "io_void": 1};

        /** What the player's yards reach through the portals (ioreach), and when it came. */
        private static var _reach:Object = null;

        private static var _reachAt:int = 0;

        private static var _reachBusy:Boolean = false;

        /** The yards ioreach sent, made into map cells (by baseid): never on screen (the other layer). */
        private static var _reachCells:Object = {};

        private static const PORTAL_ICON:String = "ioPortal";

        public function IoUnderworld() {
            super();
        }

        public static function isUnder(cellX:int, cellY:int):Boolean {
            return cellX >= origin && cellY >= origin && cellX < origin + size && cellY < origin + size;
        }

        /** Is this zone (its top left cell) the underworld's? */
        internal static function isUnderZone(zone:Point):Boolean {
            return zone && zone.x == origin && zone.y == origin;
        }

        /** A cell of the map outside the island while the map shows the underworld: lava, never asked for. */
        internal static function isVoid(cellX:int, cellY:int):Boolean {
            return under && !isUnder(cellX, cellY);
        }

        internal static function get voidCell():Object {
            return VOID;
        }

        /** What the game calls the underworld. */
        public static const NAME:String = "Depths of Hell";

        /** The Depths' own numbers for a cell there: 0 to 9 each way, from 0 like the world above (0 to 399). */
        public static function label(cellX:int, cellY:int):String {
            return NAME + " " + (cellX - origin) + ", " + (cellY - origin);
        }

        /** getarea's io_under: where the underworld is and its portals. */
        internal static function setInfo(info:Object):void {
            if (!info) {
                return;
            }
            origin = int(info.o) || origin;
            size = int(info.s) || size;
            outpostRange = int(info.r) || outpostRange;
            exitRange = int(info.e) || exitRange;
            costMultiplier = int(info.k) || costMultiplier;
            if (info.p is Array) {
                setPortals(info.p as Array);
            }
        }

        /** The portals arrived (getarea, ioreach, the world snapshot's layers): the minimap shows them. */
        internal static function setPortals(list:Array):void {
            var changed:Boolean = !list || list.length != portals.length;
            portals = list || [];
            if (changed && MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
                MapRoom._mc.ioSnapshotChanged();
            }
        }

        /** The portal with an end at this cell (its number in `portals`), or -1. */
        internal static function portalIndexAt(cellX:int, cellY:int):int {
            for (var i:int = 0; i < portals.length; i++) {
                var p:Array = portals[i] as Array;
                if (p && (int(p[0]) == cellX && int(p[1]) == cellY || int(p[2]) == cellX && int(p[3]) == cellY)) {
                    return i;
                }
            }
            return -1;
        }

        // ---- which layer the map shows

        /** The map goes to a cell (MapRoomPopup.GenerateCells): it shows that cell's layer. Null: the map closes. */
        internal static function modeFor(point:Point):void {
            var want:Boolean = GLOBAL.INFERNO_ONLY && point != null && isUnder(point.x, point.y);
            if (want == under) {
                return;
            }
            if (want) {
                _overWidth = MapRoom._mapWidth > 0 && MapRoom._mapWidth != UNDER_MAP ? MapRoom._mapWidth : 400;
                _overHeight = MapRoom._mapHeight > 0 && MapRoom._mapHeight != UNDER_MAP ? MapRoom._mapHeight : 400;
                MapRoom._mapWidth = UNDER_MAP;
                MapRoom._mapHeight = UNDER_MAP;
            }
            else {
                MapRoom._mapWidth = _overWidth;
                MapRoom._mapHeight = _overHeight;
            }
            under = want;
            if (want) {
                requestReach();
            }
        }

        // ---- range through the portals

        private static function declareWarBonus():int {
            return POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL") ? int(POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0])) : 0;
        }

        /** Asks what the player's yards reach (at most every 20 seconds unless forced: after an attack, the map opening). */
        internal static function requestReach(force:Boolean = false):void {
            if (!GLOBAL.INFERNO_ONLY || _reachBusy || MapRoom._viewOnly) {
                return;
            }
            if (!force && _reach && GLOBAL.Timestamp() - _reachAt < 20) {
                return;
            }
            _reachBusy = true;
            new URLLoaderApi().load(GLOBAL._mapURL + "ioreach", [["v", 1]], function(response:Object):void {
                    var bid:String = null;
                    var entry:Object = null;
                    var cell:MapRoomCell = null;
                    var keep:MapRoomCell = null;
                    _reachBusy = false;
                    if (!response || (response.error !== 0 && response.error !== "0")) {
                        return;
                    }
                    if (response.portals is Array) {
                        setPortals(response.portals as Array);
                    }
                    origin = int(response.origin) || origin;
                    size = int(response.size) || size;
                    _reachCells = {};
                    for (bid in response.cells) {
                        entry = response.cells[bid];
                        if (!entry || !entry.data) {
                            continue;
                        }
                        cell = new MapRoomCell();
                        cell.X = int(entry.x);
                        cell.Y = int(entry.y);
                        keep = MapRoom._homeCell;
                        cell.Setup(entry.data);
                        if (keep) {
                            MapRoom._homeCell = keep; // (a copy of the main yard's cell is not the map's)
                        }
                        _reachCells[bid] = cell;
                    }
                    _reach = response;
                    _reachAt = GLOBAL.Timestamp();
                    if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
                        MapRoom._mc.ioReachArrived();
                    }
                }, function(e:IOErrorEvent):void {
                    _reachBusy = false;
                });
        }

        /** The map has closed or an attack began: what was reached is asked for again next time. */
        internal static function forgetReach():void {
            _reach = null;
            _reachCells = {};
        }

        /** Does reaching this cell take the portals (it is in the underworld, or near a portal up here)? */
        internal static function needsReach(cellX:int, cellY:int):Boolean {
            if (isUnder(cellX, cellY)) {
                return true;
            }
            for each (var p:Array in portals) {
                if (hexDistanceWrapped(int(p[0]), int(p[1]), cellX, cellY) <= exitRange) {
                    return true;
                }
            }
            return false;
        }

        /** Still waiting for ioreach for a cell that needs it (an attack popup waits a moment, as for yards off screen). */
        internal static function reachPending(cellX:int, cellY:int):Boolean {
            if (!GLOBAL.INFERNO_ONLY || !needsReach(cellX, cellY)) {
                return false;
            }
            requestReach();
            return _reach == null;
        }

        /**
         * The yards that can attack a cell (MapRoomPopup.GetCellsInRange's, for PopupInfoEnemy and PopupAttackA), with
         * the underworld's rules: an underworld outpost's range is 1 whatever Declare War says (its distance is made
         * longer by the bonus the checks add), and the yards that reach the cell through a portal are added, each at
         * a distance the checks (range + Declare War >= distance) and the attack's save (BASE) count it in at.
         */
        internal static function withReach(cells:Vector.<CellData>, cellX:int, cellY:int):Vector.<CellData> {
            var out:Vector.<CellData> = new Vector.<CellData>();
            var bonus:int = declareWarBonus();
            var cd:CellData = null;
            var best:Object = {};
            var order:Array = [];
            var i:int = 0;
            var p:Array = null;
            var source:Array = null;
            var cell:MapRoomCell = null;
            var d:int = 0;
            var bid:String = null;
            for each (cd in cells) {
                if (cd && cd.cell && cd.cell._ioUnder) {
                    out.push(new CellData(cd.cell, cd.range + bonus));
                }
                else {
                    out.push(cd);
                }
            }
            if (!_reach) {
                if (needsReach(cellX, cellY)) {
                    requestReach();
                }
                return out;
            }
            requestReach(); // (fresh enough, or asked for again)
            var into:Boolean = isUnder(cellX, cellY);
            for (i = 0; i < portals.length; i++) {
                p = portals[i] as Array;
                var lists:Object = into ? _reach.entry : _reach.exit;
                var list:Array = lists ? lists[String(i)] as Array : null;
                if (!p || !list) {
                    continue;
                }
                if (into ? hexDistance(int(p[2]), int(p[3]), cellX, cellY) > 1 : hexDistanceWrapped(int(p[0]), int(p[1]), cellX, cellY) > exitRange) {
                    continue;
                }
                for each (source in list) {
                    bid = String(source[0]);
                    cell = _reachCells[bid] as MapRoomCell;
                    if (!cell) {
                        continue;
                    }
                    d = into ? int(source[1]) : int(source[1]) + bonus;
                    if (best[bid] == null) {
                        order.push(bid);
                        best[bid] = d;
                    }
                    else {
                        best[bid] = Math.min(int(best[bid]), d);
                    }
                }
            }
            for each (bid in order) {
                out.push(new CellData(_reachCells[bid] as MapRoomCell, int(best[bid])));
            }
            return out;
        }

        /** Is this portal opened from above: one of the player's overworld yards has it in range? */
        internal static function entryOpen(index:int):Boolean {
            var list:Array = _reach && _reach.entry ? _reach.entry[String(index)] as Array : null;
            var bonus:int = declareWarBonus();
            for each (var source:Array in list) {
                var cell:MapRoomCell = _reachCells[String(source[0])] as MapRoomCell;
                if (cell && cell._flingerRange && cell._flingerRange.Get() > 0 && cell._flingerRange.Get() + bonus >= int(source[1])) {
                    return true;
                }
            }
            return false;
        }

        /** Is this portal held from below: an underworld outpost of the player is next to its end? */
        internal static function exitOpen(index:int):Boolean {
            var list:Array = _reach && _reach.exit ? _reach.exit[String(index)] as Array : null;
            return list != null && list.length > 0;
        }

        /** Does the player have an outpost in the underworld? */
        internal static function hasOutpostBelow():Boolean {
            for each (var p:Point in GLOBAL._mapOutpost) {
                if (p && isUnder(p.x, p.y)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * The range the map shows through the portals, on the layer it shows: [x, y, range] for each (the cells
         * next to an underworld portal opened from above; the cells within 5 of an overworld portal held from below).
         */
        internal static function highlights():Array {
            var out:Array = [];
            if (!_reach) {
                return out;
            }
            for (var i:int = 0; i < portals.length; i++) {
                var p:Array = portals[i] as Array;
                if (under && entryOpen(i)) {
                    out.push([int(p[2]), int(p[3]), 1]);
                }
                else if (!under && exitOpen(i)) {
                    out.push([int(p[0]), int(p[1]), exitRange]);
                }
            }
            return out;
        }

        // ---- distances (the map's hex cells: odd columns half a cell down)

        internal static function hexDistance(x1:int, y1:int, x2:int, y2:int):int {
            var q1:int = x1;
            var r1:int = y1 - (x1 - (x1 & 1)) / 2;
            var q2:int = x2;
            var r2:int = y2 - (x2 - (x2 & 1)) / 2;
            var dq:int = q2 - q1;
            var dr:int = r2 - r1;
            return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
        }

        /** Across the overworld's wrapped edges (its width is even: columns keep their parity). */
        internal static function hexDistanceWrapped(x1:int, y1:int, x2:int, y2:int):int {
            var w:int = under ? _overWidth : MapRoom._mapWidth;
            var h:int = under ? _overHeight : MapRoom._mapHeight;
            var best:int = int.MAX_VALUE;
            for (var sx:int = -1; sx <= 1; sx++) {
                for (var sy:int = -1; sy <= 1; sy++) {
                    best = Math.min(best, hexDistance(x1, y1, x2 + sx * w, y2 + sy * h));
                }
            }
            return best;
        }

        // ---- the Depths' own ground (the user's, 4 October)

        /**
         * A cell of the Depths of Hell drawn its own way: a stone platform (one of four pictures, as no cell of the
         * world above looks) standing in lava, with a small bridge to every neighbour on the island, so the cells
         * stand apart with lava between them. Four layers (hellmap/DepthsTile_*: one of 9 lavas, a bridge half towards each
         * neighbour, the platform) made into one picture per variant and set of neighbours, kept. Portals stand on
         * a platform like any other cell (the server gives them the island's height).
         */
        private static var _depthsCache:Object = {};

        private static const BRIDGES:Array = [["n", DepthsTile_bridge_n], ["ne", DepthsTile_bridge_ne], ["se", DepthsTile_bridge_se], ["s", DepthsTile_bridge_s], ["sw", DepthsTile_bridge_sw], ["nw", DepthsTile_bridge_nw]];

        private static const PLATFORMS:Array = [DepthsTile_platform_1, DepthsTile_platform_2, DepthsTile_platform_3, DepthsTile_platform_4];

        /** Every lava texture of the map (3 depths x 3 looks; the user's, 4 October), so the lava doesn't repeat. */
        private static const LAVAS:Array = [DepthsTile_lava, DepthsTile_lava_2, DepthsTile_lava_3, DepthsTile_lava_4, DepthsTile_lava_5, DepthsTile_lava_6, DepthsTile_lava_7, DepthsTile_lava_8, DepthsTile_lava_9];

        /** Which lava picture a cell has: always the same for a cell, mixed up between neighbours. */
        private static function lavaIndex(cellX:int, cellY:int):int {
            // (products kept under 2^53, so every runtime works it out the same)
            var h:uint = uint(cellX * 374761393 + cellY * 668265263);
            h = uint(uint(h ^ (h >>> 13)) % 1000003);
            h = uint(h * 2654435 + 12345);
            return int(uint(h ^ (h >>> 7)) % LAVAS.length); // (uint before %: never negative)
        }

        private static var _layers:Object = {};

        private static function layer(cls:Class):BitmapData {
            var key:String = String(cls);
            if (!_layers[key]) {
                _layers[key] = new cls() as BitmapData;
            }
            return _layers[key] as BitmapData;
        }

        /** The ground picture of a cell of the Depths (150 x 100, the map's tile size). */
        internal static function depthsGround(cellX:int, cellY:int):BitmapData {
            var lavaAt:int = lavaIndex(cellX, cellY);
            if (!isUnder(cellX, cellY)) {
                return layer(LAVAS[lavaAt] as Class); // the lava round the island: no platform, no bridges
            }
            var variant:int = HellTileVariants.variantIndex(cellX, cellY);
            var odd:int = cellX & 1;
            // neighbours on the map's hex layout (odd columns half a cell down): N, NE, SE, S, SW, NW
            var around:Array = [[cellX, cellY - 1], [cellX + 1, cellY - 1 + odd], [cellX + 1, cellY + odd], [cellX, cellY + 1], [cellX - 1, cellY + odd], [cellX - 1, cellY - 1 + odd]];
            var mask:int = 0;
            var i:int = 0;
            for (i = 0; i < 6; i++) {
                if (isUnder(int(around[i][0]), int(around[i][1]))) {
                    mask |= 1 << i;
                }
            }
            var key:int = (lavaAt * 4 + variant) * 64 + mask;
            var out:BitmapData = _depthsCache[key] as BitmapData;
            if (out) {
                return out;
            }
            var lava:BitmapData = layer(LAVAS[lavaAt] as Class);
            var origin:Point = new Point(0, 0);
            out = new BitmapData(lava.width, lava.height, true, 0);
            out.copyPixels(lava, lava.rect, origin);
            for (i = 0; i < 6; i++) {
                if (mask & (1 << i)) {
                    var bridge:BitmapData = layer(BRIDGES[i][1] as Class);
                    out.copyPixels(bridge, bridge.rect, origin, null, null, true);
                }
            }
            var platform:BitmapData = layer(PLATFORMS[variant] as Class);
            out.copyPixels(platform, platform.rect, origin, null, null, true);
            _depthsCache[key] = out;
            return out;
        }

        /** Is this map cell drawn as the Depths (the map shows them: the island, and the lava round it)? */
        internal static function drawsDepths(cellX:int, cellY:int):Boolean {
            return GLOBAL.INFERNO_ONLY && under;
        }

        // ---- the portals' picture on their cells

        /**
         * Shows a portal on a cell's tile, or takes it off (portal null): a swirl going down in the overworld, one
         * going up in the underworld (assets/worldmap/icons/io_portal_*.png).
         */
        internal static function portalIcon(tile:MovieClip, portal:Array, cellX:int, cellY:int):void {
            var existing:DisplayObject = null;
            var key:String = null;
            if (!tile) {
                return;
            }
            key = portal ? (isUnder(cellX, cellY) ? "up" : "down") : null;
            existing = tile.getChildByName(PORTAL_ICON);
            tile.ioPortalKey = key;
            if (existing && MovieClip(existing).ioKey != key) {
                tile.removeChild(existing);
                existing = null;
            }
            if (key && !existing) {
                ImageCache.GetImageWithCallBack("worldmap/icons/io_portal_" + key + ".png", portalLoaded, true, 1, "", [tile, key]);
            }
        }

        private static function portalLoaded(url:String, image:BitmapData, args:Array):void {
            var tile:MovieClip = args[0] as MovieClip;
            var key:String = args[1] as String;
            if (!tile || tile.ioPortalKey != key || tile.getChildByName(PORTAL_ICON)) {
                return;
            }
            var holder:MovieClip = new MovieClip();
            var picture:Bitmap = new Bitmap(image, "auto", true);
            holder.name = PORTAL_ICON;
            holder.ioKey = key; // MovieClip is dynamic
            holder.mouseEnabled = false;
            holder.mouseChildren = false;
            // On the middle of the tile's top (a 150 x 75 hex; the picture is 120 x 84, its opening low in it).
            picture.x = 15;
            picture.y = -18;
            if (key == "up") {
                // in the Depths, over a platform (smaller than a cell): smaller, round the same middle
                picture.scaleX = picture.scaleY = 0.75;
                picture.x = 75 - 45;
                picture.y = 24 - 31.5;
            }
            holder.addChild(picture);
            tile.addChild(holder);
        }
    }
}
