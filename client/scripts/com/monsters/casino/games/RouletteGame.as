package com.monsters.casino.games {
    import com.monsters.casino.BetSelector;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Wormzer Roulette: a wheel of 29 segments (the seven monsters four times each on Lava and Ash, and
     * King Wormzer, the house's). Chips go on monsters, a colour or King Wormzer (what each pays comes
     * from casino/state: 7.24x, 2.07x, 28.99x), several on one spin. The server draws the segment (server/src/services/casino/games/roulette.ts); the wheel
     * turns and Spurtz, the ball, drops into it. The wheel's order comes from casino/state.
     */
    public class RouletteGame extends Sprite {

        /** The wheel's middle, from the content area's top left, and its radii (wheel.png is 240 across). */
        private static const WX:Number = 345;

        private static const WY:Number = 162;

        private static const R_TRACK:Number = 111;

        private static const R_POCKET:Number = 66;

        private static const SPIN_FRAMES:int = 180;

        private var _win:CasinoWindow;

        private var _chip:BetSelector;

        private var _spin:Sprite;

        private var _clear:Sprite;

        private var _rebet:Sprite;

        private var _total:TextField;

        private var _wheel:Sprite;

        private var _ball:Sprite;

        private var _boxes:Object = {};

        private var _slip:Object = {};

        private var _lastSlip:Object = null;

        private var _results:Sprite;

        private var _last:Array = [];

        private var _resultText:TextField;

        private var _resultIcon:Sprite;

        /** The spin being shown: the server's answer, and where the wheel and ball are going. */
        private var _spinning:Object = null;

        private var _busy:Boolean = false;

        private var _pulse:int = 0;

        private var _winners:Array = [];

        private var _burst:Sprite;

        private var _burstT:int = 0;

        private var _serverCredits:int = -1;

        public function RouletteGame(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoRoulette";
            // controls
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label("WORMZER ROULETTE", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("CHIP (click a place to bet it)", 10, CasinoUI.EMBER, true, 190), 12, 68));
            this._chip = new BetSelector(190);
            this._chip.x = 10;
            this._chip.y = 82;
            this._chip.setValue(5);
            p.addChild(this._chip);
            p.addChild(CasinoUI.at(CasinoUI.label("ON THE TABLE", 11, CasinoUI.EMBER, true, 190), 12, 212));
            this._total = CasinoUI.label("0 Shiny", 15, CasinoUI.GOLD, true, 190);
            this._total.x = 12;
            this._total.y = 226;
            p.addChild(this._total);
            this._spin = CasinoUI.button("SPIN", 190, 42, this.onSpin, false, 20);
            this._spin.x = 10;
            this._spin.y = 254;
            p.addChild(this._spin);
            this._clear = CasinoUI.button("CLEAR", 92, 26, this.onClear, false, 12);
            this._clear.x = 10;
            this._clear.y = 302;
            p.addChild(this._clear);
            this._rebet = CasinoUI.button("AGAIN", 92, 26, this.onRebet, false, 12);
            this._rebet.x = 108;
            this._rebet.y = 302;
            p.addChild(this._rebet);
            p.addChild(CasinoUI.at(CasinoUI.label("LAST SPINS", 11, CasinoUI.EMBER, true, 190), 12, 336));
            this._results = p.addChild(new Sprite()) as Sprite;
            this._results.x = 10;
            this._results.y = 354;
            // the wheel
            var wp:Sprite = this.addChild(CasinoUI.panel(250, 400, 1)) as Sprite;
            wp.x = 220;
            CasinoUI.picture(wp, "casino/magmadrop/board_bg.jpg", 3, 3, 244, 394, function(b:Bitmap):void {
                    b.alpha = 0.6;
                    wp.setChildIndex(b, Math.min(1, wp.numChildren - 1)); // (behind what is drawn on it)
                });
            this._wheel = this.addChild(new Sprite()) as Sprite;
            this._wheel.name = "casinoWheel";
            this._wheel.x = WX;
            this._wheel.y = WY;
            CasinoUI.picture(this._wheel, "casino/roulette/wheel.png", -120, -120, 240, 240);
            this._ball = this.addChild(new Sprite()) as Sprite;
            this._ball.name = "casinoRouletteBall";
            CasinoUI.picture(this._ball, "casino/magmadrop/spurtz_ball.png", -10, -10, 20, 20);
            this._ball.filters = [new GlowFilter(0xFF6A00, 0.9, 10, 10, 2, 2)];
            this._ball.visible = false;
            var rim:Sprite = this.addChild(new Sprite()) as Sprite;
            rim.x = WX;
            rim.y = WY;
            rim.mouseEnabled = rim.mouseChildren = false;
            CasinoUI.picture(rim, "casino/roulette/wheel_rim.png", -130, -130, 260, 260);
            this._resultIcon = this.addChild(new Sprite()) as Sprite;
            this._resultIcon.x = WX;
            this._resultIcon.y = WY + 170;
            this._resultText = CasinoUI.label("Place your chips", 13, CasinoUI.ASH, true, 240, TextFormatAlign.CENTER);
            this._resultText.x = WX - 120;
            this._resultText.y = WY + 136;
            this.addChild(this._resultText);
            // the table
            var places:Array = this.places();
            var i:int = 0;
            while (i < places.length) {
                var box:Sprite = this.makeBox(places[i]);
                box.x = 478 + (i % 2) * 112;
                box.y = 4 + int(i / 2) * 79;
                this.addChild(box);
                i++;
            }
            this._burst = this.addChild(new Sprite()) as Sprite;
            this._burst.mouseEnabled = this._burst.mouseChildren = false;
            this._burst.x = WX;
            this._burst.y = WY;
            this.refresh();
        }

        private function rules():Object {
            var st:Object = CASINO.state;
            return st && st.rules ? st.rules.roulette : null;
        }

        /** The ten places: the seven monsters, Lava, Ash and King Wormzer. */
        private function places():Array {
            var r:Object = this.rules();
            var monsters:Array = r ? (r.monsters as Array).concat() : ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox"];
            return monsters.concat(["lava", "ash", "wormzer"]);
        }

        private function pays(on:String):Number {
            var r:Object = this.rules();
            if (!r) {
                return 0;
            }
            return on == "wormzer" ? Number(r.pays.wormzer) : (on == "lava" || on == "ash" ? Number(r.pays.color) : Number(r.pays.monster));
        }

        private function makeBox(on:String):Sprite {
            var b:MovieClip = new MovieClip();
            b.name = "casinoPlace:" + on;
            b.buttonMode = true;
            b.mouseChildren = false;
            var W:int = 106, H:int = 73;
            var colors:Array = on == "lava" ? [0xC03A12, 0x6A1206] : (on == "ash" ? [0x3A3432, 0x141010] : (on == "wormzer" ? [0x7A2AB0, 0x2E0A48] : [0x2A1E1A, 0x140E0C]));
            var m:Matrix = new Matrix();
            m.createGradientBox(W, H, Math.PI / 2, 0, 0);
            b.graphics.lineStyle(1.5, on == "wormzer" ? 0xD090FF : 0x9A3A14, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, colors, [1, 1], [0, 255], m);
            b.graphics.drawRoundRect(0, 0, W, H, 12, 12);
            b.graphics.endFill();
            var title:String = on == "lava" ? "LAVA" : (on == "ash" ? "ASH" : String(CASINO.MONSTER_NAMES[on] || on).toUpperCase());
            if (on == "lava" || on == "ash") {
                b.addChild(CasinoUI.at(CasinoUI.label(title, 20, 0xFFFFFF, true, W, TextFormatAlign.CENTER, "Groboldov"), 0, 14));
            }
            else {
                // (the picture in its own layer under the name: it arrives later and was drawn over it, Balthazar's
                // wing hiding the "B")
                CasinoUI.picture(b.addChild(new Sprite()) as Sprite, CASINO.monsterKey(on), 4, 4, 48, 48);
                var t:TextField = CasinoUI.label(title, title.length > 7 ? 9 : 10, 0xFFFFFF, true, 60, TextFormatAlign.RIGHT);
                t.x = 42;
                t.y = 8;
                t.multiline = t.wordWrap = true;
                t.height = 30;
                b.addChild(t);
            }
            var p:TextField = CasinoUI.label(CasinoUI.mult(this.pays(on)), 12, CasinoUI.GOLD, true, W - 8, TextFormatAlign.RIGHT);
            p.x = 0;
            p.y = H - 20;
            b.addChild(p);
            // the chips on it
            var stack:Sprite = b.addChild(new Sprite()) as Sprite;
            stack.x = 22;
            stack.y = H - 18;
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    place(on);
                });
            this._boxes[on] = {"s": b, "stack": stack};
            return b;
        }

        private function place(on:String):void {
            if (this._busy) {
                return;
            }
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                return;
            }
            var total:int = this.slipTotal();
            var chip:int = this._chip.value;
            if (CASINO.credits() < total + chip) {
                this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            var count:int = 0;
            var k:String = null;
            for (k in this._slip) {
                count++;
            }
            var r:Object = this.rules();
            if (this._slip[on] == null && r && count >= int(r.maxBets)) {
                this._win.message("Up to " + r.maxBets + " places on one spin.", CasinoUI.ASH);
                return;
            }
            SOUNDS.Play("click1");
            this._slip[on] = int(this._slip[on] || 0) + chip;
            this._winners = [];
            this.refresh();
        }

        private function slipTotal():int {
            var t:int = 0;
            var k:String = null;
            for (k in this._slip) {
                t += int(this._slip[k]);
            }
            return t;
        }

        /** The chips on the table and the buttons, as the slip is. */
        private function refresh():void {
            var k:String = null;
            for (k in this._boxes) {
                var stack:Sprite = this._boxes[k].stack;
                CasinoUI.removeAll(stack);
                var amount:int = int(this._slip[k] || 0);
                if (amount > 0) {
                    var c:Shape = stack.addChild(new Shape()) as Shape;
                    c.graphics.lineStyle(2, 0xF4ECDC, 1);
                    c.graphics.beginFill(0xD8B040, 1);
                    c.graphics.drawCircle(0, 0, 13);
                    c.graphics.endFill();
                    c.filters = [new GlowFilter(0, 0.6, 4, 4, 2, 1)];
                    var t:TextField = CasinoUI.label(amount >= 10000 ? int(amount / 1000) + "k" : String(amount), amount >= 1000 ? 8 : 10, 0x201410, true, 30, TextFormatAlign.CENTER);
                    t.x = -15;
                    t.y = -8;
                    stack.addChild(t);
                }
            }
            var total:int = this.slipTotal();
            this._total.text = CasinoUI.number(total) + " Shiny";
            CasinoUI.enable(this._spin, total > 0 && !this._busy);
            CasinoUI.enable(this._clear, total > 0 && !this._busy);
            CasinoUI.enable(this._rebet, this._lastSlip != null && total == 0 && !this._busy);
        }

        private function onClear(e:MouseEvent = null):void {
            if (!this._busy) {
                this._slip = {};
                this.refresh();
            }
        }

        private function onRebet(e:MouseEvent = null):void {
            if (this._busy || !this._lastSlip) {
                return;
            }
            var need:int = 0;
            var k:String = null;
            for (k in this._lastSlip) {
                need += int(this._lastSlip[k]);
            }
            if (CASINO.credits() < need) {
                this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            this._slip = {};
            for (k in this._lastSlip) {
                this._slip[k] = this._lastSlip[k];
            }
            this._winners = [];
            this.refresh();
        }

        private function onSpin(e:MouseEvent = null):void {
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                return;
            }
            var total:int = this.slipTotal();
            if (this._busy || total <= 0) {
                return;
            }
            if (CASINO.credits() < total) {
                this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            var bets:Array = [];
            var k:String = null;
            for (k in this._slip) {
                bets.push({"on": k, "amount": int(this._slip[k])});
            }
            this._busy = true;
            this._winners = [];
            this.refresh();
            CASINO.setCredits(CASINO.credits() - total);
            this._resultText.text = "No more bets!";
            this._resultText.textColor = CasinoUI.ASH;
            CasinoUI.removeAll(this._resultIcon);
            CASINO.roulette(bets, function(r:Object):void {
                    if (!parent) {
                        return;
                    }
                    if (r.error) {
                        _busy = false;
                        CASINO.setCredits(CASINO.credits() + total);
                        _resultText.text = "Place your chips";
                        _win.message(String(r.error), CasinoUI.LOSS);
                        SOUNDS.Play("error1");
                        refresh();
                        return;
                    }
                    _serverCredits = int(r.credits);
                    _lastSlip = _slip;
                    startSpin(r);
                });
        }

        /** Segment i's middle, in degrees clockwise from the top of the wheel. */
        private static function segAngle(i:int, n:int):Number {
            return i * 360 / n;
        }

        private static function mod360(a:Number):Number {
            return ((a % 360) + 360) % 360;
        }

        private function startSpin(r:Object):void {
            var n:int = this.rules() ? int(this.rules().segments) : 29;
            var w0:Number = this._wheel.rotation;
            // the wheel turns clockwise and stops with the segment drawn under the pointer (the top)
            var dw:Number = mod360(-segAngle(int(r.segment), n) - w0) + 360 * 3;
            var b0:Number = Math.random() * 360;
            this._spinning = {"r": r, "t": 0, "w0": w0, "dw": dw, "b0": b0, "db": -1, "n": n};
            this._ball.visible = true;
            SOUNDS.Play("click1");
        }

        private static function easeOut(u:Number):Number {
            return 1 - (1 - u) * (1 - u) * (1 - u);
        }

        public function tick():void {
            var s:Object = this._spinning;
            if (s) {
                s.t++;
                var u:Number = Math.min(1, s.t / SPIN_FRAMES);
                var w:Number = s.w0 + s.dw * easeOut(u);
                this._wheel.rotation = w;
                var target:Number = segAngle(int(s.r.segment), s.n);
                var CATCH:Number = 0.82;
                var angle:Number;
                var radius:Number;
                if (u < CATCH) {
                    if (s.db < 0) {
                        // the ball runs the other way and comes to the segment just as the wheel brings it round
                        var wc:Number = s.w0 + s.dw * easeOut(CATCH);
                        s.db = mod360(s.b0 - (target + wc)) + 360 * 3;
                    }
                    var v:Number = u / CATCH;
                    angle = s.b0 - s.db * (1 - (1 - v) * (1 - v));
                    radius = v < 0.7 ? R_TRACK : R_TRACK - (R_TRACK - R_POCKET) * ((v - 0.7) / 0.3) + Math.abs(Math.sin(v * 40)) * 4 * (1 - v);
                }
                else {
                    angle = target + w;
                    radius = R_POCKET;
                }
                var a:Number = angle * Math.PI / 180;
                this._ball.x = WX + Math.sin(a) * radius;
                this._ball.y = WY - Math.cos(a) * radius;
                this._ball.rotation -= 12 * (1 - u);
                if (u >= 1) {
                    this._spinning = null;
                    this.land(s.r);
                }
            }
            // winning places pulse
            if (this._winners.length) {
                this._pulse++;
                var g:Number = 0.55 + 0.45 * Math.sin(this._pulse / 5);
                for each (var on:String in this._winners) {
                    this._boxes[on].s.filters = [new GlowFilter(0xFFD040, g, 16, 16, 3, 2)];
                }
            }
            // King Wormzer bursts out
            if (this._burstT > 0) {
                this._burstT--;
                var k:Number = 1 - this._burstT / 70;
                this._burst.scaleX = this._burst.scaleY = Math.min(1.25, 0.2 + k * 2.4);
                this._burst.alpha = this._burstT > 20 ? 1 : this._burstT / 20;
                this._burst.x = WX + (this._burstT > 40 ? (Math.random() - 0.5) * 8 : 0);
                if (this._burstT == 0) {
                    CasinoUI.removeAll(this._burst);
                }
            }
        }

        private function land(r:Object):void {
            this._busy = false;
            var payout:int = int(r.payout);
            var bet:int = int(r.bet);
            CASINO.setCredits(CASINO.credits() + payout);
            if (this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            // the result
            var title:String = r.monster == "wormzer" ? "KING WORMZER" : String(CASINO.MONSTER_NAMES[r.monster] || r.monster).toUpperCase() + " - " + String(r.color).toUpperCase();
            this._resultText.text = title;
            this._resultText.textColor = r.color == "lava" ? 0xFF7A4A : (r.color == "wormzer" ? 0xD090FF : 0xE8DCC8);
            CasinoUI.removeAll(this._resultIcon);
            CasinoUI.picture(this._resultIcon, CASINO.monsterKey(r.monster), -30, -8, 60, 60);
            this._winners = [];
            this._pulse = 0;
            var k:String = null;
            for (k in this._boxes) {
                this._boxes[k].s.filters = [];
            }
            for each (var res:Object in r.results) {
                if (res.won) {
                    this._winners.push(String(res.on));
                }
            }
            if (payout > 0) {
                this._win.message((payout > bet ? "+" : "") + CasinoUI.number(payout) + " Shiny back on " + CasinoUI.number(bet) + " bet", payout > bet ? CasinoUI.WIN : CasinoUI.GOLD);
                SOUNDS.Play(payout >= bet * 7 ? "chaching" : "purchasepopup");
                this._win.bigWin(payout, bet);
            }
            else {
                this._win.message("The house takes it.", CasinoUI.ASH);
            }
            if (r.monster == "wormzer") {
                this.wormzerBursts();
            }
            this.addResult(r);
            this._slip = {};
            this.refresh();
        }

        private function wormzerBursts():void {
            CasinoUI.removeAll(this._burst);
            var ring:Shape = this._burst.addChild(new Shape()) as Shape;
            ring.graphics.beginFill(0x7A2AB0, 0.55);
            ring.graphics.drawCircle(0, 0, 80);
            ring.graphics.endFill();
            ring.filters = [new GlowFilter(0xD090FF, 1, 30, 30, 3, 2)];
            CasinoUI.picture(this._burst, CASINO.monsterKey("wormzer"), -80, -85, 160, 160);
            this._burst.filters = [new GlowFilter(0xB060FF, 0.9, 24, 24, 2, 2)];
            this._burstT = 70;
            SOUNDS.Play("chaching");
        }

        private function addResult(r:Object):void {
            this._last.unshift(r);
            if (this._last.length > 8) {
                this._last.pop();
            }
            CasinoUI.removeAll(this._results);
            var i:int = 0;
            while (i < this._last.length) {
                var o:Object = this._last[i];
                var box:Sprite = new Sprite();
                box.graphics.lineStyle(1, 0x9A3A14, 1);
                box.graphics.beginFill(o.color == "lava" ? 0xA0300E : (o.color == "wormzer" ? 0x6A2A9A : 0x2A2422), 1);
                box.graphics.drawRoundRect(0, 0, 44, 20, 8, 8);
                box.graphics.endFill();
                CasinoUI.picture(box, CASINO.monsterKey(o.monster), 12, 0, 20, 20);
                box.x = (i % 4) * 47;
                box.y = int(i / 4) * 23;
                this._results.addChild(box);
                i++;
            }
        }

        public function get showing():Boolean {
            return this._busy;
        }

        public function dispose():void {
            if (this._spinning && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            this._spinning = null;
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
