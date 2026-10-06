package com.monsters.events.hfo {
    import com.monsters.configs.BYMConfig;
    import com.monsters.managers.InstanceManager;
    import com.monsters.rendering.RasterData;
    import flash.display.BitmapData;
    import flash.display.BlendMode;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.geom.ColorTransform;
    import flash.geom.Matrix;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.utils.getTimer;

    /**
     * Hell Freezes Over (the user's hell_freezes_over.md, 1 October): a one-time story event in the player's main
     * yard. The server decides who it is for, when each day starts and what is paid (services/events/hfo.ts); it
     * sends the player's progress as the flag io_hfo and with every answer below. The game does the yard:
     *
     *  - Day 1 "Something's not right": small ice patches (IoHfoIce SMALL): 6, then one more every 2 hours, 12 in
     *    all, each on a free 30 x 30 spot. A worker clears each one and says a line (dealt by the server).
     *  - Day 2 "It's the curse": 5 big patches (60 x 60) that won't break: a worker chips at each, it cracks and
     *    holds. They stay until the curse breaks.
     *  - Day 3 "Hell has frozen over": the ground freezes (MAPBG "hfo_frozen"), every defence tower is sealed in
     *    ice (IoHfoIce TOWER, build mode only: towers fire as usual whatever happens) and a counter shows how many
     *    are freed. A large block of ice (the tomb) stands just off the yard's right-hand corner from now on.
     *    The last tower freed: "Hell has frozen over!" and the waves begin.
     *  - The waves (IoHfoWaves): 13, from the event's window (IoHfoUi) or the popups.
     *  - All 13 won: the reveal. The ground thaws, the big patches melt, the tomb bursts and Rimegrave stands
     *    there; he can now be unlocked in the Strongbox.
     *
     * Only on the player's own main yard in build mode (not outposts, attacks, visits or Designer drafts).
     */
    public class IoHfo {

        // ---- the player's progress (flag io_hfo)

        private static var _raw:String = null;

        private static var _flag:Object = null;

        /** The progress as the server last said, or null (not started, or not on an own yard). */
        public static function flag():Object {
            var raw:String = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_hfo ? String(GLOBAL._flags.io_hfo) : "";
            if (raw != _raw) {
                _raw = raw;
                _flag = null;
                if (raw != "") {
                    try {
                        _flag = JSON.parse(raw);
                    }
                    catch (e:Error) {
                        _flag = null;
                    }
                }
            }
            return _flag;
        }

        /** An answer's progress becomes the flag (until the next one the server sends). */
        public static function apply(view:Object):void {
            if (!view || !GLOBAL._flags) {
                return;
            }
            GLOBAL._flags.io_hfo = JSON.stringify(view);
            flag();
            CREATURELOCKER.ioHfoRefresh();
        }

        /** Rimegrave may be unlocked: the curse is broken (or an admin is testing). */
        public static function championFree():Boolean {
            if (GLOBAL.ioTestMode()) {
                return true;
            }
            var f:Object = flag();
            return f != null && Number(f.done) > 0;
        }

        /** The event is shown here: the player's own main yard, build mode. */
        public static function inYard():Boolean {
            return GLOBAL.INFERNO_ONLY && flag() != null && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost && !GLOBAL.ioDesignMode();
        }

        /** The ground is frozen: Day 3 until the reveal has played. */
        public static function frozenGround():Boolean {
            var f:Object = flag();
            return inYard() && int(f.day) >= 3 && !(Number(f.done) > 0 && f.seen && Number(f.seen.reveal) > 0);
        }

        /** The waves are open (the event's button shows from Day 3). */
        public static function buttonShown():Boolean {
            var f:Object = flag();
            // (gone once Rimegrave, the event's champion, is unlocked in the Strongbox: the user's, 4 October)
            var locker:Object = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[CREATURELOCKER.RIMEGRAVE_ID] : null;
            if (locker && int(locker.t) == 2) {
                return false;
            }
            return inYard() && int(f.day) >= 3;
        }

        // ---- the yard

        private static var _ticker:Sprite = null;

        private static var _tomb:Object = null;

        private static var _busy:Object = {};

        private static var _lastSpawnCheck:int = 0;

        private static var _setupAt:int = 0;

        /** The yard has loaded (BASE, after the warts): the event's ice, the tomb, popups. */
        public static function Setup():void {
            Cleanup();
            // (Rimegrave in the Strongbox, the Compound and the Academy only once the curse is broken)
            CREATURELOCKER.ioHfoRefresh();
            if (!inYard()) {
                return;
            }
            _setupAt = getTimer();
            var f:Object = flag();
            var day:int = int(f.day);
            var revealed:Boolean = Number(f.done) > 0 && f.seen && Number(f.seen.reveal) > 0;
            var p:Array = null;
            for each (p in f.small.patches as Array) {
                IoHfoIce.patch(IoHfoIce.SMALL, p[0], p[1], p[2], p[3]);
            }
            if (!revealed) {
                for each (p in f.big.patches as Array) {
                    IoHfoIce.patch(IoHfoIce.BIG, p[0], p[1], p[2], p[3]);
                }
            }
            if (day == 3) {
                setupTowers();
            }
            if (day >= 3 && !revealed) {
                drawTomb();
            }
            spawnPatches();
            IoHfoUi.Hud();
            if (!_ticker) {
                _ticker = new Sprite();
            }
            _ticker.addEventListener(Event.ENTER_FRAME, tick);
            if (day >= 4 && !(f.seen && Number(f.seen.frozen) > 0)) {
                IoHfoUi.FrozenPopup();
            }
            else if (Number(f.done) > 0 && !revealed) {
                // won the last wave and left before the reveal: it plays now
                Reveal();
            }
        }

        /** The yard is leaving (BASE.Cleanup). */
        public static function Cleanup():void {
            if (_ticker) {
                _ticker.removeEventListener(Event.ENTER_FRAME, tick);
            }
            clearTomb();
            IoHfoArt.clearFx();
            IoHfoArt.clearBattleIce();
            IoHfoUi.HudOff();
            _busy = {};
        }

        private static function tick(e:Event):void {
            if (!inYard()) {
                return;
            }
            var now:int = getTimer();
            if (now - _lastSpawnCheck > 60000) {
                _lastSpawnCheck = now;
                spawnPatches();
            }
            tombLines(now);
            IoHfoWaves.Tick();
        }

        // ---- patches: placed by the game on free ground, kept by the server

        /** Patches the player may have by now that aren't placed yet: found a spot and told to the server. */
        private static function spawnPatches():void {
            var f:Object = flag();
            if (!f || _busy.spawn) {
                return;
            }
            var day:int = int(f.day);
            var revealed:Boolean = Number(f.done) > 0;
            if (day >= 1) {
                var allowed:int = Math.min(int(f.small.total), 6 + Math.floor(Math.max(0, GLOBAL.Timestamp() - Number(f.dayAt[1])) / Math.max(1, int(f.small.every))));
                if (int(f.small.spawned) < allowed) {
                    send("small", allowed - int(f.small.spawned), 30, 5);
                    return;
                }
            }
            if (day >= 2 && !revealed && int(f.big.spawned) < int(f.big.total)) {
                send("big", int(f.big.total) - int(f.big.spawned), 60, 3);
            }
        }

        private static function send(kind:String, count:int, size:int, frames:int):void {
            var spots:Array = [];
            var taken:Array = [];
            for (var n:int = 0; n < count; n++) {
                var spot:Point = freeSpot(size, taken);
                if (!spot) {
                    break;
                }
                taken.push(new Rectangle(spot.x - 10, spot.y - 10, size + 20, size + 20));
                spots.push([spot.x, spot.y, 1 + int(Math.random() * frames)]);
            }
            if (!spots.length) {
                return;
            }
            _busy.spawn = true;
            call("spawn", [["kind", kind], ["patches", JSON.stringify(spots)]], function(r:Object):void {
                    _busy.spawn = false;
                    var placed:Object = {};
                    for each (var ice:IoHfoIce in ices()) {
                        placed[ice.kind + ice.ioServerId] = true;
                    }
                    var list:Array = kind == "small" ? r.hfo.small.patches : r.hfo.big.patches;
                    for each (var p:Array in list) {
                        if (!placed[kind + p[0]] && inYard()) {
                            IoHfoIce.patch(kind == "small" ? IoHfoIce.SMALL : IoHfoIce.BIG, p[0], p[1], p[2], p[3]);
                        }
                    }
                    BASE.Save();
                }, function():void {
                    _busy.spawn = false;
                });
        }

        /** A free grid spot of size x size inside the yard (with room round it), or null. */
        private static function freeSpot(size:int, taken:Array):Point {
            var halfW:Number = GLOBAL._mapWidth * 0.5 - size - 40;
            var halfH:Number = GLOBAL._mapHeight * 0.5 - size - 40;
            for (var tries:int = 0; tries < 3000; tries++) {
                var x:int = int((Math.random() * 2 - 1) * halfW / 10) * 10;
                var y:int = int((Math.random() * 2 - 1) * halfH / 10) * 10;
                var clash:Boolean = false;
                for each (var r:Rectangle in taken) {
                    if (r.intersects(new Rectangle(x, y, size, size))) {
                        clash = true;
                        break;
                    }
                }
                // (with a margin, so a worker can reach it and it doesn't wall anything in)
                if (!clash && !GRID.FootprintBlocked([new Rectangle(-10, -10, size + 20, size + 20)], GRID.ToISO(x, y, 0), true)) {
                    return new Point(x, y);
                }
            }
            return null;
        }

        /** Every piece of the event's ice in the yard. */
        public static function ices():Array {
            var out:Array = [];
            for each (var o:Object in InstanceManager.getInstancesByClass(BMUSHROOM)) {
                if (o is IoHfoIce) {
                    out.push(o);
                }
            }
            return out;
        }

        // ---- Day 3: the towers

        /** Every defence tower (not traps, the Compound or a bunker). */
        public static function defenceTowers():Array {
            var out:Array = [];
            for each (var o:Object in InstanceManager.getInstancesByClass(BTOWER)) {
                var t:BTOWER = o as BTOWER;
                if (t && t._class == "tower" && !(t is BTRAP)) {
                    out.push(t);
                }
            }
            return out;
        }

        private static function setupTowers():void {
            var f:Object = flag();
            var iced:Array = f.towers.iced as Array;
            if (!iced) {
                // Day 3 begins: every tower there is now, sealed
                var ids:Array = [];
                for each (var t:BTOWER in defenceTowers()) {
                    ids.push(t._id);
                }
                _busy.towers = true;
                call("towers", [["ids", JSON.stringify(ids)]], function(r:Object):void {
                        _busy.towers = false;
                        if (inYard()) {
                            placeTowerIce();
                            IoHfoUi.Hud();
                            if (r.frozen) {
                                // (no defence towers to free: the waves open at once)
                                IoHfoUi.FrozenPopup();
                            }
                        }
                    }, function():void {
                        _busy.towers = false;
                    });
                return;
            }
            placeTowerIce();
        }

        private static function placeTowerIce():void {
            var f:Object = flag();
            var iced:Array = f.towers.iced as Array || [];
            var thawed:Array = f.towers.thawed as Array || [];
            var here:Object = {};
            for each (var t:BTOWER in defenceTowers()) {
                here[t._id] = t;
            }
            var placed:Object = {};
            for each (var ice:IoHfoIce in ices()) {
                if (ice.kind == IoHfoIce.TOWER) {
                    placed[ice.ioServerId] = true;
                }
            }
            for each (var id:int in iced) {
                if (thawed.indexOf(id) != -1 || placed[id]) {
                    continue;
                }
                if (here[id]) {
                    IoHfoIce.onTower(here[id] as BFOUNDATION);
                }
                else {
                    // recycled since: counts as freed (no worker, no line)
                    call("thaw", [["id", id], ["gone", "1"]], function(r:Object):void {
                            IoHfoUi.Hud();
                            if (r.frozen) {
                                IoHfoUi.FrozenPopup();
                            }
                        });
                }
            }
        }

        // ---- workers

        public static function sendWorker(ice:IoHfoIce):void {
            if (!ice || ice._picking || !inYard()) {
                return;
            }
            if (ice.kind == IoHfoIce.TOWER && ice.tower && (ice.tower._countdownBuild.Get() + ice.tower._countdownUpgrade.Get() + ice.tower._countdownFortify.Get() > 0)) {
                GLOBAL.Message(KEYS.Get("hfo_tower_busy"));
                return;
            }
            if (QUEUE.Add("hfoice" + ice._id, ice)) {
                ice._mc.alpha = 0.6;
                ice._picking = true;
            }
            else {
                POPUPS.DisplayWorker(2, ice);
            }
        }

        /** The worker has done what can be done: the server settles it and deals the worker's line. */
        public static function workerDone(ice:IoHfoIce):void {
            var action:String = ice.kind == IoHfoIce.SMALL ? "clear" : (ice.kind == IoHfoIce.BIG ? "try" : "thaw");
            var prefix:String = ice.kind == IoHfoIce.SMALL ? "hfo_ice_small_msg" : (ice.kind == IoHfoIce.BIG ? "hfo_ice_big_msg" : "hfo_ice_tower_msg");
            call(action, [["id", ice.ioServerId]], function(r:Object):void {
                    var worker:MovieClip = QUEUE.Remove("hfoice" + ice._id, true);
                    var line:int = int(r.line);
                    if (line > 0) {
                        WORKERS.Say(KEYS.Get(prefix + line), worker, 3500);
                    }
                    var x:Number = ice._mc.x;
                    var y:Number = ice._mc.y;
                    if (ice.kind == IoHfoIce.SMALL) {
                        ice.ioRemove();
                        IoHfoArt.play(ice.picture + "_shatter", x, y, IoHfoArt.mapDepth(x, y + 20), 4);
                        SOUNDS.Play("ihit" + int(1 + Math.random() * 7), 0.6);
                    }
                    else if (ice.kind == IoHfoIce.BIG) {
                        // it cracks... and snaps back
                        IoHfoArt.play(ice.picture + "_crack", x, y, IoHfoArt.depthOf(ice) + 20, 6, function():void {
                                ice.ioReset();
                            });
                        SOUNDS.Play("ihit" + int(1 + Math.random() * 7), 0.6);
                    }
                    else {
                        var tower:BFOUNDATION = ice.tower;
                        var size:String = IoHfoArt.towerSize(tower);
                        ice.ioRemove();
                        IoHfoArt.play("ice_" + size + "_shatter", x, y, tower ? IoHfoArt.depthOf(tower) + 50 : IoHfoArt.mapDepth(x, y + 40), 3);
                        SOUNDS.Play("quake", 0.25);
                        IoHfoUi.Hud();
                        if (r.frozen) {
                            IoHfoUi.FrozenPopup();
                        }
                    }
                    BASE.Save();
                }, function():void {
                    QUEUE.Remove("hfoice" + ice._id, false);
                    ice.ioReset();
                });
        }

        // ---- the tomb: Rimegrave's ice, just off the yard's right-hand corner

        /** Its anchor on the map (the corner of its footprint diamond). */
        public static function tombPoint():Point {
            return GRID.ToISO(GLOBAL._mapWidth * 0.5 + 70, -GLOBAL._mapHeight * 0.5 - 70, 0);
        }

        /** Cracks at 4, 8 and 12 waves won. */
        public static function tombStage():int {
            var f:Object = flag();
            var won:int = 0;
            for each (var w:Array in f.waves as Array) {
                if (w[1]) {
                    won++;
                }
            }
            return won >= 12 ? 3 : (won >= 8 ? 2 : (won >= 4 ? 1 : 0));
        }

        private static function drawTomb():void {
            if (!BYMConfig.instance.RENDERER_ON || !MAP.instance) {
                return;
            }
            clearTomb();
            var at:Point = tombPoint();
            var off:Point = MAP.instance.offset;
            var stage:int = tombStage();
            var top:BitmapData = IoHfoArt.pic("block" + stage);
            var topAt:Point = IoHfoArt.picAt("block" + stage);
            var shadow:BitmapData = IoHfoArt.pic("block_shadow");
            var shadowAt:Point = IoHfoArt.picAt("block_shadow");
            var topPt:Point = new Point(at.x + topAt.x - off.x, at.y + topAt.y - off.y);
            var shadowPt:Point = new Point(at.x + shadowAt.x - off.x, at.y + shadowAt.y - off.y);
            _tomb = {
                    "at": at,
                    "stage": stage,
                    "top": new RasterData(top, topPt, IoHfoArt.mapDepth(at.x, at.y + 50)),
                    "shadow": new RasterData(shadow, shadowPt, MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true),
                    "said": 0
                };
        }

        private static function clearTomb():void {
            if (_tomb) {
                RasterData(_tomb.top).clear();
                RasterData(_tomb.shadow).clear();
            }
            _tomb = null;
        }

        /** The tomb drawn again (more cracks after a win). */
        public static function TombUpdate():void {
            if (_tomb && _tomb.stage != tombStage()) {
                drawTomb();
            }
        }

        /** A worker who comes near it sometimes says so. */
        private static function tombLines(now:int):void {
            if (!_tomb || now - Number(_tomb.said) < 90000 || now % 50 != 0) {
                return;
            }
            var at:Point = _tomb.at;
            for each (var w:Object in WORKERS._workers) {
                if (w && w.mc && !w.task && Point.distance(new Point(w.mc.x, w.mc.y), at) < 180 && Math.random() < 0.3) {
                    _tomb.said = now;
                    WORKERS.Say(KEYS.Get("hfo_tomb_msg"), w.mc, 3000);
                    return;
                }
            }
        }

        // ---- the reveal: all 13 won

        private static var _revealing:Boolean = false;

        public static function Reveal():void {
            if (_revealing || !inYard()) {
                return;
            }
            _revealing = true;
            if (!_tomb) {
                drawTomb();
            }
            var at:Point = tombPoint();
            MAP.FocusTo(at.x, at.y - 40, 1.5);
            // the heat comes back: the ground thaws and the big patches melt
            fadeGround();
            for each (var ice:IoHfoIce in ices()) {
                if (ice.kind == IoHfoIce.BIG) {
                    var x:Number = ice._mc.x;
                    var y:Number = ice._mc.y;
                    var pic:String = ice.picture;
                    ice.ioRemove();
                    IoHfoArt.play(pic + "_melt", x, y, MAP.DEPTH_SHADOW + 0.5, 10);
                }
            }
            // the block splits apart (its cracks first), then bursts
            var steps:Array = [1, 2, 3];
            var next:Function = function():void {
                if (!_tomb) {
                    _revealing = false;
                    return;
                }
                if (steps.length) {
                    var stage:int = steps.shift();
                    RasterData(_tomb.top).data = IoHfoArt.pic("block" + stage);
                    SOUNDS.Play("ihit" + int(1 + Math.random() * 7), 0.8);
                    IoHfoArt.wait(45, next); // (a pause between the cracks)
                    return;
                }
                RasterData(_tomb.shadow).clear();
                RasterData(_tomb.top).clear();
                SOUNDS.Play("quake", 0.6);
                IoHfoArt.play("block_reveal", at.x, at.y, IoHfoArt.mapDepth(at.x, at.y + 60), 4, function():void {
                        _tomb = null;
                        IoHfoUi.ShowRimegrave(at);
                        _revealing = false;
                        call("seen", [["what", "reveal"]], function(r:Object):void {
                                IoHfoUi.Hud();
                            });
                        IoHfoUi.ChampionPopup();
                    });
            };
            next();
        }

        /** The frozen ground fades back into the lava ground. */
        private static function fadeGround():void {
            if (!BYMConfig.instance.RENDERER_ON || !MAP.effectsBMD) {
                MAP.swapBG("lava");
                return;
            }
            var lava:BitmapData = MAPBG.MakeTile("lava");
            var step:int = 0;
            var fader:Sprite = new Sprite();
            var ct:ColorTransform = new ColorTransform(1, 1, 1, 0.12);
            var fade:Function = function(e:Event):void {
                step++;
                if (step % 3 == 0 && MAP.effectsBMD) {
                    for (var i:int = 0; i < 4; i++) {
                        for (var j:int = 0; j < 4; j++) {
                            MAP.effectsBMD.draw(lava, new Matrix(1, 0, 0, 1, i * 1000, j * 500), ct);
                        }
                    }
                }
                if (step >= 75) {
                    fader.removeEventListener(Event.ENTER_FRAME, fade);
                    lava.dispose();
                    MAP.swapBG("lava");
                }
            };
            fader.addEventListener(Event.ENTER_FRAME, fade);
        }

        // ---- the server

        /** POST hfo/<action>; `ok` gets the answer (its progress is applied first), `failed` an error. */
        public static function call(action:String, vars:Array, ok:Function = null, failed:Function = null):void {
            new URLLoaderApi().load(GLOBAL.serverUrl + "hfo/" + action, vars || [["v", "1"]], function(r:Object):void {
                    if (!r || r.error) {
                        GLOBAL.Message(r && r.error ? String(r.error) : KEYS.Get("hfo_err_server"));
                        if (failed != null) {
                            failed();
                        }
                        return;
                    }
                    if (r.hfo) {
                        apply(r.hfo);
                    }
                    if (ok != null) {
                        ok(r);
                    }
                }, function(e:IOErrorEvent):void {
                    GLOBAL.Message(KEYS.Get("hfo_err_server"));
                    if (failed != null) {
                        failed();
                    }
                });
        }
    }
}
