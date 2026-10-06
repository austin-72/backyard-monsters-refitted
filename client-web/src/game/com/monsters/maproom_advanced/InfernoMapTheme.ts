import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Shape } from "flash/display";
import { ColorTransform } from "flash/geom";
import { ImageCache } from "@game";

/**
 * Inferno look for the Map Room 2 world map (inferno-only builds).
 *
 * The map's ground is the Inferno's own art since 30 September (the user's hell-maproom2 pack: lava,
 * bone, netherrack and black rock tiles in assets.swf, and three more pictures of each in
 * HellTileVariants), so the terrain is no longer re-coloured here. What is left: cells whose data has
 * not arrived are darkened (applyUnloaded), and apply() takes that tint off again once they have it.
 * Named children (player flags, glow, tribe icons) are never touched.
 */
export class InfernoMapTheme extends ASObject {
    private static readonly NONE: ColorTransform = new ColorTransform();

    // The tribe frames of the cell icon are 30 x 30 framed portraits drawn at (-5, -31), built into the
    // SWF (and the art has none for Moloch, who borrows the Dreadnaut frame). In the Inferno every
    // tribe's portrait is replaced by its own picture from the server, assets/monsters/tribe_<tribe>_30.jpg
    // (60 x 60, drawn at 30 x 30 so it stays sharp when the map is zoomed or the screen is high-DPI),
    // laid over the frame's portrait and under its border. New art needs no SWF change.
    private static readonly TRIBE_ICON_NAME: string = "ioTribeIcon";

    private static readonly TRIBE_ICON_KEYS: any = { "Legionnaire": "legionnaire", "Kozu": "kozu", "Abunakki": "abunakki", "Dreadnaut": "dreadnaut", "Dreadnought": "dreadnaut", "Moloch": "moloch" };

    /** Shows the tribe's portrait on a map cell's icon, or removes it (tribe null: not a tribe yard). */
    /** The tribes' large pictures (their splash art, 150 high). */
    private static readonly TRIBE_PICTURES: any = { "Dreadnought": "popups/tribe_dreadnaut.v2.png", "Dreadnaut": "popups/tribe_dreadnaut.v2.png", "Kozu": "popups/tribe_kozu.v2.png", "Legionnaire": "popups/tribe_legionnaire.v2.png", "Abunakki": "popups/tribe_abunakki.v2.png", "Moloch": "popups/tribe_moloch.png" };

    /** Cells whose map data has not arrived yet: dark, cooled rock instead of the stock green placeholder. */
    private static readonly UNLOADED: ColorTransform = new ColorTransform(0.22, 0.18, 0.18, 1, 22, 6, 2, 0);

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Inferno-only: a wild tribe's picture in the cell information right of the map (MapRoomPopup.TribePic), from
     * its large picture (150 high) made to `size`, smoothly, not the 50 x 50 one blown up (the user's, 29
     * September), on the ember ground of the small ones. Returns false for a name it does not know (the caller
     * then does as before).
     */
    public static tribeCellPicture(tribe: string, into: MovieClip, size: int = 50): boolean {
        let url: string = as3.str(InfernoMapTheme.TRIBE_PICTURES[tribe]);
        if (!url || !into) {
            return false;
        }
        let ground: Shape = new Shape();
        ground.graphics.beginFill(3805702);
        ground.graphics.drawRect(0, 0, size, size);
        ground.graphics.endFill();
        into.addChild(ground);
        ImageCache.GetImageWithCallBack(url, (key: string, bmd: BitmapData, ...rest: any[]): void => {
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            let k: number = Math.min(size / bmd.width, size / bmd.height);
            b.scaleX = b.scaleY = k;
            b.x = (size - bmd.width * k) / 2;
            b.y = size - bmd.height * k;
            into.addChild(b);
        });
        return true;
    }

