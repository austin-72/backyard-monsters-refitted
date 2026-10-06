import * as as3 from "as3";
import { ASObject, Class, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Shape } from "flash/display";
import { HellTile_land1_2, HellTile_land1_3, HellTile_land1_4, HellTile_land2_2, HellTile_land2_3, HellTile_land2_4, HellTile_land3_2, HellTile_land3_3, HellTile_land3_4, HellTile_land4_2, HellTile_land4_3, HellTile_land4_4, HellTile_land5_2, HellTile_land5_3, HellTile_land5_4, HellTile_land6_2, HellTile_land6_3, HellTile_land6_4, HellTile_sand1_2, HellTile_sand1_3, HellTile_sand1_4, HellTile_sand2_2, HellTile_sand2_3, HellTile_sand2_4, HellTile_water1_2, HellTile_water1_3, HellTile_water1_4, HellTile_water2_2, HellTile_water2_3, HellTile_water2_4, HellTile_water3_2, HellTile_water3_3, HellTile_water3_4 } from "@game";

/*
 * Extra ground art for Map Room 2 so the map doesn't repeat one picture per height level.
 * Variant 1 of every tile is the art inside assets.swf (the frame's own shape); variants 2-4 are
 * the embedded bitmaps in com.monsters.maproom_advanced.hellmap. pick() is deterministic per map
 * cell, so a cell always shows the same variant, and touching cells almost never share one (only
 * where two 4x4 blocks meet, about 7% of neighbour pairs, versus 25% for a random pick).
 */
export class HellTileVariants extends ASObject {
    private static readonly VARIANTS: any = { "water1": [HellTile_water1_2, HellTile_water1_3, HellTile_water1_4], "water2": [HellTile_water2_2, HellTile_water2_3, HellTile_water2_4], "water3": [HellTile_water3_2, HellTile_water3_3, HellTile_water3_4], "sand1": [HellTile_sand1_2, HellTile_sand1_3, HellTile_sand1_4], "sand2": [HellTile_sand2_2, HellTile_sand2_3, HellTile_sand2_4], "land1": [HellTile_land1_2, HellTile_land1_3, HellTile_land1_4], "land2": [HellTile_land2_2, HellTile_land2_3, HellTile_land2_4], "land3": [HellTile_land3_2, HellTile_land3_3, HellTile_land3_4], "land4": [HellTile_land4_2, HellTile_land4_3, HellTile_land4_4], "land5": [HellTile_land5_2, HellTile_land5_3, HellTile_land5_4], "land6": [HellTile_land6_2, HellTile_land6_3, HellTile_land6_4] };

    private static readonly COUNT: int = 4;

    private static _cache: any = {};

    /* Returns the BitmapData to draw for this cell, or null to keep the frame's built-in art (variant 1). */
    public static pick(label: string, cellX: int, cellY: int): BitmapData {
        let list: any[] = label ? as3.as(HellTileVariants.VARIANTS[label], Array) : null;
        if (!list) {
            return null;
        }
        let v: int = HellTileVariants.variantIndex(cellX, cellY);
        if (v == 0) {
            return null;
        }
        let key: string = label + "_" + v;
        if (!HellTileVariants._cache[key]) {
            HellTileVariants._cache[key] = as3.as(new ((as3.as(list[v - 1], Class)))(), BitmapData);
        }
        return as3.as(HellTileVariants._cache[key], BitmapData);
    }

    /* Shows the right ground art on a cell's mc after its frame has been set (gotoAndStop).
     * The frame's own ground art is the lowest timeline child (a Shape). When a variant applies, the
     * variant Bitmap goes underneath it inside mc (so it follows mc.y and stays below the glow, the
     * lava layer and the base) and the Shape is hidden. Pass the Bitmap returned last time for this
     * cell (or null); the same Bitmap is returned so it can be reused. */
    public static apply(mc: MovieClip, cellX: int, cellY: int, holder: Bitmap): Bitmap {
        return HellTileVariants.applyBitmap(mc, HellTileVariants.pick(mc.currentLabel, cellX, cellY), holder);
    }

    /** As apply, with the picture given (null: the frame's own art). */
    public static applyBitmap(mc: MovieClip, bmd: BitmapData, holder: Bitmap): Bitmap {
        let ground: Shape = HellTileVariants.frameGround(mc, holder);
        if (bmd) {
            if (!holder) {
                holder = new Bitmap();
                holder.name = "groundVariant";
            }
            holder.bitmapData = bmd;
            holder.x = 0;
            holder.y = 0;
            mc.addChildAt(holder, 0);
            holder.visible = true;
            if (ground) {
                ground.visible = false;
            }
        } else {
            HellTileVariants.reset(mc, holder);
        }
        return holder;
    }

    /* Puts the frame's own ground art back (used when a cell is recycled while scrolling). */
    public static reset(mc: MovieClip, holder: Bitmap): void {
        if (holder) {
            holder.visible = false;
        }
        let ground: Shape = HellTileVariants.frameGround(mc, holder);
        if (ground) {
            ground.visible = true;
        }
    }

    private static frameGround(mc: MovieClip, holder: Bitmap): Shape {
        let i: int = 0;
        while (i < mc.numChildren) {
            let child: DisplayObject = mc.getChildAt(i);
            if (child != holder) {
                return as3.as(child, Shape);
            }
            i++;
        }
        return null;
    }

    /* 0..3. Neighbours on this hex layout differ by 1, 2 or 3 in (X + 2Y), so mod 4 they never match.
     * Each 4x4 block of cells gets its own shuffle of the four variants so the pattern doesn't read as
     * stripes; the shuffle can repeat a variant across a block edge now and then. */
    public static variantIndex(cellX: int, cellY: int): int {
        let bx: int = Math.floor(cellX / 4) | 0;
        let by: int = Math.floor(cellY / 4) | 0;
        let h: int = (bx * 92821 + by * 68917 + 12345) & 0x7FFFFFFF;
        h = ((h >> 7) ^ h) & 0x7FFFFFFF;
        let mul: int = (h & 1) ? 3 : 1;
        let add: int = (h >> 1) & 3;
        let v: int = (((cellX + 2 * cellY) * mul + add) % HellTileVariants.COUNT) | 0;
        if (v < 0) {
            v += HellTileVariants.COUNT;
        }
        return v;
    }
}
