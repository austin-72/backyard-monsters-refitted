package com.monsters.walls {
    import com.monsters.managers.InstanceManager;

    /**
     * Inferno-only (3 October): traps that went off stay in the yard, disarmed (BTRAP.ioDisarmed). One click
     * re-arms every one of them at once (a trap's info panel, BUILDINGINFO "io_btn_rearm"), for what building
     * them all again costs: each trap's build cost (its props' costs[0]), added up.
     */
    public class IoTrapRearm {

        public function IoTrapRearm() {
            super();
        }

        public static function disarmed():Array {
            var out:Array = [];
            for each (var t:BTRAP in InstanceManager.getInstancesByClass(BTRAP)) {
                if (t && t.ioDisarmed) {
                    out.push(t);
                }
            }
            return out;
        }

        public static function cost(traps:Array = null):Array {
            var r:Array = [0, 0, 0, 0];
            for each (var t:BTRAP in traps || disarmed()) {
                var c:Object = t._buildingProps.costs ? t._buildingProps.costs[0] : null;
                for (var i:int = 1; c && i <= 4; i++) {
                    if (c["r" + i]) {
                        r[i - 1] += Number(c["r" + i].Get());
                    }
                }
            }
            return r;
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

        private static function affordable(r:Array):Boolean {
            for (var i:int = 1; i <= 4; i++) {
                if (r[i - 1] > BASE._resources["r" + i].Get()) {
                    return false;
                }
            }
            return true;
        }

        public static function Show():void {
            var traps:Array = disarmed();
            if (!traps.length) {
                GLOBAL.Message(KEYS.Get("io_traps_allarmed"));
                return;
            }
            var r:Array = cost(traps);
            var text:String = KEYS.Get("io_traps_rearm_body", {"v1": traps.length, "v2": costText(r)});
            if (!affordable(r)) {
                GLOBAL.Message(text + "<br><br><font color=\"#B02000\">" + KEYS.Get("io_walls_notenough") + "</font>");
                return;
            }
            GLOBAL.Message(text, KEYS.Get("io_btn_rearm"), Rearm);
        }

        public static function Rearm():void {
            var traps:Array = disarmed();
            if (!traps.length) {
                return;
            }
            var r:Array = cost(traps);
            if (!affordable(r)) {
                GLOBAL.Message(KEYS.Get("io_walls_notenough"));
                return;
            }
            for (var i:int = 1; i <= 4; i++) {
                if (r[i - 1] > 0) {
                    BASE.Charge(i, r[i - 1]);
                }
            }
            for each (var t:BTRAP in traps) {
                t.ioRearm();
            }
            BASE.Save();
            GLOBAL.Message(KEYS.Get("io_traps_rearmed", {"v1": traps.length}));
        }
    }
}
