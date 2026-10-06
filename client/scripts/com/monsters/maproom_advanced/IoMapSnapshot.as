package com.monsters.maproom_advanced {
    import com.monsters.alliances.ALLIANCES;
    import flash.events.IOErrorEvent;

    /**
     * Inferno-only: the whole Map Room 2 world at once (server: /worldmapv2/mapdata,
     * services/maproom/v2/bulk/worldSnapshot.ts).
     *
     * The map used to know a cell only once getarea had answered for its 10 x 10 zone, so it opened on
     * dark placeholder tiles that filled in zone by zone. Now it asks for the world snapshot when it opens
     * and, while it is open, each time the server makes a new one (every 5 minutes): every player yard and
     * outpost with its owner, level and alliance, damaged wild monster camps, and the world's alliances. The first time for a world it also gets the
     * world's fixed layers: the terrain height and the tribe and level of every cell. With those, CellAt()
     * gives any cell of the world straight away, in the shape getarea gives it (at most 5 minutes old).
     * getarea still runs for the zones on screen and brings them up to date with what only it knows
     * (resources, monsters, invites), and its data wins over the snapshot's for its zone.
     *
     * A cell made from the snapshot carries io_snap: 1. Clicking one waits for its zone's getarea first
     * (MapRoom.ioClickWhenLoaded): the popups need its monsters and resources.
     *
     * The zoomed-out world map (IoMapLod) is drawn from this too.
     */
    public class IoMapSnapshot {

        /**
         * The server makes the snapshot on a fixed 5-minute clock and says when its next one is out
         * (`nextAt`). The map asks again a few seconds after that, and never sooner than this after the last
         * answer (seconds), however often it opens (the user's rule, 2 October).
         */
        public static const MIN_GAP:int = 300;

        /** Kept this long past its `nextAt` if no newer one comes (seconds); then the map shows what getarea says. */
        private static const GRACE:int = 300;

        private static const CODE_BASE:int = 48;

        // the world's fixed layers
        private static var _layersWorld:String = null;

        private static var _terrain:String = null;

        private static var _wild:String = null;

        private static var _tribes:Array = [];

        private static var _bidPrefix:String = "";

        private static var _height:int = 400;

        private static var _width:int = 400;

        // the snapshot
        private static var _world:String = null;

        private static var _cells:Object = {};

        private static var _cellList:Array = [];

        private static var _players:Object = {};

        private static var _alliances:Object = {};

        private static var _fetchedAt:int = 0;

        private static var _requestedAt:int = 0;

        /** When the server's next snapshot is out (server time), and when to ask for it (a few seconds after). */
        private static var _nextAt:int = 0;

        private static var _dueAt:int = 0;

        private static var _loading:Boolean = false;

        private static var _made:Object = {};

        /** Where home was when the snapshot came: a move (to another world, or within it) makes it stale. */
        private static var _homeKey:int = -1;

        /** Goes up by one every time a new snapshot arrives (the world map redraws its dots on a change). */
        public static var version:int = 0;

        public function IoMapSnapshot() {
            super();
        }

        /** The snapshot and the world's layers are here and not too old. */
        public static function get ready():Boolean {
            return _terrain != null && _world != null && _world == _layersWorld && GLOBAL.Timestamp() <= Math.max(_nextAt, _fetchedAt + MIN_GAP) + GRACE && _homeKey == HomeKey();
        }

        private static function HomeKey():int {
            return GLOBAL._mapHome ? int(GLOBAL._mapHome.x) * 10000 + int(GLOBAL._mapHome.y) : -1;
        }

        /** The world the snapshot is of. */
        public static function get world():String {
            return _world;
        }

        public static function get width():int {
            return _width;
        }

        public static function get height():int {
            return _height;
        }

        /**
         * Asks for the server's next snapshot once it is out (force: now, for another world's). The map calls
         * this every second. Never sooner than MIN_GAP after the last answer, unless home moved (perhaps to
         * another world, whose snapshot is needed).
         */
        public static function Request(force:Boolean = false):void {
            if (_loading || !GLOBAL.INFERNO_ONLY) {
                return;
            }
            var now:int = GLOBAL.Timestamp();
            if (!force) {
                if (now - _requestedAt < 10) {
                    return; // (a failed request is tried again after 10 seconds at the soonest)
                }
                if (_fetchedAt > 0 && _homeKey == HomeKey() && (now - _fetchedAt < MIN_GAP || now < _dueAt)) {
                    return;
                }
            }
            _loading = true;
            _requestedAt = now;
            var wantLayers:Boolean = _terrain == null;
            new URLLoaderApi().load(GLOBAL._mapURL + "mapdata", [["layers", wantLayers ? 1 : 0]], function(serverData:Object):void {
                    _loading = false;
                    if (!serverData || serverData.error) {
                        return;
                    }
                    Arrived(serverData);
                }, function(e:IOErrorEvent):void {
                    _loading = false;
                });
        }

        private static function Arrived(serverData:Object):void {
            var layers:Object = serverData["static"];
            var list:Array = null;
            var alliances:Array = [];
            var id:String = null;
            var cell:Array = null;
            if (layers && layers.t && layers.w) {
                _layersWorld = String(layers.worldid);
                _terrain = String(layers.t);
                _wild = String(layers.w);
                _tribes = layers.tribes is Array ? layers.tribes as Array : [];
                _bidPrefix = String(layers.bidPrefix || "");
                // the portals to the Depths of Hell (fixed for a world): the world map and the minimap show them
                if (GLOBAL.INFERNO_ONLY && layers.portals is Array && (layers.portals as Array).length) {
                    IoUnderworld.setPortals(layers.portals as Array);
                }
                _width = int(serverData.width) || 400;
                _height = int(serverData.height) || 400;
            }
            _world = String(serverData.worldid);
            if (_world != _layersWorld) {
                // Moved to another world: its layers are needed too.
                _terrain = null;
                _requestedAt = 0;
                Request(true);
                return;
            }
            _players = serverData.players || {};
            _alliances = serverData.alliances || {};
            _cells = {};
            _cellList = [];
            list = serverData.cells is Array ? serverData.cells as Array : [];
            for each (cell in list) {
                _cells[int(cell[0]) * 10000 + int(cell[1])] = cell;
                _cellList.push(cell);
            }
            _made = {};
            _fetchedAt = GLOBAL.Timestamp();
            _homeKey = HomeKey();
            // the server's next one, and a few seconds more so not everybody asks in the same second
            _nextAt = int(serverData.nextAt) > 0 ? int(serverData.nextAt) : _fetchedAt + MIN_GAP;
            _dueAt = Math.max(_nextAt, _fetchedAt + MIN_GAP) + 3 + int(Math.random() * 18);
            for (id in _alliances) {
                alliances.push({
                            "alliance_id": int(id),
                            "name": _alliances[id].name,
                            "image": _alliances[id].image,
                            "relationships": _alliances[id].relationships || {}
                        });
            }
            if (alliances.length > 0) {
                ALLIANCES.ProcessAlliances(alliances);
            }
            ++version;
            MapRoom.ioSnapshotArrived();
        }

        /** Forgets the snapshot (not the world's layers): the map shows what getarea says until the next one. */
        public static function Expire():void {
            _fetchedAt = 0;
            _requestedAt = 0;
            _made = {};
        }

        /** The terrain height of a cell (0-255; 99 and below is lava), or -1 before the layers arrive. */
        public static function HeightAt(cellX:int, cellY:int):int {
            if (_terrain == null || cellX < 0 || cellY < 0 || cellX >= _width || cellY >= _height) {
                return -1;
            }
            return _terrain.charCodeAt(cellX * _height + cellY) - CODE_BASE;
        }

        /** Player yards and outposts, and damaged camps: [x, y, base type, uid, baseid, value, flinger, catapult, damage, protected until, destroyed, level, locked, terrain height]. */
        public static function get cells():Array {
            return _cellList;
        }

        /** { name, avatar, alliance, level } of a player in the snapshot, or null. */
        public static function PlayerInfo(uid:int):Object {
            return _players[uid] || null;
        }

        /** Every player with a yard on the world: uid -> { name, avatar, alliance, level }. */
        public static function get players():Object {
            return _players;
        }

        /** A short tag for the world, put into shared locations so they are only opened on the same world. */
        public static function get worldTag():String {
            return _world ? _world.replace(/[^0-9a-zA-Z]/g, "").substr(0, 6) : "";
        }

        private static var _yardsVersion:int = -1;

        private static var _yards:Object = {};

        /**
         * A player's yards in the snapshot: { main: [x, y] or null, outposts: [[x, y], ...] } (outposts in map
         * order), or null when they have none.
         */
        public static function YardsOf(uid:int):Object {
            var cell:Array = null;
            var entry:Object = null;
            if (_yardsVersion != version) {
                _yardsVersion = version;
                _yards = {};
                for each (cell in _cellList) {
                    if (int(cell[2]) < 2) {
                        continue;
                    }
                    entry = _yards[int(cell[3])];
                    if (!entry) {
                        entry = _yards[int(cell[3])] = {"main": null, "outposts": []};
                    }
                    if (int(cell[2]) == 2) {
                        entry.main = [int(cell[0]), int(cell[1])];
                    }
                    else {
                        entry.outposts.push([int(cell[0]), int(cell[1])]);
                    }
                }
            }
            return _yards[uid] || null;
        }

        /** An alliance of the world ({ name, image, leader, members, relationships }), or null. */
        public static function AllianceInfo(id:int):Object {
            return _alliances[id] || null;
        }

        /** A cell in the shape getarea sends it, from the snapshot; null while there is none. The same object until the next snapshot. */
        public static function CellAt(cellX:int, cellY:int):Object {
            if (!ready) {
                return null;
            }
            var key:int = cellX * 10000 + cellY;
            var made:Object = _made[key];
            if (made) {
                return made;
            }
            made = Make(cellX, cellY, key);
            if (made) {
                _made[key] = made;
            }
            return made;
        }

        private static function Make(cellX:int, cellY:int, key:int):Object {
            var height:int = HeightAt(cellX, cellY);
            var entry:Array = null;
            var player:Object = null;
            var now:int = 0;
            var protectedUntil:int = 0;
            var damage:int = 0;
            var code:int = 0;
            var tribe:int = 0;
            if (height < 0) {
                return null;
            }
            entry = _cells[key] as Array;
            if (entry && entry.length > 13) {
                height = int(entry[13]); // a stored cell keeps the height it was stored with (as getarea says)
            }
            if (height <= 99) {
                return {"i": height, "io_snap": 1};
            }
            if (entry && int(entry[2]) >= 2) {
                player = _players[int(entry[3])] || {};
                now = GLOBAL.Timestamp();
                protectedUntil = int(entry[9]);
                damage = int(entry[8]);
                if (protectedUntil > 0 && protectedUntil <= now) {
                    damage = 0; // protection ran out: the yard has been repaired (as getarea says)
                }
                var mine:Boolean = int(entry[3]) == LOGIN._playerID;
                return {
                        "uid": int(entry[3]),
                        "b": int(entry[2]),
                        "pi": 0,
                        "bid": String(entry[4]),
                        "aid": int(player.alliance),
                        "i": height,
                        "v": Number(entry[5]),
                        "mine": mine ? 1 : 0,
                        "f": int(entry[6]),
                        "c": int(entry[7]),
                        "n": String(player.name || ""),
                        "fr": 0,
                        "p": protectedUntil > now ? 1 : 0,
                        "l": int(entry[11]),
                        "d": damage >= 90 ? 1 : 0,
                        "lo": mine ? 0 : int(entry[12]),
                        "dm": damage,
                        "pic_square": player.avatar,
                        "io_snap": 1
                    };
            }
            code = _wild.charCodeAt(cellX * _height + cellY) - CODE_BASE;
            tribe = code >> 7;
            return {
                    "uid": 0,
                    "b": 1,
                    "i": height,
                    "bid": _bidPrefix + Pad3(cellX) + Pad3(cellY),
                    "n": String(_tribes[tribe] || ""),
                    "l": code & 127,
                    "dm": entry ? int(entry[8]) : 0,
                    "d": entry ? int(entry[10]) : 0,
                    "io_snap": 1
                };
        }

        private static function Pad3(value:int):String {
            var text:String = String(value);
            while (text.length < 3) {
                text = "0" + text;
            }
            return text;
        }
    }
}
