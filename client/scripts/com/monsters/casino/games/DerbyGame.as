package com.monsters.casino.games {
    import com.monsters.casino.BetSelector;
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
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
     * Magma Derby: a race every few minutes for every player, run by the server
     * (server/src/services/casino/derbyRounds.ts). Six monsters with odds; bet on one or more to win while
     * bets are open; the race is sent when it starts (the order and every runner's checkpoint times) and
     * drawn here from them. Everyone's bets on the race are shown while bets are open: the biggest
     * bettors over the track, what is on each runner on the board.
     */
    public class DerbyGame extends Sprite {

        private static const SX:int = 220;

        private static const SW:int = 480;

        private static const TH:int = 226;

        /** The track, in its own pixels: the start at 0, the finish at TRACK. */
        private static const TRACK:Number = 2200;

        private static const LANE_Y:int = 74;

        private static const LANE_H:int = 26;

        private var _win:CasinoWindow;

        private var _chip:BetSelector;

        private var _total:TextField;

        private var _place:Sprite;

        private var _clear:Sprite;

        private var _status:TextField;

        private var _mine:TextField;

        /** The race whose win was last celebrated. */
        private var _celebrated:int = -1;

        private var _track:Sprite;

        private var _ground:Sprite;

        private var _finish:Sprite;

        private var _gate:Shape;

        private var _runnersLayer:Sprite;

        private var _runners:Object = {};

        private var _board:Sprite;

        private var _rows:Object = {};

        private var _podium:Sprite;

        /** Who is betting on this race (over the track while bets are open). */
        private var _bettors:Sprite;

        private var _clock:TextField;

        private var _state:Object = null;

        private var _offset:Number = 0;

        private var _polling:Boolean = false;

        private var _pollT:int = 0;

        private var _sending:Boolean = false;

        private var _slip:Object = {};

        private var _shownRound:int = -1;

        private var _shownPhase:String = "";

        private var _t:int = 0;

        public function DerbyGame(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoDerby";
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label("MAGMA DERBY", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("CHIP (click a monster to bet it)", 10, CasinoUI.EMBER, true, 190), 12, 68));
            this._chip = new BetSelector(190);
            this._chip.x = 10;
            this._chip.y = 82;
            this._chip.setValue(10);
            p.addChild(this._chip);
            p.addChild(CasinoUI.at(CasinoUI.label("ON YOUR SLIP", 11, CasinoUI.EMBER, true, 190), 12, 206));
            this._total = CasinoUI.label("0 Shiny", 14, CasinoUI.GOLD, true, 190);
            this._total.x = 12;
            this._total.y = 220;
            p.addChild(this._total);
            this._place = CasinoUI.button("PLACE BET", 190, 38, this.onPlace, false, 17);
            this._place.x = 10;
            this._place.y = 244;
            p.addChild(this._place);
            this._clear = CasinoUI.button("CLEAR", 92, 24, this.onClear, false, 11);
            this._clear.x = 10;
            this._clear.y = 288;
            p.addChild(this._clear);
            this._status = CasinoUI.label("", 12, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER);
            this._status.name = "casinoDerbyStatus";
            this._status.x = 10;
            this._status.y = 318;
            p.addChild(this._status);
            this._mine = CasinoUI.label("", 10, 0xE8DCC8, false, 190, TextFormatAlign.CENTER);
            this._mine.name = "casinoDerbyMine";
            this._mine.multiline = this._mine.wordWrap = true;
            this._mine.height = 58;
            this._mine.x = 10;
            this._mine.y = 338;
            p.addChild(this._mine);
            // the track
            this._track = this.addChild(new Sprite()) as Sprite;
            this._track.x = SX;
            this._track.addChild(CasinoUI.panel(SW, TH, 1));
            var mask:Shape = this._track.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(3, 3, SW - 6, TH - 6, 12, 12);
            mask.graphics.endFill();
            this._ground = this._track.addChild(new Sprite()) as Sprite;
            this._ground.mask = mask;
            var k:int = 0;
            while (k < 4) {
                var bg:Sprite = this._ground.addChild(new Sprite()) as Sprite;
                CasinoUI.picture(bg, "casino/derby/track.jpg", 0, 0, 960, TH);
                if (k % 2 == 1) {
                    bg.scaleX = -1;
                    bg.x = (k + 1) * 960;
                }
                else {
                    bg.x = k * 960;
                }
                k++;
            }
            var lanes:Shape = this._ground.addChild(new Shape()) as Shape;
            k = 0;
            while (k <= 6) {
                lanes.graphics.lineStyle(1, 0xFFD58A, 0.35);
                lanes.graphics.moveTo(0, LANE_Y + k * LANE_H - LANE_H / 2);
                lanes.graphics.lineTo(TRACK + 400, LANE_Y + k * LANE_H - LANE_H / 2);
                k++;
            }
            // the finish line across the lanes
            k = 0;
            while (k < 12) {
                lanes.graphics.lineStyle(0, 0, 0);
                lanes.graphics.beginFill(k % 2 ? 0x1A1210 : 0xE8DCC8, 0.9);
                lanes.graphics.drawRect(40 + TRACK - 4, LANE_Y - LANE_H / 2 + k * LANE_H / 2, 8, LANE_H / 2);
                lanes.graphics.endFill();
                k++;
            }
            this._gate = this._ground.addChild(new Shape()) as Shape;
            this._gate.graphics.lineStyle(4, 0xE8DCC8, 1);
            this._gate.graphics.moveTo(40, LANE_Y - 20);
            this._gate.graphics.lineTo(40, LANE_Y + 6 * LANE_H - 10);
            this._finish = this._ground.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(this._finish, "casino/derby/finish.png", -30, LANE_Y - 60, 60, 6 * LANE_H + 52);
            this._finish.x = 40 + TRACK;
            this._runnersLayer = this._ground.addChild(new Sprite()) as Sprite;
            this._clock = CasinoUI.title("", 22, SW);
            this._clock.y = 6;
            this._track.addChild(this._clock);
            this._podium = this._track.addChild(new Sprite()) as Sprite;
            this._podium.mouseEnabled = this._podium.mouseChildren = false;
            this._bettors = this._track.addChild(new Sprite()) as Sprite;
            this._bettors.name = "casinoDerbyBettors";
            this._bettors.mouseEnabled = this._bettors.mouseChildren = false;
            this._bettors.x = SW - 232;
            this._bettors.y = 38;
            // the odds board
            this._board = this.addChild(new Sprite()) as Sprite;
            this._board.x = SX;
            this._board.y = TH + 6;
            this._board.addChild(CasinoUI.panel(SW, 400 - TH - 6, 1));
            this.poll();
        }

        private function serverNow():Number {
            return new Date().getTime() + this._offset;
        }

        private function poll():void {
            if (this._polling) {
                return;
            }
            this._polling = true;
            var sent:Number = new Date().getTime();
            CASINO.derbyState(function(r:Object):void {
                    _polling = false;
                    if (!parent || r.error) {
                        return;
                    }
                    _offset = Number(r.server_ts) - (sent + new Date().getTime()) / 2;
                    setState(r);
                });
        }

        private function setState(r:Object):void {
            this._state = r;
            if (int(r.round_id) != this._shownRound) {
                this._shownRound = int(r.round_id);
                this._slip = {};
                this.buildRace(r);
            }
            if (String(r.phase) != this._shownPhase) {
                this._shownPhase = String(r.phase);
                if (r.phase == "results") {
                    this.showPodium(r);
                }
                else {
                    CasinoUI.removeAll(this._podium);
                }
                this.buildBoard(r);
            }
            this.showMine(r);
            this.showBettors(r);
            this.refresh();
        }

        /** The race's bettors, biggest first (a line per player and runner), and how many are in. */
        private function showBettors(r:Object):void {
            CasinoUI.removeAll(this._bettors);
            this._bettors.graphics.clear();
            var list:Array = r.bettors as Array;
            if (r.phase != "betting" || !list) {
                return;
            }
            var rows:int = Math.min(list.length, 10);
            this._bettors.graphics.lineStyle(1, 0x9A3A14, 0.9);
            this._bettors.graphics.beginFill(0x0C0706, 0.72);
            this._bettors.graphics.drawRoundRect(0, 0, 224, 24 + Math.max(1, rows) * 15 + 4, 10, 10);
            this._bettors.graphics.endFill();
            var players:int = int(r.players);
            this._bettors.addChild(CasinoUI.at(CasinoUI.label(players == 0 ? "NO BETS YET - BE THE FIRST" : (players == 1 ? "1 PLAYER" : players + " PLAYERS") + " - " + CasinoUI.number(int(r.pot)) + " SHINY IN", 10, CasinoUI.GOLD, true, 216, TextFormatAlign.CENTER), 4, 5));
            var i:int = 0;
            while (i < rows) {
                var b:Object = list[i];
                var y:int = 24 + i * 15;
                CasinoUI.picture(this._bettors, CASINO.monsterKey(String(b.on)), 8, y, 13, 13);
                this._bettors.addChild(CasinoUI.at(CasinoUI.label(String(b.name), 10, b.me ? CasinoUI.GOLD : 0xE8DCC8, Boolean(b.me), 130), 24, y - 2));
                this._bettors.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.number(int(b.amount)), 10, CasinoUI.WIN, true, 64, TextFormatAlign.RIGHT), 152, y - 2));
                i++;
            }
        }

        /** The runners at the gate, the board for this race. */
        private function buildRace(r:Object):void {
            CasinoUI.removeAll(this._runnersLayer);
            this._runners = {};
            var list:Array = r.runners as Array;
            if (!list) {
                return;
            }
            var i:int = 0;
            while (i < list.length) {
                var id:String = list[i].id;
                var s:Sprite = this._runnersLayer.addChild(new Sprite()) as Sprite;
                s.name = "casinoRunner:" + id;
                var body:Sprite = s.addChild(new Sprite()) as Sprite;
                CasinoUI.picture(body, CASINO.monsterKey(id), -19, -30, 38, 38);
                s.x = 40;
                s.y = LANE_Y + i * LANE_H;
                this._runners[id] = {"s": s, "body": body, "lane": i, "phase": Math.random() * 6};
                i++;
            }
            this._ground.x = 0;
            this.buildBoard(r);
        }

        private function buildBoard(r:Object):void {
            while (this._board.numChildren > 1) {
                this._board.removeChildAt(1);
            }
            this._rows = {};
            var list:Array = r.runners as Array;
            if (!list) {
                return;
            }
            var order:Array = r.phase == "results" ? r.order as Array : null;
            var i:int = 0;
            while (i < list.length) {
                var ru:Object = list[i];
                var row:MovieClip = new MovieClip();
                row.name = "casinoOdds:" + ru.id;
                row.x = 6 + (i % 2) * 236;
                row.y = 6 + int(i / 2) * 52;
                var place:int = order ? order.indexOf(ru.id) + 1 : 0;
                var m:Matrix = new Matrix();
                m.createGradientBox(230, 48, Math.PI / 2, 0, 0);
                row.graphics.lineStyle(1.5, place == 1 ? 0xFFD040 : 0x9A3A14, 1);
                row.graphics.beginGradientFill(GradientType.LINEAR, place == 1 ? [0x6A4A10, 0x2A1A08] : [0x2A1E1A, 0x140E0C], [1, 1], [0, 255], m);
                row.graphics.drawRoundRect(0, 0, 230, 48, 10, 10);
                row.graphics.endFill();
                CasinoUI.picture(row, CASINO.monsterKey(ru.id), 2, 2, 44, 44);
                row.addChild(CasinoUI.at(CasinoUI.label(String(CASINO.MONSTER_NAMES[ru.id] || ru.id), 12, 0xFFFFFF, true, 110), 50, 4));
                var pips:Shape = row.addChild(new Shape()) as Shape;
                var k:int = 0;
                while (k < 6) {
                    pips.graphics.beginFill(k < Math.round(Number(ru.strength)) ? 0xFF8A2A : 0x3A2E2A, 1);
                    pips.graphics.drawRect(50 + k * 9, 26, 7, 7);
                    pips.graphics.endFill();
                    k++;
                }
                var odds:TextField = CasinoUI.label(Number(ru.odds).toFixed(2), 16, CasinoUI.GOLD, true, 70, TextFormatAlign.RIGHT, "Groboldov");
                odds.x = 152;
                odds.y = 4;
                row.addChild(odds);
                var note:TextField = CasinoUI.label(place > 0 ? (place == 1 ? "WINNER" : "#" + place) : "odds", 9, place == 1 ? 0xFFD040 : CasinoUI.ASH, true, 70, TextFormatAlign.RIGHT);
                note.x = 152;
                note.y = 30;
                row.addChild(note);
                var stack:Sprite = row.addChild(new Sprite()) as Sprite;
                stack.x = 126;
                stack.y = 30;
                row.mouseChildren = false;
                row.addEventListener(MouseEvent.CLICK, this.rowClick(String(ru.id)));
                this._board.addChild(row);
                this._rows[ru.id] = {"s": row, "stack": stack, "note": note, "place": place};
                i++;
            }
            this.refresh();
        }

        private function rowClick(id:String):Function {
            return function(e:MouseEvent):void {
                addChip(id);
            };
        }

        private function betting():Boolean {
            var r:Object = this._state;
            return r != null && r.phase == "betting" && this.serverNow() < Number(r.starts_at) - 500;
        }

        private function addChip(id:String):void {
            if (!this.betting() || this._sending) {
                return;
            }
            var chip:int = this._chip.value;
            if (CASINO.credits() < this.slipTotal() + chip) {
                this._win.message("You do not have enough Shiny for that.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            SOUNDS.Play("click1");
            this._slip[id] = int(this._slip[id] || 0) + chip;
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

        private function refresh():void {
            var k:String = null;
            for (k in this._rows) {
                var stack:Sprite = this._rows[k].stack;
                CasinoUI.removeAll(stack);
                var amount:int = int(this._slip[k] || 0) + this.placed(k);
                this._rows[k].s.buttonMode = this.betting();
                // what everyone has on it
                var all:int = this._state && this._state.totals ? int(this._state.totals[k] || 0) : 0;
                if (this._rows[k].place == 0) {
                    this._rows[k].note.text = all > 0 ? CasinoUI.number(all) + " bet" : "odds";
                    this._rows[k].note.textColor = all > 0 ? CasinoUI.WIN : CasinoUI.ASH;
                }
                if (amount > 0) {
                    var c:Shape = stack.addChild(new Shape()) as Shape;
                    c.graphics.lineStyle(2, 0xF4ECDC, 1);
                    c.graphics.beginFill(int(this._slip[k] || 0) > 0 ? 0xD8B040 : 0x3A9A4A, 1);
                    c.graphics.drawCircle(0, 0, 11);
                    c.graphics.endFill();
                    var t:TextField = CasinoUI.label(amount >= 10000 ? int(amount / 1000) + "k" : String(amount), amount >= 1000 ? 7 : 9, 0x201410, true, 30, TextFormatAlign.CENTER);
                    t.x = -15;
                    t.y = -7;
                    stack.addChild(t);
                }
            }
            var total:int = this.slipTotal();
            this._total.text = CasinoUI.number(total) + " Shiny";
            CasinoUI.enable(this._place, total > 0 && this.betting() && !this._sending);
            CasinoUI.enable(this._clear, total > 0 && !this._sending);
        }

        /** What the player has on a runner already (placed slips). */
        private function placed(id:String):int {
            var n:int = 0;
            var r:Object = this._state;
            if (!r || !r.my_bets) {
                return 0;
            }
            for each (var b:Object in r.my_bets) {
                for each (var x:Object in b.bets) {
                    if (x.on == id) {
                        n += int(x.amount);
                    }
                }
            }
            return n;
        }

        private function onClear(e:MouseEvent = null):void {
            this._slip = {};
            this.refresh();
        }

        private function onPlace(e:MouseEvent = null):void {
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                return;
            }
            var r:Object = this._state;
            var total:int = this.slipTotal();
            if (!this.betting() || total <= 0 || this._sending) {
                return;
            }
            var bets:Array = [];
            var k:String = null;
            for (k in this._slip) {
                bets.push({"on": k, "amount": int(this._slip[k])});
            }
            this._sending = true;
            this.refresh();
            CASINO.derbyBet(int(r.round_id), bets, function(res:Object):void {
                    _sending = false;
                    if (!parent) {
                        return;
                    }
                    if (res.error) {
                        _win.message(String(res.error), CasinoUI.LOSS);
                        SOUNDS.Play("error1");
                    }
                    else {
                        _slip = {};
                        SOUNDS.Play("purchasepopup");
                        _win.message("Bet placed: " + CasinoUI.number(total) + " Shiny. Good luck!", CasinoUI.GOLD);
                    }
                    poll();
                });
        }

        private function showMine(r:Object):void {
            var list:Array = r.my_bets as Array;
            if (!list || !list.length) {
                this._mine.text = r.phase == "betting" ? "Pick monsters on the board, then place the bet." : "";
                this._mine.textColor = 0xE8DCC8;
                return;
            }
            var parts:Array = [];
            var paid:int = 0;
            var staked:int = 0;
            var settled:Boolean = true;
            var odds:Object = {};
            for each (var ru:Object in r.runners) {
                odds[ru.id] = ru.odds;
            }
            for each (var b:Object in list) {
                staked += int(b.stake);
                paid += int(b.payout);
                if (b.status != "settled") {
                    settled = false;
                }
                for each (var x:Object in b.bets) {
                    parts.push(String(CASINO.MONSTER_NAMES[x.on] || x.on) + " " + x.amount + " @ " + Number(odds[x.on]).toFixed(2));
                }
            }
            if (settled && r.phase == "results") {
                this._mine.text = paid > 0 ? "You won " + CasinoUI.number(paid) + " Shiny!" : "No luck this race (" + CasinoUI.number(staked) + " Shiny).";
                if (paid > 0 && this._celebrated != int(r.round_id)) {
                    this._celebrated = int(r.round_id);
                    this._win.bigWin(paid, staked);
                }
                this._mine.textColor = paid > 0 ? CasinoUI.WIN : CasinoUI.LOSS;
            }
            else {
                this._mine.text = "Your bets: " + parts.join(", ");
                this._mine.textColor = 0xE8DCC8;
            }
        }

        private function showPodium(r:Object):void {
            CasinoUI.removeAll(this._podium);
            var order:Array = r.order as Array;
            if (!order) {
                return;
            }
            var bg:Shape = this._podium.addChild(new Shape()) as Shape;
            bg.graphics.beginFill(0x0C0706, 0.72);
            bg.graphics.drawRoundRect(90, 40, 300, 170, 18, 18);
            bg.graphics.endFill();
            var spots:Array = [[240, 150, 58, 0xFFD040, "1"], [165, 165, 44, 0xC8C8D0, "2"], [315, 175, 34, 0xC8804A, "3"]];
            var i:int = 0;
            while (i < 3 && i < order.length) {
                var sp:Array = spots[i];
                var block:Shape = this._podium.addChild(new Shape()) as Shape;
                block.graphics.beginFill(sp[3], 1);
                block.graphics.drawRect(sp[0] - 36, sp[1], 72, 200 - sp[1]);
                block.graphics.endFill();
                this._podium.addChild(CasinoUI.at(CasinoUI.title(sp[4], 18, 72), sp[0] - 36, sp[1] + 2));
                var who:Sprite = this._podium.addChild(new Sprite()) as Sprite;
                CasinoUI.picture(who, CASINO.monsterKey(order[i]), sp[0] - sp[2] / 2, sp[1] - sp[2] + 4, sp[2], sp[2]);
                if (i == 0) {
                    who.filters = [new GlowFilter(0xFFD040, 1, 16, 16, 2, 2)];
                }
                i++;
            }
            this._podium.addChild(CasinoUI.at(CasinoUI.title(String(CASINO.MONSTER_NAMES[order[0]] || order[0]).toUpperCase() + " WINS!", 20, 300), 90, 44));
        }

        /** Where a runner is on the track `ms` into the race: along its checkpoints, a little past the finish. */
        private function progress(id:String, ms:Number):Object {
            var sp:Object = this._state.splits ? this._state.splits[id] : null;
            if (!sp || ms <= 0) {
                return {"f": 0, "stumble": false};
            }
            var times:Array = sp.times as Array;
            var n:int = times.length;
            var prevT:Number = 0;
            var k:int = 0;
            while (k < n) {
                if (ms < times[k]) {
                    var u:Number = (ms - prevT) / (times[k] - prevT);
                    return {"f": (k + u) / n, "stumble": k == int(sp.stumble)};
                }
                prevT = times[k];
                k++;
            }
            // past the finish: slowing to a stop
            return {"f": 1 + Math.min(0.08, (ms - times[n - 1]) / 40000), "stumble": false};
        }

        public function tick():void {
            this._t++;
            var r:Object = this._state;
            this._pollT++;
            var near:Boolean = r && (r.phase == "racing" || Math.abs(Number(r.starts_at) - this.serverNow()) < 3000 || Math.abs(Number(r.ends_at) - this.serverNow()) < 3000);
            if (this._pollT >= (near ? 40 : 80)) {
                this._pollT = 0;
                this.poll();
            }
            if (!r) {
                this._status.text = "Finding the race...";
                return;
            }
            var now:Number = this.serverNow();
            var phase:String = String(r.phase);
            if (phase == "betting" || phase == "waiting") {
                var left:Number = Math.max(0, Number(r.starts_at) - now);
                var sec:int = Math.ceil(left / 1000);
                var clock:String = int(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
                this._status.text = phase == "waiting" || now < Number(r.betting_opens_at) ? "Next race soon..." : "RACE IN " + clock;
                this._clock.text = phase == "betting" ? "BETS CLOSE IN " + clock : "";
                if (left <= 0) {
                    this.poll();
                }
                for (var id:String in this._runners) {
                    var o:Object = this._runners[id];
                    o.s.x = 40;
                    o.body.y = Math.sin((this._t + o.phase * 10) / 8) * 1.5;
                }
                this._ground.x = 0;
            }
            else if (phase == "racing" || phase == "results") {
                var ms:Number = phase == "results" ? 99999 : now - Number(r.starts_at);
                var lead:Number = 0;
                for (id in this._runners) {
                    o = this._runners[id];
                    var pr:Object = this.progress(id, ms);
                    o.s.x = 40 + pr.f * TRACK;
                    lead = Math.max(lead, o.s.x);
                    var running:Boolean = pr.f > 0 && pr.f < 1;
                    o.body.y = running ? -Math.abs(Math.sin((this._t + o.phase * 10) / 3)) * 5 : 0;
                    o.body.rotation = pr.stumble ? Math.sin(this._t / 2) * 20 : (running ? Math.sin((this._t + o.phase) / 3) * 4 : 0);
                }
                // the view follows the leader
                this._ground.x = -Math.max(0, Math.min(TRACK + 80 - SW, lead - 330));
                this._status.text = phase == "racing" ? "RACING!" : "WINNER: " + String(CASINO.MONSTER_NAMES[r.order[0]] || r.order[0]).toUpperCase();
                this._clock.text = phase == "racing" ? ((ms / 1000) >= 0 ? (ms / 1000).toFixed(1) + "s" : "") : "";
            }
            if (this._t % 20 == 0) {
                this.refresh();
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
