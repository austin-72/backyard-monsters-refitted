package com.monsters.monsters.creeps.inferno.hfo {
    import com.monsters.configs.BYMConfig;
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.abilities.DeathSplit;
    import com.monsters.monsters.creeps.CreepBase;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;

    /**
     * Hell Freezes Over: the ice cretins (IC26-IC31; CREATURELOCKER ioAddHfoMonsters), the event's waves.
     *
     * Each is drawn from its own sheet (monsters/<name>.png, the user's hfo_monsters.zip): 30 facings 12 degrees
     * apart (column 0 facing right, turning clockwise, as the game's rotation counts), row 0 standing and the
     * rows after it the walk (the Sleetwing's flap). There are no separate attack or death frames: they walk on
     * the spot as they strike, like the Inferno's own. SHEETS gives each frame's size and where the feet are.
     *
     * Their hits carry the ice powers (IoIce). The Permafrost Hulk shatters into Shivlings when it falls
     * (DeathSplit, its "splits"). The Sleetwing's blow from the air is thrown as an ice orb (IoIce.orb).
     * The Shivling, Slushgut, Rimeclaw and Permafrost Hulk stand while they strike (NO_WALK_STRIKE: the user's, 4
     * October); the others step through their walk rows (they have no attack frames).
     */
    public class IoIceCreep extends CreepBase {

        /** [frame width, frame height, feet x, feet y, walk rows] for each sheet. */
        public static const SHEETS:Object = {
                "IC26": [32, 34, 16, 26, 2],
                "IC27": [60, 48, 30, 33, 4],
                "IC28": [60, 52, 30, 36, 4],
                "IC29": [60, 50, 30, 25, 8],
                "IC30": [56, 48, 28, 34, 4],
                "IC31": [84, 76, 42, 52, 4]
            };

        /** Monsters drawn standing, not walking on the spot, while they strike. */
        public static const NO_WALK_STRIKE:Object = {"IC26": true, "IC27": true, "IC28": true, "IC31": true};

        protected var m_sheet:Array;

        protected var m_ready:Boolean = false;

        private var m_lastCell:int = -1;

        public function IoIceCreep(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            this.m_sheet = SHEETS[_creatureID] as Array || SHEETS["IC26"];
            this.useOwnGraphic();
            this.m_ready = true;
            if (CREATURES.GetProperty(_creatureID, "splits", 0, _friendly) > 0) {
                addComponent(new DeathSplit(this, CREATURELOCKER.SHIVLING_ID));
            }
        }

        /** CreepBase made a 52 x 50 monster bitmap; these frames are their own size, drawn with the feet on the spot. */
        protected function useOwnGraphic():void {
            SPRITES.SetupSprite(_creatureID);
            if (BYMConfig.instance.RENDERER_ON) {
                if (_rasterData) {
                    _rasterData.clear();
                }
            }
            else if (Boolean(_graphicMC) && Boolean(_graphicMC.parent)) {
                _graphicMC.parent.removeChild(_graphicMC);
            }
            _graphic = new BitmapData(this.m_sheet[0], this.m_sheet[1], true, 0);
            _graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(_graphic) : graphic.addChild(new Bitmap(_graphic)) as Bitmap;
            _graphicMC.x = -this.m_sheet[2];
            _graphicMC.y = -this.m_sheet[3] - (_movement == "fly" ? _altitude : 0);
            if (BYMConfig.instance.RENDERER_ON) {
                _rasterData = new RasterData(_graphic, _rasterPt, int.MAX_VALUE);
            }
        }

        override protected function getNextSprite():void {
            // CreepBase's constructor draws a first frame before this class has made its own canvas; skip that one.
            if (!this.m_ready) {
                return;
            }
            if (_movement == "fly" || _movement == "fly_low") {
                SPRITES.GetSprite(_shadow, "shadow", "shadow", 0);
            }
            var walkRows:int = this.m_sheet[4];
            var column:int = int((m_rotation < 0 ? m_rotation + 360 : m_rotation) / 12) % 30;
            var row:int = 0;
            if (_movement == "fly") {
                row = health > 0 ? int(_frameNumber / 8) % walkRows + 1 : 0;
            }
            else if (health > 0 && NO_WALK_STRIKE[_creatureID]) {
                // standing while it strikes (and when it stops or is frozen); walking only when it walks
                if (!ioFrozen() && !_attacking && !_atTarget && !ioStandingStill()) {
                    row = int(_frameNumber / 8) % walkRows + 1;
                }
            }
            else if (health > 0 && !ioFrozen() && (ioStandingStill() ? _attacking || _atTarget : true)) {
                // (at its target it keeps stepping: these sheets have no attack frames, and a still frame read as
                // a monster doing nothing; frozen by an ice hit, it is still)
                row = int(_frameNumber / 8) % walkRows + 1;
            }
            var cell:int = row * 30 + column;
            if (cell != this.m_lastCell) {
                var sheet:Object = SPRITES.GetSpriteDescriptor(_creatureID);
                if (!sheet || !sheet.image) {
                    return; // (the sheet is still loading: drawn once it is there)
                }
                this.m_lastCell = cell;
                SPRITES.GetFrameById(_graphic, _creatureID, column, row);
            }
        }

        /** Held by an ice hit (IoFreezeEffect). */
        private function ioFrozen():Boolean {
            return getComponentByName(IoFreezeEffect.NAME) != null;
        }

        override protected function tickState(param1:int = 1):Boolean {
            var done:Boolean = super.tickState(param1);
            // CreepBase holds a flyer at its altitude with the stock frame's feet (36 down); this frame's are elsewhere
            if (_movement == "fly" && health > 0 && _behaviour !== k_sBHVR_PEN && _graphicMC) {
                _graphicMC.y += 36 - this.m_sheet[3];
            }
            return done;
        }

        override protected function attacked(param1:IAttackable, param2:Number, param3:ITargetable = null):void {
            super.attacked(param1, param2, param3);
            if (param3 == null && _creatureID == CREATURELOCKER.SLEETWING_ID) {
                // its blow from the air, thrown as an ice orb; the ice lands with it
                IoIce.attacked(this, param1, IoIce.orb(this, param1));
                return;
            }
            IoIce.attacked(this, param1, param3);
        }

        override public function deathSplat():void {
            SOUNDS.Play("ihit" + int(1 + Math.random() * 7), 0.4);
            IoIce.burst(_tmpPoint.x, _tmpPoint.y - _altitude, null);
        }
    }
}
