package com.monsters.leaderboards {
    import com.monsters.casino.CasinoUI;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFieldAutoSize;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only (4 October, the user's): the Changelog, opened by the top bar's button right of the attack logs
     * (UI_TOP.ioChangelogButton). Every change ever made to the Inferno, day by day, newest first: on the left the
     * days (a click goes to that day), on the right each day's heading and its changes, each with its area (Yard,
     * Map, Depths...), a short title and a line or two saying what it means.
     *
     * Data: the server's /changelog (controllers/changelog.ts), which is server/public/docs/changelog.json; asked
     * for each time the window opens, so a new version is published by replacing that file. It is in English.
     * Hell Freezes Over stays "[ CLASSIFIED ]" there, as in the players' guide.
     */
    public class IoChangelog {

        private static const W:int = IoAttackLogs.W;

        private static const H:int = IoAttackLogs.H;

        private static const DAYS_X:int = -W / 2 + 20;

        private static const DAYS_W:int = 168;

        private static const LIST_X:int = DAYS_X + DAYS_W + 10;

        private static const LIST_W:int = W / 2 - 20 - LIST_X;

        private static const TOP:int = -H / 2 + 118;

        private static const LIST_H:int = H / 2 - 52 - TOP;

        private static const TEXT_W:int = LIST_W - 12 - 10 - 24;

        /** Each area's colour (the tag in front of a change). */
        private static const AREAS:Object = {
                "Yard": 0x6AB04A, "Map": 0x4A8AD0, "Depths": 0xB070F0, "Battles": 0xE0503A, "Monsters": 0xE08A3A,
                "Buildings": 0xC8A050, "Economy": 0xE0C040, "Events": 0xFF7A2A, "Quests": 0x50B0A0, "Alliances": 0x5A9AE0,
                "Chat": 0x80C0E0, "Leaderboards": 0xD0B060, "Brimstone Pit": 0xD06A90, "Pets": 0xA0D070, "Replays": 0x9A9AE0,
                "Interface": 0xB8A898, "Browser": 0x70B8B0, "Admins": 0x9A7AC0, "Fixes": 0x8A9A8A
            };

        private static const MONTHS:Array = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        private static const WEEKDAYS:Array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        private static var _open:IoChangelog = null;

        /** The last answer, kept while the game runs (opened again, it shows at once and is asked for again). */
        private static var _cache:Object = null;

        public var mc:MovieClip;

        private var _list:Object;

        private var _days:Object;

        private var _status:TextField;

        private var _sub:TextField;

        /** Where each day's heading is in the list (by its index), for the day buttons. */
        private var _dayTops:Array = [];

        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open.mc || !_open.mc.stage)) {
                _open = null;
            }
            if (_open) {
                return;
            }
            SOUNDS.Play("click1");
            _open = new IoChangelog();
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

        public function IoChangelog() {
            super();
            this.mc = new MovieClip();
            this.mc.name = "ioChangelogWindow";
            IoAttackLogs.frame(this.mc);
            var title:TextField = this.mc.addChild(CasinoUI.title(KEYS.Get("cl_title"), 34, W - 200)) as TextField;
            title.x = -W / 2 + 100;
            title.y = -H / 2 + 24;
            this._sub = this.mc.addChild(CasinoUI.label(KEYS.Get("cl_sub"), 13, CasinoUI.GOLD, true, W - 40, TextFormatAlign.CENTER)) as TextField;
            this._sub.x = -W / 2 + 20;
            this._sub.y = -H / 2 + 80;
            GLOBAL.ioFitText(this._sub);
            this._days = IoAttackLogs.scrollView(this.mc, DAYS_X, TOP, DAYS_W, LIST_H);
            this._list = IoAttackLogs.scrollView(this.mc, LIST_X, TOP, LIST_W, LIST_H);
            this._status = this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, LIST_W - 40, TextFormatAlign.CENTER)) as TextField;
            this._status.x = LIST_X + 20;
            this._status.y = TOP + 40;
            var hint:TextField = this.mc.addChild(CasinoUI.label(KEYS.Get("cl_hint"), 12, CasinoUI.ASH, false, W - 40, TextFormatAlign.LEFT)) as TextField;
            hint.x = -W / 2 + 20;
            hint.y = TOP + LIST_H + 10;
            GLOBAL.ioFitText(hint);
            this.mc.addChild(IoAttackLogs.closeButton("ioClClose", this.close));
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this.mc);
            POPUPSETTINGS.AlignToCenter(this.mc);
            POPUPSETTINGS.ScaleUp(this.mc);
            if (_cache) {
                this.fill(_cache);
            }
            else {
                this._status.text = KEYS.Get("cl_loading");
            }
            this.fetch();
        }

        private function fetch():void {
            var self:IoChangelog = this;
            new URLLoaderApi().load(GLOBAL.serverUrl + "changelog", null, function(r:Object):void {
                    if (!self.mc) {
                        return;
                    }
                    if (!r || r.error || !(r.entries is Array)) {
                        if (!_cache) {
                            self._status.text = KEYS.Get("cl_failed");
                        }
                        return;
                    }
                    var fresh:Boolean = !_cache || JSON.stringify(_cache.entries) != JSON.stringify(r.entries);
                    _cache = r;
                    if (fresh) {
                        self.fill(r);
                    }
                }, function(e:IOErrorEvent):void {
                    if (self.mc && !_cache) {
                        self._status.text = KEYS.Get("cl_failed");
                    }
                });
        }

        /** "2026-10-04" as "Sunday 4 October 2026" (or as "4 Oct", short). */
        public static function dayName(iso:String, short:Boolean = false):String {
            var p:Array = String(iso).split("-");
            if (p.length < 3) {
                return String(iso);
            }
            var y:int = int(p[0]);
            var m:int = int(p[1]) - 1;
            var d:int = int(p[2]);
            if (m < 0 || m > 11) {
                return String(iso);
            }
            if (short) {
                return d + " " + String(MONTHS[m]).substr(0, 3) + " " + y;
            }
            return WEEKDAYS[new Date(y, m, d).getDay()] + " " + d + " " + MONTHS[m] + " " + y;
        }

        private function fill(data:Object):void {
            var entries:Array = data.entries as Array || [];
            var rows:Sprite = this._list.content;
            var days:Sprite = this._days.content;
            while (rows.numChildren) {
                rows.removeChildAt(0);
            }
            while (days.numChildren) {
                days.removeChildAt(0);
            }
            this._dayTops = [];
            var count:int = 0;
            var y:Number = 8;
            for (var i:int = 0; i < entries.length; i++) {
                var entry:Object = entries[i];
                this._dayTops.push(y);
                // the day's heading
                var head:Sprite = rows.addChild(new Sprite()) as Sprite;
                head.name = "ioClDay" + i;
                head.y = y;
                head.graphics.beginFill(0x3A1A10, 0.95);
                head.graphics.lineStyle(1, 0xC8501A, 1);
                head.graphics.drawRoundRect(6, 0, LIST_W - 28, 44, 10, 10);
                head.graphics.endFill();
                var when:TextField = head.addChild(CasinoUI.label(dayName(entry.date), 14, CasinoUI.GOLD, true, LIST_W - 50)) as TextField;
                when.x = 16;
                when.y = 4;
                var what:TextField = head.addChild(CasinoUI.label(String(entry.headline || ""), 11, CasinoUI.ASH, false, LIST_W - 50)) as TextField;
                what.x = 16;
                what.y = 23;
                GLOBAL.ioFitText(what);
                y += 52;
                for each (var item:Object in entry.items as Array || []) {
                    y += this.addItem(rows, y, item);
                    count++;
                }
                y += 10;
                // its button on the left
                var b:Sprite = days.addChild(this.dayButton(i, dayName(entry.date, true), (entry.items as Array || []).length)) as Sprite;
                b.y = 6 + i * 34;
            }
            this._list.setTotal(y + 8, true);
            this._days.setTotal(6 + entries.length * 34 + 6, true);
            this._status.text = entries.length ? "" : KEYS.Get("cl_failed");
            this._sub.htmlText = KEYS.Get("cl_sub_count", {"v1": GLOBAL.FormatNumber(count), "v2": entries.length, "v3": dayName(String(data.updated || (entries.length ? entries[0].date : "")), true)});
            GLOBAL.ioFitText(this._sub);
        }

        /** One change: its area's tag, its title, what it means; returns how tall it is. */
        private function addItem(rows:Sprite, y:Number, item:Object):Number {
            var area:String = String(item.area || "");
            var colour:uint = AREAS[area] != null ? uint(AREAS[area]) : 0xB8A898;
            var row:Sprite = rows.addChild(new Sprite()) as Sprite;
            row.y = y;
            var tag:TextField = row.addChild(CasinoUI.label(area, 9, 0x1A0E0A, true, 84, TextFormatAlign.CENTER)) as TextField;
            tag.x = 14;
            tag.y = 2;
            GLOBAL.ioFitText(tag);
            row.graphics.beginFill(colour, 1);
            row.graphics.drawRoundRect(14, 2, 84, 16, 8, 8);
            row.graphics.endFill();
            var title:TextField = row.addChild(CasinoUI.label(String(item.title || ""), 12, 0xFFFFFF, true, TEXT_W - 96)) as TextField;
            title.x = 106;
            title.y = 0;
            GLOBAL.ioFitText(title);
            var text:TextField = row.addChild(CasinoUI.label(String(item.text || ""), 11, 0xD8CCC0, false, TEXT_W)) as TextField;
            text.wordWrap = true;
            text.multiline = true;
            text.autoSize = TextFieldAutoSize.LEFT;
            text.text = String(item.text || "");
            text.x = 14;
            text.y = 20;
            return 20 + Math.max(16, text.textHeight + 6) + 8;
        }

        private function dayButton(i:int, label:String, items:int):Sprite {
            var self:IoChangelog = this;
            var b:Sprite = new Sprite();
            b.name = "ioClGo" + i;
            b.buttonMode = true;
            b.mouseChildren = false;
            var draw:Function = function(over:Boolean):void {
                b.graphics.clear();
                b.graphics.lineStyle(1, over ? 0xFFC060 : 0x9A3A14, 1);
                b.graphics.beginFill(over ? 0x5A2A14 : 0x2A1610, 1);
                b.graphics.drawRoundRect(6, 0, DAYS_W - 32, 28, 8, 8);
                b.graphics.endFill();
            };
            draw(false);
            var t:TextField = b.addChild(CasinoUI.label(label, 12, CasinoUI.GOLD, true, DAYS_W - 76)) as TextField;
            t.x = 12;
            t.y = 5;
            GLOBAL.ioFitText(t);
            var n:TextField = b.addChild(CasinoUI.label(String(items), 11, CasinoUI.ASH, false, 34, TextFormatAlign.RIGHT)) as TextField;
            n.x = DAYS_W - 32 - 40;
            n.y = 6;
            b.addEventListener(MouseEvent.MOUSE_OVER, function(e:MouseEvent):void {
                    draw(true);
                });
            b.addEventListener(MouseEvent.MOUSE_OUT, function(e:MouseEvent):void {
                    draw(false);
                });
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    self.goTo(i);
                });
            return b;
        }

        /** Scrolls the list to day `i`. */
        public function goTo(i:int):void {
            if (i < 0 || i >= this._dayTops.length) {
                return;
            }
            this._list.offset = Number(this._dayTops[i]) - 4;
            this._list.place();
        }

        public function close(e:MouseEvent = null):void {
            if (!this.mc) {
                return;
            }
            SOUNDS.Play("close");
            this._list.stop();
            this._days.stop();
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
