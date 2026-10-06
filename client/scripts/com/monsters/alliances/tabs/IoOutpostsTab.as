package com.monsters.alliances.tabs {
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.alliances.AllianceConstants;
    import com.monsters.alliances.AllianceTabBase;
    import com.monsters.alliances.IoAllianceUi;
    import com.monsters.maproom_advanced.IoScrollPane;
    import flash.display.DisplayObject;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;

    /**
     * Inferno-only: the Outposts tab (the user's design of 2 October): every outpost the alliance's members
     * took or lost in the last 90 days, newest first, from players and from tribes (raids that don't take
     * the outpost are not kept). Filters: gained / lost, players / tribes, a member, a world. Gained, lost and
     * net over 7 and 30 days at the top. Jump opens the map there (on the player's own world); more rows come
     * as the list is scrolled down.
     */
    public class IoOutpostsTab extends AllianceTabBase {

        private static const PAD:int = 12;

        private static const FILTER_Y:int = 66;

        private static const HEAD_Y:int = 102;

        private static const LIST_Y:int = HEAD_Y + 24;

        private static const ROW_H:int = 30;

        // the columns: when, gained / lost, member, from / to whom, where, jump
        private static const COLS:Array = [[0, 66], [66, 70], [136, 138], [274, 300], [574, 128], [702, 74]];

        private static var _filters:Object = {"kind": "", "source": "", "member": "", "world": ""};

        private var _pane:IoScrollPane;

        private var _events:Array = [];

        private var _more:Boolean = false;

        private var _loading:Boolean = false;

        private var _members:Array = [];

        private var _worlds:Array = [];

        private var _worldNames:Object = {};

        private var _myWorld:String = "";

        private var _summary:Sprite;

        private var _filterBar:Sprite;

        private var _picker:Sprite;

        /** Bumped by every new filter: pages asked for under the old ones are dropped. */
        private var _generation:int = 0;

        public function IoOutpostsTab() {
            super();
        }

        override public function build():void {
            _summary = new Sprite();
            _summary.x = PAD;
            _summary.y = 10;
            addChild(_summary);
            _filterBar = new Sprite();
            _filterBar.x = PAD;
            _filterBar.y = FILTER_Y;
            addChild(_filterBar);
            _buildHead();
            _pane = new IoScrollPane(CONTENT_W - PAD * 2, CONTENT_H - LIST_Y - PAD);
            _pane.x = PAD;
            _pane.y = LIST_Y;
            _pane.onScroll = _onScroll;
            addChild(_pane);
            addEventListener(Event.REMOVED_FROM_STAGE, function(e:Event):void {
                    _closePicker();
                });
            _drawFilters();
            _reload();
        }

        private function _reload():void {
            _generation++;
            _events = [];
            _more = false;
            _loading = false;
            _drawRows();
            _fetch();
        }

        private function _fetch():void {
            if (_loading) {
                return;
            }
            _loading = true;
            var gen:int = _generation;
            var before:int = _events.length > 0 ? int(_events[_events.length - 1].id) : 0;
            ALLIANCES.ioLoadOutposts(_filters, before, function(response:Object):void {
                    if (stage == null || gen != _generation) {
                        return;
                    }
                    _loading = false;
                    if (response == null || response.error) {
                        _more = false;
                        _drawRows(response && response.error ? String(response.error) : KEYS.Get("alliance_err_generic"));
                        return;
                    }
                    var from:int = _events.length;
                    _events = _events.concat(response.events as Array || []);
                    _more = response.more == true;
                    _myWorld = response.my_world ? String(response.my_world) : "";
                    _members = response.members as Array || [];
                    _worlds = response.worlds as Array || [];
                    _worldNames = {};
                    for each (var w:Object in _worlds) {
                        _worldNames[String(w.id)] = String(w.name);
                    }
                    if (from == 0) {
                        _drawSummary(response.summary);
                        _drawFilters();
                        _drawRows();
                    }
                    else {
                        _appendRows(from);
                    }
                    _onScroll(_pane); // (a short page: the next comes at once)
                });
        }

        private function _onScroll(pane:IoScrollPane):void {
            if (_more && !_loading && pane.remaining < ROW_H * 4) {
                _fetch();
            }
        }

        // ---- gained, lost and net over 7 and 30 days

        private function _drawSummary(summary:Object):void {
            while (_summary.numChildren > 0) {
                _summary.removeChildAt(0);
            }
            if (summary == null) {
                return;
            }
            var x:int = 0;
            for each (var period:Array in [["io_alliance_last7", summary.d7], ["io_alliance_last30", summary.d30]]) {
                var s:Object = period[1] || {"gained": 0, "lost": 0, "net": 0};
                var box:Sprite = new Sprite();
                box.x = x;
                IoAllianceUi.card(box.graphics, 0, 0, 300, 46, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
                IoAllianceUi.addText(box, KEYS.Get(String(period[0])), 10, 14, 12, AllianceConstants.IO_INK, true, 96);
                var figures:Array = [
                        [KEYS.Get("io_alliance_gained"), "+" + int(s.gained), AllianceConstants.IO_GAINED],
                        [KEYS.Get("io_alliance_lost"), (int(s.lost) > 0 ? "-" : "") + int(s.lost), AllianceConstants.IO_LOST],
                        [KEYS.Get("io_alliance_net"), IoAllianceUi.signed(int(s.net)), int(s.net) > 0 ? AllianceConstants.IO_GAINED : (int(s.net) < 0 ? AllianceConstants.IO_LOST : AllianceConstants.IO_INK)]
                    ];
                for (var i:int = 0; i < figures.length; i++) {
                    IoAllianceUi.addText(box, String(figures[i][0]), 106 + i * 64, 4, 10, AllianceConstants.IO_MUTED, false, 60, IoAllianceUi.CENTER);
                    IoAllianceUi.addText(box, String(figures[i][1]), 106 + i * 64, 18, 15, uint(figures[i][2]), true, 60, IoAllianceUi.CENTER);
                }
                _summary.addChild(box);
                x += 312;
            }
            IoAllianceUi.addText(_summary, KEYS.Get("io_alliance_kept_days", {"v1": "90"}), x, 15, 11, AllianceConstants.IO_MUTED, false, CONTENT_W - PAD * 2 - x, IoAllianceUi.RIGHT);
        }

        // ---- the filters

        private function _drawFilters():void {
            while (_filterBar.numChildren > 0) {
                _filterBar.removeChildAt(0);
            }
            var x:int = 0;
            x = _segment(x, "kind", [["", "io_alliance_f_all"], ["gained", "io_alliance_gained"], ["lost", "io_alliance_lost"]], 64);
            x += 14;
            x = _segment(x, "source", [["", "io_alliance_f_both"], ["player", "io_alliance_f_players"], ["tribe", "io_alliance_f_tribes"]], 72);
            x += 14;
            var memberName:String = KEYS.Get("io_alliance_f_all_members");
            for each (var m:Object in _members) {
                if (String(m.id) == _filters.member) {
                    memberName = String(m.name);
                }
            }
            var member:MovieClip = IoAllianceUi.button(memberName + "  v", 156, 26, function(e:MouseEvent):void {
                    var options:Array = [["", KEYS.Get("io_alliance_f_all_members")]];
                    for each (var mm:Object in _members) {
                        options.push([String(mm.id), String(mm.name)]);
                    }
                    _openPicker(e.currentTarget as DisplayObject, "member", options);
                }, _filters.member ? "gold" : "grey", 11);
            member.x = x;
            member.name = "ioFilterMember";
            _filterBar.addChild(member);
            x += 156 + 10;
            var worldName:String = _filters.world ? (_worldNames[_filters.world] || "?") : KEYS.Get("io_alliance_f_all_worlds");
            var world:MovieClip = IoAllianceUi.button(worldName + "  v", 146, 26, function(e:MouseEvent):void {
                    var options:Array = [["", KEYS.Get("io_alliance_f_all_worlds")]];
                    for each (var ww:Object in _worlds) {
                        options.push([String(ww.id), String(ww.name)]);
                    }
                    _openPicker(e.currentTarget as DisplayObject, "world", options);
                }, _filters.world ? "gold" : "grey", 11);
            world.x = x;
            world.name = "ioFilterWorld";
            _filterBar.addChild(world);
        }

        /** Buttons side by side, the chosen one gold. Returns where the next thing goes. */
        private function _segment(x:int, key:String, options:Array, w:int):int {
            for each (var o:Array in options) {
                var value:String = String(o[0]);
                var b:MovieClip = IoAllianceUi.button(KEYS.Get(String(o[1])), w, 26, _setter(key, value), _filters[key] == value ? "gold" : "grey", 11);
                b.x = x;
                b.name = "ioFilter_" + key + "_" + (value || "all");
                _filterBar.addChild(b);
                x += w + 2;
            }
            return x;
        }

        private function _setter(key:String, value:String):Function {
            return function(e:MouseEvent = null):void {
                _closePicker();
                if (_filters[key] == value) {
                    return;
                }
                _filters[key] = value;
                _drawFilters();
                _reload();
            };
        }

        /** A list to choose from, under its button (members, worlds). */
        private function _openPicker(anchor:DisplayObject, key:String, options:Array):void {
            _closePicker();
            const w:int = 200;
            const rowH:int = 24;
            var h:int = Math.min(options.length * rowH, 220);
            var p:Sprite = new Sprite();
            p.name = "ioPicker";
            IoAllianceUi.card(p.graphics, -4, -4, w + 8, h + 8, 0xFFFFFF, AllianceConstants.BORDER_COLOR);
            var pane:IoScrollPane = new IoScrollPane(w, h);
            p.addChild(pane);
            for (var i:int = 0; i < options.length; i++) {
                var row:Sprite = new Sprite();
                row.y = i * rowH;
                row.buttonMode = true;
                row.mouseChildren = false;
                row.name = "ioPick" + i;
                var chosen:Boolean = _filters[key] == String(options[i][0]);
                row.graphics.beginFill(chosen ? AllianceConstants.ROW_ME : (i % 2 == 0 ? AllianceConstants.ROW_ALT0 : 0xFFFFFF), 1);
                row.graphics.drawRect(0, 0, pane.innerWidth, rowH);
                row.graphics.endFill();
                IoAllianceUi.addText(row, String(options[i][1]), 8, 3, 12, AllianceConstants.IO_INK, chosen, pane.innerWidth - 12);
                row.addEventListener(MouseEvent.CLICK, _setter(key, String(options[i][0])));
                pane.content.addChild(row);
            }
            pane.refresh(options.length * rowH);
            var at:Point = globalToLocal(anchor.localToGlobal(new Point(0, anchor.height + 4)));
            p.x = Math.min(int(at.x), CONTENT_W - w - 8);
            p.y = int(at.y);
            addChild(p);
            _picker = p;
            p.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                });
            if (stage) {
                stage.addEventListener(MouseEvent.MOUSE_DOWN, _onStageDown);
            }
        }

        private function _onStageDown(e:MouseEvent):void {
            if (_picker && e.target is DisplayObject && _picker.contains(DisplayObject(e.target))) {
                return;
            }
            _closePicker();
        }

        private function _closePicker():void {
            if (stage) {
                stage.removeEventListener(MouseEvent.MOUSE_DOWN, _onStageDown);
            }
            if (_picker && _picker.parent) {
                _picker.parent.removeChild(_picker);
            }
            _picker = null;
        }

        // ---- the list

        private function _buildHead():void {
            var head:Sprite = new Sprite();
            head.x = PAD;
            head.y = HEAD_Y;
            var w:int = CONTENT_W - PAD * 2 - IoScrollPane.BAR_W - 2;
            head.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
            head.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
            head.graphics.drawRect(0, 0, w, 24);
            head.graphics.endFill();
            var labels:Array = ["io_alliance_col_when", "io_alliance_col_event", "io_alliance_col_member", "io_alliance_col_other", "io_alliance_col_where", "io_alliance_col_jump"];
            for (var i:int = 0; i < labels.length; i++) {
                IoAllianceUi.addText(head, KEYS.Get(String(labels[i])), int(COLS[i][0]) + 6, 3, 11, 0x000000, true, int(COLS[i][1]) - 8, i == 5 ? IoAllianceUi.CENTER : "left");
            }
            addChild(head);
        }

        private function _drawRows(error:String = null):void {
            var c:Sprite = _pane.content;
            while (c.numChildren > 0) {
                c.removeChildAt(0);
            }
            var w:int = _pane.innerWidth;
            if (error || _events.length == 0) {
                var msg:String = error ? error : (_loading ? KEYS.Get("msg_loading") : KEYS.Get("io_alliance_no_outposts"));
                IoAllianceUi.addText(c, msg, 10, 12, 12, AllianceConstants.IO_MUTED, false, w - 20, "left", false, true);
                _pane.refresh(50);
                return;
            }
            for (var i:int = 0; i < _events.length; i++) {
                c.addChild(_row(_events[i], i, w));
            }
            _pane.refresh(_moreRow(c, w));
        }

        /** The next page: its rows go under the ones shown (nothing drawn again). */
        private function _appendRows(from:int):void {
            var c:Sprite = _pane.content;
            var loading:DisplayObject = c.getChildByName("ioMore");
            if (loading) {
                c.removeChild(loading);
            }
            var w:int = _pane.innerWidth;
            for (var i:int = from; i < _events.length; i++) {
                c.addChild(_row(_events[i], i, w));
            }
            _pane.refresh(_moreRow(c, w));
        }

        /** "Loading..." under the rows while there are more; returns the list's height. */
        private function _moreRow(c:Sprite, w:int):int {
            var h:int = _events.length * ROW_H;
            if (_more) {
                var t:DisplayObject = IoAllianceUi.addText(c, KEYS.Get("msg_loading"), 10, h + 6, 11, AllianceConstants.IO_MUTED, false, w - 20, IoAllianceUi.CENTER);
                t.name = "ioMore";
                h += 30;
            }
            return h;
        }

        private function _row(ev:Object, i:int, w:int):Sprite {
            var r:Sprite = new Sprite();
            r.y = i * ROW_H;
            r.name = "ioEvent" + int(ev.id);
            r.graphics.beginFill(i % 2 == 0 ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1, 1);
            r.graphics.drawRect(0, 0, w, ROW_H);
            r.graphics.endFill();
            r.graphics.lineStyle(1, 0xD8C3A6, 1);
            r.graphics.moveTo(0, ROW_H - 0.5);
            r.graphics.lineTo(w, ROW_H - 0.5);
            var ty:int = int((ROW_H - 18) / 2);
            var gained:Boolean = String(ev.kind) == "gained";
            IoAllianceUi.addText(r, IoAllianceUi.ago(Number(ev.ts)), int(COLS[0][0]) + 6, ty, 11, AllianceConstants.IO_MUTED, false, int(COLS[0][1]) - 8);
            IoAllianceUi.addText(r, KEYS.Get(gained ? "io_alliance_gained" : "io_alliance_lost"), int(COLS[1][0]) + 6, ty, 11, gained ? AllianceConstants.IO_GAINED : AllianceConstants.IO_LOST, true, int(COLS[1][1]) - 8);
            IoAllianceUi.addText(r, String(ev.user_name), int(COLS[2][0]) + 6, ty, 11, AllianceConstants.IO_INK, true, int(COLS[2][1]) - 8);
            IoAllianceUi.addText(r, _other(ev), int(COLS[3][0]) + 6, ty, 11, AllianceConstants.IO_INK, false, int(COLS[3][1]) - 8, "left", true);
            var place:String = IoAllianceUi.coord(int(ev.x), int(ev.y));
            var world:String = ev.world_id ? String(ev.world_id) : "";
            var elsewhere:Boolean = world && _myWorld && world != _myWorld;
            if (elsewhere && _worldNames[world]) {
                place += " · " + String(_worldNames[world]);
            }
            IoAllianceUi.addText(r, place, int(COLS[4][0]) + 6, ty, 11, AllianceConstants.IO_INK, false, int(COLS[4][1]) - 8);
            var px:int = int(ev.x);
            var py:int = int(ev.y);
            var jump:MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), int(COLS[5][1]) - 10, 22, function(e:MouseEvent):void {
                    IoAllianceUi.jump(px, py, world);
                }, "gold", 10);
            jump.x = int(COLS[5][0]) + 5;
            jump.y = 4;
            jump.name = "ioJump";
            if (elsewhere) {
                Object(jump).setEnabled(false);
            }
            r.addChild(jump);
            return r;
        }

        /** From or to whom: "IoFriend (Hellions)", "a tribe: Legionnaire", "(before the history began)". */
        private function _other(ev:Object):String {
            var name:String = ev.other_name ? IoEsc(String(ev.other_name)) : "";
            switch (String(ev.source)) {
                case "tribe":
                    return KEYS.Get(String(ev.kind) == "gained" ? "io_alliance_from_tribe" : "io_alliance_to_tribe", {"v1": name || "?"});
                case "player":
                    var who:String = "<b>" + (name || "?") + "</b>";
                    if (ev.other_alliance) {
                        who += " <font color=\"#7A6550\">(" + IoEsc(String(ev.other_alliance)) + ")</font>";
                    }
                    return KEYS.Get(String(ev.kind) == "gained" ? "io_alliance_from_player" : "io_alliance_to_player", {"v1": who});
                default:
                    return "<font color=\"#7A6550\">" + KEYS.Get("io_alliance_from_unknown") + "</font>";
            }
        }

        private static function IoEsc(s:String):String {
            return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
        }
    }
}
