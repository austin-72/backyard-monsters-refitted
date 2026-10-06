package com.monsters.monsters.creeps.inferno.hfo {
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.MonsterBase;
    import flash.geom.Point;

    /**
     * Hell Freezes Over: the Hailspitter (IC30), a frostbitten toad with a crystal mortar on its back. It lobs
     * hailstones (FIREBALL.TYPE_HAIL, effects hfo/extras/hailstone.png) over walls from range, and a hailstone
     * that lands is an ice hit like any other (IoIce).
     */
    public class IoHailspitter extends IoIceCreep {

        public function IoHailspitter(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            SPRITES.SetupSprite(FIREBALL.HAIL_GRAPHIC_NAME);
        }

        override protected function rangedAttack(param1:ITargetable):ITargetable {
            var from:Point = new Point(_tmpPoint.x, _tmpPoint.y - 20);
            if (param1 is BFOUNDATION) {
                return FIREBALLS.Spawn(from, _targetBuilding._position, _targetBuilding, 8, damage, 0, 0, FIREBALL.TYPE_HAIL, this);
            }
            return FIREBALLS.Spawn2(from, _targetCreep._tmpPoint, _targetCreep, 8, damage, 0, FIREBALL.TYPE_HAIL, 1, this);
        }
    }
}
