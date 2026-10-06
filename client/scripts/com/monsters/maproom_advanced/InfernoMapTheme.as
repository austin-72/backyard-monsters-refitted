package com.monsters.maproom_advanced {
    import com.monsters.display.ImageCache;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.geom.ColorTransform;

    /**
     * Inferno look for the Map Room 2 world map (inferno-only builds).
     *
     * The map's ground is the Inferno's own art since 30 September (the user's hell-maproom2 pack: lava,
     * bone, netherrack and black rock tiles in assets.swf, and three more pictures of each in
     * HellTileVariants), so the terrain is no longer re-coloured here. What is left: cells whose data has
     * not arrived are darkened (applyUnloaded), and apply() takes that tint off again once they have it.
     * Named children (player flags, glow, tribe icons) are never touched.
     */
    public class InfernoMapTheme {

        private static const NONE:ColorTransform = new ColorTransform();

        public function InfernoMapTheme() {
            super();
        }

        // The tribe frames of the cell icon are 30 x 30 framed portraits drawn at (-5, -31), built into the
        // SWF (and the art has none for Moloch, who borrows the Dreadnaut frame). In the Inferno every
        // tribe's portrait is replaced by its own picture from the server, assets/monsters/tribe_<tribe>_30.jpg
        // (60 x 60, drawn at 30 x 30 so it stays sharp when the map is zoomed or the screen is high-DPI),
        // laid over the frame's portrait and under its border. New art needs no SWF change.
        private static const TRIBE_ICON_NAME:String = "ioTribeIcon";

        private static const TRIBE_ICON_KEYS:Object = {
                "Legionnaire": "legionnaire",
                "Kozu": "kozu",
                "Abunakki": "abunakki",
                "Dreadnaut": "dreadnaut",
                "Dreadnought": "dreadnaut",
                "Moloch": "moloch"
            };

        /** Shows the tribe's portrait on a map cell's icon, or removes it (tribe null: not a tribe yard). */
        /** The tribes' large pictures (their splash art, 150 high). */
        private static const TRIBE_PICTURES:Object = {
                "Dreadnought": "popups/tribe_dreadnaut.v2.png",
                "Dreadnaut": "popups/tribe_dreadnaut.v2.png",
                "Kozu": "popups/tribe_kozu.v2.png",
                "Legionnaire": "popups/tribe_legionnaire.v2.png",
                "Abunakki": "popups/tribe_abunakki.v2.png",
                "Moloch": "popups/tribe_moloch.png"
            };

        /**
         * Inferno-only: a wild tribe's picture in the cell information right of the map (MapRoomPopup.TribePic), from
         * its large picture (150 high) made to `size`, smoothly, not the 50 x 50 one blown up (the user's, 29
         * September), on the ember ground of the small ones. Returns false for a name it does not know (the caller
         * then does as before).
         */
        public static function tribeCellPicture(tribe:String, into:MovieClip, size:int = 50):Boolean {
            var url:String = TRIBE_PICTURES[tribe];
            if (!url || !into) {
                return false;
            }
            var ground:Shape = new Shape();
            ground.graphics.beginFill(0x3A1206);
            ground.graphics.drawRect(0, 0, size, size);
            ground.graphics.endFill();
            into.addChild(ground);
            ImageCache.GetImageWithCallBack(url, function(key:String, bmd:BitmapData, ... rest):void {
                var b:Bitmap = new Bitmap(bmd);
                b.smoothing = true;
                var k:Number = Math.min(size / bmd.width, size / bmd.height);
                b.scaleX = b.scaleY = k;
                b.x = (size - bmd.width * k) / 2;
                b.y = size - bmd.height * k;
                into.addChild(b);
            });
            return true;
        }

        public static function tribeIcon(icon:MovieClip, tribe:String):void {
            var existing:DisplayObject = null;
            if (!icon) {
                return;
            }
            var key:String = tribe != null && TRIBE_ICON_KEYS.hasOwnProperty(tribe) ? String(TRIBE_ICON_KEYS[tribe]) : null;
            existing = icon.getChildByName(TRIBE_ICON_NAME);
            icon.ioTribeKey = key;
            if (existing && MovieClip(existing).ioKey != key) {
                icon.removeChild(existing);
                existing = null;
            }
            if (key && !existing) {
                ImageCache.GetImageWithCallBack("monsters/tribe_" + key + "_30.jpg", tribePortraitLoaded, true, 1, "", [icon, key]);
            }
        }

        private static function tribePortraitLoaded(url:String, image:BitmapData, args:Array):void {
            var icon:MovieClip = args[0] as MovieClip;
            var key:String = args[1] as String;
            var holder:MovieClip = null;
            var portrait:Bitmap = null;
            // The cell may have been recycled to something else while the image was loading.
            if (!icon || icon.ioTribeKey != key || icon.getChildByName(TRIBE_ICON_NAME)) {
                return;
            }
            portrait = new Bitmap(image, "auto", true);
            portrait.width = 30;
            portrait.height = 30;
            holder = new MovieClip();
            holder.name = TRIBE_ICON_NAME;
            holder.ioKey = key; // MovieClip is dynamic
            holder.mouseEnabled = false;
            holder.mouseChildren = false;
            holder.x = -5;
            holder.y = -31;
            holder.addChild(portrait);
            // Above the built-in tribe portrait (child 0), below the frame's border and the flags.
            icon.addChildAt(holder, Math.min(1, icon.numChildren));
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

        /** Call right after the tile has been sent to its terrain frame: takes the unloaded tint off. */
        public static function apply(tile:MovieClip, height:int):void {
            var child:DisplayObject = null;
            var i:int = 0;
            if (!tile) {
                return;
            }
            while (i < tile.numChildren) {
                child = tile.getChildAt(i);
                // Timeline art without an instance name is auto-named "instanceN".
                if (child && child.name.indexOf("instance") == 0) {
                    setTint(child, NONE);
                }
                i++;
            }
            var surface:DisplayObject = tile.getChildByName("mcWater");
            if (surface) {
                setTint(surface, NONE);
            }
        }

        /**
         * Assigning a colour transform makes Flash throw away the cell's cached bitmap and draw it again,
         * even when the values are the ones it already had. Cells are refreshed constantly (every time
         * map data arrives), so only touch a tile that is not tinted correctly yet.
         */
        private static function setTint(target:DisplayObject, tint:ColorTransform):void {
            var current:ColorTransform = target.transform.colorTransform;
            // Flash stores multipliers in 1/256 steps, so 0.30 reads back as 0.296875: compare with that
            // tolerance, or the check never matches and every tile is redrawn on every refresh anyway.
            if (current.redOffset == tint.redOffset && current.greenOffset == tint.greenOffset && current.blueOffset == tint.blueOffset && sameMultiplier(current.redMultiplier, tint.redMultiplier) && sameMultiplier(current.greenMultiplier, tint.greenMultiplier) && sameMultiplier(current.blueMultiplier, tint.blueMultiplier) && sameMultiplier(current.alphaMultiplier, tint.alphaMultiplier)) {
                return;
            }
            target.transform.colorTransform = tint;
        }

        private static function sameMultiplier(stored:Number, wanted:Number):Boolean {
            return Math.abs(stored - wanted) < 1 / 128;
        }
    }
}
