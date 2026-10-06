package com.monsters.leaderboards {
    import com.monsters.chat.BYMChat;
    import com.monsters.replays.IoReplays;
    import flash.geom.Point;
    import com.monsters.casino.CasinoUI;
    import com.monsters.maproom_advanced.IoMapShare;
    import com.monsters.maproom_advanced.IoMapUi;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only (3 October): the attack logs, opened by the top bar's button right of the leaderboards
     * (UI_TOP.ioAttackLogsButton). Two tabs:
     *
     *  - My attacks:    every yard the player attacked (players' yards and outposts, tribe and Moloch yards);
     *  - Attacks on me: every attack on the player's yards and outposts.
     *
     * Each row: when, the other side (the tribe's name for a wild yard), the yard (main yard, outpost, a tribe
     * yard's level), the damage done (or "in progress"), the loot taken. Report opens the attack's battle report
     * (what the attacking game wrote: monsters sent, buildings destroyed, loot), with all the details; Jump opens
     * the map on the yard.
     *
     * Data: the server's logs (attacklogs/game: controllers/attacklogs/getGameAttackLogs.ts), asked for each time
     * the window opens (and Refresh); a report is asked for when it is opened. The logs are written by the
     * server when an attack starts (createAttackLog) and brought up to date by each of its saves (updateAttackLog).
     */
    public class IoAttackLogs {

        public static const W:int = 780;

        public static const H:int = 560;

        private static const ROW_H:int = 30;

        private static const LIST_X:int = -W / 2 + 20;

        private static const LIST_W:int = W - 40;

        private static const LIST_TOP:int = -H / 2 + 176;

        private static const LIST_H:int = 10 * ROW_H + 2;

        private static const BAR_W:int = 12;

        private static const ROW_W:int = LIST_W - BAR_W - 10;

        private static const WHEEL_PX:int = 3 * ROW_H;

        private static const JUMP_W:int = 52;

        private static const REPORT_W:int = 64;

        /** The columns: key, text key, width, alignment. */
        /** (3 October, night: narrower name and yard columns, for the Replay button) */
        private static const COLUMNS:Array = [["when", "al_col_when", 100, "left"], ["name", "al_col_name", 132, "left"], ["yard", "al_col_yard", 96, "left"], ["result", "al_col_result", 90, "right"], ["loot", "al_col_loot", 106, "right"]];

        private static const REPLAY_W:int = 58;

        private static var _open:IoAttackLogs = null;

        private static var _tab:int = 0;

        public var mc:MovieClip;

        private var _data:Object = null;

        private var _loading:Boolean = false;

        private var _failed:Boolean = false;

        private var _tabs:Array = [];

        private var _status:TextField;

        private var _count:TextField;

        private var _list:Object;

        private var _rows:Sprite;

        private var _detail:Sprite = null;

        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open.mc || !_open.mc.stage)) {
                _open = null;
            }
            if (_open) {
                return;
            }
            SOUNDS.Play("click1");
            _open = new IoAttackLogs();
        }

        public static function get isOpen():Boolean {
            return _open != null;
        }

        /** Closes it (the yard is going). */
        public static function CloseOpen():void {
            if (_open) {
                _open.close();
            }
            _open = null;
        }

        public function IoAttackLogs() {
            super();
            this.mc = new MovieClip();
            this.mc.name = "ioAttackLogsWindow";
            this.drawFrame();
            var title:TextField = this.mc.addChild(CasinoUI.title(KEYS.Get("al_title"), 34, W - 200)) as TextField;
            title.x = -W / 2 + 100;
            title.y = -H / 2 + 24;
            var names:Array = ["al_tab_mine", "al_tab_onme"];
            for (var i:int = 0; i < names.length; i++) {
                var tab:Sprite = CasinoUI.toggle(KEYS.Get(names[i]), 150, 28, this.tabClick(i));
                tab.name = "ioAlTab" + i;
                tab.x = LIST_X + i * 158;
                tab.y = -H / 2 + 110;
                this.mc.addChild(tab);
                this._tabs.push(tab);
            }
            var refresh:Sprite = this.mc.addChild(CasinoUI.button(KEYS.Get("al_refresh"), 104, 28, function(e:MouseEvent):void {
                    fetch();
                }, true, 13)) as Sprite;
            refresh.name = "ioAlRefresh";
            refresh.x = W / 2 - 20 - 104;
            refresh.y = -H / 2 + 110;
            // the column heads
            var heads:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            heads.x = LIST_X;
            heads.y = LIST_TOP - 26;
            var x:int = 2;
            for each (var column:Array in COLUMNS) {
                var t:TextField = heads.addChild(CasinoUI.label(KEYS.Get(column[1]), 12, CasinoUI.GOLD, true, column[2] - 8, column[3])) as TextField;
                t.x = x + 4;
                t.y = 2;
                GLOBAL.ioFitText(t);
                x += column[2];
            }
            this._list = scrollView(this.mc, LIST_X, LIST_TOP, LIST_W, LIST_H);
            this._rows = this._list.content;
            this._status = this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, LIST_W - 40, TextFormatAlign.CENTER)) as TextField;
            this._status.x = LIST_X + 20;
            this._status.y = LIST_TOP + 40;
            this._count = this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, 300, TextFormatAlign.RIGHT)) as TextField;
            this._count.x = LIST_X + LIST_W - 300;
            this._count.y = LIST_TOP + LIST_H + 8;
            // Inferno-only (3 October): a downloaded replay opened again (IoReplays.Open)
            var openFile:Sprite = this.mc.addChild(CasinoUI.button(KEYS.Get("al_replay_open"), 150, 24, function(e:MouseEvent):void {
                    close();
                    IoReplays.Open();
                }, true, 12)) as Sprite;
            openFile.name = "ioAlOpenReplay";
            openFile.x = LIST_X;
            openFile.y = LIST_TOP + LIST_H + 6;
            var hint:TextField = this.mc.addChild(CasinoUI.label(KEYS.Get("al_hint"), 12, CasinoUI.ASH, false, LIST_W - 310 - 160, TextFormatAlign.LEFT)) as TextField;
            hint.x = LIST_X + 160;
            hint.y = LIST_TOP + LIST_H + 8;
            GLOBAL.ioFitText(hint);
            this.mc.addChild(closeButton("ioAlClose", this.close));
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this.mc);
            POPUPSETTINGS.AlignToCenter(this.mc);
            POPUPSETTINGS.ScaleUp(this.mc);
            this.selectTab(_tab);
            this.fetch();
        }

        private function drawFrame():void {
            frame(this.mc);
        }

        /** The window's frame and art (also the Changelog's, IoChangelog). */
        internal static function frame(mc:MovieClip):void {
            var bg:Sprite = mc.addChild(new Sprite()) as Sprite;
            var m:Matrix = new Matrix();
            m.createGradientBox(W, H, Math.PI / 2, -W / 2, -H / 2);
            bg.graphics.lineStyle(3, 0xE0702A, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
            bg.graphics.drawRoundRect(-W / 2, -H / 2, W, H, 22, 22);
            bg.graphics.endFill();
            bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
            var art:Sprite = mc.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(art.addChild(new Sprite()) as Sprite, "leaderboards/bg.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, H - 12);
            CasinoUI.picture(art.addChild(new Sprite()) as Sprite, "leaderboards/banner.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, 92);
            var mask:Shape = mc.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            mask.graphics.endFill();
            art.mask = mask;
        }

        internal static function closeButton(name:String, onClick:Function):Sprite {
            var x:Sprite = new Sprite();
            x.name = name;
            x.buttonMode = true;
            x.mouseChildren = false;
            x.graphics.lineStyle(2, 0xE0702A, 1);
            x.graphics.beginFill(0x2A0A06, 1);
            x.graphics.drawCircle(0, 0, 14);
            x.graphics.endFill();
            x.graphics.lineStyle(3, 0xFFD58A, 1);
            x.graphics.moveTo(-5, -5);
            x.graphics.lineTo(5, 5);
            x.graphics.moveTo(5, -5);
            x.graphics.lineTo(-5, 5);
            x.x = W / 2 - 24;
            x.y = -H / 2 + 24;
            x.addEventListener(MouseEvent.CLICK, onClick);
            return x;
        }

        // ---- a scrolling view: a panel, its masked content, a bar (the wheel, the bar's track and thumb)

        internal static function scrollView(parent:Sprite, x:int, y:int, w:int, h:int):Object {
            var view:Object = {"offset": 0, "h": h - 2};
            var box:Sprite = parent.addChild(CasinoUI.panel(w, h, 0.9)) as Sprite;
            box.x = x;
            box.y = y;
            var holder:Sprite = parent.addChild(new Sprite()) as Sprite;
            holder.x = x + 2;
            holder.y = y + 1;
            // (the empty part of the view takes the wheel too)
            holder.graphics.beginFill(0, 0);
            holder.graphics.drawRect(0, 0, w - 4, h - 2);
            holder.graphics.endFill();
            var content:Sprite = holder.addChild(new Sprite()) as Sprite;
            var mask:Shape = holder.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRect(0, 0, w - 4, h - 2);
            mask.graphics.endFill();
            content.mask = mask;
            var track:Sprite = holder.addChild(new Sprite()) as Sprite;
            track.graphics.beginFill(0x2A1A16, 1);
            track.graphics.drawRoundRect(0, 0, BAR_W, h - 6, 8, 8);
            track.graphics.endFill();
            track.x = w - BAR_W - 6;
            track.y = 2;
            track.buttonMode = true;
            var thumb:Sprite = holder.addChild(new Sprite()) as Sprite;
            thumb.x = track.x;
            thumb.buttonMode = true;
            view.content = content;
            view.track = track;
            view.thumb = thumb;
            view.total = 0;
            var dragFrom:Number = 0;
            var place:Function = function():void {
                var max:Number = Math.max(0, view.total - view.h);
                view.offset = Math.max(0, Math.min(max, view.offset));
                content.y = -view.offset;
                if (thumb.visible) {
                    var room:Number = track.height - thumb.height;
                    thumb.y = 2 + (max > 0 ? Math.round(room * view.offset / max) : 0);
                }
            };
            var move:Function = function(e:MouseEvent):void {
                var room:Number = track.height - thumb.height;
                var ty:Number = Math.max(0, Math.min(room, holder.mouseY - dragFrom - 2));
                view.offset = room > 0 ? ty / room * Math.max(0, view.total - view.h) : 0;
                place();
            };
            var up:Function = function(e:Event = null):void {
                if (GLOBAL._ROOT.stage) {
                    GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
                    GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, up);
                }
            };
            var wheel:Function = function(e:MouseEvent):void {
                    e.stopPropagation();
                    view.offset += (e.delta > 0 ? -1 : 1) * WHEEL_PX;
                    place();
                };
            holder.addEventListener(MouseEvent.MOUSE_WHEEL, wheel);
            // (and on the panel under it: the browser client doesn't hit an empty part of the holder)
            box.addEventListener(MouseEvent.MOUSE_WHEEL, wheel);
            track.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    var page:Number = view.h - ROW_H;
                    view.offset += holder.mouseY < thumb.y ? -page : page;
                    place();
                });
            thumb.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                    dragFrom = holder.mouseY - thumb.y;
                    GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
                    GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, up);
                });
            content.addEventListener(Event.REMOVED_FROM_STAGE, up);
            view.place = place;
            view.stop = up;
            /** The content is `total` tall now (back to the top when `top`). */
            view.setTotal = function(total:Number, top:Boolean):void {
                view.total = total;
                if (top) {
                    view.offset = 0;
                }
                var show:Boolean = total > view.h;
                track.visible = thumb.visible = show;
                if (show) {
                    var thumbH:int = Math.max(28, int((view.h - 4) * view.h / total));
                    thumb.graphics.clear();
                    thumb.graphics.lineStyle(1, 0xFFC060, 1);
                    thumb.graphics.beginFill(0xC8501A, 1);
                    thumb.graphics.drawRoundRect(0, 0, BAR_W, thumbH, 8, 8);
                    thumb.graphics.endFill();
                }
                place();
            };
            return view;
        }

        // ---- tabs, rows

        private function tabClick(i:int):Function {
            return function(e:MouseEvent):void {
                selectTab(i);
            };
        }

        public function selectTab(i:int):void {
            _tab = i;
            for (var k:int = 0; k < this._tabs.length; k++) {
                CasinoUI.choose(this._tabs[k], k == i);
            }
            this.closeDetail();
            this.fill(true);
        }

        private function logs():Array {
            return this._data ? (_tab == 0 ? this._data.mine : this._data.onme) as Array : [];
        }

        private function fill(top:Boolean):void {
            if (!this.mc) {
                return;
            }
            CasinoUI.removeAll(this._rows);
            var list:Array = this.logs();
            this._status.text = this._data ? (list.length ? "" : KEYS.Get(_tab == 0 ? "al_none_mine" : "al_none_onme")) : (this._failed ? KEYS.Get("al_failed") : KEYS.Get("al_loading"));
            this._count.text = !this._data ? "" : (list.length == 1 ? KEYS.Get("al_count_one") : KEYS.Get("al_count", {"v1": GLOBAL.FormatNumber(list.length)}));
            for (var i:int = 0; i < list.length; i++) {
                var line:Sprite = this.makeRow(list[i], i);
                line.y = i * ROW_H;
                this._rows.addChild(line);
            }
            this._list.setTotal(list.length * ROW_H, top);
        }

        private function makeRow(log:Object, index:int):Sprite {
            var line:Sprite = new Sprite();
            line.name = "ioAlRow" + index;
            line.graphics.beginFill(index % 2 == 0 ? 0x2A1C18 : 0x221613, 0.85);
            line.graphics.drawRect(0, 0, ROW_W, ROW_H - 1);
            line.graphics.endFill();
            var x:int = 0;
            for each (var column:Array in COLUMNS) {
                var key:String = String(column[0]);
                var cell:TextField = line.addChild(CasinoUI.label(this.cellText(log, key), 12, this.cellColour(log, key), key == "name", column[2] - 8, column[3])) as TextField;
                cell.x = x + 4;
                cell.y = 6;
                GLOBAL.ioFitText(cell);
                x += column[2];
            }
            var report:Sprite = line.addChild(CasinoUI.button(KEYS.Get("al_report"), REPORT_W, 22, function(e:MouseEvent):void {
                    openDetail(log);
                }, true, 12)) as Sprite;
            report.name = "ioAlReport";
            report.x = ROW_W - JUMP_W - REPORT_W - 10;
            report.y = 4;
            // Inferno-only (3 October): a player-against-player attack's replay: Watch, Share, Download
            if (log.replay) {
                var replay:Sprite = line.addChild(CasinoUI.button(KEYS.Get("al_replay"), REPLAY_W, 22, function(e:MouseEvent):void {
                        replayMenu(log, replay);
                    }, true, 12)) as Sprite;
                replay.name = "ioAlReplay";
                replay.x = report.x - REPLAY_W - 6;
                replay.y = 4;
            }
            if (log.x >= 0 && log.y >= 0) {
                var jump:Sprite = line.addChild(CasinoUI.button(KEYS.Get("lb_jump"), JUMP_W, 22, function(e:MouseEvent):void {
                        jumpTo(log);
                    }, true, 12)) as Sprite;
                jump.name = "ioAlJump";
                jump.x = ROW_W - JUMP_W - 4;
                jump.y = 4;
            }
            return line;
        }

        /** "5 min ago", "3 h ago", "2 d ago" (by the server's clock). */
        private function ago(at:int):String {
            var now:int = this._data ? int(this._data.now) + (GLOBAL.Timestamp() - int(this._data.fetchedAt)) : GLOBAL.Timestamp();
            var s:int = Math.max(0, now - at);
            if (s < 60) {
                return KEYS.Get("al_just_now");
            }
            if (s < 3600) {
                return KEYS.Get("al_min_ago", {"v1": int(s / 60)});
            }
            if (s < 86400) {
                return KEYS.Get("al_h_ago", {"v1": int(s / 3600)});
            }
            return KEYS.Get("al_d_ago", {"v1": int(s / 86400)});
        }

        private function yardText(log:Object):String {
            if (log.type == "tribe") {
                return KEYS.Get("al_yard_tribe", {"v1": log.level});
            }
            if (log.type == "outpost") {
                return KEYS.Get("al_yard_outpost");
            }
            return KEYS.Get("al_yard_main");
        }

        private function inProgress(log:Object):Boolean {
            // (an attack lasts minutes: one not ended an hour later was left without its last save)
            var now:int = this._data ? int(this._data.now) : GLOBAL.Timestamp();
            return !log.ended && now - int(log.at) < 3600;
        }

        private function cellText(log:Object, key:String):String {
            switch (key) {
                case "when":
                    return this.ago(int(log.at));
                case "name":
                    return String(log.name);
                case "yard":
                    return this.yardText(log);
                case "result":
                    return this.inProgress(log) ? KEYS.Get("al_in_progress") : KEYS.Get("al_damage", {"v1": log.damage});
                case "loot":
                    var total:Number = lootTotal(log);
                    return total > 0 ? GLOBAL.FormatNumber(total) : "-";
            }
            return "";
        }

        private function cellColour(log:Object, key:String):uint {
            if (key == "name") {
                return CasinoUI.GOLD;
            }
            if (key == "result" && !this.inProgress(log)) {
                return int(log.damage) >= 90 ? CasinoUI.WIN : (int(log.damage) > 0 ? 0xFFD58A : CasinoUI.ASH);
            }
            if (key == "loot" && lootTotal(log) > 0) {
                return _tab == 0 ? CasinoUI.WIN : CasinoUI.LOSS;
            }
            return 0xD8C8B8;
        }

        private static function lootTotal(log:Object):Number {
            var total:Number = 0;
            for each (var n:Number in log.loot as Array) {
                total += n;
            }
            return total;
        }

        private static function lootLines(log:Object):String {
            var parts:Array = [];
            var loot:Array = log.loot as Array;
            for (var i:int = 0; i < 4; i++) {
                if (loot && Number(loot[i]) > 0) {
                    parts.push(GLOBAL.FormatNumber(Number(loot[i])) + " " + KEYS.Get(GLOBAL._resourceNames[i]));
                }
            }
            return parts.length ? parts.join(", ") : KEYS.Get("al_no_loot");
        }

        private function jumpTo(log:Object):void {
            SOUNDS.Play("click1");
            var x:int = int(log.x);
            var y:int = int(log.y);
            this.close();
            IoMapShare.OpenOwnWorld(x, y);
        }

        // ---- a report

        private var _replayMenu:Sprite = null;

        /** A replay's choices, under its button: Watch, Share in Global / Alliance chat, Download. */
        private function replayMenu(log:Object, button:Sprite):void {
            var self:IoAttackLogs = this;
            var key:String = String(log.replay);
            if (this._replayMenu) {
                if (this._replayMenu.parent) {
                    this._replayMenu.parent.removeChild(this._replayMenu);
                }
                var same:Boolean = this._replayMenu.name == "ioAlReplayMenu_" + key;
                this._replayMenu = null;
                if (same) {
                    return;
                }
            }
            var menu:Sprite = CasinoUI.panel(196, 132, 0.98);
            menu.name = "ioAlReplayMenu_" + key;
            var items:Array = [
                    ["ioAlReplayWatch", "al_replay_watch", function():void {
                        self.close();
                        IoReplays.Watch(key);
                    }],
                    ["ioAlReplayGlobal", "al_replay_global", function():void {
                        IoReplays.Share(key, BYMChat.IO_GLOBAL);
                    }],
                    ["ioAlReplayAlliance", "al_replay_alliance", function():void {
                        IoReplays.Share(key, BYMChat.IO_ALLIANCE);
                    }],
                    ["ioAlReplayDownload", "al_replay_download", function():void {
                        IoReplays.Download(key);
                    }]
                ];
            var y:int = 8;
            for each (var item:Array in items) {
                var act:Function = item[2] as Function;
                var b:Sprite = menu.addChild(CasinoUI.button(KEYS.Get(item[1]), 180, 24, actionOf(act, menu), true, 12)) as Sprite;
                b.name = item[0];
                b.x = 8;
                b.y = y;
                y += 30;
            }
            var at:Point = this.mc.globalToLocal(button.localToGlobal(new Point(0, 26)));
            menu.x = Math.min(W / 2 - 200, at.x - 140);
            menu.y = Math.min(H / 2 - 140, at.y);
            this.mc.addChild(menu);
            this._replayMenu = menu;
        }

        private function actionOf(act:Function, menu:Sprite):Function {
            var self:IoAttackLogs = this;
            return function(e:MouseEvent):void {
                if (menu.parent) {
                    menu.parent.removeChild(menu);
                }
                self._replayMenu = null;
                act();
            };
        }

        private function openDetail(log:Object):void {
            this.closeDetail();
            var d:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            d.name = "ioAlDetail";
            this._detail = d;
            // (over the list and the tabs: the window's frame stays)
            var cover:Sprite = d.addChild(CasinoUI.panel(W - 24, H - 112, 0.98)) as Sprite;
            cover.x = -W / 2 + 12;
            cover.y = -H / 2 + 100;
            var heading:String = _tab == 0 ? KEYS.Get("al_detail_mine", {"v1": log.name}) : KEYS.Get("al_detail_onme", {"v1": log.name});
            var head:TextField = d.addChild(CasinoUI.label(heading, 18, CasinoUI.GOLD, true, W - 200, TextFormatAlign.LEFT)) as TextField;
            head.x = LIST_X;
            head.y = -H / 2 + 112;
            GLOBAL.ioFitText(head);
            var back:Sprite = d.addChild(CasinoUI.button(KEYS.Get("al_back"), 90, 28, function(e:MouseEvent):void {
                    closeDetail();
                }, true, 13)) as Sprite;
            back.name = "ioAlBack";
            back.x = W / 2 - 20 - 90;
            back.y = -H / 2 + 110;
            if (log.x >= 0 && log.y >= 0) {
                var jump:Sprite = d.addChild(CasinoUI.button(KEYS.Get("lb_jump"), 70, 28, function(e:MouseEvent):void {
                        jumpTo(log);
                    }, true, 13)) as Sprite;
                jump.name = "ioAlDetailJump";
                jump.x = back.x - 78;
                jump.y = back.y;
            }
            var facts:Array = [
                    [KEYS.Get("al_f_when"), this.ago(int(log.at))],
                    [KEYS.Get("al_f_yard"), this.yardText(log) + (log.x >= 0 ? "  (" + IoMapUi.coord(int(log.x), int(log.y)) + ")" : "")],
                    [KEYS.Get("al_f_result"), this.inProgress(log) ? KEYS.Get("al_in_progress") : KEYS.Get("al_damage", {"v1": log.damage}) + (log.ended ? "" : " " + KEYS.Get("al_unfinished"))],
                    [KEYS.Get("al_f_destroyed"), GLOBAL.FormatNumber(int(log.destroyed))],
                    [KEYS.Get(_tab == 0 ? "al_f_loot" : "al_f_lost"), lootLines(log)]
                ];
            var y:int = -H / 2 + 150;
            for each (var f:Array in facts) {
                var label:TextField = d.addChild(CasinoUI.label(f[0], 13, CasinoUI.ASH, true, 150, TextFormatAlign.LEFT)) as TextField;
                label.x = LIST_X;
                label.y = y;
                GLOBAL.ioFitText(label);
                var value:TextField = d.addChild(CasinoUI.label(f[1], 13, 0xFFF0D8, false, LIST_W - 160, TextFormatAlign.LEFT)) as TextField;
                value.x = LIST_X + 156;
                value.y = y;
                GLOBAL.ioFitText(value);
                y += 22;
            }
            var reportTop:int = y + 8;
            var reportH:int = H / 2 - 24 - reportTop;
            var view:Object = scrollView(d, LIST_X, reportTop, LIST_W, reportH);
            var text:TextField = new TextField();
            text.name = "ioAlReportText";
            text.selectable = false;
            text.mouseEnabled = false;
            text.multiline = true;
            text.wordWrap = true;
            text.width = LIST_W - BAR_W - 24;
            text.x = 8;
            text.y = 6;
            text.defaultTextFormat = new TextFormat("Verdana", 12, 0xE8D8C0);
            text.autoSize = TextFieldAutoSize.LEFT;
            text.text = KEYS.Get("al_loading");
            view.content.addChild(text);
            view.setTotal(text.height + 12, true);
            new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["id", int(log.id)]], function(r:Object):void {
                    if (!d.stage || _detail != d) {
                        return;
                    }
                    var html:String = r && !r.error ? String(r.report || "") : "";
                    if (r && r.error) {
                        text.text = String(r.error);
                    }
                    else if (!html.length) {
                        text.text = KEYS.Get("al_no_report");
                    }
                    else {
                        text.htmlText = "<font face=\"Verdana\" size=\"12\" color=\"#E8D8C0\">" + html + "</font>";
                    }
                    view.setTotal(text.height + 12, true);
                }, function(e:IOErrorEvent):void {
                    if (d.stage && _detail == d) {
                        text.text = KEYS.Get("al_failed");
                        view.setTotal(text.height + 12, true);
                    }
                });
        }

        private function closeDetail():void {
            if (this._detail && this._detail.parent) {
                this._detail.parent.removeChild(this._detail);
            }
            this._detail = null;
        }

        // ---- the server

        private function fetch():void {
            if (this._loading) {
                return;
            }
            this._loading = true;
            this._failed = false;
            if (!this._data) {
                this.fill(true);
            }
            var self:IoAttackLogs = this;
            new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["v", 1]], function(r:Object):void {
                    self._loading = false;
                    if (!r || r.error) {
                        self._failed = true;
                        if (r && r.error) {
                            self._data = null;
                        }
                        self.fill(true);
                        return;
                    }
                    self._data = parse(r);
                    self.fill(false);
                }, function(e:IOErrorEvent):void {
                    self._loading = false;
                    self._failed = true;
                    self.fill(true);
                });
        }

        private static function parse(r:Object):Object {
            var out:Object = {"now": int(r.now) > 0 ? int(r.now) : GLOBAL.Timestamp(), "fetchedAt": GLOBAL.Timestamp(), "mine": [], "onme": []};
            for each (var side:String in ["mine", "onme"]) {
                for each (var row:Array in r[side] as Array || []) {
                    var loot:Array = [];
                    for each (var n:* in row[11] as Array || []) {
                        loot.push(Number(n));
                    }
                    out[side].push({"id": int(row[0]), "at": int(row[1]), "name": String(row[2]), "uid": int(row[3]), "type": String(row[4]), "x": int(row[5]), "y": int(row[6]), "level": int(row[7]), "damage": int(row[8]), "destroyed": int(row[9]), "ended": int(row[10]) == 1, "loot": loot, "replay": row.length > 12 ? String(row[12] || "") : ""});
                }
            }
            return out;
        }

        public function close(e:MouseEvent = null):void {
            if (!this.mc) {
                return;
            }
            SOUNDS.Play("close");
            this._list.stop();
            GLOBAL.BlockerRemove();
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
            }
            this.mc = null;
            if (_open == this) {
                _open = null;
            }
        }
    }
}
