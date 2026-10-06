package com.monsters.pets {
    import com.monsters.casino.CASINO;
    import flash.events.IOErrorEvent;
    import flash.geom.Point;

    /**
     * Inferno-only: pets (server: config/PetsConfig.ts, services/pets/pets.ts). Half-size copies of the Inferno's
     * monsters wandering a main yard (IoPet), just for looks: bought with Shiny in the Buildings menu
     * (Decorations, the Pets tab: IoPetsPanel), at most five out in the yard at once, the rest in storage, and at
     * most five of one monster. Hell Freezes Over's monsters only for a player who has won the event (the server's
     * list). A pet can have a name (pets/name), shown over it. Never in an outpost. An attacker or a visitor sees
     * the yard's pets too; nothing fights them.
     *
     * The yard's pets come with its load (io_pets: [[id, monster, out, name], ...], all of them for the owner, the ones
     * out for anyone else); BASE gives them here (setData) and, once the yard is built, Setup puts the ones that
     * are out in it. Buying, bringing out and putting away go to the server (pets/buy, pets/place), whose answer
     * is the pets as they are now: the yard is brought up to date with it (apply).
     */
    public class IoPets {

        /** Shiny for one pet, and how many can be out (the server's petsConfig; sent again with each answer). */
        public static var price:int = 500;

        public static var maxOut:int = 5;

        /** How many of one monster a player can have, and how long a pet's name can be. */
        public static var perKind:int = 5;

        public static var nameLength:int = 16;

        /**
         * The monsters this player can have as pets (every Inferno monster but the champions; Hell Freezes Over's
         * once the event is won): the server's list, with the yard's load (io_petinfo) and every answer.
         */
        public static var monsters:Array = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC12", "IC14", "IC15", "IC20"];

        /** The loaded yard's pets: [[id, monster, out], ...], or null (not a main yard, or none sent). */
        private static var _data:Array = null;

        /** The pets walking about the yard now. */
        private static var _walking:Array = [];

        public function IoPets() {
            super();
        }

        /** The yard's pets, from its load (BASE). */
        public static function setData(raw:*):void {
            _data = raw is Array ? (raw as Array).concat() : null;
        }

        /** The player's pets, for the Pets tab: [[id, monster, out], ...] (empty outside their main yard). */
        public static function get pets():Array {
            return ownYard() && _data ? _data : [];
        }

        public static function outCount():int {
            var n:int = 0;
            for each (var p:Array in pets) {
                if (int(p[2])) {
                    n++;
                }
            }
            return n;
        }

        /** The player's own main yard, built (where pets can be bought, brought out and put away). */
        public static function ownYard():Boolean {
            return GLOBAL.INFERNO_ONLY && BASE.isMainYard && !BASE.isOutpost && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
        }

        /** Once the yard is built (BASE, after the warts): the pets that are out come out into it. */
        public static function Setup():void {
            Clear();
            if (!GLOBAL.INFERNO_ONLY || !_data || BASE.isOutpost || GLOBAL.ioDesignMode()) {
                return;
            }
            sync();
        }

        /** Puts in the yard the pets that are out and takes away those that aren't. */
        private static function sync():void {
            if (!MAP._BUILDINGTOPS) {
                return;
            }
            var want:Object = {};
            var names:Object = {};
            var p:Array = null;
            for each (p in _data || []) {
                if (int(p[2])) {
                    want[int(p[0])] = String(p[1]);
                    names[int(p[0])] = p.length > 3 && p[3] ? String(p[3]) : "";
                }
            }
            var keep:Array = [];
            for each (var pet:IoPet in _walking) {
                if (want[pet.petId] == pet.monster) {
                    pet.setName(names[pet.petId]);
                    keep.push(pet);
                    delete want[pet.petId];
                }
                else {
                    pet.clear();
                }
            }
            _walking = keep;
            for (var id:String in want) {
                var at:Point = freeSpot();
                if (!at) {
                    continue;
                }
                var made:IoPet = new IoPet(int(id), String(want[id]), at, names[id]);
                MAP._BUILDINGTOPS.addChild(made);
                _walking.push(made);
            }
        }

        /** Every game step (GLOBAL, with the workers). */
        public static function Tick():void {
            if (!_walking.length) {
                return;
            }
            for each (var pet:IoPet in _walking) {
                pet.tick();
            }
        }

        /** The yard is going (BASE.Cleanup). */
        public static function Clear():void {
            for each (var pet:IoPet in _walking) {
                pet.clear();
            }
            _walking = [];
        }

        /** The pets walking about now (tests). */
        public static function get walking():Array {
            return _walking;
        }

        // ---- where they can go

        /** A point of the yard (its own units) that a pet may stand on: inside the edge, on no building. */
        public static function free(x:Number, y:Number):Boolean {
            var halfW:Number = GLOBAL._mapWidth * 0.5 - 15;
            var halfH:Number = GLOBAL._mapHeight * 0.5 - 15;
            if (x < -halfW || x > halfW || y < -halfH || y > halfH) {
                return false;
            }
            return GRID.Blocked(new Point(x, y), true) == 0;
        }

        /** A straight walk from one point to another that crosses no building and stays in the yard. */
        public static function clearLine(x0:Number, y0:Number, x1:Number, y1:Number):Boolean {
            var dx:Number = x1 - x0;
            var dy:Number = y1 - y0;
            var steps:int = Math.max(1, int(Math.sqrt(dx * dx + dy * dy) / 8));
            for (var i:int = 1; i <= steps; i++) {
                if (!free(x0 + dx * i / steps, y0 + dy * i / steps)) {
                    return false;
                }
            }
            return true;
        }

        /** Somewhere free to put a pet down, or null. */
        public static function freeSpot():Point {
            for (var tries:int = 0; tries < 400; tries++) {
                var x:Number = (Math.random() - 0.5) * (GLOBAL._mapWidth - 60);
                var y:Number = (Math.random() - 0.5) * (GLOBAL._mapHeight - 60);
                if (free(x, y) && free(x + 10, y) && free(x, y + 10)) {
                    return new Point(x, y);
                }
            }
            return null;
        }

        // ---- the server

        /** Buys a pet of a monster. onDone(error or null). */
        public static function buy(monster:String, onDone:Function):void {
            call("buy", [["monster", monster]], onDone);
        }

        /** Brings a pet out into the yard (out true) or puts it in storage. onDone(error or null). */
        public static function place(id:int, out:Boolean, onDone:Function):void {
            call("place", [["id", id], ["out", out ? 1 : 0]], onDone);
        }

        /** Names a pet (an empty name takes its name away). onDone(error or null). */
        public static function name(id:int, name:String, onDone:Function):void {
            call("name", [["id", id], ["name", name]], onDone);
        }

        private static function call(path:String, params:Array, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL.serverUrl + "pets/" + path, params, function(response:Object):void {
                    if (!response) {
                        onDone("The server did not answer. Try again.");
                        return;
                    }
                    if (response.error !== 0 && response.error !== "0") {
                        onDone(String(response.error || "Something went wrong with your pets."));
                        return;
                    }
                    apply(response);
                    onDone(null);
                }, function(e:IOErrorEvent):void {
                    onDone("The server did not answer. Check your connection and try again.");
                });
        }

        /** An answer from the server: the pets as they are now (and the Shiny left after a purchase). */
        public static function apply(response:Object):void {
            if (response.price) {
                price = int(response.price);
            }
            if (response.maxOut) {
                maxOut = int(response.maxOut);
            }
            if (response.perKind) {
                perKind = int(response.perKind);
            }
            if (response.nameLength) {
                nameLength = int(response.nameLength);
            }
            if (response.monsters is Array) {
                monsters = response.monsters as Array;
            }
            if (response.credits != null) {
                CASINO.setCredits(int(response.credits)); // (the yard's Shiny, and the top bar)
            }
            if (response.pets is Array) {
                _data = (response.pets as Array).concat();
                if (ownYard()) {
                    sync();
                }
            }
        }
    }
}
