import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, BitmapDataChannel, IBitmapDrawable } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BASE, LOGGER, hell_land1_1, hell_land1_2, hell_land1_3, hell_land1_4, hell_land2_1, hell_land2_2, hell_land2_3, hell_land2_4, hell_land3_1, hell_land3_2, hell_land3_3, hell_land3_4, hell_land4_1, hell_land4_2, hell_land4_3, hell_land4_4, hell_land5_1, hell_land5_2, hell_land5_3, hell_land5_4, hell_land6_1, hell_land6_2, hell_land6_3, hell_land6_4, hell_sand1_big, hell_sand2_big, hfo_frozen1, hfo_frozen2, hfo_frozen3, hfo_frozen4, inferno_lava1, inferno_lava2, inferno_lava3, inferno_lava4, isocrater1, isograss1, isograss2, isograss3, isograss4, isograss5, isograss6, isograss7, isorock1, isorock2, isorock3, isosand1, isosand2, isosand3, isosand4 } from "@game";

export class MAPBG extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static MakeTile(param1: string = "grass"): BitmapData {
        let tile: int = 0;
        let ti: int = 0;
        let tileCount: int = 0;
        let g: any = null;
        let t: any = null;
        let h: int = 0;
        let groundMask: BitmapData = null;
        let groundCompiled: BitmapData = null;
        let groundCompiledBMP: Bitmap = null;
        let v: int = 0;
        let i: int = 0;
        let texture: string = param1;
        try {
            ti = getTimer();
            tileCount = 0;
            // hell bone grounds are a single seamless 1000x500 sheet (no 200x100 tiling / mask blending,
            // which would make different bone layouts ghost through each other)
            if (texture == "hell_sand1") {
                return new hell_sand1_big(0, 0);
            }
            if (texture == "hell_sand2") {
                return new hell_sand2_big(0, 0);
            }
            if (texture == "hfo_frozen") {
                // Hell Freezes Over: the lava ground frozen over (the same four tiles, iced)
                g = { "g1": new hfo_frozen1(0, 0), "g2": new hfo_frozen2(0, 0), "g3": new hfo_frozen3(0, 0), "g4": new hfo_frozen4(0, 0) };
                tileCount = 4;
            } else if (texture == "lava") {
                g = { "g1": new inferno_lava1(0, 0), "g2": new inferno_lava2(0, 0), "g3": new inferno_lava3(0, 0), "g4": new inferno_lava4(0, 0) };
                tileCount = 4;
            } else if (texture == "rock") {
                g = { "g1": new isorock1(0, 0), "g2": new isorock2(0, 0), "g3": new isorock3(0, 0), "g4": new isograss1(0, 0), "g5": new isograss2(0, 0) };
                tileCount = 5;
            } else if (texture == "sand") {
                g = { "g1": new isosand1(0, 0), "g2": new isosand2(0, 0), "g3": new isosand3(0, 0), "g4": new isosand4(0, 0) };
                tileCount = 4;
            } else if (texture == "grass") {
                g = { "g1": new isograss1(0, 0), "g2": new isograss2(0, 0), "g3": new isograss3(0, 0), "g4": new isograss4(0, 0), "g5": new isograss5(0, 0), "g6": new isograss6(0, 0), "g7": new isograss7(0, 0) };
                tileCount = 7;
            } else if (texture == "hell_land1") {
                g = { "g1": new hell_land1_1(0, 0), "g2": new hell_land1_2(0, 0), "g3": new hell_land1_3(0, 0), "g4": new hell_land1_4(0, 0) };
                tileCount = 4;
            } else if (texture == "hell_land2") {
                g = { "g1": new hell_land2_1(0, 0), "g2": new hell_land2_2(0, 0), "g3": new hell_land2_3(0, 0), "g4": new hell_land2_4(0, 0) };
                tileCount = 4;
            } else if (texture == "hell_land3") {
                g = { "g1": new hell_land3_1(0, 0), "g2": new hell_land3_2(0, 0), "g3": new hell_land3_3(0, 0), "g4": new hell_land3_4(0, 0) };
                tileCount = 4;
            } else if (texture == "hell_land4") {
                g = { "g1": new hell_land4_1(0, 0), "g2": new hell_land4_2(0, 0), "g3": new hell_land4_3(0, 0), "g4": new hell_land4_4(0, 0) };
                tileCount = 4;
            } else if (texture == "hell_land5") {
                g = { "g1": new hell_land5_1(0, 0), "g2": new hell_land5_2(0, 0), "g3": new hell_land5_3(0, 0), "g4": new hell_land5_4(0, 0) };
                tileCount = 4;
            } else if (texture == "hell_land6") {
                g = { "g1": new hell_land6_1(0, 0), "g2": new hell_land6_2(0, 0), "g3": new hell_land6_3(0, 0), "g4": new hell_land6_4(0, 0) };
                tileCount = 4;
            } else if (texture == "crater") {
                g = { "g1": new isocrater1(0, 0) };
                tileCount = 1;
            }
            t = { "t1": new BitmapData(1000, 500, true, 0), "t2": new BitmapData(1000, 500, true, 0), "t3": new BitmapData(1000, 500, true, 0), "t4": new BitmapData(1000, 500, true, 0), "t5": new BitmapData(1000, 500, true, 0), "t6": new BitmapData(1000, 500, true, 0), "t7": new BitmapData(1000, 500, true, 0) };
            h = 0;
            while (h < 5) {
                v = 0;
                while (v < 5) {
                    i = 1;
                    while (i <= tileCount) {
                        t["t" + i].copyPixels(g["g" + i], new Rectangle(0, 0, 200, 100), new Point(h * 200, v * 100), null, null, true);
                        i++;
                    }
                    v++;
                }
                h++;
            }
            groundCompiled = new BitmapData(1000, 500, true, 0);
            groundCompiledBMP = new Bitmap(groundCompiled);
            groundCompiled.draw(as3.cast(t["t1"], IBitmapDrawable));
            tile = 2;
            while (tile <= tileCount) {
                groundMask = new BitmapData(1000, 500, true, 0);
                groundMask.perlinNoise(50 * tile, 25 * tile, 2, (BASE._baseSeed + 1 + tile) | 0, true, false, BitmapDataChannel.ALPHA, true, null);
                groundCompiled.copyPixels(as3.cast(t["t" + tile], BitmapData), new Rectangle(0, 0, 1000, 500), new Point(0, 0), groundMask, null, true);
                tile++;
            }
            i = 1;
            while (i < tileCount) {
                g["g" + i].dispose();
                t["t" + i].dispose();
                i++;
            }
        } catch (e) {
            LOGGER.Log("err", "MAPBG.MakeTile: " + e.message + " | " + e.getStackTrace());
        }
        return groundCompiled;
    }
}
