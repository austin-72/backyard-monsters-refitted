package com.monsters.monsters.creeps.inferno {
    import com.monsters.configs.BYMConfig;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.abilities.LifestealOnAttack;
    import com.monsters.monsters.creeps.CreepBase;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;

    /**
     * Inferno-only: the Emberghoul (IC20; the user's FUSEBUG_EMBERGHOUL.md), a furnace-stoker ghoul that heals
     * itself with every hit it lands: 8% of the damage the hit does at level 1, up to 12% at level 6
     * (LifestealOnAttack; it was 15-20% until the balance pass of 30 September). Its sheet (monsters/emberghoul.png: 30 facings of 66 x 45, row 0 standing, 1-8 walk,
     * 9-16 attack) is wider than a creep's usual 52 x 50 canvas, so it draws on one of its own, its feet
     * (33, 38) on its spot. The attack rows play while it fights (CreepBase.ioAction).
     */
    public class Emberghoul extends CreepBase {

        public static const ID:String = "IC20";

        public static const STEAL:Array = [0.08, 0.09, 0.1, 0.1, 0.11, 0.12];

        public static const FRAME_W:int = 66;

        public static const FRAME_H:int = 45;

        public static const FEET_X:int = 33;

        public static const FEET_Y:int = 38;

        private var m_level:int = 1;

        public function Emberghoul(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            this.m_level = levelOf(param5, _friendly);
            this.useOwnCanvas();
            addComponent(new LifestealOnAttack(STEAL[this.m_level - 1]));
        }

        public function get level():int {
            return this.m_level;
        }

        /** The level it was made at: its health is unique to one level of the table. */
        private static function levelOf(requested:int, friendly:Boolean):int {
            var health:Number = CREATURES.GetProperty(ID, "health", requested, friendly);
            var table:Array = CREATURELOCKER._creatures[ID] ? CREATURELOCKER._creatures[ID].props.health as Array : null;
            var index:int = table ? table.indexOf(health) : -1;
            return index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1));
        }

        private function useOwnCanvas():void {
            if (BYMConfig.instance.RENDERER_ON) {
                if (_rasterData) {
                    _rasterData.clear();
                }
            }
            else if (Boolean(_graphicMC) && Boolean(_graphicMC.parent)) {
                _graphicMC.parent.removeChild(_graphicMC);
            }
            _graphic = new BitmapData(FRAME_W, FRAME_H, true, 0);
            _graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(_graphic) : graphic.addChild(new Bitmap(_graphic)) as Bitmap;
            _graphicMC.x = -FEET_X;
            _graphicMC.y = -FEET_Y;
            if (BYMConfig.instance.RENDERER_ON) {
                _rasterData = new RasterData(_graphic, _rasterPt, int.MAX_VALUE);
            }
            _lastFrame = -1;
        }
    }
}
