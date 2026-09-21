package com.monsters.kits {
    import com.cc.utils.SecNum;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;

    /**
     * Devil outpost kits (inferno-only builds).
     *
     * The three Map Room 2 starter kits are hand-placed overworld layouts. Rather than
     * re-authoring ~450 building positions, each kit is converted when it is used: overworld
     * defences become their Inferno counterparts, levels are clamped to what the Inferno prop
     * table supports, and buildings a devil outpost cannot own are left out. The mapping
     * mirrors server/src/game-data/tribes/devil/devilify.ts so kits and devil tribes match.
     *
     * Prices are in bone / coal / sulfur (r1-r3) plus the shiny buy-out, per kit 1-3.
     */
    public class InfernoKits {

        /** Overworld building id -> Inferno building id. 0 removes the building from the kit. */
        private static const DEVIL_BUILDING:Object = {
                15: 128,  // Housing        -> Compound
                16: 0,    // HCC            -> (not available in the Inferno)
                18: 17,   // Stone blocks   -> Bone walls
                20: 130,  // Cannon tower   -> Inferno cannon tower
                22: 0,    // Monster bunker -> (the Compound is the Inferno bunker)
                23: 129,  // Laser tower    -> Quake tower
                25: 132,  // Tesla tower    -> Magma tower
                115: 132, // Aerial defense -> Magma tower
                117: 24,  // Heavy trap     -> Booby trap
                118: 129  // Railgun        -> Quake tower
            };

        /** [bone, coal, sulfur, shiny] for the Regular, Mega and Ultra kits. Tune freely. */
        private static const PRICES:Array = [
                [3000000, 3000000, 1500000, 300],
                [12000000, 12000000, 6000000, 600],
                [50000000, 50000000, 25000000, 1200]
            ];

        /** Kits per page of the popup (its art has three columns) and how many slots exist. */
        public static const PER_PAGE:int = 3;

        public static const MAX_KITS:int = 6;

        /**
         * Custom kits made from real outposts with the server's export-kits command, downloaded
         * from <assets>/kits/inferno-kits.json. Index 0 is kit 1. A slot may be null (not made yet).
         * While this is null the three converted stock kits are used instead.
         */
        private static var _custom:Array = null;

        private static var _version:String = "0";

        private static var _loading:Boolean = false;

        private static var _waiting:Array = [];

        public function InfernoKits() {
            super();
        }

        /**
         * The kits built into the client (InfernoKitData) are the starting point, so the popup is right
         * from its first frame and keeps working when a server serves no kit file at all.
         */
        private static function useBuiltIn():void {
            var data:Object = null;
            if (_custom) {
                return;
            }
            try {
                data = JSON.parse(InfernoKitData.JSON_TEXT);
                if (data && data.kits is Array && hasAny(data.kits as Array)) {
                    _custom = data.kits as Array;
                    _version = "b" + InfernoKitData.VERSION;
                }
            }
            catch (err:Error) {
                LOGGER.Log("err", "InfernoKits: built-in kits could not be read: " + err.message);
            }
        }

        /** Downloads the server's kits (every time, they can change while the server runs), then calls back. */
        public static function load(onDone:Function):void {
            var loader:URLLoader = null;
            var finish:Function = null;
            useBuiltIn();
            _waiting.push(onDone);
            if (_loading) {
                return;
            }
            _loading = true;
            finish = function(e:Event):void {
                var data:Object = null;
                var callback:Function = null;
                var pending:Array = _waiting;
                _waiting = [];
                _loading = false;
                if (e.type == Event.COMPLETE) {
                    try {
                        data = JSON.parse(String(loader.data));
                        if (data && data.kits is Array && hasAny(data.kits as Array)) {
                            _custom = data.kits as Array;
                            _version = String(data.version);
                        }
                    }
                    catch (err:Error) {
                        LOGGER.Log("err", "InfernoKits: inferno-kits.json could not be read: " + err.message);
                    }
                }
                for each (callback in pending) {
                    callback();
                }
            };
            loader = new URLLoader();
            loader.addEventListener(Event.COMPLETE, finish);
            loader.addEventListener(IOErrorEvent.IO_ERROR, finish);
            loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, finish);
            loader.load(new URLRequest(GLOBAL._storageURL + "kits/inferno-kits.json?t=" + new Date().time));
        }

        private static function hasAny(kits:Array):Boolean {
            var kit:Object = null;
            for each (kit in kits) {
                if (kit && kit.buildings) {
                    return true;
                }
            }
            return false;
        }

        public static function get usingCustom():Boolean {
            useBuiltIn();
            return _custom != null;
        }

        /** Number of pages the popup needs: the page of the highest filled slot. */
        public static function get pageCount():int {
            var last:int = 0;
            var i:int = 0;
            useBuiltIn();
            if (!_custom) {
                return GLOBAL.kitPagingTest ? 2 : 1;
            }
            while (i < _custom.length && i < MAX_KITS) {
                if (_custom[i] && _custom[i].buildings) {
                    last = i;
                }
                i++;
            }
            return int(last / PER_PAGE) + 1;
        }

        /** kitID is 1-based. */
        public static function hasKit(kitID:int):Boolean {
            useBuiltIn();
            if (!_custom) {
                return kitID >= 1 && kitID <= (GLOBAL.kitPagingTest ? MAX_KITS : 3);
            }
            return kitID >= 1 && kitID <= _custom.length && _custom[kitID - 1] && _custom[kitID - 1].buildings;
        }

        /** Which of the three stock kits a slot shows while there are no custom kits (4-6 repeat 1-3). */
        public static function stockId(kitID:int):int {
            return ((Math.max(1, kitID) - 1) % 3) + 1;
        }

        public static function kitName(kitID:int):String {
            if (_custom && hasKit(kitID) && _custom[kitID - 1].name) {
                return String(_custom[kitID - 1].name);
            }
            return KEYS.Get(["str_regularkit", "str_megakit", "str_ultrakit"][stockId(kitID) - 1]) + (kitID > 3 ? " (page 2 test)" : "");
        }

        public static function thumbPath(kitID:int):String {
            return _custom ? "kits/kit-" + kitID + ".png?v=" + _version : "ui/prefab-" + (stockId(kitID) + 1) + ".v5.jpg";
        }

        public static function largePath(kitID:int):String {
            return _custom ? "kits/kit-" + kitID + "-large.png?v=" + _version : "ui/prefab-large-" + (stockId(kitID) + 1) + ".v5.jpg";
        }

        /** The rows of the comparison table under the kits: label, then the building ids counted in it. */
        private static const ROWS:Array = [
                ["Sharpshooter/Blast", [21, 130]],
                ["Quake/Magma Tower", [129, 132]],
                ["Blocks", [17]],
                ["Booby Traps", [24]],
                ["Compound", [128]],
                ["Incubators", [13]],
                ["Hatchery CC", [16]],
                ["Monster Juicer", [9]],
                ["Harvesters", [1, 2, 3, 4]],
                ["Flinger", [5]]
            ];

        /** Left column of the comparison table. One line per row, to line up with contentsText(). */
        public static function rowLabels():String {
            var row:Array = null;
            var lines:Array = [];
            for each (row in ROWS) {
                lines.push(row[0]);
            }
            return "<b>" + lines.join("<br>") + "</b>";
        }

        /**
         * What a kit really contains, counted from its building list: "4x Level 5", "6x Level 3-5",
         * "Level 2" for a single building, "Yes" for one that has no levels worth showing, a red x for none.
         */
        public static function contentsText(buildings:Object):String {
            var row:Array = null;
            var building:Object = null;
            var count:int = 0;
            var low:int = 0;
            var high:int = 0;
            var level:int = 0;
            var lines:Array = [];
            for each (row in ROWS) {
                count = 0;
                low = int.MAX_VALUE;
                high = 0;
                for each (building in buildings) {
                    if ((row[1] as Array).indexOf(int(building.t)) == -1) {
                        continue;
                    }
                    level = Math.max(1, int(building.prefab ? building.prefab : building.l));
                    low = Math.min(low, level);
                    high = Math.max(high, level);
                    count++;
                }
                if (count == 0) {
                    lines.push("<font color=\"#FF0000\">x</font>");
                }
                else if ((row[1] as Array)[0] == 16) {
                    lines.push("Yes");
                }
                else {
                    lines.push((count > 1 ? count + "x " : "") + "Level " + low + (high > low ? "-" + high : ""));
                }
            }
            return "<b>" + lines.join("<br>") + "</b>";
        }

        /** A fresh copy of a custom kit's buildings (placing a kit edits the objects it is given). */
        public static function customBuildings(kitID:int):Object {
            var key:String = null;
            var field:String = null;
            var copy:Object = null;
            var result:Object = {};
            var source:Object = _custom[kitID - 1].buildings;
            for (key in source) {
                copy = {};
                for (field in source[key]) {
                    copy[field] = source[key][field];
                }
                result[key] = copy;
            }
            return result;
        }

        /**
         * [r1, r2, r3, shiny] for a custom kit. A price object in the file wins; "auto" adds up what
         * every building costs to build and upgrade to its kit level (magma is left out, like the
         * stock kits) and prices the shiny buy-out with the stock kit formula.
         */
        public static function customCosts(kitID:int):Array {
            var building:Object = null;
            var props:Object = null;
            var cost:Object = null;
            var level:int = 0;
            var total:Array = [0, 0, 0];
            var price:Object = _custom[kitID - 1].price;
            if (price && !(price is String)) {
                return [new SecNum(int(price.r1)), new SecNum(int(price.r2)), new SecNum(int(price.r3)), new SecNum(int(price.shiny))];
            }
            for each (building in _custom[kitID - 1].buildings) {
                // The outpost hall is already standing when a kit is bought.
                props = int(building.t) == 112 ? null : GLOBAL._buildingProps[int(building.t) - 1];
                if (!props || !props.costs) {
                    continue;
                }
                level = 0;
                while (level < Math.max(1, int(building.prefab)) && level < props.costs.length) {
                    cost = props.costs[level];
                    total[0] += cost.r1.Get();
                    total[1] += cost.r2.Get();
                    total[2] += cost.r3.Get();
                    level++;
                }
            }
            return [new SecNum(total[0]), new SecNum(total[1]), new SecNum(total[2]), new SecNum(Math.max(1, Math.ceil(Math.sqrt((total[0] + total[1] + total[2]) / 2) * 0.75)))];
        }

        private static function clampLevel(type:int, level:int):int {
            var props:Object = GLOBAL._buildingProps[type - 1];
            var max:int = props && props.hp ? int(props.hp.length) : 0;
            if (max <= 0) {
                return level;
            }
            return Math.max(1, Math.min(level, max));
        }

        /** Returns a converted copy of a kit's building list. */
        public static function convert(build:Object):Object {
            var key:String = null;
            var field:String = null;
            var source:Object = null;
            var building:Object = null;
            var type:int = 0;
            var result:Object = {};
            for (key in build) {
                source = build[key];
                type = int(source.t);
                if (DEVIL_BUILDING.hasOwnProperty(type)) {
                    type = int(DEVIL_BUILDING[type]);
                }
                if (type == 0) {
                    continue;
                }
                building = {};
                for (field in source) {
                    building[field] = source[field];
                }
                building.t = type;
                delete building.fort;
                if (building.hasOwnProperty("prefab")) {
                    building.prefab = clampLevel(type, int(building.prefab));
                }
                if (building.hasOwnProperty("l")) {
                    building.l = clampLevel(type, int(building.l));
                }
                result[key] = building;
            }
            return result;
        }

        /** Costs array in the shape popup_prefab expects: [r1, r2, r3, shiny] as SecNums. */
        public static function costs(kitID:int):Array {
            var price:Array = PRICES[Math.max(0, Math.min(kitID - 1, PRICES.length - 1))];
            return [new SecNum(price[0]), new SecNum(price[1]), new SecNum(price[2]), new SecNum(price[3])];
        }
    }
}
