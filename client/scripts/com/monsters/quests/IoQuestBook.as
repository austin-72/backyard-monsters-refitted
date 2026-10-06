package com.monsters.quests {
    import com.monsters.alliances.IoAllianceUi;
    import com.monsters.casino.CasinoUI;
    import flash.display.GradientType;
    import flash.display.Graphics;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.geom.Rectangle;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;
    import flash.utils.getTimer;

    /**
     * Inferno-only: the quest book (the user's design of 2 October: "something like a tree of quests"), opened
     * by the Quests button (QUESTS.Show) and the dock's rows. In the Leaderboards' look:
     *
     *  - left, the categories (and today's daily quests), each with how many are collected and a badge for
     *    the ones ready;
     *  - middle, the category's quests as a tree: a quest opens once the one above it is collected. Drag (or
     *    the wheel) to move round it. "Hide finished" folds away branches that are all collected;
     *  - under it, the category's chest: every quest in it (the optional ones aside) collected;
     *  - right, the quest picked: what to do, how far along, the reward, Collect and Go there;
     *  - top, the whole book: quests collected, chests, the book's own chest, Collect all.
     *
     * The server decides what is ready and pays it (IoQuests); this only draws IoQuests.book.
     */
    public class IoQuestBook {

        public static const W:int = 780;

        public static const H:int = 560;

        private static const CAT_X:int = -W / 2 + 16;

        private static const CAT_W:int = 132;

        private static const CANVAS_X:int = -W / 2 + 160;

        private static const CANVAS_Y:int = -H / 2 + 104;

        private static const CANVAS_W:int = 384;

        private static const CANVAS_H:int = 344;

        private static const PANEL_X:int = CANVAS_X + CANVAS_W + 12;

        private static const PANEL_W:int = W / 2 - 16 - PANEL_X;

        private static const NODE_R:int = 22;

        private static const NODE_DX:int = 88;

        private static const LEVEL_DY:int = 86;

        private static const GLYPHS:Object = {
                "daily": "star", "start": "flag", "yard": "hall", "monsters": "egg", "battles": "sword", "map": "map",
                "outposts": "outpost", "alliances": "banner", "social": "chat", "events": "gift", "pit": "dice"
            };

        private static var _open:IoQuestBook = null;

        /** The category shown last, and whether finished branches are folded (kept between openings). */
        private static var _cat:String = "start";

        private static var _hideDone:Boolean = false;

        public var mc:MovieClip;

        private var _catRows:Object = {};

        private var _catLayer:Sprite;

        private var _canvas:Sprite;

        private var _content:Sprite;

        private var _edges:Shape;

        private var _nodes:Sprite;

        private var _nodeSprites:Object = {};

        private var _panel:Sprite;

        private var _chestStrip:Sprite;

        private var _top:Sprite;

        private var _status:TextField;

        private var _hideToggle:Sprite;

        private var _hint:TextField;

        private var _collectAll:Sprite;

        private var _selected:String = null;

        private var _version:int = -1;

        private var _dragging:Boolean = false;

        private var _dragFromX:Number = 0;

        private var _dragFromY:Number = 0;

        private var _dragMoved:Boolean = false;

        private var _contentW:Number = 0;

        private var _contentH:Number = 0;

        private var _statusUntil:int = 0;

        /** Opens the book (at the quest `focus`, if given: the dock's rows, the toast). */
        public static function Show(e:MouseEvent = null, focus:String = null):void {
            if (!IoQuests.on) {
                return;
            }
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (_open && (!_open.mc || !_open.mc.stage)) {
                _open = null;
            }
            if (focus) {
                var q:Object = IoQuests.quest(focus);
                if (focus.indexOf("daily:") == 0) {
                    _cat = "daily";
                }
                else if (q) {
                    _cat = String(q.cat);
                }
            }
            if (_open) {
                if (focus) {
                    _open._selected = focus.indexOf("daily:") == 0 ? null : focus;
                    _open.redraw(true);
                }
                return;
            }
            if (GLOBAL._newBuilding) {
                GLOBAL._newBuilding.Cancel();
            }
            BASE.BuildingDeselect();
            SOUNDS.Play("click1");
            _open = new IoQuestBook(focus && focus.indexOf("daily:") != 0 ? focus : null);
            IoQuests.refresh(GLOBAL.Timestamp() - IoQuests.fetchedAt > 15);
        }

        public static function get isOpen():Boolean {
            return _open != null;
        }

        public static function CloseOpen():void {
            if (_open) {
                _open.close();
            }
            _open = null;
        }

        public function IoQuestBook(focus:String) {
            super();
            this._selected = focus;
            this.mc = new MovieClip();
            this.mc.name = "ioQuestBookWindow";
            this.drawFrame();
            var title:TextField = this.mc.addChild(CasinoUI.title(KEYS.Get("io_quest_title"), 30, 260, TextFormatAlign.LEFT)) as TextField;
            GLOBAL.ioFitText(title, 20);
            title.x = -W / 2 + 22;
            title.y = -H / 2 + 14;
            this._top = this.mc.addChild(new Sprite()) as Sprite;
            this._catLayer = this.mc.addChild(new Sprite()) as Sprite;
            // the tree
            var box:Sprite = this.mc.addChild(CasinoUI.panel(CANVAS_W, CANVAS_H, 0.9)) as Sprite;
            box.x = CANVAS_X;
            box.y = CANVAS_Y;
            this._canvas = this.mc.addChild(new Sprite()) as Sprite;
            this._canvas.name = "ioQuestCanvas";
            this._canvas.x = CANVAS_X;
            this._canvas.y = CANVAS_Y;
            var hit:Shape = this._canvas.addChild(new Shape()) as Shape;
            hit.graphics.beginFill(0, 0);
            hit.graphics.drawRect(0, 0, CANVAS_W, CANVAS_H);
            hit.graphics.endFill();
            this._content = this._canvas.addChild(new Sprite()) as Sprite;
            this._edges = this._content.addChild(new Shape()) as Shape;
            this._nodes = this._content.addChild(new Sprite()) as Sprite;
            var mask:Shape = this._canvas.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(1, 1, CANVAS_W - 2, CANVAS_H - 2, 12, 12);
            mask.graphics.endFill();
            this._content.mask = mask;
            this._canvas.addEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            this._canvas.addEventListener(MouseEvent.MOUSE_WHEEL, this.onWheel);
            this._chestStrip = this.mc.addChild(new Sprite()) as Sprite;
            this._chestStrip.x = CANVAS_X;
            this._chestStrip.y = CANVAS_Y + CANVAS_H + 8;
            // the quest picked
            var pbox:Sprite = this.mc.addChild(CasinoUI.panel(PANEL_W, CANVAS_H + 64, 0.9)) as Sprite;
            pbox.x = PANEL_X;
            pbox.y = CANVAS_Y;
            this._panel = this.mc.addChild(new Sprite()) as Sprite;
            this._panel.x = PANEL_X;
            this._panel.y = CANVAS_Y;
            this._hideToggle = this.mc.addChild(CasinoUI.toggle(KEYS.Get("io_quest_hide_done"), 120, 22, this.toggleHide)) as Sprite;
            this._hideToggle.name = "ioQuestHideDone";
            this._hideToggle.x = CANVAS_X + CANVAS_W - 120;
            this._hideToggle.y = CANVAS_Y - 28;
            CasinoUI.choose(this._hideToggle, _hideDone);
            this._hint = this.mc.addChild(CasinoUI.label(KEYS.Get("io_quest_drag_hint"), 10, CasinoUI.ASH, false, CANVAS_W - 130, TextFormatAlign.LEFT)) as TextField;
            this._hint.x = CANVAS_X + 2;
            this._hint.y = CANVAS_Y - 24;
            this._status = this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, W - 200, TextFormatAlign.LEFT)) as TextField;
            this._status.name = "ioQuestStatus";
            this._status.x = CAT_X + CAT_W + 14;
            this._status.y = H / 2 - 24;
            var old:Sprite = this.mc.addChild(textLink(KEYS.Get("io_quest_old"), this.openOld)) as Sprite;
            old.name = "ioQuestOld";
            old.x = CAT_X;
            old.y = H / 2 - 24;
            // close
            var x:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            x.name = "ioQuestClose";
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
            this.redraw(true);
        }

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
            art.alpha = 0.55;
            CasinoUI.picture(art, "leaderboards/bg.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, H - 12);
            var mask:Shape = this.mc.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            mask.graphics.endFill();
            art.mask = mask;
        }

        // ---- drawing it all (again when the book changes)

        private function redraw(recentre:Boolean):void {
            this._version = IoQuests.version;
            this.drawTop();
            this.drawCategories();
            var book:Object = IoQuests.book;
            if (!book) {
                CasinoUI.removeAll(this._nodes);
                this._edges.graphics.clear();
                CasinoUI.removeAll(this._panel);
                CasinoUI.removeAll(this._chestStrip);
                var wait:TextField = this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_loading"), 14, CasinoUI.ASH, true, CANVAS_W, TextFormatAlign.CENTER)) as TextField;
                wait.y = CANVAS_H / 2 - 12;
                this._content.x = this._content.y = 0;
                return;
            }
            this._hideToggle.visible = _cat != "daily";
            this._hint.visible = _cat != "daily";
            if (_cat == "daily") {
                this.drawDaily();
            }
            else {
                this.drawTree(recentre);
                this.drawChest();
            }
            this.drawPanel();
        }

        private function drawTop():void {
            CasinoUI.removeAll(this._top);
            var book:Object = IoQuests.book;
            var x0:int = -W / 2 + 290;
            var y0:int = -H / 2 + 20;
            var claimed:int = book ? int(book.claimed) : 0;
            var total:int = book ? int(book.total) : 0;
            var chests:Array = book ? book.chests as Array : [];
            var chestsDone:int = 0;
            var bookChest:Object = null;
            for each (var c:Object in chests) {
                if (c.cat == "book") {
                    bookChest = c;
                }
                else if (c.state == "claimed") {
                    chestsDone++;
                }
            }
            var barW:int = 250;
            bar(this._top.graphics, x0, y0 + 20, barW, 12, total > 0 ? claimed / total : 0);
            var line:TextField = this._top.addChild(CasinoUI.label(KEYS.Get("io_quest_book_line", {"v1": claimed, "v2": total, "v3": chestsDone, "v4": Math.max(0, chests.length - 1)}), 11, CasinoUI.GOLD, true, barW + 40, TextFormatAlign.LEFT)) as TextField;
            line.x = x0;
            line.y = y0;
            // the book's own chest
            if (bookChest) {
                var bc:Sprite = this.chestButton(bookChest, 34);
                bc.name = "ioQuestBookChest";
                bc.x = x0 + barW + 28;
                bc.y = y0 + 18;
                this._top.addChild(bc);
            }
            var ready:int = book ? int(book.ready) : 0;
            this._collectAll = this._top.addChild(CasinoUI.button(KEYS.Get("io_quest_collect_all", {"v1": ready}), 136, 30, this.collectAll, ready > 0 && !IoQuests.claiming, 12)) as Sprite;
            this._collectAll.name = "ioQuestCollectAll";
            this._collectAll.x = W / 2 - 50 - 136;
            this._collectAll.y = -H / 2 + 46;
        }

        private function drawCategories():void {
            CasinoUI.removeAll(this._catLayer);
            this._catRows = {};
            var book:Object = IoQuests.book;
            var cats:Array = ["daily"].concat(book && book.categories ? book.categories as Array : ["start", "yard", "monsters", "battles", "map", "outposts", "alliances", "social", "events", "pit"]);
            var y:int = CANVAS_Y - 28;
            for each (var cat:String in cats) {
                var done:int = 0;
                var all:int = 0;
                var ready:int = 0;
                if (book) {
                    if (cat == "daily") {
                        for each (var d:Object in book.daily.quests) {
                            all++;
                            if (d.state == "claimed") {
                                done++;
                            }
                            if (d.state == "ready") {
                                ready++;
                            }
                        }
                        if (book.daily.bonus && book.daily.bonus.state == "ready") {
                            ready++;
                        }
                    }
                    else {
                        for each (var q:Object in book.quests) {
                            if (q.cat != cat) {
                                continue;
                            }
                            all++;
                            if (q.state == "claimed") {
                                done++;
                            }
                            if (q.state == "ready") {
                                ready++;
                            }
                        }
                        for each (var c:Object in book.chests) {
                            if (c.cat == cat && c.state == "ready") {
                                ready++;
                            }
                        }
                    }
                }
                var row:Sprite = this.catRow(cat, done, all, ready);
                row.x = CAT_X;
                row.y = y;
                this._catLayer.addChild(row);
                this._catRows[cat] = row;
                y += cat == "daily" ? 38 : 34;
            }
        }

        private function catRow(cat:String, done:int, all:int, ready:int):Sprite {
            var on:Boolean = cat == _cat;
            var row:Sprite = new Sprite();
            row.name = "ioQuestCat:" + cat;
            row.buttonMode = true;
            row.mouseChildren = false;
            var m:Matrix = new Matrix();
            m.createGradientBox(CAT_W, 30, Math.PI / 2, 0, 0);
            row.graphics.lineStyle(1, on ? 0xFFE0A0 : 0x7A5A48, 1);
            row.graphics.beginGradientFill(GradientType.LINEAR, on ? [0xE08A30, 0x9A3010] : [0x3A2A26, 0x1E1614], [1, 1], [0, 255], m);
            row.graphics.drawRoundRect(0, 0, CAT_W, 30, 8, 8);
            row.graphics.endFill();
            var g:Sprite = row.addChild(IoQuestArt.glyph(GLYPHS[cat] || "star", 18)) as Sprite;
            g.x = 15;
            g.y = 15;
            var name:TextField = row.addChild(CasinoUI.label(KEYS.Get("io_quest_cat_" + cat), 11, on ? 0xFFFFFF : CasinoUI.GOLD, true, 76, TextFormatAlign.LEFT)) as TextField;
            name.x = 27;
            name.y = 7;
            var count:TextField = row.addChild(CasinoUI.label(all > 0 ? done + "/" + all : "", 9, on ? 0xFFF0D0 : CasinoUI.ASH, false, 40, TextFormatAlign.RIGHT)) as TextField;
            count.x = CAT_W - 44;
            count.y = 9;
            if (ready > 0) {
                var badge:Sprite = row.addChild(readyBadge(ready)) as Sprite;
                badge.x = CAT_W - 2;
                badge.y = 2;
            }
            row.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    _cat = cat;
                    _selected = null;
                    redraw(true);
                });
            return row;
        }

        private static function readyBadge(n:int):Sprite {
            var b:Sprite = new Sprite();
            b.mouseEnabled = false;
            b.graphics.lineStyle(1.5, 0x4A0A02, 1);
            b.graphics.beginFill(0xFFB040, 1);
            b.graphics.drawCircle(0, 0, 8);
            b.graphics.endFill();
            var t:TextField = b.addChild(CasinoUI.label(String(Math.min(n, 99)), 9, 0x3A1004, true, 20, TextFormatAlign.CENTER)) as TextField;
            t.x = -10;
            t.y = -7;
            b.filters = [new GlowFilter(0xFFB040, 0.9, 8, 8, 2, 2)];
            return b;
        }

        // ---- the tree

        /** The category's quests, each with its children, in the book's order. */
        private function treeOf(cat:String):Object {
            var list:Array = [];
            var byId:Object = {};
            for each (var q:Object in IoQuests.book.quests) {
                if (q.cat == cat) {
                    list.push(q);
                    byId[q.id] = {"q": q, "kids": []};
                }
            }
            var roots:Array = [];
            for each (q in list) {
                var n:Object = byId[q.id];
                if (q.parent && byId[q.parent]) {
                    byId[q.parent].kids.push(n);
                }
                else {
                    roots.push(n);
                }
            }
            return {"roots": roots, "byId": byId};
        }

        /** True when a node and everything under it is collected. */
        private static function allDone(n:Object):Boolean {
            if (n.q.state != "claimed") {
                return false;
            }
            for each (var k:Object in n.kids) {
                if (!allDone(k)) {
                    return false;
                }
            }
            return true;
        }

        private function drawTree(recentre:Boolean):void {
            CasinoUI.removeAll(this._nodes);
            this._nodeSprites = {};
            var g:Graphics = this._edges.graphics;
            g.clear();
            var tree:Object = this.treeOf(_cat);
            var roots:Array = tree.roots;
            if (_hideDone) {
                roots = roots.filter(function(n:Object, i:int, a:Array):Boolean {
                        return !allDone(n);
                    });
            }
            // a tidy tree: leaves side by side, each parent over the middle of its children
            var slot:Object = {"x": 0};
            var maxDepth:int = 0;
            var place:Function = function(n:Object, depth:int):void {
                n.depth = depth;
                maxDepth = Math.max(maxDepth, depth);
                var kids:Array = _hideDone ? (n.kids as Array).filter(function(k:Object, i:int, a:Array):Boolean {
                        return !allDone(k);
                    }) : n.kids;
                n.shown = kids;
                if (!kids.length) {
                    n.x = slot.x;
                    slot.x += 1;
                    return;
                }
                for each (var k:Object in kids) {
                    place(k, depth + 1);
                }
                n.x = (kids[0].x + kids[kids.length - 1].x) / 2;
            };
            for each (var r:Object in roots) {
                place(r, 0);
                slot.x += 0.4; // (a little room between trees)
            }
            var pad:int = 50;
            this._contentW = Math.max(CANVAS_W, (slot.x - 0.4) * NODE_DX + pad * 2 - NODE_DX + 2 * NODE_R);
            this._contentH = Math.max(CANVAS_H, maxDepth * LEVEL_DY + pad * 2 + 30);
            var offX:Number = this._contentW > CANVAS_W ? pad : (CANVAS_W - ((slot.x - 1.4) * NODE_DX)) / 2;
            var offY:Number = 40;
            var all:Array = [];
            var walk:Function = function(n:Object):void {
                n.px = offX + n.x * NODE_DX;
                n.py = offY + n.depth * LEVEL_DY;
                all.push(n);
                for each (var k:Object in n.shown) {
                    walk(k);
                }
            };
            for each (r in roots) {
                walk(r);
            }
            // lines first, under the quests
            for each (var n:Object in all) {
                for each (var k:Object in n.shown) {
                    var lit:Boolean = n.q.state == "claimed";
                    g.lineStyle(lit ? 3 : 2, lit ? 0xE0A040 : 0x5A4A44, lit ? 0.95 : 0.8);
                    var midY:Number = n.py + LEVEL_DY / 2;
                    g.moveTo(n.px, n.py + NODE_R);
                    g.lineTo(n.px, midY);
                    g.lineTo(k.px, midY);
                    g.lineTo(k.px, k.py - NODE_R);
                }
            }
            for each (n in all) {
                var s:Sprite = this.node(n.q);
                s.x = n.px;
                s.y = n.py;
                this._nodes.addChild(s);
                this._nodeSprites[n.q.id] = s;
            }
            if (!all.length) {
                var none:TextField = this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_all_done"), 13, CasinoUI.ASH, true, CANVAS_W, TextFormatAlign.CENTER)) as TextField;
                none.y = CANVAS_H / 2 - 10;
            }
            // the quest to show: the one asked for, else the first ready, else the first open
            if (!this._selected || !this._nodeSprites[this._selected]) {
                this._selected = null;
                var pick:Object = null;
                for each (n in all) {
                    if (n.q.state == "ready") {
                        pick = n;
                        break;
                    }
                }
                if (!pick) {
                    for each (n in all) {
                        if (n.q.state == "progress") {
                            pick = n;
                            break;
                        }
                    }
                }
                if (!pick && all.length) {
                    pick = all[0];
                }
                if (pick) {
                    this._selected = pick.q.id;
                }
            }
            this.markSelected();
            if (recentre && this._selected && this._nodeSprites[this._selected]) {
                var at:Sprite = this._nodeSprites[this._selected];
                this.scrollTo(CANVAS_W / 2 - at.x, CANVAS_H / 2 - at.y - 20);
            }
            else {
                this.scrollTo(this._content.x, this._content.y);
            }
        }

        /** A quest on the tree: its picture in a ring the colour of where it is, and its name under it. */
        private function node(q:Object):Sprite {
            // (a MovieClip, which is dynamic: Flash Player refuses ioReady on a Sprite, Error #1056, report #60)
            var s:MovieClip = new MovieClip();
            s.name = "ioQuestNode:" + q.id;
            s.buttonMode = true;
            s.mouseChildren = false;
            var state:String = String(q.state);
            var g:Graphics = s.graphics;
            var fill:uint = state == "claimed" ? 0x3A2A16 : state == "ready" ? 0x6A3A10 : state == "locked" ? 0x1E1A1A : 0x2A1A16;
            var ring:uint = state == "claimed" ? 0xC89A4A : state == "ready" ? 0xFFD58A : state == "locked" ? 0x4A4440 : 0x8A4A2A;
            g.lineStyle(q.optional ? 2 : 3, ring, 1);
            g.beginFill(fill, 1);
            g.drawCircle(0, 0, NODE_R);
            g.endFill();
            if (state == "progress" && int(q.target) > 0) {
                arc(g, 0, 0, NODE_R + 4, Math.min(1, Number(q.value) / Number(q.target)), 0xFF8A2A);
            }
            var pic:Sprite = s.addChild(IoQuestArt.glyph(String(q.icon), 28, state == "locked")) as Sprite;
            pic.y = 0;
            if (state == "claimed") {
                var t:Shape = s.addChild(IoQuestArt.tick(14)) as Shape;
                t.x = 16;
                t.y = 15;
            }
            else if (state == "locked") {
                var l:Sprite = s.addChild(IoQuestArt.glyph("lock", 13)) as Sprite;
                l.x = 16;
                l.y = 15;
            }
            else if (state == "ready") {
                s.filters = [new GlowFilter(0xFFB040, 0.9, 14, 14, 2, 2)];
                s["ioReady"] = true;
            }
            var name:TextField = IoAllianceUi.text(IoQuests.title(q), 9, state == "locked" ? 0x7A6A60 : state == "claimed" ? 0xC8B898 : CasinoUI.GOLD, state == "ready", NODE_DX - 6, TextFormatAlign.CENTER, false, true);
            name.x = -(NODE_DX - 6) / 2;
            name.y = NODE_R + 4;
            if (name.height > 30) {
                name.height = 30;
            }
            s.addChild(name);
            var id:String = String(q.id);
            s.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    if (_dragMoved) {
                        return;
                    }
                    SOUNDS.Play("click1");
                    _selected = id;
                    markSelected();
                    drawPanel();
                });
            return s;
        }

        private function markSelected():void {
            for (var id:String in this._nodeSprites) {
                var s:Sprite = this._nodeSprites[id];
                var sel:Shape = s.getChildByName("ioSel") as Shape;
                if (id == this._selected) {
                    if (!sel) {
                        sel = new Shape();
                        sel.name = "ioSel";
                        sel.graphics.lineStyle(2, 0xFFFFFF, 0.9);
                        sel.graphics.drawCircle(0, 0, NODE_R + 8);
                        s.addChildAt(sel, 0);
                    }
                }
                else if (sel) {
                    s.removeChild(sel);
                }
            }
        }

        /** Part of a ring, from the top round to the right: how far along a quest is. */
        private static function arc(g:Graphics, cx:Number, cy:Number, r:Number, part:Number, colour:uint):void {
            if (part <= 0) {
                return;
            }
            g.lineStyle(3, colour, 1);
            var steps:int = Math.max(2, int(part * 40));
            for (var i:int = 0; i <= steps; i++) {
                var a:Number = -Math.PI / 2 + part * Math.PI * 2 * i / steps;
                if (i == 0) {
                    g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
                else {
                    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
            }
        }

        private static function bar(g:Graphics, x:Number, y:Number, w:Number, h:Number, part:Number):void {
            g.lineStyle(1, 0x9A3A14, 1);
            g.beginFill(0x120C0B, 1);
            g.drawRoundRect(x, y, w, h, h, h);
            g.endFill();
            if (part > 0) {
                var m:Matrix = new Matrix();
                m.createGradientBox(w, h, 0, x, y);
                g.lineStyle(0, 0, 0);
                g.beginGradientFill(GradientType.LINEAR, [0xC8401A, 0xFFB040], [1, 1], [0, 255], m);
                g.drawRoundRect(x + 1, y + 1, Math.max(h - 2, (w - 2) * Math.min(1, part)), h - 2, h - 2, h - 2);
                g.endFill();
            }
        }

        // ---- moving round the tree

        private function onDown(e:MouseEvent):void {
            if (_cat == "daily") {
                return;
            }
            this._dragging = true;
            this._dragMoved = false;
            this._dragFromX = this.mc.mouseX - this._content.x;
            this._dragFromY = this.mc.mouseY - this._content.y;
            this.mc.stage.addEventListener(MouseEvent.MOUSE_UP, this.onUp);
        }

        private function onUp(e:MouseEvent):void {
            this._dragging = false;
            if (this.mc.stage) {
                this.mc.stage.removeEventListener(MouseEvent.MOUSE_UP, this.onUp);
            }
        }

        private function onWheel(e:MouseEvent):void {
            if (_cat == "daily") {
                return;
            }
            this.scrollTo(this._content.x, this._content.y + e.delta * 12);
        }

        private function scrollTo(x:Number, y:Number):void {
            var minX:Number = Math.min(0, CANVAS_W - this._contentW);
            var minY:Number = Math.min(0, CANVAS_H - this._contentH);
            if (this._contentW <= CANVAS_W) {
                x = 0;
            }
            if (this._contentH <= CANVAS_H) {
                y = 0;
            }
            this._content.x = int(Math.max(minX, Math.min(0, x)));
            this._content.y = int(Math.max(minY, Math.min(0, y)));
        }

        // ---- the category's chest

        private function drawChest():void {
            CasinoUI.removeAll(this._chestStrip);
            var chest:Object = null;
            for each (var c:Object in IoQuests.book.chests) {
                if (c.cat == _cat) {
                    chest = c;
                }
            }
            var w:int = CANVAS_W;
            var strip:Sprite = this._chestStrip.addChild(CasinoUI.panel(w, 48, 0.9)) as Sprite;
            strip.mouseEnabled = false;
            if (!chest) {
                var none:TextField = this._chestStrip.addChild(IoAllianceUi.text(KEYS.Get("io_quest_no_chest"), 10, CasinoUI.ASH, false, w - 20, TextFormatAlign.LEFT, false, true)) as TextField;
                none.x = 12;
                none.y = 8;
                return;
            }
            var b:Sprite = this.chestButton(chest, 30);
            b.x = 26;
            b.y = 24;
            this._chestStrip.addChild(b);
            var head:TextField = this._chestStrip.addChild(CasinoUI.label(KEYS.Get("io_quest_chest_line", {"v1": chest.done, "v2": chest.total}), 11, CasinoUI.GOLD, true, w - 170, TextFormatAlign.LEFT)) as TextField;
            head.x = 50;
            head.y = 5;
            var rw:TextField = this._chestStrip.addChild(CasinoUI.label(IoQuests.rewardText(chest.reward), 10, CasinoUI.ASH, false, chest.state == "progress" ? w - 60 : (chest.state == "claimed" ? w - 124 : w - 170), TextFormatAlign.LEFT)) as TextField;
            rw.x = 50;
            rw.y = 24;
            GLOBAL.ioFitText(rw); // (an opened chest's reward line was cut off: "... 25 sh")
            if (chest.state == "ready") {
                var get:Sprite = this._chestStrip.addChild(CasinoUI.button(KEYS.Get("io_quest_open_chest"), 104, 28, this.claimFn(String(chest.id)), !IoQuests.claiming, 12)) as Sprite;
                get.name = "ioQuestChestOpen";
                get.x = w - 114;
                get.y = 10;
            }
            else if (chest.state == "claimed") {
                var got:TextField = this._chestStrip.addChild(CasinoUI.label(KEYS.Get("io_quest_opened"), 11, CasinoUI.WIN, true, 104, TextFormatAlign.CENTER)) as TextField;
                got.x = w - 114;
                got.y = 15;
            }
        }

        /** A chest: shut, glowing when it can be opened, open (with a tick) once it was. Click: open it. */
        private function chestButton(chest:Object, size:int):Sprite {
            var b:MovieClip = new MovieClip(); // (dynamic: carries ioReady, as node())
            b.mouseChildren = false;
            var pic:Sprite = b.addChild(IoQuestArt.glyph("chest", size, chest.state == "progress")) as Sprite;
            if (chest.state == "ready") {
                b.filters = [new GlowFilter(0xFFB040, 1, 14, 14, 3, 2)];
                b.buttonMode = true;
                b["ioReady"] = true;
                b.addEventListener(MouseEvent.CLICK, this.claimFn(String(chest.id)));
            }
            else if (chest.state == "claimed") {
                var t:Shape = b.addChild(IoQuestArt.tick(12)) as Shape;
                t.x = size / 2 - 2;
                t.y = size / 2 - 4;
            }
            return b;
        }

        // ---- today's daily quests

        private function drawDaily():void {
            CasinoUI.removeAll(this._nodes);
            CasinoUI.removeAll(this._chestStrip);
            this._edges.graphics.clear();
            this._nodeSprites = {};
            this._contentW = CANVAS_W;
            this._contentH = CANVAS_H;
            this._content.x = this._content.y = 0;
            var daily:Object = IoQuests.book.daily;
            var head:TextField = this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_daily_head", {"v1": hoursMinutes(int(daily.endsIn) - (GLOBAL.Timestamp() - IoQuests.fetchedAt))}), 12, CasinoUI.GOLD, true, CANVAS_W - 20, TextFormatAlign.LEFT)) as TextField;
            head.x = 12;
            head.y = 8;
            var y:int = 34;
            for each (var d:Object in daily.quests) {
                this._nodes.addChild(this.dailyCard(d, y));
                y += 72;
            }
            // all three: the bonus
            var bonus:Object = daily.bonus;
            var card:Sprite = new Sprite();
            card.y = y + 4;
            card.x = 10;
            var w:int = CANVAS_W - 20;
            card.graphics.lineStyle(1.5, bonus.state == "ready" ? 0xFFD58A : 0x7A5A48, 1);
            card.graphics.beginFill(0x2A1A10, 0.9);
            card.graphics.drawRoundRect(0, 0, w, 56, 10, 10);
            card.graphics.endFill();
            var cb:Sprite = card.addChild(this.chestButton({"state": bonus.state}, 28)) as Sprite;
            cb.x = 24;
            cb.y = 28;
            if (bonus.state == "ready") {
                cb.addEventListener(MouseEvent.CLICK, this.claimFn("daily:bonus"));
            }
            var t1:TextField = card.addChild(CasinoUI.label(KEYS.Get("io_quest_daily_bonus"), 12, CasinoUI.GOLD, true, w - 170, TextFormatAlign.LEFT)) as TextField;
            t1.x = 46;
            t1.y = 8;
            var t2:TextField = card.addChild(CasinoUI.label(IoQuests.rewardText(bonus.reward), 10, CasinoUI.ASH, false, bonus.state == "progress" ? w - 56 : w - 170, TextFormatAlign.LEFT)) as TextField;
            t2.x = 46;
            t2.y = 28;
            this.stateButton(card, bonus.state, "daily:bonus", w);
            this._nodes.addChild(card);
        }

        /** "5h 12m", "40m" */
        private static function hoursMinutes(sec:int):String {
            sec = Math.max(60, sec);
            var h:int = int(sec / 3600);
            var m:int = int((sec % 3600) / 60);
            return h > 0 ? h + "h " + m + "m" : m + "m";
        }

        /** Words that can be clicked, underlined, in the book's gold. */
        private static function textLink(label:String, onClick:Function):Sprite {
            var s:Sprite = new Sprite();
            var t:TextField = CasinoUI.label(label, 10, CasinoUI.ASH, false, 220, TextFormatAlign.LEFT);
            t.htmlText = "<u>" + label + "</u>";
            t.width = Math.min(220, t.textWidth + 6);
            s.addChild(t);
            s.buttonMode = true;
            s.mouseChildren = false;
            s.graphics.beginFill(0, 0);
            s.graphics.drawRect(0, 0, t.width, t.height);
            s.graphics.endFill();
            s.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    onClick();
                });
            return s;
        }

        private function dailyCard(d:Object, y:int):Sprite {
            var card:Sprite = new Sprite();
            card.name = "ioQuestDaily:" + d.id;
            card.x = 10;
            card.y = y;
            var w:int = CANVAS_W - 20;
            card.graphics.lineStyle(1.5, d.state == "ready" ? 0xFFD58A : 0x7A5A48, 1);
            card.graphics.beginFill(0x1E1412, 0.95);
            card.graphics.drawRoundRect(0, 0, w, 64, 10, 10);
            card.graphics.endFill();
            if (d.state == "ready") {
                card.filters = [new GlowFilter(0xFFB040, 0.7, 10, 10, 2, 2)];
            }
            var g:Sprite = card.addChild(IoQuestArt.glyph(String(d.icon), 30, d.state == "claimed")) as Sprite;
            g.x = 26;
            g.y = 32;
            var t:TextField = card.addChild(CasinoUI.label(IoQuests.title(d), 12, CasinoUI.GOLD, true, w - 170, TextFormatAlign.LEFT)) as TextField;
            t.x = 50;
            t.y = 4;
            // (up to the button, and smaller when that is still too short: longer languages were cut off)
            var desc:TextField = card.addChild(CasinoUI.label(IoQuests.describe(d), 10, 0xE0D0C0, false, w - 162, TextFormatAlign.LEFT)) as TextField;
            desc.x = 50;
            desc.y = 21;
            GLOBAL.ioFitText(desc);
            bar(card.graphics, 50, 40, 120, 8, int(d.target) > 0 ? Number(d.value) / Number(d.target) : 0);
            var p:TextField = card.addChild(CasinoUI.label(GLOBAL.FormatNumber(Number(d.value)) + " / " + GLOBAL.FormatNumber(Number(d.target)), 9, CasinoUI.ASH, false, 80, TextFormatAlign.LEFT)) as TextField;
            p.x = 176;
            p.y = 36;
            var rw:TextField = card.addChild(CasinoUI.label(IoQuests.rewardText(d.reward), 9, CasinoUI.ASH, false, w - 120, TextFormatAlign.LEFT)) as TextField;
            rw.x = 50;
            rw.y = 48;
            this.stateButton(card, String(d.state), "daily:" + d.id, w, String(d.go || ""));
            return card;
        }

        /** Collect (ready), Go there (still to do and there is somewhere to go), or Collected. */
        private function stateButton(card:Sprite, state:String, claimId:String, w:int, go:String = ""):void {
            if (state == "ready") {
                var b:Sprite = card.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 96, 28, this.claimFn(claimId), !IoQuests.claiming, 12)) as Sprite;
                b.name = "ioQuestCollect:" + claimId;
                b.x = w - 106;
                b.y = 14;
            }
            else if (state == "claimed") {
                var done:TextField = card.addChild(CasinoUI.label(KEYS.Get("io_quest_collected"), 11, CasinoUI.WIN, true, 96, TextFormatAlign.CENTER)) as TextField;
                done.x = w - 106;
                done.y = 20;
            }
            else if (go) {
                var gb:Sprite = card.addChild(CasinoUI.button(KEYS.Get("io_quest_go"), 96, 26, this.goFn(go, null), true, 11)) as Sprite;
                gb.x = w - 106;
                gb.y = 16;
            }
        }

        // ---- the quest picked

        private function drawPanel():void {
            CasinoUI.removeAll(this._panel);
            this._panel.graphics.clear();
            var book:Object = IoQuests.book;
            if (!book) {
                return;
            }
            var w:int = PANEL_W;
            var y:int = 12;
            if (_cat == "daily") {
                IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_daily_info"), 12, y, 11, 0xE0D0C0, false, w - 24, TextFormatAlign.LEFT, false, true);
                return;
            }
            var q:Object = this._selected ? IoQuests.quest(this._selected) : null;
            if (!q) {
                IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_pick"), 12, y, 11, CasinoUI.ASH, false, w - 24, TextFormatAlign.LEFT, false, true);
                return;
            }
            var state:String = String(q.state);
            var ring:Sprite = this._panel.addChild(new Sprite()) as Sprite;
            ring.graphics.lineStyle(3, state == "ready" ? 0xFFD58A : state == "claimed" ? 0xC89A4A : state == "locked" ? 0x4A4440 : 0x8A4A2A, 1);
            ring.graphics.beginFill(0x1E1210, 1);
            ring.graphics.drawCircle(0, 0, 34);
            ring.graphics.endFill();
            ring.x = w / 2;
            ring.y = y + 36;
            ring.addChild(IoQuestArt.glyph(String(q.icon), 44, state == "locked"));
            if (state == "ready") {
                ring.filters = [new GlowFilter(0xFFB040, 0.9, 14, 14, 2, 2)];
            }
            y += 80;
            var title:TextField = IoAllianceUi.addText(this._panel, IoQuests.title(q), 10, y, 14, CasinoUI.GOLD, true, w - 20, TextFormatAlign.CENTER, false, true);
            title.name = "ioQuestPanelTitle";
            y += title.height + 2;
            var stateLine:String = KEYS.Get("io_quest_state_" + state);
            var st:TextField = IoAllianceUi.addText(this._panel, stateLine, 10, y, 10, state == "ready" ? 0xFFB040 : state == "claimed" ? CasinoUI.WIN : CasinoUI.ASH, true, w - 20, TextFormatAlign.CENTER);
            y += st.height + 6;
            var desc:TextField = IoAllianceUi.addText(this._panel, IoQuests.describe(q), 12, y, 11, 0xE8DCC8, false, w - 24, TextFormatAlign.LEFT, false, true);
            y += desc.height + 6;
            if (state == "locked") {
                var parent:Object = q.parent ? IoQuests.quest(String(q.parent)) : null;
                var lk:TextField = IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_needs", {"v1": parent ? IoQuests.title(parent) : "?"}), 12, y, 10, 0xC8A080, false, w - 24, TextFormatAlign.LEFT, false, true);
                y += lk.height + 6;
            }
            else if (state != "claimed") {
                bar(this._panel.graphics, 12, y + 2, w - 24, 10, int(q.target) > 0 ? Number(q.value) / Number(q.target) : 0);
                y += 14;
                var pr:TextField = IoAllianceUi.addText(this._panel, GLOBAL.FormatNumber(Number(q.value)) + " / " + GLOBAL.FormatNumber(Number(q.target)), 12, y, 10, CasinoUI.ASH, false, w - 24, TextFormatAlign.RIGHT);
                y += pr.height + 2;
            }
            var rh:TextField = IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_reward"), 12, y, 10, CasinoUI.EMBER, true, w - 24);
            y += rh.height;
            var rt:TextField = IoAllianceUi.addText(this._panel, IoQuests.rewardText(q.reward), 12, y, 11, CasinoUI.GOLD, true, w - 24, TextFormatAlign.LEFT, false, true);
            y += rt.height + 6;
            if (q.optional) {
                var op:TextField = IoAllianceUi.addText(this._panel, KEYS.Get(q.leader ? "io_quest_leader" : q.staff ? "io_quest_staff" : "io_quest_optional"), 12, y, 9, 0x9AB8D8, false, w - 24, TextFormatAlign.LEFT, false, true);
                y += op.height + 4;
            }
            // the buttons, at the foot
            var by:int = CANVAS_H + 64 - 42;
            if (state == "ready") {
                var c:Sprite = this._panel.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), w - 24, 32, this.claimFn(String(q.id)), !IoQuests.claiming, 14)) as Sprite;
                c.name = "ioQuestCollect";
                c.x = 12;
                c.y = by;
                by -= 38;
            }
            if (q.go && state != "claimed") {
                var g:Sprite = this._panel.addChild(CasinoUI.button(KEYS.Get("io_quest_go"), w - 24, 28, this.goFn(String(q.go), q), true, 12)) as Sprite;
                g.name = "ioQuestGo";
                g.x = 12;
                g.y = by + 4;
            }
        }

        // ---- collecting, going

        private function claimFn(id:String):Function {
            return function(e:MouseEvent = null):void {
                claim(id);
            };
        }

        private function claim(ids:String):void {
            if (IoQuests.claiming) {
                return;
            }
            SOUNDS.Play("click1");
            this.say(KEYS.Get("io_quest_collecting"), 0);
            IoQuests.claim(ids, function(reward:Object, error:String):void {
                    if (!mc || !mc.stage) {
                        return;
                    }
                    if (!reward) {
                        say(error, 6);
                        return;
                    }
                    SOUNDS.Play("chaching");
                    say(KEYS.Get("io_quest_got", {"v1": IoQuests.rewardText(reward)}) + (BASE.isMainYardOrInfernoMainYard ? "" : " " + KEYS.Get("io_quest_to_main")), 8);
                    redraw(false);
                });
        }

        private function collectAll(e:MouseEvent = null):void {
            this.claim("all");
        }

        private function goFn(target:String, q:Object):Function {
            return function(e:MouseEvent = null):void {
                close();
                IoQuests.go(target, q);
            };
        }

        private function say(text:String, seconds:int):void {
            this._status.text = text;
            this._statusUntil = seconds > 0 ? getTimer() + seconds * 1000 : 0;
        }

        private function toggleHide(e:MouseEvent = null):void {
            _hideDone = !_hideDone;
            CasinoUI.choose(this._hideToggle, _hideDone);
            this.redraw(true);
        }

        private function openOld(e:MouseEvent = null):void {
            this.close();
            QUESTS.ioShowOld();
        }

        // ---- every frame: the book changed, a drag, the ready ones glowing

        private function tick(e:Event):void {
            if (this._version != IoQuests.version) {
                this.redraw(false);
            }
            if (this._dragging) {
                var nx:Number = this.mc.mouseX - this._dragFromX;
                var ny:Number = this.mc.mouseY - this._dragFromY;
                if (Math.abs(nx - this._content.x) + Math.abs(ny - this._content.y) > 3) {
                    this._dragMoved = true;
                }
                this.scrollTo(nx, ny);
            }
            else if (this._dragMoved && !this._dragging) {
                // (the click that ends a drag picks nothing; the next one does)
                if (!this.mc.stage || !this._canvas.hitTestPoint(this.mc.stage.mouseX, this.mc.stage.mouseY)) {
                    this._dragMoved = false;
                }
            }
            var pulse:Number = 2 + Math.sin(getTimer() / 260) * 1.2;
            for each (var s:Sprite in this._nodeSprites) {
                if (s["ioReady"]) {
                    s.filters = [new GlowFilter(0xFFB040, 0.9, 10 + pulse * 3, 10 + pulse * 3, pulse, 2)];
                }
            }
            if (this._statusUntil > 0 && getTimer() > this._statusUntil) {
                this._status.text = "";
                this._statusUntil = 0;
            }
            if (this._collectAll) {
                CasinoUI.enable(this._collectAll, IoQuests.ready > 0 && !IoQuests.claiming);
            }
        }

        public function close(e:MouseEvent = null):void {
            if (this.mc) {
                this.mc.removeEventListener(Event.ENTER_FRAME, this.tick);
                if (this.mc.stage) {
                    this.mc.stage.removeEventListener(MouseEvent.MOUSE_UP, this.onUp);
                }
                if (this.mc.parent) {
                    this.mc.parent.removeChild(this.mc);
                    GLOBAL.BlockerRemove();
                    SOUNDS.Play("close");
                }
            }
            this.mc = null;
            if (_open == this) {
                _open = null;
            }
        }
    }
}
