package com.monsters.monsters.creeps.inferno {
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.creeps.CreepBase;
    import com.monsters.pathing.PATHING;
    import flash.geom.Point;

    /**
     * Inferno-only: the Fusebug (IC15; the user's FUSEBUG_EMBERGHOUL.md). It explodes on its first attack with
     * the game's own blast (CreepBase.explode, as Eye-ra's; `"explode": [1]` in its locker entry).
     *
     * A creep stops at the edge of a building's footprint, which left the Fusebug going off well away from the
     * building's middle, where the blast is measured from (the user: "get closer to its targets"). So when it
     * would blow up at a building it first scuttles on in to it, walking (its walk frames), until it is within
     * CLOSE of the building's middle, or for at most MAX_APPROACH game steps, then goes off. Against a monster
     * (a defender that caught it) it goes off at once, as before.
     */
    public class Fusebug extends CreepBase {

        public static const ID:String = "IC15";

        /** How close (grid) to the building's middle it gets before it goes off. */
        public static const CLOSE:Number = 12;

        /** The longest it keeps creeping in (game steps: 1.5 s). */
        public static const MAX_APPROACH:int = 120;

        private var m_approach:int = 0;

        /** Creeping in to its building now. */
        public var approaching:Boolean = false;

        public function Fusebug(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        }

        /** The middle of a building, in map (iso) coordinates. */
        private static function middleOf(param1:BFOUNDATION):Point {
            return new Point(param1._mc.x, param1._mc.y + param1._middle);
        }

        /** Its distance (grid) to the building's middle. */
        public function distanceTo(param1:BFOUNDATION):Number {
            return Point.distance(PATHING.FromISO(_tmpPoint), PATHING.FromISO(middleOf(param1)));
        }

        override protected function explode():Number {
            var b:BFOUNDATION = _targetBuilding;
            if (!_targetCreep && b && b.health > 0 && b._mc && this.m_approach < MAX_APPROACH && this.distanceTo(b) > CLOSE) {
                // one step in, at its walking pace; asked again next step (the attack's cooldown kept at 0)
                ++this.m_approach;
                this.approaching = true;
                var to:Point = middleOf(b);
                _xd = to.x - _tmpPoint.x;
                _yd = to.y - _tmpPoint.y;
                var len:Number = Math.sqrt(_xd * _xd + _yd * _yd);
                var step:Number = Math.min(len, Math.max(0.5, moveSpeed * 0.5));
                if (len > 0) {
                    _tmpPoint.x += _xd / len * step;
                    _tmpPoint.y += _yd / len * step;
                    node = Targeting.CreepCellMove(_tmpPoint, _id, this, node);
                }
                attackCooldown = 0;
                return 0;
            }
            this.approaching = false;
            return super.explode();
        }

        /** Walking while it creeps in (not the standing frame it shows at a target). */
        override protected function ioAction():String {
            var action:String = super.ioAction();
            return this.approaching && action == "idle" ? "walking" : action;
        }
    }
}
