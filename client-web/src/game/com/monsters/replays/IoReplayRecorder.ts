import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Dictionary } from "flash/utils";
import { BASE, CREATURELOCKER, CREATURES, CREEPS, ChampionBase, GLOBAL, MonsterBase, URLLoaderApi } from "@game";

/**
 * Inferno-only: records a player-versus-player attack for its replay (server: services/replays/replays.ts).
 *
 * The attack's load says to (io_replay: {key, rec}); from then on, four times a second of game time (every
 * STEPS steps of the 80-a-second simulation), it notes every monster on the field (the attacker's, the yard's,
 * the champions) and every building: only what changed since the last note, to keep it small. The notes go to
 * the server in parts every 30 seconds and when the attack is over (the yard is left), the last part saying
 * so. The yard itself (its buildings as they were) the server took when the attack began.
 *
 * A sample: [t, monsters, buildings, damage% (null: unchanged), extras]; extras (4 October, only when there are
 * any): {e: [the catapult's shots], g: [[uid, glows or 0], ...] (a monster's glows when they change: [[colour,
 * alpha %, blur, strength], ...], from its filters)}. A shot: ["b", x, y, radius, particles, resource, group]
 * (a bomb), ["j", x, y, radius, seconds] (Candy Jars), ["d", x, y, radius, fuse] (Marilyn). A monster: [uid, x,
 * y, hp%] where it is now on the map, with
 * its height ([.., alt]) if it flies and a 1 last ([.., alt, 1]) when it had been standing still until the
 * sample before (so the replay doesn't slide it there slowly); [uid] when it is gone. A building: [id, hp%].
 * A monster is described once, when first seen: [uid, monster, side (1: the yard's), kind (0: drawn by its own
 * class, 1: a champion drawn from its sprite: then sprite, x and y offsets), level].
 */
export class IoReplayRecorder extends ASObject {
    /** Game steps between samples (80 a second: 4 samples a second). */
    public static readonly STEPS: int = 20;

    public static readonly RATE: int = 4;

    /** Samples per part sent (30 seconds). */
    private static readonly PART: int = 120;

    /** At most this many samples in all (20 minutes): an attack left open isn't recorded for ever. */
    private static readonly MAX_SAMPLES: int = 4800;

    private static _key: string = null;

    private static _steps: int = 0;

    private static _t: int = 0;

    private static _seq: int = 0;

    private static _uids: Dictionary = new Dictionary(true);

    private static _nextUid: int = 1;

    /** uid -> [x, y, hp, alt, t last noted, t last changed]. */
    private static _last: any = {};

    private static _buildings: any = {};

    private static _damage: int = -1;

    private static _defs: any[] = [];

    private static _samples: any[] = [];

    /** The catapult's shots since the last sample. */
    private static _shots: any[] = [];

    /** uid -> its glows as last noted (JSON). */
    private static _glows: any = {};

    public $ctor(): void {
        super.$ctor();
    }

    public static get recording(): boolean {
        return IoReplayRecorder._key != null;
    }

    public static get key(): string {
        return IoReplayRecorder._key;
    }

    /** The attack's yard is built (BASE): its replay starts. */
    public static begin(key: string): void {
        IoReplayRecorder.stop(false);
        if (!GLOBAL.INFERNO_ONLY || !key) {
            return;
        }
        IoReplayRecorder._key = key;
        IoReplayRecorder._steps = 0;
        IoReplayRecorder._t = 0;
        IoReplayRecorder._seq = 0;
        IoReplayRecorder._uids = new Dictionary(true);
        IoReplayRecorder._nextUid = 1;
        IoReplayRecorder._last = {};
        IoReplayRecorder._buildings = {};
        IoReplayRecorder._damage = -1;
        IoReplayRecorder._defs = [];
        IoReplayRecorder._samples = [];
        IoReplayRecorder._shots = [];
        IoReplayRecorder._glows = {};
        IoReplayRecorder.sample();
    }

