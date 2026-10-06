package com.monsters.casino {
    import com.monsters.casino.games.MagmaDropGame;
    import com.monsters.casino.games.ScratchersGame;
    import com.monsters.casino.games.RouletteGame;
    import com.monsters.casino.games.SlotsGame;
    import com.monsters.casino.games.BonePileGame;
    import com.monsters.casino.games.AscentGame;
    import com.monsters.casino.games.DerbyGame;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.ColorMatrixFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: the Brimstone Pit's window (opened from the Pit's info panel: BRIMSTONEPIT). A lobby of
     * the eight games (those not open at the Pit's level greyed, those not in yet marked coming soon) with
     * the jackpot and Moloch's Favor (the free Slots spin of the day), everyone's bets live (LiveTab), the
     * player's last bets, and the fairness panel (the seeds every result is drawn from, and how to check
     * them). The games are played on the server (server/src/controllers/casino); this only shows them.
     */
    public class CasinoWindow {

        public static const W:int = 740;

        public static const H:int = 530;

        /** The area games and tabs draw in, from the window's centre. */
        public static const CX:int = -350;

        public static const CY:int = -170;

        public static const CW:int = 700;

        public static const CH:int = 410;

        private static var _open:CasinoWindow = null;

        /** A win paying this many times its bet or more is celebrated across the window (bigWin). */
        public static const BIG_WIN:int = 10;

        private var _big:Sprite;

        private var _bigT:int = 0;

        private var _bigAmount:int = 0;

        private var _bigText:TextField;

        private var _bigGems:Array = [];

        private var _favorLine:TextField;

        public var mc:MovieClip;

        private var _content:Sprite;

        private var _shiny:TextField;

        private var _level:TextField;

        private var _tabs:Array = [];

        private var _game:Object = null;

        private var _toast:TextField;

        private var _toastT:int = 0;

        private var _embers:Array = [];

        /** The lobby's live lines (Ascent, Derby), by game. */
        private var _live:Object = {};

        private var _liveT:int = 0;

        private var _emberLayer:Sprite;

        /** Opens the window (the player's own yard only, not during an attack). */
        public static function Show():void {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message("The Brimstone Pit only opens in your own yard.");
                return;
            }
            if (_open) {
                _open.close();
            }
            _open = new CasinoWindow();
        }

        /** A game is showing a result the Shiny shown has not caught up with yet. */
        public static function get showingResult():Boolean {
            return _open != null && _open._game != null && Boolean(_open._game.showing);
        }

        public static function get isOpen():Boolean {
            return _open != null;
        }

        /** The games a Pit level opens (the building's description; the server's config decides). */
        public static function gamesAtLevel(level:int):String {
            var names:Array = ["Magma Drop and Brimstone Scratchers", "Wormzer Roulette and Bone Pile", "Magma Slots and Magma tickets", "Balthazar's Ascent", "Magma Derby", "Korath's Fortune"];
            var out:Array = [];
            var i:int = 0;
            while (i < Math.min(level, names.length)) {
                out.push(names[i]);
                i++;
            }
            return out.join("; ") + (level < names.length ? ". Next level: " + names[level] + "." : ".");
        }

        public function CasinoWindow() {
            super();
            this.mc = new MovieClip();
            this.mc.name = "casinoWindow";
            this.drawFrame();
            // the header: title, level, Shiny
            this.mc.addChild(CasinoUI.at(CasinoUI.title("THE BRIMSTONE PIT", 30, W - 200), -W / 2 + 100, -H / 2 + 12));
            this._level = this.mc.addChild(CasinoUI.label("", 12, CasinoUI.ASH, true, 200, TextFormatAlign.LEFT)) as TextField;
            this._level.x = -W / 2 + 26;
            this._level.y = -H / 2 + 26;
            this._shiny = this.mc.addChild(CasinoUI.label("", 15, CasinoUI.GOLD, true, 160, TextFormatAlign.RIGHT)) as TextField;
            this._shiny.x = W / 2 - 210;
            this._shiny.y = -H / 2 + 24;
            var gem:Shape = this.mc.addChild(new Shape()) as Shape;
            gem.graphics.lineStyle(1, 0xFFFFFF, 0.9);
            gem.graphics.beginFill(0x7AE0FF, 1);
            gem.graphics.moveTo(0, -8);
            gem.graphics.lineTo(7, -2);
            gem.graphics.lineTo(0, 9);
            gem.graphics.lineTo(-7, -2);
            gem.graphics.lineTo(0, -8);
            gem.graphics.endFill();
            gem.x = W / 2 - 38;
            gem.y = -H / 2 + 36;
            gem.filters = [new GlowFilter(0x7AE0FF, 0.8, 8, 8, 2, 2)];
            // tabs
            var names:Array = ["Games", "Live", "History", "Fairness"];
            var i:int = 0;
            while (i < names.length) {
                var tab:Sprite = CasinoUI.toggle(names[i], 110, 26, this.tabClick(i));
                tab.x = -W / 2 + 26 + i * 118;
                tab.y = -H / 2 + 62;
                this.mc.addChild(tab);
                this._tabs.push(tab);
                i++;
            }
            this._content = this.mc.addChild(new Sprite()) as Sprite;
            this._content.x = CX;
            this._content.y = CY;
            this._emberLayer = this.mc.addChild(new Sprite()) as Sprite;
            this._emberLayer.mouseEnabled = false;
            this._emberLayer.mouseChildren = false;
            this._big = this.mc.addChild(new Sprite()) as Sprite;
            this._big.name = "casinoBigWin";
            this._big.visible = false;
            // (it never stands in the way: a click anywhere in the window goes through, and puts it away)
            this._big.mouseEnabled = this._big.mouseChildren = false;
            // (inside the window's rim)
            var bigMask:Shape = this.mc.addChild(new Shape()) as Shape;
            bigMask.graphics.beginFill(0);
            bigMask.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            bigMask.graphics.endFill();
            this._big.mask = bigMask;
            this.mc.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    if (_bigT > 25) {
                        _bigT = 25;
                    }
                });
            this._toast = this.mc.addChild(CasinoUI.label("", 14, 0xFFFFFF, true, W - 100, TextFormatAlign.CENTER)) as TextField;
            this._toast.name = "casinoToast";
            this._toast.x = -W / 2 + 50;
            this._toast.y = H / 2 - 44;
            this._toast.filters = [new GlowFilter(0x3A0A04, 1, 4, 4, 8, 2)];
            // close
            var x:Sprite = this.mc.addChild(new Sprite()) as Sprite;
            x.name = "casinoClose";
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
            x.x = W / 2 - 22;
            x.y = -H / 2 + 22;
            x.addEventListener(MouseEvent.CLICK, this.close);
            this.mc.addEventListener(Event.ENTER_FRAME, this.tick);
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this.mc);
            POPUPSETTINGS.AlignToCenter(this.mc);
            POPUPSETTINGS.ScaleUp(this.mc);
            this.selectTab(0);
            this.message("Entering the Pit...", CasinoUI.ASH);
            CASINO.getState(this.onState);
        }

        /** Obsidian, a molten rim, the cavern behind (casino/lobby/lobby_bg.jpg). */
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
            CasinoUI.picture(art, "casino/lobby/lobby_bg.jpg", -W / 2 + 6, -H / 2 + 6, W - 12, H - 12, function(b:Object):void {
                    b.alpha = 0.95;
                });
            var mask:Shape = this.mc.addChild(new Shape()) as Shape;
            mask.graphics.beginFill(0);
            mask.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            mask.graphics.endFill();
            art.mask = mask;
            // a dark band behind the header
            var band:Shape = this.mc.addChild(new Shape()) as Shape;
            var m2:Matrix = new Matrix();
            m2.createGradientBox(W, 100, Math.PI / 2, -W / 2, -H / 2);
            band.graphics.beginGradientFill(GradientType.LINEAR, [0x0C0605, 0x0C0605], [0.85, 0], [0, 255], m2);
            band.graphics.drawRect(-W / 2 + 6, -H / 2 + 6, W - 12, 100);
            band.graphics.endFill();
        }

        private function tabClick(i:int):Function {
            return function(e:MouseEvent):void {
                selectTab(i);
            };
        }

        public function selectTab(i:int):void {
            var k:int = 0;
            while (k < this._tabs.length) {
                CasinoUI.choose(this._tabs[k], k == i);
                k++;
            }
            this.endGame();
            CasinoUI.removeAll(this._content);
            this.message("", 0); // (a game's last line went on showing over the History table)
            if (i == 0) {
                this.lobby();
            }
            else if (i == 1) {
                this._game = this._content.addChild(new LiveTab(this));
            }
            else if (i == 2) {
                this.historyTab();
            }
            else {
                this.fairnessTab();
            }
        }

        private function onState(r:Object):void {
            if (!this.mc) {
                return;
            }
            if (r.error) {
                this.message(String(r.error), CasinoUI.LOSS);
                return;
            }
            this.message("", 0);
            if (CASINO.state && CASINO.state.shiny_locked) {
                this.message("Shiny is turned off on your account, so you cannot play in the Brimstone Pit.", CasinoUI.LOSS);
            }
            else if (CASINO.state && CASINO.state.closed) {
                this.message(String(CASINO.state.closed), CasinoUI.LOSS);
            }
            if (!this._game) {
                this.selectTab(0);
            }
        }

        // ---- the lobby

        private function lobby():void {
            this._live = {};
            var st:Object = CASINO.state;
            var games:Array = st ? st.games as Array : [];
            if (!games || !games.length) {
                return;
            }
            var TW:int = 160, TH:int = 150;
            var i:int = 0;
            while (i < games.length) {
                var g:Object = games[i];
                var row:int = i < 4 ? 0 : 1;
                var col:int = i < 4 ? i : i - 4;
                var rowCount:int = row == 0 ? 4 : games.length - 4;
                var x0:Number = (CW - (rowCount * TW + (rowCount - 1) * 20)) / 2;
                var tile:Sprite = this.tile(g, TW, TH);
                tile.x = x0 + col * (TW + 20);
                tile.y = 6 + row * (TH + 14);
                this._content.addChild(tile);
                i++;
            }
            // the jackpot ticker (the Slots', shared by Korath's Fortune), and Moloch's Favor beside it
            var favor:Object = st.favor && st.favor.enabled ? st.favor : null;
            var jw:int = favor ? 400 : 420;
            var jp:Sprite = CasinoUI.panel(jw, 40);
            jp.x = favor ? 20 : (CW - 420) / 2;
            jp.y = 6 + 2 * TH + 14 + 16;
            var jl:TextField = CasinoUI.label("SLOTS JACKPOT", 11, CasinoUI.ASH, true, 200, TextFormatAlign.LEFT);
            jl.x = 16;
            jl.y = 12;
            jp.addChild(jl);
            var jv:TextField = CasinoUI.label(CasinoUI.number(Number(st.jackpot)) + " Shiny", 18, CasinoUI.GOLD, true, 200, TextFormatAlign.RIGHT);
            jv.name = "casinoLobbyJackpot";
            jv.x = jw - 216;
            jv.y = 8;
            jv.filters = [new GlowFilter(0xFF8A00, 0.8, 8, 8, 2, 2)];
            jp.addChild(jv);
            this._content.addChild(jp);
            this._favorLine = null;
            if (favor) {
                var ready:Boolean = Boolean(favor.ready) && !st.closed && !st.shiny_locked;
                var fb:Sprite = CasinoUI.button(ready ? "FREE SPIN" : "MOLOCH'S FAVOR", 260, 40, function(e:MouseEvent):void {
                        openGame("slots");
                        if (_game is SlotsGame) {
                            (_game as SlotsGame).playFavor();
                        }
                    }, ready, 15);
                fb.name = "casinoFavor";
                fb.x = 420;
                fb.y = jp.y;
                this._content.addChild(fb);
                // under it: what it is worth, or when the next one comes (midnight UTC)
                this._favorLine = CasinoUI.label("", 10, ready ? CasinoUI.GOLD : CasinoUI.ASH, true, 260, TextFormatAlign.CENTER);
                this._favorLine.x = 420;
                this._favorLine.y = jp.y + 42;
                this._favorLine.name = ready ? "ready" : "used";
                this._content.addChild(this._favorLine);
                if (ready) {
                    this._favorLine.text = "Moloch's Favor: a free " + CasinoUI.number(int(favor.bet)) + " Shiny spin";
                }
            }
        }

        private function tile(g:Object, w:int, h:int):Sprite {
            var t:MovieClip = new MovieClip();
            t.name = "casinoTile:" + g.id;
            var st:Object = CASINO.state;
            var playable:Boolean = Boolean(g.unlocked) && st && !st.closed && !st.shiny_locked;
            var frame:Sprite = t.addChild(CasinoUI.panel(w, h, 0.95)) as Sprite;
            var art:Sprite = t.addChild(new Sprite()) as Sprite;
            CasinoUI.picture(art, "casino/lobby/tile_" + g.id + ".png", 4, 4, w - 8, h - 8);
            if (!g.unlocked) {
                // greyed and darkened
                art.filters = [new ColorMatrixFilter([0.2, 0.4, 0.1, 0, -10, 0.2, 0.4, 0.1, 0, -10, 0.2, 0.4, 0.1, 0, -10, 0, 0, 0, 1, 0])];
            }
            var name:TextField = CasinoUI.label(String(g.name), 13, 0xFFFFFF, true, w, TextFormatAlign.CENTER);
            name.y = h - 40;
            name.filters = [new GlowFilter(0x000000, 1, 4, 4, 8, 2)];
            t.addChild(name);
            var status:String = !g.open ? "Coming soon" : (!g.unlocked ? "Pit level " + g.level : (g.id == "bonepile" && st && st.bonepile ? "Your game is open" : ""));
            var live:Boolean = g.unlocked && (g.id == "ascent" || g.id == "derby");
            if (status || live) {
                var s:TextField = CasinoUI.label(status, 11, g.open ? CasinoUI.EMBER : CasinoUI.ASH, true, w, TextFormatAlign.CENTER);
                s.y = h - 22;
                s.filters = [new GlowFilter(0x000000, 1, 4, 4, 8, 2)];
                t.addChild(s);
                if (live) {
                    // the round going on now, kept up to date in tick()
                    s.name = "casinoLive:" + g.id;
                    this._live[g.id] = s;
                }
            }
            if (playable) {
                t.buttonMode = true;
                t.mouseChildren = false;
                t.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                        frame.filters = [new GlowFilter(0xFF8A2A, 1, 14, 14, 2, 2)];
                    });
                t.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                        frame.filters = [];
                    });
                t.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        SOUNDS.Play("click1");
                        openGame(String(g.id));
                    });
            }
            return t;
        }

        /** Opens a game in the window (the lobby comes back with its Lobby button). */
        public function openGame(id:String):void {
            this.endGame();
            CasinoUI.removeAll(this._content);
            var k:int = 0;
            while (k < this._tabs.length) {
                CasinoUI.choose(this._tabs[k], false);
                k++;
            }
            if (id == "magmadrop") {
                this._game = new MagmaDropGame(this);
            }
            else if (id == "scratch") {
                this._game = new ScratchersGame(this);
            }
            else if (id == "roulette") {
                this._game = new RouletteGame(this);
            }
            else if (id == "slots") {
                this._game = new SlotsGame(this);
            }
            else if (id == "bonepile") {
                this._game = new BonePileGame(this);
            }
            else if (id == "ascent") {
                this._game = new AscentGame(this);
            }
            else if (id == "derby") {
                this._game = new DerbyGame(this);
            }
            else if (id == "fortune") {
                this._game = new SlotsGame(this, "fortune");
            }
            if (this._game) {
                this._content.addChild(this._game as Sprite);
            }
        }

        private function endGame():void {
            if (this._game) {
                this._game.dispose();
                this._game = null;
            }
        }

        /** Back to the lobby (a game's button). */
        public function toLobby(e:MouseEvent = null):void {
            this.selectTab(0);
        }

        // ---- History

        private function historyTab():void {
            var p:Sprite = this._content.addChild(CasinoUI.panel(CW, CH - 10)) as Sprite;
            var t:TextField = CasinoUI.label("Loading your last bets...", 12, CasinoUI.ASH, true, CW - 40);
            t.x = 20;
            t.y = 14;
            p.addChild(t);
            CASINO.history(function(r:Object):void {
                    if (!mc || !p.parent) {
                        return;
                    }
                    if (r.error) {
                        t.text = String(r.error);
                        return;
                    }
                    var bets:Array = r.bets as Array;
                    t.text = bets.length ? "Your last bets (every one can be checked against its seeds in Fairness)" : "No bets yet.";
                    var cols:Array = [["Game", 20, 170], ["Bet", 190, 80], ["Paid", 270, 90], ["x", 360, 70], ["Nonce", 430, 70], ["When", 500, 180]];
                    var c:Array = null;
                    for each (c in cols) {
                        var hd:TextField = CasinoUI.label(c[0], 11, CasinoUI.EMBER, true, c[2]);
                        hd.x = c[1];
                        hd.y = 40;
                        p.addChild(hd);
                    }
                    var i:int = 0;
                    while (i < Math.min(bets.length, 18)) {
                        var b:Object = bets[i];
                        var won:Boolean = int(b.payout) > int(b.stake);
                        var vals:Array = [LiveTab.gameName(String(b.game)), b.game == "favor" ? "FREE" : CasinoUI.number(int(b.stake)), CasinoUI.number(int(b.payout)), CasinoUI.mult(Number(b.multiplier)), b.nonce == null ? "-" : String(b.nonce), String(b.created_at).replace("T", " ").substr(0, 19)];
                        var j:int = 0;
                        while (j < cols.length) {
                            var v:TextField = CasinoUI.label(vals[j], 11, j == 2 ? (won ? CasinoUI.WIN : (int(b.payout) > 0 ? CasinoUI.GOLD : CasinoUI.ASH)) : 0xE8DCC8, false, cols[j][2]);
                            v.x = cols[j][1];
                            v.y = 60 + i * 19;
                            p.addChild(v);
                            j++;
                        }
                        i++;
                    }
                });
        }

        // ---- Fairness

        private function fairnessTab():void {
            var p:Sprite = this._content.addChild(CasinoUI.panel(CW, CH - 10)) as Sprite;
            var st:Object = CASINO.state;
            var y:int = 12;
            var put:Function = function(text:String, size:int, color:uint, bold:Boolean, h:int = 0):TextField {
                var f:TextField = CasinoUI.label(text, size, color, bold, CW - 40);
                f.x = 20;
                f.y = y;
                f.multiline = true;
                f.wordWrap = true;
                f.height = h > 0 ? h : size + 10;
                p.addChild(f);
                y += (h > 0 ? h : size + 10) + 2;
                return f;
            };
            put("Every result is drawn from your seeds, before you see it, and can be checked.", 13, CasinoUI.GOLD, true);
            put("A bet's numbers are HMAC-SHA256(server seed, \"client seed:nonce:block\"), four bytes to a number between 0 and 1. The server seed stays secret while it is in use: you see its SHA-256 hash first. Change seeds to see it, then recompute any past bet from the server seed, your client seed and the bet's nonce. A win with part of a Shiny (1.5x on 1) pays one more Shiny with that part's chance, decided by the bet's next number.", 11, 0xE8DCC8, false, 60);
            y += 4;
            if (!st || !st.seed) {
                put("Loading...", 11, CasinoUI.ASH, false);
                return;
            }
            put("Server seed (hash)", 11, CasinoUI.EMBER, true);
            var hash:TextField = put(String(st.seed.server_seed_hash), 11, 0xFFFFFF, false);
            hash.selectable = true;
            hash.mouseEnabled = true;
            put("Client seed (yours to choose: letters, digits, - and _)", 11, CasinoUI.EMBER, true);
            var client:TextField = CasinoUI.input(300, 24, String(st.seed.client_seed), 32, "A-Za-z0-9_\\-");
            client.x = 20;
            client.y = y;
            p.addChild(client);
            var nonce:TextField = CasinoUI.label("Bets on these seeds: " + st.seed.nonce, 11, CasinoUI.ASH, true, 220);
            nonce.x = 340;
            nonce.y = y + 4;
            p.addChild(nonce);
            y += 34;
            var revealed:TextField = null;
            var btn:Sprite = CasinoUI.button("CHANGE SEEDS", 180, 32, function(e:MouseEvent):void {
                    CasinoUI.enable(btn, false);
                    CASINO.rotateSeed(client.text, function(r:Object):void {
                            if (!mc) {
                                return;
                            }
                            if (r.error) {
                                message(String(r.error), CasinoUI.LOSS);
                                CasinoUI.enable(btn, true);
                                return;
                            }
                            message("New seeds. The old server seed is shown below.", CasinoUI.GOLD);
                            selectTab(3);
                        });
                });
            btn.x = 20;
            btn.y = y;
            p.addChild(btn);
            y += 44;
            put("Seeds you have changed (their server seeds, now shown)", 11, CasinoUI.EMBER, true);
            revealed = put("...", 10, 0xE8DCC8, false, 150);
            revealed.selectable = true;
            revealed.mouseEnabled = true;
            CASINO.history(function(r:Object):void {
                    if (!mc || !revealed.parent || r.error) {
                        return;
                    }
                    var list:Array = r.revealed_seeds as Array;
                    var lines:Array = [];
                    var s:Object = null;
                    for each (s in list) {
                        lines.push("server " + s.server_seed + "\n   hash " + s.server_seed_hash + "  client " + s.client_seed + "  bets " + s.nonces);
                    }
                    revealed.text = lines.length ? lines.slice(0, 4).join("\n") : "None yet.";
                });
        }

        // ---- shared

        /** A line at the bottom of the window (results, refusals). */
        public function message(text:String, color:uint = 0xFFFFFF):void {
            if (!this.mc) {
                return;
            }
            this._toast.text = text;
            this._toast.textColor = color;
            this._toastT = text ? 40 * 5 : 0;
            this._toast.alpha = 1;
        }

        private function tick(e:Event):void {
            this._shiny.text = CasinoUI.number(CASINO.credits());
            this._level.text = CASINO.state ? (int(CASINO.state.level) > 0 ? "Pit level " + CASINO.state.level : "") : "";
            if (this._toastT > 0) {
                --this._toastT;
                if (this._toastT < 30) {
                    this._toast.alpha = this._toastT / 30;
                }
            }
            if (this._game) {
                this._game.tick();
            }
            else {
                this.liveLines();
                this.favorCountdown();
            }
            this.embers();
            this.bigWinTick();
        }

        /** The lobby's "Next Favor in 5:12:03" (the server's clock: the day turns at midnight UTC). */
        private function favorCountdown():void {
            var f:TextField = this._favorLine;
            if (!f || !f.parent || f.name != "used") {
                return;
            }
            var st:Object = CASINO.state;
            var now:Number = new Date().getTime() + Number(st && st.live_offset ? st.live_offset : 0);
            var left:int = int(Math.ceil((86400000 - now % 86400000) / 1000));
            if (left >= 86399) {
                // a new day: ask again (the button turns into today's spin)
                f.name = "asked";
                CASINO.getState(function(r:Object):void {
                        if (mc && !_game && !r.error) {
                            selectTab(0);
                        }
                    });
                return;
            }
            var h:int = int(left / 3600), m:int = int(left / 60) % 60, sec:int = left % 60;
            f.text = "Next free spin in " + h + ":" + (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
        }

        /**
         * A big win (BIG_WIN times the bet or more) told across the window: BIG, MEGA (50x) or EPIC (200x)
         * WIN, the Shiny counting up, gems bursting.
         * The games call it as their result is shown (the Slots' jackpot has its own). Clicks go through it;
         * the first one anywhere in the window shows the whole amount and fades it out.
         */
        public function bigWin(payout:int, bet:int):Boolean {
            if (!this.mc || bet <= 0 || payout < bet * BIG_WIN) {
                return false;
            }
            var x:Number = payout / bet;
            var word:String = x >= 200 ? "EPIC WIN!" : (x >= 50 ? "MEGA WIN!" : "BIG WIN!");
            var col:uint = x >= 200 ? 0xFF4AD0 : (x >= 50 ? 0x6AE0FF : 0xFFD040);
            CasinoUI.removeAll(this._big);
            this._big.graphics.clear();
            this._big.graphics.beginFill(0x000000, 0.45);
            this._big.graphics.drawRoundRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 18, 18);
            this._big.graphics.endFill();
            // rays behind the words
            var rays:Shape = this._big.addChild(new Shape()) as Shape;
            rays.name = "rays";
            var k:int = 0;
            while (k < 16) {
                var a:Number = k * Math.PI / 8;
                rays.graphics.beginFill(col, 0.18);
                rays.graphics.moveTo(0, 0);
                rays.graphics.lineTo(Math.cos(a - 0.09) * 320, Math.sin(a - 0.09) * 320);
                rays.graphics.lineTo(Math.cos(a + 0.09) * 320, Math.sin(a + 0.09) * 320);
                rays.graphics.endFill();
                k++;
            }
            rays.y = -10;
            var words:Sprite = this._big.addChild(new Sprite()) as Sprite;
            words.name = "words";
            words.y = -10;
            var t:TextField = CasinoUI.title(word, 54, 600);
            t.x = -300;
            t.y = -70;
            t.filters = [new GlowFilter(col, 1, 18, 18, 3, 2), new GlowFilter(0x3A0A04, 1, 4, 4, 8, 2)];
            words.addChild(t);
            this._bigText = CasinoUI.label("+0 SHINY", 30, 0xFFFFFF, true, 600, TextFormatAlign.CENTER);
            this._bigText.x = -300;
            this._bigText.y = 6;
            this._bigText.filters = [new GlowFilter(0x000000, 1, 6, 6, 6, 2)];
            words.addChild(this._bigText);
            words.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.mult(Math.floor(x * 100) / 100) + " YOUR BET", 13, col, true, 600, TextFormatAlign.CENTER), -300, 48));
            this._bigAmount = payout;
            this._bigT = 230;
            this._big.visible = true;
            this._big.alpha = 1;
            SOUNDS.Play("chaching");
            SOUNDS.Play("iquestshow");
            return true;
        }

        private function bigWinTick():void {
            if (this._bigT <= 0) {
                var g0:int = this._bigGems.length - 1;
                while (g0 >= 0) {
                    this._big.removeChild(this._bigGems[g0].s);
                    g0--;
                }
                this._bigGems = [];
                this._big.visible = false;
                return;
            }
            this._bigT--;
            var age:int = 230 - this._bigT;
            // counts up over its first 2 seconds
            var shown:int = age >= 80 ? this._bigAmount : int(this._bigAmount * (1 - Math.pow(1 - age / 80, 3)));
            this._bigText.text = "+" + CasinoUI.number(shown) + " SHINY";
            var words:Sprite = this._big.getChildByName("words") as Sprite;
            var rays:Shape = this._big.getChildByName("rays") as Shape;
            if (words) {
                var pop:Number = age < 12 ? 0.4 + 0.75 * age / 12 : 1.15 - 0.15 * Math.min(1, (age - 12) / 10);
                words.scaleX = words.scaleY = pop + 0.03 * Math.sin(age / 4);
            }
            if (rays) {
                rays.rotation += 0.8;
            }
            if (age < 90 && age % 2 == 0) {
                var s:Shape = this._big.addChild(new Shape()) as Shape;
                s.graphics.lineStyle(1, 0xFFFFFF, 0.9);
                s.graphics.beginFill(0x7AE0FF, 1);
                s.graphics.moveTo(0, -7);
                s.graphics.lineTo(6, -2);
                s.graphics.lineTo(0, 8);
                s.graphics.lineTo(-6, -2);
                s.graphics.lineTo(0, -7);
                s.graphics.endFill();
                var ang:Number = Math.random() * Math.PI * 2;
                var sp:Number = 3 + Math.random() * 5;
                this._bigGems.push({"s": s, "vx": Math.cos(ang) * sp, "vy": Math.sin(ang) * sp - 2, "vr": (Math.random() - 0.5) * 14});
            }
            var i:int = this._bigGems.length - 1;
            while (i >= 0) {
                var d:Object = this._bigGems[i];
                d.s.x += d.vx;
                d.s.y += d.vy;
                d.vy += 0.18;
                d.s.rotation += d.vr;
                if (d.s.y > H / 2) {
                    this._big.removeChild(d.s);
                    this._bigGems.splice(i, 1);
                }
                i--;
            }
            this._big.alpha = this._bigT > 25 ? 1 : this._bigT / 25;
        }

        /** "Flying: 2.41x", "Next race in 3:12": the shared games' rounds, from casino/state's clock. */
        private function liveLines():void {
            var st:Object = CASINO.state;
            if (!st || !st.live) {
                return;
            }
            // the rounds move on: asked again every few seconds while the lobby is open
            if (++this._liveT >= 160) {
                this._liveT = 0;
                var any:Boolean = false;
                for (var k:String in this._live) {
                    any = true;
                }
                if (any) {
                    CASINO.getState(function(r:Object):void {
                        });
                }
            }
            var now:Number = new Date().getTime() + Number(st.live_offset || 0);
            var id:String = null;
            for (id in this._live) {
                var f:TextField = this._live[id];
                if (!f.parent) {
                    continue;
                }
                var r:Object = st.live[id];
                if (!r) {
                    f.text = "";
                    continue;
                }
                var left:int = Math.max(0, Math.ceil((Number(r.starts_at) - now) / 1000));
                if (id == "ascent") {
                    f.text = r.phase == "running" && now >= Number(r.starts_at) ? "Flying: " + (Math.floor(100 * Math.exp(0.00006 * (now - Number(r.starts_at)))) / 100).toFixed(2) + "x" : (r.phase == "betting" && left > 0 ? "Taking off in " + left + "s" : "Next flight soon");
                }
                else {
                    f.text = r.phase == "running" ? "Racing now!" : (r.phase == "betting" && left > 0 ? "Next race in " + int(left / 60) + ":" + (left % 60 < 10 ? "0" : "") + (left % 60) : "Next race soon");
                }
            }
        }

        /** Embers rising through the window. */
        private function embers():void {
            if (this._embers.length < 26 && Math.random() < 0.3) {
                var s:Shape = this._emberLayer.addChild(new Shape()) as Shape;
                var colors:Array = [0xFFB040, 0xFF6A1A, 0xFFE08A, 0xFF4A10];
                s.graphics.beginFill(colors[int(Math.random() * colors.length)], 1);
                s.graphics.drawCircle(0, 0, 0.8 + Math.random() * 1.6);
                s.graphics.endFill();
                s.x = -W / 2 + 10 + Math.random() * (W - 20);
                s.y = H / 2 - 10;
                this._embers.push({"s": s, "vy": 0.4 + Math.random() * 0.9, "sway": Math.random() * 6.28, "life": 0});
            }
            var i:int = this._embers.length - 1;
            while (i >= 0) {
                var em:Object = this._embers[i];
                em.life++;
                em.s.y -= em.vy;
                em.s.x += Math.sin(em.sway + em.life * 0.05) * 0.4;
                em.s.alpha = Math.max(0, 1 - em.life / 260);
                if (em.life > 260 || em.s.y < -H / 2 + 10) {
                    this._emberLayer.removeChild(em.s);
                    this._embers.splice(i, 1);
                }
                i--;
            }
        }

        public function close(e:MouseEvent = null):void {
            if (!this.mc) {
                return;
            }
            SOUNDS.Play("close");
            this.endGame();
            this.mc.removeEventListener(Event.ENTER_FRAME, this.tick);
            GLOBAL.BlockerRemove();
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
            }
            this.mc = null;
            this._embers = [];
            if (_open == this) {
                _open = null;
            }
            // (bets answered while it was open: the Shiny as the server has it)
            CASINO.getState(function(r:Object):void {
                });
        }
    }
}
