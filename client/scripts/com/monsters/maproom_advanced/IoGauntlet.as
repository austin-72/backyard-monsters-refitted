package com.monsters.maproom_advanced {
    import com.cc.utils.SecNum;
    import com.monsters.display.ImageCache;
    import com.monsters.enums.EnumYardType;
    import com.monsters.managers.InstanceManager;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.GradientType;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.filters.DropShadowFilter;
    import flash.filters.GlowFilter;
    import flash.geom.Matrix;
    import flash.text.AntiAliasType;
    import flash.text.TextField;
    import flash.text.TextFormat;
    import flash.text.TextFormatAlign;

    /**
     * Inferno-only: Moloch's Gauntlet, the monthly event (server: services/events/gauntlet.ts).
     *
     * A ladder of Moloch yards fought from the main yard, not the map: its button sits with the top bar's
     * icons on the main yard (UI_TOP.ioGauntletButton). While it is closed the button says only when it
     * starts. The window ("The Descent") shows the 13 gates winding down into the fire, Moloch beside them,
     * and the gate chosen (the one to fight, at first) with its prize and the attempts left, before the
     * player attacks. Admin test mode plays a test ladder of its own, always open. The attack
     * is an ordinary Map Room 2 attack (wmattack) on the player's own copy of the yard, with the monsters
     * housed in the main yard and its flinger: the server sends the main yard as the map describes it
     * (`home`), and the game uses it the way an attack from the map uses a yard in range.
     *
     * During the attack a bar shows how much of the yard is destroyed and the line to reach. The attack's end
     * sends the player home, where the window opens again with what the attack did (the server's `last`).
     */
    public class IoGauntlet {

        private static var _open:IoGauntlet = null;

        /** The stage being attacked (0: not in a Gauntlet attack). */
        public static var attackStage:int = 0;

        private static var _winPercent:int = 90;

        /** Open the window once the main yard has loaded again (after a Gauntlet attack). */
        private static var _showOnHome:Boolean = false;

        /** The server's last result already shown (its time). */
        private static var _shownResult:Number = 0;

        private static var _bar:Sprite = null;

        private var _mc:MovieClip;

        private var _status:Object;

        // ---- the button's state (flag io_gauntlet)

        /** {open, closesAt, opensAt, stage, stages} or null. */
        public static function flag():Object {
            try {
                return GLOBAL._flags && GLOBAL._flags.io_gauntlet ? JSON.parse(String(GLOBAL._flags.io_gauntlet)) : null;
            }
            catch (e:Error) {
            }
            return null;
        }

        /** A Gauntlet yard's baseid: 15 digits starting with 9 (server: gauntletBaseId). */
        public static function isGauntletBase(baseid:Number):Boolean {
            return baseid >= 900000000000000 && baseid < 1000000000000000;
        }

        /** In an attack on a Gauntlet yard now. */
        public static function inAttack():Boolean {
            return attackStage > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK) && isGauntletBase(BASE._loadedBaseID);
        }

        // ---- the window

        /** Opens the window (loads the ladder from the server first). */
        public static function Show(e:MouseEvent = null):void {
            if (_open && (!_open._mc || !_open._mc.stage)) {
                _open = null;
            }
            if (_open) {
                return;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while your yard is being attacked.");
                return;
            }
            if (e) {
                SOUNDS.Play("click1");
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            new URLLoaderApi().load(GLOBAL.serverUrl + "gauntlet/status", [["v", "1"]], function(response:Object):void {
                    PLEASEWAIT.Hide();
                    if (!response || response.error) {
                        GLOBAL.Message(response && response.error ? String(response.error) : "Moloch's Gauntlet could not be loaded. Please try again.");
                        return;
                    }
                    if (!response.enabled) {
                        GLOBAL.Message("Moloch's Gauntlet is not running on this server.");
                        return;
                    }
                    if (BASE.ioAttackRunning() || _open || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                        return;
                    }
                    if (!response.open && !response.test) {
                        // Not running now: when it starts, and nothing else.
                        GLOBAL.Message(startsText(response, Number(response.now) || GLOBAL.Timestamp()));
                        return;
                    }
                    _open = new IoGauntlet(response);
                }, function(e:IOErrorEvent):void {
                    PLEASEWAIT.Hide();
                    GLOBAL.Message("Moloch's Gauntlet could not be loaded. Please try again.");
                });
        }

        /** The main yard loaded (BASE): after a Gauntlet attack, the window again with the result. */
        public static function AfterHome():void {
            attackStage = 0;
            removeBar();
            if (_showOnHome && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
                _showOnHome = false;
                Show();
            }
        }

        // ---- the window: "The Descent" (13 gates winding down into the fire, Moloch beside them)

        private static const W:int = 740;

        private static const H:int = 530;

        /** The gates' names, I to XIII. */
        private static const GATE_NAMES:Array = ["The Ashen Gate", "The Bone Moat", "The Cinder Wall", "The Iron Maw", "The Weeping Spires", "The Sulfur Pits", "The Chained Host", "The Blood Forge", "The Howling Keep", "The Obsidian Crown", "The Pyre of Kings", "The Last Bastion", "Moloch's Throne"];

        private static const LORE:String = "Once each moon, Moloch throws open the gates of his Gauntlet. Thirteen strongholds stand between you and his hoard, each crueler than the last. Break them, and his treasures are yours.\n\nFalter thrice at any gate, and the fires mend its walls — and the prize behind it is lost to you until the next moon.";

        /** Where the gates sit: three to a row, winding down (left to right, then back). */
        private static const GATE_X:Array = [-290, -185, -80];

        private static const GATE_TOP:int = -14;

        private static const GATE_ROW:int = 56;

        private static const GATE_R:int = 21;

        private var _gates:Array = [];

        private var _selected:int = 0;

        private var _detail:Sprite;

        private var _embers:Array = [];

        private var _emberLayer:Sprite;

        private var _moloch:Sprite;

        private var _tick:int = 0;

        public function IoGauntlet(status:Object) {
            super();
            this._status = status;
            _winPercent = int(status.winPercent) || 90;
            var stages:Array = status.stages as Array || [];
            var left:int = -int(W * 0.5);
            var top:int = -int(H * 0.5);
            var result:String = this.resultText();

            this._mc = new MovieClip();
            this._mc.name = "ioGauntletWindow";
            this.drawBackground(left, top);

            // embers drifting up over everything but the text
            this._emberLayer = this._mc.addChild(new Sprite()) as Sprite;
            this._emberLayer.mouseEnabled = false;
            this._emberLayer.mouseChildren = false;
            var emberMask:Shape = this._mc.addChild(new Shape()) as Shape;
            emberMask.graphics.beginFill(0xFF0000, 1);
            emberMask.graphics.drawRoundRect(left + 6, top + 6, W - 12, H - 12, 20, 20);
            emberMask.graphics.endFill();
            this._emberLayer.mask = emberMask;
            for (var e:int = 0; e < 34; e++) {
                this._embers.push(this.newEmber(true));
            }

            // Moloch, looming on the right
            this._moloch = this._mc.addChild(new Sprite()) as Sprite;
            this._moloch.x = 210;
            this._moloch.y = -60;
            this._moloch.mouseEnabled = false;
            var moloch:Sprite = this._moloch;
            ImageCache.GetImageWithCallBack("popups/tribe_moloch.png", function(key:String, bmd:BitmapData, args:Array = null):void {
                    var picture:Bitmap = new Bitmap(bmd);
                    picture.smoothing = true;
                    picture.height = 250;
                    picture.scaleX = picture.scaleY;
                    picture.x = -int(picture.width * 0.5);
                    picture.y = -int(picture.height * 0.5);
                    moloch.addChild(picture);
                });

            // the title, and how long the gates stay open
            var title:TextField = this._mc.addChild(label("MOLOCH'S GAUNTLET", 28, 0xFFD58A, false, W, TextFormatAlign.CENTER, "Groboldov")) as TextField;
            title.embedFonts = true;
            title.height = 40;
            title.filters = [new GlowFilter(0xFF4A00, 0.9, 12, 12, 2, 2), new DropShadowFilter(3, 45, 0, 0.8, 4, 4, 1, 2)];
            title.x = left;
            title.y = top + 16;
            var when:TextField = this._mc.addChild(label(this.whenText(), 12, 0xF0A868, false, W, TextFormatAlign.CENTER)) as TextField;
            when.name = "ioGauntletWhen";
            when.filters = [new GlowFilter(0, 1, 2, 2, 4, 1)];
            when.x = left;
            when.y = top + 54;
            var y:int = top + 78;

            // what the last attack did (once)
            if (result) {
                var banner:Sprite = this._mc.addChild(new Sprite()) as Sprite;
                var won:Boolean = this._status.last && this._status.last.result == "won";
                banner.graphics.lineStyle(1, won ? 0xE2B227 : 0x8A2A1A, 1);
                banner.graphics.beginFill(won ? 0x3A2206 : 0x2A0806, 0.92);
                banner.graphics.drawRoundRect(0, 0, W - 60, 28, 10, 10);
                banner.graphics.endFill();
                banner.x = left + 30;
                banner.y = y;
                var bannerText:TextField = banner.addChild(label("", 12, won ? 0xFFE08A : 0xF0B090, false, W - 76, TextFormatAlign.CENTER)) as TextField;
                bannerText.htmlText = result;
                bannerText.x = 8;
                bannerText.y = 5;
                y += 34;
                _shownResult = Number(this._status.last.at);
            }

            // the legend
            var lore:TextField = this._mc.addChild(label("", 12, 0xE8D2B0, false, 400, TextFormatAlign.LEFT, "Georgia", true)) as TextField;
            lore.name = "ioGauntletLore";
            lore.multiline = true;
            lore.wordWrap = true;
            lore.text = LORE;
            lore.height = 118;
            lore.x = left + 30;
            lore.y = y + 2;
            var numbers:TextField = this._mc.addChild(label(_winPercent + "% destroyed breaks a gate  ·  " + int(status.attempts) + " attempts at each  ·  the gates rise anew on the 1st", 10, 0xC08A5A, false, 400, TextFormatAlign.LEFT)) as TextField;
            numbers.name = "ioGauntletNumbers";
            numbers.x = lore.x;
            numbers.y = lore.y + lore.textHeight + 10;

            // the gates, winding down into the fire
            this.drawPath(stages);
            for (var i:int = 0; i < stages.length; i++) {
                var gate:Sprite = this.gateSprite(stages[i], i);
                this._gates.push(gate);
                this._mc.addChild(gate);
            }

            // the chosen gate: the one to fight (or the last)
            this._detail = this._mc.addChild(new Sprite()) as Sprite;
            this._detail.x = 72;
            this._detail.y = 72;
            this.select(Math.min(int(status.current), stages.length) - 1);

            // close
            var x:Sprite = this._mc.addChild(new Sprite()) as Sprite;
            x.name = "ioGauntletClose";
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
            x.x = -left - 24;
            x.y = top + 24;
            x.addEventListener(MouseEvent.CLICK, this.close);

            this._mc.addEventListener(Event.ENTER_FRAME, this.animate);
            GLOBAL.BlockerAdd(GLOBAL._layerTop);
            GLOBAL._layerTop.addChild(this._mc);
            POPUPSETTINGS.AlignToCenter(this._mc);
            POPUPSETTINGS.ScaleUp(this._mc);
        }

        /** Obsidian with a molten rim, cracks of lava, and Moloch's red glow. */
        private function drawBackground(left:int, top:int):void {
            var m:Matrix = new Matrix();
            var bg:Shape = this._mc.addChild(new Shape()) as Shape;
            m.createGradientBox(W, H, Math.PI / 2, left, top);
            bg.graphics.lineStyle(4, 0x0A0302, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, [0x2C0F09, 0x160605, 0x240804], [1, 1, 1], [0, 150, 255], m);
            bg.graphics.drawRoundRect(left, top, W, H, 26, 26);
            bg.graphics.endFill();
            // Moloch's glow
            var glow:Shape = this._mc.addChild(new Shape()) as Shape;
            m = new Matrix();
            m.createGradientBox(380, 380, 0, 210 - 190, -70 - 190);
            glow.graphics.beginGradientFill(GradientType.RADIAL, [0xFF3A0A, 0xB01A04, 0x400000], [0.5, 0.22, 0], [0, 120, 255], m);
            glow.graphics.drawCircle(210, -70, 190);
            glow.graphics.endFill();
            // the chasm the gates wind down into
            var chasm:Shape = this._mc.addChild(new Shape()) as Shape;
            m = new Matrix();
            m.createGradientBox(420, 330, Math.PI / 2, left + 22, 0);
            chasm.graphics.beginGradientFill(GradientType.LINEAR, [0x000000, 0x3A0A02], [0.35, 0.55], [0, 255], m);
            chasm.graphics.drawRoundRect(left + 22, -44, 420, 296, 18, 18);
            chasm.graphics.endFill();
            // lava cracks
            var cracks:Shape = this._mc.addChild(new Shape()) as Shape;
            cracks.graphics.lineStyle(2, 0xFF6A1A, 0.55);
            this.crack(cracks, left + 14, top + H - 14, 6, -1);
            this.crack(cracks, -left - 40, top + H - 20, 6, -1);
            this.crack(cracks, left + 12, top + 34, 4, 1);
            this.crack(cracks, -left - 14, top + 120, 5, 1);
            cracks.filters = [new GlowFilter(0xFF4A00, 0.8, 8, 8, 2, 2)];
            // the molten rim
            var rim:Shape = this._mc.addChild(new Shape()) as Shape;
            rim.graphics.lineStyle(2, 0xD2561C, 1);
            rim.graphics.drawRoundRect(left + 6, top + 6, W - 12, H - 12, 20, 20);
            rim.filters = [new GlowFilter(0xFF4A00, 0.75, 10, 10, 2, 2)];
        }

        /** A jagged crack from a point, going up (-1) or across (1). */
        private function crack(g:Shape, x:Number, y:Number, steps:int, across:int):void {
            g.graphics.moveTo(x, y);
            for (var s:int = 0; s < steps; s++) {
                x += across > 0 ? (x < 0 ? 10 : -10) + (s % 2 == 0 ? 4 : -3) : (s % 2 == 0 ? 7 : -5);
                y += across > 0 ? (s % 2 == 0 ? 6 : -4) : -9 - (s % 3) * 2;
                g.graphics.lineTo(x, y);
            }
        }

        private static function gatePos(index:int):Array {
            var row:int = int(index / 3);
            var col:int = index % 3;
            if (row % 2 == 1) {
                col = 2 - col;
            }
            return [GATE_X[col], GATE_TOP + row * GATE_ROW];
        }

        /** The lava path from gate to gate: bright where it has been walked, dim ahead. */
        private function drawPath(stages:Array):void {
            var path:Shape = this._mc.addChild(new Shape()) as Shape;
            var lit:Shape = this._mc.addChild(new Shape()) as Shape;
            var current:int = int(this._status.current);
            for (var i:int = 0; i < stages.length - 1; i++) {
                var a:Array = gatePos(i);
                var b:Array = gatePos(i + 1);
                var walked:Boolean = i + 2 <= current;
                for each (var layer:Array in [[path, 9, 0x1A0402, 1], [walked ? lit : path, 3, walked ? 0xFFB040 : 0x6A2410, 1]]) {
                    var s:Shape = layer[0];
                    s.graphics.lineStyle(layer[1], layer[2], layer[3]);
                    s.graphics.moveTo(a[0], a[1]);
                    if (a[1] == b[1]) {
                        s.graphics.lineTo(b[0], b[1]);
                    }
                    else {
                        var out:int = a[0] > -185 ? 52 : -52;
                        s.graphics.curveTo(a[0] + out, (a[1] + b[1]) * 0.5, b[0], b[1]);
                    }
                }
            }
            lit.filters = [new GlowFilter(0xFF6A00, 0.9, 8, 8, 2, 2)];
        }

        private static function roman(n:int):String {
            var values:Array = [10, 9, 5, 4, 1];
            var letters:Array = ["X", "IX", "V", "IV", "I"];
            var out:String = "";
            for (var i:int = 0; i < values.length; i++) {
                while (n >= values[i]) {
                    out += letters[i];
                    n -= values[i];
                }
            }
            return out;
        }

        /** One gate: sealed (dark), the one to fight (burning), or broken (cracked; its prize claimed or lost). */
        private function gateSprite(stage:Object, index:int):Sprite {
            var gate:Sprite = new Sprite();
            var pos:Array = gatePos(index);
            var n:int = int(stage.stage);
            var last:Boolean = index == (this._status.stages as Array).length - 1;
            var r:int = last ? GATE_R + 6 : GATE_R;
            var current:Boolean = n == int(this._status.current);
            var m:Matrix = new Matrix();
            gate.name = "ioGate" + n;
            gate.x = pos[0];
            gate.y = pos[1];
            gate.buttonMode = true;
            gate.mouseChildren = false;
            var g:Shape = gate.addChild(new Shape()) as Shape;
            if (last) {
                // the throne: a crown of spikes
                g.graphics.beginFill(current ? 0xFFB040 : (stage.won ? 0x8A6A4A : 0x5A1A0C), 1);
                for (var k:int = 0; k < 10; k++) {
                    var an:Number = k * Math.PI / 5;
                    g.graphics.moveTo(Math.cos(an - 0.16) * (r - 2), Math.sin(an - 0.16) * (r - 2));
                    g.graphics.lineTo(Math.cos(an) * (r + 9), Math.sin(an) * (r + 9));
                    g.graphics.lineTo(Math.cos(an + 0.16) * (r - 2), Math.sin(an + 0.16) * (r - 2));
                }
                g.graphics.endFill();
            }
            if (current && !stage.won) {
                m.createGradientBox(r * 2, r * 2, 0, -r, -r);
                g.graphics.lineStyle(2, 0xFFE0A0, 1);
                g.graphics.beginGradientFill(GradientType.RADIAL, [0xFFD27A, 0xE0501C, 0x6A1406], [1, 1, 1], [0, 140, 255], m);
                g.graphics.drawCircle(0, 0, r);
                g.graphics.endFill();
                g.filters = [new GlowFilter(0xFF6A00, 0.9, 14, 14, 2, 2)];
            }
            else if (stage.won) {
                g.graphics.lineStyle(2, 0x8A6A4A, 1);
                g.graphics.beginFill(0x2A1A16, 1);
                g.graphics.drawCircle(0, 0, r);
                g.graphics.endFill();
                // cracked through
                g.graphics.lineStyle(2, stage.paid ? 0xFFB040 : 0x7A5A5A, 1);
                for each (var c:Array in [[-0.2, 1.0], [2.1, 0.9], [3.9, 1.0]]) {
                    g.graphics.moveTo(0, 0);
                    g.graphics.lineTo(Math.cos(c[0]) * r * 0.45 + 3, Math.sin(c[0]) * r * 0.45 - 2);
                    g.graphics.lineTo(Math.cos(c[0] + 0.3) * r * c[1], Math.sin(c[0] + 0.3) * r * c[1]);
                }
            }
            else {
                g.graphics.lineStyle(2, 0x4A2418, 1);
                g.graphics.beginFill(0x1A0E10, 1);
                g.graphics.drawCircle(0, 0, r);
                g.graphics.endFill();
                // a ring of runes, dark until reached
                g.graphics.lineStyle(1, 0x7A3A20, 0.8);
                for (var q:int = 0; q < 8; q++) {
                    var a0:Number = q * Math.PI / 4 + 0.15;
                    g.graphics.moveTo(Math.cos(a0) * (r - 5), Math.sin(a0) * (r - 5));
                    g.graphics.lineTo(Math.cos(a0 + 0.45) * (r - 5), Math.sin(a0 + 0.45) * (r - 5));
                }
            }
            var numeral:TextField = gate.addChild(label(roman(n), last ? 15 : 13, current && !stage.won ? 0xFFFFFF : (stage.won ? 0xC8A070 : 0x8A6048), false, r * 2 + 10, TextFormatAlign.CENTER, "Groboldov")) as TextField;
            numeral.embedFonts = true;
            numeral.x = -r - 5;
            numeral.y = -int(numeral.textHeight * 0.5) - 3;
            if (current && !stage.won) {
                numeral.filters = [new GlowFilter(0x6A1406, 1, 3, 3, 4, 1)];
            }
            // its prize: claimed (gold) or lost (red)
            if (stage.won || stage.lost) {
                var mark:Shape = gate.addChild(new Shape()) as Shape;
                var claimed:Boolean = stage.won && stage.paid;
                mark.graphics.lineStyle(1, 0x1A0804, 1);
                mark.graphics.beginFill(claimed ? 0xE2B227 : 0xB0281A, 1);
                mark.graphics.drawCircle(0, 0, 7);
                mark.graphics.endFill();
                mark.graphics.lineStyle(2, 0xFFFFFF, 1);
                if (claimed) {
                    mark.graphics.moveTo(-3, 0);
                    mark.graphics.lineTo(-1, 3);
                    mark.graphics.lineTo(3, -3);
                }
                else {
                    mark.graphics.moveTo(-3, -3);
                    mark.graphics.lineTo(3, 3);
                    mark.graphics.moveTo(3, -3);
                    mark.graphics.lineTo(-3, 3);
                }
                mark.x = r * 0.72;
                mark.y = r * 0.72;
            }
            if (last) {
                var prize:TextField = gate.addChild(label(int(stage.reward ? stage.reward.shiny : 0) + " shiny", 11, 0xFFD58A, true, 90, TextFormatAlign.LEFT)) as TextField;
                prize.x = r + 14;
                prize.y = -9;
                prize.filters = [new GlowFilter(0xFF4A00, 0.8, 6, 6, 2, 1)];
            }
            var ring:Shape = gate.addChild(new Shape()) as Shape;
            ring.name = "ring";
            ring.graphics.lineStyle(2, 0xFFF0C0, 0.9);
            ring.graphics.drawCircle(0, 0, r + 5);
            ring.visible = false;
            var self:IoGauntlet = this;
            gate.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    self.select(index);
                });
            gate.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                    gate.scaleX = gate.scaleY = 1.08;
                });
            gate.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                    gate.scaleX = gate.scaleY = 1;
                });
            return gate;
        }

        /** Shows a gate in the panel under Moloch: its name, level, prize, and what is left of it. */
        private function select(index:int):void {
            var stages:Array = this._status.stages as Array || [];
            if (index < 0 || index >= stages.length) {
                return;
            }
            this._selected = index;
            for (var i:int = 0; i < this._gates.length; i++) {
                (this._gates[i] as Sprite).getChildByName("ring").visible = i == index;
            }
            var stage:Object = stages[index];
            var n:int = int(stage.stage);
            var current:Boolean = n == int(this._status.current) && !this._status.finished;
            var d:Sprite = this._detail;
            var PW:int = 282;
            var PH:int = 184;
            var m:Matrix = new Matrix();
            while (d.numChildren > 0) {
                d.removeChildAt(0);
            }
            d.graphics.clear();
            m.createGradientBox(PW, PH, Math.PI / 2, 0, 0);
            d.graphics.lineStyle(2, 0xB0481A, 1);
            d.graphics.beginGradientFill(GradientType.LINEAR, [0x2A0C06, 0x120404], [0.95, 0.95], [0, 255], m);
            d.graphics.drawRoundRect(0, 0, PW, PH, 14, 14);
            d.graphics.endFill();
            d.filters = [new GlowFilter(0xFF4A00, 0.45, 10, 10, 2, 2)];

            var name:TextField = d.addChild(label("Gate " + roman(n) + ": " + GATE_NAMES[Math.min(n, GATE_NAMES.length) - 1], 15, 0xFFD58A, false, PW - 16, TextFormatAlign.LEFT, "Groboldov")) as TextField;
            name.embedFonts = true;
            name.name = "ioGateName";
            name.height = 24;
            name.x = 10;
            name.y = 8;
            name.filters = [new GlowFilter(0xFF4A00, 0.7, 6, 6, 2, 1)];
            var level:TextField = d.addChild(label("Level " + int(stage.level) + (int(stage.stage) == stages.length ? "  ·  Moloch himself" : ""), 11, 0xC08A5A, false, PW - 20, TextFormatAlign.LEFT)) as TextField;
            level.x = 12;
            level.y = 32;
            var prize:TextField = d.addChild(label("", 11, 0xF0DCC0, false, PW - 20, TextFormatAlign.LEFT)) as TextField;
            prize.name = "ioGatePrize";
            prize.multiline = true;
            prize.height = 34;
            prize.htmlText = "<b>Prize:</b> " + rewardText(stage.reward);
            prize.wordWrap = true;
            prize.x = 12;
            prize.y = 50;

            var state:TextField = d.addChild(label("", 12, 0xFFFFFF, true, PW - 20, TextFormatAlign.LEFT)) as TextField;
            state.name = "ioGateState";
            state.x = 12;
            state.y = 88;
            var left:int = int(stage.attemptsLeft);
            if (stage.won) {
                state.htmlText = stage.paid ? "<font color=\"#E2B227\">Broken · its prize is yours</font>" : "<font color=\"#C87A6A\">Broken · its prize was lost</font>";
            }
            else if (!current) {
                state.htmlText = "<font color=\"#8A6A5A\">Sealed · break gate " + roman(int(this._status.current)) + " first</font>";
            }
            else {
                // attempts left, as flames
                for (var p:int = 0; p < int(this._status.attempts); p++) {
                    var pip:Shape = d.addChild(new Shape()) as Shape;
                    pip.graphics.lineStyle(1, 0x3A1004, 1);
                    pip.graphics.beginFill(p < left ? 0xFF8A2A : 0x3A2420, 1);
                    pip.graphics.drawCircle(0, 0, 6);
                    pip.graphics.endFill();
                    if (p < left) {
                        pip.filters = [new GlowFilter(0xFF6A00, 0.9, 6, 6, 2, 1)];
                    }
                    pip.x = 19 + p * 17;
                    pip.y = 98;
                }
                state.x = 12 + int(this._status.attempts) * 17 + 4;
                var lost:String = stage.lost ? " · <font color=\"#E0705A\">prize lost</font>" : (stage.paid ? " · <font color=\"#C8A070\">prize already claimed</font>" : "");
                state.htmlText = left + (left == 1 ? " attempt left" : " attempts left") + lost;
                if (int(stage.damage) > 0) {
                    var bar:Shape = d.addChild(new Shape()) as Shape;
                    bar.graphics.beginFill(0x2A1410, 1);
                    bar.graphics.drawRect(0, 0, PW - 24, 6);
                    bar.graphics.endFill();
                    bar.graphics.beginFill(0xE0501C, 1);
                    bar.graphics.drawRect(0, 0, (PW - 24) * Math.min(100, int(stage.damage)) / 100, 6);
                    bar.graphics.endFill();
                    bar.graphics.lineStyle(1, 0xFFFFFF, 1);
                    bar.graphics.moveTo((PW - 24) * _winPercent / 100, -2);
                    bar.graphics.lineTo((PW - 24) * _winPercent / 100, 8);
                    bar.x = 12;
                    bar.y = 112;
                    var broken:TextField = d.addChild(label(int(stage.damage) + "% of its walls already broken", 10, 0xC08A5A, false, PW - 20, TextFormatAlign.LEFT)) as TextField;
                    broken.x = 12;
                    broken.y = 118;
                }
            }

            var action:Sprite = null;
            if (current) {
                action = moltenButton("ENTER THE GATE", 210, 36, function(e:MouseEvent):void {
                        confirmAttack(stage);
                    }, Boolean(this._status.open));
            }
            else if (this._status.finished && index == stages.length - 1) {
                var done:TextField = d.addChild(label("You have conquered the Gauntlet this moon.", 12, 0xFFD58A, true, PW - 20, TextFormatAlign.CENTER)) as TextField;
                done.x = 10;
                done.y = PH - 36;
            }
            if (action) {
                action.name = "ioEnterGate";
                action.x = int((PW - 210) * 0.5);
                action.y = PH - 46;
                d.addChild(action);
            }
        }

        /** A button of molten gold. */
        private static function moltenButton(text:String, width:int, height:int, onClick:Function, enabled:Boolean):Sprite {
            var b:Sprite = new Sprite();
            var m:Matrix = new Matrix();
            b.buttonMode = enabled;
            b.mouseChildren = false;
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            var draw:Function = function(hot:Boolean):void {
                b.graphics.clear();
                b.graphics.lineStyle(2, enabled ? 0xFFE0A0 : 0x6A5A50, 1);
                b.graphics.beginGradientFill(GradientType.LINEAR, enabled ? (hot ? [0xFFC060, 0xE0501C, 0x9A2008] : [0xF0A040, 0xC8401A, 0x7A1806]) : [0x5A4A44, 0x3A2E2A, 0x2A2220], [1, 1, 1], [0, 140, 255], m);
                b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
                b.graphics.endFill();
            };
            draw(false);
            var t:TextField = b.addChild(label(text, 16, enabled ? 0xFFFFFF : 0xA09088, false, width, TextFormatAlign.CENTER, "Groboldov")) as TextField;
            t.embedFonts = true;
            t.height = 26;
            t.y = int((height - 24) / 2);
            t.filters = [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)];
            if (enabled) {
                b.filters = [new GlowFilter(0xFF6A00, 0.7, 10, 10, 2, 2)];
                b.addEventListener(MouseEvent.ROLL_OVER, function(e:MouseEvent):void {
                        draw(true);
                    });
                b.addEventListener(MouseEvent.ROLL_OUT, function(e:MouseEvent):void {
                        draw(false);
                    });
                b.addEventListener(MouseEvent.CLICK, onClick);
            }
            return b;
        }

        private function newEmber(anywhere:Boolean):Object {
            var s:Shape = this._emberLayer.addChild(new Shape()) as Shape;
            var colors:Array = [0xFFB040, 0xFF6A1A, 0xFFE08A, 0xFF4A10];
            s.graphics.beginFill(colors[int(Math.random() * colors.length)], 1);
            s.graphics.drawCircle(0, 0, 0.8 + Math.random() * 1.8);
            s.graphics.endFill();
            s.x = -W * 0.5 + Math.random() * W;
            s.y = anywhere ? -H * 0.5 + Math.random() * H : H * 0.5 + Math.random() * 20;
            return {"s": s, "vy": 0.35 + Math.random() * 0.9, "sway": Math.random() * 6.28, "life": 0};
        }

        /** Embers rise, the gate to fight burns brighter and dimmer, Moloch breathes. */
        private function animate(e:Event):void {
            if (!this._mc || !this._mc.stage) {
                return;
            }
            this._tick++;
            for each (var ember:Object in this._embers) {
                var s:Shape = ember.s;
                ember.sway += 0.05;
                s.y -= ember.vy;
                s.x += Math.sin(ember.sway) * 0.35;
                s.alpha = Math.max(0, Math.min(1, (s.y + H * 0.5) / (H * 0.5)));
                if (s.y < -H * 0.5 - 4) {
                    s.x = -W * 0.5 + Math.random() * W;
                    s.y = H * 0.5 + Math.random() * 20;
                }
            }
            var pulse:Number = 0.5 + 0.5 * Math.sin(this._tick * 0.11);
            var current:int = int(this._status.current) - 1;
            if (current >= 0 && current < this._gates.length && !this._status.finished) {
                var burning:Shape = (this._gates[current] as Sprite).getChildAt(0) as Shape;
                burning.filters = [new GlowFilter(0xFF6A00, 0.6 + 0.4 * pulse, 10 + 10 * pulse, 10 + 10 * pulse, 2, 2)];
            }
            if (this._moloch && this._tick % 2 == 0) {
                this._moloch.scaleX = this._moloch.scaleY = 1 + 0.015 * Math.sin(this._tick * 0.05);
                this._moloch.filters = [new GlowFilter(0xFF2A00, 0.35 + 0.25 * pulse, 16, 16, 2, 2)];
            }
        }

        /** "The gates close in 5d 3h" (or when they open). */
        private function whenText():String {
            var s:Object = this._status;
            var now:Number = Number(s.now) || GLOBAL.Timestamp();
            if (s.test) {
                return "Admin test ladder · always open · nothing is paid";
            }
            if (s.finished) {
                return "You have conquered the Gauntlet this moon." + (s.open && s.closesAt ? " The gates close in " + IoOutpostsPopup.duration(int(s.closesAt - now)) + "." : "");
            }
            if (s.open) {
                return s.closesAt ? "The gates close in " + IoOutpostsPopup.duration(int(s.closesAt - now)) : "The gates are open";
            }
            return startsText(s, now);
        }

        /** "Moloch's Gauntlet starts in 4d 2h." */
        private static function startsText(s:Object, now:Number):String {
            return "Moloch's Gauntlet starts in " + (s && s.opensAt ? IoOutpostsPopup.duration(Math.max(60, int(s.opensAt - now))) : "a few days") + ".";
        }

        /** What the last attack did, if it hasn't been shown yet. */
        private function resultText():String {
            var last:Object = this._status.last;
            if (!last || Number(last.at) <= _shownResult) {
                return "";
            }
            var gate:String = "Gate " + roman(int(last.stage));
            if (last.result == "won") {
                if (last.reward) {
                    return "<b>" + gate + " falls!</b> " + (last.test ? "Test ladder: it would pay " : "You claim ") + rewardText(last.reward) + ".";
                }
                if (last.already) {
                    return "<b>" + gate + " falls.</b> Its prize was already claimed this moon.";
                }
                return "<b>" + gate + " falls,</b> but its prize was lost. The next gate awaits.";
            }
            if (last.result == "healed") {
                return "<b>" + gate + " held for every attempt.</b> The fires mended its walls, and its prize is lost.";
            }
            var left:int = int(last.attemptsLeft);
            return "<b>" + gate + " holds.</b> " + left + (left == 1 ? " attempt" : " attempts") + " left" + (last.lost ? "." : " before the fires mend its walls.");
        }

        /** "5 shiny, 2.3M bone, coal and sulfur, 1.2M magma". */
        private static function rewardText(reward:Object):String {
            if (!reward) {
                return "";
            }
            var same:Boolean = reward.r1 == reward.r2 && reward.r2 == reward.r3;
            var resources:String = same ? short(reward.r1) + " bone, coal and sulfur" : short(reward.r1) + " bone, " + short(reward.r2) + " coal, " + short(reward.r3) + " sulfur";
            return int(reward.shiny) + " shiny, " + resources + ", " + short(reward.r4) + " magma";
        }

        /** 2300000: "2.3M". */
        private static function short(amount:Number):String {
            if (amount >= 1000000) {
                return String(Math.round(amount / 100000) / 10) + "M";
            }
            if (amount >= 1000) {
                return String(Math.round(amount / 100) / 10) + "k";
            }
            return String(int(amount));
        }

        /** Before attacking: the last attempt with a prize still on says what failing it means. */
        private function confirmAttack(stage:Object):void {
            if (!this._status.open) {
                GLOBAL.Message(startsText(this._status, Number(this._status.now) || GLOBAL.Timestamp()));
                return;
            }
            var left:int = int(stage.attemptsLeft);
            if (left == 1 && !stage.lost && !stage.paid) {
                GLOBAL.Message("<b>Last attempt at Gate " + roman(int(stage.stage)) + ".</b><br><br>If it fails, the fires mend its walls and its prize (" + rewardText(stage.reward) + ") is lost for this moon.",
                    "Attack", function():void {
                        attack(stage);
                    });
                return;
            }
            this.attack(stage);
        }

        /**
         * Attacks the stage's yard from the main yard: the main yard as a map cell (the server's `home`) is the
         * one yard in range, so its housed monsters and its flinger are what the attack has, and what the
         * attack's saves take the used monsters from (BASE.getMR2MonsterUpdateSaveData).
         */
        private function attack(stage:Object):void {
            var home:Object = this._status.home;
            var cell:MapRoomCell = null;
            var monsterType:String = null;
            var any:Boolean = false;
            if (!home) {
                GLOBAL.Message("Your main yard is not on the world map yet, so it can't attack from there.");
                return;
            }
            if (BASE.ioAttackRunning()) {
                GLOBAL.Message("Not while your yard is being attacked.");
                return;
            }
            cell = new MapRoomCell();
            cell.X = int(home.x);
            cell.Y = int(home.y);
            cell.Setup(home);
            // The yard attacks itself only (range 0); a yard without a flinger still sends its monsters, and
            // the attack's saves still take the used ones off it (they skip a cell with no flinger range).
            if (!cell._flingerRange || cell._flingerRange.Get() < 1) {
                cell._flingerRange = new SecNum(1);
            }
            ATTACK._curCreaturesAvailable = new Array();
            for (monsterType in cell.monsters) {
                var count:int = int(cell.monsters[monsterType].Get());
                if (count > 0) {
                    ATTACK._curCreaturesAvailable[monsterType] = count;
                    any = true;
                }
            }
            for (var g:int = 0; g < GLOBAL._playerGuardianData.length; g++) {
                if (GLOBAL._playerGuardianData[g] && GLOBAL._playerGuardianData[g].hp.Get() > 0) {
                    any = true;
                }
            }
            if (GLOBAL.ioTestMode()) {
                ATTACK._curCreaturesAvailable = new Array();
                for each (monsterType in CREATURELOCKER.ioTestMonsterIds()) {
                    ATTACK._curCreaturesAvailable[monsterType] = 999;
                }
                any = true;
            }
            if (!any) {
                GLOBAL.Message("You have no monsters in your main yard to attack with. House some there first.");
                return;
            }
            GLOBAL._attackerMapResources = {
                    "r1": GLOBAL._resources.r1.Get(),
                    "r2": GLOBAL._resources.r2.Get(),
                    "r3": GLOBAL._resources.r3.Get(),
                    "catapult": new SecNum(GLOBAL._playerCatapultLevel ? GLOBAL._playerCatapultLevel.Get() : 0),
                    "flinger": new SecNum(cell._flingerLevel ? cell._flingerLevel.Get() : 0)
                };
            GLOBAL._attackerCellsInRange = Vector.<CellData>([new CellData(cell, 0)]);
            GLOBAL._currentCell = null;
            attackStage = int(stage.stage);
            _showOnHome = true;
            this.close();
            watchBar();
            BASE.LoadBase(null, 0, Number(stage.baseid), "wmattack", false, EnumYardType.MAIN_YARD);
        }

        /** The attack is over (popup_attackend): home, where the window opens with the result. */
        public static function ReturnHome():void {
            _showOnHome = true;
            attackStage = 0;
            removeBar();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }

        /** The attack-end window's words for a Gauntlet attack. */
        public static function endTitle(success:Boolean):String {
            return success ? "Gate " + roman(attackStage) + " falls!" : "Gate " + roman(attackStage) + " holds";
        }

        public static function endMessage(success:Boolean):String {
            return success ? "At least " + _winPercent + "% of Moloch's stronghold lies in ruins. Its prize awaits you at home." : "Less than " + _winPercent + "% of its walls fell. The damage stays for your next attempt.";
        }

        public function close(e:MouseEvent = null):void {
            if (!this._mc) {
                return;
            }
            SOUNDS.Play("close");
            this._mc.removeEventListener(Event.ENTER_FRAME, this.animate);
            this._embers = [];
            GLOBAL.BlockerRemove();
            if (this._mc.parent) {
                this._mc.parent.removeChild(this._mc);
            }
            this._mc = null;
            if (_open == this) {
                _open = null;
            }
        }

        // ---- the bar during the attack

        private static var _barFill:Shape;

        private static var _barText:TextField;

        private static var _ticks:int = 0;

        /** Puts the bar up once the Gauntlet yard is on screen, and keeps it up to date. */
        private static function watchBar():void {
            removeBar();
            _bar = new Sprite();
            _bar.name = "ioGauntletBar";
            _bar.mouseEnabled = false;
            _bar.mouseChildren = false;
            GLOBAL._ROOT.stage.addEventListener(Event.ENTER_FRAME, tickBar);
            _bar.visible = false;
        }

        private static function removeBar():void {
            _barFill = null;
            if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
                GLOBAL._ROOT.stage.removeEventListener(Event.ENTER_FRAME, tickBar);
            }
            if (_bar) {
                if (_bar.parent) {
                    _bar.parent.removeChild(_bar);
                }
                _bar = null;
            }
        }

        private static const BAR_W:int = 340;

        private static const BAR_H:int = 18;

        private static function drawBar():void {
            var g:Shape = null;
            _bar.graphics.clear();
            _bar.graphics.beginFill(0x1A0A05, 0.8);
            _bar.graphics.drawRoundRect(-8, -24, BAR_W + 16, BAR_H + 32, 12, 12);
            _bar.graphics.endFill();
            _bar.graphics.lineStyle(1, 0x8A6A45, 1);
            _bar.graphics.beginFill(0x3A2A1A, 1);
            _bar.graphics.drawRect(0, 0, BAR_W, BAR_H);
            _bar.graphics.endFill();
            _barFill = new Shape();
            _bar.addChild(_barFill);
            g = new Shape();
            // the line to reach
            g.graphics.lineStyle(2, 0xFFFFFF, 1);
            g.graphics.moveTo(BAR_W * _winPercent / 100, -3);
            g.graphics.lineTo(BAR_W * _winPercent / 100, BAR_H + 3);
            _bar.addChild(g);
            _barText = label("", 12, 0xFFFFFF, true, BAR_W, TextFormatAlign.CENTER);
            _barText.y = -21;
            _barText.filters = [new GlowFilter(0, 1, 2, 2, 6, 1)];
            _bar.addChild(_barText);
        }

        private static function tickBar(e:Event):void {
            if (!_bar) {
                return;
            }
            if (attackStage <= 0 || !isGauntletBase(BASE._loadedBaseID) || GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
                _bar.visible = false;
                return;
            }
            if (++_ticks % 6 != 0 && _bar.visible) {
                return;
            }
            if (!_barFill) {
                drawBar();
            }
            if (!_bar.parent && GLOBAL._layerUI) {
                GLOBAL._layerUI.addChild(_bar); // the yard's load clears the layers
            }
            var destroyed:int = percentDestroyed();
            _barFill.graphics.clear();
            _barFill.graphics.beginFill(destroyed >= _winPercent ? 0x4CC34C : 0xE0501C, 1);
            _barFill.graphics.drawRect(1, 1, Math.max(0, (BAR_W - 2) * Math.min(100, destroyed) / 100), BAR_H - 2);
            _barFill.graphics.endFill();
            _barText.text = "Gate " + roman(attackStage) + ": " + destroyed + "% destroyed, " + _winPercent + "% breaks it";
            _bar.x = int(GLOBAL._SCREENCENTER.x - BAR_W * 0.5);
            _bar.y = int(GLOBAL._SCREEN.y + 100);
            _bar.visible = true;
            if (_bar.parent) {
                _bar.parent.setChildIndex(_bar, _bar.parent.numChildren - 1);
            }
        }

        /** As the attack's end works it out (ATTACK.EndB): building health left, walls and fired traps aside. */
        public static function percentDestroyed():int {
            var health:Number = 0;
            var max:Number = 0;
            for each (var b:BFOUNDATION in InstanceManager.getInstancesByClass(BFOUNDATION)) {
                if (b._class != "wall" && (b._type == 53 && b._expireTime < GLOBAL.Timestamp()) === false) {
                    health += b.health;
                    max += b.maxHealth;
                }
            }
            return max > 0 ? int(100 - 100 / max * health) : 0;
        }

        // ---- helpers

        private static function label(text:String, size:int, color:uint, bold:Boolean, width:int, align:String, font:String = "Verdana", italic:Boolean = false):TextField {
            var field:TextField = new TextField();
            field.selectable = false;
            field.mouseEnabled = false;
            field.width = width;
            field.height = size + 8;
            var format:TextFormat = new TextFormat(font, size, color, bold, italic);
            format.align = align;
            field.defaultTextFormat = format;
            field.text = text;
            return field;
        }
    }
}