    /**
     * The catapult fired (ResourceBombs.BombDrop): noted with the next sample, so the replay throws it too (only
     * its picture: what it did to the yard is in the buildings' and monsters' health).
     */
    public static shot(bomb: any, x: number, y: number): void {
        if (!IoReplayRecorder._key || !bomb) {
            return;
        }
        if (bomb.kind == "decoy") {
            IoReplayRecorder._shots.push(["d", x | 0, y | 0, bomb.radius | 0 || 0, Number(bomb.fuse) || 0]);
        } else if (bomb.kind == "jars") {
            IoReplayRecorder._shots.push(["j", x | 0, y | 0, bomb.radius | 0 || 0, Number(bomb.seconds) || 0]);
        } else {
            IoReplayRecorder._shots.push(["b", x | 0, y | 0, bomb.radius | 0 || 0, bomb.particles | 0 || 1, bomb.resource | 0 || 1, bomb.group | 0]);
        }
    }

    /** A monster's glows (its GlowFilters, on its picture or on itself): [[colour, alpha %, blur, strength], ...]. */
    private static glowsOf(m: MonsterBase): any[] {
        let out: any[] = [];
        let lists: any[] = [];
        try {
            if (m._graphicMC && m._graphicMC.filters) {
                lists.push(m._graphicMC.filters);
            }
            if (m.graphic && m.graphic.filters) {
                lists.push(m.graphic.filters);
            }
        } catch (e) {
        }
        for (let list of as3.values(lists)) {
            for (let f of as3.values(list)) {
                if (f instanceof GlowFilter) {
                    let g: GlowFilter = as3.cast(f, GlowFilter);
                    out.push([g.color, Math.round(g.alpha * 100), Math.round(g.blurX), Math.round(g.strength * 10) / 10]);
                }
            }
        }
        return out;
    }

    /** Every game step (GLOBAL): a sample every STEPS steps. */
    public static step(): void {
        if (!IoReplayRecorder._key) {
            return;
        }
        if (++IoReplayRecorder._steps < IoReplayRecorder.STEPS) {
            return;
        }
        IoReplayRecorder._steps = 0;
        if (IoReplayRecorder._t >= IoReplayRecorder.MAX_SAMPLES) {
            IoReplayRecorder.stop(true);
            return;
        }
        IoReplayRecorder.sample();
        if (IoReplayRecorder._samples.length >= IoReplayRecorder.PART) {
            IoReplayRecorder.send(false);
        }
    }

    /** The attack is over or its yard is going (BASE.Cleanup): what is left is sent, the last part. */
    public static stop(final: boolean = true): void {
        if (!IoReplayRecorder._key) {
            return;
        }
        if (final) {
            IoReplayRecorder.sample();
            // (how it was at the end)
            IoReplayRecorder.send(true);
        }
        IoReplayRecorder._key = null;
    }

    private static uidOf(m: any): int {
        let uid: any = IoReplayRecorder._uids.get(m);
        if (uid == null) {
            uid = IoReplayRecorder._nextUid++;
            IoReplayRecorder._uids.set(m, uid);
            let creature: MonsterBase = as3.as(m, MonsterBase);
            let side: int = creature._friendly ? 1 : 0;
            if (m instanceof ChampionBase) {
                let champion: ChampionBase = as3.cast(m, ChampionBase);
                IoReplayRecorder._defs.push([uid, String(champion._creatureID), side, 1, String(champion._spriteID), champion._graphicMC ? champion._graphicMC.x | 0 : -26, champion._graphicMC ? champion._graphicMC.y | 0 : -36]);
            } else {
                IoReplayRecorder._defs.push([uid, String(creature._creatureID), side, 0, IoReplayRecorder.levelOf(creature)]);
            }
        }
        return uid | 0;
    }

    /** The level a monster was made at: its health is one level's of its table (as the classes work it out). */
    private static levelOf(m: MonsterBase): int {
        let c: any = CREATURELOCKER._creatures[m._creatureID];
        let table: any[] = c && c.props ? as3.as(c.props.health, Array) : null;
        let i: int = table ? table.indexOf(m.maxHealth) : -1;
        return (i >= 0 ? i + 1 : 1) | 0;
    }

    private static monsters(): any[] {
        let out: any[] = [];
        let seen: Dictionary = new Dictionary(true);
        let m: any = null;
        for (m of as3.values(CREEPS._creeps)) {
            if (m && !seen.get(m)) {
                seen.set(m, true);
                out.push(m);
            }
        }
        for (m of as3.values(CREATURES._creatures)) {
            if (m && !seen.get(m)) {
                seen.set(m, true);
                out.push(m);
            }
        }
        for (m of (CREEPS._guardianList ?? [])) {
            if (m && !seen.get(m)) {
                seen.set(m, true);
                out.push(m);
            }
        }
        for (m of (CREATURES._guardianList ?? [])) {
            if (m && !seen.get(m)) {
                seen.set(m, true);
                out.push(m);
            }
        }
        return out;
    }

