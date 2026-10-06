package com.monsters.walls {
    import com.monsters.managers.InstanceManager;

    /**
     * Inferno-only (3 October): "Upgrade all walls" for resources, next to the shiny one (the wall's info
     * panel, BUILDINGINFO "io_btn_wallsres"). It offers each level the walls can go to (in the Inferno: 2,
     * stone; 3, iron), with the exact cost: for every wall below that level, the sum of the upgrade steps it
     * still has to take (its props' costs[level .. target - 1], bone, coal, sulfur and magma). Paid, every
     * wall is upgraded at once, as the shiny one does (STORE.BuyB "BLK"). A level whose Under Hall
     * requirement isn't met yet, or whose cost the yard can't pay, is said so and not offered.
     *
     * Walls being built or upgraded are finished first (they are paid for already), then go on from there.
     */
    public class IoWallUpgrade {

        public function IoWallUpgrade() {
            super();
        }

        /** The walls in the yard (the wall types: props type "wall", with upgrade steps). */
        private static function walls():Array {
            var out:Array = [];
            for each (var b:BFOUNDATION in InstanceManager.getInstancesByClass(BWALL)) {
                if (b && b._buildingProps && b._buildingProps.type == "wall" && b._buildingProps.costs is Array && b._buildingProps.costs.length > 1) {
                    out.push(b);
                }
            }
            return out;
        }

        /** The level a wall stands at once what it has paid for is done. */
        private static function paidLevel(b:BFOUNDATION):int {
            var l:int = b._lvl.Get();
            if (b._countdownBuild.Get() > 0) {
                l = Math.max(l, 1);
            }
            if (b._countdownUpgrade.Get() > 0) {
                l++;
            }
            return l;
        }

        /** What taking every wall to `target` costs: {n: walls, r: [r1, r2, r3, r4], ok: requirements met}. */
        public static function cost(target:int):Object {
            var r:Array = [0, 0, 0, 0];
            var n:int = 0;
            var ok:Boolean = true;
            for each (var b:BFOUNDATION in walls()) {
                var costs:Array = b._buildingProps.costs;
                if (target > costs.length) {
                    continue;
                }
                var l:int = paidLevel(b);
                if (l >= target) {
                    continue;
                }
                n++;
                for (var step:int = l; step < target; step++) {
                    var c:Object = costs[step];
                    if (!c) {
                        continue;
                    }
                    if (!BASE.HasRequirements(c)) {
                        ok = false;
                    }
                    for (var i:int = 1; i <= 4; i++) {
                        if (c["r" + i]) {
                            r[i - 1] += Number(c["r" + i].Get());
                        }
                    }
                }
            }
            return {"n": n, "r": r, "ok": ok};
        }

        private static function affordable(r:Array):Boolean {
            for (var i:int = 1; i <= 4; i++) {
                if (r[i - 1] > BASE._resources["r" + i].Get()) {
                    return false;
                }
            }
            return true;
        }

        private static function costText(r:Array):String {
            var parts:Array = [];
            var names:Array = BASE.isInfernoMainYardOrOutpost ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
            for (var i:int = 0; i < 4; i++) {
                if (r[i] > 0) {
                    parts.push(GLOBAL.FormatNumber(r[i]) + " " + KEYS.Get(names[i]));
                }
            }
            return parts.length ? parts.join(", ") : KEYS.Get("io_walls_free");
        }

        /** The highest level any wall type here goes to. */
        private static function topLevel():int {
            var top:int = 1;
            for each (var b:BFOUNDATION in walls()) {
                top = Math.max(top, b._buildingProps.costs.length);
            }
            return top;
        }

        private static function levelName(level:int):String {
            var key:String = "io_walls_level" + level;
            var name:String = KEYS.Get(key);
            return name == key ? KEYS.Get("io_walls_leveln", {"v1": level}) : name;
        }

        /** Opens the choice: each level the walls can still go to, with its exact cost. */
        public static function Show():void {
            var lines:Array = [];
            var offers:Array = [];
            for (var target:int = 2; target <= topLevel(); target++) {
                var c:Object = cost(target);
                if (c.n == 0) {
                    continue;
                }
                var line:String = "<b>" + levelName(target) + "</b> (" + KEYS.Get("io_walls_count", {"v1": c.n}) + "): " + costText(c.r);
                if (!c.ok) {
                    line += " <font color=\"#B02000\">" + KEYS.Get("io_walls_needhall") + "</font>";
                }
                else if (!affordable(c.r)) {
                    line += " <font color=\"#B02000\">" + KEYS.Get("io_walls_notenough") + "</font>";
                }
                else {
                    offers.push(target);
                }
                lines.push(line);
            }
            if (!lines.length) {
                GLOBAL.Message(KEYS.Get("io_walls_alldone"));
                return;
            }
            var text:String = "<b>" + KEYS.Get("io_walls_title") + "</b><br><br>" + lines.join("<br>");
            // (two choices at most: MESSAGE has two buttons; the Inferno's walls have two steps)
            offers = offers.slice(-2);
            if (!offers.length) {
                GLOBAL.Message(text);
            }
            else if (offers.length == 1) {
                GLOBAL.Message(text, levelName(offers[0]), Buy, [offers[0]]);
            }
            else {
                // (the message's first button is drawn on the right: the higher level there, the lower on its left)
                GLOBAL.Message(text, levelName(offers[1]), Buy, [offers[1]], levelName(offers[0]), Buy, [offers[0]]);
            }
        }

        /** Pays and upgrades every wall below `target` to it, at once. */
        public static function Buy(target:int):void {
            var c:Object = cost(target);
            if (c.n == 0) {
                return;
            }
            if (!c.ok) {
                GLOBAL.Message(KEYS.Get("io_walls_needhall"));
                return;
            }
            if (!affordable(c.r)) {
                GLOBAL.Message(KEYS.Get("io_walls_notenough"));
                return;
            }
            for (var i:int = 1; i <= 4; i++) {
                if (c.r[i - 1] > 0) {
                    BASE.Charge(i, c.r[i - 1]);
                }
            }
            for each (var b:BFOUNDATION in walls()) {
                if (target > b._buildingProps.costs.length) {
                    continue;
                }
                if (b._countdownBuild.Get() > 0) {
                    b.Constructed();
                }
                if (b._countdownUpgrade.Get() > 0) {
                    b.Upgraded();
                }
                while (b._lvl.Get() < target) {
                    b.Upgraded();
                }
            }
            BASE.Save();
            GLOBAL.Message(KEYS.Get("io_walls_done", {"v1": c.n, "v2": levelName(target), "v3": costText(c.r)}));
        }
    }
}
