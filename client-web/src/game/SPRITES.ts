import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { BASE, Decoy, GLOBAL, ImageCache, IoDave, Jars, ResurrectProjectile, STORE, SpriteData, SpurtzCannon, print, IoGlowCache } from "@game";

export class SPRITES extends ASObject {
    public static _sprites: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        SPRITES._sprites = {};
        SPRITES.ioWorkerSprite();
        SPRITES._sprites.C1 = new SpriteData("monsters/sprite.1.v1.png", 24, 21, 8, 14);
        SPRITES._sprites.C2 = new SpriteData("monsters/octoooze.png", 39, 28, 19, 15);
        SPRITES._sprites.C3 = new SpriteData("monsters/sprite.3.v2.png", 30, 28, 7, 20);
        SPRITES._sprites.C4 = new SpriteData("monsters/fink.png", 34, 32, 15, 21);
        SPRITES._sprites.C5 = new SpriteData("monsters/eyera.png", 26, 23, 11, 15);
        SPRITES._sprites.C6 = new SpriteData("monsters/ichi.png", 27, 26, 11, 17);
        SPRITES._sprites.C7 = new SpriteData("monsters/bandito.png", 29, 28, 11, 17);
        SPRITES._sprites.C8 = new SpriteData("monsters/fang.png", 34, 31, 16, 19);
        SPRITES._sprites.C9 = new SpriteData("monsters/brain.v2.png", 34, 24, 16, 13);
        SPRITES._sprites.C10 = new SpriteData("monsters/crabatron.png", 37, 27, 15, 18);
        SPRITES._sprites.C11 = new SpriteData("monsters/sprite.11.v2.png", 48, 35, 24, 22);
        SPRITES._sprites.C12 = new SpriteData("monsters/sprite.12.v2.png", 53, 46, 21, 27);
        SPRITES._sprites.C12Gold = new SpriteData("monsters/sprite.12.gold.png", 53, 46, 21, 27);
        SPRITES._sprites.C13 = new SpriteData("monsters/13.png", 40, 26, 19, 17);
        SPRITES._sprites.C14 = new SpriteData("monsters/14.v1.png", 28, 28, 15, 14);
        SPRITES._sprites.C15 = new SpriteData("monsters/zafreeti.v2.png", 56, 70, 28, 35);
        SPRITES._sprites.C16 = new SpriteData("monsters/vorg_anim.png", 40, 40, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.C17 = new SpriteData("monsters/slimeattikus_anim.png", 48, 31, SpriteData.FUBAR_X, SpriteData.FUBAR_Y - 21);
        SPRITES._sprites.C18 = new SpriteData("monsters/slimeattikusmini_anim.png", 30, 20, SpriteData.FUBAR_X - 11, SpriteData.FUBAR_Y - 25);
        SPRITES._sprites.C19 = new SpriteData("monsters/rezghul.png", 48, 43, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC1 = new SpriteData("monsters/spurtz.png", 24, 28, 12, 14);
        // Inferno-only: the small Spurtz that hatch from a Clinkerjaw, drawn at 3/4 size (same sheet layout)
        SPRITES._sprites.IC1s = new SpriteData("monsters/spurtz_small.png", 18, 21, 9, 7);
        SPRITES._sprites.IC2 = new SpriteData("monsters/zagnoid.png", 64.4, 46, 26, 28);
        SPRITES._sprites.IC3 = new SpriteData("monsters/malphus.png", 51, 35, 25, 17);
        SPRITES._sprites.IC4 = new SpriteData("monsters/valgos.png", 55, 32, 11, 15);
        SPRITES._sprites.IC5 = new SpriteData("monsters/balthazar.png", 56, 37, 33, 18.5);
        SPRITES._sprites.IC6 = new SpriteData("monsters/grokus.v2.png", 57, 39, 28, 20);
        SPRITES._sprites.IC7 = new SpriteData("monsters/sabnox.png", 42, 34, 21, 17);
        SPRITES._sprites.IC8 = new SpriteData("monsters/wormzer.png", 58, 42, 29, 21);
        // Inferno-only: Clinkerjaw and Flickerfiend. 30 facings (12 degrees apart, 0 facing right) by
        // rows: 0 idle, 1-8 walking, and Flickerfiend's 9-12 its blink.
        SPRITES._sprites.IC12 = new SpriteData("monsters/clinkerjaw.png", 58, 44, 29, 22);
        SPRITES._sprites.IC14 = new SpriteData("monsters/flickerfiend.png", 44, 51, 22, 26);
        // Inferno-only Fusebug (IC15) and Emberghoul (IC20): 30 facings; row 0 standing, 1-8 walk (and the
        // Emberghoul's 9-16 attack). The Fusebug's feet (26, 28) go on the spot in the usual canvas; the
        // Emberghoul draws on a canvas of its own (Emberghoul.ts), hence no offset for it here.
        SPRITES._sprites.IC15 = new SpriteData("monsters/fusebug.png", 52, 38, 26, 28);
        SPRITES._sprites.IC20 = new SpriteData("monsters/emberghoul.png", 66, 45, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        // Inferno-only Ashkarr (IC24): 188 x 128 frames copied whole onto her own canvas, which she places
        // with her feet (94, 102) on the spot (creeps/inferno/Ashkarr.ts), hence no offset here.
        SPRITES._sprites.IC24 = new SpriteData("monsters/ashkarr.png", 188, 128, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.G1_1 = new SpriteData("monsters/ape_1.png", 96, 69, 26, 36);
        SPRITES._sprites.G1_2 = new SpriteData("monsters/ape_2.png", 89, 73, 26, 36);
        SPRITES._sprites.G1_3 = new SpriteData("monsters/ape_3.png", 103, 88, 26, 36);
        SPRITES._sprites.G1_4 = new SpriteData("monsters/ape_4.png", 148, 127, 26, 36);
        SPRITES._sprites.G1_5 = new SpriteData("monsters/ape_5.png", 160, 137, 26, 36);
        SPRITES._sprites.G1_6 = new SpriteData("monsters/ape_6.png", 140, 120, 26, 36);
        SPRITES._sprites.G2_1 = new SpriteData("monsters/dragon_1.png", 64, 41, 26, 36);
        SPRITES._sprites.G2_2 = new SpriteData("monsters/dragon_2.png", 87, 58, 26, 36);
        SPRITES._sprites.G2_3 = new SpriteData("monsters/dragon_3.png", 114, 85, 26, 36);
        SPRITES._sprites.G2_4 = new SpriteData("monsters/dragon_4.png", 131, 93, 26, 36);
        SPRITES._sprites.G2_5 = new SpriteData("monsters/dragon_5.png", 156, 117, 26, 36);
        SPRITES._sprites.G2_6 = new SpriteData("monsters/dragon_6.png", 171, 125, 26, 36);
        SPRITES._sprites.G3_1 = new SpriteData("monsters/fly_1.png", 53, 40, 26, 36);
        SPRITES._sprites.G3_2 = new SpriteData("monsters/fly_2.png", 63, 46, 26, 36);
        SPRITES._sprites.G3_3 = new SpriteData("monsters/fly_3.png", 98, 81, 26, 36);
        SPRITES._sprites.G3_4 = new SpriteData("monsters/fly_4.png", 120, 92, 26, 36);
        SPRITES._sprites.G3_5 = new SpriteData("monsters/fly_5.png", 133, 105, 26, 36);
        SPRITES._sprites.G3_6 = new SpriteData("monsters/fly_6.png", 124, 105, 26, 36);
        SPRITES._sprites.G4_1 = new SpriteData("monsters/korath_1.png", 72, 49, 26, 36);
        SPRITES._sprites.G4_2 = new SpriteData("monsters/korath_2.png", 119, 81, 26, 36);
        SPRITES._sprites.G4_3 = new SpriteData("monsters/korath_3.png", 128, 102, 26, 36);
        SPRITES._sprites.G4_4 = new SpriteData("monsters/korath_4.png", 153, 123, 26, 36);
        SPRITES._sprites.G4_5 = new SpriteData("monsters/korath_5.png", 199, 162, 26, 36);
        SPRITES._sprites.G4_6 = new SpriteData("monsters/korath_6.png", 202, 167, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.G5_1 = new SpriteData("monsters/krallen_1_rev_65.png", 130, 80, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.G5_2 = new SpriteData("monsters/krallen_2_rev_65.png", 131, 90, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.G5_3 = new SpriteData("monsters/krallen_3_rev_65.png", 142, 100, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.C200 = new SpriteData("monsters/looter.png", 51, 47, 7, 33);
        // Inferno-only Korath (IC9) and Drull (IC10) as monsters. They are drawn from the champion sheets
        // (levels 4-6 of the art; IoChampionCreep.ART_LEVEL); these entries only give their own ids a sprite, because
        // every creep asks for one when it is made (CreepSkinManager.SetupSkins).
        SPRITES._sprites.IC9 = SPRITES._sprites.G4_4;
        SPRITES._sprites.IC10 = SPRITES._sprites.G2_4;
        // Inferno-only (10 October): Korath's and Drull's frozen looks (the D.A.V.E. Club: IoDave), the same sheets
        // turned to ice (tools/trophy-art/frost.py); "G4_5F" is Korath's level 5 art frozen
        for (let n: int = 1; n <= 6; n++) {
            let k: SpriteData = as3.cast(SPRITES._sprites["G4_" + n], SpriteData);
            let d: SpriteData = as3.cast(SPRITES._sprites["G2_" + n], SpriteData);
            SPRITES._sprites["G4_" + n + "F"] = new SpriteData("monsters/korath_" + n + ".frozen.png", k.rect.width, k.rect.height, k.middle.x, k.middle.y);
            SPRITES._sprites["G2_" + n + "F"] = new SpriteData("monsters/dragon_" + n + ".frozen.png", d.rect.width, d.rect.height, d.middle.x, d.middle.y);
        }
        SPRITES._sprites.shadow = new SpriteData("monsters/flyingshadow.png", 31, 20, 15, 10);
        SPRITES._sprites.bigshadow = new SpriteData("monsters/zafreeti-shadow.png", 48, 32, 24, 16);
        SPRITES._sprites.rocket = new SpriteData("monsters/daverocket.png", 16, 16, 26, 36);
        SPRITES._sprites.vacuum_pipe = new SpriteData("siegeimages/vacuum-pipe.png", 26, 97, 26, 36);
        SPRITES._sprites.vacuum_end = new SpriteData("siegeimages/vacuum-end.png", 52, 52, 26, 36);
        SPRITES._sprites.heart = new SpriteData("effects/heart_icon.v2.png", 12, 12, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.flame = new SpriteData("effects/flame_icon.png", 16, 25, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.venom = new SpriteData("effects/venom_icon.v2.png", 16, 26, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.venomBal = new SpriteData("effects/venomBal_icon.png", 420, 332, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        // Hell Freezes Over (com/monsters/monsters/creeps/inferno/hfo): the ice cretins' sheets and Rimegrave's, one per
        // Academy level, copied whole (each class draws its own frames and places them by the feet), the
        // hailstone, the frost icon and the frozen monster's shell.
        SPRITES._sprites.IC26 = new SpriteData("monsters/shivling.png", 32, 34, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC27 = new SpriteData("monsters/slushgut.png", 60, 48, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC28 = new SpriteData("monsters/rimeclaw.png", 60, 52, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC29 = new SpriteData("monsters/sleetwing.png", 60, 50, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC30 = new SpriteData("monsters/hailspitter.png", 56, 48, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC31 = new SpriteData("monsters/permafrosthulk.png", 84, 76, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_1 = new SpriteData("monsters/rimegrave_1.png", 86, 96, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_2 = new SpriteData("monsters/rimegrave_2.png", 102, 114, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_3 = new SpriteData("monsters/rimegrave_3.png", 118, 130, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_4 = new SpriteData("monsters/rimegrave_4.png", 134, 148, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_5 = new SpriteData("monsters/rimegrave_5.png", 148, 166, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25_6 = new SpriteData("monsters/rimegrave_6.png", 164, 182, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.IC25 = SPRITES._sprites.IC25_1;
        // the Basilisk draws himself from his pieces (Basilisk.ts): 16 headings x 4 rows of 96 x 96
        SPRITES._sprites.IC32 = new SpriteData("monsters/basilisk.png", 96, 96, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.hailstone = new SpriteData("hfo/extras/hailstone.png", 34, 28, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.iceorb = new SpriteData("hfo/extras/iceorb.png", 22, 22, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.frost = new SpriteData("effects/frost_icon.png", 16, 20, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites.monsterfreeze = new SpriteData("effects/monsterfreeze.png", 64, 64, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[SpurtzCannon.SPURTZ_PROJECTILE] = new SpriteData("buildings/ispurtz_cannon/spurtz_projectile.png", 34, 27, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[Jars.JAR_GRAPHIC] = new SpriteData(Jars.JAR_GRAPHIC_URL, Jars.JAR_GRAPHIC_WIDTH, Jars.JAR_GRAPHIC_HEIGHT, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[Decoy.DECOY_WAVE] = new SpriteData("siegeimages/decoy_wave_anim.png", 61, 70, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[Decoy.DECOY_FUSE] = new SpriteData("siegeimages/decoy_fuse_anim.png", 44, 49, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[Decoy.DECOY_EXPLOSION] = new SpriteData("siegeimages/decoy_explosion_anim.png", 184, 195, SpriteData.FUBAR_X, SpriteData.FUBAR_Y);
        SPRITES._sprites[ResurrectProjectile.k_resurecctProjectile] = new SpriteData(ResurrectProjectile.k_projectileImageURL, 20, 20, 0, 0);
    }

    public static Clear(): void {
        SPRITES._sprites = null;
    }

    /** The workers' sheet for the loaded yard: the Inferno's imps, or the overworld's builders (outside the Inferno,
     *  or chosen in the D.A.V.E. Club: IoDave). */
    public static ioWorkerSprite(): void {
        if (!SPRITES._sprites) {
            return;
        }
        if (!BASE.isInfernoMainYardOrOutpost || IoDave.overworldWorkers) {
            SPRITES._sprites.worker = new SpriteData("monsters/worker.png", 27, 27, 9, 19);
        } else if (IoDave.workerSheet) {
            // (27 November, 72's suggestion: the frogs, in the imps' layout; row 0 sitting, row 1 in the air: WORKER.ioFrog;
            // later the same day the other looks with sheets of their own: IoDave.WORKER_SHEETS, WORKER.ioLook)
            SPRITES._sprites.worker = new SpriteData(IoDave.workerSheet, 64, 55, 32, 36);
        } else {
            SPRITES._sprites.worker = new SpriteData("monsters/inferno_worker.v2.png", 64, 55, 32, 36);
        }
    }

    public static SetupSprite(param1: string): void {
        ImageCache.GetImageWithCallBack(as3.str(SPRITES._sprites[param1].key), SPRITES.onAssetLoaded);
    }

    public static GetSpriteDescriptor(param1: string): any {
        return SPRITES._sprites[param1];
    }

    private static onAssetLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: SpriteData = null;
        for (_loc3_ of as3.values(SPRITES._sprites)) {
            if (_loc3_.key == param1) {
                _loc3_.image = param2;
            }
        }
    }

    public static GetSprite(param1: BitmapData, param2: string, param3: string, param4: int, param5: int = 0, param6: int = -1): int {
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        if (!GLOBAL._render) {
            return -1;
        }
        if (param4 < 0) {
            param4 = (360 + param4) | 0;
        }
        // (Inferno-only, 26 October, the user's: "Check in on all monster and champion animations": the cases below skip
        // the copy when the facing is the one asked for last, telling it by the column alone: facing a whole number of
        // columns (a Malphus heading 0, 12, 24... degrees; a Spurtz 0, 45, 90...) its walk stood still, and a picture
        // wiped since (healed to full) stayed empty. GetFrame keeps the frame a picture holds and skips the same copy
        // itself, so here every call copies)
        if (GLOBAL.INFERNO_ONLY && SPRITES.ioSameFrame) {
            param6 = -2;
        }
        // (Inferno-only, 21 October: a sheet none of the cases below is for (a Zagnoid's, most monsters'): straight to the
        // last case, without comparing its name with every other's, a thousand times a step in a big battle)
        if (GLOBAL.INFERNO_ONLY && SPRITES.ioPlain(param2)) {
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 12) | 0);
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "worker") {
            if (STORE._storeData.BST) {
                if (param6 != param4 / 12) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.worker, SpriteData), (param4 / 12) | 0, 1);
                }
                return (param4 / 12 + 30) | 0;
            }
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.worker, SpriteData), (param4 / 12) | 0, 0);
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "C9") {
            if (param3 == "invisible") {
                if (param6 != param4 / 12 + 30) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C9, SpriteData), (param4 / 12) | 0, 1);
                }
                return (param4 / 12 + 30) | 0;
            }
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C9, SpriteData), (param4 / 12) | 0, 0);
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "C12") {
            if (param6 != param4 * 0.083333333) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C12, SpriteData), (param4 * 0.083333333) | 0);
            }
            return (param4 * 0.083333333) | 0;
        }
        if (param2 == "C13") {
            if (param3 == "walking") {
                if (param6 != param4 / 12) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C13, SpriteData), (param4 / 12) | 0);
                }
                return (param4 / 12) | 0;
            }
            if (param3 == "burrowed") {
                if (param6 != 33) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C13, SpriteData), (param4 / 12) | 0, 4);
                }
                return 33;
            }
            if (param3 == "transition") {
                if (param6 != 34) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C13, SpriteData), (param4 / 12) | 0, param5);
                }
                return 34;
            }
        }
        if (param2 == "C14") {
            if (param6 != param4 / 11.25 + param5 % 9 / 3 * 32) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C14, SpriteData), (param4 / 11.25) | 0, (param5 % 9 / 3) | 0);
            }
            return (param4 / 11.25 + param5 % 9 / 3 * 32) | 0;
        }
        if (param2 == "C16") {
            if (param6 != param4 / 11.25 + param5 % 9 / 3 * 32) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C16, SpriteData), (param4 / 11.25) | 0, (param5 % 9 / 3) | 0);
            }
            return (param4 / 11.25 + param5 % 9 / 3 * 32) | 0;
        }
        if (param2 == "C19") {
            if (param3 == "idle") {
                if (param6 != param4 / 12) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C19, SpriteData), (param4 / 12) | 0, 1);
                }
            } else if (param3 == "moving") {
                if (param6 != param4 / 12) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C19, SpriteData), (param4 / 12) | 0, (param5 / 8 % 5 + 1) | 0);
                }
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "C15") {
            if (param6 != param4 / 11.25) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C15, SpriteData), (param4 / 11.25) | 0);
            }
            return (param4 / 11.25) | 0;
        }
        if (param2 == "IC1" || param2 == "IC1s") {
            // (Inferno-only, 26 October: the Spurtz's sheets have 30 facings, 12 degrees each, read as 32 (11.25): facing
            // 337.5 to 360 it was drawn from past the sheet's edge, nothing, in a battle and in the compound)
            let per: number = GLOBAL.INFERNO_ONLY ? 12 : 11.25;
            if (param6 != param4 / per) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), ((param4 / per) | 0) % (GLOBAL.INFERNO_ONLY ? 30 : 32), (param5 / 8 % 2 + 1) | 0);
            }
            return (param4 / per) | 0;
        }
        if (param2 == "IC3") {
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.IC3, SpriteData), (param4 / 12) | 0, (param5 / 8 % 8 + 1) | 0);
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "IC24") {
            // Ashkarr draws herself (Ashkarr.getNextSprite); this is for anything else that asks for her:
            // facings in 22.5 degree columns, rows 0-9 walk, 10-19 attack, 20-29 war-cry, 30-37 idle.
            _loc10_ = (((param4 / 22.5) | 0) % 16) | 0;
            _loc8_ = (param3 == "warcry" ? ((param5 / 8) | 0) % 10 + 20 : (param3 == GLOBAL.e_BASE_MODE.ATTACK || param3 == "attack" ? ((param5 / 8) | 0) % 10 + 10 : (param3 == "idle" ? ((param5 / 8) | 0) % 8 + 30 : ((param5 / 8) | 0) % 10))) | 0;
            _loc9_ = (_loc8_ * 16 + _loc10_) | 0;
            if (param6 != _loc9_) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.IC24, SpriteData), _loc10_, _loc8_);
            }
            return _loc9_;
        }
        if (param2 == "IC12" || param2 == "IC14" || param2 == "IC15" || param2 == "IC20") {
            // (the frame id carries the row, so the walk still animates when the facing stays). Row 0 is
            // standing, 1-8 the walk; the Flickerfiend's shimmer is rows 9-12, the Emberghoul's attack 9-16,
            // all a frame every 8 game steps (10 a second).
            if (param3 == "blink" && param2 == "IC14") {
                _loc8_ = (((param5 / 8) | 0) % 4 + 9) | 0;
            } else if (param3 == "attack" && param2 == "IC20") {
                _loc8_ = (((param5 / 8) | 0) % 8 + 9) | 0;
            } else {
                _loc8_ = (param3 == "idle" ? 0 : ((param5 / 8) | 0) % 8 + 1) | 0;
            }
            _loc9_ = (((param4 / 12) | 0) % 30 + _loc8_ * 30) | 0;
            if (param6 != _loc9_) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (((param4 / 12) | 0) % 30) | 0, _loc8_);
            }
            return _loc9_;
        }
        if (param2 == "IC5") {
            if (GLOBAL.INFERNO_ONLY) {
                // (Inferno-only, 26 October, the user's: "Sometimes balthazar ... during an attack will jolt forward and
                // backward whilst moving in one direction (his shadow stays at the same spot)": his flight's six frames
                // sink him 6 pixels as his wings rise, and from the last back to the first he jumped back up at once.
                // Played there and back (1 to 6, then 5 to 2) he sinks and rises smoothly with his wingbeat. And the
                // frame he holds is told by his facing and his frame together: a facing a whole number of columns (0,
                // 180 degrees) froze his wings)
                let k: int = (((param5 / 8) | 0) % 10) | 0;
                let row: int = (1 + (k <= 5 ? k : 10 - k)) | 0;
                let col: int = ((param4 / 12) | 0) % 30;
                let id: int = (col + row * 30) | 0;
                if (param6 != id) {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.IC5, SpriteData), col, row);
                }
                return id;
            }
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.IC5, SpriteData), (param4 / 12) | 0, (param5 / 8 % 6 + 1) | 0);
            }
            return (param4 / 12) | 0;
        }
        if (param2.substr(0, 2) == "G1" || param2.substr(0, 2) == "G2") {
            if (SPRITES._sprites[param2]) {
                if (param3 == "idle") {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0);
                } else if (param3 == "walking") {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 7 + 1) | 0);
                } else if (param3 == GLOBAL.e_BASE_MODE.ATTACK) {
                    if ((_loc7_ = param2.substr(3, 1)) == "4" || _loc7_ == "5" || _loc7_ == "6") {
                        SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 8 + 8) | 0);
                    } else {
                        SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 7 + 8) | 0);
                    }
                }
                return (param4 / 22.5) | 0;
            }
        }
        if (param2.substr(0, 2) == "G3") {
            if (SPRITES._sprites[param2]) {
                if (param3 == "idle") {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0);
                } else if ((_loc7_ = param2.substr(3, 1)) == "1") {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 7 + 1) | 0);
                } else if (_loc7_ == "2") {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 8 + 1) | 0);
                } else {
                    SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 6 + 1) | 0);
                }
                return (param4 / 22.5) | 0;
            }
        }
        if (param2.substr(0, 2) == "G4" && Boolean(SPRITES._sprites[param2])) {
            if (param3 == "idle") {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0);
            } else if (param3 == "walking") {
                _loc8_ = Number(param2.substr(3, 1)) | 0;
                _loc9_ = 8;
                if (_loc8_ == 3) {
                    _loc9_ = 9;
                } else if (_loc8_ > 3) {
                    _loc9_ = 10;
                }
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % _loc9_ + 0) | 0);
            } else if (param3 == GLOBAL.e_BASE_MODE.ATTACK) {
                _loc8_ = Number(param2.substr(3, 1)) | 0;
                switch (_loc8_) {
                    case 1:
                        _loc9_ = 9;
                        _loc10_ = 8;
                        break;
                    case 2:
                        _loc9_ = 9;
                        _loc10_ = 8;
                        break;
                    case 3:
                        // (Inferno-only, 26 October: his level 3 sheet has 18 rows: the strike's tenth frame, row 18, was
                        // past its end, nothing drawn; nine frames, 9 to 17)
                        _loc9_ = GLOBAL.INFERNO_ONLY ? 9 : 10;
                        _loc10_ = 9;
                        break;
                    case 4:
                        _loc9_ = 10;
                        _loc10_ = 10;
                        break;
                    case 5:
                        _loc9_ = 10;
                        _loc10_ = 10;
                        break;
                    case 6:
                        _loc9_ = 10;
                        _loc10_ = 10;
                }
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % _loc9_ + _loc10_) | 0);
            } else if (param3 == "stomp") {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % 10 + 20) | 0);
            }
            return (param4 / 22.5) | 0;
        }
        if (param2.substr(0, 2) == "G5" && Boolean(SPRITES._sprites[param2])) {
            if (param3 == "walking" || param3 == "idle") {
                _loc9_ = 10;
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % _loc9_ + 0) | 0);
            } else if (param3 == GLOBAL.e_BASE_MODE.ATTACK) {
                _loc8_ = Number(param2.substr(3, 1)) | 0;
                switch (_loc8_) {
                    case 1:
                        _loc9_ = 6;
                        _loc10_ = 10;
                        break;
                    case 2:
                        _loc9_ = 6;
                        _loc10_ = 10;
                        break;
                    case 3:
                        _loc9_ = 6;
                        _loc10_ = 10;
                }
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 22.5) | 0, (param5 / 8 % _loc9_ + _loc10_) | 0);
            }
            return (param4 / 22.5) | 0;
        }
        if (param2 == "shadow") {
            SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.shadow, SpriteData), 0);
            return 0;
        }
        if (param2 == "bigshadow") {
            SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.bigshadow, SpriteData), 0);
            return 0;
        }
        if (param2 == "C200") {
            if (param3 == "empty") {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C200, SpriteData), (param4 / 12) | 0);
            } else {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.C200, SpriteData), (param4 / 12) | 0, 1);
            }
            return (param4 / 12) | 0;
        }
        if (param2 == "rocket") {
            if (param6 != param4 / 11.25) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.rocket, SpriteData), (param4 / 11.25) | 0);
            }
            return (param4 / 11.25) | 0;
        }
        if (param2 == "iceorb") {
            // 4 frames, a slow shimmer (the orb looks the same every way)
            SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.iceorb, SpriteData), (((param5 / 4) | 0) % 4) | 0, 0);
            return 0;
        }
        if (param2 == "hailstone") {
            // 32 facings x 3 rows, as the Spurtz cannon's projectile; rows 1-2 tumble
            SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites.hailstone, SpriteData), (((param4 / 11.25) | 0) % 32) | 0, (param5 / 8 % 2 + 1) | 0);
            return (param4 / 11.25) | 0;
        }
        if (param2 == SpurtzCannon.SPURTZ_PROJECTILE) {
            if (param6 != param4 / 11.25) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[SpurtzCannon.SPURTZ_PROJECTILE], SpriteData), (param4 / 11.25) | 0, (param5 / 8 % 2 + 1) | 0);
            }
            return (param4 / 11.25) | 0;
        }
        if (SPRITES._sprites[param2]) {
            if (param6 != param4 / 12) {
                SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), (param4 / 12) | 0);
            }
            return (param4 / 12) | 0;
        }
        print("could not get frame " + param2);
        return 0;
    }

    /** Inferno-only (21 October): the sheets GetSprite has no case of its own for, by name (true: the last case's). */
    private static _ioPlain: Map<string, boolean> = new Map<string, boolean>();

    /** The names GetSprite has a case for (besides those starting G1-G5). */
    private static readonly IO_CASES: string[] = ["worker", "C9", "C12", "C13", "C14", "C16", "C19", "C15", "IC1", "IC1s", "IC3", "IC24", "IC12", "IC14", "IC15", "IC20", "IC5", "shadow", "bigshadow", "C200", "rocket", "iceorb", "hailstone"];

    /** Inferno-only (21 October): true when GetSprite's last case is the one for this sheet (it is loaded, no case of its own). */
    public static ioPlain(name: string): boolean {
        let known: boolean = SPRITES._ioPlain.get(name);
        if (known === undefined) {
            if (!SPRITES._sprites || !SPRITES._sprites[name]) {
                // (not loaded yet: asked again next time)
                return false;
            }
            let g: string = String(name).substr(0, 2);
            known = SPRITES.IO_CASES.indexOf(name) < 0 && name != SpurtzCannon.SPURTZ_PROJECTILE && g != "G1" && g != "G2" && g != "G3" && g != "G4" && g != "G5";
            SPRITES._ioPlain.set(name, known);
        }
        return known && Boolean(SPRITES._sprites[name]);
    }

    /** Inferno-only (19 October): a frame already on a picture isn't copied again (GetFrame, ioOverlay); false: always (tests). */
    public static ioSameFrame: boolean = true;

    /**
     * Inferno-only (19 October): something drawn over the frame GetFrame left on a picture (a monster's health bar):
     * drawn again only when the picture changed since, or it differs (key); null: nothing is to be over it now
     * (healed), so the frame is copied again. The picture then still counts as holding its frame (GetFrame).
     */
    public static ioOverlay(bmd: BitmapData, key: string, draw: () => void): void {
        let held: any = bmd ? Object(bmd) : null;
        if (!held || !GLOBAL.INFERNO_ONLY || !SPRITES.ioSameFrame || !("$version" in held)) {
            if (draw != null) {
                draw();
            }
            return;
        }
        let known: boolean = held["$ioGfKey"] != null && held["$ioGfVer"] === held["$version"];
        if (key == null) {
            if (held["$ioGfOver"] != null) {
                held["$ioGfKey"] = null;
                held["$ioGfOver"] = null;
            }
            return;
        }
        if (known && held["$ioGfOver"] === key) {
            return;
        }
        // (another bar over an old one covers it, as before)
        draw();
        if (known) {
            held["$ioGfVer"] = held["$version"];
            held["$ioGfOver"] = key;
        } else {
            held["$ioGfOver"] = null;
        }
    }

    public static GetFrame(param1: BitmapData, param2: SpriteData, param3: int, param4: int = 0): void {
        if (Boolean(param2) && Boolean(param2.image)) {
            // (Inferno-only, 26 October: a frame asked for past the sheet's edge drew nothing (the monster vanished for
            // it): the facing taken round the sheet's columns, the row kept to its last)
            if (GLOBAL.INFERNO_ONLY) {
                let cols: int = Math.max(1, Math.round(param2.image.width / param2.rect.width)) | 0;
                let rows: int = Math.max(1, Math.round(param2.image.height / param2.rect.height)) | 0;
                if (param3 >= cols || param3 < 0) {
                    param3 = (((param3 % cols) + cols) % cols) | 0;
                }
                if (param4 >= rows) {
                    param4 = (rows - 1) | 0;
                } else if (param4 < 0) {
                    param4 = 0;
                }
            }
            param2.rect.x = param2.rect.width * param3;
            param2.rect.y = param2.rect.height * param4;
            if (param1) {
                // (Inferno-only, 19 October: the picture already holds that frame, nothing drawn on it since: not copied
                // again. Most monsters asked for their frame every game step (a shadow too, its one frame), and every
                // copy counted as a change: the yard's renderer drew each standing monster again every frame; 500 of
                // them a thousand copies a step)
                let fk: string = null;
                if (GLOBAL.INFERNO_ONLY && SPRITES.ioSameFrame && "$version" in param1) {
                    // (21 October: the same sheet, the same part of it, to the same place, the picture and the sheet as
                    // they were: told by numbers, before any key is put together)
                    let was: any = Object(param1);
                    let r0: any[] = was["$ioGfR"];
                    if (r0 && was["$ioGfSd"] === param2 && was["$ioGfKey"] != null && r0[0] === param2.rect.x && r0[1] === param2.rect.y && r0[2] === param2.rect.width && r0[3] === param2.rect.height && r0[4] === param2.offset.x && r0[5] === param2.offset.y && was["$ioGfVer"] === was["$version"] && was["$ioGfImg"] === param2.image && was["$ioGfImgVer"] === Object(param2.image)["$version"]) {
                        return;
                    }
                    fk = param2.key + "|" + param2.rect.x + "|" + param2.rect.y + "|" + param2.rect.width + "|" + param2.rect.height + "|" + param2.offset.x + "|" + param2.offset.y;
                    let held: any = Object(param1);
                    if (held["$ioGfKey"] === fk && held["$ioGfVer"] === held["$version"] && held["$ioGfImg"] === param2.image && held["$ioGfImgVer"] === Object(param2.image)["$version"]) {
                        return;
                    }
                }
                param1.copyPixels(param2.image, param2.rect, param2.offset);
                if (fk != null) {
                    let held2: any = Object(param1);
                    held2["$ioGfKey"] = fk;
                    held2["$ioGfVer"] = held2["$version"];
                    held2["$ioGfImg"] = param2.image;
                    held2["$ioGfImgVer"] = Object(param2.image)["$version"];
                    held2["$ioGfOver"] = null;
                    // (21 October: where in the sheet, and where on the picture: the yard drawn by the graphics card
                    // draws the frame straight from the sheet, Renderer.ioGlEntry)
                    held2["$ioGfR"] = [param2.rect.x, param2.rect.y, param2.rect.width, param2.rect.height, param2.offset.x, param2.offset.y];
                    held2["$ioGfSd"] = param2;
                }
                // (Inferno-only, 16 October: which frame it holds now, so a glowing monster's picture is made once
                // for every monster showing the frame: IoGlowCache)
                if (GLOBAL.INFERNO_ONLY) {
                    IoGlowCache.tag(param1, param2.key + "@" + param2.rect.x + "," + param2.rect.y + "," + param2.rect.width + "," + param2.rect.height + "@" + param2.offset.x + "," + param2.offset.y);
                }
            } else {
                print("passed in a null canvas", true);
            }
        }
    }

    public static GetFrameById(param1: BitmapData, param2: string, param3: int, param4: int = 0): void {
        SPRITES.GetFrame(param1, as3.cast(SPRITES._sprites[param2], SpriteData), param3, param4);
    }
}