    private static sample(): void {
        let changed: any[] = [];
        let glowChanges: any[] = [];
        let here: any = {};
        for (let o of as3.values(IoReplayRecorder.monsters())) {
            let m: MonsterBase = as3.as(o, MonsterBase);
            if (!m || !m._tmpPoint || m.health <= 0) {
                continue;
            }
            let uid: int = IoReplayRecorder.uidOf(m);
            here[uid] = true;
            let glows: any[] = IoReplayRecorder.glowsOf(m);
            let glowKey: string = glows.length ? JSON.stringify(glows) : "";
            if ((IoReplayRecorder._glows[uid] || "") != glowKey) {
                IoReplayRecorder._glows[uid] = glowKey;
                glowChanges.push([uid, glows.length ? glows : 0]);
            }
            let x: int = m._tmpPoint.x | 0;
            let y: int = m._tmpPoint.y | 0;
            let hp: int = Math.max(1, Math.round(100 * m.health / Math.max(1, m.maxHealth))) | 0;
            let alt: int = m._altitude;
            let last: any[] = as3.as(IoReplayRecorder._last[uid], Array);
            if (last && last[0] == x && last[1] == y && last[2] == hp && last[3] == alt) {
                continue;
            }
            // (still since an earlier sample: the replay holds it there until the one before this)
            let hold: int = last && (last[5] | 0) < IoReplayRecorder._t - 1 ? 1 : 0;
            changed.push(hold ? [uid, x, y, hp, alt, 1] : (alt ? [uid, x, y, hp, alt] : [uid, x, y, hp]));
            IoReplayRecorder._last[uid] = [x, y, hp, alt, IoReplayRecorder._t, IoReplayRecorder._t];
        }
        for (let id in IoReplayRecorder._last) {
            if (!here[id]) {
                changed.push([Number(id) | 0]);
                delete IoReplayRecorder._last[id];
            }
        }
        let walls: any[] = [];
        for (let b of as3.values(BASE._buildingsAll)) {
            if (!b || b.maxHealth <= 0) {
                continue;
            }
            let bhp: int = (b.health <= 0 ? 0 : Math.max(1, Math.round(100 * b.health / b.maxHealth))) | 0;
            if (IoReplayRecorder._buildings[b._id] !== bhp) {
                if (IoReplayRecorder._buildings[b._id] != null || bhp < 100) {
                    walls.push([b._id, bhp]);
                }
                IoReplayRecorder._buildings[b._id] = bhp;
            }
        }
        let damage: int = BASE._percentDamaged;
        let entry: any[] = [IoReplayRecorder._t, changed, walls];
        let extras: any = null;
        if (IoReplayRecorder._shots.length || glowChanges.length) {
            extras = {};
            if (IoReplayRecorder._shots.length) {
                extras.e = IoReplayRecorder._shots;
                IoReplayRecorder._shots = [];
            }
            if (glowChanges.length) {
                extras.g = glowChanges;
            }
        }
        if (damage != IoReplayRecorder._damage || extras) {
            entry.push(damage != IoReplayRecorder._damage ? damage : null);
            IoReplayRecorder._damage = damage;
        }
        if (extras) {
            entry.push(extras);
        }
        IoReplayRecorder._samples.push(entry);
        ++IoReplayRecorder._t;
    }

    private static send(final: boolean): void {
        let key: string = IoReplayRecorder._key;
        let part: any = { "seq": IoReplayRecorder._seq, "rate": IoReplayRecorder.RATE, "d": IoReplayRecorder._defs, "s": IoReplayRecorder._samples };
        let params: any[] = [["key", key], ["seq", IoReplayRecorder._seq], ["data", JSON.stringify(part)], ["final", final ? 1 : 0], ["duration", (IoReplayRecorder._t / IoReplayRecorder.RATE) | 0], ["damage", IoReplayRecorder._damage < 0 ? 0 : IoReplayRecorder._damage]];
        ++IoReplayRecorder._seq;
        IoReplayRecorder._defs = [];
        IoReplayRecorder._samples = [];
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/chunk", params, (response: any): void => {
        }, (e: IOErrorEvent): void => {
        });
    }
}
