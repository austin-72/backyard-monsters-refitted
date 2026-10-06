package com.monsters.casino {
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFormatAlign;

    /**
     * Choosing a bet: bone chips (1 to 500), a field to type any amount, half and double. The smallest
     * bet and the largest (0: none) come from the server (casino/state limits).
     */
    public class BetSelector extends Sprite {

        public static const CHIPS:Array = [1, 5, 10, 25, 50, 100, 250, 500];

        private var _field:TextField;

        private var _chips:Array = [];

        public function BetSelector(width:int = 190) {
            super();
            var i:int = 0;
            while (i < CHIPS.length) {
                var c:Sprite = CasinoUI.chip(CHIPS[i], this.chipClick(CHIPS[i]));
                c.x = 22 + (i % 4) * 46;
                c.y = 20 + int(i / 4) * 42;
                this.addChild(c);
                this._chips.push(c);
                i++;
            }
            var half:Sprite = CasinoUI.toggle("½", 34, 26, function(e:MouseEvent):void {
                    setValue(Math.max(minBet(), int(value / 2)));
                });
            half.y = 92;
            this.addChild(half);
            this._field = CasinoUI.input(width - 84, 26, "10");
            this._field.name = "casinoBetField";
            this._field.x = 40;
            this._field.y = 92;
            this._field.addEventListener(Event.CHANGE, function(e:Event):void {
                    highlight();
                });
            this.addChild(this._field);
            var dbl:Sprite = CasinoUI.toggle("x2", 34, 26, function(e:MouseEvent):void {
                    setValue(value * 2);
                });
            dbl.x = width - 38;
            dbl.y = 92;
            this.addChild(dbl);
            this.highlight();
        }

        private function chipClick(v:int):Function {
            return function(e:MouseEvent):void {
                setValue(v);
            };
        }

        private function minBet():int {
            return CASINO.state && CASINO.state.limits ? Math.max(1, int(CASINO.state.limits.min_bet)) : 1;
        }

        private function maxBet():int {
            return CASINO.state && CASINO.state.limits ? int(CASINO.state.limits.max_bet) : 0;
        }

        /** The bet chosen (at least the smallest allowed). */
        public function get value():int {
            var v:int = int(this._field.text);
            return Math.max(this.minBet(), v);
        }

        public function setValue(v:int):void {
            v = Math.max(this.minBet(), v);
            if (this.maxBet() > 0) {
                v = Math.min(this.maxBet(), v);
            }
            v = Math.min(v, 999999999);
            this._field.text = String(v);
            this.highlight();
        }

        private function highlight():void {
            var v:int = int(this._field.text);
            var i:int = 0;
            while (i < this._chips.length) {
                CasinoUI.choose(this._chips[i], CHIPS[i] == v);
                i++;
            }
        }
    }
}
