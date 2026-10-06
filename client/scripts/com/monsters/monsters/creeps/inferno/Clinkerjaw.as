package com.monsters.monsters.creeps.inferno {
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.abilities.DeathSplit;
    import com.monsters.monsters.components.modifiers.MultiplicationPropertyModifier;
    import com.monsters.monsters.creeps.CreepBase;
    import flash.geom.Point;

    /**
     * Inferno-only: Clinkerjaw (IC12), furnace slag that got hungry. When it dies its crust cracks open:
     *  - `splits` Spurtz (2 at levels 1-3, 3 at levels 4-6) spill out, at the Spurtz level of whoever sent it
     *    (DeathSplit, as Slimeattikus does with its young). They are small ones: drawn at 3/4 size (the
     *    "IC1s" sprite sheet, monsters/spurtz_small.png) and moving at 3/4 of a Spurtz's speed; every other
     *    stat (health, damage, what they target) is a Spurtz's.
     *  - it leaves a pool of magma (MagmaPuddle) that gives every hurt monster on its side within short
     *    range 100 health, once each.
     */
    public class Clinkerjaw extends CreepBase {

        public static const ID:String = "IC12";

        /** The hatchlings' size and speed, against a Spurtz's. */
        public static const HATCHLING_SCALE:Number = 0.75;

        public static const HATCHLING_SKIN:String = "IC1s";

        private var _puddleDropped:Boolean = false;

        public function Clinkerjaw(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            addComponent(new DeathSplit(this, "IC1", hatchling));
            addEventListener(MonsterBase.k_DEATH_EVENT, this.dropPuddle);
            MagmaPuddle.Preload();
            SPRITES.SetupSprite(HATCHLING_SKIN);
        }

        /** A Spurtz that hatches from it: 3/4 the size and 3/4 the speed. */
        public static function hatchling(param1:MonsterBase):void {
            if (!param1) {
                return;
            }
            param1.moveSpeedProperty.addModifier(new MultiplicationPropertyModifier(HATCHLING_SCALE));
            if (param1 is CreepBase) {
                CreepBase(param1).ioSkin(HATCHLING_SKIN);
            }
            param1.ioHatchling = true;
        }

        private function dropPuddle(param1:* = null):void {
            removeEventListener(MonsterBase.k_DEATH_EVENT, this.dropPuddle);
            if (this._puddleDropped || _friendly && _house) {
                return;
            }
            this._puddleDropped = true;
            MagmaPuddle.Drop(_tmpPoint.x, _tmpPoint.y, _friendly);
        }

        override public function deathSplat():void {
            EFFECTS.Burn(_tmpPoint.x, _tmpPoint.y);
            EFFECTS.Scorch(new Point(_tmpPoint.x, _tmpPoint.y));
        }
    }
}
