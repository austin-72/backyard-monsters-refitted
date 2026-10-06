package com.monsters.display {
    import com.monsters.display.warts.*;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.MovieClip;

    /*
     * Inferno-only: the yard's mushrooms are drawn as warts (the user's art, 30 September). One wart and one
     * shadow for each of the six mushroom frames, each the size of the bitmap it stands in for and placed at
     * the same offset from the building's origin, so the warts sit, shadow and get picked exactly where the
     * mushrooms did. Built as MovieClips because RasterData measures a MovieClip's rect (a Sprite's would be
     * empty). assets.swf is untouched, so the overworld keeps its mushrooms.
     */
    public class IoWarts {

        public static const FRAMES:int = 6;

        private static const SPRITES:Array = [IoWartSprite1, IoWartSprite2, IoWartSprite3, IoWartSprite4, IoWartSprite5, IoWartSprite6];

        private static const SHADOWS:Array = [IoWartShadow1, IoWartShadow2, IoWartShadow3, IoWartShadow4, IoWartShadow5, IoWartShadow6];

        /* [x, y] of each bitmap relative to the origin, as the mushroom shapes in assets.swf store them. */
        private static const SPRITE_AT:Array = [[-27, -18.5], [-19, -5.5], [-20.5, -21.5], [-22.5, -12], [-24.5, -20.5], [-24, -45.5]];

        private static const SHADOW_AT:Array = [[-28, 0], [-18.5, -1], [-17, -5], [-21, -0.5], [-17, 2.5], [-17.5, 3]];

        private static var _sprites:Array = [];

        private static var _shadows:Array = [];

        public static function sprite(frame:int):MovieClip {
            var i:int = index(frame);
            return clip(bitmapData(_sprites, SPRITES, i), SPRITE_AT[i]);
        }

        public static function shadow(frame:int):MovieClip {
            var i:int = index(frame);
            return clip(bitmapData(_shadows, SHADOWS, i), SHADOW_AT[i]);
        }

        private static function index(frame:int):int {
            return Math.max(1, Math.min(FRAMES, frame)) - 1;
        }

        private static function bitmapData(cache:Array, classes:Array, i:int):BitmapData {
            if (!cache[i]) {
                var c:Class = classes[i] as Class;
                cache[i] = new c() as BitmapData;
            }
            return cache[i] as BitmapData;
        }

        private static function clip(data:BitmapData, at:Array):MovieClip {
            var mc:MovieClip = new MovieClip();
            var bmp:Bitmap = new Bitmap(data);
            bmp.smoothing = false;
            bmp.x = at[0];
            bmp.y = at[1];
            mc.addChild(bmp);
            return mc;
        }
    }
}
