package com.monsters.monsters.creeps.inferno {
    import com.monsters.configs.BYMConfig;
    import com.monsters.display.ImageCache;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.rendering.RasterData;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.geom.Point;
    import flash.utils.Dictionary;
    import flash.utils.getTimer;

    /**
     * Inferno-only: the pool of magma a Clinkerjaw (IC12) leaves where it dies. For `LIFE_TICKS` (6 seconds of
     * game time: the game runs 80 steps a second) every monster on the Clinkerjaw's side that is within `RADIUS` of it and hurt gets `HEAL`
     * health back, once: each monster is healed by a puddle one time only (never above its full health). The
     * picture (effects/magma_puddle.png) lies on the ground under the monsters, glows, and fades out over the
     * last second. Puddles tick with the monsters (CREEPS.Tick) and go when the map is cleared (MAP.Clear).
     */
    public class MagmaPuddle {

        public static const HEAL:int = 100;

        /** In ground units, as Targeting measures (about a trap's blast): 50 is about 140 x 70 on screen. */
        public static const RADIUS:Number = 50;

        public static const LIFE_TICKS:int = 480;

        private static const FADE_TICKS:int = 80;

        private static const SCAN_EVERY:int = 8;

        public static const IMAGE:String = "effects/magma_puddle.png";

        private static var s_all:Array = [];

        private static var s_bmd:BitmapData;

        private static var s_loading:Boolean = false;

        private var _x:Number;

        private var _y:Number;

        private var _flags:int;

        private var _age:int = 0;

        private var _born:int;

        private var _healed:Dictionary = new Dictionary(true);

        private var _raster:RasterData;

        private var _bitmap:Bitmap;

        private var _pt:Point = new Point();

        /** How many monsters this puddle has healed (for tests). */
        public var healedCount:int = 0;

        public function MagmaPuddle(param1:Number, param2:Number, param3:Boolean) {
            super();
            this._x = param1;
            this._y = param2;
            this._born = getTimer();
            this._flags = (param3 ? Targeting.k_TARGETS_DEFENDERS : Targeting.k_TARGETS_ATTACKERS) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
        }

        public static function Preload():void {
            if (s_bmd || s_loading) {
                return;
            }
            s_loading = true;
            ImageCache.GetImageWithCallBack(IMAGE, function(param1:String, param2:BitmapData, param3:Array = null):void {
                s_bmd = param2;
                s_loading = false;
            });
        }

        /** A puddle where a Clinkerjaw fell (param1, param2: its map position), healing its own side. */
        public static function Drop(param1:Number, param2:Number, param3:Boolean):MagmaPuddle {
            Preload();
            var p:MagmaPuddle = new MagmaPuddle(param1, param2, param3);
            s_all.push(p);
            p.heal();
            return p;
        }

        public static function get puddles():Array {
            return s_all;
        }

        public static function TickAll():void {
            var i:int = s_all.length - 1;
            while (i >= 0) {
                if (MagmaPuddle(s_all[i]).tick()) {
                    MagmaPuddle(s_all[i]).remove();
                    s_all.splice(i, 1);
                }
                i--;
            }
        }

        public static function ClearAll():void {
            for each (var p:MagmaPuddle in s_all) {
                p.remove();
            }
            s_all = [];
        }

        /** True when it is gone. */
        public function tick():Boolean {
            ++this._age;
            // (a puddle outlives nothing: game time, or 3 times its life in real time if the game stopped ticking)
            if (this._age > LIFE_TICKS || getTimer() - this._born > LIFE_TICKS * 12.5 * 3) {
                return true;
            }
            if (this._age % SCAN_EVERY == 0) {
                this.heal();
            }
            this.draw();
            return false;
        }

        private function heal():void {
            var near:Array = Targeting.getCreepsInRange(RADIUS, new Point(this._x, this._y), this._flags);
            var m:MonsterBase = null;
            for each (var c:Object in near) {
                m = c.creep as MonsterBase;
                if (!m || this._healed[m] || m.health <= 0 || m.health >= m.maxHealth) {
                    continue;
                }
                this._healed[m] = true;
                ++this.healedCount;
                m.modifyHealth(HEAL);
            }
        }

        private function alpha():Number {
            var a:Number = 0.9 + 0.1 * Math.sin(this._age / 12);
            if (this._age > LIFE_TICKS - FADE_TICKS) {
                a *= (LIFE_TICKS - this._age) / FADE_TICKS;
            }
            if (this._age < 12) {
                a *= this._age / 12;
            }
            return Math.max(0, Math.min(1, a));
        }

        private function draw():void {
            if (!s_bmd || !GLOBAL._render) {
                return;
            }
            if (BYMConfig.instance.RENDERER_ON) {
                if (!MAP.instance) {
                    return;
                }
                var off:Point = MAP.instance.offset;
                this._pt.x = this._x - s_bmd.width * 0.5 - off.x;
                this._pt.y = this._y - s_bmd.height * 0.5 - off.y;
                if (!this._raster) {
                    // on the ground: over the ground's shadows, under the monsters and buildings
                    this._raster = new RasterData(s_bmd, this._pt, MAP.DEPTH_SHADOW + 0.5);
                }
                this._raster.alpha = this.alpha();
            }
            else if (MAP._EFFECTS) {
                if (!this._bitmap) {
                    this._bitmap = MAP._EFFECTS.addChild(new Bitmap(s_bmd)) as Bitmap;
                    this._bitmap.x = this._x - s_bmd.width * 0.5;
                    this._bitmap.y = this._y - s_bmd.height * 0.5;
                }
                this._bitmap.alpha = this.alpha();
            }
        }

        private function remove():void {
            if (this._raster) {
                this._raster.clear();
                this._raster = null;
            }
            if (this._bitmap && this._bitmap.parent) {
                this._bitmap.parent.removeChild(this._bitmap);
            }
            this._bitmap = null;
        }
    }
}
