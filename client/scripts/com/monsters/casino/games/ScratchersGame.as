package com.monsters.casino.games {
    import com.monsters.casino.CASINO;
    import com.monsters.casino.CasinoUI;
    import com.monsters.casino.CasinoWindow;
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.BlendMode;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.geom.Rectangle;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Brimstone Scratchers: a 3 x 3 card bought for 5, 25 or 100 Shiny; three of one symbol win that
     * symbol's prize times the price. The server draws the card when it is bought
     * (server/src/services/casino/games/scratchers.ts); scratching only shows it. The Shiny shown drops by
     * the price when the card is bought and rises by its prize when it has been scratched.
     */
    public class ScratchersGame extends Sprite {

        public static const TIERS:Array = ["bone", "obsidian", "magma"];

        public static const NAMES:Object = {"crown": "Moloch's Crown", "balthazar": "Balthazar", "spurtz": "Spurtz", "magma": "Magma", "sulfur": "Sulfur", "coal": "Coal", "bone": "Bone"};

        /** The card, from the content area's top left, and its cells in the card. */
        private static const CARD_X:int = 310;

        private static const CARD_Y:int = 46;

        private static const CARD:int = 300;

        private static const EDGE:int = 24;

        private static const CELL:int = 84;

        private static const AREA:int = 252;

        private static const SYMBOL:int = 70;

        private static const BRUSH:Number = 17;

        /** Scratched progress is kept on a grid of GRID x GRID points over the coating. */
        private static const GRID:int = 36;

        private static const AUTO_REVEAL:Number = 0.7;

        private var _win:CasinoWindow;

        private var _tier:String = "bone";

        private var _tierButtons:Object = {};

        private var _buy:Sprite;

        private var _revealAll:Sprite;

        private var _card:Sprite;

        private var _cardArt:Sprite;

        private var _symbols:Sprite;

        private var _cells:Array = [];

        private var _coating:BitmapData;

        private var _coatingBitmap:Bitmap;

        private var _coatings:Object = {};

        /** Closed (dispose): pictures still loading are ignored (bug report #62: their coating was gone). */
        private var _disposed:Boolean = false;

        private var _scratched:Array = [];

        private var _scratchedCount:int = 0;

        private var _brush:Shape;

        private var _stamp:Sprite;

        private var _hint:TextField;

        private var _ticketName:TextField;

        /** The card being scratched (the server's answer), or null. */
        private var _ticket:Object = null;

        private var _buying:Boolean = false;

        private var _revealed:Boolean = true;

        private var _fading:int = 0;

        private var _scratching:Boolean = false;

        private var _lastX:Number = 0;

        private var _lastY:Number = 0;

        private var _pulse:int = 0;

        private var _serverCredits:int = -1;

        public function ScratchersGame(win:CasinoWindow) {
            super();
            this._win = win;
            this.name = "casinoScratchers";
            // controls
            var p:Sprite = this.addChild(CasinoUI.panel(210, 400)) as Sprite;
            var back:Sprite = CasinoUI.button("LOBBY", 90, 26, win.toLobby, true, 12);
            back.x = 10;
            back.y = 10;
            p.addChild(back);
            p.addChild(CasinoUI.at(CasinoUI.label("SCRATCHERS", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
            p.addChild(CasinoUI.at(CasinoUI.label("TICKET", 11, CasinoUI.EMBER, true, 190), 12, 68));
            var i:int = 0;
            while (i < TIERS.length) {
                var id:String = TIERS[i];
                var t:Sprite = CasinoUI.toggle(id.toUpperCase(), 60, 26, this.tierClick(id));
                t.x = 10 + i * 64;
                t.y = 84;
                p.addChild(t);
                this._tierButtons[id] = t;
                var price:TextField = CasinoUI.label(this.tierPrice(id) + " Shiny", 10, CasinoUI.ASH, false, 60, TextFormatAlign.CENTER);
                price.name = "casinoTierPrice:" + id;
                price.x = t.x;
                price.y = 112;
                p.addChild(price);
                i++;
            }
            this._buy = CasinoUI.button("BUY", 190, 40, this.onBuy, true, 18);
            this._buy.x = 10;
            this._buy.y = 136;
            p.addChild(this._buy);
            this._revealAll = CasinoUI.button("REVEAL ALL", 190, 28, this.onRevealAll, false, 13);
            this._revealAll.x = 10;
            this._revealAll.y = 182;
            p.addChild(this._revealAll);
            p.addChild(CasinoUI.at(CasinoUI.label("THREE OF A KIND PAYS", 11, CasinoUI.EMBER, true, 190), 12, 220));
            var prizes:Array = this.prizes();
            i = 0;
            while (i < prizes.length) {
                var row:Sprite = p.addChild(new Sprite()) as Sprite;
                row.x = 12;
                row.y = 238 + i * 22;
                CasinoUI.picture(row, "casino/scratch/symbol_" + prizes[i].symbol + ".png", 0, 0, 20, 20);
                row.addChild(CasinoUI.at(CasinoUI.label(NAMES[prizes[i].symbol] || prizes[i].symbol, 11, 0xE8DCC8, false, 120), 26, 1));
                row.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.mult(Number(prizes[i].pays)), 11, CasinoUI.GOLD, true, 50, TextFormatAlign.RIGHT), 136, 1));
                i++;
            }
            // the table the card lies on
            var table:Sprite = this.addChild(new Sprite()) as Sprite;
            table.x = 220;
            table.addChild(CasinoUI.panel(480, 400, 1));
            CasinoUI.picture(table, "casino/magmadrop/board_bg.jpg", 3, 3, 474, 394, function(b:Bitmap):void {
                    b.alpha = 0.55;
                    table.setChildIndex(b, Math.min(1, table.numChildren - 1)); // (behind what is drawn on it)
                });
            this._ticketName = CasinoUI.label("", 13, CasinoUI.GOLD, true, CARD, TextFormatAlign.CENTER);
            this._ticketName.x = CARD_X;
            this._ticketName.y = CARD_Y - 30;
            this.addChild(this._ticketName);
            // the card: its art, the symbols under the coating, the coating
            this._card = this.addChild(new Sprite()) as Sprite;
            this._card.name = "casinoScratchCard";
            this._card.x = CARD_X;
            this._card.y = CARD_Y;
            this._card.graphics.beginFill(0x000000, 0.01);
            this._card.graphics.drawRect(0, 0, CARD, CARD);
            this._card.graphics.endFill();
            this._card.filters = [new GlowFilter(0xFF6A00, 0.5, 18, 18, 2, 2)];
            this._cardArt = this._card.addChild(new Sprite()) as Sprite;
            this._symbols = this._card.addChild(new Sprite()) as Sprite;
            this._symbols.x = this._symbols.y = EDGE;
            i = 0;
            while (i < 9) {
                var cell:Sprite = this._symbols.addChild(new Sprite()) as Sprite;
                cell.name = "casinoCell:" + i;
                cell.x = (i % 3) * CELL + CELL / 2;
                cell.y = int(i / 3) * CELL + CELL / 2;
                this._cells.push(cell);
                i++;
            }
            this._coating = new BitmapData(AREA, AREA, true, 0);
            this._coatingBitmap = new Bitmap(this._coating);
            this._coatingBitmap.x = this._coatingBitmap.y = EDGE;
            this._card.addChild(this._coatingBitmap);
            this._hint = CasinoUI.label("", 13, 0xFFFFFF, true, AREA, TextFormatAlign.CENTER);
            this._hint.filters = [new GlowFilter(0, 1, 4, 4, 6, 1)];
            this._hint.x = EDGE;
            this._hint.y = EDGE + AREA / 2 - 10;
            this._card.addChild(this._hint);
            this._stamp = this.addChild(new Sprite()) as Sprite;
            this._stamp.mouseEnabled = this._stamp.mouseChildren = false;
            this._stamp.x = CARD_X + CARD / 2;
            this._stamp.y = CARD_Y + CARD + 24;
            this._brush = new Shape();
            this._brush.graphics.beginFill(0xFFFFFF, 1);
            this._brush.graphics.drawCircle(0, 0, BRUSH);
            this._brush.graphics.endFill();
            this._card.addEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            this._card.addEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
            this._card.addEventListener(MouseEvent.MOUSE_UP, this.onUp);
            this._card.addEventListener(MouseEvent.ROLL_OUT, this.onUp);
            // the pictures, fetched now so a card shows at once
            var k:String = null;
            for each (k in TIERS) {
                ImageCache.GetImageWithCallBack("casino/scratch/coating_" + k + ".png", this.coatingLoaded, true, 1, "", [k]);
            }
            for each (var pr:Object in prizes) {
                ImageCache.GetImageWithCallBack("casino/scratch/symbol_" + pr.symbol + ".png", function(key:String, bmd:BitmapData, args:Array = null):void {
                    });
            }
            this.setTier("bone");
        }

        private function coatingLoaded(key:String, bmd:BitmapData, args:Array = null):void {
            if (!bmd || !args || this._disposed) {
                return;
            }
            this._coatings[args[0]] = bmd;
            if (this._revealed && !this._ticket && args[0] == this._tier) {
                this.cover();
            }
        }

        private function prizes():Array {
            var st:Object = CASINO.state;
            return st && st.rules && st.rules.scratch ? st.rules.scratch.prizes as Array : [];
        }

        private function tierRules(id:String):Object {
            var st:Object = CASINO.state;
            return st && st.rules && st.rules.scratch && st.rules.scratch.tiers ? st.rules.scratch.tiers[id] : null;
        }

        private function tierPrice(id:String):int {
            var t:Object = this.tierRules(id);
            return t ? int(t.price) : 0;
        }

        private function tierOpen(id:String):Boolean {
            var t:Object = this.tierRules(id);
            var level:int = CASINO.state ? int(CASINO.state.level) : 0;
            return t != null && level >= int(t.level);
        }

        private function tierClick(id:String):Function {
            return function(e:MouseEvent):void {
                if (!tierOpen(id)) {
                    var t:Object = tierRules(id);
                    _win.message(id.charAt(0).toUpperCase() + id.substr(1) + " tickets are sold from Pit level " + (t ? int(t.level) : 3) + ".", CasinoUI.ASH);
                    SOUNDS.Play("error1");
                    return;
                }
                if (_ticket && !_revealed) {
                    _win.message("Scratch the card you have first.", CasinoUI.ASH);
                    return;
                }
                setTier(id);
            };
        }

        private function setTier(id:String):void {
            this._tier = id;
            var k:String = null;
            for (k in this._tierButtons) {
                CasinoUI.choose(this._tierButtons[k], k == id);
                this._tierButtons[k].alpha = this.tierOpen(k) ? 1 : 0.45;
            }
            this._ticketName.text = id.toUpperCase() + " TICKET  -  " + this.tierPrice(id) + " SHINY";
            CasinoUI.removeAll(this._cardArt);
            CasinoUI.picture(this._cardArt, "casino/scratch/card_" + id + ".png", 0, 0, CARD, CARD);
            if (!this._ticket || this._revealed) {
                this.clearCard();
                this.cover();
                this._hint.text = "BUY A TICKET";
            }
        }

        /** The card covered again with its tier's coating. */
        private function cover():void {
            if (this._disposed) {
                return;
            }
            this._coating.fillRect(this._coating.rect, 0);
            var src:BitmapData = this._coatings[this._tier];
            if (src) {
                var m:Matrix = new Matrix();
                m.scale(AREA / src.width, AREA / src.height);
                this._coating.draw(src, m, null, null, null, true);
            }
            else {
                this._coating.fillRect(this._coating.rect, 0xFF8A8078);
            }
            this._coatingBitmap.alpha = 1;
            this._fading = 0;
            this._scratched = [];
            var i:int = 0;
            while (i < GRID * GRID) {
                this._scratched.push(false);
                i++;
            }
            this._scratchedCount = 0;
        }

        private function clearCard():void {
            var c:Sprite = null;
            for each (c in this._cells) {
                CasinoUI.removeAll(c);
                c.graphics.clear();
                c.filters = [];
            }
            CasinoUI.removeAll(this._stamp);
        }

        private function onBuy(e:MouseEvent = null):void {
            var st:Object = CASINO.state;
            if (!st || st.closed || st.shiny_locked) {
                this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
                return;
            }
            if (this._buying || (this._ticket && !this._revealed)) {
                return;
            }
            if (!this.tierOpen(this._tier)) {
                return;
            }
            var price:int = this.tierPrice(this._tier);
            if (CASINO.credits() < price) {
                this._win.message("You do not have enough Shiny for that ticket.", CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            this._buying = true;
            CASINO.setCredits(CASINO.credits() - price);
            this._ticket = null;
            this.clearCard();
            this.cover();
            this._hint.text = "...";
            var tier:String = this._tier;
            CASINO.scratch(tier, function(r:Object):void {
                    _buying = false;
                    if (!parent) {
                        return;
                    }
                    if (r.error) {
                        CASINO.setCredits(CASINO.credits() + price);
                        _hint.text = "BUY A TICKET";
                        _win.message(String(r.error), CasinoUI.LOSS);
                        SOUNDS.Play("error1");
                        return;
                    }
                    _serverCredits = int(r.credits);
                    deal(r);
                });
        }

        /** The card the server drew, under its coating. */
        private function deal(r:Object):void {
            this._ticket = r;
            this._revealed = false;
            this._hint.text = "";
            var grid:Array = r.grid as Array;
            var i:int = 0;
            while (i < 9 && grid) {
                CasinoUI.picture(this._cells[i], "casino/scratch/symbol_" + grid[i] + ".png", -SYMBOL / 2, -SYMBOL / 2, SYMBOL, SYMBOL);
                i++;
            }
            SOUNDS.Play("purchasepopup");
            this._win.message("Scratch the card!", CasinoUI.GOLD);
        }

        private function onDown(e:MouseEvent):void {
            if (!this._ticket || this._revealed) {
                return;
            }
            this._scratching = true;
            this._lastX = this._card.mouseX - EDGE;
            this._lastY = this._card.mouseY - EDGE;
            this.scratchAt(this._lastX, this._lastY);
            this.checkProgress();
        }

        private function onMove(e:MouseEvent):void {
            if (!this._scratching || !this._ticket || this._revealed) {
                return;
            }
            if (!e.buttonDown) {
                this._scratching = false;
                return;
            }
            var x:Number = this._card.mouseX - EDGE;
            var y:Number = this._card.mouseY - EDGE;
            var dx:Number = x - this._lastX;
            var dy:Number = y - this._lastY;
            var d:Number = Math.sqrt(dx * dx + dy * dy);
            var steps:int = Math.max(1, Math.ceil(d / (BRUSH * 0.4)));
            var s:int = 1;
            while (s <= steps) {
                this.scratchAt(this._lastX + dx * s / steps, this._lastY + dy * s / steps);
                s++;
            }
            this._lastX = x;
            this._lastY = y;
            this.checkProgress();
        }

        private function onUp(e:MouseEvent):void {
            this._scratching = false;
        }

        /** Rubs the coating off in a circle at (x, y) of the scratch area. */
        private function scratchAt(x:Number, y:Number):void {
            var m:Matrix = new Matrix();
            m.translate(x, y);
            this._coating.draw(this._brush, m, null, BlendMode.ERASE, new Rectangle(x - BRUSH - 1, y - BRUSH - 1, BRUSH * 2 + 2, BRUSH * 2 + 2));
            // the grid points under the brush
            var step:Number = AREA / GRID;
            var gx0:int = Math.max(0, Math.floor((x - BRUSH) / step));
            var gx1:int = Math.min(GRID - 1, Math.ceil((x + BRUSH) / step));
            var gy0:int = Math.max(0, Math.floor((y - BRUSH) / step));
            var gy1:int = Math.min(GRID - 1, Math.ceil((y + BRUSH) / step));
            var r2:Number = BRUSH * BRUSH;
            var gy:int = gy0;
            while (gy <= gy1) {
                var gx:int = gx0;
                while (gx <= gx1) {
                    var px:Number = (gx + 0.5) * step - x;
                    var py:Number = (gy + 0.5) * step - y;
                    if (px * px + py * py <= r2) {
                        var k:int = gy * GRID + gx;
                        if (!this._scratched[k]) {
                            this._scratched[k] = true;
                            ++this._scratchedCount;
                        }
                    }
                    gx++;
                }
                gy++;
            }
        }

        /** How much of the coating is gone (0 to 1). */
        public function get scratched():Number {
            return this._scratchedCount / (GRID * GRID);
        }

        private function checkProgress():void {
            if (this.scratched >= AUTO_REVEAL) {
                this.reveal();
            }
        }

        private function onRevealAll(e:MouseEvent = null):void {
            if (this._ticket && !this._revealed) {
                this.reveal();
            }
        }

        /** The whole card shown, and its prize. */
        private function reveal():void {
            if (!this._ticket || this._revealed) {
                return;
            }
            this._revealed = true;
            this._scratching = false;
            this._fading = 12;
            var r:Object = this._ticket;
            var payout:int = int(r.payout);
            var price:int = int(r.price);
            CASINO.setCredits(CASINO.credits() + payout);
            if (!this._buying && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            var label:TextField;
            if (r.prize) {
                var cells:Array = r.cells as Array;
                for each (var c:int in cells) {
                    // a hot tile behind the three that match
                    var cell:Sprite = this._cells[c];
                    cell.graphics.lineStyle(2, 0xFFE0A0, 1);
                    cell.graphics.beginFill(0xFF8A20, 0.45);
                    cell.graphics.drawRoundRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 12, 12);
                    cell.graphics.endFill();
                    cell.filters = [new GlowFilter(0xFFD040, 1, 18, 18, 3, 2)];
                }
                label = CasinoUI.title("WIN " + CasinoUI.number(payout) + " SHINY!", 26, 360);
                this._win.message("Three " + (NAMES[r.prize] || r.prize) + ": " + CasinoUI.mult(Number(r.multiplier)) + ", +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
                SOUNDS.Play(Number(r.multiplier) >= 10 ? "chaching" : "purchasepopup");
                this._win.bigWin(payout, int(r.price));
            }
            else {
                label = CasinoUI.label("NO WIN - TRY ANOTHER", 16, CasinoUI.ASH, true, 360, TextFormatAlign.CENTER);
                this._win.message("No three of a kind on this one.", CasinoUI.ASH);
            }
            label.x = -180;
            label.y = -16;
            CasinoUI.removeAll(this._stamp);
            this._stamp.addChild(label);
            this._stamp.scaleX = this._stamp.scaleY = 1.6;
            this._stamp.alpha = 0;
            this._pulse = 0;
        }

        public function tick():void {
            if (this._disposed) {
                return;
            }
            if (this._fading > 0) {
                this._fading--;
                this._coatingBitmap.alpha = this._fading / 12;
                if (this._fading == 0) {
                    this._coating.fillRect(this._coating.rect, 0);
                    this._coatingBitmap.alpha = 1;
                }
            }
            if (this._stamp.numChildren > 0 && this._stamp.alpha < 1) {
                this._stamp.alpha = Math.min(1, this._stamp.alpha + 0.12);
                this._stamp.scaleX = this._stamp.scaleY = Math.max(1, this._stamp.scaleX - 0.08);
            }
            if (this._ticket && this._revealed && this._ticket.prize) {
                this._pulse++;
                var a:Number = 0.6 + 0.4 * Math.sin(this._pulse / 5);
                for each (var c:int in this._ticket.cells) {
                    this._cells[c].filters = [new GlowFilter(0xFFD040, a, 18, 18, 3, 2)];
                }
            }
            var busy:Boolean = this._buying || (this._ticket != null && !this._revealed);
            CasinoUI.enable(this._buy, !busy && this.tierOpen(this._tier));
            CasinoUI.enable(this._revealAll, this._ticket != null && !this._revealed);
        }

        public function get showing():Boolean {
            return this._buying || (this._ticket != null && !this._revealed);
        }

        public function dispose():void {
            // a card left unscratched: its prize is already paid
            if (this._ticket && !this._revealed && this._serverCredits >= 0) {
                CASINO.setCredits(this._serverCredits);
            }
            this._card.removeEventListener(MouseEvent.MOUSE_DOWN, this.onDown);
            this._card.removeEventListener(MouseEvent.MOUSE_MOVE, this.onMove);
            this._card.removeEventListener(MouseEvent.MOUSE_UP, this.onUp);
            this._card.removeEventListener(MouseEvent.ROLL_OUT, this.onUp);
            this._disposed = true;
            this._coating.dispose();
            if (this.parent) {
                this.parent.removeChild(this);
            }
        }
    }
}
