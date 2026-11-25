import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { CREATURELOCKER, KEYS } from "@game";

/**
 * Inferno-only (Hellgate Defense, IoTd): what each wave brings. Endless, and harder every wave:
 *
 *  - The monsters come in the Strongbox's order: Spurtz from wave 1, then a new kind every second wave
 *    (Zagnoid at 2, Fusebug at 4, Valgos at 6 ... Emberghoul at 24). A new kind leads the waves it arrives in.
 *  - Every 10th wave is a boss wave: a champion (Drull, Korath, Ashkarr in turn; more of them later on) with
 *    an escort. Every other 5th wave is a swarm: twice as many of the quick ones, close together.
 *  - Each kind has its own health in the arena (KINDS: a raid's numbers would make the later ones walls of
 *    health); it grows by HP_GROWTH a wave (HP_GROWTH_LATE from wave LATE_FROM), they walk a little faster,
 *    and they come closer together; what they are worth in gold grows too.
 *  - Flying monsters (Balthazar) take the short way, straight over the maze, so they come in small numbers and
 *    don't get the arena's walking speed-up (IoTd.SPEED).
 *
 * The waves are worked out from the wave's number alone (the same wave is always the same), so the next one
 * can be shown before it starts. Rimegrave and the ice cretins are not in it (Hell Freezes Over's).
 */
export class IoTdWaves extends ASObject {
    /** [id, gold for a kill (wave 1), lives taken if it gets to the Hall, health (wave 1)]. In the order they arrive. */
    public static readonly KINDS: any[] = [["IC1", 7, 1, 400], ["IC2", 12, 1, 900], ["IC15", 6, 1, 250], ["IC4", 11, 1, 700], ["IC3", 10, 1, 650], ["IC12", 13, 1, 900], ["IC5", 12, 1, 600], ["IC6", 28, 2, 2000], ["IC7", 13, 1, 800], ["IC14", 12, 1, 700], ["IC8", 26, 2, 1800], ["C19", 26, 2, 1800], ["IC20", 18, 1, 1100]];

    /** The boss waves' champions, in turn: [id, gold, lives, health (at wave 1)]. */
    public static readonly BOSSES: any[] = [["IC10", 200, 5, 6000], ["IC9", 260, 5, 8000], ["IC24", 320, 5, 7000]];

    /** At most this share of a wave flies. */
    public static readonly FLIERS: number = 0.25;

    /** The swarm waves' monsters (the quick ones). */
    public static readonly SWARM: any[] = ["IC1", "IC15"];

    public static readonly HP_GROWTH: number = 1.06;

    /**
     * From this wave on, health grows by HP_GROWTH_LATE a wave instead. (The balance runs, 6 October: a bot with
     * 14 towers, a plain three-line maze and its spare walls unused walked through 35 waves at 1.06 all the way,
     * fell at wave 21 with 1.11 from wave 15, and survived 25 with 1.09. Players who use all their walls and gold
     * go further.)
     */
    public static readonly LATE_FROM: int = 15;

    public static readonly HP_GROWTH_LATE: number = 1.09;

    /**
     * (11 October, the user's: "it isn't possible to get past ~70 rounds. All players die around 55-65".) 9% a wave
     * without end outgrew everything a run can build: the towers' tiers run out, kill gold grows by 6% of wave 1's a
     * wave, and by wave 60 the monsters had 109 times their first health, by 65 168 times. From DAMP_FROM health grows
     * by HP_GROWTH_DAMP a wave, and from SLOW_FROM by HP_GROWTH_SLOW: a monster at wave 75 is about what one was at 60
     * (98 times against 109) and one at 90 what one was at 65, so the players who fell at 55 to 65 now go to
     * about 75 to 90, and it is still endless (it keeps growing).
     */
    public static readonly DAMP_FROM: int = 35;

    public static readonly HP_GROWTH_DAMP: number = 1.06;

    public static readonly SLOW_FROM: int = 60;

    public static readonly HP_GROWTH_SLOW: number = 1.04;

