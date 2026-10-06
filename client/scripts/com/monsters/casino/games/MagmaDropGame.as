package com.monsters.casino.games {
    import com.monsters.casino.BetSelector;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Magma Drop (Plinko): a Spurtz dropped through ten rows of obsidian pegs into one of eleven lava cups.
     * The server draws the ten bounces (server/src/services/casino/games/magmaDrop.ts) and pays the cup's
     * multiplier; this plays the path it sends. Several balls may fall at once. The Shiny shown drops by
     * the bet when a ball is sent and rises by its prize when it lands.
     */
    public class MagmaDropGame extends Sprite {

        private static const ROWS:int = 10;

        private static const SP:Number = 36;

        private static const ROW_H:Number = 29;

        /** The board, from the content area's top left. */
        private static const BX:int = 220;

        private static const BW:int = 480;

        private static const BH:int = 400;

        /** Pegs' top row and the cups' line, in the board. */
        private static const TOP:Number = 44;

        private static const CUP_Y:Number = TOP + ROWS * ROW_H + 14;

        private static const FRAMES_PER_ROW:int = 7;

        private var _win:CasinoWindow;

        private var _bet:BetSelector;

        private var _risk:String = "low";

        private var _riskButtons:Object = {};

        private var _drop:Sprite;

        private var _board:Sprite;

        private var _pegs:Array = [];

        private var _cups:Array = [];

        private var _balls:Array = [];

        private var _sparks:Array = [];

        private var _results:Sprite;

        private var _last:Array = [];

        private var _spurtz:BitmapData;

        private var _pending:int = 0;

        /** Spurtz in the air at once (was 6; 3 October: 20). */
        private static const MAX_IN_FLIGHT:int = 20;

        private var _serverCredits:int = -1;

        public function MagmaDropGame(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoMagmaDrop";
            // controls
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label("MAGMA DROP", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
            this._bet = new BetSelector(190);
            this._bet.x = 10;
            this._bet.y = 82;
            p.addChild(this._bet);
            p.addChild(CasinoUI.at(CasinoUI.label("RISK", 11, CasinoUI.EMBER, true, 190), 12, 212));
            var risks:Array = ["low", "medium", "high"];
            var i:int = 0;
            while (i < risks.length) {
                var r:Sprite = CasinoUI.toggle(String(risks[i]).toUpperCase(), 60, 26, this.riskClick(risks[i]));
                r.x = 10 + i * 64;
                r.y = 228;
                p.addChild(r);
                this._riskButtons[risks[i]] = r;
                i++;
            }
            this._drop = CasinoUI.button("DROP", 190, 44, this.onDrop, true, 20);
            this._drop.x = 10;
            this._drop.y = 266;
            p.addChild(this._drop);
            p.addChild(CasinoUI.at(CasinoUI.label("LAST DROPS", 11, CasinoUI.EMBER, true, 190), 12, 318));
            this._results = p.addChild(new Sprite()) as Sprite;
            this._results.x = 10;
            this._results.y = 336;
            // the board
            this._board = this.addChild(new Sprite()) as Sprite;
            this._board.x = BX;
            var bg:Sprite = this._board.addChild(CasinoUI.panel(BW, BH, 1)) as Sprite;
            CasinoUI.picture(this._board, "casino/magmadrop/board_bg.jpg", 3, 3, BW - 6, BH - 6, function(b:Bitmap):void {
                    _board.setChildIndex(b, Math.min(1, _board.numChildren - 1)); // (behind what is drawn on it)
                });
            this.buildPegs();
            this.buildCups();
            ImageCache.GetImageWithCallBack("casino/magmadrop/spurtz_ball.png", function(k:String, bmd:BitmapData, args:Array = null):void {
                    _spurtz = bmd;
                });
            this.setRisk("low");
        }

        private function riskClick(r:String):Function {
            return function(e:MouseEvent):void {
                setRisk(r);
            };
        }

        private function setRisk(r:String):void {
            this._risk = r;
            var k:String = null;
            for (k in this._riskButtons) {
                CasinoUI.choose(this._riskButtons[k], k == r);
            }
            var table:Array = this.table();
            var i:int = 0;
            while (i < this._cups.length) {
                var c:Object = this._cups[i];
                var m:Number = table ? Number(table[i]) : 0;
                c.label.text = CasinoUI.mult(m);
                c.label.textColor = cupColor(m);
                i++;
            }
        }

        private function table():Array {
            var st:Object = CASINO.state;
            return st && st.rules && st.rules.magmadrop ? st.rules.magmadrop.risks[this._risk] as Array : null;
        }

        private static function cupColor(m:Number):uint {
            return m >= 10 ? 0xFF5A3A : (m >= 3 ? 0xFFA040 : (m >= 1 ? 0xFFD58A : 0xB8A898));
        }

        /** Where peg `i` of row `r` sits on the board (row r has r + 3 pegs). */
        private static function pegX(r:int, i:int):Number {
            return BW / 2 + (i - (r + 2) / 2) * SP;
        }

        private static function pegY(r:int):Number {
            return TOP + r * ROW_H;
        }

        private function buildPegs():void {
            var r:int = 0;
            while (r < ROWS) {
                var i:int = 0;
                while (i < r + 3) {
                    var peg:Sprite = this._board.addChild(new Sprite()) as Sprite;
                    CasinoUI.picture(peg, "casino/magmadrop/peg.png", -9, -9, 18, 18);
                    peg.x = pegX(r, i);
                    peg.y = pegY(r);
                    this._pegs.push(peg);
                    i++;
                }
                r++;
            }
        }

        private function buildCups():void {
            var k:int = 0;
            while (k <= ROWS) {
                var cup:Sprite = this._board.addChild(new Sprite()) as Sprite;
                cup.name = "casinoCup:" + k;
                CasinoUI.picture(cup, "casino/magmadrop/cup.png", -17, -8, 34, 30);
                cup.x = BW / 2 + (k - ROWS / 2) * SP;
                cup.y = CUP_Y;
                var t:TextField = CasinoUI.label("", 10, 0xFFFFFF, true, 40, TextFormatAlign.CENTER);
                t.x = -20;
                t.y = 22;
                t.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
                cup.addChild(t);
                this._cups.push({"s": cup, "label": t, "glow": 0});
                k++;
            }
        }

        private function onDrop(e:MouseEvent = null):void {
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                return;
            }
            var bet:int = this._bet.value;
            if (CASINO.credits() < bet) {
                this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            if (this._pending >= MAX_IN_FLIGHT) {
                return;
            }
            ++this._pending;
            CASINO.setCredits(CASINO.credits() - bet);
            var risk:String = this._risk;
            CASINO.magmaDrop(bet, risk, function(r:Object):void {
                    if (!parent) {
                        return;
                    }
                    if (r.error) {
                        --_pending;
                        CASINO.setCredits(CASINO.credits() + bet);
                        _win.message(String(r.error), CasinoUI.LOSS);
                        SOUNDS.Play("error1");
                        return;
                    }
                    _serverCredits = int(r.credits);
                    launch(r);
                });
        }

        /** A ball, following the path the server sent. */
        private function launch(r:Object):void {
            var ball:Sprite = this._board.addChild(new Sprite()) as Sprite;
            ball.name = "casinoBall";
            if (this._spurtz) {
                var b:Bitmap = new Bitmap(this._spurtz);
                b.smoothing = true;
                b.width = b.height = 28;
                b.x = b.y = -14;
                ball.addChild(b);
            }
            else {
                var s:Shape = ball.addChild(new Shape()) as Shape;
                s.graphics.beginFill(0xFF8A2A);
                s.graphics.drawCircle(0, 0, 11);
                s.graphics.endFill();
            }
            ball.filters = [new GlowFilter(0xFF6A00, 0.9, 12, 12, 2, 2)];
            ball.x = BW / 2;
            ball.y = TOP - ROW_H;
            this._balls.push({"s": ball, "r": r, "row": -1, "t": 0, "x0": ball.x, "y0": ball.y, "x1": BW / 2, "y1": pegY(0) - 14, "spin": (Math.random() - 0.5) * 20});
        }

        public function tick():void {
            var i:int = this._balls.length - 1;
            while (i >= 0) {
                var b:Object = this._balls[i];
                b.t++;
                var u:Number = Math.min(1, b.t / FRAMES_PER_ROW);
                var hop:Number = b.row < 0 ? 0 : 9;
                b.s.x = b.x0 + (b.x1 - b.x0) * u;
                b.s.y = b.y0 + (b.y1 - b.y0) * u * u - hop * 4 * u * (1 - u);
                b.s.rotation += b.spin;
                if (u >= 1) {
                    b.row++;
                    var path:Array = b.r.path as Array;
                    if (b.row < ROWS) {
                        // on a peg: a spark, then off to the left or right
                        this.spark(b.x1, pegY(b.row));
                        var dir:int = int(path[b.row]) == 1 ? 1 : -1;
                        b.spin = dir * (8 + Math.random() * 6);
                        b.x0 = b.x1;
                        b.y0 = b.y1;
                        b.x1 = b.x1 + dir * SP / 2;
                        b.y1 = b.row + 1 < ROWS ? pegY(b.row + 1) - 14 : CUP_Y;
                        b.t = 0;
                    }
                    else {
                        this.land(b);
                        this._board.removeChild(b.s);
                        this._balls.splice(i, 1);
                    }
                }
                i--;
            }
            // sparks and splashes
            i = this._sparks.length - 1;
            while (i >= 0) {
                var p:Object = this._sparks[i];
                p.life--;
                p.s.x += p.vx;
                p.s.y += p.vy;
                p.vy += p.g;
                p.s.alpha = Math.max(0, p.life / p.max);
                if (p.grow) {
                    p.s.scaleX = p.s.scaleY = p.s.scaleX + p.grow;
                }
                if (p.life <= 0) {
                    p.s.parent.removeChild(p.s);
                    this._sparks.splice(i, 1);
                }
                i--;
            }
            // cups glowing after a landing
            var c:Object = null;
            for each (c in this._cups) {
                if (c.glow > 0) {
                    c.glow--;
                    c.s.filters = [new GlowFilter(0xFFB040, c.glow / 24, 16, 16, 3, 2)];
                    if (c.glow == 0) {
                        c.s.filters = [];
                    }
                }
            }
            CasinoUI.enable(this._drop, this._pending < MAX_IN_FLIGHT);
        }

        private function spark(x:Number, y:Number):void {
            var s:Shape = this._board.addChild(new Shape()) as Shape;
            s.graphics.beginFill(0xFFD070, 0.9);
            s.graphics.drawCircle(0, 0, 6);
            s.graphics.endFill();
            s.x = x;
            s.y = y;
            s.filters = [new GlowFilter(0xFF6A00, 1, 10, 10, 3, 1)];
            this._sparks.push({"s": s, "vx": 0, "vy": 0, "g": 0, "life": 8, "max": 8, "grow": 0.08});
        }

        private function land(b:Object):void {
            var r:Object = b.r;
            var slot:int = int(r.slot);
            var payout:int = int(r.payout);
            var bet:int = int(r.bet);
            var cup:Object = this._cups[slot];
            cup.glow = 24;
            // the splash
            var n:int = payout >= bet * 10 ? 26 : 12;
            var k:int = 0;
            while (k < n) {
                var d:Shape = this._board.addChild(new Shape()) as Shape;
                d.graphics.beginFill([0xFF6A1A, 0xFFB040, 0xFFE08A][k % 3], 1);
                d.graphics.drawCircle(0, 0, 1.5 + Math.random() * 2);
                d.graphics.endFill();
                d.x = cup.s.x;
                d.y = CUP_Y;
                this._sparks.push({"s": d, "vx": (Math.random() - 0.5) * 3.2, "vy": -2 - Math.random() * 3.5, "g": 0.25, "life": 30, "max": 30, "grow": 0});
                k++;
            }
            // the prize: shown now in the Shiny
            --this._pending;
            CASINO.setCredits(CASINO.credits() + payout);
            if (this._pending == 0 && this._balls.length <= 1 && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            var m:Number = Number(r.multiplier);
            if (payout > bet) {
                this._win.message("Cup " + CasinoUI.mult(m) + ": +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
                SOUNDS.Play(m >= 5 ? "chaching" : "purchasepopup");
                this._win.bigWin(payout, bet);
            }
            else {
                this._win.message("Cup " + CasinoUI.mult(m) + (payout > 0 ? ": " + CasinoUI.number(payout) + " back" : ""), payout > 0 ? CasinoUI.GOLD : CasinoUI.ASH);
            }
            this.addResult(m);
        }

        private function addResult(m:Number):void {
            this._last.unshift(m);
            if (this._last.length > 12) {
                this._last.pop();
            }
            CasinoUI.removeAll(this._results);
            var i:int = 0;
            while (i < this._last.length) {
                var v:Number = this._last[i];
                var box:Sprite = CasinoUI.panel(44, 22, 1);
                box.x = (i % 4) * 47;
                box.y = int(i / 4) * 25;
                var t:TextField = CasinoUI.label(CasinoUI.mult(v), 10, cupColor(v), true, 44, TextFormatAlign.CENTER);
                t.y = 3;
                box.addChild(t);
                this._results.addChild(box);
                i++;
            }
        }

        /** Balls in the air (the Shiny shown is not yet the server's). */
        public function get showing():Boolean {
            return this._pending > 0 || this._balls.length > 0;
        }

        public function dispose():void {
            // balls still falling: their prizes are already paid; the lobby's state brings the Shiny right
            if (this._pending > 0 && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            this._balls = [];
            this._sparks = [];
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
