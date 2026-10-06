import * as as3 from "as3";
import { ASObject } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer } from "flash/display";
import { ColorMatrixFilter } from "flash/filters";
import { Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { CREATURELOCKER, ImageCache } from "@game";

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
export class IoLockIcon extends ASObject {
    public static readonly URL: string = "ui/lock_icon@2x.png";

    /** Grey, slightly darkened. */
    public static readonly GREY: ColorMatrixFilter = new ColorMatrixFilter([0.247, 0.488, 0.065, 0, 0, 0.247, 0.488, 0.065, 0, 0, 0.247, 0.488, 0.065, 0, 0, 0, 0, 0, 1, 0]);

    /** tile -> its padlock */
    private static _locks: Dictionary = new Dictionary(true);

    /**
     * Shows (locked) or takes away the padlock on a monster's tile.
     * @param big    full size (a big portrait), else half (a tile)
     * @param where  "middle" (over the tile) or "corner" (its bottom right corner)
     * @param dim    grey the tile too
     */
    public static mark(tile: DisplayObject, locked: boolean, big: boolean = false, where: string = "middle", dim: boolean = true): void {
        let lock: Bitmap = null;
        if (!tile) {
            return;
        }
        if (locked && IoLockIcon._locks.get(tile)) {
            return;
        }
        IoLockIcon.unmark(tile);
        if (!locked) {
            return;
        }
        if (dim) {
            tile.filters = [IoLockIcon.GREY];
            tile.alpha = 0.85;
        }
        lock = new Bitmap();
        lock.smoothing = true;
        IoLockIcon._locks.set(tile, lock);
        ImageCache.GetImageWithCallBack(IoLockIcon.URL, (key: string, bmd: BitmapData, ...rest: any[]): void => {
            if (IoLockIcon._locks.get(tile) !== lock || !tile.parent) {
                return;
            }
            lock.bitmapData = bmd;
            lock.smoothing = true;
            let k: number = Number(big ? 1 : 0.5);
            lock.scaleX = lock.scaleY = k;
            let r: Rectangle = tile.getBounds(tile.parent);
            if (where == "corner") {
                lock.x = Math.round(r.right - bmd.width * k - 2);
                lock.y = Math.round(r.bottom - bmd.height * k - 2);
            } else {
                lock.x = Math.round(r.x + (r.width - bmd.width * k) / 2);
                lock.y = Math.round(r.y + (r.height - bmd.height * k) / 2);
            }
            let parent: DisplayObjectContainer = tile.parent;
            parent.addChildAt(lock, Math.min(parent.numChildren, parent.getChildIndex(tile) + 1) | 0);
        });
    }

    /** Takes the padlock (and the grey) away. */
    public static unmark(tile: DisplayObject): void {
        let lock: Bitmap = tile ? as3.as(IoLockIcon._locks.get(tile), Bitmap) : null;
        if (!lock) {
            return;
        }
        if (lock.parent) {
            lock.parent.removeChild(lock);
        }
        IoLockIcon._locks.delete(tile);
        tile.filters = [];
        if (tile.alpha == 0.85) {
            tile.alpha = 1;
        }
    }

    /** Whether a tile shows a padlock now (for the tests). */
    public static marked(tile: DisplayObject): boolean {
        return Boolean(tile && IoLockIcon._locks.get(tile));
    }

    /** A monster is unlocked when the Strongbox has it (its locker entry says done, t 2). */
    public static lockedMonster(id: string): boolean {
        let data: any = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[id] : null;
        return !(data && data.t == 2);
    }
}