    /** The wave a kind first comes in. */
    public static arrives(index: int): int {
        return (index == 0 ? 1 : index * 2) | 0;
    }

    /** How many kinds there are by wave w. */
    public static kindsBy(w: int): int {
        let n: int = 0;
        while (n < IoTdWaves.KINDS.length && IoTdWaves.arrives(n) <= w) {
            n++;
        }
        return Math.max(1, n) | 0;
    }

    public static isBoss(w: int): boolean {
        return w > 0 && w % 10 == 0;
    }

    public static isSwarm(w: int): boolean {
        return w > 0 && w % 5 == 0 && !IoTdWaves.isBoss(w);
    }

    /** Health multiplier at wave w. */
    public static hpScale(w: int): number {
        let late: int = Math.max(0, Math.min(w, IoTdWaves.DAMP_FROM) - IoTdWaves.LATE_FROM) | 0;
        let damp: int = Math.max(0, Math.min(w, IoTdWaves.SLOW_FROM) - IoTdWaves.DAMP_FROM) | 0;
        let slow: int = Math.max(0, w - IoTdWaves.SLOW_FROM) | 0;
        return Math.pow(IoTdWaves.HP_GROWTH, Math.max(0, Math.min(w, IoTdWaves.LATE_FROM) - 1)) * Math.pow(IoTdWaves.HP_GROWTH_LATE, late) * Math.pow(IoTdWaves.HP_GROWTH_DAMP, damp) * Math.pow(IoTdWaves.HP_GROWTH_SLOW, slow);
    }

    /** Walking speed multiplier at wave w (on top of the arena's own, IoTd.SPEED). */
    public static speedScale(w: int): number {
        return 1 + Math.min(0.4, 0.012 * Math.max(0, w - 1));
    }

    /**
     * Balthazar's speed at wave w (7 October, the user's): a little slower with each wave's rise in health, half
     * his speed by wave 60 and half from then on. (Instead of speedScale: the other monsters walk faster.)
     */
    public static flierSpeedScale(w: int): number {
        return Math.max(0.5, 1 - 0.5 * Math.max(0, w - 1) / 59);
    }

    /** Gold multiplier at wave w. */
    public static goldScale(w: int): number {
        return 1 + 0.06 * Math.max(0, w - 1);
    }

    /** The monsters' level at wave w (their look, their extras): 1, rising to 6 by wave 41. */
    public static level(w: int): int {
        return Math.min(6, 1 + (((w - 1) / 8) | 0)) | 0;
    }

    /** Gold for clearing wave w. */
    public static clearBonus(w: int): int {
        return (60 + 12 * w) | 0;
    }

    /** Walls given for clearing wave w (every third). */
    public static wallsFor(w: int): int {
        return w > 0 && w % 3 == 0 ? 10 : 0;
    }

    /** The wave's banner: "Wave 7", "Wave 10: Drull!", "Wave 5: Swarm!", "Wave 12: here comes Balthazar!". */
    public static title(w: int): string {
        // (QoL #235: in the player's language)
        if (IoTdWaves.isBoss(w)) {
            let b: any[] = as3.as(IoTdWaves.BOSSES[(w / 10 - 1) % IoTdWaves.BOSSES.length], Array);
            return KEYS.Get("io_t3t_wv_boss", { "v1": w, "v2": IoTdWaves.name(String(b[0])) });
        }
        if (IoTdWaves.isSwarm(w)) {
            return KEYS.Get("io_t3t_wv_swarm", { "v1": w });
        }
        let newest: int = (IoTdWaves.kindsBy(w) - 1) | 0;
        if (IoTdWaves.arrives(newest) == w && w > 1) {
            return KEYS.Get("io_t3t_wv_new", { "v1": w, "v2": IoTdWaves.name(String(IoTdWaves.KINDS[newest][0])) });
        }
        return KEYS.Get("io_t3t_wv", { "v1": w });
    }

    public static name(id: string): string {
        let c: any = CREATURELOCKER._creatures[id];
        return c ? KEYS.Get(as3.str(c.name)) : id;
    }

