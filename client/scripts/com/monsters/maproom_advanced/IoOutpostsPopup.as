package com.monsters.maproom_advanced {
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Point;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;
    import com.monsters.quests.IoQuests;

    /**
     * Inferno-only: the Outposts list, opened by the top bar's "Next outpost" button.
     *
     * One row per outpost: its map position, empire value, what it adds to the main yard per hour for each
     * resource, damage protection left and monsters housed, with View (open that yard) and Map (the world
     * map, centred on it). Click any column title to sort by it; again to reverse. Previous, Home and Next
     * (3 October: Previous and Home) step through the outposts in the order they were taken, round from the
     * last to the first (BASE.ioLoadPrevious / ioGoHome / ioLoadNextOutpost). Data: server worldmapv2/myoutposts (controllers/maproom/v2/myOutposts.ts).
     *
     * Only the rows in view exist (about a dozen, reused as the list scrolls), so a player with 1,500
     * outposts gets the list as quickly as one with three. Scroll with the wheel or the bar on the right.
     */
    public class IoOutpostsPopup {

        private static const BG_W:int = 740;

        private static const PAD_H:int = 26;

        private static const PAD_TOP:int = 29;

        private static const TITLE_SIZE:int = 22;

        private static const ROW_H:int = 30;

        private static const LIST_MAX_H:int = 10 * ROW_H + 2; // ten whole rows (the list's height is rows * ROW_H + 2)

        private static const CONTENT_W:int = BG_W - PAD_H * 2;

        /** key, title, width, alignment. */
        private static const COLUMNS:Array = [
                ["x", "X", 46, "center"],
                ["y", "Y", 46, "center"],
                ["value", "Value", 62, "right"],
                ["r1", "Bone/h", 62, "right"],
                ["r2", "Coal/h", 62, "right"],
                ["r3", "Sulfur/h", 66, "right"],
                ["r4", "Magma/h", 64, "right"],
                ["protection", "Protected", 76, "right"],
                ["monsters", "Monsters", 66, "right"]
            ];

        private static const ACTIONS_W:int = 106;

        private static const BAR_W:int = 14;

        /** Rows moved by one wheel step. */
        private static const WHEEL_ROWS:int = 3;

        private static var _open:IoOutpostsPopup = null;

        private static var _sortKey:String = "x";

        private static var _sortDown:Boolean = false;

        private var _mc:MovieClip;

        private var _outposts:Array;

        private var _rows:MovieClip;

        private var _headers:Array = [];

        private var _listH:int;

        private var _holder:MovieClip;

        private var _mask:MovieClip;

        /** The rows on screen: {line, cells, view, viewText, index, outpost}. */
        private var _pool:Array = [];

        /** How far the list is scrolled, in pixels. */
        private var _offset:Number = 0;

        private var _none:TextField;

        private var _track:Sprite;

        private var _thumb:Sprite;

        private var _dragFrom:Number = 0;

        /** Opens the list (loads it from the server first). */
        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open._mc || !_open._mc.stage)) {
                _open = null; // left from a yard that has gone
            }
            if (_open) {
                return;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while your yard is being attacked.");
                return;
            }
            SOUNDS.Play("click1");
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            new URLLoaderApi().load(GLOBAL._mapURL + "myoutposts", [], function(response:Object):void {
                    PLEASEWAIT.Hide();
                    if (!response || response.error) {
                        GLOBAL.Message(response && response.error ? String(response.error) : "The outposts could not be loaded. Please try again.");
                        return;
                    }
                    if (BASE.ioAttackRunning() || _open) {
                        return; // an attack started while the list was loading
                    }
                    _open = new IoOutpostsPopup(response.outposts as Array || []);
                }, function(e:IOErrorEvent):void {
                    PLEASEWAIT.Hide();
                    GLOBAL.Message("The outposts could not be loaded. Please try again.");
                });
        }

        public function IoOutpostsPopup(outposts:Array) {
            super();
            this._outposts = outposts;
            this._mc = new MovieClip();
            this._listH = Math.min(LIST_MAX_H, Math.max(1, outposts.length) * ROW_H + 2);
            var titleH:int = TITLE_SIZE + 8;
            var totalH:int = PAD_TOP + titleH + 34 + 24 + this._listH + 26 + 72;
            var frameX:int = -int(BG_W * 0.5);
            var frameY:int = -int(totalH * 0.5);
            var contentX:int = frameX + PAD_H;

            var frame:frame_CLIP = this._mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = BG_W;
            frame.height = totalH;
            frame.x = frameX;
            frame.y = frameY;
            frame.Setup(true, this.close);

            var title:TextField = this._mc.addChild(new TextField()) as TextField;
            title.selectable = false;
            title.mouseEnabled = false;
            title.embedFonts = true;
            title.antiAliasType = AntiAliasType.NORMAL;
            title.width = CONTENT_W;
            title.height = titleH;
            var titleFormat:TextFormat = new TextFormat("Groboldov", TITLE_SIZE, 0xFFFFFF);
            titleFormat.align = TextFormatAlign.CENTER;
            title.defaultTextFormat = titleFormat;
            title.text = "Outposts (" + outposts.length + ")";
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = contentX;
            title.y = frameY + PAD_TOP;

            // [◀ Previous] [Home] [Next outpost ▶] on the right (3 October: Previous and Home); the hint beside them
            var buttonsW:int = 100 + 6 + 70 + 6 + 110;
            var hint:TextField = this._mc.addChild(label("Click a column title to sort. Resources per hour are what each outpost adds to your main yard.", 11, 0x3A2A1A, false, CONTENT_W - buttonsW - 10, TextFormatAlign.LEFT)) as TextField;
            hint.wordWrap = true;
            hint.multiline = true;
            hint.height = 30;
            hint.x = contentX;
            hint.y = title.y + titleH + 1;
            var hasOutposts:Boolean = Boolean(GLOBAL._mapOutpostIDs) && GLOBAL._mapOutpostIDs.length > 0;
            var next:Sprite = this._mc.addChild(button("Next outpost ▶", 110, 26, this.onNext)) as Sprite;
            next.x = contentX + CONTENT_W - 110;
            next.y = title.y + titleH + 2;
            next.name = "ioNext";
            var home:Sprite = this._mc.addChild(button("Home", 70, 26, this.onHome)) as Sprite;
            home.x = next.x - 6 - 70;
            home.y = next.y;
            home.name = "ioHome";
            var previous:Sprite = this._mc.addChild(button("◀ Previous", 100, 26, this.onPrevious)) as Sprite;
            previous.x = home.x - 6 - 100;
            previous.y = next.y;
            previous.name = "ioPrevious";
            // (greyed: Home in the main yard, Previous and Next with no outposts)
            disable(home, BASE.isMainYardOrInfernoMainYard);
            disable(previous, !hasOutposts);
            disable(next, !hasOutposts);

            // column titles
            var headerY:int = title.y + titleH + 34;
            var x:int = contentX + 1;
            for each (var column:Array in COLUMNS) {
                var head:Sprite = this._mc.addChild(new Sprite()) as Sprite;
                head.buttonMode = true;
                head.mouseChildren = false;
                head.graphics.beginFill(0x000000, 0);
                head.graphics.drawRect(0, 0, column[2], 22);
                head.graphics.endFill();
                var headText:TextField = head.addChild(label(column[1], 11, 0x3A2A1A, true, column[2], column[3] == "center" ? TextFormatAlign.CENTER : TextFormatAlign.RIGHT)) as TextField;
                headText.y = 3;
                head.x = x;
                head.y = headerY;
                head.name = column[0];
                head.addEventListener(MouseEvent.CLICK, this.onSort);
                this._headers.push([column, headText]);
                x += column[2];
            }

            var listTop:int = headerY + 24;
            var box:Sprite = this._mc.addChild(new Sprite()) as Sprite;
            box.graphics.lineStyle(1, 0x8A6A45, 1);
            box.graphics.beginFill(0xFFFFFF, 0.85);
            box.graphics.drawRect(0, 0, CONTENT_W, this._listH);
            box.graphics.endFill();
            box.x = contentX;
            box.y = listTop;

            this._holder = this._mc.addChild(new MovieClip()) as MovieClip;
            this._holder.x = contentX + 1;
            this._holder.y = listTop + 1;
            this._rows = this._holder.addChild(new MovieClip()) as MovieClip;
            this._mask = this._holder.addChild(new MovieClip()) as MovieClip;
            this._mask.graphics.beginFill(0xFF0000, 1);
            this._mask.graphics.drawRect(0, 0, CONTENT_W - 2, this._listH - 2);
            this._mask.graphics.endFill();
            this._rows.mask = this._mask;
            this.buildRows();
            this._holder.addEventListener(MouseEvent.MOUSE_WHEEL, this.onWheel);

            // totals under the list
            var totals:TextField = this._mc.addChild(label(this.totalsText(), 11, 0x3A2A1A, true, CONTENT_W, TextFormatAlign.LEFT)) as TextField;
            totals.x = contentX;
            totals.y = listTop + this._listH + 5;

            var ok:Button_CLIP = this._mc.addChild(new Button_CLIP()) as Button_CLIP;
            ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
            ok.x = -int(ok.width * 0.5);
            ok.y = frameY + totalH - 60;
            ok.addEventListener(MouseEvent.CLICK, this.close);

            this.fill();
            this.showHere();
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this._mc);
            POPUPSETTINGS.AlignToCenter(this._mc);
            POPUPSETTINGS.ScaleUp(this._mc);
        }

        // ---- the rows

        /** Sorts the list, back to the top, and shows it. */
        private function fill():void {
            this._outposts.sort(this.compare);
            for each (var entry:Object in this._pool) {
                entry.index = -1;
            }
            this._offset = 0;
            this._none.visible = this._outposts.length == 0;
            for each (var head:Array in this._headers) {
                var arrow:String = head[0][0] == _sortKey ? (_sortDown ? " ▼" : " ▲") : "";
                TextField(head[1]).text = head[0][1] + arrow;
            }
            this.render();
        }

        /** The reusable rows and the scroll bar. */
        private function buildRows():void {
            var viewH:int = this._listH - 2;
            var count:int = Math.min(this._outposts.length, int(Math.ceil(viewH / ROW_H)) + 1);
            for (var i:int = 0; i < count; i++) {
                this._pool.push(this.row());
            }
            this._none = this._rows.addChild(label("You have no outposts yet. Take over a destroyed yard on the map.", 12, 0x555555, false, CONTENT_W - 20, TextFormatAlign.CENTER)) as TextField;
            this._none.y = 6;
            if (this._outposts.length * ROW_H <= viewH) {
                return;
            }
            this._track = this._holder.addChild(new Sprite()) as Sprite;
            this._track.graphics.beginFill(0xE3D5BD, 1);
            this._track.graphics.drawRect(0, 0, BAR_W, viewH);
            this._track.graphics.endFill();
            this._track.x = CONTENT_W - 2 - BAR_W - 2;
            this._track.buttonMode = true;
            this._track.addEventListener(MouseEvent.MOUSE_DOWN, this.onTrack);
            this._thumb = this._holder.addChild(new Sprite()) as Sprite;
            var thumbH:int = Math.max(28, int(viewH * viewH / (this._outposts.length * ROW_H)));
            this._thumb.graphics.lineStyle(1, 0x5A3A1A, 1);
            this._thumb.graphics.beginFill(0x8A6A45, 1);
            this._thumb.graphics.drawRoundRect(0, 0, BAR_W - 1, thumbH, 8, 8);
            this._thumb.graphics.endFill();
            this._thumb.x = this._track.x;
            this._thumb.buttonMode = true;
            this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, this.onThumbDown);
        }

        private function row():Object {
            var entry:Object = {"index": -1, "outpost": null, "cells": []};
            var line:Sprite = this._rows.addChild(new Sprite()) as Sprite;
            entry.line = line;
            var x:int = 0;
            for each (var column:Array in COLUMNS) {
                var cell:TextField = line.addChild(label("", 12, 0, column[0] == "value", column[2], column[3] == "center" ? TextFormatAlign.CENTER : TextFormatAlign.RIGHT)) as TextField;
                cell.x = x;
                cell.y = 6;
                entry.cells.push(cell);
                x += column[2];
            }
            entry.view = line.addChild(button("View", 46, 22, function(e:MouseEvent):void {
                    if (entry.outpost) {
                        viewOutpost(entry.outpost);
                    }
                })) as Sprite;
            entry.view.x = x + 8;
            entry.view.y = 4;
            entry.viewText = Sprite(entry.view).getChildAt(0) as TextField;
            var map:Sprite = line.addChild(button("Map", 46, 22, function(e:MouseEvent):void {
                    if (entry.outpost) {
                        showOnMap(entry.outpost);
                    }
                })) as Sprite;
            map.x = x + 58;
            map.y = 4;
            return entry;
        }

        /** Puts the outposts at the current scroll position into the rows on screen. */
        private function render():void {
            var viewH:int = this._listH - 2;
            var maxOffset:Number = Math.max(0, this._outposts.length * ROW_H - viewH);
            this._offset = Math.max(0, Math.min(maxOffset, this._offset));
            var first:int = int(this._offset / ROW_H);
            var shift:Number = this._offset - first * ROW_H;
            for (var p:int = 0; p < this._pool.length; p++) {
                var entry:Object = this._pool[p];
                var index:int = first + p;
                var line:Sprite = entry.line;
                if (index >= this._outposts.length) {
                    line.visible = false;
                    entry.index = -1;
                    entry.outpost = null;
                    continue;
                }
                line.visible = true;
                line.y = p * ROW_H - shift;
                if (entry.index == index) {
                    continue;
                }
                var outpost:Object = this._outposts[index];
                entry.index = index;
                entry.outpost = outpost;
                var here:Boolean = String(outpost.baseid) == String(BASE._loadedBaseID);
                line.graphics.clear();
                line.graphics.beginFill(here ? 0xFFE7A8 : (index % 2 == 0 ? 0xF4EDE0 : 0xFFFFFF), 1);
                line.graphics.drawRect(0, 0, CONTENT_W - 20, ROW_H);
                line.graphics.endFill();
                for (var c:int = 0; c < COLUMNS.length; c++) {
                    var cell:TextField = entry.cells[c];
                    cell.text = this.cellText(outpost, COLUMNS[c][0]);
                    cell.textColor = this.cellColour(outpost, COLUMNS[c][0]);
                }
                TextField(entry.viewText).text = here ? "Here" : "View";
                entry.view.alpha = here ? 0.5 : 1;
                entry.view.mouseEnabled = !here;
            }
            if (this._thumb) {
                var room:Number = this._track.height - this._thumb.height;
                this._thumb.y = maxOffset > 0 ? Math.round(room * this._offset / maxOffset) : 0;
            }
        }

        /** Opened in an outpost: scrolled so that outpost's row is in view (second from the top). */
        private function showHere():void {
            for (var i:int = 0; i < this._outposts.length; i++) {
                if (String(this._outposts[i].baseid) == String(BASE._loadedBaseID)) {
                    this._offset = Math.max(0, i - 1) * ROW_H;
                    this.render();
                    return;
                }
            }
        }

        // ---- scrolling

        private function onWheel(e:MouseEvent):void {
            e.stopPropagation();
            this._offset += (e.delta > 0 ? -1 : 1) * WHEEL_ROWS * ROW_H;
            this.render();
        }

        /** A click on the bar above or below the handle: a page up or down. */
        private function onTrack(e:MouseEvent):void {
            var page:Number = this._listH - 2 - ROW_H;
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
            if (!this._mc) {
                return;
            }
            var room:Number = this._track.height - this._thumb.height;
            var y:Number = Math.max(0, Math.min(room, this._holder.mouseY - this._dragFrom));
            this._offset = room > 0 ? y / room * Math.max(0, this._outposts.length * ROW_H - (this._listH - 2)) : 0;
            this.render();
        }

        private function onThumbUp(e:Event = null):void {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.onThumbMove);
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, this.onThumbUp);
        }

        private function cellText(outpost:Object, key:String):String {
            switch (key) {
                case "x":
                    // (an outpost in the Depths of Hell: its own numbers, D0-D9; the world above 0-399)
                    return IoUnderworld.isUnder(int(outpost.x), int(outpost.y)) ? "D" + (int(outpost.x) - IoUnderworld.origin) : String(int(outpost.x));
                case "y":
                    return IoUnderworld.isUnder(int(outpost.x), int(outpost.y)) ? "D" + (int(outpost.y) - IoUnderworld.origin) : String(int(outpost.y));
                case "value":
                    return short(Number(outpost.value));
                case "r1":
                case "r2":
                case "r3":
                case "r4":
                    return outpost.production ? short(Number(outpost.production[int(key.charAt(1)) - 1])) : "?";
                case "protection":
                    return int(outpost.protection) > 0 ? duration(int(outpost.protection)) : "No";
                case "monsters":
                    return String(int(outpost.monsters));
            }
            return "";
        }

        private function cellColour(outpost:Object, key:String):uint {
            if (key == "protection") {
                return int(outpost.protection) > 0 ? 0x2E7D32 : 0xB71C1C;
            }
            if (key.charAt(0) == "r" && !outpost.production) {
                return 0x888888;
            }
            return 0x000000;
        }

        private function sortValue(outpost:Object, key:String):Number {
            if (key.charAt(0) == "r" && key.length == 2) {
                return outpost.production ? Number(outpost.production[int(key.charAt(1)) - 1]) : -1;
            }
            return Number(outpost[key]);
        }

        private function compare(a:Object, b:Object):int {
            var av:Number = this.sortValue(a, _sortKey);
            var bv:Number = this.sortValue(b, _sortKey);
            if (av == bv) {
                // ties: by position on the map
                av = Number(a.x) * 1000 + Number(a.y);
                bv = Number(b.x) * 1000 + Number(b.y);
                return av < bv ? -1 : (av > bv ? 1 : 0);
            }
            return (av < bv ? -1 : 1) * (_sortDown ? -1 : 1);
        }

        private function totalsText():String {
            var sums:Array = [0, 0, 0, 0];
            var value:Number = 0;
            var monsters:int = 0;
            for each (var outpost:Object in this._outposts) {
                value += Number(outpost.value);
                monsters += int(outpost.monsters);
                if (outpost.production) {
                    for (var r:int = 0; r < 4; r++) {
                        sums[r] += Number(outpost.production[r]);
                    }
                }
            }
            // (the quest book: what the outposts add to the main yard each hour, all four together)
            IoQuests.best("outpost_rate", sums[0] + sums[1] + sums[2] + sums[3]);
            return "All outposts:  value " + short(value) + "   ·   per hour  bone " + short(sums[0]) + ", coal " + short(sums[1]) + ", sulfur " + short(sums[2]) + ", magma " + short(sums[3]) + "   ·   monsters " + monsters;
        }

        // ---- actions

        private function onSort(e:MouseEvent):void {
            var key:String = Sprite(e.currentTarget).name;
            SOUNDS.Play("click1");
            if (key == _sortKey) {
                _sortDown = !_sortDown;
            }
            else {
                _sortKey = key;
                // numbers people want the most of first; the map position from low to high
                _sortDown = key != "x" && key != "y";
            }
            this.fill();
        }

        private function onNext(e:MouseEvent):void {
            this.close();
            BASE.ioLoadNextOutpost();
        }

        private function onPrevious(e:MouseEvent):void {
            this.close();
            BASE.ioLoadPrevious();
        }

        private function onHome(e:MouseEvent):void {
            this.close();
            BASE.ioGoHome();
        }

        /** A button that can't be used here: faded, and clicks pass it by. */
        private static function disable(b:Sprite, off:Boolean):void {
            b.alpha = off ? 0.4 : 1;
            b.mouseEnabled = !off;
            b.buttonMode = !off;
        }

        private function viewOutpost(outpost:Object):void {
            this.close();
            BASE.ioLoadOutpost(int(outpost.x), int(outpost.y));
        }

        private function showOnMap(outpost:Object):void {
            this.close();
            MapRoom.ioFocus = new Point(int(outpost.x), int(outpost.y));
            GLOBAL.ShowMap();
            if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
                MapRoom.ioFocus = null; // the map didn't open: don't jump there the next time it does
            }
        }

        /** Closes the list (the yard is going: an attack starts, or BASE.Cleanup). */
        public static function ioCloseOpen():void {
            if (_open) {
                _open.close();
            }
            _open = null;
        }

        public function close(e:MouseEvent = null):void {
            if (!this._mc) {
                return;
            }
            SOUNDS.Play("close");
            this.onThumbUp();
            GLOBAL.BlockerRemove();
            if (this._mc.parent) {
                this._mc.parent.removeChild(this._mc);
            }
            this._mc = null;
            if (_open == this) {
                _open = null;
            }
        }

        // ---- helpers

        /** 2d 5h, 4h 54m, 34m, under a minute: 1m. */
        public static function duration(seconds:int):String {
            // Whole minutes, rounded up (under a minute shows 1m), then split: 5h exactly is "5h 0m", not "5h 1m".
            var total:int = Math.max(1, Math.ceil(Math.max(0, seconds) / 60));
            var days:int = total / 1440;
            var hours:int = (total % 1440) / 60;
            var minutes:int = total % 60;
            if (days > 0) {
                return days + "d " + hours + "h";
            }
            if (hours > 0) {
                return hours + "h " + minutes + "m";
            }
            return minutes + "m";
        }

        /** 2.1b, 1.3m, 10m, 1.4k, 10k, 950. */
        public static function short(n:Number):String {
            var abs:Number = Math.abs(n);
            if (abs >= 1000000000) {
                return trim(n / 1000000000) + "b";
            }
            if (abs >= 1000000) {
                return trim(n / 1000000) + "m";
            }
            if (abs >= 1000) {
                return trim(n / 1000) + "k";
            }
            return String(Math.round(n));
        }

        /** One decimal below 10 (dropped when it is .0), none from 10 up; rounded down so 9.96 is not "10.0". */
        private static function trim(n:Number):String {
            if (Math.abs(n) >= 10) {
                return String(Math.floor(n));
            }
            var tenths:Number = Math.floor(n * 10) / 10;
            return tenths == Math.floor(tenths) ? String(tenths) : tenths.toFixed(1);
        }

        private static function label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 8;
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
            var draw:Function = function(fill:uint):void {
                b.graphics.clear();
                b.graphics.lineStyle(1, 0x5A3A1A, 1);
                b.graphics.beginFill(fill, 1);
                b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
                b.graphics.endFill();
            };
            draw(0xF2D98C);
            var t:TextField = b.addChild(label(text, 11, 0x2A1A0A, true, width, TextFormatAlign.CENTER)) as TextField;
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
