package com.monsters.maproom_advanced {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.MovieClip;
    import flash.geom.ColorTransform;

    /**
     * Inferno look for the Map Room 2 world map (inferno-only builds).
     *
     * The map tiles are vector frames baked into the SWF (water1-3, sand1-2, land1-6), so
     * instead of new art the terrain is re-coloured at runtime: water becomes glowing lava,
     * sand becomes ash, grass becomes scorched earth and rock becomes basalt. Only the
     * anonymous timeline shapes of a tile are tinted; named children (player flags, glow,
     * tribe icons) keep their colours.
     *
     * A ColorTransform is used rather than a filter so tiles are not forced into bitmap
     * caching - the map redraws hundreds of cells while scrolling.
     */
    public class InfernoMapTheme {

        // ColorTransform(redMult, greenMult, blueMult, alphaMult, redOffset, greenOffset, blueOffset)
        private static const LAVA_DEEP:ColorTransform = new ColorTransform(0.25, 0.30, 0.05, 1, 165, 35, 0, 0);

        private static const LAVA_MID:ColorTransform = new ColorTransform(0.25, 0.35, 0.05, 1, 190, 60, 0, 0);

        private static const LAVA_SHALLOW:ColorTransform = new ColorTransform(0.25, 0.40, 0.05, 1, 210, 85, 5, 0);

        // The water frames also carry a named child, mcWater: a flat (0, 204, 255) sheet at 50% alpha
        // that floats at sea level above the sea bed. Left alone it puts a blue film over the lava.
        // Its own colour is multiplied away and replaced: hotter and more opaque the deeper it is.
        private static const LAVA_SURFACE_DEEP:ColorTransform = new ColorTransform(0, 0, 0, 1.5, 255, 150, 25, 0);

        private static const LAVA_SURFACE_MID:ColorTransform = new ColorTransform(0, 0, 0, 1.3, 250, 110, 5, 0);

        private static const LAVA_SURFACE_SHALLOW:ColorTransform = new ColorTransform(0, 0, 0, 1.1, 225, 80, 0, 0);

        private static const ASH:ColorTransform = new ColorTransform(0.45, 0.35, 0.30, 1, 25, 10, 5, 0);

        private static const SCORCHED:ColorTransform = new ColorTransform(0.55, 0.30, 0.20, 1, 30, 5, 0, 0);

        private static const BASALT:ColorTransform = new ColorTransform(0.40, 0.35, 0.35, 1, 10, 0, 0, 0);

        public function InfernoMapTheme() {
            super();
        }

        /** Same height bands as MapRoomCell.Update(). */
        private static function forHeight(height:int):ColorTransform {
            if (height < 80) {
                return LAVA_DEEP;
            }
            if (height < 90) {
                return LAVA_MID;
            }
            if (height < 100) {
                return LAVA_SHALLOW;
            }
            if (height < 110) {
                return ASH;
            }
            if (height < 170) {
                return SCORCHED;
            }
            return BASALT;
        }

        // The tribe frames of the cell icon are 30 x 30 framed portraits drawn at (-5, -31). The art
        // has four of them and none for Moloch, so his own portrait (the one his yard popup uses,
        // assets/monsters/tribe_moloch_50.jpg) is laid over the borrowed frame, under its border.
        private static const MOLOCH_PORTRAIT:String = "monsters/tribe_moloch_50.jpg";

        private static const MOLOCH_ICON_NAME:String = "ioMolochIcon";

        public static function molochIcon(icon:MovieClip, show:Boolean):void {
            var existing:DisplayObject = null;
            if (!icon) {
                return;
            }
            existing = icon.getChildByName(MOLOCH_ICON_NAME);
            icon.ioWantsMoloch = show;
            if (!show) {
                if (existing) {
                    icon.removeChild(existing);
                }
                return;
            }
            if (!existing) {
                ImageCache.GetImageWithCallBack(MOLOCH_PORTRAIT, molochPortraitLoaded, true, 1, "", [icon]);
            }
        }

        private static function molochPortraitLoaded(key:String, image:BitmapData, args:Array):void {
            var icon:MovieClip = args[0] as MovieClip;
            var portrait:Bitmap = null;
            // The cell may have been recycled to something else while the image was loading.
            if (!icon || !icon.ioWantsMoloch || icon.getChildByName(MOLOCH_ICON_NAME)) {
                return;
            }
            portrait = new Bitmap(image, "auto", true);
            portrait.name = MOLOCH_ICON_NAME;
            portrait.x = -5;
            portrait.y = -31;
            portrait.width = 30;
            portrait.height = 30;
            // Above the borrowed tribe portrait (child 0), below the frame's border and the flags.
            icon.addChildAt(portrait, Math.min(1, icon.numChildren));
        }

        /** Cells whose map data has not arrived yet: dark, cooled rock instead of the stock green placeholder. */
        private static const UNLOADED:ColorTransform = new ColorTransform(0.22, 0.18, 0.18, 1, 22, 6, 2, 0);

        public static function applyUnloaded(tile:MovieClip):void {
            var child:DisplayObject = null;
            var i:int = 0;
            if (!tile) {
                return;
            }
            while (i < tile.numChildren) {
                child = tile.getChildAt(i);
                if (child && child.name.indexOf("instance") == 0) {
                    setTint(child, UNLOADED);
                }
                i++;
            }
        }

        /** Call right after the tile has been sent to its terrain frame. */
        public static function apply(tile:MovieClip, height:int):void {
            var child:DisplayObject = null;
            var i:int = 0;
            if (!tile) {
                return;
            }
            var tint:ColorTransform = forHeight(height);
            while (i < tile.numChildren) {
                child = tile.getChildAt(i);
                // Timeline art without an instance name is auto-named "instanceN".
                if (child && child.name.indexOf("instance") == 0) {
                    setTint(child, tint);
                }
                i++;
            }
            var surface:DisplayObject = tile.getChildByName("mcWater");
            if (surface) {
                setTint(surface, height < 80 ? LAVA_SURFACE_DEEP : (height < 90 ? LAVA_SURFACE_MID : LAVA_SURFACE_SHALLOW));
            }
        }

        /**
         * Assigning a colour transform makes Flash throw away the cell's cached bitmap and draw it again,
         * even when the values are the ones it already had. Cells are refreshed constantly (every time
         * map data arrives), so only touch a tile that is not tinted correctly yet.
         */
        private static function setTint(target:DisplayObject, tint:ColorTransform):void {
            var current:ColorTransform = target.transform.colorTransform;
            if (current.redOffset == tint.redOffset && current.greenOffset == tint.greenOffset && current.blueOffset == tint.blueOffset && current.redMultiplier == tint.redMultiplier && current.greenMultiplier == tint.greenMultiplier && current.blueMultiplier == tint.blueMultiplier && current.alphaMultiplier == tint.alphaMultiplier) {
                return;
            }
            target.transform.colorTransform = tint;
        }
    }
}
