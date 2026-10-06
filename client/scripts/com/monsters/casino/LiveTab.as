package com.monsters.casino {
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.filters.GlowFilter;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the Brimstone Pit's Live tab. Every player's latest bets as they are made (the admins'
     * are not shown: the server leaves them out), the day's biggest wins and the last jackpots, asked of the
     * server (casino/live) every two seconds while the tab is open. Kept by the window like a game (tick,
     * dispose).
     */
    public class LiveTab extends Sprite {

        private static const ROWS:int = 17;

        private var _win:CasinoWindow;

        private var _list:Sprite;

        private var _side:Sprite;

        private var _status:TextField;

        private var _t:int = 0;

        private var _asking:Boolean = false;

        /** The newest bet id shown, and the rows that came in since (they glow a moment). */
        private var _lastId:Number = -1;

        private var _fresh:Array = [];

        public function LiveTab(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoLive";
            var p:Sprite = this.addChild(CasinoUI.panel(440, CasinoWindow.CH - 10)) as Sprite;
            p.addChild(CasinoUI.at(CasinoUI.label("LIVE BETS", 13, CasinoUI.GOLD, true, 200), 14, 10));
            var dot:Shape = p.addChild(new Shape()) as Shape;
            dot.graphics.beginFill(0xFF3A2A, 1);
            dot.graphics.drawCircle(0, 0, 4);
            dot.graphics.endFill();
            dot.x = 98;
            dot.y = 20;
            dot.filters = [new GlowFilter(0xFF3A2A, 1, 8, 8, 2, 2)];
            dot.name = "casinoLiveDot";
            this._status = CasinoUI.label("Watching the tables...", 10, CasinoUI.ASH, false, 300, TextFormatAlign.RIGHT);
            this._status.x = 126;
            this._status.y = 12;
            p.addChild(this._status);
            var cols:Array = [["Player", 14, 120, TextFormatAlign.LEFT], ["Game", 138, 104, TextFormatAlign.LEFT], ["Bet", 242, 66, TextFormatAlign.RIGHT], ["x", 310, 50, TextFormatAlign.RIGHT], ["Paid", 362, 64, TextFormatAlign.RIGHT]];
            for each (var c:Array in cols) {
                p.addChild(CasinoUI.at(CasinoUI.label(c[0], 10, CasinoUI.EMBER, true, c[2], c[3]), c[1], 32));
            }
            this._list = p.addChild(new Sprite()) as Sprite;
            this._list.y = 50;
            var side:Sprite = this.addChild(CasinoUI.panel(250, CasinoWindow.CH - 10)) as Sprite;
            side.x = 450;
            this._side = side.addChild(new Sprite()) as Sprite;
            this.ask();
        }

        public static function gameName(id:String):String {
            var names:Object = {"magmadrop": "Magma Drop", "scratch": "Scratchers", "roulette": "Roulette", "bonepile": "Bone Pile", "slots": "Magma Slots", "ascent": "Ascent", "derby": "Derby", "fortune": "Korath's Fortune", "favor": "Moloch's Favor"};
            return names[id] || id;
        }

        private function ask():void {
            if (this._asking) {
                return;
            }
            this._asking = true;
            CASINO.live(function(r:Object):void {
                    _asking = false;
                    if (!parent) {
                        return;
                    }
                    if (r.error) {
                        _status.text = String(r.error);
                        return;
                    }
                    show(r);
                });
        }

        private function show(r:Object):void {
            var bets:Array = r.bets as Array || [];
            this._status.text = bets.length ? "" : "No bets yet. Be the first!";
            CasinoUI.removeAll(this._list);
            var newest:Number = bets.length ? Number(bets[0].id) : this._lastId;
            var first:Boolean = this._lastId < 0;
            this._fresh = [];
            var i:int = 0;
            while (i < Math.min(bets.length, ROWS)) {
                var b:Object = bets[i];
                var row:Sprite = this._list.addChild(new Sprite()) as Sprite;
                row.name = "casinoLiveRow:" + b.id;
                row.y = i * 20;
                if (i % 2 == 0) {
                    row.graphics.beginFill(0xFFFFFF, 0.04);
                    row.graphics.drawRect(8, -1, 424, 19);
                    row.graphics.endFill();
                }
                var free:Boolean = b.free_bet != null && int(b.stake) == 0;
                var won:Boolean = !b.open && int(b.payout) > int(b.stake);
                var color:uint = b.jackpot ? 0xD090FF : (won ? CasinoUI.WIN : (b.open ? CasinoUI.GOLD : CasinoUI.ASH));
                var vals:Array = [
                    [String(b.name), 14, 120, TextFormatAlign.LEFT, b.me ? CasinoUI.GOLD : 0xE8DCC8],
                    [gameName(String(b.game)), 138, 104, TextFormatAlign.LEFT, 0xE8DCC8],
                    [free ? "FREE" : CasinoUI.number(int(b.stake)), 242, 66, TextFormatAlign.RIGHT, 0xE8DCC8],
                    [b.open ? "" : (b.jackpot ? "JACKPOT" : CasinoUI.mult(Number(b.multiplier))), 310, 50, TextFormatAlign.RIGHT, color],
                    [b.open ? "in play" : CasinoUI.number(int(b.payout)), 362, 64, TextFormatAlign.RIGHT, color]];
                for each (var v:Array in vals) {
                    row.addChild(CasinoUI.at(CasinoUI.label(v[0], 11, v[4], v == vals[4] && won, v[2], v[3]), v[1], 0));
                }
                if (!first && Number(b.id) > this._lastId) {
                    this._fresh.push({"s": row, "t": 30, "c": b.jackpot ? 0xD090FF : (won ? 0x9CFF6A : 0xFF8A2A)});
                }
                i++;
            }
            this._lastId = newest;
            // the day's biggest wins and the last jackpots
            CasinoUI.removeAll(this._side);
            this._side.addChild(CasinoUI.at(CasinoUI.label("BIGGEST WINS TODAY", 12, CasinoUI.GOLD, true, 230), 12, 10));
            var top:Array = r.top as Array || [];
            if (!top.length) {
                this._side.addChild(CasinoUI.at(CasinoUI.label("No wins yet today.", 10, CasinoUI.ASH, false, 230), 12, 32));
            }
            i = 0;
            while (i < Math.min(top.length, 10)) {
                var t:Object = top[i];
                var y:int = 32 + i * 21;
                this._side.addChild(CasinoUI.at(CasinoUI.label((i + 1) + ". " + t.name, 11, t.me ? CasinoUI.GOLD : 0xE8DCC8, i == 0, 140), 12, y));
                this._side.addChild(CasinoUI.at(CasinoUI.label("+" + CasinoUI.number(int(t.payout) - int(t.stake)), 11, t.jackpot ? 0xD090FF : CasinoUI.WIN, true, 84, TextFormatAlign.RIGHT), 152, y));
                this._side.addChild(CasinoUI.at(CasinoUI.label(gameName(String(t.game)) + (t.jackpot ? " - jackpot" : ", " + CasinoUI.mult(Number(t.multiplier))), 9, CasinoUI.ASH, false, 220), 24, y + 12));
                i++;
            }
            var jy:int = 32 + 10 * 21 + 14;
            this._side.addChild(CasinoUI.at(CasinoUI.label("LAST JACKPOTS", 12, 0xD090FF, true, 230), 12, jy));
            var jackpots:Array = r.jackpots as Array || [];
            if (!jackpots.length) {
                this._side.addChild(CasinoUI.at(CasinoUI.label("The pool is waiting: " + CasinoUI.number(Number(r.jackpot)) + " Shiny", 10, CasinoUI.ASH, false, 230), 12, jy + 22));
            }
            i = 0;
            while (i < Math.min(jackpots.length, 5)) {
                var j:Object = jackpots[i];
                var ago:String = this.ago(Number(r.server_ts) - Number(j.at));
                this._side.addChild(CasinoUI.at(CasinoUI.label(String(j.name), 11, j.me ? CasinoUI.GOLD : 0xE8DCC8, false, 130), 12, jy + 22 + i * 17));
                this._side.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.number(int(j.payout)) + " - " + ago, 10, 0xD090FF, true, 110, TextFormatAlign.RIGHT), 126, jy + 23 + i * 17));
                i++;
            }
        }

        private function ago(ms:Number):String {
            var m:int = Math.max(0, Math.floor(ms / 60000));
            return m < 1 ? "now" : (m < 60 ? m + "m ago" : (m < 1440 ? Math.floor(m / 60) + "h ago" : Math.floor(m / 1440) + "d ago"));
        }

        public function tick():void {
            if (++this._t >= 80) {
                this._t = 0;
                this.ask();
            }
            var i:int = this._fresh.length - 1;
            while (i >= 0) {
                var f:Object = this._fresh[i];
                f.t--;
                f.s.filters = f.t > 0 ? [new GlowFilter(f.c, f.t / 30, 10, 10, 2, 2)] : [];
                if (f.t <= 0) {
                    this._fresh.splice(i, 1);
                }
                i--;
            }
        }

        public function get showing():Boolean {
            return false;
        }

        public function dispose():void {
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
