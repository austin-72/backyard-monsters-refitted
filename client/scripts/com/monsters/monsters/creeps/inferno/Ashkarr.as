package com.monsters.monsters.creeps.inferno {
    import com.monsters.configs.BYMConfig;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.abilities.WarCry;
    import com.monsters.monsters.creeps.CreepBase;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;

    /**
     * Inferno-only: Ashkarr, the Ember Herald (IC24), Moloch's warlord (the user's ASHKARR.md). A champion-class
     * monster: Strongbox page 5 with Korath and Drull, 600 housing, trained to level 6 in the Academy.
     *
     * Every 10 seconds in battle she roars (WarCry): her side's monsters within 300 move faster for 11 seconds, so
     * one that stays near her keeps it from roar to roar (x1.20 at level 1 to x1.35 at level 6; several Ashkarrs
     * never add up, the strongest boost counts), and the other side's monsters within 300 are rooted for 7
     * seconds (they still attack what they can reach).
     *
     * Drawn from her own sheet (monsters/ashkarr.png): 16 facings of 188 x 128, column = facing / 22.5 with 0
     * facing right and 90 facing the camera (as the game's rotation counts); rows 0-9 walk, 10-19 attack,
     * 20-29 the war-cry (while she roars), 30-37 idle. Her feet are at (94, 102) in a frame.
     */
    public class Ashkarr extends CreepBase {

        public static const ID:String = "IC24";

        public static const FRAME_W:int = 188;

        public static const FRAME_H:int = 128;

        public static const FEET_X:int = 94;

        public static const FEET_Y:int = 102;

        /** The war-cry per level: how much faster her side moves (1-6). */
        public static const BOOST:Array = [1.2, 1.22, 1.25, 1.28, 1.31, 1.35];

        public static const RADIUS:Number = 300;

        /**
         * Game steps (80 a second): a roar every 10 seconds; the boost lasts 11 (so a monster that stays in range
         * keeps it from one roar to the next), the root 7.
         */
        public static const COOLDOWN_TICKS:int = 800;

        public static const BOOST_TICKS:int = 880;

        public static const ROOT_TICKS:int = 560;

        /** The roar's 10 frames, 8 steps each. */
        public static const ROAR_TICKS:int = 80;

        private var m_level:int = 1;

        private var m_ready:Boolean = false;

        private var m_lastCell:int = -1;

        /** Not moving (held still, e.g. rooted): she stands instead of walking on the spot. */
        private var m_still:Boolean = false;

        /** Steps of the roar left to show; 0 when she isn't roaring. */
        public var roarTicks:int = 0;

        public function Ashkarr(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            this.m_level = levelOf(param5, _friendly);
            this.useOwnGraphic();
            this.m_ready = true;
            addComponent(new WarCry(this, RADIUS, COOLDOWN_TICKS, BOOST[this.m_level - 1], BOOST_TICKS, ROOT_TICKS));
        }

        public function get level():int {
            return this.m_level;
        }

        /** The level she was made at: her health is unique to one level of the table. */
        private static function levelOf(requested:int, friendly:Boolean):int {
            var health:Number = CREATURES.GetProperty(ID, "health", requested, friendly);
            var table:Array = CREATURELOCKER._creatures[ID] ? CREATURELOCKER._creatures[ID].props.health as Array : null;
            var index:int = table ? table.indexOf(health) : -1;
            return index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1));
        }

        /** CreepBase made a 52 x 50 monster bitmap; her frames are 188 x 128, drawn with her feet on the spot. */
        private function useOwnGraphic():void {
            SPRITES.SetupSprite(ID);
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
        }

        /** Called by her WarCry when she roars: the war-cry rows play once through. */
        public function roar():void {
            this.roarTicks = ROAR_TICKS;
            SOUNDS.Play("imonster" + int(1 + Math.random() * 4), 0.9);
        }

        /** Which animation shows now: "warcry", "attack", "idle" or "walking". */
        public function get animation():String {
            if (this.roarTicks > 0) {
                return "warcry";
            }
            if (_attacking) {
                return "attack";
            }
            if (_atTarget || this.m_still) {
                return "idle";
            }
            return "walking";
        }

        override protected function tickState(param1:int = 1):Boolean {
            if (this.roarTicks > 0) {
                this.roarTicks = Math.max(0, this.roarTicks - param1);
            }
            return super.tickState(param1);
        }

        override protected function getNextSprite():void {
            // CreepBase's constructor draws a first frame before her own canvas is made; skip that one.
            if (!this.m_ready) {
                return;
            }
            this.m_still = ioStandingStill();
            var column:int = int(m_rotation / 22.5) % 16;
            var row:int = 0;
            switch (this.animation) {
                case "warcry":
                    row = 20 + Math.min(9, int((ROAR_TICKS - this.roarTicks) / 8));
                    break;
                case "attack":
                    row = 10 + int(_frameNumber / 8) % 10;
                    break;
                case "idle":
                    row = 30 + int(_frameNumber / 8) % 8;
                    break;
                default:
                    row = int(_frameNumber / 8) % 10;
            }
            var cell:int = row * 16 + column;
            if (cell != this.m_lastCell) {
                var sheet:Object = SPRITES.GetSpriteDescriptor(ID);
                if (!sheet || !sheet.image) {
                    return; // (the sheet is still loading: drawn once it is there)
                }
                this.m_lastCell = cell;
                SPRITES.GetFrameById(_graphic, ID, column, row);
            }
        }
    }
}