    /**
     * The wave's monsters, in the order they come: [{id, gap (ms before it), bounty, leak, boss}]. The same
     * wave number always gives the same wave.
     */
    public static make(w: int): any[] {
        let seed: uint = 0;
        seed = (w * 7919 + 17) >>> 0;
        let rnd: Function = (): number => {
            seed = ((seed * 1103515245 + 12345) >>> 0 & 0x7FFFFFFF) >>> 0;
            return seed / 0x7FFFFFFF;
        };
        let out: any[] = [];
        let kinds: int = IoTdWaves.kindsBy(w);
        let count: int = Math.min(70, Math.round(6 + 1.6 * w) | 0) | 0;
        let gap: int = Math.max(320, 1100 - 25 * w) | 0;
        let i: int = 0;
        let k: any[] = null;
        if (IoTdWaves.isSwarm(w)) {
            for (i = 0; i < count * 2; i++) {
                k = IoTdWaves.kindOf(as3.str(IoTdWaves.SWARM[i % IoTdWaves.SWARM.length]));
                out.push(IoTdWaves.entry(k, i == 0 ? 0 : (gap * 0.45) | 0, false, w));
            }
            return out;
        }
        if (IoTdWaves.isBoss(w)) {
            count = (count / 2) | 0;
        }
        let newest: int = (kinds - 1) | 0;
        let leads: boolean = w > 1 && w == IoTdWaves.arrives(newest);
        let fliers: int = 0;
        for (i = 0; i < count; i++) {
            let pick: int = leads && rnd() < 0.4 ? newest : (rnd() * kinds) | 0;
            // (runs of the same kind, like a raid's groups: a third of the time it is the one before again)
            if (i > 0 && rnd() < 0.35) {
                pick = out[out.length - 1].index | 0;
            }
            // (not too many fliers: they skip the maze)
            if (IoTdWaves.KINDS[Math.min(kinds - 1, pick)][0] == "IC5" && ++fliers > Math.max(2, count * IoTdWaves.FLIERS)) {
                pick = 0;
            }
            k = as3.as(IoTdWaves.KINDS[Math.min(kinds - 1, pick)], Array);
            let e: any = IoTdWaves.entry(k, i == 0 ? 0 : gap, false, w);
            e.index = IoTdWaves.KINDS.indexOf(k);
            out.push(e);
        }
        if (IoTdWaves.isBoss(w)) {
            let boss: any[] = as3.as(IoTdWaves.BOSSES[(w / 10 - 1) % IoTdWaves.BOSSES.length], Array);
            let bosses: int = (1 + ((w / 30) | 0)) | 0;
            for (i = 0; i < bosses; i++) {
                out.push(IoTdWaves.entry(boss, i == 0 ? 2500 : 1500, true, w));
            }
        }
        return out;
    }

    private static kindOf(id: string): any[] {
        for (let k of as3.values(IoTdWaves.KINDS)) {
            if (k[0] == id) {
                return k;
            }
        }
        return as3.as(IoTdWaves.KINDS[0], Array);
    }

    private static entry(k: any[], gap: int, boss: boolean, w: int): any {
        return { "id": String(k[0]), "gap": gap, "bounty": Math.max(1, Math.round(Number(k[1]) * IoTdWaves.goldScale(w)) | 0), "leak": k[2] | 0, "hp": Math.round(Number(k[3]) * IoTdWaves.hpScale(w)), "boss": boss, "index": 0 };
    }

    /** What's in wave w, for the panel: "12 Spurtz, 6 Zagnoid, 1 Drull". */
    public static preview(w: int): string {
        let counts: any = {};
        let order: any[] = [];
        for (let e of as3.values(IoTdWaves.make(w))) {
            if (!counts[e.id]) {
                counts[e.id] = 0;
                order.push(e.id);
            }
            counts[e.id]++;
        }
        let parts: any[] = [];
        for (const $value of as3.values(order)) {
            let id: string = as3.str($value);
            parts.push(counts[id] + " " + IoTdWaves.name(id));
        }
        return parts.join(", ");
    }
}
