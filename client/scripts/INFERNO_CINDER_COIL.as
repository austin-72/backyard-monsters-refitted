package {
    import com.monsters.interfaces.IAttackable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.pathing.PATHING;
    import flash.events.Event;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    /**
     * Inferno-only: the Cinder Coil (building 144, newtowers.md). It fires in a cycle (the user's, 28 September),
     * timed in the attack's own steps (80 a second):
     *   spin   0.5 s (40 steps): the coil whirls round, speeding up, while it charges (the 12-frame `anim2`
     *          overlay's frames 1-8);
     *   aim    0.25 s (20 steps): it slows smoothly out of the spin and comes to rest pointing at its target
     *          (following it if it moves), fully charged;
     *   shock  the flash (overlay frame 9): an arc of fire from the orb's prong, on the side facing the target,
     *          that hits it and leaps to the nearest monster not yet hit within `ext.jumpRadius`, up to
     *          `ext.jumps` more times, each hit 20% weaker than the one before;
     *   rest   0.25 s (20 steps): the afterglow (frames 10, 11);
     * then again at once while it has a target in range (one shot a second), else it waits for the next.
     * The 32 aim frames of `anim` are followed as a smooth angle (frames can be passed between), so the turn
     * never jumps.
     */
    public class INFERNO_CINDER_COIL extends BTOWER {

        public static const ID:int = 144;

        public static const SPIN_STEPS:int = 40;

        public static const AIM_STEPS:int = 20;

        public static const REST_STEPS:int = 20;

        /**
         * The spin's speed in aim frames a step (32 a turn): from slow to fast as it charges (nominal; each
         * cycle scales it, see startSpin). The aim then slows it evenly to a stop.
         */
        private static const SPIN_FROM:Number = 0.35;

        private static const SPIN_TO:Number = 1.25;

        /** How far the nominal spin and aim turn it (aim frames), worked out once. */
        private static var s_nominal:Number = NaN;

        private var _spinScale:Number = 1;

        private static const FRAMES:int = 32;

        private static const FLASH_FRAME:int = 9;

        private static const JUMP_FALLOFF:Number = 0.8;

        private static const ARC_COLOUR:uint = 0xFF8A30;

        /** The prong on the orb: how far (grid) from the orb's middle the arc starts, toward the aim. */
        private static const PRONG:Number = 12;

        public static const IDLE:int = 0;

        public static const SPIN:int = 1;

        public static const AIM:int = 2;

        public static const REST:int = 3;

        private var _phase:int = IDLE;

        private var _stageTicks:int = 0;

        /** The coil's heading as a smooth angle in aim frames [0, 32). */
        private var _angle:Number = 0;

        private var _speed0:Number = 0;

        private var _aimFrom:Number = 0;

        private var _aimTurn:Number = 0;

        private var _aimGoal:Number = 0;

        private var _lockedTarget:IAttackable;

        private var _chainFlags:int;

        /** Shots made (for tests and the attack log). */
        public var shots:int = 0;

        public function INFERNO_CINDER_COIL() {
            super();
            _type = ID;
            _frameNumber = 0;
            _top = -35;
            _footprint = [new Rectangle(0, 0, 70, 70)];
            _gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
            _animRandomStart = false;
            this._chainFlags = Targeting.getOldStyleTargets(1);
            SetProps();
        }

        public function get phase():int {
            return this._phase;
        }

        public function get angle():Number {
            return this._angle;
        }

        /** True from the spin to the end of the rest. */
        public function get charging():Boolean {
            return this._phase != IDLE;
        }

        /** The stats row's extra numbers for this level (jumps, jumpRadius). */
        private function ext():Object {
            var lvl:int = Math.max(1, Math.min(_lvl.Get(), _buildingProps.stats.length));
            return _buildingProps.stats[lvl - 1].ext || {};
        }

        override public function TickAttack():void {
            if (this._phase != IDLE) {
                this.stepCycle();
            }
            super.TickAttack();
            if (this._phase == IDLE) {
                Rotate();
                this._angle = _animTick;
            }
        }

        /** Neither strip moves on its own: the aim comes from the cycle (or Rotate), the overlay from the charge. */
        override public function AnimFrame(param1:Boolean = true):void {
            super.AnimFrame(false);
        }

        override public function Fire(param1:IAttackable):void {
            if (this._phase != IDLE || health <= 0) {
                return;
            }
            super.Fire(param1);
            if (isJard) {
                // under a Candy Jar it shoots the glass, as the other towers do
                this.hitJar();
                return;
            }
            this.startSpin(param1);
        }

        /** The nominal turn of a spin and aim (the aim slowing evenly from the spin's last speed to nothing). */
        private static function nominalTurn():Number {
            if (isNaN(s_nominal)) {
                var sum:Number = 0;
                var t:Number = 0;
                for (var i:int = 1; i <= SPIN_STEPS; i++) {
                    t = i / SPIN_STEPS;
                    sum += SPIN_FROM + (SPIN_TO - SPIN_FROM) * t * t;
                }
                s_nominal = sum + SPIN_TO * AIM_STEPS / 2;
            }
            return s_nominal;
        }

        private function startSpin(param1:IAttackable):void {
            this._lockedTarget = param1;
            this._phase = SPIN;
            this._stageTicks = 0;
            this._angle = _animTick;
            // The whole move (spin, then the aim slowing to a stop) is sized so it ends on the target: the
            // turn needed plus whole turns, near the nominal; the spin's speed is scaled to it, so the aim is
            // always an even slow-down, never a speed-up or a turn back.
            var target:MonsterBase = param1 as MonsterBase;
            var turn:Number = target ? wrap(this.frameTo(new Point(target.x, target.y)) - this._angle) : 0;
            var nominal:Number = nominalTurn();
            // (from a little under the nominal to 3/4 of a turn over it: always most of a turn or more)
            while (turn < nominal - FRAMES / 4) {
                turn += FRAMES;
            }
            this._spinScale = target ? turn / nominal : 1;
            _anim2Tick = 1;
            SOUNDS.Play("lightningstart", 0.8);
            this.draw();
        }

        /** The grid angle to a point, in aim frames (as BTOWER.Rotate measures it). */
        private function frameTo(param1:Point):Number {
            var it:Point = PATHING.FromISO(param1);
            var me:Point = PATHING.FromISO(new Point(_mc.x, _mc.y)).add(new Point(35, 35));
            var deg:Number = Math.atan2(it.y - me.y, it.x - me.x) * 57.2957795;
            if (deg < 0) {
                deg += 360;
            }
            return deg / 11.25;
        }

        /** The target to point at now: the locked one while it is alive and in range, else the closest. */
        private function aimTarget():MonsterBase {
            var first:MonsterBase = this._lockedTarget as MonsterBase;
            if (first && first.health > 0 && first.isTargetable && !first.invisible && this.inRange(first)) {
                return first;
            }
            var inRange:Array = Targeting.getCreepsInRange(_range, this.centre(), Targeting.getOldStyleTargets(1));
            inRange.sortOn(["dist"], Array.NUMERIC);
            for each (var c:Object in inRange) {
                if (!MonsterBase(c.creep).invisible && MonsterBase(c.creep).health > 0) {
                    this._lockedTarget = c.creep;
                    return c.creep;
                }
            }
            return null;
        }

        private function inRange(param1:MonsterBase):Boolean {
            var inRange:Array = Targeting.getCreepsInRange(_range, this.centre(), Targeting.getOldStyleTargets(1));
            for each (var c:Object in inRange) {
                if (c.creep == param1) {
                    return true;
                }
            }
            return false;
        }

        private static function wrap(param1:Number):Number {
            var a:Number = param1 % FRAMES;
            return a < 0 ? a + FRAMES : a;
        }

        private function stepCycle():void {
            if (health <= 0) {
                this.endCycle();
                return;
            }
            ++this._stageTicks;
            var t:Number = 0;
            var target:MonsterBase = null;
            switch (this._phase) {
                case SPIN:
                    // speeding up as it charges; the overlay's frames 1-8 over the spin
                    t = this._stageTicks / SPIN_STEPS;
                    this._speed0 = this._spinScale * (SPIN_FROM + (SPIN_TO - SPIN_FROM) * t * t);
                    this._angle = wrap(this._angle + this._speed0);
                    _anim2Tick = Math.min(8, 1 + int(this._stageTicks * 8 / SPIN_STEPS));
                    if (this._stageTicks >= SPIN_STEPS) {
                        this.startAim();
                    }
                    break;
                case AIM:
                    // out of the spin into the target's heading: a smooth curve (Hermite) that starts at the
                    // spin's speed and stops on the heading, turning the same way as the spin, never back
                    target = this.aimTarget();
                    if (target) {
                        var goal:Number = this.frameTo(new Point(target.x, target.y));
                        var shift:Number = wrap(goal - this._aimGoal + FRAMES / 2) - FRAMES / 2;
                        this._aimTurn += shift;
                        this._aimGoal = goal;
                    }
                    t = Math.min(1, this._stageTicks / AIM_STEPS);
                    var h10:Number = t * t * t - 2 * t * t + t;
                    var h01:Number = -2 * t * t * t + 3 * t * t;
                    this._angle = wrap(this._aimFrom + h10 * AIM_STEPS * this._speed0 + h01 * this._aimTurn);
                    _anim2Tick = 8;
                    if (this._stageTicks >= AIM_STEPS) {
                        _anim2Tick = FLASH_FRAME;
                        this.discharge();
                        this._phase = REST;
                        this._stageTicks = 0;
                    }
                    break;
                case REST:
                    _anim2Tick = this._stageTicks <= REST_STEPS / 2 ? 10 : 11;
                    if (this._stageTicks >= REST_STEPS) {
                        target = this.aimTarget();
                        if (target && !isJard && CREEPS._creepCount > 0) {
                            this.startSpin(target);
                            return;
                        }
                        this.endCycle();
                        return;
                    }
                    break;
            }
            this.draw();
        }

        private function startAim():void {
            this._phase = AIM;
            this._stageTicks = 0;
            this._aimFrom = this._angle;
            var target:MonsterBase = this.aimTarget();
            this._aimGoal = target ? this.frameTo(new Point(target.x, target.y)) : this._angle;
            // the turn still to make, forward (the spin's way): about half the spin's last speed times the aim's
            // steps (an even slow-down; the spin was sized for it), and never so short that it would turn back
            var turn:Number = wrap(this._aimGoal - this._aimFrom);
            var ideal:Number = AIM_STEPS * this._speed0 / 2;
            while (turn + FRAMES / 2 < ideal) {
                turn += FRAMES;
            }
            if (turn < AIM_STEPS * this._speed0 / 3) {
                turn += FRAMES;
            }
            this._aimTurn = turn;
        }

        private function draw():void {
            _animTick = int(Math.round(this._angle)) % FRAMES;
            if (GLOBAL._render) {
                this.AnimFrame(false);
            }
        }

        private function endCycle():void {
            this._phase = IDLE;
            this._stageTicks = 0;
            this._lockedTarget = null;
            _anim2Tick = 0;
            this.draw();
        }

        override public function TickFast(param1:Event = null):void {
            super.TickFast(param1);
            // the attack ended (every monster gone) in the middle of a charge: back to the idle overlay
            if (this._phase != IDLE && CREEPS._creepCount <= 0) {
                this.endCycle();
            }
        }

        private function multiplier():Number {
            var overdrive:Number = Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp() ? 1.25 : 1;
            return (0.5 + 0.5 / maxHealth * health) * overdrive;
        }

        private function hitJar():void {
            var dmg:Number = damage * this.multiplier();
            _jarHealth.Add(-int(dmg));
            ATTACK.Damage(_mc.x, _mc.y + _top, dmg);
            EFFECTS.Lightning(_mc.x, _mc.y + _top, _mc.x, _mc.y + _top - 20, null, ARC_COLOUR);
            SOUNDS.Play("lightningfire", 0.4);
            if (_jarHealth.Get() <= 0) {
                KillJar();
            }
        }

        private function centre():Point {
            return _position.add(new Point(0, _footprint[0].height / 2));
        }

        /** Where the arc leaves the coil: the orb's prong, on the side it points to. */
        public function prong():Point {
            var a:Number = _animTick * 11.25 * Math.PI / 180;
            var gx:Number = Math.cos(a) * PRONG;
            var gy:Number = Math.sin(a) * PRONG;
            return new Point(_mc.x + gx - gy, _mc.y + _top + (gx + gy) / 2);
        }

        /** The flash: the target it has turned to if it is still there, else the closest monster in range. */
        private function discharge():void {
            if (_position == null) {
                return;
            }
            var first:MonsterBase = this.aimTarget();
            if (!first) {
                SOUNDS.Play("lightningend", 0.8);
                return;
            }
            ++this.shots;
            SOUNDS.Play("lightningfire", 0.8);
            var dmg:Number = damage * this.multiplier();
            var jumps:int = int(this.ext().jumps);
            var radius:Number = Number(this.ext().jumpRadius) || 70;
            var hit:Array = [];
            var cur:MonsterBase = first;
            var from:Point = this.prong();
            var alt:Number = 0;
            var dealt:Number = 0;
            while (cur && hit.length <= jumps) {
                alt = cur._movement == "fly" ? cur._altitude : 0;
                EFFECTS.Lightning(from.x, from.y, cur.x, cur.y - alt, null, ARC_COLOUR);
                dealt = int(dmg * cur._damageMult);
                cur.modifyHealth(-dealt);
                ATTACK.Damage(cur.x, cur.y - alt, dealt);
                hit.push(cur);
                from = new Point(cur.x, cur.y - alt);
                dmg *= JUMP_FALLOFF;
                cur = this.nextInChain(cur, radius, hit);
            }
        }

        private function nextInChain(from:MonsterBase, radius:Number, hit:Array):MonsterBase {
            var near:Array = Targeting.getCreepsInRange(radius, new Point(from.x, from.y), this._chainFlags);
            near.sortOn(["dist"], Array.NUMERIC);
            var m:MonsterBase = null;
            for each (var c:Object in near) {
                m = c.creep as MonsterBase;
                if (m && m.health > 0 && m.isTargetable && !m.invisible && hit.indexOf(m) == -1) {
                    return m;
                }
            }
            return null;
        }

        override public function Description():void {
            super.Description();
            var lvl:int = _lvl.Get();
            if (lvl > 0 && lvl < _buildingProps.stats.length) {
                var now:int = int(_buildingProps.stats[lvl - 1].ext.jumps);
                var next:int = int(_buildingProps.stats[lvl].ext.jumps);
                if (next > now) {
                    _upgradeDescription += "Arcs leap to " + next + " more monsters (from " + now + ")<br>";
                }
            }
        }

        override public function Setup(param1:Object):void {
            param1.t = _type;
            super.Setup(param1);
            _animRandomStart = false;
            Props();
        }
    }
}
