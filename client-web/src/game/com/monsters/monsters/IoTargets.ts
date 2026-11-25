import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, CREEPS, GLOBAL, ILootable, KEYS, MONSTERBUNKER, MonsterBase, PATHING } from "@game";

/**
 * Inferno-only (21 November, the user's): the favourite targets of some of the Inferno's monsters.
 *
 *   Valgos (IC4)       walls and storage (Resource Pods: the Storage Silo, BUILDING6; the Under Hall; an outpost's hall): whichever is nearest.
 *                      Double damage to walls (as before: CreepBase), half to storage.
 *   Malphus (IC3)      resources (harvesters and storage: what can be looted, as before) out of reach of every
 *                      defense first, then the ones in reach. He walks round the defenses' reach when he can
 *                      (avoidsDefenses: his paths pay for every step inside it, PATHING's ioDanger).
 *   Clinkerjaw (IC12)  what is nearest to his own side's monsters or what they are attacking, no further than 10
 *                      blocks from him; anything nearest when there is nothing there.
 *   Grokus (IC6)       resources and defenses: whichever is nearest. Half damage to defenses.
 *   Emberghoul (IC20)  anything nearest; but hurt (below his full health), anything out of reach of every defense
 *                      within 15 blocks of him first (and, when he is first hurt, he leaves a target in reach for one).
 *
 * A block is a wall block: 20 of the yard's units (BUILDING17's footprint). A defense's reach is its range (BTOWER:
 * from the middle of its footprint, as its own targeting); a building is in reach when its middle is within the range
 * plus half its width (a monster fights it from its edge). The defenses: every tower and bunker standing (not traps).
 *
 * Only for monsters attacking (MonsterBase.findTarget), never in Hellgate Defense (its monsters keep to their lanes).
 */
export class IoTargets extends ASObject {
    public static readonly BLOCK: number = 20;

    public static readonly VALGOS: string = "IC4";

    public static readonly MALPHUS: string = "IC3";

    public static readonly GROKUS: string = "IC6";

    public static readonly CLINKERJAW: string = "IC12";

    public static readonly EMBERGHOUL: string = "IC20";

    /** The storage Valgos goes for: the Resource Pod (Storage Silo), the Under Hall, an outpost's hall. */
    public static readonly STORAGE: any[] = [6, 14, 112];

    /** How far outside a defense's reach Malphus's paths start paying (the yard's units). */
    public static readonly DANGER_PAD: number = 15;
    /** How far Clinkerjaw looks for what his side is attacking, and the hurt Emberghoul for a safe target (blocks). */
    public static readonly CLINKERJAW_BLOCKS: int = 10;
    public static readonly EMBERGHOUL_BLOCKS: int = 15;

    /** What a step inside a defense's reach costs Malphus's paths, on top of the step (10). */
    public static readonly DANGER_COST: int = 200;

    private static on(m: MonsterBase): boolean {
        return GLOBAL.INFERNO_ONLY && !!m && !GLOBAL.ioTdMode();
    }

    /** A building's middle, in the yard's units (PATHING.FromISO), as a tower's own targeting takes it. */
    public static middleOf(b: BFOUNDATION): Point {
        let p: Point = b._position ? b._position : new Point(b._mc.x, b._mc.y);
        let h: number = b._footprint && b._footprint.length ? Number(b._footprint[0].height) : 0;
        return PATHING.FromISO(new Point(p.x, p.y + h / 2));
    }

    private static halfWidth(b: BFOUNDATION): number {
        return b._footprint && b._footprint.length ? Number(b._footprint[0].width) / 2 : 0;
    }

    /** The defenses standing: [x, y, range] each, in the yard's units. */
    public static defenses(): any[] {
        let out: any[] = [];
        for (let b of as3.values(BASE._buildingsTowers)) {
            let t: any = b;
            if (!t || t.health <= 0 || t._class == "trap" || t._destroyed) {
                continue;
            }
            let range: number = Number(t._range) || 0;
            if (range <= 0) {
                continue;
            }
            let c: Point = IoTargets.middleOf(t);
            out.push([c.x, c.y, range]);
        }
        return out;
    }

