package com.monsters.monsters.creeps.inferno.hfo {
    import com.monsters.configs.BYMConfig;
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.creeps.CreepBase;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;

    /**
     * Hell Freezes Over: Rimegrave (IC25), the ice champion: a frost wendigo-elk with an ice-bone skull and
     * crystal antlers, sealed in the ice beside the player's yard and freed by winning the event's 13 waves. Then
     * unlocked in the Strongbox (page 5) and trained in the Academy to level 6 like Korath, Drull and Ashkarr.
     *
     * His look follows his Academy level: one sheet a level (monsters/rimegrave_1-6.png, sprites IC25_1-IC25_6),
     * 16 facings 22.5 degrees apart, row 0 standing, rows 1-8 the walk, rows 9-14 the attack. His hits carry the
     * ice powers (IoIce), attacking and defending: towers iced over, monsters frozen for a second.
     */
    public class IoRimegrave extends CreepBase {

        public static const ID:String = "IC25";

        /**
         * [frame width, frame height, feet x, feet y] for each level's sheet (the user's code_snippets; the smaller
         * sheets of 1 October, hfo_monsters_1.zip).
         */
        public static const SHEETS:Array = [[86, 96, 43, 71], [102, 114, 51, 84], [118, 130, 59, 96], [134, 148, 67, 109], [148, 166, 74, 122], [164, 182, 82, 134]];

        private var m_level:int = 1;

        private var m_ready:Boolean = false;

        private var m_lastCell:int = -1;

        private var m_spriteID:String;

        public function IoRimegrave(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            this.m_level = levelOf(param5, _friendly);
            this.m_spriteID = ID + "_" + this.m_level;
            this.useOwnGraphic();
            this.m_ready = true;
        }

        public function get level():int {
            return this.m_level;
        }

        /** The level he was made at: his health is unique to one level of the table. */
        private static function levelOf(requested:int, friendly:Boolean):int {
            var health:Number = CREATURES.GetProperty(ID, "health", requested, friendly);
            var table:Array = CREATURELOCKER._creatures[ID] ? CREATURELOCKER._creatures[ID].props.health as Array : null;
            var index:int = table ? table.indexOf(health) : -1;
            return index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1));
        }

        /** His reach (40-65) sets how close he gets; it isn't a shooting range: he strikes, he doesn't shoot. */
        override public function get isRanged():Boolean {
            return false;
        }

        private function useOwnGraphic():void {
            var sheet:Array = SHEETS[this.m_level - 1];
            SPRITES.SetupSprite(this.m_spriteID);
            if (BYMConfig.instance.RENDERER_ON) {
                if (_rasterData) {
                    _rasterData.clear();
                }
            }
            else if (Boolean(_graphicMC) && Boolean(_graphicMC.parent)) {
                _graphicMC.parent.removeChild(_graphicMC);
            }
            _graphic = new BitmapData(sheet[0], sheet[1], true, 0);
            _graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(_graphic) : graphic.addChild(new Bitmap(_graphic)) as Bitmap;
            _graphicMC.x = -sheet[2];
            _graphicMC.y = -sheet[3];
            if (BYMConfig.instance.RENDERER_ON) {
                _rasterData = new RasterData(_graphic, _rasterPt, int.MAX_VALUE);
            }
        }

        override protected function getNextSprite():void {
            if (!this.m_ready) {
                return;
            }
            var column:int = int((m_rotation < 0 ? m_rotation + 360 : m_rotation) / 22.5) % 16;
            var row:int = 0;
            var still:Boolean = ioStandingStill();
            var frozen:Boolean = getComponentByName(IoFreezeEffect.NAME) != null;
            if (health > 0 && !frozen && (_attacking || _atTarget)) {
                // (at his target he strikes, between blows too: no still frame while fighting)
                row = 9 + int(_frameNumber / 8) % 6;
            }
            else if (health > 0 && !frozen && !still) {
                row = 1 + int(_frameNumber / 8) % 8;
            }
            var cell:int = row * 16 + column;
            if (cell != this.m_lastCell) {
                var sheet:Object = SPRITES.GetSpriteDescriptor(this.m_spriteID);
                if (!sheet || !sheet.image) {
                    return;
                }
                this.m_lastCell = cell;
                SPRITES.GetFrameById(_graphic, this.m_spriteID, column, row);
            }
        }

        override protected function attacked(param1:IAttackable, param2:Number, param3:ITargetable = null):void {
            super.attacked(param1, param2, param3);
            // his reach: each strike is thrown as an ice orb that flies to the target, and the ice lands with it
            IoIce.attacked(this, param1, param3 != null ? param3 : IoIce.orb(this, param1));
        }

        override public function deathSplat():void {
            SOUNDS.Play("quake", 0.3);
            IoIce.burst(_tmpPoint.x, _tmpPoint.y, null);
        }
    }
}