    public static tribeIcon(icon: MovieClip, tribe: string): void {
        let existing: DisplayObject = null;
        if (!icon) {
            return;
        }
        let key: string = tribe != null && InfernoMapTheme.TRIBE_ICON_KEYS.hasOwnProperty(tribe) ? String(InfernoMapTheme.TRIBE_ICON_KEYS[tribe]) : null;
        existing = icon.getChildByName(InfernoMapTheme.TRIBE_ICON_NAME);
        icon.ioTribeKey = key;
        if (existing && as3.cast(existing, MovieClip).ioKey != key) {
            icon.removeChild(existing);
            existing = null;
        }
        if (key && !existing) {
            ImageCache.GetImageWithCallBack("monsters/tribe_" + key + "_30.jpg", InfernoMapTheme.tribePortraitLoaded, true, 1, "", [icon, key]);
        }
    }

    private static tribePortraitLoaded(url: string, image: BitmapData, args: any[]): void {
        let icon: MovieClip = as3.as(args[0], MovieClip);
        let key: string = as3.as(args[1], String);
        let holder: MovieClip = null;
        let portrait: Bitmap = null;
        // The cell may have been recycled to something else while the image was loading.
        if (!icon || icon.ioTribeKey != key || icon.getChildByName(InfernoMapTheme.TRIBE_ICON_NAME)) {
            return;
        }
        portrait = new Bitmap(image, "auto", true);
        portrait.width = 30;
        portrait.height = 30;
        holder = new MovieClip();
        holder.name = InfernoMapTheme.TRIBE_ICON_NAME;
        holder.ioKey = key;
        // MovieClip is dynamic
        holder.mouseEnabled = false;
        holder.mouseChildren = false;
        holder.x = -5;
        holder.y = -31;
        holder.addChild(portrait);
        // Above the built-in tribe portrait (child 0), below the frame's border and the flags.
        icon.addChildAt(holder, Math.min(1, icon.numChildren) | 0);
    }

    public static applyUnloaded(tile: MovieClip): void {
        let child: DisplayObject = null;
        let i: int = 0;
        if (!tile) {
            return;
        }
        while (i < tile.numChildren) {
            child = tile.getChildAt(i);
            if (child && child.name.indexOf("instance") == 0) {
                InfernoMapTheme.setTint(child, InfernoMapTheme.UNLOADED);
            }
            i++;
        }
    }

    /** Call right after the tile has been sent to its terrain frame: takes the unloaded tint off. */
    public static apply(tile: MovieClip, height: int): void {
        let child: DisplayObject = null;
        let i: int = 0;
        if (!tile) {
            return;
        }
        while (i < tile.numChildren) {
            child = tile.getChildAt(i);
            // Timeline art without an instance name is auto-named "instanceN".
            if (child && child.name.indexOf("instance") == 0) {
                InfernoMapTheme.setTint(child, InfernoMapTheme.NONE);
            }
            i++;
        }
        let surface: DisplayObject = tile.getChildByName("mcWater");
        if (surface) {
            InfernoMapTheme.setTint(surface, InfernoMapTheme.NONE);
        }
    }

    /**
     * Assigning a colour transform makes Flash throw away the cell's cached bitmap and draw it again,
     * even when the values are the ones it already had. Cells are refreshed constantly (every time
     * map data arrives), so only touch a tile that is not tinted correctly yet.
     */
    private static setTint(target: DisplayObject, tint: ColorTransform): void {
        let current: ColorTransform = target.transform.colorTransform;
        // Flash stores multipliers in 1/256 steps, so 0.30 reads back as 0.296875: compare with that
        // tolerance, or the check never matches and every tile is redrawn on every refresh anyway.
        if (current.redOffset == tint.redOffset && current.greenOffset == tint.greenOffset && current.blueOffset == tint.blueOffset && InfernoMapTheme.sameMultiplier(current.redMultiplier, tint.redMultiplier) && InfernoMapTheme.sameMultiplier(current.greenMultiplier, tint.greenMultiplier) && InfernoMapTheme.sameMultiplier(current.blueMultiplier, tint.blueMultiplier) && InfernoMapTheme.sameMultiplier(current.alphaMultiplier, tint.alphaMultiplier)) {
            return;
        }
        target.transform.colorTransform = tint;
    }

    private static sameMultiplier(stored: number, wanted: number): boolean {
        return Math.abs(stored - wanted) < 1 / 128;
    }
}