    /** Whether a building is within reach of any of these defenses. */
    public static inReach(b: BFOUNDATION, defenses: any[]): boolean {
        let c: Point = IoTargets.middleOf(b);
        let pad: number = IoTargets.halfWidth(b);
        for (let d of defenses) {
            let dx: number = c.x - d[0];
            let dy: number = c.y - d[1];
            let r: number = d[2] + pad;
            if (dx * dx + dy * dy <= r * r) {
                return true;
            }
        }
        return false;
    }

    private static alive(b: any): boolean {
        return !!b && b.health > 0 && !b._destroyed;
    }

    /** Anything a monster may attack (findTarget's own list: not decorations, immovables, enemies, jarred towers). */
    private static attackable(b: any): boolean {
        if (!IoTargets.alive(b) || b._class == "decoration" || b._class == "immovable" || b._class == "enemy") {
            return false;
        }
        if (b._class == "tower" && !MONSTERBUNKER.isBunkerBuilding(b._type) && as3.as(b, BTOWER) && (as3.as(b, BTOWER) as BTOWER).isJard) {
            return false;
        }
        return true;
    }

    private static lootable(b: any): boolean {
        return IoTargets.alive(b) && as3.is(b, ILootable) && !b._looted;
    }

    /** A defense findTarget's towers group takes (not traps, not jarred; a bunker with monsters in it). */
    private static defense(b: any): boolean {
        if (!IoTargets.alive(b)) {
            return false;
        }
        if (MONSTERBUNKER.isBunkerBuilding(b._type)) {
            return b._used > 0 || b._monstersDispatchedTotal > 0;
        }
        return b._class != "trap" && !(as3.as(b, BTOWER) && (as3.as(b, BTOWER) as BTOWER).isJard);
    }

    private static distance(m: MonsterBase, b: BFOUNDATION): number {
        let a: Point = PATHING.FromISO(m._tmpPoint);
        let c: Point = IoTargets.middleOf(b);
        return Math.sqrt((a.x - c.x) * (a.x - c.x) + (a.y - c.y) * (a.y - c.y));
    }

    /**
     * The buildings a monster prefers now, for findTarget to take the nearest of; null for its own rules (its
     * targetGroup), as before. Empty is never returned.
     */
    public static pick(m: MonsterBase): any[] {
        if (!IoTargets.on(m)) {
            return null;
        }
        let id: string = m._creatureID;
        let out: any[] = [];
        let b: any = null;
        if (id == IoTargets.VALGOS) {
            for (b of as3.values(BASE._buildingsWalls)) {
                if (IoTargets.alive(b)) {
                    out.push(b);
                }
            }
            for (b of as3.values(BASE._buildingsMain)) {
                if (IoTargets.alive(b) && IoTargets.STORAGE.indexOf(b._type | 0) >= 0) {
                    out.push(b);
                }
            }
        } else if (id == IoTargets.MALPHUS) {
            let defenses: any[] = IoTargets.defenses();
            let inside: any[] = [];
            for (b of as3.values(BASE._buildingsMain)) {
                if (IoTargets.lootable(b)) {
                    (IoTargets.inReach(b, defenses) ? inside : out).push(b);
                }
            }
            if (out.length == 0) {
                out = inside;
            }
        } else if (id == IoTargets.GROKUS) {
            for (b of as3.values(BASE._buildingsMain)) {
                if (IoTargets.lootable(b)) {
                    out.push(b);
                }
            }
            for (b of as3.values(BASE._buildingsTowers)) {
                if (IoTargets.defense(b) && out.indexOf(b) < 0) {
                    out.push(b);
                }
            }
        } else if (id == IoTargets.EMBERGHOUL) {
            out = IoTargets.safeNear(m);
        } else if (id == IoTargets.CLINKERJAW) {
            b = IoTargets.byAllies(m);
            if (b) {
                out.push(b);
            }
        }
        return out.length ? out : null;
    }

