package com.monsters.monsters.creeps {
    import com.monsters.configs.BYMConfig;
    import com.monsters.events.ProjectileEvent;
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.statusEffects.FlameEffect;
    import com.monsters.pathing.PATHING;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;

    /**
     * Inferno-only: Korath (IC9) and Drull (IC10) as ordinary monsters, hatched, housed, flung and
     * trained like any other. Their stats per level are in CREATURELOCKER, and they are drawn with the
     * champions' art (sprites G4_n / G2_n, CHAMPIONCAGE offsets): levels 1-2 with the champion's level 4
     * art, 3-4 with its level 5, 5-6 with its level 6 (ART_LEVEL).
     *
     * Korath keeps his champion abilities, unlocked by level the way his powers were:
     *   every hit on a monster sets it on fire (a damage-over-time burn, 10% of his damage);
     *   from level 4, a flying enemy near him is hit by a magma fireball (a quarter of his damage, and burns);
     *   from level 5, every third attack is a ground stomp that hits everything around him.
     * Drull is a plain heavy hitter, as his champion was.
     */
    public class IoChampionCreep extends CreepBase {

        public static const KORATH_ID:String = "IC9";

        public static const DRULL_ID:String = "IC10";

        private var m_spriteID:String;

        private var m_level:int = 1;

        /** The champion art each level is drawn with (the user's choice, 28 September): 1-2 the champion's
         * level 4 art, 3-4 its level 5, 5-6 its level 6. */
        public static const ART_LEVEL:Array = [4, 4, 5, 5, 6, 6];

        private var m_artLevel:int = 4;

        private var m_attackNum:int = 0;

        public function IoChampionCreep(param1:String, param2:String, param3:Point, param4:Number, param5:int = 0, param6:int = 2147483647, param7:Point = null, param8:Boolean = false, param9:BFOUNDATION = null, param10:Number = 1, param11:Boolean = false, param12:MonsterBase = null) {
            super(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
            this.m_level = levelOf(_creatureID, param5, _friendly);
            var champion:String = _creatureID == KORATH_ID ? "G4" : "G2";
            this.m_artLevel = ART_LEVEL[Math.max(1, Math.min(6, this.m_level)) - 1];
            this.m_spriteID = champion + "_" + this.m_artLevel;
            if (_creatureID == KORATH_ID) {
                attackDelayProperty.value = this.m_level >= 3 ? 80 : 72;
            }
            this.useChampionGraphic(champion);
        }

        /**
         * Their range is the champions' melee reach (35-90), not a shooting range: anything with a range
         * above 1 would otherwise fire projectiles. It still sets how close they get and the stomp's size.
         */
        override public function get isRanged():Boolean {
            return false;
        }

        /** The level this monster was made at: its health is unique to one level of the table. */
        private static function levelOf(id:String, requested:int, friendly:Boolean):int {
            var health:Number = CREATURES.GetProperty(id, "health", requested, friendly);
            var table:Array = CREATURELOCKER._creatures[id].props.health as Array;
            var index:int = table ? table.indexOf(health) : -1;
            return index >= 0 ? index + 1 : 1;
        }

        /** CreepBase made a 52 x 50 monster bitmap; the champions' frames are larger and offset. */
        private function useChampionGraphic(champion:String):void {
            SPRITES.SetupSprite(this.m_spriteID);
            var descriptor:Object = SPRITES.GetSpriteDescriptor(this.m_spriteID);
            if (!descriptor) {
                return;
            }
            if (BYMConfig.instance.RENDERER_ON) {
                if (_rasterData) {
                    _rasterData.clear();
                }
            }
            else if (Boolean(_graphicMC) && Boolean(_graphicMC.parent)) {
                _graphicMC.parent.removeChild(_graphicMC);
            }
            _graphic = new BitmapData(descriptor.width, descriptor.height, true, 0);
            _graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(_graphic) : graphic.addChild(new Bitmap(_graphic)) as Bitmap;
            _graphicMC.x = CHAMPIONCAGE.GetGuardianProperty(champion, this.m_artLevel, "offset_x");
            _graphicMC.y = CHAMPIONCAGE.GetGuardianProperty(champion, this.m_artLevel, "offset_y");
            if (BYMConfig.instance.RENDERER_ON) {
                _rasterData = new RasterData(_graphic, _rasterPt, int.MAX_VALUE);
            }
        }

        override protected function getNextSprite():void {
            // CreepBase's constructor draws a first frame before this class's constructor has chosen the
            // champion art; skip that one, the next tick draws with the right sprite.
            if (!this.m_spriteID) {
                return;
            }
            if (_attacking) {
                SPRITES.GetSprite(_graphic, this.m_spriteID, GLOBAL.e_BASE_MODE.ATTACK, m_rotation - 45, _frameNumber);
            }
            else if (_atTarget || ioStandingStill()) {
                // (standing, also when held still, e.g. rooted: not walking on the spot)
                SPRITES.GetSprite(_graphic, this.m_spriteID, "idle", m_rotation - 45);
            }
            else {
                SPRITES.GetSprite(_graphic, this.m_spriteID, "walking", m_rotation - 45, _frameNumber);
            }
        }

        override protected function attacked(param1:IAttackable, param2:Number, param3:ITargetable = null):void {
            super.attacked(param1, param2, param3);
            if (_creatureID != KORATH_ID || health <= 0) {
                return;
            }
            if (param1 is MonsterBase) {
                this.burn(MonsterBase(param1));
            }
            if (this.m_level >= 4) {
                this.fireballAtFlyer();
            }
            if (this.m_level >= 5 && ++this.m_attackNum >= 3) {
                this.m_attackNum = 0;
                this.stomp();
            }
        }

        private function burn(param1:MonsterBase):void {
            if (param1 && param1.health > 0) {
                param1.addStatusEffect(new FlameEffect(param1, damage * 0.1));
            }
        }

        /** Korath's champion answer to flyers: a magma fireball at the nearest flying enemy close by. */
        private function fireballAtFlyer():void {
            var flags:int = Targeting.getEnemyFlag(this) | Targeting.k_TARGETS_FLYING;
            var found:Array = Targeting.getCreepsInRange(m_range * 3, PATHING.FromISO(_tmpPoint), flags, this);
            var entry:Object = null;
            var target:MonsterBase = null;
            var nearest:Number = Number.MAX_VALUE;
            for each (entry in found) {
                if (entry.creep && entry.creep._movement == "fly" && entry.dist < nearest) {
                    nearest = entry.dist;
                    target = entry.creep as MonsterBase;
                }
            }
            if (!target) {
                return;
            }
            var start:Point = Point.interpolate(_tmpPoint.add(new Point(0, -50)), target._tmpPoint, 0.8);
            var fireball:FIREBALL = FIREBALLS.Spawn2(start, target._tmpPoint, target, 8, damage / 4, 0, FIREBALLS.TYPE_MAGMA, 1, this);
            if (fireball) {
                fireball.addEventListener(FIREBALL.COLLIDED, this.onFireballHit, false, 0, true);
            }
        }

        private function onFireballHit(param1:ProjectileEvent):void {
            (param1.target as FIREBALL).removeEventListener(FIREBALL.COLLIDED, this.onFireballHit);
            if (param1.m_targetCreep is MonsterBase) {
                this.burn(MonsterBase(param1.m_targetCreep));
            }
        }

        /** The champion's stomp: damage falling off with distance, out to 2.5 times his reach. */
        private function stomp():void {
            var centre:Point = new Point(_mc.x, _mc.y);
            var flags:int = Targeting.getEnemyFlag(this) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_INVISIBLE;
            if (!_friendly) {
                flags |= Targeting.k_TARGETS_BUILDINGS;
            }
            var targets:Array = Targeting.getTargetsInRange(m_range * 2.5, centre, flags);
            if (targets && targets.length > 0) {
                Targeting.DealLinearAEDamage(centre, m_range * 2.5, damage, targets, m_range * 1.5);
            }
            SOUNDS.Play("quake", 0.4);
            var ring:IoStompRing = new IoStompRing(20, m_range * 2.5, BYMConfig.instance.RENDERER_ON ? new Point(_rasterPt.x, _rasterPt.y + _graphic.height * 0.6) : null);
            if (!BYMConfig.instance.RENDERER_ON) {
                _mc.addChildAt(ring.graphic, Math.max(graphic.getChildIndex(_graphicMC) - 1, 0));
            }
        }
    }
}

import com.monsters.configs.BYMConfig;
import com.monsters.rendering.RasterData;
import flash.display.Shape;
import flash.display.Sprite;
import flash.filters.GlowFilter;
import flash.geom.Point;
import gs.TweenLite;

/** The spreading orange rings of Korath's stomp (the champion's G4QuakeGraphic). */
class IoStompRing {

    public var graphic:Shape;

    private var m_rasterData:RasterData;

    public function IoStompRing(param1:uint, param2:uint, param3:Point = null) {
        var holder:Sprite = null;
        super();
        this.graphic = new Shape();
        this.graphic.graphics.lineStyle(0.3, 15893760, 0.5);
        this.graphic.graphics.drawEllipse(-param1, -param1 / 2, param1 * 2, param1);
        this.graphic.graphics.drawEllipse(-param1 * 0.8, -param1 / 2.5, param1 * 1.6, param1 * 0.8);
        this.graphic.graphics.drawEllipse(-param1 * 0.6, -param1 / 3.333333, param1 * 1.2, param1 * 0.6);
        this.graphic.filters = [new GlowFilter(16737792, 1, 20, 20, 5 + Math.random() * 5, 1, false, false)];
        TweenLite.to(this.graphic, 1, {
                    "width": param2 * 2,
                    "height": param2,
                    "alpha": 0,
                    "onComplete": this.onComplete
                });
        if (BYMConfig.instance.RENDERER_ON && Boolean(param3)) {
            holder = new Sprite();
            holder.addChild(this.graphic);
            this.m_rasterData = new RasterData(holder, new Point(param3.x + holder.width, param3.y + holder.height), MAP.DEPTH_SHADOW + 1);
        }
    }

    private function onComplete():void {
        if (this.graphic.parent) {
            this.graphic.parent.removeChild(this.graphic);
        }
        this.graphic.filters = [];
        if (this.m_rasterData) {
            this.m_rasterData.clear();
        }
        this.m_rasterData = null;
    }
}
