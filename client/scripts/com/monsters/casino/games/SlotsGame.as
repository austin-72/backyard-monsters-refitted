package com.monsters.casino.games {
    import com.monsters.casino.BetSelector;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.GradientType;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Magma Slots: three reels in the chest of a Moloch idol. The server draws a stop on each reel
     * (server/src/services/casino/games/slots.ts) from the reels' fixed strips (casino/state); the reels
     * spin and stop left to right on them. Three King Wormzer win the jackpot pool, shown on the idol's
     * brow, which takes a part of every spin everywhere.
     *
     * The same class is Korath's Fortune (mode "fortune", Pit level 6): the same reels, read on five lines
     * (the rows and the diagonals, casino/state rules.fortune.lines), each a fifth of the bet, and the same
     * jackpot pool. Korath looms over its cabinet, and the reels show the champions (casino/fortune/<symbol>
     * .png: each stands for a Slots symbol, so the server's draw and pays are the Slots'; FORTUNE_NAMES). On both: when the first two reels already show a pair on a line, the last reel spins
     * longer (the draw is the server's and already made: this only holds it back); SPIN while the reels
     * turn stops them at once on the result; AUTO plays 10 to 100 spins in a row; Moloch's Favor is the
     * free Slots spin of the day.
     */
    public class SlotsGame extends Sprite {

        public static const SYMBOLS:Array = ["wormzer", "balthazar", "grokus", "valgos", "zagnoid", "malphus", "spurtz"];

        /** The cabinet (cabinet.png, 480 x 400) from the content area's left, and its reels in it. */
        private static const CX:int = 220;

        private static const REEL_X:int = 94;

        private static const REEL_Y:int = 120;

        private static const REEL_W:int = 92;

        private static const ROW:int = 64;

        private static const SYM:int = 58;

        private var _win:CasinoWindow;

        private var _bet:BetSelector;

        private var _spin:Sprite;

        private var _cabinet:Sprite;

        private var _reels:Array = [];

        private var _bmd:Object = {};

        private var _jackpot:TextField;

        private var _jackpotNote:TextField;

        private var _line:Shape;

        private var _lever:Sprite;

        private var _leverT:int = 0;

        /** The spin: sent, its answer (null until it comes), the frame it came. */
        private var _spinning:Object = null;

        private var _winCells:Array = [];

        private var _pulse:int = 0;

        private var _rain:Array = [];

        private var _rainLayer:Sprite;

        private var _celebrate:int = 0;

        private var _banner:Sprite;

        private var _serverCredits:int = -1;

        /** "slots" or "fortune". */
        private var _mode:String;

        /** Korath's Fortune's five lines, drawn when they win. */
        private var _lines:Array = [];

        /** The cells held up while the last reel spins on (a pair waiting for its third). */
        private var _tease:Array = [];

        private var _teaseColor:uint = 0xFFB030;

        /** Frames round the pair (and the last reel's place for its third) while it waits. */
        private var _teaseFx:Shape;

        private var _teaseSpots:Array = [];

        private var _autoBtn:Sprite;

        private var _autoToggles:Array = [];

        /** Spins left to play by themselves, how many a run is, and the frames to the next. */
        private var _auto:int = 0;

        private var _autoCount:int = 25;

        private var _autoWait:int = 0;

        private var _favorBtn:Sprite;

        /** Korath's Fortune's champions, by the Slots symbol each stands for (the jackpot is three Korath). */
        public static const FORTUNE_NAMES:Object = {"wormzer": "Korath", "balthazar": "Krallen", "grokus": "Fomor", "valgos": "Drull", "zagnoid": "Gorgo", "malphus": "Young Korath", "spurtz": "Baby Korath"};

        public static const LINE_COLORS:Array = [0xFFB030, 0x6AE0FF, 0x9CFF6A, 0xFF6AD0, 0xD090FF];

        /** Korath's Fortune's lines (rows top to bottom, per reel), if the server has not sent them. */
        public static const FORTUNE_LINES:Array = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];

        public function SlotsGame(win:CasinoWindow, mode:String = "slots") {
            super();
            this._win = win;
            this._mode = mode;
            this.name = mode == "fortune" ? "casinoFortune" : "casinoSlots";
            var i:int = 0;
            // controls
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label(this.fortune ? "KORATH'S FORTUNE" : "MAGMA SLOTS", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
            this._bet = new BetSelector(190);
            this._bet.x = 10;
            this._bet.y = 82;
            p.addChild(this._bet);
            this._spin = CasinoUI.button("SPIN", 128, 40, this.onSpin, true, 20);
            this._spin.x = 10;
            this._spin.y = 206;
            p.addChild(this._spin);
            this._autoBtn = CasinoUI.button("AUTO", 58, 40, this.onAuto, true, 13);
            this._autoBtn.x = 142;
            this._autoBtn.y = 206;
            p.addChild(this._autoBtn);
            // how many spins AUTO plays
            var counts:Array = [10, 25, 50, 100];
            i = 0;
            while (i < counts.length) {
                var at:Sprite = CasinoUI.toggle(String(counts[i]), 44, 18, this.autoCountClick(counts[i]));
                at.name = "casinoAuto:" + counts[i];
                at.x = 10 + i * 48;
                at.y = 250;
                p.addChild(at);
                this._autoToggles.push(at);
                i++;
            }
            this.chooseAutoCount();
            p.addChild(CasinoUI.at(CasinoUI.label(this.fortune ? "THREE ON A LINE (x LINE BET)" : "THREE ON THE LINE PAY", 10, CasinoUI.EMBER, true, 190), 12, 272));
            var r:Object = this.rules();
            var rows:Array = [];
            for each (var s:String in SYMBOLS) {
                rows.push([s, 3, s == "wormzer" ? "JACKPOT" : CasinoUI.mult(r ? Number(r.pays[s]) : 0)]);
            }
            rows.push(["spurtz", 2, CasinoUI.mult(r ? Number(r.two_spurtz) : 1)]);
            i = 0;
            while (i < rows.length) {
                var row:Sprite = p.addChild(new Sprite()) as Sprite;
                row.x = 12;
                row.y = 287 + i * 13;
                var k:int = 0;
                while (k < rows[i][1]) {
                    CasinoUI.picture(row, this.symbolKey(rows[i][0]), k * 14, 0, 13, 13);
                    k++;
                }
                row.addChild(CasinoUI.at(CasinoUI.label(rows[i][1] == 2 ? "two " + this.symbolName("spurtz") : this.symbolName(rows[i][0]), 10, 0xE8DCC8, false, 100), 50, -2));
                row.addChild(CasinoUI.at(CasinoUI.label(rows[i][2], 10, rows[i][0] == "wormzer" && rows[i][1] == 3 ? 0xD090FF : CasinoUI.GOLD, true, 70, TextFormatAlign.RIGHT), 116, -2));
                i++;
            }
            // the cabinet and its reels
            if (this.fortune) {
                // Korath, looming over his machine (behind it; the cabinet is a little smaller, lower)
                var korath:Sprite = this.addChild(new Sprite()) as Sprite;
                korath.name = "casinoKorath";
                korath.mouseEnabled = korath.mouseChildren = false;
                CasinoUI.picture(korath, "casino/fortune/korath.png", CX, 0, 480, 140);
            }
            this._cabinet = this.addChild(new Sprite()) as Sprite;
            this._cabinet.x = CX;
            if (this.fortune) {
                this._cabinet.scaleX = this._cabinet.scaleY = 0.9;
                this._cabinet.x = CX + 24;
                this._cabinet.y = 40;
            }
            var backing:Shape = this._cabinet.addChild(new Shape()) as Shape;
            backing.graphics.beginFill(0x0C0706, 1);
            backing.graphics.drawRect(REEL_X - 4, REEL_Y - 4, REEL_W * 3 + 16 + 8, ROW * 3 + 8);
            backing.graphics.endFill();
            i = 0;
            while (i < 3) {
                this._reels.push(this.makeReel(i));
                i++;
            }
            var art:Sprite = this._cabinet.addChild(new Sprite()) as Sprite;
            art.mouseEnabled = art.mouseChildren = false;
            CasinoUI.picture(art, this.fortune ? "casino/fortune/cabinet.png" : "casino/slots/cabinet.png", 0, 0, 480, 400);
            this._teaseFx = this._cabinet.addChild(new Shape()) as Shape;
            this._teaseFx.filters = [new GlowFilter(0xFF8A00, 1, 12, 12, 2, 2)];
            this._line = this._cabinet.addChild(new Shape()) as Shape;
            this._line.graphics.lineStyle(4, 0xFFB030, 1);
            this._line.graphics.moveTo(REEL_X - 6, REEL_Y + ROW * 1.5);
            this._line.graphics.lineTo(REEL_X + REEL_W * 3 + 22, REEL_Y + ROW * 1.5);
            this._line.filters = [new GlowFilter(0xFF6A00, 1, 12, 12, 3, 2)];
            this._line.visible = false;
            if (this.fortune) {
                this.drawLines();
            }
            this._jackpot = CasinoUI.title("", 22, 260);
            this._jackpot.name = "casinoJackpot";
            this._jackpot.x = 110;
            this._jackpot.y = 62;
            this._cabinet.addChild(this._jackpot);
            this._jackpotNote = CasinoUI.label("", 9, 0xE8C8FF, true, 260, TextFormatAlign.CENTER);
            this._jackpotNote.x = 110;
            this._jackpotNote.y = 94;
            this._cabinet.addChild(this._jackpotNote);
            this._lever = this._cabinet.addChild(new Sprite()) as Sprite;
            this._lever.name = "casinoLever";
            this._lever.x = 456;
            this._lever.y = 262;
            this._lever.buttonMode = true;
            CasinoUI.picture(this._lever, "casino/slots/lever.png", -18, -140, 36, 140);
            this._lever.addEventListener(MouseEvent.CLICK, this.onSpin);
            // the reels themselves: a click stops them at once
            this._cabinet.addEventListener(MouseEvent.CLICK, this.onCabinetClick);
            if (!this.fortune) {
                this._favorBtn = CasinoUI.button("FREE SPIN", 112, 30, this.onFavor, true, 13);
                this._favorBtn.x = CX + 8;
                this._favorBtn.y = 10;
                this.addChild(this._favorBtn);
            }
            this._rainLayer = this.addChild(new Sprite()) as Sprite;
            this._rainLayer.mouseEnabled = this._rainLayer.mouseChildren = false;
            this._banner = this.addChild(new Sprite()) as Sprite;
            this._banner.mouseEnabled = this._banner.mouseChildren = false;
            // the symbols' pictures, once each
            for each (s in SYMBOLS) {
                ImageCache.GetImageWithCallBack(this.symbolKey(s), this.symbolLoaded, true, 1, "", [s]);
            }
            this.showJackpot();
        }

        private function rules():Object {
            var st:Object = CASINO.state;
            return st && st.rules ? st.rules.slots : null;
        }

        private function strip(reel:int):Array {
            var r:Object = this.rules();
            return r ? r.strips[reel] as Array : SYMBOLS;
        }

        private function symbolLoaded(key:String, bmd:BitmapData, args:Array = null):void {
            if (bmd && args) {
                this._bmd[args[0]] = bmd;
                for each (var reel:Object in this._reels) {
                    this.drawReel(reel);
                }
            }
        }

        private function makeReel(i:int):Object {
            var holder:Sprite = this._cabinet.addChild(new Sprite()) as Sprite;
            holder.name = "casinoReel:" + i;
            holder.x = REEL_X + i * (REEL_W + 8);
            holder.y = REEL_Y;
            var m:Matrix = new Matrix();
            m.createGradientBox(REEL_W, ROW * 3, Math.PI / 2, 0, 0);
            holder.graphics.beginGradientFill(GradientType.LINEAR, [0x6A5E50, 0xE8DCC8, 0xF4ECDC, 0xE8DCC8, 0x6A5E50], [1, 1, 1, 1, 1], [0, 70, 128, 185, 255], m);
            holder.graphics.drawRect(0, 0, REEL_W, ROW * 3);
            holder.graphics.endFill();
            var mask:Shape = this._cabinet.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRect(holder.x, holder.y, REEL_W, ROW * 3);
            mask.graphics.endFill();
            holder.mask = mask;
            var cells:Array = [];
            var k:int = 0;
            while (k < 5) {
                var c:Sprite = holder.addChild(new Sprite()) as Sprite;
                var b:Bitmap = c.addChild(new Bitmap()) as Bitmap;
                b.smoothing = true;
                cells.push({"s": c, "b": b, "sym": null});
                k++;
            }
            var reel:Object = {"i": i, "s": holder, "cells": cells, "o": Math.floor(Math.random() * 32), "v": 0, "target": -1, "state": "still", "bounce": 0};
            this.drawReel(reel);
            return reel;
        }

        private static function wrap(s:int):int {
            return ((s % 32) + 32) % 32;
        }

        /** The reel at its offset: the stop `o` in the middle row, o + 1 above it, o - 1 below. */
        private function drawReel(reel:Object):void {
            var strip:Array = this.strip(reel.i);
            var base:int = Math.floor(reel.o);
            var fast:Boolean = reel.state == "spin" || (reel.state == "stopping" && reel.v > 0.2);
            var k:int = 0;
            while (k < 5) {
                var s:int = base - 2 + k;
                var cell:Object = reel.cells[k];
                var sym:String = strip[wrap(s)];
                if (cell.sym != sym || !cell.b.bitmapData) {
                    cell.sym = sym;
                    cell.b.bitmapData = this._bmd[sym] || null;
                    if (cell.b.bitmapData) {
                        cell.b.smoothing = true;
                        cell.b.width = cell.b.height = SYM;
                        cell.b.x = cell.b.y = -SYM / 2;
                    }
                }
                cell.s.x = REEL_W / 2;
                cell.s.y = ROW * 1.5 + (reel.o - s) * ROW + reel.bounce;
                cell.s.scaleY = fast ? 1.35 : 1;
                cell.s.alpha = fast ? 0.7 : 1;
                k++;
            }
        }

        /** The cell on the middle row of a reel (for the win glow). */
        private function lineCell(reel:Object):Sprite {
            return reel.cells[2].s;
        }

        private function showJackpot():void {
            var st:Object = CASINO.state;
            var pool:Number = st ? Number(st.jackpot) : 0;
            this._jackpot.text = CasinoUI.number(Math.floor(pool));
            var r:Object = this.rules();
            var full:int = r ? int(r.jackpot_full_bet) : 100;
            // (Korath's Fortune: the line's bet, a fifth of the stake, wins its share)
            var lines:int = this.fortune ? this.lineSet().length : 1;
            var bet:Number = this._bet.value / lines;
            var all:String = CasinoUI.number(full * lines);
            this._jackpotNote.text = (this.fortune ? "ON A LINE " : "") + (bet == full ? "THIS BET WINS ALL OF IT" : (bet > full ? "THIS BET WINS IT " + CasinoUI.mult(bet / full).toUpperCase() + " OVER" : "THIS BET WINS " + Math.max(1, Math.round(bet * 100 / full)) + "% OF IT - ALL FROM " + all + " SHINY"));
            if (this._favorBtn) {
                var f:Object = CASINO.state ? CASINO.state.favor : null;
                this._favorBtn.visible = Boolean(f && f.enabled && f.ready);
            }
        }

        private function get fortune():Boolean {
            return this._mode == "fortune";
        }

        /** A symbol's picture: the Slots' monsters, or Korath's Fortune's champions. */
        private function symbolKey(s:String):String {
            return this.fortune ? "casino/fortune/" + s + ".png" : CASINO.monsterKey(s);
        }

        private function symbolName(s:String):String {
            return String(this.fortune ? FORTUNE_NAMES[s] : CASINO.MONSTER_NAMES[s]);
        }

        /** Korath's Fortune's lines: for each, the row (0 top, 1 middle, 2 bottom) on each reel. */
        private function lineSet():Array {
            var st:Object = CASINO.state;
            return st && st.rules && st.rules.fortune && st.rules.fortune.lines ? st.rules.fortune.lines as Array : FORTUNE_LINES;
        }

        /** The middle of a reel's row, in the cabinet. */
        private static function cellX(reel:int):Number {
            return REEL_X + reel * (REEL_W + 8) + REEL_W / 2;
        }

        private static function rowY(row:int):Number {
            return REEL_Y + ROW * (row + 0.5);
        }

        /** The cell on a row of a reel (0 top: the stop above the middle one). */
        private function rowCell(reel:Object, row:int):Sprite {
            return reel.cells[3 - row].s;
        }

        /** Korath's Fortune: each line's number at its ends, and the line itself (shown when it wins). */
        private function drawLines():void {
            var set:Array = this.lineSet();
            var i:int = 0;
            while (i < set.length) {
                var rows:Array = set[i];
                var col:uint = uint(LINE_COLORS[i % LINE_COLORS.length]);
                var ln:Shape = this._cabinet.addChild(new Shape()) as Shape;
                ln.graphics.lineStyle(4, col, 1);
                ln.graphics.moveTo(REEL_X - 6, rowY(rows[0]));
                var k:int = 0;
                while (k < rows.length) {
                    ln.graphics.lineTo(cellX(k), rowY(rows[k]));
                    k++;
                }
                ln.graphics.lineTo(REEL_X + REEL_W * 3 + 22, rowY(rows[rows.length - 1]));
                ln.filters = [new GlowFilter(col, 1, 10, 10, 3, 2)];
                ln.visible = false;
                this._lines.push(ln);
                // a straight line is numbered on the left, a diagonal where it ends on the right
                var straight:Boolean = rows[0] == rows[rows.length - 1];
                var badge:Sprite = this._cabinet.addChild(new Sprite()) as Sprite;
                badge.graphics.lineStyle(1.5, 0xFFFFFF, 0.9);
                badge.graphics.beginFill(col, 1);
                badge.graphics.drawCircle(0, 0, 9);
                badge.graphics.endFill();
                badge.addChild(CasinoUI.at(CasinoUI.label(String(i + 1), 10, 0x1A0A06, true, 18, TextFormatAlign.CENTER), -9, -8));
                badge.x = straight ? REEL_X - 16 : REEL_X + REEL_W * 3 + 16 + 14;
                badge.y = rowY(straight ? rows[0] : rows[rows.length - 1]);
                badge.mouseEnabled = badge.mouseChildren = false;
                i++;
            }
        }

        private function autoCountClick(n:int):Function {
            return function(e:MouseEvent):void {
                SOUNDS.Play("click1");
                _autoCount = n;
                chooseAutoCount();
            };
        }

        private function chooseAutoCount():void {
            var counts:Array = [10, 25, 50, 100];
            var i:int = 0;
            while (i < this._autoToggles.length) {
                CasinoUI.choose(this._autoToggles[i], counts[i] == this._autoCount);
                i++;
            }
        }

        /** AUTO: a run of spins at this bet (stopped by AUTO again, a jackpot, a big win or the Shiny running out). */
        private function onAuto(e:MouseEvent = null):void {
            if (this._auto > 0) {
                this.stopAuto("Auto-spin stopped.");
                return;
            }
            this._auto = this._autoCount;
            this._autoWait = 0;
            if (!this._spinning) {
                this.nextAuto();
            }
        }

        private function stopAuto(why:String = null):void {
            if (this._auto > 0 && why) {
                this._win.message(why, CasinoUI.ASH);
            }
            this._auto = 0;
            this._autoWait = 0;
        }

        private function nextAuto():void {
            if (this._auto <= 0) {
                return;
            }
            if (CASINO.credits() < this._bet.value) {
                this.stopAuto("Auto-spin stopped: not enough Shiny for the next spin.");
                return;
            }
            this._auto--;
            this.onSpin();
            if (!this._spinning) {
                this._auto = 0;
            }
        }

        private function onCabinetClick(e:MouseEvent):void {
            // (not the click on the lever that has just started the spin)
            if (this._spinning && this._spinning.t > 2) {
                this.quickStop();
            }
        }

        /** The reels stopped at once on the result (or as soon as it comes). */
        private function quickStop():void {
            var sp:Object = this._spinning;
            if (!sp || sp.quick) {
                return;
            }
            sp.quick = true;
            this.snapReels();
        }

        private function snapReels():void {
            var sp:Object = this._spinning;
            if (!sp || !sp.r || sp.r.error) {
                return;
            }
            for each (var reel:Object in this._reels) {
                if (reel.state == "still") {
                    continue;
                }
                reel.o = int(sp.r.stops[reel.i]);
                reel.state = "still";
                reel.bounce = 6;
                this.drawReel(reel);
            }
            SOUNDS.Play("click1");
            this.clearTease();
        }

        /** Today's free spin, now (the lobby's FREE SPIN). */
        public function playFavor():void {
            var f:Object = CASINO.state ? CASINO.state.favor : null;
            if (f && f.enabled && f.ready) {
                this.onFavor();
            }
        }

        private function onFavor(e:MouseEvent = null):void {
            if (!this._spinning) {
                this.stopAuto();
                this.onSpin(null, true);
            }
        }

        /**
         * A pair on a line on the first two reels, waiting for its third: how much longer the last reel
         * spins (more for two King Wormzer), and the cells to light meanwhile.
         */
        private function closeCall(r:Object):Object {
            var cells:Array = [];
            // [reel, row] of each lit cell, and of the last reel's cell each pair waits on
            var spots:Array = [];
            var wormzer:Boolean = false;
            if (this.fortune) {
                var win:Array = r.window as Array;
                for each (var rows:Array in this.lineSet()) {
                    var a:String = win[rows[0]][0];
                    if (a == win[rows[1]][1]) {
                        cells.push(this.rowCell(this._reels[0], rows[0]), this.rowCell(this._reels[1], rows[1]));
                        spots.push([0, rows[0]], [1, rows[1]], [2, rows[2], true]);
                        wormzer = wormzer || a == "wormzer";
                    }
                }
            }
            else if (r.symbols[0] == r.symbols[1]) {
                cells.push(this.lineCell(this._reels[0]), this.lineCell(this._reels[1]));
                spots.push([0, 1], [1, 1], [2, 1, true]);
                wormzer = r.symbols[0] == "wormzer";
            }
            return {"cells": cells, "spots": spots, "extra": !cells.length ? 0 : (wormzer ? 80 : 46), "wormzer": wormzer};
        }

        private function clearTease():void {
            for each (var c:Sprite in this._tease) {
                c.filters = [];
            }
            this._tease = [];
            this._teaseSpots = [];
            if (this._teaseFx) {
                this._teaseFx.graphics.clear();
            }
        }

        /** The pair framed, pulsing; the last reel's cell it waits on dashed in. */
        private function drawTease(t:int):void {
            var g:Number = 0.75 + 0.25 * Math.sin(t / 3);
            this._teaseFx.graphics.clear();
            for each (var sp:Array in this._teaseSpots) {
                var x:Number = cellX(sp[0]) - REEL_W / 2 + 3;
                var y:Number = rowY(sp[1]) - ROW / 2 + 3;
                if (sp[2]) {
                    // waiting: a fainter frame, brighter as it pulses
                    this._teaseFx.graphics.lineStyle(3, this._teaseColor, 0.25 + 0.5 * g);
                }
                else {
                    this._teaseFx.graphics.lineStyle(5, this._teaseColor, g);
                    this._teaseFx.graphics.beginFill(this._teaseColor, 0.2 * g);
                }
                this._teaseFx.graphics.drawRoundRect(x, y, REEL_W - 6, ROW - 6, 12, 12);
                this._teaseFx.graphics.endFill();
            }
            this._teaseFx.filters = [new GlowFilter(this._teaseColor, 1, 12, 12, 2, 2)];
        }

        private function onSpin(e:MouseEvent = null, favor:Boolean = false):void {
            if (this._spinning) {
                // SPIN (or the lever) while the reels turn: the result at once
                this.quickStop();
                return;
            }
            if (e != null && this._auto > 0) {
                this.stopAuto("Auto-spin stopped.");
            }
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                this.stopAuto();
                return;
            }
            var bet:int = favor ? int(st.favor.bet) : this._bet.value;
            if (!favor && CASINO.credits() < bet) {
                this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                this.stopAuto();
                return;
            }
            SOUNDS.Play("click1");
            this._leverT = 16;
            if (!favor) {
                CASINO.setCredits(CASINO.credits() - bet);
            }
            else if (this._favorBtn) {
                this._favorBtn.visible = false;
            }
            this.clearWin();
            this._spinning = {"bet": bet, "r": null, "at": 0, "t": 0, "quick": false, "favor": favor, "extra": 0};
            for each (var reel:Object in this._reels) {
                reel.state = "spin";
                reel.v = 0;
                reel.target = -1;
            }
            var isFortune:Boolean = this.fortune;
            var send:Function = favor ? function(done:Function):void {
                CASINO.favor(done);
            } : function(done:Function):void {
                if (isFortune) {
                    CASINO.fortune(bet, done);
                }
                else {
                    CASINO.slots(bet, done);
                }
            };
            send(function(r:Object):void {
                    if (!parent || !_spinning) {
                        return;
                    }
                    if (r.error) {
                        stopAuto();
                        if (!favor) {
                            CASINO.setCredits(CASINO.credits() + bet);
                        }
                        else if (CASINO.state && CASINO.state.favor) {
                            // (today's is gone, or the Pit says no: asked again when the lobby next loads)
                            CASINO.state.favor.ready = false;
                        }
                        _win.message(String(r.error), CasinoUI.LOSS);
                        SOUNDS.Play("error1");
                        for each (var rl:Object in _reels) {
                            rl.state = "stopping";
                            rl.target = Math.ceil(rl.o) + 1;
                        }
                        _spinning.r = {"error": true};
                        return;
                    }
                    _serverCredits = int(r.credits);
                    _spinning.r = r;
                    _spinning.at = _spinning.t;
                    if (_spinning.quick) {
                        snapReels();
                    }
                    else {
                        var cc:Object = closeCall(r);
                        _spinning.extra = cc.extra;
                        _spinning.tease = cc;
                    }
                });
        }

        private function clearWin():void {
            this._line.visible = false;
            for each (var ln:Shape in this._lines) {
                ln.visible = false;
            }
            this.clearTease();
            for each (var c:Sprite in this._winCells) {
                c.filters = [];
            }
            this._winCells = [];
        }

        public function tick():void {
            var sp:Object = this._spinning;
            if (sp) {
                sp.t++;
                var r:Object = sp.r;
                for each (var reel:Object in this._reels) {
                    if (reel.state == "spin") {
                        reel.v = Math.min(0.5, reel.v + 0.05);
                        reel.o += reel.v;
                        // the answer is in: each reel is told its stop in turn, left to right
                        var extra:int = reel.i == 2 ? int(sp.extra) : 0;
                        if (r && (r.error || sp.t >= sp.at + 18 + reel.i * 14 + extra && sp.t >= 30 + reel.i * 14 + extra)) {
                            if (!r.error) {
                                var stop:int = int(r.stops[reel.i]);
                                // (held back: it creeps in over more stops)
                                var from:int = Math.ceil(reel.o) + (extra > 0 ? 6 : 3);
                                reel.target = from + wrap(stop - from);
                            }
                            reel.state = "stopping";
                            reel.slow = extra > 0;
                        }
                    }
                    else if (reel.state == "stopping") {
                        var left:Number = reel.target - reel.o;
                        if (left > (reel.slow ? 4.5 : 2.5)) {
                            reel.o += reel.v;
                        }
                        else {
                            reel.v = Math.max(reel.slow ? 0.014 : 0.02, left * (reel.slow ? 0.12 : 0.22));
                            reel.o += reel.v;
                        }
                        if (reel.target - reel.o < 0.01) {
                            reel.o = reel.target;
                            reel.state = "still";
                            reel.bounce = 9;
                            SOUNDS.Play("click1");
                            // the first two are in: a pair on a line lights up while the last spins on
                            if (reel.i == 1 && sp.tease && sp.tease.cells.length && !sp.quick) {
                                this._tease = sp.tease.cells;
                                this._teaseSpots = sp.tease.spots;
                                this._teaseColor = sp.tease.wormzer ? 0xD090FF : 0xFFB030;
                                SOUNDS.Play(sp.tease.wormzer ? "lightningstart" : "iquestshow");
                            }
                        }
                    }
                    if (reel.bounce > 0) {
                        reel.bounce = reel.bounce * -0.6;
                        if (Math.abs(reel.bounce) < 0.5) {
                            reel.bounce = 0;
                        }
                    }
                    else if (reel.bounce < 0) {
                        reel.bounce = reel.bounce * -0.6;
                        if (Math.abs(reel.bounce) < 0.5) {
                            reel.bounce = 0;
                        }
                    }
                    this.drawReel(reel);
                }
                var allStill:Boolean = true;
                for each (reel in this._reels) {
                    if (reel.state != "still") {
                        allStill = false;
                    }
                }
                if (this._tease.length) {
                    var tg:Number = 0.6 + 0.4 * Math.sin(sp.t / 3);
                    for each (var tc:Sprite in this._tease) {
                        tc.filters = [new GlowFilter(this._teaseColor, tg, 16, 16, 3, 2)];
                    }
                    this.drawTease(sp.t);
                }
                if (allStill && r) {
                    this._spinning = null;
                    this.clearTease();
                    if (!r.error) {
                        if (this.fortune) {
                            this.settleFortune(r);
                        }
                        else {
                            this.settle(r);
                        }
                        this.afterSpin(r);
                    }
                }
            }
            else {
                for each (reel in this._reels) {
                    if (reel.bounce != 0) {
                        reel.bounce = Math.abs(reel.bounce) < 0.5 ? 0 : reel.bounce * -0.6;
                        this.drawReel(reel);
                    }
                }
            }
            // the lever
            if (this._leverT > 0) {
                this._leverT--;
                var u:Number = this._leverT > 10 ? (16 - this._leverT) / 6 : this._leverT / 10;
                this._lever.scaleY = 1 - 0.65 * u;
            }
            // the win
            if (this._winCells.length) {
                this._pulse++;
                var g:Number = 0.55 + 0.45 * Math.sin(this._pulse / 4);
                for each (var c:Sprite in this._winCells) {
                    c.filters = [new GlowFilter(0xFFB030, g, 18, 18, 3, 2)];
                }
                this._line.alpha = g;
                for each (var wl:Shape in this._lines) {
                    wl.alpha = g;
                }
            }
            // the jackpot: Shiny rains
            if (this._celebrate > 0) {
                this._celebrate--;
                if (this._celebrate % 2 == 0 && this._celebrate > 40) {
                    this.gem();
                }
                this._banner.alpha = this._celebrate > 30 ? 1 : this._celebrate / 30;
                this._banner.scaleX = this._banner.scaleY = 1 + 0.04 * Math.sin(this._celebrate / 4);
            }
            var i:int = this._rain.length - 1;
            while (i >= 0) {
                var d:Object = this._rain[i];
                d.s.y += d.vy;
                d.s.rotation += d.vr;
                d.vy += 0.12;
                if (d.s.y > 420) {
                    this._rainLayer.removeChild(d.s);
                    this._rain.splice(i, 1);
                }
                i--;
            }
            // SPIN stops the reels while they turn
            CasinoUI.relabel(this._spin, this._spinning ? "STOP" : "SPIN");
            CasinoUI.relabel(this._autoBtn, this._auto > 0 || (this._autoWait > 0) ? "STOP " + (this._auto + (this._spinning ? 1 : 0)) : "AUTO");
            if (!this._spinning && this._celebrate == 0) {
                this.showJackpot();
            }
            if (!this._spinning && this._auto > 0 && this._autoWait > 0) {
                if (--this._autoWait == 0) {
                    this.nextAuto();
                }
            }
        }

        /** After a spin's result: the next auto-spin, unless it should stop there. */
        private function afterSpin(r:Object):void {
            if (this._auto <= 0) {
                return;
            }
            var bet:int = int(r.bet);
            if (r.line == "jackpot") {
                this.stopAuto();
            }
            else if (int(r.payout) >= bet * CasinoWindow.BIG_WIN) {
                this.stopAuto();
            }
            else {
                this._autoWait = int(r.payout) > bet ? 36 : 14;
            }
        }

        private function settle(r:Object):void {
            var payout:int = int(r.payout);
            var bet:int = int(r.bet);
            CASINO.setCredits(CASINO.credits() + payout);
            if (this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            var favor:String = r.free ? "Moloch's Favor: " : "";
            if (r.line == "none") {
                this._win.message(favor + "Nothing on the line." + (r.free ? " Moloch smiles again tomorrow." : ""), CasinoUI.ASH);
                return;
            }
            this._line.visible = true;
            this._pulse = 0;
            var k:int = 0;
            while (k < 3) {
                if (r.line != "two_spurtz" || r.symbols[k] == "spurtz") {
                    this._winCells.push(this.lineCell(this._reels[k]));
                }
                k++;
            }
            if (r.line == "jackpot") {
                this.jackpot(int(r.jackpot_won));
            }
            else if (r.line == "two_spurtz") {
                this._win.message(favor + (r.free ? "two Spurtz, +" + CasinoUI.number(payout) + " Shiny" : "Two Spurtz: your " + CasinoUI.number(bet) + " Shiny back."), CasinoUI.GOLD);
                SOUNDS.Play("purchasepopup");
            }
            else {
                this._win.message(favor + "Three " + CASINO.MONSTER_NAMES[r.symbols[0]] + ": " + CasinoUI.mult(Number(r.multiplier)) + ", +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
                SOUNDS.Play(Number(r.multiplier) >= 25 ? "chaching" : "purchasepopup");
                this._win.bigWin(payout, bet);
            }
        }

        /** Korath's Fortune: every line that pays lit in its colour; what the spin paid in all. */
        private function settleFortune(r:Object):void {
            var payout:int = int(r.payout);
            var bet:int = int(r.bet);
            CASINO.setCredits(CASINO.credits() + payout);
            if (this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            var wins:Array = r.wins as Array;
            if (!wins || !wins.length) {
                this._win.message("Nothing on the lines.", CasinoUI.ASH);
                return;
            }
            var set:Array = this.lineSet();
            this._pulse = 0;
            var best:Object = null;
            for each (var w:Object in wins) {
                if (this._lines[w.line]) {
                    this._lines[w.line].visible = true;
                }
                var rows:Array = set[w.line];
                var k:int = 0;
                while (k < 3) {
                    if (w.kind != "two_spurtz" || w.symbols[k] == "spurtz") {
                        var c:Sprite = this.rowCell(this._reels[k], rows[k]);
                        if (this._winCells.indexOf(c) < 0) {
                            this._winCells.push(c);
                        }
                    }
                    k++;
                }
                if (w.kind == "three" && (!best || Number(w.multiplier) > Number(best.multiplier))) {
                    best = w;
                }
            }
            if (r.line == "jackpot") {
                this.jackpot(int(r.jackpot_won));
                return;
            }
            var n:String = wins.length == 1 ? "1 line" : wins.length + " lines";
            if (payout > bet) {
                this._win.message(n + (best ? " (three " + this.symbolName(best.symbols[0]) + ")" : "") + ": +" + CasinoUI.number(payout) + " Shiny on " + CasinoUI.number(bet), CasinoUI.WIN);
                SOUNDS.Play(payout >= bet * 5 ? "chaching" : "purchasepopup");
                this._win.bigWin(payout, bet);
            }
            else {
                // (a line of two Spurtz pays its fifth back: said as it is)
                this._win.message(n + ": " + CasinoUI.number(payout) + " of your " + CasinoUI.number(bet) + " Shiny back.", payout == bet ? CasinoUI.GOLD : CasinoUI.ASH);
            }
        }

        private function jackpot(won:int):void {
            this._win.message("JACKPOT! Three " + this.symbolName("wormzer") + ": +" + CasinoUI.number(won) + " Shiny", 0xD090FF);
            SOUNDS.Play("chaching");
            this._celebrate = 200;
            CasinoUI.removeAll(this._banner);
            var bg:Shape = this._banner.addChild(new Shape()) as Shape;
            bg.graphics.beginFill(0x2E0A48, 0.85);
            bg.graphics.lineStyle(3, 0xD090FF, 1);
            bg.graphics.drawRoundRect(-200, -50, 400, 100, 24, 24);
            bg.graphics.endFill();
            bg.filters = [new GlowFilter(0xB060FF, 1, 30, 30, 2, 2)];
            this._banner.addChild(CasinoUI.at(CasinoUI.title("JACKPOT!", 40, 400), -200, -48));
            this._banner.addChild(CasinoUI.at(CasinoUI.label("+" + CasinoUI.number(won) + " SHINY", 22, 0xFFFFFF, true, 400, TextFormatAlign.CENTER), -200, 8));
            this._banner.x = 350;
            this._banner.y = 200;
        }

        /** A Shiny gem falling. */
        private function gem():void {
            var s:Shape = this._rainLayer.addChild(new Shape()) as Shape;
            s.graphics.lineStyle(1, 0xFFFFFF, 0.9);
            s.graphics.beginFill(0x7AE0FF, 1);
            s.graphics.moveTo(0, -8);
            s.graphics.lineTo(7, -2);
            s.graphics.lineTo(0, 9);
            s.graphics.lineTo(-7, -2);
            s.graphics.lineTo(0, -8);
            s.graphics.endFill();
            s.filters = [new GlowFilter(0x7AE0FF, 0.8, 8, 8, 2, 1)];
            s.x = 220 + Math.random() * 480;
            s.y = -10;
            this._rain.push({"s": s, "vy": 1 + Math.random() * 2, "vr": (Math.random() - 0.5) * 12});
        }

        public function get showing():Boolean {
            return this._spinning != null;
        }

        public function dispose():void {
            if (this._spinning && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            this._spinning = null;
            this._auto = 0;
            this._lever.removeEventListener(MouseEvent.CLICK, this.onSpin);
            this._cabinet.removeEventListener(MouseEvent.CLICK, this.onCabinetClick);
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
