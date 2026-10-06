package com.monsters.monsters.creeps.inferno {
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.creeps.CreepBase;
    import flash.geom.Point;

    /**
     * Inferno-only: Flickerfiend (IC14), heat-shimmer with teeth. After every 3rd strike on a building it
     * dissolves into hot air, and reappears beside another building up to 400 px away (never the one it
     * was hitting). While it shimmers it cannot be targeted, and whatever was already fired at it misses.
     * The shimmer is the sprite sheet's blink rows (9-12), a frame every 8 ticks (10 a second, from the first):
     * 32 ticks (0.4 s, the four frames once) fading out, then gone (not drawn at all) for a full second (80
     * ticks: the game runs 80 steps a second), then 24 ticks (0.3 s) shimmering back in beside the new
     * building. (It used to fade out and in over 8 ticks each, a tenth of a second: too quick to see.) It is
     * too nimble
     * to set traps off (BTRAP.FindTargets, Targeting.ioSkipsTraps); a trap something else sets off still
     * catches it in the blast, unless it is shimmering.
     */
    public class Flickerfiend extends CreepBase {

        public static const ID:String = "IC14";

        private static const STRIKES:int = 3;

        private static const RANGE:Number = 400;

        public static const OUT_TICKS:int = 32;

        public static const IN_TICKS:int = 24;

        /** Gone for a full second: the game runs 80 steps (ticks) a second. */
        private static const GONE_TICKS:int = 80;

        private var _strikes:int = 0;

        /** 0 not blinking; counts up through the fade out, the jump and the fade in. */
        private var _blink:int = 0;

        private var _blinkTo:BFOUNDATION;

        public function Flickerfiend(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        }

        public function get blinking():Boolean {
            return this._blink > 0;
        }

        override protected function attacked(param1:IAttackable, param2:Number, param3:ITargetable = null):void {
            super.attacked(param1, param2, param3);
            if (this._blink > 0 || health <= 0 || !(param1 is BFOUNDATION) || _behaviour != k_sBHVR_ATTACK && _behaviour != k_sBHVR_BOUNCE) {
                return;
            }
            if (++this._strikes >= STRIKES) {
                this._strikes = 0;
                this.startBlink();
            }
        }

        /** Another building close by: alive, not a wall, trap or decoration, not the one it is on. */
        private function pickTarget():BFOUNDATION {
            var near:Array = [];
            var b:BFOUNDATION = null;
            var dx:Number = NaN;
            var dy:Number = NaN;
            for each (b in BASE._buildingsMain) {
                if (!b || b == _targetBuilding || b.health <= 0 || !b.isTargetable || !b._mc) {
                    continue;
                }
                if (b._class == "decoration" || b._class == "immovable" || b._class == "enemy" || b._class == "wall" || b._class == "trap") {
                    continue;
                }
                if (b._class == "tower" && b is BTOWER && BTOWER(b).isJard) {
                    continue;
                }
                dx = b._mc.x - _tmpPoint.x;
                dy = b._mc.y + b._middle - _tmpPoint.y;
                if (dx * dx + dy * dy <= RANGE * RANGE) {
                    near.push(b);
                }
            }
            return near.length ? near[int(Math.random() * near.length)] : null;
        }

        private function startBlink():void {
            this._blinkTo = this.pickTarget();
            if (!this._blinkTo) {
                return;
            }
            this._blink = 1;
            // the shimmer starts on its first frame (SPRITES: a frame every 8 ticks)
            _frameNumber += (32 - _frameNumber % 32) % 32;
            ++targetableStatus;
            spriteAction = "blink";
            _hasPath = false;
            _attacking = false;
        }

        /** Beside the new building, on the side facing where it was. */
        private function landingPoint(param1:BFOUNDATION):Point {
            var centre:Point = GRID.FromISO(param1._mc.x, param1._mc.y + param1._middle);
            var from:Point = GRID.FromISO(_tmpPoint.x, _tmpPoint.y);
            var d:Point = from.subtract(centre);
            if (d.length < 1) {
                d = new Point(1, 1);
            }
            // just outside the footprint's edge on that side (not further out, where a neighbour may stand)
            d.normalize(1);
            var edge:Number = param1._footprint[0].width * 0.5 / Math.max(Math.abs(d.x), Math.abs(d.y), 0.5);
            d.normalize(edge + 10);
            var at:Point = centre.add(d);
            return GRID.ToISO(at.x, at.y, 0);
        }

        /** Ticks 1-32 fade out, 33-112 gone (it moves on tick 33), 113-136 fade in, then on its way. */
        private function tickBlink():void {
            ++this._blink;
            var a:Number = 1;
            if (this._blink <= OUT_TICKS) {
                a = 1 - this._blink / (OUT_TICKS + 1);
            }
            else if (this._blink <= OUT_TICKS + GONE_TICKS) {
                if (this._blink == OUT_TICKS + 1 && this._blinkTo && this._blinkTo.health > 0) {
                    _tmpPoint = this.landingPoint(this._blinkTo);
                }
                a = 0;
            }
            else if (this._blink <= OUT_TICKS + GONE_TICKS + IN_TICKS) {
                a = (this._blink - OUT_TICKS - GONE_TICKS) / IN_TICKS;
            }
            else {
                this.endBlink();
                return;
            }
            this.fade(a);
        }

        private function endBlink():void {
            this._blink = 0;
            --targetableStatus;
            spriteAction = "walking";
            this.fade(1);
            // on to the new building (the closest one now, which is the one it came out beside)
            loseTarget();
            _hasPath = false;
            _waypoints = [];
            if (this._blinkTo && this._blinkTo.health > 0) {
                WaypointTo(new Point(this._blinkTo._mc.x, this._blinkTo._mc.y), this._blinkTo);
            }
            else {
                findTarget(_targetGroup);
            }
            this._blinkTo = null;
        }

        private function fade(param1:Number):void {
            if (_graphicMC) {
                _graphicMC.alpha = param1;
            }
            if (_rasterData) {
                _rasterData.alpha = param1;
            }
            if (_shadowData) {
                _shadowData.alpha = param1;
            }
        }

        override public function tickBAttack():Boolean {
            if (this._blink > 0) {
                if (health <= 0) {
                    return true;
                }
                this.tickBlink();
                return false;
            }
            return super.tickBAttack();
        }

        /** It stays where it is while it blinks (fading out, gone, fading in beside the new building). */
        override protected function move():void {
            if (this._blink > 0) {
                return;
            }
            super.move();
        }

        /** Nothing lands on heat-shimmer: what was fired at it while it blinked misses. */
        override public function modifyHealth(param1:Number, param2:ITargetable = null):Number {
            if (this._blink > 0 && param1 < 0) {
                return 0;
            }
            return super.modifyHealth(param1, param2);
        }
    }
}
