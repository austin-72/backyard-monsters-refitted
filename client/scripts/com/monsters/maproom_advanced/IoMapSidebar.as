package com.monsters.maproom_advanced {
    import com.monsters.alliances.ALLIANCES;
    import flash.display.DisplayObject;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.FocusEvent;
    import flash.events.KeyboardEvent;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;
    import com.monsters.quests.IoQuests;

    /**
     * Inferno-only: the map room's sidebar, under the resources and Home / Jump.
     *
     *  - Find a player: type part of a name; every player with a yard on the world who matches (a dot in
     *    the colour of how you stand with them), with their alliance, main yard and outposts. Go goes to
     *    their main yard; clicking a player lists their outposts, each with Go.
     *  - Bookmarks: no limit, in a list that scrolls. Home first. Each is a name, and under it where it is
     *    with rename and remove. Click one to go there. They are added from the places on the map (a yard's
     *    popup, an empty place's bubble).
     *  - Alliance: your alliance's members on this world, with Go to each one's main yard.
     *
     * Players, alliances and yards come from the world snapshot (IoMapSnapshot).
     */
    internal class IoMapSidebar extends Sprite {

        private static const SEARCH_H:int = 24;

        private static const TAB_H:int = 20;

        private static const ROW_H:int = 34;

        private static const RESULTS_W:int = 280;

        private static const RESULTS_MAX_H:int = 300;

        /** The tab showing (for the session). */
        private static var s_tab:String = "bookmarks";

        private var _host:MapRoomPopup;

        private var _w:int;

        private var _h:int;

        // find a player
        private var _searchBox:Sprite;

        private var _search:TextField;

        private var _placeholder:TextField;

        private var _clear:Sprite;

        private var _results:Sprite;

        private var _resultsPane:IoScrollPane;

        private var _query:String = "";

        private var _expanded:int = 0;

        private var _resultsKey:String = null;

        // tabs
        private var _tabBar:Sprite;

        private var _tabs:Array = [];

        private var _panel:Shape;

        private var _pane:IoScrollPane;

        private var _drawnKey:String = null;

        // bookmarks
        private var _renaming:int = -1;

        private var _confirming:int = -1;

        private var _editField:TextField = null;

        public function IoMapSidebar(host:MapRoomPopup, w:int, h:int) {
            super();
            this._host = host;
            this._w = w;
            this._h = h;
            this.makeSearch();
            this._tabBar = new Sprite();
            this._tabBar.y = SEARCH_H + 8;
            addChild(this._tabBar);
            this._panel = new Shape();
            this._panel.y = this._tabBar.y + TAB_H;
            addChild(this._panel);
            var paneH:int = h - this._panel.y;
            IoMapUi.roundBox(this._panel.graphics, 0, 0, w, paneH, IoMapUi.PAPER, 1, IoMapUi.EDGE, 4, 1.5);
            this._pane = new IoScrollPane(w - 4, paneH - 4);
            this._pane.x = 2;
            this._pane.y = this._panel.y + 2;
            addChild(this._pane);
            this._results = new Sprite();
            this._results.visible = false;
            addChild(this._results);
            this.makeTabs();
            this.render(true);
            addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation(); // not a drag of the map
                });
        }

        // ---- find a player

        private function makeSearch():void {
            this._searchBox = new Sprite();
            IoMapUi.roundBox(this._searchBox.graphics, 0, 0, this._w, SEARCH_H, 0xF3E6C8, 1, IoMapUi.EDGE, 6, 1.5);
            IoMapUi.magnifier(this._searchBox.graphics, 6, 5, IoMapUi.MUTED);
            addChild(this._searchBox);
            this._placeholder = IoMapUi.label("Find a player", 11, 0x9A7A56, false, this._w - 44);
            this._placeholder.x = 24;
            this._placeholder.y = 3;
            this._searchBox.addChild(this._placeholder);
            this._search = IoMapUi.input(11, IoMapUi.INK, this._w - 44, 24);
            this._search.x = 22;
            this._search.y = 2;
            this._search.height = SEARCH_H - 4;
            this._search.addEventListener(Event.CHANGE, this.onSearchChange);
            this._search.addEventListener(KeyboardEvent.KEY_DOWN, this.onSearchKey);
            this._search.addEventListener(FocusEvent.FOCUS_IN, this.onSearchFocus);
            this._searchBox.addChild(this._search);
            this._clear = new Sprite();
            IoMapUi.hitArea(this._clear.graphics, 18, 18);
            IoMapUi.cross(this._clear.graphics, 5, 5, 8, IoMapUi.MUTED);
            this._clear.x = this._w - 20;
            this._clear.y = 3;
            this._clear.buttonMode = true;
            this._clear.visible = false;
            this._clear.addEventListener(MouseEvent.CLICK, this.onSearchClear);
            this._searchBox.addChild(this._clear);
        }

        private function onSearchFocus(e:FocusEvent):void {
            if (this._query.length > 0) {
                this.showResults();
            }
        }

        private function onSearchChange(e:Event):void {
            this._query = this._search.text.replace(/^\s+|\s+$/g, "");
            this._placeholder.visible = this._search.text.length == 0;
            this._clear.visible = !this._placeholder.visible;
            this._expanded = 0;
            if (this._query.length == 0) {
                this.hideResults();
            }
            else {
                this.showResults();
            }
        }

        private function onSearchKey(e:KeyboardEvent):void {
            if (e.keyCode == 27) {
                this.onSearchClear(null);
            }
            else if (e.keyCode == 13) {
                // Enter goes to the only match, or the first one.
                var first:Object = this.matches()[0];
                if (first) {
                    this.goToPlayer(int(first.uid));
                }
            }
        }

        private function onSearchClear(e:MouseEvent):void {
            if (e) {
                e.stopPropagation();
            }
            this._search.text = "";
            this.onSearchChange(null);
            if (stage && stage.focus == this._search) {
                stage.focus = null;
            }
        }

        /** Players whose name has the typed text: names starting with it first. */
        private function matches():Array {
            var list:Array = [];
            var query:String = this._query.toLowerCase();
            var uid:String = null;
            var player:Object = null;
            var at:int = 0;
            if (query.length == 0 || !IoMapSnapshot.ready) {
                return list;
            }
            for (uid in IoMapSnapshot.players) {
                player = IoMapSnapshot.players[uid];
                at = String(player.name || "").toLowerCase().indexOf(query);
                if (at >= 0) {
                    list.push({"uid": int(uid), "name": String(player.name), "at": at, "player": player});
                }
            }
            list.sort(function(a:Object, b:Object):int {
                    if ((a.at == 0) != (b.at == 0)) {
                        return a.at == 0 ? -1 : 1;
                    }
                    if (a.name.length != b.name.length) {
                        return a.name.length - b.name.length;
                    }
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
                });
            return list.slice(0, 60);
        }

        private function showResults():void {
            var list:Array = this.matches();
            var g:Graphics = this._results.graphics;
            var content:Sprite = null;
            var y:int = 0;
            var entry:Object = null;
            var header:TextField = null;
            var h:int = 0;
            this._resultsKey = this._query + "/" + this._expanded + "/" + IoMapSnapshot.version;
            while (this._results.numChildren > 0) {
                this._results.removeChildAt(0);
            }
            g.clear();
            this._results.visible = true;
            this._results.x = 0;
            this._results.y = SEARCH_H + 2;
            if (!IoMapSnapshot.ready) {
                h = 34;
                IoMapUi.roundBox(g, 0, 0, RESULTS_W, h, 0xF6EBD1, 1, IoMapUi.EDGE, 8, 1.5);
                header = IoMapUi.label("Loading the players on this world...", 11, IoMapUi.MUTED, false, RESULTS_W - 20);
                header.x = 10;
                header.y = 9;
                this._results.addChild(header);
                return;
            }
            if (list.length == 0) {
                h = 54;
                IoMapUi.roundBox(g, 0, 0, RESULTS_W, h, 0xF6EBD1, 1, IoMapUi.EDGE, 8, 1.5);
                header = IoMapUi.label("NOTHING FOUND", 10, IoMapUi.MUTED, true, RESULTS_W - 20);
                header.x = 10;
                header.y = 7;
                this._results.addChild(header);
                header = IoMapUi.label("", 11, IoMapUi.INK, false, RESULTS_W - 20);
                header.text = "No player called “" + this._query + "” on this world.";
                header.x = 10;
                header.y = 26;
                this._results.addChild(header);
                return;
            }
            content = new Sprite();
            for each (entry in list) {
                y += this.resultRow(content, entry, y);
            }
            var headH:int = 22;
            h = Math.min(RESULTS_MAX_H, headH + y + 2);
            IoMapUi.roundBox(g, 0, 0, RESULTS_W, h, 0xF6EBD1, 1, IoMapUi.EDGE, 8, 1.5);
            g.beginFill(IoMapUi.PAPER, 1);
            g.drawRect(2, 2, RESULTS_W - 4, headH - 3);
            g.endFill();
            header = IoMapUi.label(list.length + (list.length == 1 ? " PLAYER" : " PLAYERS") + (list.length >= 60 ? " (FIRST 60)" : "") + " ON THIS WORLD", 9, IoMapUi.MUTED, true, RESULTS_W - 20);
            header.x = 10;
            header.y = 4;
            this._results.addChild(header);
            this._resultsPane = new IoScrollPane(RESULTS_W - 4, h - headH - 2);
            this._resultsPane.x = 2;
            this._resultsPane.y = headH;
            this._results.addChild(this._resultsPane);
            this._resultsPane.content.addChild(content);
            this._resultsPane.refresh(y);
        }

        /** One player in the results (and their yards when opened). Returns its height. */
        private function resultRow(content:Sprite, entry:Object, y:int):int {
            var row:Sprite = new Sprite();
            var player:Object = entry.player;
            var uid:int = int(entry.uid);
            var yards:Object = IoMapSnapshot.YardsOf(uid);
            var alliance:Object = int(player.alliance) ? IoMapSnapshot.AllianceInfo(int(player.alliance)) : null;
            var relation:int = IoMapUi.relation(uid, int(player.alliance));
            var width:int = RESULTS_W - 4 - IoScrollPane.BAR_W - 2;
            var name:TextField = IoMapUi.label("", 12, IoMapUi.INK, true, width - 60);
            var line2:TextField = IoMapUi.label("", 10, 0x5A3D20, false, width - 70);
            var open:Boolean = this._expanded == uid;
            var h:int = 40;
            var n:String = String(entry.name);
            var at:int = int(entry.at);
            var outposts:int = yards ? yards.outposts.length : 0;
            var go:MovieClip = null;
            var i:int = 0;
            row.y = y;
            row.graphics.beginFill(open ? IoMapUi.PAPER_ROW : 0xF6EBD1, 1);
            row.graphics.drawRect(0, 0, width, h);
            row.graphics.endFill();
            row.graphics.lineStyle(1, 0xE0CDA5, 1);
            row.graphics.moveTo(0, h - 0.5);
            row.graphics.lineTo(width, h - 0.5);
            row.graphics.lineStyle(1, 0x000000, 1);
            row.graphics.beginFill(IoMapUi.relationColour(relation), 1);
            row.graphics.drawCircle(13, 20, 5);
            row.graphics.endFill();
            row.graphics.lineStyle();
            name.htmlText = IoMapUi.escape(n.substr(0, at)) + "<font color=\"#A86A00\"><u>" + IoMapUi.escape(n.substr(at, this._query.length)) + "</u></font>" + IoMapUi.escape(n.substr(at + this._query.length)) + "<font color=\"#6B4A26\"> (" + (int(player.level) || 1) + ")</font>";
            name.x = 24;
            name.y = 3;
            row.addChild(name);
            line2.text = (alliance ? String(alliance.name) : "No alliance") + " · " + (yards && yards.main ? IoMapUi.coord(yards.main[0], yards.main[1]) : "no main yard") + " · " + outposts + (outposts == 1 ? " outpost" : " outposts");
            line2.x = 24;
            line2.y = 21;
            row.addChild(line2);
            if (yards && (yards.main || outposts > 0)) {
                go = IoMapUi.button("Go", 34, 22, function(e:MouseEvent):void {
                        goToPlayer(uid);
                    }, "grey");
                go.x = width - 42;
                go.y = 9;
                row.addChild(go);
            }
            row.buttonMode = outposts > 0;
            row.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    if (outposts > 0) {
                        SOUNDS.Play("click1");
                        _expanded = open ? 0 : uid;
                        var offset:Number = _resultsPane ? _resultsPane.offset : 0;
                        showResults();
                        if (_resultsPane) {
                            _resultsPane.scrollTo(offset);
                        }
                    }
                });
            content.addChild(row);
            if (open && yards) {
                if (yards.main) {
                    h += this.yardRow(content, y + h, width, "Main yard", yards.main[0], yards.main[1]);
                }
                for (i = 0; i < yards.outposts.length; i++) {
                    h += this.yardRow(content, y + h, width, "Outpost", yards.outposts[i][0], yards.outposts[i][1]);
                }
            }
            return h;
        }

        private function yardRow(content:Sprite, y:int, width:int, kind:String, cellX:int, cellY:int):int {
            var row:Sprite = new Sprite();
            var text:TextField = IoMapUi.label("", 11, IoMapUi.INK, false, width - 80);
            var go:MovieClip = IoMapUi.button("Go", 34, 18, function(e:MouseEvent):void {
                    goTo(cellX, cellY);
                }, "grey", 10);
            row.y = y;
            row.graphics.beginFill(IoMapUi.PAPER_ROW, 1);
            row.graphics.drawRect(0, 0, width, 24);
            row.graphics.endFill();
            text.htmlText = kind + "  <font color=\"#6B4A26\">" + IoMapUi.coord(cellX, cellY) + "</font>";
            text.x = 36;
            text.y = 4;
            row.addChild(text);
            go.x = width - 42;
            go.y = 3;
            row.addChild(go);
            content.addChild(row);
            return 24;
        }

        private function goToPlayer(uid:int):void {
            var yards:Object = IoMapSnapshot.YardsOf(uid);
            if (!yards) {
                return;
            }
            IoQuests.once("map_search"); // (the quest book)
            if (yards.main) {
                this.goTo(yards.main[0], yards.main[1]);
            }
            else if (yards.outposts.length > 0) {
                this.goTo(yards.outposts[0][0], yards.outposts[0][1]);
            }
        }

        private function goTo(cellX:int, cellY:int):void {
            this.hideResults();
            if (stage && stage.focus == this._search) {
                stage.focus = null;
            }
            this._host.ioGoTo(cellX, cellY);
        }

        private function hideResults():void {
            this._results.visible = false;
            this._resultsKey = null;
            while (this._results.numChildren > 0) {
                this._results.removeChildAt(0);
            }
            this._resultsPane = null;
        }

        /** A mouse press anywhere else closes the results (the map room calls this). */
        internal function ioStageDown(target:DisplayObject):void {
            if (this._results.visible && target && !this._results.contains(target) && !this._searchBox.contains(target)) {
                this.hideResults();
            }
        }

        // ---- tabs

        private function makeTabs():void {
            var names:Array = ["bookmarks", "alliance"];
            var titles:Array = ["Bookmarks", "Alliance"];
            var gap:int = 3;
            var w:Number = (this._w - gap) / 2;
            var i:int = 0;
            var tab:Sprite = null;
            var text:TextField = null;
            while (i < names.length) {
                tab = new Sprite();
                tab.name = names[i];
                tab.buttonMode = true;
                tab.mouseChildren = false;
                text = IoMapUi.label(titles[i], 10, IoMapUi.INK, true, int(w), TextFormatAlign.CENTER);
                text.y = 3;
                tab.addChild(text);
                tab.x = Math.round(i * (w + gap));
                tab.addEventListener(MouseEvent.CLICK, this.onTab);
                this._tabBar.addChild(tab);
                this._tabs.push(tab);
                i++;
            }
            this.layoutTabs();
        }

        private function layoutTabs():void {
            var w:Number = (this._w - 3) / 2;
            var on:Boolean = false;
            for each (var tab:Sprite in this._tabs) {
                on = tab.name == s_tab;
                tab.graphics.clear();
                tab.graphics.lineStyle(1.5, on ? IoMapUi.EDGE : 0x8A6436, 1, true);
                tab.graphics.beginFill(on ? IoMapUi.PAPER : IoMapUi.TAB_OFF, 1);
                tab.graphics.moveTo(0, TAB_H + 1);
                tab.graphics.lineTo(0, 4);
                tab.graphics.curveTo(0, 0, 4, 0);
                tab.graphics.lineTo(w - 4, 0);
                tab.graphics.curveTo(w, 0, w, 4);
                tab.graphics.lineTo(w, TAB_H + 1);
                tab.graphics.endFill();
                tab.graphics.lineStyle();
                (tab.getChildAt(0) as TextField).textColor = on ? IoMapUi.INK : 0x4A2F16;
            }
        }

        private function onTab(e:MouseEvent):void {
            var name:String = Sprite(e.currentTarget).name;
            e.stopPropagation();
            if (name == s_tab) {
                return;
            }
            SOUNDS.Play("click1");
            s_tab = name;
            this._renaming = this._confirming = -1;
            this.layoutTabs();
            this._pane.scrollTo(0);
            this.render(true);
        }

        // ---- the panel

        /** Draws the tab again if what it shows has changed (called every second, and after changes). */
        internal function Refresh(force:Boolean = false):void {
            this.render(force);
            if (this._results.visible && this._resultsKey != this._query + "/" + this._expanded + "/" + IoMapSnapshot.version) {
                var offset:Number = this._resultsPane ? this._resultsPane.offset : 0;
                this.showResults();
                if (this._resultsPane) {
                    this._resultsPane.scrollTo(offset);
                }
            }
        }

        private function panelKey():String {
            var key:String = s_tab + "/" + this._w;
            if (s_tab == "bookmarks") {
                key += "/" + this._renaming + "/" + this._confirming + "/";
                for each (var bookmark:Object in MapRoom._bookmarks) {
                    key += bookmark.name + "@" + bookmark.location.x + "," + bookmark.location.y + ";";
                }
            }
            else {
                key += "/" + IoMapSnapshot.version + "/" + ALLIANCES._allianceID;
            }
            return key;
        }

        private function render(force:Boolean):void {
            var key:String = this.panelKey();
            var h:int = 0;
            if (!force && key == this._drawnKey) {
                return;
            }
            this._drawnKey = key;
            this._editField = null;
            while (this._pane.content.numChildren > 0) {
                this._pane.content.removeChildAt(0);
            }
            this._pane.content.graphics.clear();
            if (s_tab == "alliance") {
                h = this.renderAlliance(this._pane.content);
            }
            else {
                h = this.renderBookmarks(this._pane.content);
            }
            this._pane.refresh(h);
            if (this._editField && stage) {
                stage.focus = this._editField;
                this._editField.setSelection(0, this._editField.text.length);
            }
        }

        private function heading(content:Sprite, text:String, y:int):int {
            var t:TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, true, this._pane.innerWidth - 8);
            t.x = 6;
            t.y = y + 4;
            content.addChild(t);
            return 20;
        }

        private function note(content:Sprite, text:String, y:int):int {
            var t:TextField = IoMapUi.label("", 10, IoMapUi.MUTED, false, this._pane.innerWidth - 12);
            t.multiline = true;
            t.wordWrap = true;
            t.htmlText = text;
            t.height = t.textHeight + 6;
            t.x = 6;
            t.y = y + 4;
            content.addChild(t);
            return t.height + 8;
        }

        // ---- bookmarks

        private function renderBookmarks(content:Sprite):int {
            var y:int = 0;
            var i:int = 0;
            var home:Object = GLOBAL._mapHome;
            var count:int = MapRoom._bookmarks.length;
            y += this.heading(content, count + (count == 1 ? " BOOKMARK" : " BOOKMARKS"), y);
            if (home) {
                y += this.bookmarkRow(content, y, -1, "Home", int(home.x), int(home.y));
            }
            while (i < count) {
                y += this.bookmarkRow(content, y, i, String(MapRoom._bookmarks[i].name), int(MapRoom._bookmarks[i].location.x), int(MapRoom._bookmarks[i].location.y));
                i++;
            }
            if (count == 0) {
                y += this.note(content, "No bookmarks yet. Click a place on the map and choose <b>Bookmark</b>.", y);
            }
            return y + 2;
        }

        /** A bookmark: its name, and under it where it is (left) with rename and remove (right). */
        private function bookmarkRow(content:Sprite, y:int, index:int, name:String, cellX:int, cellY:int):int {
            var row:Sprite = new Sprite();
            var w:int = this._pane.innerWidth;
            var title:TextField = IoMapUi.label(name, 10, IoMapUi.INK, true, w - 24);
            var where:TextField = IoMapUi.label(IoMapUi.coord(cellX, cellY), 9, IoMapUi.MUTED, false, w - 64);
            GLOBAL.ioFitText(where, 7); // (bug report A4: Flash's wider figures cut the Y off)
            var rename:Sprite = null;
            var remove:Sprite = null;
            var field:TextField = null;
            var yes:MovieClip = null;
            var no:MovieClip = null;
            var draw:Function = function(over:Boolean):void {
                row.graphics.clear();
                row.graphics.beginFill(over ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
                row.graphics.drawRect(0, 0, w, ROW_H);
                row.graphics.endFill();
                row.graphics.lineStyle(1, IoMapUi.RULE, 1);
                row.graphics.moveTo(0, ROW_H - 0.5);
                row.graphics.lineTo(w, ROW_H - 0.5);
                row.graphics.lineStyle();
                IoMapUi.pin(row.graphics, 10, 18, index < 0 ? IoMapUi.relationColour(IoMapUi.YOU) : IoMapUi.GOLD, 14, index < 0 ? 0x1D3F6E : 0x5A3D12);
            };
            row.y = y;
            draw(false);
            content.addChild(row);
            title.x = 20;
            title.y = 2;
            where.x = 20;
            where.y = 17;
            if (index >= 0 && index == this._renaming) {
                // renaming: the name as a text box
                field = IoMapUi.input(10, IoMapUi.INK, w - 24, 20);
                field.text = name;
                field.x = 19;
                field.y = 1;
                field.height = 16;
                field.border = true;
                field.borderColor = IoMapUi.EDGE;
                field.background = true;
                field.backgroundColor = 0xFFFBEF;
                field.addEventListener(KeyboardEvent.KEY_DOWN, function(e:KeyboardEvent):void {
                        if (e.keyCode == 13) {
                            finishRename(index, field.text);
                        }
                        else if (e.keyCode == 27) {
                            _renaming = -1;
                            render(true);
                        }
                    });
                field.addEventListener(FocusEvent.FOCUS_OUT, function(e:FocusEvent):void {
                        if (_renaming == index) {
                            finishRename(index, field.text);
                        }
                    });
                row.addChild(field);
                row.addChild(where);
                this._editField = field;
                return ROW_H;
            }
            row.addChild(title);
            if (index >= 0 && index == this._confirming) {
                where.text = "Remove?";
                where.textColor = 0x8A2A14;
                row.addChild(where);
                yes = IoMapUi.button("Yes", 30, 15, function(e:MouseEvent):void {
                        _confirming = -1;
                        MapRoom.ioRemoveBookmark(index);
                        render(true);
                        _host.ioBookmarksChanged();
                    }, "gold", 9);
                yes.x = w - 66;
                yes.y = 17;
                row.addChild(yes);
                no = IoMapUi.button("No", 30, 15, function(e:MouseEvent):void {
                        _confirming = -1;
                        render(true);
                    }, "grey", 9);
                no.x = w - 33;
                no.y = 17;
                row.addChild(no);
                return ROW_H;
            }
            row.addChild(where);
            if (index >= 0) {
                rename = new Sprite();
                IoMapUi.hitArea(rename.graphics, 18, 16);
                IoMapUi.pencil(rename.graphics, 4, 3, IoMapUi.MUTED);
                rename.buttonMode = true;
                rename.x = w - 42;
                rename.y = 16;
                rename.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        e.stopPropagation();
                        SOUNDS.Play("click1");
                        _renaming = index;
                        _confirming = -1;
                        render(true);
                    });
                row.addChild(rename);
                remove = new Sprite();
                IoMapUi.hitArea(remove.graphics, 18, 16);
                IoMapUi.cross(remove.graphics, 5, 4, 8, 0x8A2A14);
                remove.buttonMode = true;
                remove.x = w - 22;
                remove.y = 16;
                remove.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        e.stopPropagation();
                        SOUNDS.Play("click1");
                        _confirming = index;
                        _renaming = -1;
                        render(true);
                    });
                row.addChild(remove);
            }
            row.buttonMode = true;
            row.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    draw(true);
                });
            row.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    draw(false);
                });
            row.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    if (index < 0) {
                        _host.ioGoHome();
                    }
                    else {
                        goTo(cellX, cellY);
                    }
                });
            return ROW_H;
        }

        private function finishRename(index:int, name:String):void {
            var error:String = MapRoom.ioRenameBookmark(index, name);
            if (error) {
                GLOBAL.Message(error);
                return;
            }
            this._renaming = -1;
            this.render(true);
            this._host.ioBookmarksChanged();
        }

        // ---- alliance

        private function renderAlliance(content:Sprite):int {
            var y:int = 0;
            var id:int = ALLIANCES._allianceID;
            var info:Object = id > 0 ? IoMapSnapshot.AllianceInfo(id) : null;
            var members:Array = [];
            var uid:String = null;
            var player:Object = null;
            var title:TextField = null;
            var leader:int = info ? int(info.leader) : 0;
            if (id <= 0) {
                y += this.note(content, "<b>You are not in an alliance.</b><br>Join one from the Alliances window to see its members here.", y);
                return y;
            }
            if (!IoMapSnapshot.ready) {
                return this.note(content, "Loading...", y);
            }
            for (uid in IoMapSnapshot.players) {
                player = IoMapSnapshot.players[uid];
                if (int(player.alliance) == id) {
                    members.push({"uid": int(uid), "player": player});
                }
            }
            members.sort(function(a:Object, b:Object):int {
                    var ar:int = a.uid == LOGIN._playerID ? 0 : (a.uid == leader ? 1 : 2);
                    var br:int = b.uid == LOGIN._playerID ? 0 : (b.uid == leader ? 1 : 2);
                    if (ar != br) {
                        return ar - br;
                    }
                    if (int(a.player.level) != int(b.player.level)) {
                        return int(b.player.level) - int(a.player.level);
                    }
                    return String(a.player.name).toLowerCase() < String(b.player.name).toLowerCase() ? -1 : 1;
                });
            title = IoMapUi.label(info ? String(info.name) : "Your alliance", 12, IoMapUi.INK, true, this._pane.innerWidth - 12);
            title.x = 6;
            title.y = y + 4;
            content.addChild(title);
            y += 22;
            y += this.heading(content, members.length + " ON THIS WORLD", y - 4) - 2;
            for each (var member:Object in members) {
                y += this.memberRow(content, y, int(member.uid), member.player, int(member.uid) == leader);
            }
            return y + 2;
        }

        /** A member: name (level), where their main yard is, and Go (in the middle of the row's height). */
        private function memberRow(content:Sprite, y:int, uid:int, player:Object, leader:Boolean):int {
            var row:Sprite = new Sprite();
            var w:int = this._pane.innerWidth;
            var yards:Object = IoMapSnapshot.YardsOf(uid);
            var name:TextField = IoMapUi.label("", 10, IoMapUi.INK, true, w - 50);
            var where:TextField = IoMapUi.label("", 9, IoMapUi.MUTED, false, w - 50);
            var go:MovieClip = null;
            var h:int = 34;
            row.y = y;
            row.graphics.beginFill(uid == LOGIN._playerID ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w, h);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, h - 0.5);
            row.graphics.lineTo(w, h - 0.5);
            row.graphics.lineStyle(1, 0x000000, 1);
            row.graphics.beginFill(IoMapUi.relationColour(uid == LOGIN._playerID ? IoMapUi.YOU : IoMapUi.ALLY), 1);
            row.graphics.drawCircle(9, 11, 4);
            row.graphics.endFill();
            row.graphics.lineStyle();
            name.htmlText = IoMapUi.escape(String(player.name)) + "<font color=\"#6B4A26\"> (" + (int(player.level) || 1) + ")" + (leader ? " · leader" : "") + "</font>";
            name.x = 16;
            name.y = 2;
            row.addChild(name);
            where.text = yards && yards.main ? IoMapUi.coord(yards.main[0], yards.main[1]) : "no main yard";
            where.x = 16;
            where.y = 17;
            row.addChild(where);
            if (yards && yards.main) {
                go = IoMapUi.button("Go", 28, 18, function(e:MouseEvent):void {
                        goTo(yards.main[0], yards.main[1]);
                    }, "grey", 9);
                go.x = w - 31;
                go.y = int((h - 18) / 2);
                row.addChild(go);
            }
            content.addChild(row);
            return h;
        }

        internal function Cleanup():void {
            this.hideResults();
            this._search.removeEventListener(Event.CHANGE, this.onSearchChange);
            this._search.removeEventListener(KeyboardEvent.KEY_DOWN, this.onSearchKey);
            this._search.removeEventListener(FocusEvent.FOCUS_IN, this.onSearchFocus);
            if (stage && (stage.focus == this._search || stage.focus == this._editField)) {
                stage.focus = null;
            }
            this._host = null;
            if (parent) {
                parent.removeChild(this);
            }
        }
    }
}
