package com.monsters.display {
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.filters.ColorMatrixFilter;
    import flash.geom.Rectangle;
    import flash.utils.Dictionary;

    /**
     * Inferno-only: a padlock over a monster that is not unlocked yet (the user's lock-icon-assets.zip, 29
     * September), wherever monsters are listed: the Incubator, the Incubation Control Station, the Compound, the
     * Academy and the Strongbox. The gold padlock (`ui/lock_icon@2x.png`, the overworld's) everywhere, the user's
     * choice, drawn at half size for a crisp 24 x 30 on a tile, full size (49 x 60) on a big portrait.
     *
     * The padlock goes into the tile's parent, over the tile, so the tile's own scaling does not shrink it, and a
     * Bitmap takes no mouse events, so hovering still reaches the tile. The tile itself is drawn in grey (slightly
     * darkened) at 85%, so the monster stays recognisable.
     */
    public class IoLockIcon {

        public static const URL:String = "ui/lock_icon@2x.png";

        /** Grey, slightly darkened. */
        public static const GREY:ColorMatrixFilter = new ColorMatrixFilter([0.247, 0.488, 0.065, 0, 0, 0.247, 0.488, 0.065, 0, 0, 0.247, 0.488, 0.065, 0, 0, 0, 0, 0, 1, 0]);

        /** tile -> its padlock */
        private static var _locks:Dictionary = new Dictionary(true);

        /**
         * Shows (locked) or takes away the padlock on a monster's tile.
         * @param big    full size (a big portrait), else half (a tile)
         * @param where  "middle" (over the tile) or "corner" (its bottom right corner)
         * @param dim    grey the tile too
         */
        public static function mark(tile:DisplayObject, locked:Boolean, big:Boolean = false, where:String = "middle", dim:Boolean = true):void {
            if (!tile) {
                return;
            }
            if (locked && _locks[tile]) {
                return; // (already shown)
            }
            unmark(tile);
            if (!locked) {
                return;
            }
            if (dim) {
                tile.filters = [GREY];
                tile.alpha = 0.85;
            }
            var lock:Bitmap = new Bitmap();
            lock.smoothing = true;
            _locks[tile] = lock;
            ImageCache.GetImageWithCallBack(URL, function(key:String, bmd:BitmapData, ... rest):void {
                if (_locks[tile] !== lock || !tile.parent) {
                    return; // (taken away, or the tile gone, while the picture loaded)
                }
                lock.bitmapData = bmd;
                lock.smoothing = true;
                var k:Number = big ? 1 : 0.5;
                lock.scaleX = lock.scaleY = k;
                var r:Rectangle = tile.getBounds(tile.parent);
                if (where == "corner") {
                    lock.x = Math.round(r.right - bmd.width * k - 2);
                    lock.y = Math.round(r.bottom - bmd.height * k - 2);
                }
                else {
                    lock.x = Math.round(r.x + (r.width - bmd.width * k) / 2);
                    lock.y = Math.round(r.y + (r.height - bmd.height * k) / 2);
                }
                var parent:DisplayObjectContainer = tile.parent;
                parent.addChildAt(lock, Math.min(parent.numChildren, parent.getChildIndex(tile) + 1));
            });
        }

        /** Takes the padlock (and the grey) away. */
        public static function unmark(tile:DisplayObject):void {
            var lock:Bitmap = tile ? _locks[tile] as Bitmap : null;
            if (!lock) {
                return;
            }
            if (lock.parent) {
                lock.parent.removeChild(lock);
            }
            delete _locks[tile];
            tile.filters = [];
            if (tile.alpha == 0.85) {
                tile.alpha = 1;
            }
        }

        /** Whether a tile shows a padlock now (for the tests). */
        public static function marked(tile:DisplayObject):Boolean {
            return Boolean(tile && _locks[tile]);
        }

        /** A monster is unlocked when the Strongbox has it (its locker entry says done, t 2). */
        public static function lockedMonster(id:String):Boolean {
            var data:Object = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[id] : null;
            return !(data && data.t == 2);
        }
    }
}
