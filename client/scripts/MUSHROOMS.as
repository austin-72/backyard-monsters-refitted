package {
    import com.gskinner.utils.Rndm;
    import com.monsters.events.hfo.IoHfo;
    import com.monsters.events.hfo.IoHfoIce;
    import flash.geom.Rectangle;
    import flash.utils.getTimer;
    import flash.utils.Timer;
    import com.monsters.managers.InstanceManager;
    import flash.events.TimerEvent;
    import com.monsters.quests.IoQuests;

    public class MUSHROOMS {

        public static var _mushroom:BFOUNDATION;

        public static var _mushroomID:int;

        // ---- Inferno-only: the Wart Bloom (server: services/events/wartBloom.ts). Every weekend, Friday 6 pm to
        // Sunday midnight Central, warts grow 3 times as fast in the main yard: each second in a bloom counts 3
        // times towards the next wart (one per WART_SECONDS, at most 10 in the yard), offline time too. In a
        // bloom they also grow while the yard is open (ioTick), not only when it loads.

        /** One wart per this many seconds of growth (the stock rate: 4.8 hours). */
        public static const WART_SECONDS:int = 17280;

        /** At most this many warts in a yard. */
        public static const WART_MAX:int = 10;

        private static var _ioTimer:Timer = null;

        /** The flag io_wartbloom: {rate, w: [[start, end], ...]} (Unix seconds), or null. */
        private static function ioBloom():Object {
            var raw:* = GLOBAL._flags ? GLOBAL._flags.io_wartbloom : null;
            if (!raw) {
                return null;
            }
            try {
                var bloom:Object = raw is String ? JSON.parse(String(raw)) : raw;
                return bloom && bloom.w is Array ? bloom : null;
            }
            catch (e:Error) {
            }
            return null;
        }

        /** The bloom on at a moment (Unix seconds): [start, end], or null. */
        public static function ioBloomAt(time:Number):Array {
            var bloom:Object = ioBloom();
            if (!bloom) {
                return null;
            }
            for each (var w:Array in bloom.w) {
                if (w && w.length >= 2 && Number(w[0]) <= time && time < Number(w[1])) {
                    return w;
                }
            }
            return null;
        }

        /** Seconds of wart growth from one moment to another: the bloom's seconds count `rate` times. */
        public static function ioGrowth(from:Number, to:Number):Number {
            if (to <= from) {
                return 0;
            }
            var growth:Number = to - from;
            var bloom:Object = ioBloom();
            if (bloom) {
                var extra:Number = Math.max(1, Number(bloom.rate) || 1) - 1;
                for each (var w:Array in bloom.w) {
                    if (w && w.length >= 2) {
                        var overlap:Number = Math.min(to, Number(w[1])) - Math.max(from, Number(w[0]));
                        if (overlap > 0) {
                            growth += overlap * extra;
                        }
                    }
                }
            }
            return growth;
        }

        private static function ioStartTicking():void {
            if (!_ioTimer) {
                _ioTimer = new Timer(30000);
                _ioTimer.addEventListener(TimerEvent.TIMER, ioTick);
                _ioTimer.start();
            }
        }

        /** The warts in the yard now. */
        private static function ioWartCount():int {
            var n:int = 0;
            for each (var b:Object in InstanceManager.getInstancesByClass(BMUSHROOM)) {
                if (!(b is IoHfoIce)) {
                    n++; // (Hell Freezes Over's ice isn't a wart)
                }
            }
            return n;
        }

        /** In a bloom, warts grow while the main yard is open too (every half minute: one when one is due). */
        private static function ioTick(e:TimerEvent = null):void {
            var now:Number = GLOBAL.Timestamp();
            if (!GLOBAL.INFERNO_ONLY || !ioBloomAt(now) || !GLOBAL._flags || !GLOBAL._flags.mushrooms) {
                return;
            }
            if (!BASE.isMainYard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode() || BASE._loading || BASE.ioAttackRunning()) {
                return;
            }
            if (ioGrowth(BASE._lastSpawnedMushroom, now) < WART_SECONDS) {
                return;
            }
            if (ioWartCount() >= WART_MAX) {
                BASE._lastSpawnedMushroom = int(now); // (as at a load with the yard full: growth starts again)
                return;
            }
            Spawn(1);
            BASE.Save();
        }

        public function MUSHROOMS() {
            super();
        }

        public static function Setup():void {
            var mushroomCount:int;
            var count:int = 0;
            var t:int = 0;
            var num:Number = NaN;
            var twist:int = 0;
            var i:int = 0;
            var dist:int = 0;
            var angle:int = 0;
            var spawn:int = 0;
            var X:Number = NaN;
            var Y:Number = NaN;
            var a:int = 0;
            var b:int = 0;
            var s:int = 0;
            var n:int = 0;
            var X2:Number = NaN;
            var Y2:Number = NaN;
            var shroom:Object = null;
            var replace:Boolean = false;
            var spawnCount:int = 0;
            if (!GLOBAL._flags.mushrooms && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (!BASE.isMainYard) {
                return;
            }
            // Inferno-only: new warts grow only in your own yard. A wild monster yard is loaded as a main yard
            // with no warts on record, so every visit or attack sprouted a fresh random patch on it (and they
            // block paths); another player's yard shows the warts it has.
            if (GLOBAL.INFERNO_ONLY && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                ioPlaceRecorded();
                return;
            }
            // Inferno-only: a Designer draft (a tribe's, Moloch's or a kit's layout) grows none: they got in the
            // way of placing buildings there.
            if (GLOBAL.ioDesignMode()) {
                return;
            }
            mushroomCount = 0;
            try {
                if (BASE._lastSpawnedMushroom == 0) {
                    BASE._mushroomList = [];
                    count = 0;
                    t = getTimer();
                    num = Math.random();
                    twist = int(Math.random() * 360);
                    i = 1;
                    while (i < 6) {
                        dist = i * 100 + 300;
                        angle = i * 60 + twist;
                        spawn = 4;
                        X = Math.sin(angle * 0.0174532925) * dist;
                        Y = Math.cos(angle * 0.0174532925) * dist;
                        a = 100 + Math.random() * 80;
                        b = 100 + Math.random() * 80;
                        s = 0;
                        while (s < spawn) {
                            n = int(Math.random() * (GLOBAL.INFERNO_ONLY ? 6 : 5)) + 1;
                            X2 = X + Math.sin(int(Math.random() * 360) * 0.0174532925) * a;
                            Y2 = Y + Math.cos(int(Math.random() * 360) * 0.0174532925) * b;
                            X2 = int(X2 / 10) * 10;
                            Y2 = int(Y2 / 10) * 10;
                            _mushroom = BASE.addBuildingC(7);
                            _mushroom.Setup({
                                        "X": X2,
                                        "Y": Y2,
                                        "id": mushroomCount,
                                        "t": 7,
                                        "frame": n
                                    });
                            mushroomCount++;
                            s++;
                        }
                        i++;
                    }
                    BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
                }
                else {
                    i = 0;
                    while (i < Math.min(BASE._mushroomList.length, 20)) {
                        shroom = {
                                "frame": BASE._mushroomList[i][0],
                                "X": BASE._mushroomList[i][1],
                                "Y": BASE._mushroomList[i][2],
                                "id": mushroomCount,
                                "t": 7
                            };
                        replace = false;
                        if (shroom.X > GLOBAL._mapWidth * 0.5) {
                            replace = true;
                        }
                        else if (shroom.X < 0 - GLOBAL._mapWidth * 0.5) {
                            replace = true;
                        }
                        else if (shroom.Y > GLOBAL._mapHeight * 0.5) {
                            replace = true;
                        }
                        else if (shroom.Y < 0 - GLOBAL._mapHeight * 0.5) {
                            replace = true;
                        }
                        if (!replace) {
                            _mushroom = BASE.addBuildingC(7);
                            _mushroom.Setup(shroom);
                        }
                        else {
                            Spawn(1);
                        }
                        mushroomCount++;
                        i++;
                    }
                    if (BASE._mushroomList.length > 20) {
                        i = int(BASE._mushroomList.length - 1);
                        while (i > 19) {
                            delete BASE._mushroomList[i];
                            i--;
                        }
                    }
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "MUSHROOMS.SetupA: " + e.message + " | " + e.getStackTrace());
                GLOBAL.ErrorMessage("");
            }
            try {
                spawnCount = Math.floor(GLOBAL.Timestamp() - BASE._lastSpawnedMushroom) / 17280;
                if (GLOBAL.INFERNO_ONLY) {
                    // the Wart Bloom's hours count 3 times (offline too)
                    spawnCount = int(ioGrowth(BASE._lastSpawnedMushroom, GLOBAL.Timestamp()) / WART_SECONDS);
                    ioStartTicking();
                }
                if (spawnCount > 0) {
                    BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
                    if (spawnCount > 10) {
                        spawnCount = 10;
                    }
                    if (mushroomCount + spawnCount > 10) {
                        spawnCount = 10 - mushroomCount;
                    }
                    if (spawnCount > 0) {
                        Spawn(spawnCount);
                    }
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "MUSHROOMS.SetupB: " + e.message + " | " + e.getStackTrace());
                GLOBAL.ErrorMessage("");
            }
        }

        /* Inferno-only: the yard's recorded warts, put where they were, none added (see Setup). */
        private static function ioPlaceRecorded():void {
            var list:Array = BASE._mushroomList as Array;
            var i:int = 0;
            var e:Array = null;
            var wart:BFOUNDATION = null;
            if (!list) {
                return;
            }
            while (i < Math.min(list.length, 20)) {
                e = list[i] as Array;
                if (e) {
                    wart = BASE.addBuildingC(7);
                    wart.Setup({
                                "frame": e[0],
                                "X": e[1],
                                "Y": e[2],
                                "id": i,
                                "t": 7
                            });
                }
                i++;
            }
        }

        public static function Spawn(param1:int):void {
            var _loc2_:BFOUNDATION = null;
            var _loc4_:int = 0;
            var _loc5_:Boolean = false;
            var _loc6_:int = 0;
            var _loc7_:int = 0;
            var _loc8_:int = 0;
            if (!GLOBAL._flags.mushrooms && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (!BASE.isMainYard || GLOBAL.INFERNO_ONLY && (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode())) {
                return;
            }
            BASE._lastSpawnedMushroom = GLOBAL.Timestamp();
            LOGGER.Stat([35, param1]);
            var _loc3_:int = 0;
            while (_loc3_ < param1) {
                _loc4_ = int(Math.random() * (GLOBAL.INFERNO_ONLY ? 6 : 5)) + 1;
                _loc5_ = false;
                _loc6_ = 0;
                _loc7_ = 0;
                _loc8_ = 0;
                while (!_loc5_ && _loc8_ < 5000) {
                    _loc8_++;
                    _loc6_ = 200 + GLOBAL._mapWidth * 0.5 - Math.random() * (GLOBAL._mapWidth + 400);
                    _loc7_ = 200 + GLOBAL._mapHeight * 0.5 - Math.random() * (GLOBAL._mapHeight + 400);
                    if (_loc6_ > GLOBAL._mapWidth * 0.5 || _loc6_ < 0 - GLOBAL._mapWidth * 0.5 || _loc7_ > GLOBAL._mapHeight * 0.5 || _loc7_ < 0 - GLOBAL._mapHeight * 0.5) {
                        _loc5_ = true;
                    }
                    if (!_loc5_ && !GRID.FootprintBlocked([new Rectangle(0, 0, 30, 30)], GRID.ToISO(_loc6_, _loc7_, 0), true)) {
                        _loc5_ = true;
                    }
                }
                if (_loc5_) {
                    _mushroom = BASE.addBuildingC(7);
                    ++BASE._buildingCount;
                    _mushroom.Setup({
                                "X": _loc6_,
                                "Y": _loc7_,
                                "id": BASE._buildingCount,
                                "t": 7,
                                "frame": _loc4_
                            });
                }
                _loc3_++;
            }
        }

        public static function PickWorker(param1:BFOUNDATION):void {
            // Hell Freezes Over: its ice has workers of its own (IoHfo)
            if (param1 is IoHfoIce) {
                IoHfo.sendWorker(IoHfoIce(param1));
                return;
            }
            if (!param1._picking) {
                if (QUEUE.Add("mushroom" + param1._id, param1)) {
                    param1._mc.alpha = 0.5;
                    param1._picking = true;
                }
                else {
                    POPUPS.DisplayWorker(2, param1);
                }
            }
        }

        /**
         * Resolves a mushroom pick, awarding shiny if the mushroom is golden.
         *
         * @param mushroom The mushroom being picked.
         * @return True once the pick has been resolved, false if a purchase is already in flight.
         */
        public static function Pick(mushroom:BFOUNDATION):Boolean {
            if (BASE._pendingPurchase.length > 0)
                return false;

            var mushroomId:int = mushroom._id;
            var workerMessage:String = "";
            var shinyAwarded:int = 0;

            var positionRng:Rndm = new Rndm(int(mushroom.x * mushroom.y));
            var isGolden:Boolean = int(positionRng.random() * 4) == 0;

            ++QUESTS._global.mushroomspicked;
            if (GLOBAL.INFERNO_ONLY) {
                IoQuests.event("wart_pick"); // (the quest book)
            }

            if (isGolden) {
                ++QUESTS._global.goldmushroomspicked;
                GLOBAL.ValidateMushroomPick(mushroom);
            }

            mushroom.RecycleC();

            if (isGolden) {
                var mushroomVariant:int = int(Math.random() * 3 + 1);

                if (mushroomVariant == 3)
                    mushroomVariant = 1;

                shinyAwarded = mushroomVariant == 2 ? 8 : 3;
                workerMessage = KEYS.Get("pop_mushroom_msg1", {"v1": shinyAwarded});

                BASE.Purchase("MUSHROOM" + mushroomVariant, 1, "MUSHROOMS");

                var shinyPopup:popup_mushroomshiny = new popup_mushroomshiny();
                shinyPopup.tTitle.htmlText = "<b>" + KEYS.Get("pop_goldenmushroom_title") + "</b>";
                shinyPopup.tMessage.htmlText = KEYS.Get(GLOBAL.INFERNO_ONLY ? "pop_goldenwart_desc" : "pop_goldenmushroom_desc", {"v1": shinyAwarded});

                POPUPS.Push(shinyPopup, null, null, "chaching", GLOBAL.INFERNO_ONLY ? "goldwart.png" : "goldmushroom.png");
            }
            else {
                // Inferno-only: the warts have their own lines (pop_wart_msg2-4).
                var flavourKeys:Array = GLOBAL.INFERNO_ONLY ? ["pop_wart_msg2", "pop_wart_msg3", "pop_wart_msg4"] : ["pop_mushroom_msg2", "pop_mushroom_msg3", "pop_mushroom_msg4"];
                workerMessage = KEYS.Get(flavourKeys[int(Math.random() * flavourKeys.length)]);
                BASE.Save();
            }

            LOGGER.Stat([34, shinyAwarded]);
            QUESTS.Check();
            WORKERS.Say(workerMessage, QUEUE.Remove("mushroom" + mushroomId, true), 3000);
            return true;
        }
    }
}
