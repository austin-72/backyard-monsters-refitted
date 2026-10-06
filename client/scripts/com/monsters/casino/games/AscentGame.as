package com.monsters.casino.games {
    import com.monsters.casino.BetSelector;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import com.monsters.display.ImageCache;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Balthazar's Ascent (crash): one round for every player at once, run by the server
     * (server/src/services/casino/ascentRounds.ts). Bets are taken for 10 seconds; Balthazar takes off and
     * the multiplier climbs until a Sharpshooter Tower (the yard's own art, its turret following him)
     * shoots him down. Cash out by hand before that (the
     * server's clock decides) or set an automatic cash-out. The game asks for the round about twice a
     * second and draws the flight from the server's clock.
     */
    public class AscentGame extends Sprite {

        /** The scene (from the content area's top left). */
        private static const SX:int = 220;

        private static const SW:int = 480;

        private static const SH:int = 300;

        private static const START_X:Number = 50;

        private static const START_Y:Number = 245;

        private var _win:CasinoWindow;

        private var _bet:BetSelector;

        private var _auto:TextField;

        private var _action:Sprite;

        private var _actionMode:String = "";

        private var _status:TextField;

        private var _mine:TextField;

        private var _scene:Sprite;

        private var _sky:Sprite;

        private var _trail:Shape;

        private var _balthazar:Sprite;

        private var _tower:Sprite;

        private var _mult:TextField;

        private var _sub:TextField;

        private var _history:Sprite;

        private var _players:Sprite;

        private var _playersTitle:TextField;

        private var _fx:Sprite;

        private var _parts:Array = [];

        /** The last state from the server, and the difference between its clock and ours. */
        private var _state:Object = null;

        private var _offset:Number = 0;

        private var _polling:Boolean = false;

        private var _pollT:int = 0;

        private var _sending:Boolean = false;

        private var _shownRound:int = -1;

        private var _crashT:int = 0;

        private var _crashAt:Object = null;

        private var _points:Array = [];

        private var _t:int = 0;

        /** The Sharpshooter's turret: its 30 headings (buildings/isnipertower anim), the one shown. */
        private var _turretSheet:BitmapData;

        private var _turret:Bitmap;

        private var _turretFrame:int = -1;

        /** The tower's art is the yard's at this scale; the turret's head from the tower's foot. */
        private static const TOWER_SCALE:Number = 0.85;

        private static const HEAD_X:Number = -14;

        private static const HEAD_Y:Number = -118;

        public function AscentGame(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoAscent";
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label("BALTHAZAR'S ASCENT", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("BET", 11, CasinoUI.EMBER, true, 190), 12, 68));
            this._bet = new BetSelector(190);
            this._bet.x = 10;
            this._bet.y = 82;
            p.addChild(this._bet);
            p.addChild(CasinoUI.at(CasinoUI.label("AUTO CASH-OUT AT", 11, CasinoUI.EMBER, true, 120), 12, 206));
            // (after the label: at 118 the field covered its "AT")
            this._auto = CasinoUI.input(54, 24, "", 7, "0-9.");
            this._auto.name = "casinoAutoField";
            this._auto.x = 134;
            this._auto.y = 202;
            p.addChild(this._auto);
            p.addChild(CasinoUI.at(CasinoUI.label("x", 12, CasinoUI.GOLD, true, 12), 190, 206));
            p.addChild(CasinoUI.at(CasinoUI.label("(empty: cash out by hand)", 9, CasinoUI.ASH, false, 190), 12, 226));
            this._action = CasinoUI.button("BET", 190, 44, this.onAction, false, 18);
            this._action.x = 10;
            this._action.y = 246;
            p.addChild(this._action);
            this._status = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
            this._status.name = "casinoAscentStatus";
            this._status.x = 10;
            this._status.y = 298;
            p.addChild(this._status);
            this._mine = CasinoUI.label("", 10, 0xE8DCC8, false, 190, TextFormatAlign.CENTER);
            this._mine.x = 10;
            this._mine.y = 318;
            this._mine.multiline = this._mine.wordWrap = true;
            this._mine.height = 40;
            p.addChild(this._mine);
            var note:TextField = CasinoUI.label("By hand, the server's clock decides; an automatic cash-out is settled exactly.", 9, CasinoUI.ASH, false, 190, TextFormatAlign.CENTER);
            note.multiline = note.wordWrap = true;
            note.height = 30;
            note.x = 10;
            note.y = 362;
            p.addChild(note);
            // the scene
            this._scene = this.addChild(new Sprite()) as Sprite;
            this._scene.x = SX;
            this._scene.addChild(CasinoUI.panel(SW, SH, 1));
            this._sky = this._scene.addChild(new Sprite()) as Sprite;
            var skyMask:Shape = this._scene.addChild(new Shape()) as Shape;
            skyMask.graphics.beginFill(0);
            skyMask.graphics.drawRoundRect(3, 3, SW - 6, SH - 6, 12, 12);
            skyMask.graphics.endFill();
            this._sky.mask = skyMask;
            var skyA:Sprite = this._sky.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(skyA, "casino/ascent/sky.jpg", 0, 0, 960, SH);
            var skyB:Sprite = this._sky.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(skyB, "casino/ascent/sky.jpg", 0, 0, 960, SH);
            skyB.scaleX = -1;
            skyB.x = 1920;
            // (the first again past the mirrored one: the scene always has sky behind it, up to the wrap)
            var skyC:Sprite = this._sky.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(skyC, "casino/ascent/sky.jpg", 0, 0, 960, SH);
            skyC.x = 1920;
            this._trail = this._scene.addChild(new Shape()) as Shape;
            this._trail.filters = [new GlowFilter(0xFF6A00, 0.9, 10, 10, 2, 2)];
            this._tower = this._scene.addChild(new Sprite()) as Sprite;
            this._tower.name = "casinoSharpshooter";
            var towerArt:Sprite = this._tower.addChild(new Sprite()) as Sprite;
            towerArt.scaleX = towerArt.scaleY = TOWER_SCALE;
            CasinoUI.picture(towerArt, "buildings/isnipertower/top.1.v2.png", -35, -60);
            this._turret = towerArt.addChild(new Bitmap()) as Bitmap;
            this._turret.x = -56;
            this._turret.y = -141;
            this._turret.smoothing = true;
            ImageCache.GetImageWithCallBack("buildings/isnipertower/anim.1.v2.png", function(k:String, bmd:BitmapData, args:Array = null):void {
                    if (bmd) {
                        _turretSheet = bmd;
                        _turret.bitmapData = new BitmapData(85, 81, true, 0);
                        _turretFrame = -1;
                        aimAt(_balthazar.x, _balthazar.y);
                    }
                });
            this._tower.x = 425;
            this._tower.y = SH - 8;
            this._balthazar = this._scene.addChild(new Sprite()) as Sprite;
            this._balthazar.name = "casinoBalthazar";
            CasinoUI.picture(this._balthazar, CASINO.monsterKey("balthazar"), -34, -34, 68, 68);
            this._balthazar.x = START_X;
            this._balthazar.y = START_Y;
            this._fx = this._scene.addChild(new Sprite()) as Sprite;
            this._mult = CasinoUI.title("", 44, SW);
            this._mult.name = "casinoAscentMultiplier";
            this._mult.y = 40;
            this._scene.addChild(this._mult);
            this._sub = CasinoUI.label("", 13, 0xFFFFFF, true, SW, TextFormatAlign.CENTER);
            this._sub.filters = [new GlowFilter(0, 1, 4, 4, 6, 1)];
            this._sub.y = 100;
            this._scene.addChild(this._sub);
            this._history = this._scene.addChild(new Sprite()) as Sprite;
            this._history.x = 10;
            this._history.y = 10;
            // the players
            var pl:Sprite = this.addChild(CasinoUI.panel(SW, 92)) as Sprite;
            pl.x = SX;
            pl.y = SH + 8;
            this._playersTitle = CasinoUI.label("ON THIS FLIGHT", 11, CasinoUI.EMBER, true, 300);
            this._playersTitle.x = 12;
            this._playersTitle.y = 6;
            pl.addChild(this._playersTitle);
            this._players = pl.addChild(new Sprite()) as Sprite;
            this._players.x = 12;
            this._players.y = 24;
            this.poll();
        }

        private function rules():Object {
            return this._state && this._state.rules ? this._state.rules : {"growth": 0.00006, "min_auto": 1.01};
        }

        /** 2.40x (always two decimals: the readout does not jump about). */
        private static function fx(m:Number):String {
            return m.toFixed(2) + "x";
        }

        private function serverNow():Number {
            return new Date().getTime() + this._offset;
        }

        /** The multiplier `ms` into the flight (as the server works it out). */
        private function multAt(ms:Number):Number {
            return Math.max(1, Math.floor(100 * Math.exp(Number(this.rules().growth) * Math.max(0, ms)) + 0.000000001) / 100);
        }

        private function poll():void {
            if (this._polling) {
                return;
            }
            this._polling = true;
            var sent:Number = new Date().getTime();
            CASINO.ascentState(function(r:Object):void {
                    _polling = false;
                    if (!parent || r.error) {
                        return;
                    }
                    var got:Number = new Date().getTime();
                    _offset = Number(r.server_ts) - (sent + got) / 2;
                    setState(r);
                });
        }

        private function setState(r:Object):void {
            var was:Object = this._state;
            this._state = r;
            if (int(r.round_id) != this._shownRound) {
                // a new round on screen
                this._shownRound = int(r.round_id);
                this._points = [];
                this._trail.graphics.clear();
                this._crashT = 0;
                this._crashAt = null;
                CasinoUI.removeAll(this._fx);
                this._balthazar.visible = true;
                this._balthazar.rotation = 0;
                this._balthazar.alpha = 1;
            }
            if (r.phase == "crashed" && (!was || was.phase != "crashed" || int(was.round_id) != int(r.round_id)) && this._crashT == 0) {
                this.shotDown(Number(r.crash));
            }
            this.showHistory(r.history as Array);
            this.showPlayers(r);
            this.showMine(r);
        }

        private function showHistory(h:Array):void {
            CasinoUI.removeAll(this._history);
            if (!h) {
                return;
            }
            var i:int = 0;
            while (i < Math.min(h.length, 9)) {
                var c:Number = Number(h[i].crash);
                var box:Sprite = CasinoUI.panel(48, 18, 0.85);
                box.x = i * 51;
                var t:TextField = CasinoUI.label(fx(c), 10, c >= 10 ? CasinoUI.WIN : (c >= 2 ? CasinoUI.GOLD : CasinoUI.ASH), true, 48, TextFormatAlign.CENTER);
                t.y = 1;
                box.addChild(t);
                this._history.addChild(box);
                i++;
            }
        }

        private function showPlayers(r:Object):void {
            CasinoUI.removeAll(this._players);
            var list:Array = r.players as Array;
            this._playersTitle.text = "ON THIS FLIGHT (" + int(r.player_count) + ")";
            if (!list) {
                return;
            }
            var i:int = 0;
            while (i < Math.min(list.length, 12)) {
                var pl:Object = list[i];
                var text:String = pl.name + "  " + CasinoUI.number(int(pl.stake)) + (pl.cashed != null ? "  " + fx(Number(pl.cashed)) + " +" + CasinoUI.number(int(pl.payout)) : (pl.lost ? "  lost" : ""));
                var t:TextField = CasinoUI.label(text, 10, pl.cashed != null ? CasinoUI.WIN : (pl.lost ? CasinoUI.LOSS : (pl.me ? CasinoUI.GOLD : 0xE8DCC8)), Boolean(pl.me), 150);
                t.x = (i % 3) * 152;
                t.y = int(i / 3) * 15;
                this._players.addChild(t);
                i++;
            }
        }

        private function showMine(r:Object):void {
            var b:Object = r.my_bet;
            if (!b) {
                this._mine.text = "";
                return;
            }
            if (b.cashed != null) {
                this._mine.text = "Cashed out at " + fx(Number(b.cashed)) + ": +" + CasinoUI.number(int(b.payout)) + " Shiny";
                this._mine.textColor = CasinoUI.WIN;
            }
            else if (b.lost) {
                this._mine.text = "Shot down with your " + CasinoUI.number(int(b.stake)) + " Shiny aboard.";
                this._mine.textColor = CasinoUI.LOSS;
            }
            else {
                this._mine.text = "Your bet: " + CasinoUI.number(int(b.stake)) + (b.auto != null ? ", cashing out at " + fx(Number(b.auto)) : "");
                this._mine.textColor = 0xE8DCC8;
            }
        }

        private function setAction(mode:String, text:String, on:Boolean):void {
            if (mode != this._actionMode || text != this._action["casinoText"]) {
                this._actionMode = mode;
                this._action["casinoText"] = text;
                var t:TextField = this._action.getChildAt(0) as TextField;
                t.text = text;
            }
            CasinoUI.enable(this._action, on && !this._sending);
        }

        private function onAction(e:MouseEvent = null):void {
            var r:Object = this._state;
            if (!r || this._sending) {
                return;
            }
            if (this._actionMode == "bet") {
                var st:Object = CASINO.state;
                if (!st || st.closed || st.shiny_locked) {
                    this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                    return;
                }
                var bet:int = this._bet.value;
                var auto:Number = Number(this._auto.text) || 0;
                if (auto > 0 && auto < Number(this.rules().min_auto)) {
                    this._win.message("An automatic cash-out is " + Number(this.rules().min_auto).toFixed(2) + "x or more.", CasinoUI.LOSS);
                    return;
                }
                if (CASINO.credits() < bet) {
                    this._win.message("You do not have enough Shiny for that bet.", CasinoUI.LOSS);
                    SOUNDS.Play("error1");
                    return;
                }
                this._sending = true;
                CASINO.ascentBet(int(r.round_id), bet, auto, function(res:Object):void {
                        _sending = false;
                        if (!parent) {
                            return;
                        }
                        if (res.error) {
                            _win.message(String(res.error), CasinoUI.LOSS);
                            SOUNDS.Play("error1");
                        }
                        else {
                            SOUNDS.Play("click1");
                            _win.message("On board: " + CasinoUI.number(bet) + " Shiny" + (res.auto ? ", out at " + fx(Number(res.auto)) : "") + ".", CasinoUI.GOLD);
                        }
                        poll();
                    });
            }
            else if (this._actionMode == "cashout") {
                this._sending = true;
                CASINO.ascentCashout(int(r.round_id), function(res:Object):void {
                        _sending = false;
                        if (!parent) {
                            return;
                        }
                        if (res.error) {
                            _win.message(String(res.error), CasinoUI.LOSS);
                        }
                        else if (res.cashed != null) {
                            _win.message("Cashed out at " + fx(Number(res.cashed)) + ": +" + CasinoUI.number(int(res.payout)) + " Shiny", CasinoUI.WIN);
                            SOUNDS.Play("chaching");
                            _win.bigWin(int(res.payout), Math.round(int(res.payout) / Math.max(1, Number(res.cashed))));
                        }
                        else {
                            _win.message("Too late: Balthazar was already shot down.", CasinoUI.LOSS);
                        }
                        poll();
                    });
            }
        }

        public function tick():void {
            this._t++;
            var r:Object = this._state;
            // ask again: twice a second while he flies, about once otherwise
            this._pollT++;
            if (this._pollT >= (r && r.phase == "flying" ? 18 : 36)) {
                this._pollT = 0;
                this.poll();
            }
            if (!r) {
                this._status.text = "Finding the flight...";
                this.setAction("", "WAIT", false);
                return;
            }
            var now:Number = this.serverNow();
            var phase:String = String(r.phase);
            var mine:Object = r.my_bet;
            var m:Number = 1;
            if (phase == "betting" || phase == "waiting") {
                var opens:Number = Number(r.betting_opens_at);
                var left:Number = Math.max(0, Number(r.starts_at) - now);
                if (phase == "waiting" || now < opens) {
                    this._status.text = "Next flight soon...";
                    this.setAction("", "WAIT", false);
                }
                else {
                    this._status.text = "TAKING OFF IN " + Math.ceil(left / 1000) + "s";
                    if (mine) {
                        this.setAction("", "ON BOARD", false);
                    }
                    else {
                        this.setAction("bet", "BET", left > 300);
                    }
                }
                this._mult.text = "1.00x";
                this._mult.textColor = 0xFFFFFF;
                this._sub.text = left > 0 ? "Bets close in " + (left / 1000).toFixed(1) + "s" : "";
                this._balthazar.x = START_X;
                this._balthazar.y = START_Y + Math.sin(this._t / 6) * 2;
                this.aimAt(this._balthazar.x, this._balthazar.y);
                if (left <= 0 && now >= opens) {
                    // take-off: the server says so on the next answer
                    this.poll();
                }
            }
            else if (phase == "flying") {
                var ms:Number = Math.max(0, now - Number(r.starts_at));
                m = this.multAt(ms);
                this._mult.text = fx(m);
                this._mult.textColor = m >= 10 ? 0x9CFF6A : (m >= 2 ? 0xFFD58A : 0xFFFFFF);
                this._status.text = "FLYING";
                if (mine && mine.cashed == null && !mine.lost) {
                    var pay:String = CasinoUI.shiny(int(mine.stake) * m);
                    this._sub.text = "Cash out now: " + pay + " Shiny";
                    this.setAction("cashout", "CASH OUT " + pay, true);
                }
                else {
                    this._sub.text = "";
                    this.setAction("", mine ? "CASHED OUT" : "NEXT FLIGHT", false);
                }
                this.fly(ms, m);
            }
            else if (phase == "crashed") {
                this._mult.text = fx(Number(r.crash));
                this._mult.textColor = CasinoUI.LOSS;
                this._sub.text = "SHOT DOWN";
                this._status.text = "SHOT DOWN AT " + fx(Number(r.crash));
                this.setAction("", "NEXT FLIGHT", false);
            }
            this.animate();
        }

        /** Balthazar's place `ms` into the flight: up and to the right, slower as he goes. */
        private function fly(ms:Number, m:Number):void {
            var x:Number = START_X + 300 * (1 - Math.exp(-ms / 14000));
            var y:Number = START_Y - 190 * (1 - Math.pow(m, -0.8));
            this._balthazar.x = x;
            this._balthazar.y = y + Math.sin(this._t / 3) * 3;
            this._balthazar.rotation = -8 + Math.sin(this._t / 5) * 4;
            var last:Object = this._points.length ? this._points[this._points.length - 1] : null;
            if (!last || Math.abs(last.x - x) + Math.abs(last.y - y) > 3) {
                this._points.push({"x": x, "y": y});
                this._trail.graphics.clear();
                this._trail.graphics.lineStyle(4, 0xFFB040, 0.9);
                this._trail.graphics.moveTo(START_X, START_Y);
                for each (var p:Object in this._points) {
                    this._trail.graphics.lineTo(p.x, p.y);
                }
            }
            this.aimAt(x, y);
            // the sky goes by faster as he climbs
            this._sky.x -= Math.min(6, 0.6 + m * 0.35);
            if (this._sky.x <= -1920) {
                this._sky.x += 1920;
            }
        }

        /** The turret turned toward a point of the scene (30 headings: right 26, up 18, left 10, down 3). */
        private function aimAt(x:Number, y:Number):void {
            if (!this._turretSheet || !this._turret.bitmapData) {
                return;
            }
            var hx:Number = this._tower.x + HEAD_X * TOWER_SCALE;
            var hy:Number = this._tower.y + HEAD_Y * TOWER_SCALE;
            var deg:Number = Math.atan2(hy - y, x - hx) * 180 / Math.PI;
            if (deg < 0) {
                deg += 360;
            }
            var f:Number = deg <= 180 ? 26 - deg / 180 * 16 : 10 - (deg - 180) / 180 * 14;
            var frame:int = ((Math.round(f) % 30) + 30) % 30;
            if (frame != this._turretFrame) {
                this._turretFrame = frame;
                this._turret.bitmapData.fillRect(this._turret.bitmapData.rect, 0);
                this._turret.bitmapData.copyPixels(this._turretSheet, new Rectangle(frame * 85, 0, 85, 81), new Point(0, 0));
            }
        }

        /** The muzzle: the turret's head, a little toward where it points. */
        private function muzzle(x:Number, y:Number):Object {
            var hx:Number = this._tower.x + HEAD_X * TOWER_SCALE;
            var hy:Number = this._tower.y + HEAD_Y * TOWER_SCALE;
            var d:Number = Math.max(1, Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy)));
            return {"x": hx + (x - hx) / d * 26, "y": hy + (y - hy) / d * 26};
        }

        /** The tower fires, a burst, he falls. */
        private function shotDown(crash:Number):void {
            this._crashT = 1;
            this._crashAt = {"x": this._balthazar.x, "y": this._balthazar.y};
            this.aimAt(this._crashAt.x, this._crashAt.y);
            SOUNDS.Play("isniper");
        }

        private function animate():void {
            if (this._crashT > 0 && this._crashT < 200) {
                this._crashT++;
                var k:int = this._crashT;
                var mz:Object = this.muzzle(this._crashAt.x, this._crashAt.y);
                var tx:Number = mz.x, ty:Number = mz.y;
                if (k < 12) {
                    // the Sharpshooter's round: a flash at the muzzle, a tracer straight to him
                    CasinoUI.removeAll(this._fx);
                    var u:Number = Math.min(1, k / 4);
                    var shot:Shape = this._fx.addChild(new Shape()) as Shape;
                    if (k <= 3) {
                        shot.graphics.beginFill(0xFFF0C0, 1);
                        shot.graphics.drawCircle(tx, ty, 9 - k * 2);
                        shot.graphics.endFill();
                    }
                    shot.graphics.lineStyle(3 - Math.min(2, k / 5), 0xFFE8A0, Math.max(0.15, 1 - k / 12));
                    shot.graphics.moveTo(tx + (this._crashAt.x - tx) * Math.max(0, u - 0.6), ty + (this._crashAt.y - ty) * Math.max(0, u - 0.6));
                    shot.graphics.lineTo(tx + (this._crashAt.x - tx) * u, ty + (this._crashAt.y - ty) * u);
                    shot.filters = [new GlowFilter(0xFF8A20, 1, 10, 10, 3, 2)];
                    if (k == 5) {
                        // (he is hit as the tracer reaches him: the burst starts at once)
                        k = this._crashT = 12;
                    }
                }
                if (k == 12) {
                    CasinoUI.removeAll(this._fx);
                    var n:int = 0;
                    while (n < 30) {
                        var d:Shape = this._fx.addChild(new Shape()) as Shape;
                        d.graphics.beginFill([0xFF6A1A, 0xFFB040, 0xFFE08A, 0x5A4A44][n % 4], 1);
                        d.graphics.drawCircle(0, 0, 2 + Math.random() * 4);
                        d.graphics.endFill();
                        d.x = this._crashAt.x;
                        d.y = this._crashAt.y;
                        var a:Number = Math.random() * Math.PI * 2;
                        var v:Number = 2 + Math.random() * 5;
                        this._parts.push({"s": d, "vx": Math.cos(a) * v, "vy": Math.sin(a) * v, "life": 34, "max": 34});
                        n++;
                    }
                    SOUNDS.Play("chaching");
                }
                else {
                    // he spirals down
                    this._balthazar.rotation += 14;
                    this._balthazar.y = Math.min(SH + 60, this._balthazar.y + (k - 12) * 0.35);
                    this._balthazar.alpha = Math.max(0.2, this._balthazar.alpha - 0.01);
                    if (k % 3 == 0 && this._balthazar.y < SH) {
                        var smoke:Shape = this._fx.addChild(new Shape()) as Shape;
                        smoke.graphics.beginFill(0x3A3432, 0.6);
                        smoke.graphics.drawCircle(0, 0, 5 + Math.random() * 4);
                        smoke.graphics.endFill();
                        smoke.x = this._balthazar.x;
                        smoke.y = this._balthazar.y;
                        this._parts.push({"s": smoke, "vx": 0, "vy": -0.4, "life": 40, "max": 40, "grow": 0.03});
                    }
                }
            }
            var i:int = this._parts.length - 1;
            while (i >= 0) {
                var p:Object = this._parts[i];
                p.life--;
                p.s.x += p.vx;
                p.s.y += p.vy;
                if (p.grow) {
                    p.s.scaleX = p.s.scaleY = p.s.scaleX + p.grow;
                }
                else {
                    p.vy += 0.15;
                }
                p.s.alpha = Math.max(0, p.life / p.max);
                if (p.life <= 0) {
                    if (p.s.parent) {
                        p.s.parent.removeChild(p.s);
                    }
                    this._parts.splice(i, 1);
                }
                i--;
            }
        }

        public function get showing():Boolean {
            return false;
        }

        public function dispose():void {
            this._state = null;
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
