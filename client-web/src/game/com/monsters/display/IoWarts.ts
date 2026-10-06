import * as as3 from "as3";
import { ASObject, Class, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { IoWartShadow1, IoWartShadow2, IoWartShadow3, IoWartShadow4, IoWartShadow5, IoWartShadow6, IoWartSprite1, IoWartSprite2, IoWartSprite3, IoWartSprite4, IoWartSprite5, IoWartSprite6 } from "@game";

/*
 * Inferno-only: the yard's mushrooms are drawn as warts (the user's art, 30 September). One wart and one
 * shadow for each of the six mushroom frames, each the size of the bitmap it stands in for and placed at
 * the same offset from the building's origin, so the warts sit, shadow and get picked exactly where the
 * mushrooms did. Built as MovieClips because RasterData measures a MovieClip's rect (a Sprite's would be
 * empty). assets.swf is untouched, so the overworld keeps its mushrooms.
 */
export class IoWarts extends ASObject {
    public static readonly FRAMES: int = 6;

    private static readonly SPRITES: any[] = [IoWartSprite1, IoWartSprite2, IoWartSprite3, IoWartSprite4, IoWartSprite5, IoWartSprite6];

    private static readonly SHADOWS: any[] = [IoWartShadow1, IoWartShadow2, IoWartShadow3, IoWartShadow4, IoWartShadow5, IoWartShadow6];

    /* [x, y] of each bitmap relative to the origin, as the mushroom shapes in assets.swf store them. */
    private static readonly SPRITE_AT: any[] = [[-27, -18.5], [-19, -5.5], [-20.5, -21.5], [-22.5, -12], [-24.5, -20.5], [-24, -45.5]];

    private static readonly SHADOW_AT: any[] = [[-28, 0], [-18.5, -1], [-17, -5], [-21, -0.5], [-17, 2.5], [-17.5, 3]];

    private static _sprites: any[] = [];

    private static _shadows: any[] = [];

    public static sprite(frame: int): MovieClip {
        let i: int = IoWarts.index(frame);
        return IoWarts.clip(IoWarts.bitmapData(IoWarts._sprites, IoWarts.SPRITES, i), as3.cast(IoWarts.SPRITE_AT[i], Array));
    }

    public static shadow(frame: int): MovieClip {
        let i: int = IoWarts.index(frame);
        return IoWarts.clip(IoWarts.bitmapData(IoWarts._shadows, IoWarts.SHADOWS, i), as3.cast(IoWarts.SHADOW_AT[i], Array));
    }

    private static index(frame: int): int {
        return (Math.max(1, Math.min(IoWarts.FRAMES, frame)) - 1) | 0;
    }

    private static bitmapData(cache: any[], classes: any[], i: int): BitmapData {
        if (!cache[i]) {
            let c: any = as3.as(classes[i], Class);
            cache[i] = as3.as(new c(), BitmapData);
        }
        return as3.as(cache[i], BitmapData);
    }

    private static clip(data: BitmapData, at: any[]): MovieClip {
        let mc: MovieClip = new MovieClip();
        let bmp: Bitmap = new Bitmap(data);
        bmp.smoothing = false;
        bmp.x = Number(at[0]);
        bmp.y = Number(at[1]);
        mc.addChild(bmp);
        return mc;
    }
}