    /** Emberghoul, hurt: what can be attacked out of every defense's reach within 15 blocks of him. */
    private static safeNear(m: MonsterBase): any[] {
        let out: any[] = [];
        if (!(m.health < m.maxHealth)) {
            return out;
        }
        let defenses: any[] = IoTargets.defenses();
        let most: number = IoTargets.EMBERGHOUL_BLOCKS * IoTargets.BLOCK;
        for (let b of as3.values(BASE._buildingsMain)) {
            if (IoTargets.attackable(b) && IoTargets.distance(m, b) <= most + IoTargets.halfWidth(b) && !IoTargets.inReach(b, defenses)) {
                out.push(b);
            }
        }
        return out;
    }

    /** His own side's monsters still fighting (not him). */
    private static allies(m: MonsterBase): any[] {
        let out: any[] = [];
        for (let c of as3.values(CREEPS._creeps)) {
            let a: any = c;
            if (a && a !== m && a._friendly == m._friendly && a.health > 0 && !a._dying && !a.dead && a._tmpPoint) {
                out.push(a);
            }
        }
        return out;
    }

    /**
     * Clinkerjaw: of what he may attack within 10 blocks of him, what his side's monsters are attacking (or going for),
     * else what is nearest to one of them; null with none there (anything nearest, as before).
     */
    private static byAllies(m: MonsterBase): BFOUNDATION {
        let allies: any[] = IoTargets.allies(m);
        if (allies.length == 0) {
            return null;
        }
        let most: number = IoTargets.CLINKERJAW_BLOCKS * IoTargets.BLOCK;
        let best: BFOUNDATION = null;
        let bestScore: number = Infinity;
        let bestDistance: number = Infinity;
        let targeted: any[] = [];
        for (let a of allies) {
            if (a._targetBuilding && IoTargets.attackable(a._targetBuilding)) {
                targeted.push(a._targetBuilding);
            }
        }
        let consider = (b: any): void => {
            if (!IoTargets.attackable(b)) {
                return;
            }
            let d: number = IoTargets.distance(m, b);
            if (d > most + IoTargets.halfWidth(b)) {
                return;
            }
            let score: number = Infinity;
            if (targeted.indexOf(b) >= 0) {
                score = 0;
            } else {
                let c: Point = IoTargets.middleOf(b);
                for (let a of allies) {
                    let p: Point = PATHING.FromISO(a._tmpPoint);
                    let s: number = Math.sqrt((p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y));
                    if (s < score) {
                        score = s;
                    }
                }
            }
            if (score < bestScore || score == bestScore && d < bestDistance) {
                best = b;
                bestScore = score;
                bestDistance = d;
            }
        };
        for (let b of as3.values(BASE._buildingsMain)) {
            consider(b);
        }
        for (let b of as3.values(BASE._buildingsWalls)) {
            if (targeted.indexOf(b) >= 0) {
                consider(b);
            }
        }
        return best;
    }

    /**
     * Emberghoul, the moment he is first hurt: whether to leave the building he is on (in a defense's reach) for one
     * out of reach. Asked every step he has a building and no monster as his target; cheap until he is hurt.
     */
    public static hurtRetarget(m: MonsterBase): boolean {
        if (!IoTargets.on(m) || m._creatureID != IoTargets.EMBERGHOUL) {
            return false;
        }
        let hurt: boolean = m.health < m.maxHealth;
        let mm: any = m;
        if (!hurt) {
            mm._ioHurtSeen = false;
            return false;
        }
        if (mm._ioHurtSeen) {
            return false;
        }
        mm._ioHurtSeen = true;
        if (!m._targetBuilding || !IoTargets.inReach(m._targetBuilding, IoTargets.defenses())) {
            return false;
        }
        return IoTargets.safeNear(m).length > 0;
    }

