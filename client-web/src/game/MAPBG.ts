import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, BitmapDataChannel, IBitmapDrawable } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { perlinArgs, perlinForget, perlinHave, perlinPrefetch, perlinStats, perlinWorkersAvailable } from "flash/_perlin";
import { BASE, LOGGER, io_ashfall_big, io_obsidian_big, io_soulfire_big, io_sulfur_big, io_magma_big, io_witchfire_big, io_bloodstone_big, io_gilded_big, io_cinder_big, io_amethyst_big, io_hellforge_big, hell_land1_1, hell_land1_2, hell_land1_3, hell_land1_4, hell_land2_1, hell_land2_2, hell_land2_3, hell_land2_4, hell_land3_1, hell_land3_2, hell_land3_3, hell_land3_4, hell_land4_1, hell_land4_2, hell_land4_3, hell_land4_4, hell_land5_1, hell_land5_2, hell_land5_3, hell_land5_4, hell_land6_1, hell_land6_2, hell_land6_3, hell_land6_4, hell_sand1_big, hell_sand2_big, hfo_frozen1, hfo_frozen2, hfo_frozen3, hfo_frozen4, inferno_lava1, inferno_lava2, inferno_lava3, inferno_lava4, isocrater1, isograss1, isograss2, isograss3, isograss4, isograss5, isograss6, isograss7, isorock1, isorock2, isorock3, isosand1, isosand2, isosand3, isosand4 } from "@game";

export class MAPBG extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Inferno-only (21 October): how many layers a ground is blended from (MakeTile: each past the first through a
     * Perlin noise mask); 0 for a ground drawn as one sheet.
     */
    public static ioLayers(texture: string): int {
        switch (texture) {
            case "hfo_frozen":
            case "lava":
            case "sand":
            case "hell_land1":
            case "hell_land2":
            case "hell_land3":
            case "hell_land4":
            case "hell_land5":
            case "hell_land6":
                return 4;
            case "rock":
                return 5;
            case "grass":
                return 7;
            default:
                return 0;
        }
    }

    /** Inferno-only (21 October): the ground masks' perlinNoise arguments for a yard's seed (MakeTile's, layer 2 on). */
    public static ioMaskArgs(seed: int, layers: int): any[][] {
        let out: any[][] = [];
        for (let tile: int = 2; tile <= layers; tile++) {
            out.push(perlinArgs(1000, 500, true, 50 * tile, 25 * tile, 2, (seed + 1 + tile) | 0, true, false, BitmapDataChannel.ALPHA, true, null));
        }
        return out;
    }

    /**
     * Inferno-only (21 October, the user's: more of the game on other threads): a yard's ground masks worked out in
     * background threads for its seed, then go() (at most `waitMs` later, ready or not: MakeTile works out any not
     * ready itself). False, and go() not called, when there is nothing to work out (all kept already, a ground of
     * one sheet) or no background threads: the caller goes on at once.
     */
    public static ioPrefetch(seed: int, texture: string, waitMs: int, go: Function): boolean {
        let layers: int = MAPBG.ioLayers(texture);
        if (layers < 2 || !perlinWorkersAvailable()) {
            return false;
        }
        let list: any[][] = MAPBG.ioMaskArgs(seed, layers);
        let missing: any[][] = list.filter((args: any[]): boolean => !perlinHave(args));
        if (!missing.length) {
            return false;
        }
        perlinPrefetch(missing, waitMs).then((): void => {
            go();
        });
        return true;
    }

    /** For tests (21 October): the ground masks worked out in the background, and forgetting them. */
    public static get ioPerlinStats(): any {
        return perlinStats;
    }

    public static ioPerlinForget(): void {
        perlinForget();
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
            // Inferno-only (12 October): the invite grounds, one sheet each too
            if (texture == "io_ashfall") {
                return new io_ashfall_big(0, 0);
            }
            if (texture == "io_obsidian") {
                return new io_obsidian_big(0, 0);
            }
            if (texture == "io_soulfire") {
                return new io_soulfire_big(0, 0);
            }
            // (27 November, 72's suggestion: the grounds opened by how many outposts the player holds, one sheet each)
            if (texture == "io_sulfur") {
                return new io_sulfur_big(0, 0);
            }
            if (texture == "io_magma") {
                return new io_magma_big(0, 0);
            }
            if (texture == "io_witchfire") {
                return new io_witchfire_big(0, 0);
            }
            if (texture == "io_bloodstone") {
                return new io_bloodstone_big(0, 0);
            }
            if (texture == "io_gilded") {
                return new io_gilded_big(0, 0);
            }
            // (27 November, 72's suggestion: the grounds opened by the player's level, 30, 40 and 50)
            if (texture == "io_cinder") {
                return new io_cinder_big(0, 0);
            }
            if (texture == "io_amethyst") {
                return new io_amethyst_big(0, 0);
            }
            if (texture == "io_hellforge") {
                return new io_hellforge_big(0, 0);
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
