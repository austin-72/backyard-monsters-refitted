package com.monsters.daily {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.display.Shape;
    import flash.display.GradientType;
    import flash.geom.Matrix;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only daily login reward popup (opened from the Daily Reward button, the gift button's place
     * in the top bar). Fourteen day tiles in two rows on the stock popup frame: collected days are faded with a
     * green tick, today's reward glows, every 7th day is a big one (100 Shiny; the 14th 200). The streak keeps
     * counting past 14, and the tiles then show days 15-28, and so on. Art: assets/popups/daily/tile[7]-{done,today,future}.png;
     * day labels and amounts are live text, so they follow InfernoOnlyConfig.dailyLogin.
     * Server: services/user/dailyLogin.ts (flag io_streak, POST dailyreward/collect).
     */
    public class IoDailyPopup {

        private static const BG_W:int = 660;

        /** Two rows of tiles: a 14-day stretch, a week per row. */
        private static const BG_H:int = 318 + 104 + 8;

        private static const ROW_GAP:int = 8;

        private static const TILE_W:int = 80;

        private static const TILE7_W:int = 128;

        private static const TILE_H:int = 104;

        /** Tiles overlap by their transparent glow margins. */
        private static const TILE_GAP:int = -4;

        private static var _open:IoDailyPopup = null;

        private var _mc:MovieClip;

        private var _status:Object;

        private var _tiles:Sprite;

        private var _subtitle:TextField;

        private var _button:Button_CLIP;

        private var _busy:Boolean = false;

        public static function Show(status:Object):void {
            if (_open) {
                _open.close();
            }
            _open = new IoDailyPopup(status);
        }

        public function IoDailyPopup(status:Object) {
            super();
            this._status = status;
            this._mc = new MovieClip();

            var frameX:int = -int(BG_W / 2);
            var frameY:int = -int(BG_H / 2);

            var frame:frame_CLIP = this._mc.addChild(new frame_CLIP()) as frame_CLIP;
            frame.width = BG_W;
            frame.height = BG_H;
            frame.x = frameX;
            frame.y = frameY;
            frame.Setup(true, this.close);

            var title:TextField = this._mc.addChild(this.text("Groboldov", 26, 0xFFFFFF, true)) as TextField;
            title.width = BG_W - 60;
            title.height = 38;
            title.text = "DAILY REWARD";
            title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
            title.x = frameX + 30;
            title.y = frameY + 22;

            this._subtitle = this._mc.addChild(this.text("Verdana", 12, 0x46321E, false)) as TextField;
            this._subtitle.width = BG_W - 60;
            this._subtitle.height = 20;
            this._subtitle.x = frameX + 30;
            this._subtitle.y = frameY + 66;

            this._tiles = this._mc.addChild(new Sprite()) as Sprite;
            this._tiles.y = frameY + 92;

            this._button = this._mc.addChild(new Button_CLIP()) as Button_CLIP;
            this._button.addEventListener(MouseEvent.CLICK, this.onButton);

            this.render();

            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this._mc);
            POPUPSETTINGS.AlignToCenter(this._mc);
            POPUPSETTINGS.ScaleUp(this._mc);
        }

        private function get waiting():Boolean {
            return int(this._status.collected) != 1;
        }

        /** What collecting on day `d` of a streak pays (server: dailyLogin.ts payoutFor). */
        private function payoutFor(d:int):int {
            var cycle:int = Math.max(1, int(this._status.streakDays));
            var week:int = Math.max(1, int(this._status.weekDays || 7));
            if (d % cycle == 0) {
                return int(this._status.streakShiny);
            }
            if (d % week == 0) {
                return int(this._status.weekShiny);
            }
            return int(this._status.shiny);
        }

        private function render():void {
            var cycle:int = Math.max(1, int(this._status.streakDays));
            var week:int = Math.max(1, int(this._status.weekDays || 7));
            var done:int = int(this._status.day);
            var today:int = this.waiting ? int(this._status.offerDay) : -1;
            // Amounts come with the streak from the server; an older server does not send them, and then only
            // today's amount is known (never show "+0").
            var known:Boolean = this._status.shiny !== undefined && this._status.streakShiny !== undefined && this._status.weekShiny !== undefined;

            // The streak counts on without end; the tiles show the 14-day stretch it is in (15-28, ...).
            var focus:int = this.waiting ? today : Math.max(1, done);
            var first:int = int((focus - 1) / cycle) * cycle + 1;
            var next:int = focus;
            while (next % week != 0) {
                next++;
            }
            if (this.waiting) {
                this._subtitle.text = "Day " + today + ": collect " + int(this._status.offerShiny) + " Shiny!" + (known && next != today ? "  Keep going: day " + next + " pays " + this.payoutFor(next) + "." : "");
            }
            else {
                this._subtitle.text = "Day " + done + " collected. Come back tomorrow for day " + (done + 1) + (known ? " (" + this.payoutFor(done + 1) + " Shiny)" : "") + ". Miss a day and it starts again.";
            }

            while (this._tiles.numChildren > 0) {
                this._tiles.removeChildAt(0);
            }
            // One row per week, the week's last day the big card.
            var rowWidth:int = (week - 1) * (TILE_W + TILE_GAP) + TILE7_W;
            var d:int = first;
            while (d < first + cycle) {
                var col:int = (d - first) % week;
                var row:int = int((d - first) / week);
                var x:int = -int(rowWidth / 2) + col * (TILE_W + TILE_GAP);
                var big:Boolean = d % week == 0;
                var state:String = d <= done ? "done" : (d == today ? "today" : "future");
                var amount:int = d == today ? int(this._status.offerShiny) : (known ? this.payoutFor(d) : 0);
                this.addTile(x, row * (TILE_H + ROW_GAP), d, big, state, amount);
                d++;
            }

            this._button.Setup(this.waiting ? "Collect" : "OK", false, 150, 34);
            this._button.Highlight = this.waiting;
            this._button.x = -75;
            this._button.y = int(BG_H / 2) - 34 - 26;
        }

        private function addTile(x:int, y:int, day:int, last:Boolean, state:String, amount:int):void {
            var w:int = last ? TILE7_W : TILE_W;
            var holder:Sprite = this._tiles.addChild(new Sprite()) as Sprite;
            holder.x = x;
            holder.y = y;
            // The card artwork is built into the game (io_daily_tile*), so it is always there.
            var art:BitmapData = tileArt(last, state);
            if (art) {
                holder.addChild(new Bitmap(art));
            }
            else {
                holder.addChild(this.drawCard(w, state));
            }

            var label:TextField = holder.addChild(this.text("Groboldov", 12, state == "today" ? 0x7A3A06 : 0x5A3C1E, true)) as TextField;
            label.width = w;
            label.height = 18;
            label.y = 10;
            label.text = "Day " + day;

            var value:TextField = holder.addChild(this.text("Groboldov", 15, 0xFFFFFF, true)) as TextField;
            value.width = w;
            value.height = 22;
            value.y = TILE_H - 32;
            value.text = amount > 0 ? "+" + amount : "";
            value.filters = [new GlowFilter(0x5A320A, 1, 3, 3, 8, 2)];
            if (state == "done") {
                value.alpha = 0.7;
            }
        }

        private static function tileArt(last:Boolean, state:String):BitmapData {
            if (last) {
                return state == "done" ? new io_daily_tile7_done(0, 0) : (state == "today" ? new io_daily_tile7_today(0, 0) : new io_daily_tile7_future(0, 0));
            }
            return state == "done" ? new io_daily_tile_done(0, 0) : (state == "today" ? new io_daily_tile_today(0, 0) : new io_daily_tile_future(0, 0));
        }

        private function tileLoaded(key:String, image:BitmapData, args:Array):void {
            var holder:Sprite = args[0] as Sprite;
            if (holder && holder.parent && image) {
                // Replace the drawn card (child 0) with the artwork, under the text.
                holder.removeChildAt(0);
                holder.addChildAt(new Bitmap(image), 0);
            }
        }

        /** A day card drawn in code, matching the tile artwork (used until, or instead of, the artwork). */
        private function drawCard(w:int, state:String):Shape {
            var card:Shape = new Shape();
            var pad:int = 6;
            var cw:int = w - pad * 2;
            var ch:int = TILE_H - pad * 2;
            var matrix:Matrix = new Matrix();
            matrix.createGradientBox(cw, ch, Math.PI / 2, pad, pad);
            var colors:Array = state == "today" ? [0xFDECB2, 0xF3C976] : (state == "done" ? [0xDED4B0, 0xCCBF96] : [0xE8DEBA, 0xD6C79B]);
            var border:uint = state == "today" ? 0xD66A16 : (state == "done" ? 0x8C7654 : 0x805C38);
            card.graphics.lineStyle(state == "today" ? 3 : 2, border);
            card.graphics.beginGradientFill(GradientType.LINEAR, colors, [1, 1], [0, 255], matrix);
            card.graphics.drawRoundRect(pad, pad, cw, ch, 20, 20);
            card.graphics.endFill();
            if (state == "today") {
                card.filters = [new GlowFilter(0xFF8C1E, 0.9, 14, 14, 2, 2)];
            }
            else if (state == "done") {
                // green tick badge, top right
                card.graphics.lineStyle(2, 0x265A1C);
                card.graphics.beginFill(0x4CA03A);
                card.graphics.drawCircle(w - 9, 9, 8);
                card.graphics.endFill();
                card.graphics.lineStyle(3, 0xFFFFFF);
                card.graphics.moveTo(w - 13, 9);
                card.graphics.lineTo(w - 10, 12);
                card.graphics.lineTo(w - 4, 5);
            }
            return card;
        }

        private function text(font:String, size:int, color:uint, embedded:Boolean):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.embedFonts = embedded;
            field.antiAliasType = AntiAliasType.NORMAL;
            var format:TextFormat = new TextFormat(font, size, color, !embedded);
            format.align = TextFormatAlign.CENTER;
            field.defaultTextFormat = format;
            return field;
        }

        private function onButton(e:MouseEvent):void {
            if (!this.waiting) {
                this.close();
                return;
            }
            if (this._busy) {
                return;
            }
            this._busy = true;
            this._button.Setup("Collecting...", false, 150, 34);
            new URLLoaderApi().load(GLOBAL.serverUrl + "dailyreward/collect", [["collect", 1]], this.onCollected, this.onFailed);
        }

        private function onCollected(serverData:Object):void {
            this._busy = false;
            if (serverData && serverData.error == 0) {
                BASE._credits.Set(int(serverData.credits));
                BASE._hpCredits = int(serverData.credits);
                GLOBAL._credits.Set(int(serverData.credits));
                if (serverData.status) {
                    GLOBAL._flags.io_streak = JSON.stringify(serverData.status);
                    this._status = serverData.status;
                }
                SOUNDS.Play("click1");
                if (this._mc) {
                    this.render();
                    this._subtitle.text = "You collected " + int(serverData.shiny) + " Shiny! " + this._subtitle.text;
                    GLOBAL.ioFitText(this._subtitle, 9); // (the longer line ran past the window's edge)
                }
                return;
            }
            if (this._mc) {
                this.render();
            }
            GLOBAL.Message(serverData && serverData.message ? String(serverData.message) : "The reward could not be collected right now.");
        }

        private function onFailed(e:Event):void {
            this._busy = false;
            if (this._mc) {
                this.render();
            }
            GLOBAL.Message("The reward could not be collected right now. Please try again in a moment.");
        }

        public function close(e:MouseEvent = null):void {
            if (!this._mc) {
                return;
            }
            SOUNDS.Play("close");
            GLOBAL.BlockerRemove();
            if (this._mc.parent) {
                this._mc.parent.removeChild(this._mc);
            }
            this._mc = null;
            if (_open == this) {
                _open = null;
            }
        }
    }
}
