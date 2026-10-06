package com.monsters.admin {
    import com.monsters.maproom_advanced.MapRoom;
    import com.monsters.enums.EnumYardType;
    import com.monsters.managers.InstanceManager;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.events.TimerEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Point;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFieldType;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;
    import flash.utils.Timer;

    /**
     * Inferno-only admin test mode: the switch next to the Admin button (UI_TOP), the "TEST MODE" banner and
     * the test tools window. Server: services/admin/testMode.ts (POST admin/testmode), flag io_testmode.
     *
     * Switching on: the yard is saved, the server takes a snapshot of the account and gives unlimited shiny and
     * resources, and the home yard is loaded again. While on (GLOBAL.ioTestMode): builds, upgrades, repairs,
     * hatching and training finish at once, placement limits are gone, every monster is unlocked, the Compound
     * has no limit, attacks are practice attacks on any yard without a time limit or fling limit, and the
     * catapult is free. Switching off (or switching account, or the next login) puts the snapshot back.
     */
    public class IoTestMode {

        /** The last map cell clicked (MapRoomCell.Click), for the map tools. */
        public static var lastX:int = -1;

        public static var lastY:int = -1;

        private static const W:int = 560;

        private static const TRIBES:Array = [["legionnaire", "Hellionnaire"], ["kozu", "Kozmodeus"], ["abunakki", "Abaddonakki"], ["dreadnaut", "Beelzenaut"], ["moloch", "Moloch"]];

        private static const BANDS:Array = ["levels 1-10", "levels 11-20", "levels 21-30", "levels 31-40", "levels 41+"];

        private static var _busy:Boolean = false;

        private static var _open:IoTestMode = null;

        // remembered choices while the game is open
        private static var _tribe:int = 0;

        private static var _band:int = 0;

        private static var _monster:int = 0;

        private static var _level:int = 1;

        private static var _count:String = "5";

        private static var _hours:String = "24";

        private var _mc:MovieClip;

        private var _tribeBtn:Sprite;

        private var _bandBtn:Sprite;

        private var _monsterBtn:Sprite;

        private var _levelBtn:Sprite;

        private var _countField:TextField;

        private var _hoursField:TextField;

        private var _xField:TextField;

        private var _yField:TextField;

        // ---- the switch

        /** The switch next to the Admin button. */
        public static function ToggleClick(e:MouseEvent = null):void {
            if (_busy) {
                return;
            }
            SOUNDS.Play("click1");
            if (GLOBAL.ioTestMode()) {
                GLOBAL.Message("<b>Switch off admin test mode?</b><br><br>Your yards, outposts, shiny and resources go back to how they were when you switched it on.", "Switch off", function():void {
                        switchOff(null);
                    });
            }
            else {
                GLOBAL.Message("<b>Switch on admin test mode?</b><br><br>Your yards, outposts, shiny and resources are saved now and put back exactly as they are when you switch it off (switching account or logging in again does it too).<br><br>While it is on: unlimited resources and shiny, everything built and upgraded at once, no building limits, every monster, practice attacks on any yard, and the test tools.", "Switch on", switchOn);
            }
        }

        private static function switchOn():void {
            _busy = true;
            PLEASEWAIT.Show("Switching on test mode...");
            try {
                BASE.Save(0, false, true);
            }
            catch (e:Error) {
            }
            whenSaved(function():void {
                    BASE._blockSave = true;
                    call("on", [], function(serverData:Object):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            loadHome();
                        }, function(message:String):void {
                            // The answer may be what was lost (the server switched it on): ask again before
                            // going on as if it were off.
                            call("status", [], function(serverData:Object):void {
                                    _busy = false;
                                    PLEASEWAIT.Hide();
                                    if (serverData.on) {
                                        loadHome();
                                    }
                                    else {
                                        BASE._blockSave = false;
                                        GLOBAL.Message(message);
                                    }
                                }, function(again:String):void {
                                    // Still no answer: reloading the home yard shows whatever the server has.
                                    _busy = false;
                                    PLEASEWAIT.Hide();
                                    GLOBAL.Message(message);
                                    loadHome();
                                });
                        });
                });
        }

        /** Switches off and puts the account back; then `done` (switching account), or the home yard is loaded. */
        public static function switchOff(done:Function):void {
            _busy = true;
            PLEASEWAIT.Show("Switching off test mode...");
            // Nothing from the test yard may be saved over the one put back.
            BASE._blockSave = true;
            whenSaved(function():void {
                    call("off", [], function(serverData:Object):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            if (done != null) {
                                done();
                            }
                            else {
                                loadHome();
                            }
                        }, function(message:String):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            if (done != null) {
                                // The next login puts the account back anyway.
                                done();
                            }
                            else {
                                BASE._blockSave = false;
                                GLOBAL.Message(message);
                            }
                        });
                });
        }

        private static function loadHome():void {
            if (_open) {
                _open.close();
            }
            BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }

        /**
         * Runs `then` once every change is saved (at most 8 seconds): no save under way and none waiting.
         * A save asked for while another was on its way is sent once that one is back.
         */
        private static function whenSaved(then:Function):void {
            var deadline:int = GLOBAL.Timestamp() + 8;
            var wait:Timer = new Timer(200);
            wait.addEventListener(TimerEvent.TIMER, function(e:TimerEvent):void {
                    var saved:Boolean = !BASE._saving && BASE._saveCounterA == BASE._saveCounterB;
                    if (saved || GLOBAL.Timestamp() > deadline) {
                        wait.stop();
                        then();
                        return;
                    }
                    if (!BASE._saving) {
                        try {
                            BASE.Save(0, false, true);
                        }
                        catch (err:Error) {
                        }
                    }
                });
            wait.start();
        }

        /** One test-mode request; `fail` also runs when no answer comes within 20 seconds. */
        private static function call(action:String, vars:Array, ok:Function, fail:Function):void {
            var answered:Boolean = false;
            var timeout:Timer = new Timer(20000, 1);
            timeout.addEventListener(TimerEvent.TIMER_COMPLETE, function(e:TimerEvent):void {
                    if (!answered) {
                        answered = true;
                        fail("Test mode: no answer from the server. Please try again.");
                    }
                });
            timeout.start();
            new URLLoaderApi().load(GLOBAL.serverUrl + "admin/testmode", [["action", action]].concat(vars), function(serverData:Object):void {
                    if (answered) {
                        return;
                    }
                    answered = true;
                    timeout.stop();
                    if (serverData && serverData.error == 0) {
                        ok(serverData);
                    }
                    else {
                        fail(serverData && serverData.error ? String(serverData.error) : "Test mode: no answer from the server.");
                    }
                }, function(e:Event):void {
                    if (answered) {
                        return;
                    }
                    answered = true;
                    timeout.stop();
                    fail("Test mode: the server could not be reached. Please try again.");
                });
        }

        /** Closes the tools window (the yard is going: an attack starts, or BASE.Cleanup). */
        public static function ioCloseOpen():void {
            if (_open) {
                _open.close();
            }
            _open = null;
        }

        // ---- the banner

        /** "TEST MODE" text, shown while test mode is on (UI_TOP keeps one). */
        public static function makeBanner():TextField {
            var t:TextField = label("TEST MODE  (undone when you switch it off)", 14, 0xFF3030, true, 420, TextFormatAlign.CENTER);
            t.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 2)];
            return t;
        }

        // ---- the tools window

        public static function ShowTools(e:MouseEvent = null):void {
            if (_open && (!_open._mc || !_open._mc.stage)) {
                _open = null; // left from a yard that has gone
            }
            if (_open || !GLOBAL.ioTestMode() || BASE.ioAttackRunning()) {
                return;
            }
            SOUNDS.Play("click1");
            _open = new IoTestMode();
        }

        public function IoTestMode() {
            super();
            this._mc = new MovieClip();
            var h:int = 470;
            var fx:int = -int(W / 2);
            var fy:int = -int(h / 2);
            var frame:frame_CLIP = this._mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = W;
            frame.height = h;
            frame.x = fx;
            frame.y = fy;
            frame.Setup(true, this.close);

            var x0:int = fx + 28;
            var y:int = fy + 28;
            var title:TextField = this._mc.addChild(new TextField()) as TextField;
            title.selectable = false;
            title.mouseEnabled = false;
            title.embedFonts = true;
            title.antiAliasType = AntiAliasType.NORMAL;
            title.width = W - 56;
            title.height = 30;
            var tf:TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
            tf.align = TextFormatAlign.CENTER;
            title.defaultTextFormat = tf;
            title.text = "Test tools";
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = x0;
            title.y = y;
            y += 40;

            // wild attack now
            this.heading("Wild attack now", x0, y);
            y += 22;
            this._tribeBtn = this.add(button(TRIBES[_tribe][1], 120, 24, this.nextTribe), x0, y);
            this._bandBtn = this.add(button(BANDS[_band], 110, 24, this.nextBand), x0 + 128, y);
            this.add(button("Attack now", 110, 24, this.wildAttack), x0 + 246, y);
            y += 38;

            // spawn monsters
            this.heading("Monsters", x0, y);
            y += 22;
            this._monsterBtn = this.add(button(this.monsterName(), 120, 24, this.nextMonster), x0, y);
            this._levelBtn = this.add(button("level " + _level, 70, 24, this.nextLevel), x0 + 128, y);
            this._mc.addChild(label("count", 11, 0x3A2A1A, true, 40, TextFormatAlign.RIGHT)).x = x0 + 200;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y + 4;
            this._countField = this.input(_count, 44, x0 + 244, y);
            this.add(button("Attack me", 90, 24, this.spawnAttackers), x0 + 296, y);
            this.add(button("Defend", 80, 24, this.spawnDefenders), x0 + 392, y);
            y += 28;
            this._mc.addChild(label("Defenders go in the Compound at that level (it becomes the Academy level for that monster).", 10, 0x3A2A1A, false, W - 56, TextFormatAlign.LEFT)).x = x0;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y;
            y += 30;

            // yard
            this.heading("Yard", x0, y);
            y += 22;
            this.add(button("Repair everything", 150, 24, this.repairAll), x0, y);
            this.add(button("Protection on", 120, 24, this.protectionOn), x0 + 158, y);
            this.add(button("Protection off", 120, 24, this.protectionOff), x0 + 286, y);
            y += 38;

            // time
            this.heading("Fast-forward (this yard, until it is loaded again)", x0, y);
            y += 22;
            this._hoursField = this.input(_hours, 44, x0, y);
            this._mc.addChild(label("hours", 11, 0x3A2A1A, true, 44, TextFormatAlign.LEFT)).x = x0 + 50;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y + 4;
            this.add(button("Fast-forward", 110, 24, this.fastForwardClick), x0 + 100, y);
            y += 38;

            // map
            this.heading("Map (X and Y as the map shows them)", x0, y);
            y += 22;
            this._mc.addChild(label("X", 11, 0x3A2A1A, true, 14, TextFormatAlign.RIGHT)).x = x0;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y + 4;
            this._xField = this.input(lastX >= 0 ? String(lastX) : "", 50, x0 + 18, y);
            this._mc.addChild(label("Y", 11, 0x3A2A1A, true, 14, TextFormatAlign.RIGHT)).x = x0 + 72;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y + 4;
            this._yField = this.input(lastY >= 0 ? String(lastY) : "", 50, x0 + 90, y);
            this.add(button("Jump there", 90, 24, this.jump), x0 + 150, y);
            this.add(button("Take as outpost", 120, 24, this.takeCell), x0 + 246, y);
            this.add(button("Make wild", 90, 24, this.wildCell), x0 + 372, y);
            y += 28;
            this._mc.addChild(label("Take: free land or a tribe. Make wild: one of your outposts or a tribe (a fresh tribe grows). Other players' yards are left alone.", 10, 0x3A2A1A, false, W - 56, TextFormatAlign.LEFT)).x = x0;
            this._mc.getChildAt(this._mc.numChildren - 1).y = y;

            var ok:Button_CLIP = this._mc.addChild(new Button_CLIP()) as Button_CLIP;
            ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
            ok.x = -int(ok.width * 0.5);
            ok.y = fy + h - 58;
            ok.addEventListener(MouseEvent.CLICK, this.close);

            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this._mc);
            POPUPSETTINGS.AlignToCenter(this._mc);
            POPUPSETTINGS.ScaleUp(this._mc);
        }

        public function close(e:MouseEvent = null):void {
            if (!this._mc) {
                return;
            }
            _count = this._countField.text;
            _hours = this._hoursField.text;
            GLOBAL.BlockerRemove();
            if (this._mc.parent) {
                this._mc.parent.removeChild(this._mc);
            }
            this._mc = null;
            if (_open == this) {
                _open = null;
            }
        }

        // ---- choices

        private function nextTribe(e:MouseEvent):void {
            _tribe = (_tribe + 1) % TRIBES.length;
            setText(this._tribeBtn, TRIBES[_tribe][1]);
        }

        private function nextBand(e:MouseEvent):void {
            _band = (_band + 1) % BANDS.length;
            setText(this._bandBtn, BANDS[_band]);
        }

        private function nextMonster(e:MouseEvent):void {
            _monster = (_monster + 1) % CREATURELOCKER.ioTestMonsterIds().length;
            setText(this._monsterBtn, this.monsterName());
        }

        private function nextLevel(e:MouseEvent):void {
            _level = _level % 6 + 1;
            setText(this._levelBtn, "level " + _level);
        }

        private function monsterId():String {
            return String(CREATURELOCKER.ioTestMonsterIds()[_monster]);
        }

        private function monsterName():String {
            var c:Object = CREATURELOCKER._creatures[this.monsterId()];
            return c ? KEYS.Get(c.name) : this.monsterId();
        }

        private function count():int {
            return Math.max(1, Math.min(500, int(this._countField.text)));
        }

        // ---- actions

        private function ownYard():Boolean {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message("Open one of your own yards first.");
                return false;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while your yard is being attacked.");
                return false;
            }
            return true;
        }

        private function wildAttack(e:MouseEvent):void {
            if (!this.ownYard()) {
                return;
            }
            var why:String = WMATTACK.ioAdminAttack(TRIBES[_tribe][0], _band);
            if (why) {
                GLOBAL.Message(why);
                return;
            }
            this.close();
        }

        private function spawnAttackers(e:MouseEvent):void {
            if (!this.ownYard()) {
                return;
            }
            var monsters:Object = {};
            monsters[this.monsterId()] = this.count();
            var why:String = WMATTACK.ioAdminAttack(TRIBES[_tribe][0], _band, monsters, _level);
            if (why) {
                GLOBAL.Message(why);
                return;
            }
            this.close();
        }

        private function spawnDefenders(e:MouseEvent):void {
            if (!this.ownYard()) {
                return;
            }
            if (!GLOBAL._bHousing) {
                GLOBAL.Message("Build a Compound first: defenders live there.");
                return;
            }
            var id:String = this.monsterId();
            if (!GLOBAL.player.m_upgrades[id]) {
                GLOBAL.player.m_upgrades[id] = {"level": _level};
            }
            GLOBAL.player.m_upgrades[id].level = _level;
            if (GLOBAL.player.monsterListByID(id)) {
                GLOBAL.player.monsterListByID(id).level = _level;
            }
            var made:int = 0;
            var at:Point = new Point(GLOBAL._bHousing._mc.x, GLOBAL._bHousing._mc.y);
            for (var i:int = 0; i < this.count(); i++) {
                if (HOUSING.HousingStore(id, at)) {
                    made++;
                }
            }
            HOUSING.HousingSpace();
            BASE.Save();
            GLOBAL.Message(made + " " + this.monsterName() + " (level " + _level + ") now in your Compound.");
        }

        private function repairAll(e:MouseEvent):void {
            if (!this.ownYard()) {
                return;
            }
            var fixed:int = 0;
            for each (var b:BFOUNDATION in InstanceManager.getInstancesByClass(BFOUNDATION)) {
                if (b.health < b.maxHealth) {
                    b.Repair();
                    fixed++;
                }
            }
            BASE.Save();
            GLOBAL.Message(fixed > 0 ? fixed + " buildings repaired." : "Nothing needed repairing.");
        }

        private function protectionOn(e:MouseEvent):void {
            this.protection(true);
        }

        private function protectionOff(e:MouseEvent):void {
            this.protection(false);
        }

        private function protection(on:Boolean):void {
            call("protection", [["on", on ? 1 : 0]], function(serverData:Object):void {
                    BASE._isProtected = int(serverData["protected"]);
                    GLOBAL.Message(on ? "Your main yard has damage protection for 7 days." : "Your main yard has no damage protection now.");
                }, GLOBAL.Message);
        }

        private function fastForwardClick(e:MouseEvent):void {
            if (!this.ownYard()) {
                return;
            }
            var hours:int = Math.max(1, Math.min(24 * 30, int(this._hoursField.text)));
            fastForward(hours * 3600);
            GLOBAL.Message("Moved on " + hours + " hours: production, timers and the next wild attack.");
        }

        /**
         * Moves the yard on screen `seconds` into the future: the clock (timers that end at a time, the Academy,
         * the Strongbox, the next wild attack) and every building's own countdowns and production.
         */
        public static function fastForward(seconds:int):void {
            GLOBAL.t += seconds;
            for each (var b:BFOUNDATION in InstanceManager.getInstancesByClass(BFOUNDATION)) {
                try {
                    b.Tick(seconds);
                }
                catch (err:Error) {
                }
            }
            BASE.CalcResources();
            BASE.Save();
        }

        private function place():Point {
            var x:int = int(this._xField.text.replace(/[^0-9]/g, ""));
            var y:int = int(this._yField.text.replace(/[^0-9]/g, ""));
            if (this._xField.text.replace(/[^0-9]/g, "") == "" || this._yField.text.replace(/[^0-9]/g, "") == "") {
                GLOBAL.Message("Enter X and Y first (clicking a cell on the map fills them in).");
                return null;
            }
            return new Point(x, y);
        }

        private function jump(e:MouseEvent):void {
            var at:Point = this.place();
            if (!at) {
                return;
            }
            this.close();
            MapRoom.ioFocus = at;
            GLOBAL.ShowMap();
            if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
                MapRoom.ioFocus = null; // the map didn't open: don't jump there the next time it does
            }
        }

        private function takeCell(e:MouseEvent):void {
            var at:Point = this.place();
            if (!at) {
                return;
            }
            call("takecell", [["x", at.x], ["y", at.y]], function(serverData:Object):void {
                    GLOBAL._mapOutpost.push(new Point(at.x, at.y));
                    GLOBAL._mapOutpostIDs.push(serverData.baseid);
                    MapRoom.ioClearCells();
                    GLOBAL.Message(at.x + ", " + at.y + " is now your outpost.", "Open it", function():void {
                            if (_open) {
                                _open.close();
                            }
                            BASE.ioLoadOutpost(at.x, at.y);
                        });
                }, GLOBAL.Message);
        }

        private function wildCell(e:MouseEvent):void {
            var at:Point = this.place();
            if (!at) {
                return;
            }
            call("wildcell", [["x", at.x], ["y", at.y]], function(serverData:Object):void {
                    for (var i:int = GLOBAL._mapOutpost.length - 1; i >= 0; i--) {
                        if (GLOBAL._mapOutpost[i].x == at.x && GLOBAL._mapOutpost[i].y == at.y) {
                            GLOBAL._mapOutpost.splice(i, 1);
                            GLOBAL._mapOutpostIDs.splice(i, 1);
                        }
                    }
                    MapRoom.ioClearCells();
                    if (BASE.isOutpost && BASE._currentCellLoc && BASE._currentCellLoc.x == at.x && BASE._currentCellLoc.y == at.y) {
                        GLOBAL.Message(at.x + ", " + at.y + " is wild again. Back to your main yard.");
                        loadHome();
                        return;
                    }
                    GLOBAL.Message(at.x + ", " + at.y + " is wild again.");
                }, GLOBAL.Message);
        }

        // ---- helpers

        private function heading(text:String, x:int, y:int):void {
            var t:TextField = this._mc.addChild(label(text, 12, 0x3A2A1A, true, W - 56, TextFormatAlign.LEFT)) as TextField;
            t.x = x;
            t.y = y;
        }

        private function add(b:Sprite, x:int, y:int):Sprite {
            this._mc.addChild(b);
            b.x = x;
            b.y = y;
            return b;
        }

        private function input(text:String, width:int, x:int, y:int):TextField {
            var f:TextField = new TextField();
            f.type = TextFieldType.INPUT;
            f.border = true;
            f.borderColor = 0x8A6A45;
            f.background = true;
            f.backgroundColor = 0xFFFFFF;
            f.width = width;
            f.height = 22;
            var format:TextFormat = new TextFormat("Verdana", 12, 0x000000, true);
            format.align = TextFormatAlign.CENTER;
            f.defaultTextFormat = format;
            f.text = text;
            f.x = x;
            f.y = y + 1;
            this._mc.addChild(f);
            return f;
        }

        private static function label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.wordWrap = true;
            field.multiline = true;
            field.width = width;
            field.height = size * 2 + 10;
            var format:TextFormat = new TextFormat("Verdana", size, color, bold);
            format.align = align;
            field.defaultTextFormat = format;
            field.text = text;
            return field;
        }

        private static function setText(b:Sprite, text:String):void {
            TextField(b.getChildAt(0)).text = text;
        }

        private static function button(text:String, width:int, height:int, onClick:Function):Sprite {
            var b:Sprite = new Sprite();
            b.buttonMode = true;
            b.mouseChildren = false;
            var draw:Function = function(fill:uint):void {
                b.graphics.clear();
                b.graphics.lineStyle(1, 0x5A3A1A, 1);
                b.graphics.beginFill(fill, 1);
                b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
                b.graphics.endFill();
            };
            draw(0xF2D98C);
            var t:TextField = b.addChild(label(text, 11, 0x2A1A0A, true, width, TextFormatAlign.CENTER)) as TextField;
            t.wordWrap = false;
            t.height = 19;
            t.y = int((height - 19) / 2);
            b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    draw(0xFFE9A8);
                });
            b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    draw(0xF2D98C);
                });
            b.addEventListener(MouseEvent.CLICK, onClick);
            return b;
        }
    }
}
