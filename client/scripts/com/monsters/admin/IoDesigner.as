package com.monsters.admin {
    import com.monsters.enums.EnumYardType;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.events.TimerEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;
    import flash.utils.Timer;

    /**
     * Inferno-only: the Designer, for admins (the Designer button next to Admin in the top bar). A list of
     * the outpost kits, every wild tribe level and Moloch's 13 bases, each with Edit. Edit opens the layout
     * as a yard of its own (a "draft", server services/admin/designs.ts), built with the game's own tools:
     * everything is free and finished at once (GLOBAL.ioFreeBuild). Kits keep an outpost's buildings and limits;
     * wild tribes and Moloch's bases have no building limits and no yard edge (GLOBAL.ioDesignFree).
     *
     * While a draft is on screen the design bar under the top bar says which one, with Save (the layout is
     * used from then on), Reset (back to the stock layout), Monsters (tribes and Moloch: how many of each monster
     * live in its Compounds and at what level; the Monsters window), Designer (the list) and Exit (home). Leaving a
     * draft without Save keeps the layout as it was: the next Edit starts afresh from what is saved.
     *
     * Server: POST admin/design (controllers/admin/adminDesign.ts), flag io_design on the draft's load.
     */
    public class IoDesigner {

        private static const W:int = 680;

        private static const H:int = 640;

        private static const TABS:Array = [["kits", "Outpost kits"], ["tribes", "Wild tribes"], ["moloch", "Moloch's bases"]];

        private static var _tab:int = 1;

        private static var _open:IoDesigner = null;

        private static var _busy:Boolean = false;

        private var _mc:MovieClip;

        private var _list:Sprite;

        private var _tabs:Array = [];

        private var _data:Object;

        // ---- the list

        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open._mc || !_open._mc.stage)) {
                _open = null;
            }
            if (_open || _busy || !isAdmin()) {
                return;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while the yard is being attacked.");
                return;
            }
            SOUNDS.Play("click1");
            _busy = true;
            PLEASEWAIT.Show("Opening the Designer...");
            call("list", [], function(serverData:Object):void {
                    _busy = false;
                    PLEASEWAIT.Hide();
                    _open = new IoDesigner(serverData);
                }, function(message:String):void {
                    _busy = false;
                    PLEASEWAIT.Hide();
                    GLOBAL.Message(message);
                });
        }

        private static function isAdmin():Boolean {
            return GLOBAL.INFERNO_ONLY && GLOBAL._flags && int(GLOBAL._flags.io_admin) == 1;
        }

        public function IoDesigner(data:Object) {
            super();
            this._data = data;
            this._mc = new MovieClip();
            var fx:int = -int(W / 2);
            var fy:int = -int(H / 2);
            var frame:frame_CLIP = this._mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = W;
            frame.height = H;
            frame.x = fx;
            frame.y = fy;
            frame.Setup(true, this.close);

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
            title.text = "Designer";
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = fx + 28;
            title.y = fy + 24;

            var i:int = 0;
            while (i < TABS.length) {
                this._tabs.push(this.add(button(TABS[i][1], 150, 26, this.tabClick(i)), fx + 28 + i * 158, fy + 64));
                i++;
            }
            this._list = this._mc.addChild(new Sprite()) as Sprite;
            this._list.x = fx + 28;
            this._list.y = fy + 102;

            var ok:Button_CLIP = this._mc.addChild(new Button_CLIP()) as Button_CLIP;
            ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
            ok.x = -int(ok.width * 0.5);
            ok.y = fy + H - 58;
            ok.addEventListener(MouseEvent.CLICK, this.close);

            this.showTab();
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this._mc);
            POPUPSETTINGS.AlignToCenter(this._mc);
            POPUPSETTINGS.ScaleUp(this._mc);
        }

        public function close(e:MouseEvent = null):void {
            if (!this._mc) {
                return;
            }
            GLOBAL.BlockerRemove();
            if (this._mc.parent) {
                this._mc.parent.removeChild(this._mc);
            }
            this._mc = null;
            if (_open == this) {
                _open = null;
            }
        }

        /** Closes the list (the yard is going: BASE.Cleanup). */
        public static function ioCloseOpen():void {
            if (_open) {
                _open.close();
            }
            _open = null;
            closeMonsters();
        }

        private function tabClick(index:int):Function {
            return function(e:MouseEvent):void {
                _tab = index;
                showTab();
            };
        }

        private function showTab():void {
            var row:Object = null;
            var y:int = 0;
            var i:int = 0;
            var rows:Array = this._data && this._data[TABS[_tab][0]] is Array ? this._data[TABS[_tab][0]] as Array : [];
            while (this._list.numChildren) {
                this._list.removeChildAt(0);
            }
            i = 0;
            while (i < this._tabs.length) {
                Sprite(this._tabs[i]).alpha = i == _tab ? 1 : 0.6;
                i++;
            }
            var help:String = _tab == 0
                ? "An outpost kit is designed in an outpost, with an outpost's buildings and limits. Save writes the kit players buy from the kit popup."
                : _tab == 1
                ? "Each level of each tribe's yards. No building limits and no yard edge. Yards already on the map keep their layout until they are made again (Remake)."
                : "The Gauntlet's gates, I to XIII; the late ones are the Moloch strongholds on the map too. No building limits and no yard edge.";
            var h:TextField = this._list.addChild(label(help, 10, 0x3A2A1A, false, W - 56, TextFormatAlign.LEFT)) as TextField;
            h.y = 0;
            y = 34;
            for each (row in rows) {
                this.addRow(row, y);
                y += 22;
            }
        }

        private function addRow(row:Object, y:int):void {
            var kind:String = String(row.kind);
            var key:String = String(row.key);
            var name:TextField = this._list.addChild(label(String(row.name), 11, 0x2A1A0A, true, 270, TextFormatAlign.LEFT)) as TextField;
            name.wordWrap = false;
            name.height = 19;
            name.y = y + 2;
            var status:String = row.custom ? (kind == "kit" ? "changed" : "designed") + (row.by ? " by " + row.by : "") : kind == "kit" ? "as exported" : "stock";
            status += " · " + int(row.buildings) + " buildings";
            if (kind != "kit") {
                status += " · " + int(row.monsters) + " monsters";
            }
            if (row.note) {
                status += " · " + row.note;
            }
            var s:TextField = this._list.addChild(label(status, 9, row.custom ? 0x8A2A00 : 0x5A4A3A, false, 200, TextFormatAlign.LEFT)) as TextField;
            s.wordWrap = false;
            s.height = 17;
            s.x = 272;
            s.y = y + 3;
            var b:Sprite = this._list.addChild(button("Edit", 50, 21, function(e:MouseEvent):void {
                    edit(kind, key);
                })) as Sprite;
            b.x = 440;
            b.y = y;
            if (row.custom) {
                b = this._list.addChild(button("Reset", 54, 21, function(e:MouseEvent):void {
                        resetClick(kind, key, String(row.name));
                    })) as Sprite;
                b.x = 494;
                b.y = y;
                if (kind != "kit") {
                    b = this._list.addChild(button("Remake", 64, 21, function(e:MouseEvent):void {
                            remakeClick(kind, key, String(row.name));
                        })) as Sprite;
                    b.x = 552;
                    b.y = y;
                }
            }
        }

        private function refresh():void {
            var self:IoDesigner = this;
            call("list", [], function(serverData:Object):void {
                    self._data = serverData;
                    if (self._mc) {
                        self.showTab();
                    }
                }, GLOBAL.Message);
        }

        private function resetClick(kind:String, key:String, name:String):void {
            var self:IoDesigner = this;
            GLOBAL.Message("<b>Put " + name + " back as it was?</b><br><br>" + (kind == "kit" ? "The kit goes back to how it was before it was first changed in the Designer." : "The stock layout is used again."), "Reset", function():void {
                    call("reset", [["kind", kind], ["key", key]], function(serverData:Object):void {
                            self.refresh();
                            afterChange("<b>" + name + " is back to its stock layout.</b>", kind, key, int(serverData.stored));
                        }, GLOBAL.Message);
                });
        }

        private function remakeClick(kind:String, key:String, name:String):void {
            GLOBAL.Message("<b>Make " + name + "'s yards on the map again?</b><br><br>Yards made before the layout changed keep their old one until they are made again. This makes them again now, with the layout in use (destroyed yards and yards being attacked right now are left).", "Make again", function():void {
                    remake(kind, key);
                });
        }

        // ---- opening a layout

        private static function edit(kind:String, key:String):void {
            if (_busy) {
                return;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while the yard is being attacked.");
                return;
            }
            if (GLOBAL.ioDesignMode()) {
                GLOBAL.Message("<b>Leave this design?</b><br><br>Changes you haven't saved with Save are lost.", "Leave", function():void {
                        open(kind, key);
                    });
                return;
            }
            open(kind, key);
        }

        private static function open(kind:String, key:String):void {
            _busy = true;
            PLEASEWAIT.Show("Opening the design...");
            whenSaved(function():void {
                    call("open", [["kind", kind], ["key", key]], function(serverData:Object):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            ioCloseOpen();
                            // A kit is designed in an outpost (its buildings and limits); the rest as a main yard.
                            BASE.LoadBase(null, 0, Number(serverData.baseid), GLOBAL.e_BASE_MODE.BUILD, false, kind == "kit" ? EnumYardType.OUTPOST : EnumYardType.MAIN_YARD);
                        }, function(message:String):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            GLOBAL.Message(message);
                        });
                });
        }

        // ---- the Monsters window (tribes and Moloch): the monsters in the yard's Compounds, and their levels

        private static const MON_W:int = 620;

        private static const MON_H:int = 660;

        private static const MAX_OF_ONE:int = 999;

        private static var _mon:MovieClip = null;

        private static var _monCounts:Object = null;

        private static var _monLevels:Object = null;

        private static var _monRoom:TextField = null;

        /** The monsters the window offers: every Inferno monster there is (and Rezghul while he is one). */
        public static function monsterIds():Array {
            var out:Array = [];
            for each (var id:String in CREATURELOCKER.ioTestMonsterIds()) {
                // (Hell Freezes Over's monsters are hidden from players, not from the Designer)
                if (CREATURELOCKER._creatures[id] && (!CREATURELOCKER._creatures[id].blocked || CREATURELOCKER.ioIsIceMonster(id))) {
                    out.push(id);
                }
            }
            return out;
        }

        /** How many of each the draft has now (as it loaded), and each monster's level. */
        private static function readDefenders():void {
            _monCounts = {};
            _monLevels = {};
            var raw:Object = BASE._rawMonsters;
            var from:Object = raw && raw.housed ? raw.housed : raw;
            var id:String = null;
            for (id in from) {
                if (from[id] is Array) {
                    _monCounts[id] = (from[id] as Array).length;
                }
                else if (!isNaN(Number(from[id]))) {
                    _monCounts[id] = int(from[id]);
                }
            }
            for each (id in monsterIds()) {
                var up:Object = GLOBAL.player && GLOBAL.player.m_upgrades ? GLOBAL.player.m_upgrades[id] : null;
                _monLevels[id] = Math.max(1, Math.min(6, up && up.level ? int(up.level) : 1));
                if (!_monCounts[id]) {
                    _monCounts[id] = 0;
                }
            }
        }

        private static function roomUsed():int {
            var used:int = 0;
            for each (var id:String in monsterIds()) {
                used += int(_monCounts[id]) * int(CREATURES.GetProperty(id, "cStorage", 0, true));
            }
            return used;
        }

        private static function roomHas():int {
            HOUSING.HousingSpace();
            return HOUSING._housingCapacity ? HOUSING._housingCapacity.Get() : 0;
        }

        public static function monstersClick(e:MouseEvent = null):void {
            var design:Object = GLOBAL.ioDesign();
            if (_busy || !design || int(design.free) != 1) {
                return;
            }
            if (_mon) {
                closeMonsters();
            }
            readDefenders();
            var mc:MovieClip = new MovieClip();
            _mon = mc;
            var fx:int = -int(MON_W / 2);
            var fy:int = -int(MON_H / 2);
            var frame:frame_CLIP = mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = MON_W;
            frame.height = MON_H;
            frame.x = fx;
            frame.y = fy;
            frame.Setup(true, closeMonsters);
            var title:TextField = mc.addChild(label("Monsters in the Compounds", 16, 0x2A1A0A, true, MON_W - 56, TextFormatAlign.CENTER)) as TextField;
            title.x = fx + 28;
            title.y = fy + 26;
            var help:TextField = mc.addChild(label("How many of each live in this yard's Compounds, and at what level (1-6). They defend it. As many as its Compounds hold (build more here for more room); Save stores them with the layout.", 10, 0x3A2A1A, false, MON_W - 56, TextFormatAlign.LEFT)) as TextField;
            help.x = fx + 28;
            help.y = fy + 56;
            _monRoom = mc.addChild(label("", 11, 0x2A1A0A, true, MON_W - 56, TextFormatAlign.LEFT)) as TextField;
            _monRoom.name = "ioMonRoom";
            _monRoom.x = fx + 28;
            _monRoom.y = fy + 90;
            var y:int = fy + 116;
            for each (var id:String in monsterIds()) {
                addMonsterRow(mc, id, fx + 28, y);
                y += 27;
            }
            var apply:Sprite = mc.addChild(button("Apply", 100, 28, applyMonsters)) as Sprite;
            apply.x = -106;
            apply.y = fy + MON_H - 62;
            var cancel:Sprite = mc.addChild(button("Cancel", 100, 28, closeMonsters)) as Sprite;
            cancel.x = 6;
            cancel.y = fy + MON_H - 62;
            showRoom();
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(mc);
            POPUPSETTINGS.AlignToCenter(mc);
            POPUPSETTINGS.ScaleUp(mc);
        }

        private static function addMonsterRow(mc:MovieClip, id:String, x:int, y:int):void {
            var data:Object = CREATURELOCKER._creatures[id];
            var name:TextField = mc.addChild(label(KEYS.Get(data.name), 11, 0x2A1A0A, true, 150, TextFormatAlign.LEFT)) as TextField;
            name.wordWrap = false;
            name.height = 19;
            name.x = x;
            name.y = y + 2;
            var size:TextField = mc.addChild(label(int(CREATURES.GetProperty(id, "cStorage", 0, true)) + " room", 9, 0x5A4A3A, false, 60, TextFormatAlign.LEFT)) as TextField;
            size.wordWrap = false;
            size.height = 17;
            size.x = x + 150;
            size.y = y + 4;
            var count:TextField = mc.addChild(label(String(_monCounts[id]), 12, 0x2A1A0A, true, 44, TextFormatAlign.CENTER)) as TextField;
            count.name = "ioMonCount_" + id;
            count.wordWrap = false;
            count.height = 20;
            count.x = x + 290;
            count.y = y + 1;
            var level:TextField = mc.addChild(label("L" + _monLevels[id], 12, 0x2A1A0A, true, 34, TextFormatAlign.CENTER)) as TextField;
            level.name = "ioMonLevel_" + id;
            level.wordWrap = false;
            level.height = 20;
            level.x = x + 482;
            level.y = y + 1;
            var put:Function = function(b:Sprite, bx:int, name:String):void {
                b.name = name;
                b.x = bx;
                b.y = y;
                mc.addChild(b);
            };
            var changeCount:Function = function(by:int):Function {
                return function(e:MouseEvent):void {
                    _monCounts[id] = Math.max(0, Math.min(MAX_OF_ONE, int(_monCounts[id]) + by));
                    count.text = String(_monCounts[id]);
                    showRoom();
                };
            };
            var changeLevel:Function = function(by:int):Function {
                return function(e:MouseEvent):void {
                    _monLevels[id] = Math.max(1, Math.min(6, int(_monLevels[id]) + by));
                    level.text = "L" + _monLevels[id];
                };
            };
            put(button("-10", 34, 22, changeCount(-10)), x + 214, "ioMon_" + id + "_m10");
            put(button("-", 34, 22, changeCount(-1)), x + 252, "ioMon_" + id + "_m1");
            put(button("+", 34, 22, changeCount(1)), x + 338, "ioMon_" + id + "_p1");
            put(button("+10", 34, 22, changeCount(10)), x + 376, "ioMon_" + id + "_p10");
            put(button("-", 30, 22, changeLevel(-1)), x + 448, "ioMon_" + id + "_lm");
            put(button("+", 30, 22, changeLevel(1)), x + 520, "ioMon_" + id + "_lp");
        }

        private static function showRoom():void {
            if (!_monRoom) {
                return;
            }
            var used:int = roomUsed();
            var has:int = roomHas();
            _monRoom.htmlText = "Room in the Compounds: " + (used > has ? "<font color=\"#CC0000\">" + used + "</font>" : String(used)) + " of " + has + (has <= 0 ? " (this yard has no Compound: build one)" : used > has ? " (too many: take some out or build more Compounds)" : "");
        }

        private static function closeMonsters(e:MouseEvent = null):void {
            if (!_mon) {
                return;
            }
            GLOBAL.BlockerRemove();
            if (_mon.parent) {
                _mon.parent.removeChild(_mon);
            }
            _mon = null;
            _monRoom = null;
        }

        /** Puts them in the draft (server), then loads the draft again to show them in its Compounds. */
        private static function applyMonsters(e:MouseEvent = null):void {
            var design:Object = GLOBAL.ioDesign();
            if (_busy || !design || !_mon) {
                return;
            }
            var used:int = roomUsed();
            var has:int = roomHas();
            if (used > has) {
                GLOBAL.Message(has <= 0 ? "This yard has no Compound to hold them: build one first (it's free here)." : "They need " + used + " room and its Compounds hold " + has + ". Take some out or build more Compounds (no limits here).");
                return;
            }
            var counts:Object = {};
            var levels:Object = {};
            for each (var id:String in monsterIds()) {
                if (int(_monCounts[id]) > 0) {
                    counts[id] = int(_monCounts[id]);
                }
                levels[id] = int(_monLevels[id]);
            }
            var baseid:String = String(BASE._loadedBaseID);
            _busy = true;
            closeMonsters();
            PLEASEWAIT.Show("Putting the monsters in...");
            whenSaved(function():void {
                    call("defenders", [["baseid", baseid], ["monsters", JSON.stringify(counts)], ["levels", JSON.stringify(levels)]], function(serverData:Object):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            // the draft again, as saved: its buildings and now these monsters
                            BASE.LoadBase(null, 0, Number(baseid), GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                        }, function(message:String):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            GLOBAL.Message(message);
                        });
                });
        }

        // ---- the design bar (UI_TOP keeps one while a draft is on screen)

        public static function makeBar():Sprite {
            var bar:Sprite = new Sprite();
            var design:Object = GLOBAL.ioDesign();
            bar.graphics.lineStyle(1, 0xFFB050, 1);
            bar.graphics.beginFill(0x2A0A04, 0.88);
            var free:Boolean = design && int(design.free) == 1;
            bar.graphics.drawRoundRect(0, 0, free ? 710 : 620, 50, 10, 10);
            bar.graphics.endFill();
            var t:TextField = bar.addChild(label("DESIGNING: " + (design ? String(design.title) : ""), 12, 0xFFD58A, true, 600, TextFormatAlign.LEFT)) as TextField;
            t.name = "ioTitle";
            t.wordWrap = false;
            t.width = 314;
            t.height = 20;
            t.x = 10;
            t.y = 3;
            fitText(t, 312);
            var n:TextField = bar.addChild(label(design && int(design.free) == 1 ? "Free and instant; no building limits and no yard edge." : "Free and instant; an outpost's buildings and limits.", 9, 0xE0C8A0, false, 340, TextFormatAlign.LEFT)) as TextField;
            n.wordWrap = false;
            n.height = 16;
            n.x = 10;
            n.y = 25;
            var x:int = 330;
            // (tribes and Moloch: Monsters, for the monsters in the Compounds)
            var specs:Array = free ? [["Save", 64, saveClick], ["Reset", 64, barResetClick], ["Monsters", 84, monstersClick], ["Designer", 84, Show], ["Exit", 56, exitClick]] : [["Save", 64, saveClick], ["Reset", 64, barResetClick], ["Designer", 84, Show], ["Exit", 56, exitClick]];
            for each (var spec:Array in specs) {
                var b:Sprite = bar.addChild(button(spec[0], spec[1], 26, spec[2])) as Sprite;
                b.x = x;
                b.y = 12;
                x += int(spec[1]) + 6;
            }
            return bar;
        }

        /** Keeps a one-line label within `width`: a smaller size first, then cut short with an ellipsis. */
        private static function fitText(t:TextField, width:int):void {
            var tf:TextFormat = t.getTextFormat();
            var size:int = int(tf.size);
            while (t.textWidth > width && size > 10) {
                size--;
                tf.size = size;
                t.setTextFormat(tf);
            }
            var text:String = t.text;
            while (t.textWidth > width && text.length > 4) {
                text = text.substr(0, text.length - 2);
                t.text = text + "...";
                t.setTextFormat(tf);
            }
        }

        /** Saves the draft, then makes it the layout in use. */
        private static function saveClick(e:MouseEvent = null):void {
            var design:Object = GLOBAL.ioDesign();
            if (_busy || !design) {
                return;
            }
            _busy = true;
            PLEASEWAIT.Show("Saving the design...");
            whenSaved(function():void {
                    call("save", [["baseid", String(BASE._loadedBaseID)]], function(serverData:Object):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            var text:String = "<b>Saved: " + String(serverData.saved) + "</b> (" + int(serverData.buildings) + " buildings).";
                            if (String(design.kind) == "kit") {
                                text += "<br><br>Players get it from the kit popup from now on.";
                            }
                            afterChange(text, String(design.kind), String(design.key), int(serverData.stored));
                        }, function(message:String):void {
                            _busy = false;
                            PLEASEWAIT.Hide();
                            GLOBAL.Message(message);
                        });
                });
        }

        private static function barResetClick(e:MouseEvent = null):void {
            var design:Object = GLOBAL.ioDesign();
            if (_busy || !design) {
                return;
            }
            var kind:String = String(design.kind);
            var key:String = String(design.key);
            GLOBAL.Message("<b>Put this layout back as it was?</b><br><br>" + (kind == "kit" ? "The kit goes back to how it was before it was first changed in the Designer." : "The stock layout is used again.") + " Changes on screen are lost.", "Reset", function():void {
                    _busy = true;
                    call("reset", [["kind", kind], ["key", key]], function(serverData:Object):void {
                            _busy = false;
                            var stored:int = int(serverData.stored);
                            open(kind, key);
                            if (stored > 0) {
                                afterChange("<b>Back to the stock layout.</b>", kind, key, stored);
                            }
                        }, function(message:String):void {
                            _busy = false;
                            GLOBAL.Message(message);
                        });
                });
        }

        private static function exitClick(e:MouseEvent = null):void {
            if (_busy) {
                return;
            }
            GLOBAL.Message("<b>Leave the Designer?</b><br><br>Changes you haven't saved with Save are lost.", "Leave", function():void {
                    _busy = true;
                    BASE._blockSave = true;
                    // (the draft is gone on the server: nothing more is saved to it; loading the home yard lets saves
                    // through again)
                    var home:Function = function():void {
                        _busy = false;
                        ioCloseOpen();
                        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                    };
                    call("close", [], function(serverData:Object):void {
                            home();
                        }, function(message:String):void {
                            home();
                        });
                });
        }

        /** Tells what happened; for a tribe level or Moloch base with yards stored on the map, offers to remake them. */
        private static function afterChange(text:String, kind:String, key:String, stored:int):void {
            if (kind == "kit" || stored <= 0) {
                GLOBAL.Message(text);
                return;
            }
            GLOBAL.Message(text + "<br><br>" + stored + " yard" + (stored == 1 ? "" : "s") + " of it on the map " + (stored == 1 ? "was" : "were") + " made with the old layout. Make " + (stored == 1 ? "it" : "them") + " again now?", "Make again", function():void {
                    remake(kind, key);
                });
        }

        private static function remake(kind:String, key:String):void {
            call("replace", [["kind", kind], ["key", key]], function(serverData:Object):void {
                    var n:int = int(serverData.replaced);
                    GLOBAL.Message(n + " yard" + (n == 1 ? "" : "s") + " made again with the layout in use.");
                }, GLOBAL.Message);
        }

        // ---- server

        /** Runs `then` once every change to the yard on screen is saved (at most 8 seconds). */
        private static function whenSaved(then:Function):void {
            var deadline:int = GLOBAL.Timestamp() + 8;
            var wait:Timer = new Timer(200);
            try {
                BASE.Save(0, false, true);
            }
            catch (e:Error) {
            }
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

        /** One Designer request; `fail` also runs when no answer comes within 30 seconds. */
        private static function call(action:String, vars:Array, ok:Function, fail:Function):void {
            var answered:Boolean = false;
            var timeout:Timer = new Timer(30000, 1);
            timeout.addEventListener(TimerEvent.TIMER_COMPLETE, function(e:TimerEvent):void {
                    if (!answered) {
                        answered = true;
                        fail("Designer: no answer from the server. Please try again.");
                    }
                });
            timeout.start();
            new URLLoaderApi().load(GLOBAL.serverUrl + "admin/design", [["action", action]].concat(vars), function(serverData:Object):void {
                    if (answered) {
                        return;
                    }
                    answered = true;
                    timeout.stop();
                    if (serverData && serverData.error == 0) {
                        ok(serverData);
                    }
                    else {
                        fail(serverData && serverData.error ? String(serverData.error) : "Designer: no answer from the server.");
                    }
                }, function(e:Event):void {
                    if (answered) {
                        return;
                    }
                    answered = true;
                    timeout.stop();
                    fail("Designer: the server could not be reached. Please try again.");
                });
        }

        // ---- helpers

        private function add(b:Sprite, x:int, y:int):Sprite {
            this._mc.addChild(b);
            b.x = x;
            b.y = y;
            return b;
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

        private static function button(text:String, width:int, height:int, onClick:Function):Sprite {
            var b:Sprite = new Sprite();
            b.buttonMode = true;
            b.mouseChildren = false;
            b.name = "io_" + text;
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