    /**
     * 22 November (the user's: "we didn't update the text"): what the Strongbox, the Incubator, the ICS and the monster
     * buttons say a monster goes for (CREATURELOCKER.ioTags' "Targets:"), from what pick does; null for a monster
     * pick leaves to its own targetGroup.
     */
    public static describe(id: string): string {
        if (!GLOBAL.INFERNO_ONLY) {
            return null;
        }
        switch (id) {
            case IoTargets.VALGOS:
                return KEYS.Get("io_mon2_tg_valgos");
            case IoTargets.MALPHUS:
                return KEYS.Get("io_mon2_tg_malphus");
            case IoTargets.GROKUS:
                return KEYS.Get("io_mon2_tg_grokus");
            case IoTargets.CLINKERJAW:
                return KEYS.Get("io_mon2_tg_clinkerjaw", { "v1": IoTargets.CLINKERJAW_BLOCKS });
            case IoTargets.EMBERGHOUL:
                return KEYS.Get("io_mon2_tg_emberghoul");
        }
        return null;
    }

    /** Its damage to some buildings, as damageMul and CreepBase (Valgos's walls, his targetGroup's): ["Walls x2", ...]. */
    public static damageNotes(id: string): string[] {
        if (!GLOBAL.INFERNO_ONLY) {
            return [];
        }
        if (id == IoTargets.VALGOS) {
            return [KEYS.Get("io_mon2_dmg_walls2"), KEYS.Get("io_mon2_dmg_storage_half")];
        }
        if (id == IoTargets.GROKUS) {
            return [KEYS.Get("io_mon2_dmg_defences_half")];
        }
        return [];
    }

    /** What a monster's hit on a building is multiplied by (on top of the game's own): Valgos on storage, Grokus on defenses. */
    public static damageMul(m: MonsterBase, b: BFOUNDATION): number {
        if (!IoTargets.on(m) || !b) {
            return 1;
        }
        if (m._creatureID == IoTargets.VALGOS && IoTargets.STORAGE.indexOf(b._type | 0) >= 0) {
            return 0.5;
        }
        if (m._creatureID == IoTargets.GROKUS && (b._class == "tower" || MONSTERBUNKER.isBunkerBuilding(b._type))) {
            return 0.5;
        }
        return 1;
    }

    /** Whether this monster's paths keep out of the defenses' reach where they can (Malphus). */
    public static avoidsDefenses(m: MonsterBase): boolean {
        return IoTargets.on(m) && m._creatureID == IoTargets.MALPHUS;
    }

    /**
     * The grid's cells (PATHING's: 10 of the yard's units, x * height + y) inside any defense's reach: 1, the rest 0.
     */
    public static dangerGrid(gridWidth: int, gridHeight: int): Uint8Array {
        let grid: Uint8Array = new Uint8Array(gridWidth * gridHeight);
        for (let d of IoTargets.defenses()) {
            // the yard's units to the grid's cells (PATHING.GlobalLocal)
            let cx: number = d[0] / 10 + (gridWidth >> 1);
            let cy: number = d[1] / 10 + (gridHeight >> 1);
            // (a cell and a half more: his way hugs the edge of what costs him, so the edge is kept a little outside the reach)
            let r: number = (d[2] + IoTargets.DANGER_PAD) / 10;
            let x0: int = Math.max(0, Math.floor(cx - r)) | 0;
            let x1: int = Math.min(gridWidth - 1, Math.ceil(cx + r)) | 0;
            let y0: int = Math.max(0, Math.floor(cy - r)) | 0;
            let y1: int = Math.min(gridHeight - 1, Math.ceil(cy + r)) | 0;
            for (let x: int = x0; x <= x1; x++) {
                for (let y: int = y0; y <= y1; y++) {
                    let dx: number = x + 0.5 - cx;
                    let dy: number = y + 0.5 - cy;
                    if (dx * dx + dy * dy <= r * r) {
                        grid[x * gridHeight + y] = 1;
                    }
                }
            }
        }
        return grid;
    }
}
