package com.monsters.leaderboards {
    import com.monsters.casino.CasinoUI;
    import com.monsters.maproom_advanced.IoMapShare;
    import com.monsters.maproom_advanced.IoMapSnapshot;
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
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;
    import com.monsters.quests.IoQuests;

    /**
     * Inferno-only: the leaderboards, opened by the top bar's button right of the Shiny (UI_TOP). Three tabs:
     *
     *  - Outposts:  every player, most outposts first (ties: the higher empire value), with their world,
     *               alliance and empire value (the main yard's and every outpost's together);
     *  - Alliances: every alliance, the highest empire value first, with its members' outposts; the arrow
     *               opens its members, each with their empire value and outposts, the highest first;
     *  - Gamblers:  everyone who has bet in the Brimstone Pit, the most gambled first, with the lifetime net.
     *
     * Every world's players are listed, each with their world (named after the owner of its cell 0x0); the
     * World button keeps the list to one. Jump opens the map on a player's main yard when it is on the
     * player's own world. Find me scrolls to the player's own row. Admins are on no list (the server leaves
     * them out).
     *
     * Data: the server's leaderboards (leaderboards/game: services/leaderboards/gameLeaderboards.ts), made on
     * the map snapshots' fixed 5-minute clock. It says when its next one is out (`nextAt`): the game asks
     * again a few seconds after that while the window is open, and never sooner than MIN_GAP after the last
     * answer, however often the window is opened (the user's rule, 2 October). Only the rows in view exist
     * (reused as the list scrolls), so thousands of players list as fast as ten.
     */
    public class IoLeaderboards {

        public static const W:int = 780;

        public static const H:int = 560;

        /** Never asked for sooner than this after the last answer (seconds). */
        public static const MIN_GAP:int = 300;

        private static const ROW_H:int = 28;

        private static const LIST_X:int = -W / 2 + 20;

        private static const LIST_W:int = W - 40;

        private static const LIST_TOP:int = -H / 2 + 176;

        private static const LIST_H:int = 11 * ROW_H + 2;

        private static const BAR_W:int = 12;

        private static const ROW_W:int = LIST_W - BAR_W - 6;

        private static const WHEEL_ROWS:int = 3;

        private static const JUMP_W:int = 52;

        /** Each tab's columns: key, text key, width, alignment. */
        private static const COLUMNS:Array = [
                [["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_player", 170, "left"], ["world", "lb_col_world", 130, "left"], ["alliance", "lb_col_alliance", 130, "left"], ["outposts", "lb_col_outposts", 76, "right"], ["empire", "lb_col_empire", 110, "right"]],
                [["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_alliance", 200, "left"], ["world", "lb_col_world", 130, "left"], ["members", "lb_col_members", 80, "right"], ["outposts", "lb_col_outposts", 80, "right"], ["empire", "lb_col_empire", 126, "right"]],
                [["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_player", 200, "left"], ["world", "lb_col_world", 130, "left"], ["bets", "lb_col_bets", 76, "right"], ["gambled", "lb_col_gambled", 104, "right"], ["net", "lb_col_net", 106, "right"]]
            ];

        // ---- the data (kept between openings)

        private static var _data:Object = null;

        private static var _fetchedAt:int = 0;

        private static var _nextAt:int = 0;

        private static var _dueAt:int = 0;

        private static var _loading:Boolean = false;

        private static var _failedAt:int = 0;

        private static var _open:IoLeaderboards = null;

        /** The tab and world chosen last (kept for the next opening). */
        private static var _tab:int = 0;

        private static var _world:int = -1;

        private static var _expanded:Object = {};

        /** A player to find once the window has its data (the chat's name menu: ShowPlayer). */
        private static var _findUid:int = 0;

        private static var _findName:String = null;

        /** Waiting for the data (JumpToPlayer before any was loaded). */
        private static var _waiters:Array = [];

        // ---- the window

        public var mc:MovieClip;

        private var _tabs:Array = [];

        private var _heads:Sprite;

        private var _holder:Sprite;

        private var _rowsLayer:Sprite;

        private var _pool:Array = [];

        private var _list:Array = [];

        private var _offset:Number = 0;

        private var _track:Sprite;

        private var _thumb:Sprite;

        private var _dragFrom:Number = 0;

        private var _status:TextField;

        private var _footer:TextField;

        private var _count:TextField;

        private var _worldButton:Sprite;

        private var _worldLabel:TextField;

        private var _worldList:Sprite = null;

        private var _ticks:int = 0;

        private var _flashUid:int = 0;

        private var _flashUntil:int = 0;

        /** Opens the window (the top bar's button). */
        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open.mc || !_open.mc.stage)) {
                _open = null;
            }
            if (_open) {
                return;
            }
            SOUNDS.Play("click1");
            _open = new IoLeaderboards();
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

        public function IoLeaderboards() {
            super();
            this.mc = new MovieClip();
            this.mc.name = "ioLeaderboardsWindow";
            this.drawFrame();
            var title:TextField = this.mc.addChild(CasinoUI.title(KEYS.Get("lb_title"), 34, W - 200)) as TextField;
            title.x = -W / 2 + 100;
            title.y = -H / 2 + 24;
            var names:Array = ["lb_tab_outposts", "lb_tab_alliances", "lb_tab_gamblers"];
            for (var i:int = 0; i < names.length; i++) {
                var tab:Sprite = CasinoUI.toggle(KEYS.Get(names[i]), 128, 28, this.tabClick(i));
                tab.name = "ioLbTab" + i;
                tab.x = LIST_X + i * 136;
                tab.y = -H / 2 + 110;
                this.mc.addChild(tab);
                this._tabs.push(tab);
            }
            var me:Sprite = this.mc.addChild(CasinoUI.button(KEYS.Get("lb_find_me"), 104, 28, this.findMe, true, 13)) as Sprite;
            me.name = "ioLbFindMe";
            me.x = W / 2 - 20 - 214 - 112;
            me.y = -H / 2 + 110;
            this._worldButton = this.mc.addChild(this.worldButton()) as Sprite;
            this._worldButton.x = W / 2 - 20 - 214;
            this._worldButton.y = -H / 2 + 110;
            this._heads = this.mc.addChild(new Sprite()) as Sprite;
            this._heads.x = LIST_X;
            this._heads.y = LIST_TOP - 26;
            // the list
            var box:Sprite = this.mc.addChild(CasinoUI.panel(LIST_W, LIST_H, 0.9)) as Sprite;
            box.x = LIST_X;
            box.y = LIST_TOP;
            this._holder = this.mc.addChild(new Sprite()) as Sprite;
            this._holder.x = LIST_X + 2;
            this._holder.y = LIST_TOP + 1;
            this._rowsLayer = this._holder.addChild(new Sprite()) as Sprite;
            var mask:Shape = this._holder.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRect(0, 0, LIST_W - 4, LIST_H - 2);
            mask.graphics.endFill();
            this._rowsLayer.mask = mask;
            this._holder.addEventListener(MouseEvent.MOUSE_WHEEL, this.onWheel);
            var viewRows:int = int(Math.ceil((LIST_H - 2) / ROW_H)) + 1;
            for (var r:int = 0; r < viewRows; r++) {
                this._pool.push(this.makeRow());
            }
            this._track = this._holder.addChild(new Sprite()) as Sprite;
            this._track.graphics.beginFill(0x2A1A16, 1);
            this._track.graphics.drawRoundRect(0, 0, BAR_W, LIST_H - 6, 8, 8);
            this._track.graphics.endFill();
            this._track.x = LIST_W - BAR_W - 6;
            this._track.y = 2;
            this._track.buttonMode = true;
            this._track.addEventListener(MouseEvent.MOUSE_DOWN, this.onTrack);
            this._thumb = this._holder.addChild(new Sprite()) as Sprite;
            this._thumb.x = this._track.x;
            this._thumb.buttonMode = true;
            this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, this.onThumbDown);
            this._status = this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, LIST_W - 40, TextFormatAlign.CENTER)) as TextField;
            this._status.x = LIST_X + 20;
            this._status.y = LIST_TOP + 40;
            this._footer = this.mc.addChild(CasinoUI.label("", 12, CasinoUI.ASH, false, 460, TextFormatAlign.LEFT)) as TextField;
            this._footer.name = "ioLbFooter";
            this._footer.x = LIST_X;
            this._footer.y = LIST_TOP + LIST_H + 8;
            this._count = this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, 260, TextFormatAlign.RIGHT)) as TextField;
            this._count.x = LIST_X + LIST_W - 260;
            this._count.y = LIST_TOP + LIST_H + 8;
            // close
            var x:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            x.name = "ioLbClose";
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
            x.addEventListener(MouseEvent.CLICK, this.close);
            this.mc.addEventListener(Event.ENTER_FRAME, this.tick);
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this.mc);
            POPUPSETTINGS.AlignToCenter(this.mc);
            POPUPSETTINGS.ScaleUp(this.mc);
            if (_world >= 0 && (!_data || _world >= (_data.worlds as Array).length)) {
                _world = -1;
            }
            this.selectTab(_tab);
            if (shouldFetch()) {
                fetch();
            }
            this.findPending();
        }

        // ---- the frame: obsidian, a molten rim, the new art (leaderboards/bg.jpg, leaderboards/banner.jpg)

        private function drawFrame():void {
            var bg:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            var m:Matrix = new Matrix();
            m.createGradientBox(W, H, Math.PI / 2, -W / 2, -H / 2);
            bg.graphics.lineStyle(3, 0xE0702A, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
            bg.graphics.drawRoundRect(-W / 2, -H / 2, W, H, 22, 22);
            bg.graphics.endFill();
            bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
            var art:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            // (a holder each: the banner stays over the background whichever loads first)
            CasinoUI.picture(art.addChild(new Sprite()) as Sprite, "leaderboards/bg.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, H - 12);
            CasinoUI.picture(art.addChild(new Sprite()) as Sprite, "leaderboards/banner.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, 92);
            var mask:Shape = this.mc.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            mask.graphics.endFill();
            art.mask = mask;
        }

        // ---- tabs, worlds

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
            this.hideWorlds();
            this.drawHeads();
            this.fill(true);
        }

        private function worldButton():Sprite {
            var b:Sprite = CasinoUI.button("", 214, 28, this.toggleWorlds, true, 13);
            b.name = "ioLbWorld";
            this._worldLabel = b.getChildAt(0) as TextField;
            return b;
        }

        private function worldName(i:int):String {
            var worlds:Array = _data ? _data.worlds as Array : null;
            return worlds && i >= 0 && i < worlds.length ? String(worlds[i].name) : KEYS.Get("lb_all_worlds");
        }

        private function updateWorldButton():void {
            this._worldLabel.text = KEYS.Get("lb_world_btn", {"v1": this.worldName(_world)}) + " ▾";
        }

        private function toggleWorlds(e:MouseEvent = null):void {
            if (this._worldList) {
                this.hideWorlds();
                return;
            }
            var worlds:Array = _data ? _data.worlds as Array : [];
            var entries:Array = [-1];
            for (var i:int = 0; i < worlds.length; i++) {
                entries.push(i);
            }
            // (12 to a column, the columns spreading left: 36 worlds fit over the list)
            var shown:int = Math.min(entries.length, 36);
            var rows:int = Math.min(shown, 12);
            var columns:int = int(Math.ceil(shown / 12));
            this._worldList = this.mc.addChild(CasinoUI.panel(columns * 208 + 6, rows * 26 + 8, 0.97)) as Sprite;
            this._worldList.name = "ioLbWorldList";
            this._worldList.x = this._worldButton.x + 214 - (columns * 208 + 6);
            this._worldList.y = this._worldButton.y + 32;
            for (var n:int = 0; n < shown; n++) {
                var choice:Sprite = CasinoUI.toggle(this.worldName(int(entries[n])), 202, 24, this.worldClick(int(entries[n])));
                choice.name = "ioLbWorld" + int(entries[n]);
                CasinoUI.choose(choice, int(entries[n]) == _world);
                choice.x = 6 + int(n / 12) * 208;
                choice.y = 4 + n % 12 * 26;
                this._worldList.addChild(choice);
            }
        }

        private function worldClick(i:int):Function {
            return function(e:MouseEvent):void {
                _world = i;
                hideWorlds();
                fill(true);
            };
        }

        private function hideWorlds():void {
            if (this._worldList && this._worldList.parent) {
                this._worldList.parent.removeChild(this._worldList);
            }
            this._worldList = null;
        }

        private function drawHeads():void {
            CasinoUI.removeAll(this._heads);
            var x:int = 2;
            for each (var column:Array in COLUMNS[_tab]) {
                var t:TextField = this._heads.addChild(CasinoUI.label(KEYS.Get(column[1]), 12, CasinoUI.GOLD, true, column[2] - 8, column[3])) as TextField;
                t.x = x + 4;
                t.y = 2;
                GLOBAL.ioFitText(t); // ("Valeur de l'empire", "Avant-postes" were cut off)
                x += column[2];
            }
        }

        // ---- the rows

        private function makeRow():Object {
            var entry:Object = {"index": -1, "item": null, "cells": []};
            var line:Sprite = this._rowsLayer.addChild(new Sprite()) as Sprite;
            line.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    if (e.target == entry.jump) {
                        return;
                    }
                    if (entry.item && entry.item.kind == "alliance") {
                        SOUNDS.Play("click1");
                        var id:String = allianceKey(entry.item.a);
                        _expanded[id] = !_expanded[id];
                        fill(false);
                    }
                });
            entry.line = line;
            for (var c:int = 0; c < 6; c++) {
                var cell:TextField = line.addChild(CasinoUI.label("", 12, 0xFFFFFF, false, 100, TextFormatAlign.LEFT)) as TextField;
                cell.y = 5;
                entry.cells.push(cell);
            }
            entry.jump = line.addChild(CasinoUI.button(KEYS.Get("lb_jump"), JUMP_W, 22, function(e:MouseEvent):void {
                    var p:Object = entry.item ? entry.item.p : null;
                    if (p) {
                        jump(p);
                    }
                }, true, 12)) as Sprite;
            entry.jump.name = "ioLbJump";
            entry.jump.x = ROW_W - JUMP_W - 4;
            entry.jump.y = 3;
            return entry;
        }

        /** Works the tab's list out again (back to the top when `top`). */
        private function fill(top:Boolean):void {
            this.updateWorldButton();
            this._list = _data ? this.rowsFor(_tab) : [];
            for each (var entry:Object in this._pool) {
                entry.index = -1;
            }
            if (top) {
                this._offset = 0;
            }
            this._status.text = _data ? (this._list.length ? "" : KEYS.Get("lb_none")) : (_loading || !_failedAt ? KEYS.Get("lb_loading") : KEYS.Get("lb_failed"));
            var counted:int = 0;
            for each (var item:Object in this._list) {
                if (item.kind != "member") {
                    counted++;
                }
            }
            this._count.text = !_data ? "" : (counted == 1 ? KEYS.Get(["lb_count_player", "lb_count_alliance", "lb_count_gambler"][_tab]) : KEYS.Get(["lb_count_players", "lb_count_alliances", "lb_count_gamblers"][_tab], {"v1": GLOBAL.FormatNumber(counted)}));
            var viewH:int = LIST_H - 2;
            var total:Number = this._list.length * ROW_H;
            this._track.visible = this._thumb.visible = total > viewH;
            if (total > viewH) {
                var thumbH:int = Math.max(28, int((viewH - 4) * viewH / total));
                this._thumb.graphics.clear();
                this._thumb.graphics.lineStyle(1, 0xFFC060, 1);
                this._thumb.graphics.beginFill(0xC8501A, 1);
                this._thumb.graphics.drawRoundRect(0, 0, BAR_W, thumbH, 8, 8);
                this._thumb.graphics.endFill();
            }
            this.render();
            this.updateFooter();
        }

        /** The rows of a tab, sorted, ranked, filtered to the world chosen. */
        private function rowsFor(tab:int):Array {
            var out:Array = [];
            var item:Object = null;
            var rank:int = 0;
            var p:Object = null;
            if (tab == 0) {
                for each (p in (_data.players as Array).sort(byOutposts)) {
                    if (_world < 0 || p.w == _world) {
                        out.push({"kind": "player", "rank": ++rank, "p": p});
                    }
                }
            }
            else if (tab == 1) {
                for each (var a:Object in (_data.alliances as Array).sort(byEmpire)) {
                    if (_world >= 0 && a.w != _world) {
                        continue;
                    }
                    out.push({"kind": "alliance", "rank": ++rank, "a": a});
                    if (_expanded[allianceKey(a)]) {
                        for each (p in (a.members as Array).sort(byEmpire)) {
                            out.push({"kind": "member", "rank": 0, "p": p, "a": a});
                        }
                    }
                }
            }
            else {
                for each (var g:Object in (_data.gamblers as Array).sort(byGambled)) {
                    if (_world < 0 || g.w == _world) {
                        out.push({"kind": "gambler", "rank": ++rank, "g": g, "p": _data.byUid[String(g.uid)] || null});
                    }
                }
            }
            return out;
        }

        private static function byName(a:Object, b:Object):int {
            var an:String = String(a.name).toLowerCase();
            var bn:String = String(b.name).toLowerCase();
            return an < bn ? -1 : (an > bn ? 1 : 0);
        }

        /** Most outposts first; ties: the higher empire value, then the name. */
        private static function byOutposts(a:Object, b:Object):int {
            if (a.outposts != b.outposts) {
                return a.outposts > b.outposts ? -1 : 1;
            }
            if (a.empire != b.empire) {
                return a.empire > b.empire ? -1 : 1;
            }
            return byName(a, b);
        }

        /** The highest empire value first; ties: more outposts, then the name. */
        private static function byEmpire(a:Object, b:Object):int {
            if (a.empire != b.empire) {
                return a.empire > b.empire ? -1 : 1;
            }
            if (a.outposts != b.outposts) {
                return a.outposts > b.outposts ? -1 : 1;
            }
            return byName(a, b);
        }

        /** The most gambled first; ties: the better net, then the name. */
        private static function byGambled(a:Object, b:Object):int {
            if (a.wagered != b.wagered) {
                return a.wagered > b.wagered ? -1 : 1;
            }
            if (a.net != b.net) {
                return a.net > b.net ? -1 : 1;
            }
            return byName(a, b);
        }

        /** Puts the rows at the scroll position into the rows on screen. */
        private function render():void {
            var viewH:int = LIST_H - 2;
            var maxOffset:Number = Math.max(0, this._list.length * ROW_H - viewH);
            this._offset = Math.max(0, Math.min(maxOffset, this._offset));
            var first:int = int(this._offset / ROW_H);
            var shift:Number = this._offset - first * ROW_H;
            var me:int = LOGIN._playerID;
            var myWorld:int = myWorldIndex();
            var now:int = GLOBAL.Timestamp();
            for (var r:int = 0; r < this._pool.length; r++) {
                var entry:Object = this._pool[r];
                var index:int = first + r;
                var line:Sprite = entry.line;
                if (index >= this._list.length) {
                    line.visible = false;
                    entry.index = -1;
                    entry.item = null;
                    continue;
                }
                line.visible = true;
                line.y = r * ROW_H - shift;
                var item:Object = this._list[index];
                var mine:Boolean = item.p && int(item.p.uid) == me || item.g && int(item.g.uid) == me || item.kind == "alliance" && this.isMyAlliance(item.a);
                var flash:Boolean = this._flashUid != 0 && now < this._flashUntil && (item.p && int(item.p.uid) == this._flashUid || item.g && int(item.g.uid) == this._flashUid);
                if (entry.index == index && entry.item == item && !flash && entry.flash == flash) {
                    continue;
                }
                entry.index = index;
                entry.item = item;
                entry.flash = flash;
                line.graphics.clear();
                var fillColour:uint = mine ? 0x6A3A0E : (item.kind == "member" ? 0x1A1210 : (index % 2 == 0 ? 0x2A1C18 : 0x221613));
                line.graphics.beginFill(flash ? 0xA05A14 : fillColour, mine || flash ? 0.95 : 0.85);
                line.graphics.drawRect(0, 0, ROW_W, ROW_H - 1);
                line.graphics.endFill();
                line.buttonMode = item.kind == "alliance";
                var x:int = 0;
                var columns:Array = COLUMNS[_tab];
                for (var c:int = 0; c < 6; c++) {
                    var cell:TextField = entry.cells[c];
                    var column:Array = columns[c];
                    cell.width = column[2] - 8;
                    cell.x = x + 4;
                    x += column[2];
                    var text:String = this.cellText(item, String(column[0]));
                    var colour:uint = this.cellColour(item, String(column[0]), mine);
                    var format:TextFormat = cell.defaultTextFormat;
                    format.align = column[3];
                    format.color = colour;
                    format.bold = column[0] == "name" || column[0] == "rank";
                    cell.defaultTextFormat = format;
                    cell.text = text;
                }
                var p:Object = item.kind == "alliance" ? null : item.p;
                entry.jump.visible = p != null && myWorld >= 0 && int(p.w) == myWorld && int(p.x) >= 0;
            }
            if (this._thumb.visible) {
                var room:Number = this._track.height - this._thumb.height;
                this._thumb.y = 2 + (maxOffset > 0 ? Math.round(room * this._offset / maxOffset) : 0);
            }
        }

        private function cellText(item:Object, key:String):String {
            var kind:String = item.kind;
            var p:Object = item.p;
            switch (key) {
                case "rank":
                    if (kind == "alliance") {
                        return (_expanded[allianceKey(item.a)] ? "▾ " : "▸ ") + item.rank;
                    }
                    return kind == "member" ? "" : String(item.rank);
                case "name":
                    if (kind == "alliance") {
                        return String(item.a.name);
                    }
                    if (kind == "member") {
                        return "    " + String(p.name);
                    }
                    return String(kind == "gambler" ? item.g.name : p.name);
                case "world":
                    return this.worldName(kind == "alliance" ? int(item.a.w) : (kind == "gambler" ? int(item.g.w) : int(p.w)));
                case "alliance":
                    var a:Object = _data.allianceById[String(p.alliance)];
                    return a ? String(a.name) : "";
                case "members":
                    return kind == "alliance" ? GLOBAL.FormatNumber((item.a.members as Array).length) : "";
                case "outposts":
                    return GLOBAL.FormatNumber(kind == "alliance" ? Number(item.a.outposts) : Number(p.outposts));
                case "empire":
                    return GLOBAL.FormatNumber(kind == "alliance" ? Number(item.a.empire) : Number(p.empire));
                case "bets":
                    return GLOBAL.FormatNumber(Number(item.g.bets));
                case "gambled":
                    return GLOBAL.FormatNumber(Number(item.g.wagered));
                case "net":
                    var net:Number = Number(item.g.net);
                    return (net > 0 ? "+" : (net < 0 ? "-" : "")) + GLOBAL.FormatNumber(Math.abs(net));
            }
            return "";
        }

        private function cellColour(item:Object, key:String, mine:Boolean):uint {
            if (key == "net") {
                var net:Number = Number(item.g.net);
                return net > 0 ? CasinoUI.WIN : (net < 0 ? CasinoUI.LOSS : CasinoUI.ASH);
            }
            if (key == "name" || key == "rank") {
                return mine ? 0xFFFFFF : (item.kind == "member" ? 0xE8D8C0 : CasinoUI.GOLD);
            }
            return mine ? 0xFFF0D8 : 0xD8C8B8;
        }

        private function isMyAlliance(a:Object):Boolean {
            var me:Object = _data ? _data.byUid[String(LOGIN._playerID)] : null;
            return me != null && a != null && int(me.alliance) == int(a.id) && int(me.alliance) != 0 && int(me.w) == int(a.w);
        }

        /** An alliance's key: its id and world (one alliance with members on two worlds is listed on each). */
        private static function allianceKey(a:Object):String {
            return String(a.id) + "@" + String(a.w);
        }

        /** The player's own world (index into worlds): their row's; for one not listed, the map's. */
        private static function myWorldIndex():int {
            if (!_data) {
                return -1;
            }
            var me:Object = _data.byUid[String(LOGIN._playerID)];
            if (me) {
                return int(me.w);
            }
            var worlds:Array = _data.worlds as Array;
            for (var i:int = 0; i < worlds.length; i++) {
                if (IoMapSnapshot.world && String(worlds[i].id) == IoMapSnapshot.world) {
                    return i;
                }
            }
            return -1;
        }

        // ---- actions

        private function jump(p:Object):void {
            SOUNDS.Play("click1");
            var x:int = int(p.x);
            var y:int = int(p.y);
            this.close();
            IoMapShare.OpenOwnWorld(x, y);
        }

        /** Scrolls to the player's own row (opening their alliance on the Alliances tab), and lights it up. */
        private function findMe(e:MouseEvent = null):void {
            IoQuests.once("lb_findme"); // (the quest book)
            this.findUid(LOGIN._playerID, null);
        }

        /** Inferno chat: the window opened on a player (Outposts, every world), scrolled to their row and lit. */
        public static function ShowPlayer(param1:int, param2:String = null):void {
            _findUid = param1;
            _findName = param2;
            _world = -1;
            if (_open && _open.mc && _open.mc.stage) {
                _open.selectTab(0);
                _open.findPending();
                return;
            }
            _tab = 0;
            Show();
        }

        /**
         * Inferno chat: the map opened on a player's main yard, when it is on this player's world (the
         * leaderboards know every player's home cell; loaded first if they have not been yet).
         */
        public static function JumpToPlayer(param1:int, param2:String):void {
            var go:Function = function():void {
                var p:Object = _data ? _data.byUid[String(param1)] : null;
                var who:String = param2 ? param2 : "That player";
                if (!p || int(p.x) < 0) {
                    GLOBAL.Message(KEYS.Get("lb_no_yard", {"v1": who}));
                    return;
                }
                var mine:int = myWorldIndex();
                if (mine < 0 || int(p.w) != mine) {
                    var worlds:Array = _data.worlds as Array;
                    GLOBAL.Message(KEYS.Get("lb_other_world", {"v1": who, "v2": int(p.w) >= 0 && int(p.w) < worlds.length ? String(worlds[int(p.w)].name) : "?"}));
                    return;
                }
                if (_open) {
                    _open.close();
                }
                IoMapShare.OpenOwnWorld(int(p.x), int(p.y));
            };
            if (_data) {
                go();
                return;
            }
            _waiters.push(go);
            if (!_loading) {
                fetch();
            }
        }

        private function findPending():void {
            if (_findUid > 0 && _data) {
                var uid:int = _findUid;
                var name:String = _findName;
                _findUid = 0;
                _findName = null;
                this.findUid(uid, name);
            }
        }

        /** Scrolls to a player's row (opening their alliance on the Alliances tab) and lights it up. */
        private function findUid(param1:int, param2:String):void {
            if (!_data) {
                return;
            }
            var me:int = param1;
            if (_tab == 1) {
                var mine:Object = _data.byUid[String(me)];
                if (mine && int(mine.alliance) != 0) {
                    _expanded[String(mine.alliance) + "@" + String(mine.w)] = true;
                    this.fill(false);
                }
            }
            for (var i:int = 0; i < this._list.length; i++) {
                var item:Object = this._list[i];
                if (item.p && int(item.p.uid) == me || item.g && int(item.g.uid) == me) {
                    this._offset = Math.max(0, i - 2) * ROW_H;
                    this._flashUid = me;
                    this._flashUntil = GLOBAL.Timestamp() + 2;
                    for each (var entry:Object in this._pool) {
                        entry.index = -1;
                    }
                    this.render();
                    return;
                }
            }
            GLOBAL.Message(param1 == LOGIN._playerID ? KEYS.Get("lb_not_listed") : KEYS.Get("lb_not_listed_other", {"v1": param2 ? param2 : "That player"}));
        }

        // ---- scrolling

        private function onWheel(e:MouseEvent):void {
            e.stopPropagation();
            this._offset += (e.delta > 0 ? -1 : 1) * WHEEL_ROWS * ROW_H;
            this.render();
        }

        private function onTrack(e:MouseEvent):void {
            var page:Number = LIST_H - 2 - ROW_H;
            this._offset += this._holder.mouseY < this._thumb.y ? -page : page;
            this.render();
        }

        private function onThumbDown(e:MouseEvent):void {
            e.stopPropagation();
            this._dragFrom = this._holder.mouseY - this._thumb.y;
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, this.onThumbMove);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, this.onThumbUp);
        }

        private function onThumbMove(e:MouseEvent):void {
            if (!this.mc) {
                return;
            }
            var room:Number = this._track.height - this._thumb.height;
            var y:Number = Math.max(0, Math.min(room, this._holder.mouseY - this._dragFrom - 2));
            this._offset = room > 0 ? y / room * Math.max(0, this._list.length * ROW_H - (LIST_H - 2)) : 0;
            this.render();
        }

        private function onThumbUp(e:Event = null):void {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onThumbMove);
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, this.onThumbUp);
        }

        // ---- the clock

        private function tick(e:Event):void {
            if (++this._ticks % 30 != 0) {
                return;
            }
            if (shouldFetch()) {
                fetch();
            }
            this.updateFooter();
            if (this._flashUid != 0 && GLOBAL.Timestamp() >= this._flashUntil) {
                this._flashUid = 0;
                for each (var entry:Object in this._pool) {
                    entry.index = -1;
                }
                this.render();
            }
        }

        private function updateFooter():void {
            if (!_data) {
                this._footer.text = "";
                return;
            }
            var now:int = GLOBAL.Timestamp();
            var age:int = Math.max(0, now - int(_data.generatedAt));
            var wait:int = Math.max(0, _dueAt - now);
            var next:String = _loading ? KEYS.Get("lb_updating") : KEYS.Get("lb_next", {"v1": int(wait / 60) + ":" + (wait % 60 < 10 ? "0" : "") + wait % 60});
            var minutes:int = Math.max(1, int(age / 60));
            var ago:String = minutes < 60 ? minutes + " min" : int(minutes / 60) + " h " + minutes % 60 + " min";
            this._footer.text = KEYS.Get("lb_updated", {"v1": ago}) + "  ·  " + next;
        }

        public function close(e:MouseEvent = null):void {
            if (!this.mc) {
                return;
            }
            SOUNDS.Play("close");
            this.onThumbUp();
            this.mc.removeEventListener(Event.ENTER_FRAME, this.tick);
            GLOBAL.BlockerRemove();
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
            }
            this.mc = null;
            if (_open == this) {
                _open = null;
            }
        }

        // ---- the server

        /** Time for the next leaderboards: none yet, or the server's next is out and 5 minutes have passed. */
        private static function shouldFetch():Boolean {
            if (_loading || !GLOBAL.INFERNO_ONLY) {
                return false;
            }
            var now:int = GLOBAL.Timestamp();
            if (_failedAt > 0 && now - _failedAt < 15) {
                return false; // (a failed request is tried again 15 seconds later at the soonest)
            }
            if (!_data) {
                return true;
            }
            return now - _fetchedAt >= MIN_GAP && now >= _dueAt;
        }

        private static function fetch():void {
            _loading = true;
            new URLLoaderApi().load(GLOBAL.serverUrl + "leaderboards/game", [["v", 1]], function(r:Object):void {
                    _loading = false;
                    if (!r || r.error) {
                        failed();
                        return;
                    }
                    _failedAt = 0;
                    _data = parse(r);
                    _fetchedAt = GLOBAL.Timestamp();
                    _nextAt = int(r.nextAt) > 0 ? int(r.nextAt) : _fetchedAt + MIN_GAP;
                    // a few seconds after the server's next one, so not everybody asks in the same second
                    _dueAt = Math.max(_nextAt, _fetchedAt + MIN_GAP) + 3 + int(Math.random() * 18);
                    if (_open && _open.mc) {
                        _open.fill(false);
                        _open.findPending();
                    }
                    callWaiters();
                }, function(e:IOErrorEvent):void {
                    _loading = false;
                    failed();
                });
        }

        /** Whatever waited for the data (JumpToPlayer), now it is here (or failed: they say so themselves). */
        private static function callWaiters():void {
            var waiting:Array = _waiters;
            _waiters = [];
            for each (var fn:Function in waiting) {
                fn();
            }
        }

        private static function failed():void {
            callWaiters();
            _failedAt = GLOBAL.Timestamp();
            if (_open && _open.mc && !_data) {
                _open.fill(true);
            }
        }

        /** The server's rows as objects; alliances with their members and totals; players by uid. */
        private static function parse(r:Object):Object {
            var out:Object = {"generatedAt": int(r.generatedAt), "worlds": [], "players": [], "alliances": [], "gamblers": [], "byUid": {}, "allianceById": {}};
            var row:Array = null;
            for each (row in r.worlds as Array || []) {
                out.worlds.push({"id": String(row[0]), "name": String(row[1])});
            }
            for each (row in r.players as Array || []) {
                var p:Object = {"uid": int(row[0]), "name": String(row[1]), "w": int(row[2]), "alliance": int(row[3]), "outposts": int(row[4]), "empire": Number(row[5]), "x": int(row[6]), "y": int(row[7])};
                out.players.push(p);
                out.byUid[String(p.uid)] = p;
            }
            for each (row in r.alliances as Array || []) {
                var a:Object = {"id": int(row[0]), "name": String(row[1]), "image": int(row[2]), "w": int(row[3]), "members": [], "outposts": 0, "empire": 0};
                for each (var uid:* in row[4] as Array || []) {
                    var member:Object = out.byUid[String(uid)];
                    if (member) {
                        a.members.push(member);
                        a.outposts += int(member.outposts);
                        a.empire += Number(member.empire);
                    }
                }
                if (a.members.length) {
                    out.alliances.push(a);
                    out.allianceById[String(a.id)] = a;
                }
            }
            for each (row in r.gamblers as Array || []) {
                out.gamblers.push({"uid": int(row[0]), "name": String(row[1]), "w": int(row[2]), "wagered": Number(row[3]), "net": Number(row[4]), "bets": Number(row[5])});
            }
            return out;
        }
    }
}
