package com.monsters.quests {
    import com.monsters.casino.CasinoUI;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the quest dock's rows (UI_MISSIONMENU, bottom right), from the quest book: every quest
     * ready to collect first (glowing, with Collect), then the three closest to done. The pinned row under
     * them is the book itself: how many are ready, today's daily quests. A row opens the book at its quest.
     */
    public class IoQuestTracker {

        public static const ROW_W:int = 344;

        public static const ROW_H:int = 32;

        private static const PAD:int = 2;

        /** The first row starts this far down (clear of the dock's title bar). */
        private static const TOP:int = 5;

        private static const MAX_READY:int = 6;

        private static const CLOSEST:int = 3;

        public function IoQuestTracker() {
            super();
        }

        /** Fills the dock: its list and its pinned row. Returns how many rows the list has. */
        public static function fill(list:MovieClip, pinned:MovieClip):int {
            var book:Object = IoQuests.book;
            if (!book) {
                list.addChild(message(KEYS.Get("io_quest_loading")));
                return 1;
            }
            var ready:Array = [];
            var open:Array = [];
            for each (var q:Object in book.quests) {
                if (q.state == "ready") {
                    ready.push(q);
                }
                else if (q.state == "progress" && int(q.target) > 0) {
                    open.push(q);
                }
            }
            for each (var d:Object in book.daily.quests) {
                if (d.state == "ready") {
                    ready.push(d);
                }
                else if (d.state == "progress") {
                    open.push(d);
                }
            }
            open = open.map(function(x:Object, i:int, a:Array):Object {
                    x.ioPart = Number(x.value) / Math.max(1, Number(x.target));
                    return x;
                });
            open.sortOn("ioPart", Array.NUMERIC | Array.DESCENDING);
            var rows:Array = ready.slice(0, MAX_READY).concat(open.slice(0, CLOSEST));
            for (var i:int = 0; i < rows.length; i++) {
                var r:Sprite = row(rows[i], i);
                r.y = TOP + i * (ROW_H + PAD);
                list.addChild(r);
            }
            if (!rows.length) {
                list.addChild(message(KEYS.Get("io_quest_all_done")));
            }
            var p:Sprite = summary(book);
            pinned.addChild(p);
            return Math.max(1, rows.length);
        }

        private static function background(s:Sprite, i:int, hot:Boolean):void {
            var m:Matrix = new Matrix();
            m.createGradientBox(ROW_W, ROW_H, Math.PI / 2, 0, 0);
            s.graphics.clear();
            s.graphics.lineStyle(1, hot ? 0xFFD58A : 0x5A3A2A, 1);
            s.graphics.beginGradientFill(GradientType.LINEAR, hot ? [0x7A4214, 0x4A2208] : i % 2 == 0 ? [0x2E1E1A, 0x1E1412] : [0x241816, 0x160E0C], [1, 1], [0, 255], m);
            s.graphics.drawRoundRect(0, 0, ROW_W, ROW_H, 8, 8);
            s.graphics.endFill();
        }

        private static function row(q:Object, i:int):Sprite {
            var daily:Boolean = !q.cat;
            var id:String = daily ? "daily:" + q.id : String(q.id);
            var ready:Boolean = q.state == "ready";
            var s:Sprite = new Sprite();
            s.name = "ioQuestRow:" + id;
            s.buttonMode = true;
            background(s, i, ready);
            var g:Sprite = s.addChild(IoQuestArt.glyph(String(q.icon), 22)) as Sprite;
            g.x = 17;
            g.y = ROW_H / 2;
            var title:TextField = s.addChild(CasinoUI.label((daily ? KEYS.Get("io_quest_daily_tag") + " " : "") + IoQuests.title(q), 11, ready ? 0xFFFFFF : CasinoUI.GOLD, true, ready ? ROW_W - 120 : ROW_W - 44, TextFormatAlign.LEFT)) as TextField;
            title.x = 32;
            title.y = 1;
            if (ready) {
                var done:TextField = s.addChild(CasinoUI.label(KEYS.Get("io_quest_state_ready"), 9, 0xFFC060, true, ROW_W - 120, TextFormatAlign.LEFT)) as TextField;
                done.x = 32;
                done.y = 16;
                var collect:Sprite = s.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 76, 24, function(e:MouseEvent):void {
                        e.stopPropagation();
                        IoQuests.claim(id);
                    }, !IoQuests.claiming, 11)) as Sprite;
                collect.name = "ioQuestRowCollect";
                collect.x = ROW_W - 82;
                collect.y = 4;
                s.filters = [new GlowFilter(0xFFB040, 0.7, 8, 8, 2, 2)];
            }
            else {
                var part:Number = Math.min(1, Number(q.value) / Math.max(1, Number(q.target)));
                s.graphics.lineStyle(1, 0x9A3A14, 1);
                s.graphics.beginFill(0x120C0B, 1);
                s.graphics.drawRoundRect(32, 20, 150, 7, 7, 7);
                s.graphics.endFill();
                if (part > 0) {
                    s.graphics.lineStyle(0, 0, 0);
                    s.graphics.beginFill(0xE0702A, 1);
                    s.graphics.drawRoundRect(33, 21, Math.max(5, 148 * part), 5, 5, 5);
                    s.graphics.endFill();
                }
                var n:TextField = s.addChild(CasinoUI.label(GLOBAL.FormatNumber(Number(q.value)) + " / " + GLOBAL.FormatNumber(Number(q.target)), 9, CasinoUI.ASH, false, 140, TextFormatAlign.LEFT)) as TextField;
                n.x = 188;
                n.y = 16;
            }
            s.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    IoQuestBook.Show(null, id);
                });
            return s;
        }

        /** The pinned row: the book, how many are ready, today's daily quests. */
        private static function summary(book:Object):Sprite {
            var s:Sprite = new Sprite();
            s.name = "ioQuestRowBook";
            s.buttonMode = true;
            s.mouseChildren = false;
            var ready:int = int(book.ready);
            background(s, 0, ready > 0);
            var g:Sprite = s.addChild(IoQuestArt.glyph("book", 22)) as Sprite;
            g.x = 17;
            g.y = ROW_H / 2;
            var dDone:int = 0;
            var dAll:int = 0;
            for each (var d:Object in book.daily.quests) {
                dAll++;
                if (d.state == "claimed") {
                    dDone++;
                }
            }
            var line:String = KEYS.Get("io_quest_dock_line", {"v1": int(book.claimed), "v2": int(book.total), "v3": dDone, "v4": dAll});
            var t:TextField = s.addChild(CasinoUI.label(line, 11, CasinoUI.GOLD, true, ROW_W - 90, TextFormatAlign.LEFT)) as TextField;
            t.x = 32;
            t.y = 8;
            if (ready > 0) {
                var r:TextField = s.addChild(CasinoUI.label(KEYS.Get("io_quest_dock_ready", {"v1": ready}), 11, 0xFFFFFF, true, 84, TextFormatAlign.RIGHT)) as TextField;
                r.x = ROW_W - 92;
                r.y = 8;
            }
            s.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    IoQuestBook.Show();
                });
            return s;
        }

        private static function message(text:String):Sprite {
            var s:Sprite = new Sprite();
            s.y = TOP;
            background(s, 0, false);
            var t:TextField = s.addChild(CasinoUI.label(text, 11, CasinoUI.ASH, true, ROW_W - 20, TextFormatAlign.CENTER)) as TextField;
            t.x = 10;
            t.y = 8;
            return s;
        }
    }
}
