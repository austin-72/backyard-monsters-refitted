import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Dictionary, getTimer } from "flash/utils";
import { BASE, CREATURELOCKER, CREATURES, CREEPS, ChampionBase, GLOBAL, IoDave, LOGGER, MonsterBase, URLLoaderApi } from "@game";

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
 * class, 1: a champion drawn from its sprite: then sprite, x and y offsets), level]; (16 October) a champion drawn
 * by its own class has its look after the level when it wears one ("frozen" or a Shiny skin: IoDave.skin).
 *
 * Inferno-only (QoL #455, 15 October): the parts go one at a time, in order, and a part whose answer didn't come
 * (the connection down) is sent again, sooner and sooner apart (2 s, doubling to 30 s) for up to 25 minutes (the
 * server finishes a recording 30 minutes after it began): a lost part left a gap in the replay, and a lost last
 * part left it "still going on". The server keeps a part sent twice once.
 *
 * Inferno-only (QoL #539, 15 October): a part also goes when it gets big (partLimit: under the server's limit of a
 * part, which each answer gives, limits), so a big attack's parts are not refused; and near the limit of the whole
 * replay (or at MAX_SAMPLES) the recording stops there, its last part saying it was cut short (cut=1): the replay
 * shows "cut short" instead of losing its parts without a word.
 *
 * Inferno-only (QoL #96, 15 October): an attack on a tribe yard is recorded the same way (its load says so too), and
 * so is a wild raid on the player's own yard (WMATTACK.ioRecordRaid: begin(key, true) once the server gave it a key).
 * A raid is fought in build mode, where the yard's damage isn't worked out (BASE._percentDamaged is only at a save,
 * and the raid's saves wait till it is over), so the recorder works it out itself, as the raid's end does (walls and
 * traps aside); its first sample has every building's health (the yard the server has may be a little older than
 * the one on screen); and its last part says what the raid wrecked and took (ioRaidEnd), for its attack log (QoL #92).
 */
export class IoReplayRecorder extends ASObject {
    /** Game steps between samples (80 a second: 4 samples a second). */
    public static readonly STEPS: int = 20;

    public static readonly RATE: int = 4;

    /** Samples per part sent (30 seconds). */
    private static readonly PART: int = 120;

    /**
     * (18 October, the user's) Samples per part while someone watches the attack as it happens (1.5 seconds):
     * the server says so (live: 1, with the attack's load when they are playing, and with each part's answer while
     * they watch: server services/replays/liveAttacks.ts), and parts go this often until it stops saying so.
     */
    private static readonly LIVE_PART: int = 6;

    /** (18 October) Short parts are sent until this time (getTimer); each "live: 1" answer moves it on. */
    private static _liveUntil: number = 0;

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

    /** QoL #539: the size limits (characters of the JSON) of a part and of the whole replay, as the server last said. */
    private static _partMax: int = 600000;

    private static _totalMax: int = 6000000;

    /** QoL #539: about how big the part being gathered is (its samples' and monsters' JSON), and what was sent. */
    private static _pendingBytes: int = 0;

    private static _sentBytes: int = 0;

    /** QoL #539: the recording stopped at its limits (its last part says cut=1). */
    private static _cut: boolean = false;

    /** QoL #455: the parts waiting to go, in order ({key, seq, data, final, duration, damage, cut, at, tries}). */
    private static _queue: any[] = [];

    /** QoL #455: a part is on its way, or waiting to go again (_retryTimer). */
    private static _busy: boolean = false;

    private static _retryTimer: any = null;

    private static _onlineHooked: boolean = false;

    /** QoL #455: a part is sent again for this long (ms) after it was first sent, then given up. */
    private static readonly RETRY_FOR: int = 25 * 60 * 1000;

    /** QoL #96: the recording is of a wild raid on the player's own yard (the damage worked out here). */
    private static _raid: boolean = false;

    /** QoL #92: what the raid wrecked and took ({destroyed, loot: [r1..r4]}), sent with its last part. */
    private static _extra: any = null;

    /** QoL #539: the part being gathered goes at this share of the server's limit of a part ... */
    private static readonly PART_SHARE: number = 0.8;

    /** ... and the recording stops this close to the limit of the whole replay (a tenth of it at most; a sample of a big battle is ~10k). */
    private static readonly TOTAL_MARGIN: int = 150000;

    public $ctor(): void {
        super.$ctor();
    }

    public static get recording(): boolean {
        return IoReplayRecorder._key != null;
    }

    public static get key(): string {
        return IoReplayRecorder._key;
    }

    /** QoL #455: parts still waiting to go (tests: 0 when all of them are on the server). */
    public static get unsent(): int {
        return IoReplayRecorder._queue.length | 0;
    }

    /** QoL #539: the recording being made (or the last) was cut short at its limits. */
    public static get cut(): boolean {
        return IoReplayRecorder._cut;
    }

    /** QoL #539: the part's size at which it goes (characters of its JSON). */
    public static get partLimit(): int {
        return Math.max(20000, IoReplayRecorder._partMax * IoReplayRecorder.PART_SHARE) | 0;
    }

    /** (18 October) The samples a part goes at: short ones while the attack is watched as it happens. */
    public static get partSamples(): int {
        return (getTimer() < IoReplayRecorder._liveUntil ? IoReplayRecorder.LIVE_PART : IoReplayRecorder.PART) | 0;
    }

    /** QoL #96: the recording being made is of a wild raid on the player's own yard. */
    public static get raid(): boolean {
        return IoReplayRecorder._key != null && IoReplayRecorder._raid;
    }

    /** QoL #539/#96: the size limits the server gave ({part, total}, characters of the JSON). */
    public static setLimits(limits: any): void {
        if (limits && Number(limits.part) > 0 && Number(limits.total) > 0) {
            IoReplayRecorder._partMax = Number(limits.part) | 0;
            IoReplayRecorder._totalMax = Number(limits.total) | 0;
        }
    }

    /**
     * The attack's yard is built (BASE): its replay starts. Inferno-only (QoL #96): raid, a wild raid on the
     * player's own yard (WMATTACK.ioRecordRaid).
     */
    public static begin(key: string, raid: boolean = false, live: boolean = false): void {
        IoReplayRecorder.stop(false);
        if (!GLOBAL.INFERNO_ONLY || !key) {
            return;
        }
        // (18 October: the yard's player is playing: short parts from the start, a minute for their game to start watching)
        IoReplayRecorder._liveUntil = live ? getTimer() + 60000 : 0;
        IoReplayRecorder._raid = raid;
        IoReplayRecorder._extra = null;
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
        IoReplayRecorder._pendingBytes = 64;
        IoReplayRecorder._sentBytes = 0;
        IoReplayRecorder._cut = false;
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
            // (QoL #539: the attack goes on, its replay doesn't: it says it was cut short)
            IoReplayRecorder._cut = true;
            IoReplayRecorder.stop(true);
            return;
        }
        IoReplayRecorder.sample();
        // (QoL #539: near the limit of the whole replay it stops there, cut short, its parts all kept)
        if (IoReplayRecorder._sentBytes + IoReplayRecorder._pendingBytes > IoReplayRecorder._totalMax - Math.min(IoReplayRecorder.TOTAL_MARGIN, IoReplayRecorder._totalMax / 10)) {
            IoReplayRecorder._cut = true;
            IoReplayRecorder.send(true);
            IoReplayRecorder._key = null;
            return;
        }
        // (QoL #539: and a part goes when it is big, not only every 30 seconds)
        if (IoReplayRecorder._samples.length >= IoReplayRecorder.partSamples || IoReplayRecorder._pendingBytes >= IoReplayRecorder.partLimit) {
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

    /**
     * QoL #92/#96: a wild raid being recorded is over (WMATTACK.CleanUp): its last part, with what it wrecked and
     * took ({destroyed, loot: [r1..r4]}) for its attack log.
     */
    public static ioRaidEnd(summary: any): void {
        if (!IoReplayRecorder._key || !IoReplayRecorder._raid) {
            return;
        }
        IoReplayRecorder._extra = summary;
        IoReplayRecorder.stop(true);
    }

    /**
     * QoL #96: a raid's key came when the raid was already over (or the yard left): its recording is ended empty
     * at once (the server keeps no empty replay of a raid, and ends its attack log), not 30 minutes later.
     */
    public static ioDrop(key: string): void {
        if (!key) {
            return;
        }
        IoReplayRecorder._queue.push({ "key": key, "seq": 0, "data": "", "final": true, "duration": 0, "damage": 0, "cut": false, "at": getTimer(), "tries": 0 });
        IoReplayRecorder.pump();
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
                let def: any[] = [uid, String(creature._creatureID), side, 0, IoReplayRecorder.levelOf(creature)];
                // (16 October) a champion's look (frozen or a Shiny skin), so the replay wears it too
                let look: string = IoDave.skin(creature._creatureID, creature._friendly);
                if (look) {
                    def.push(look);
                }
                IoReplayRecorder._defs.push(def);
            }
            // (QoL #539: what the part weighs)
            IoReplayRecorder._pendingBytes += (JSON.stringify(IoReplayRecorder._defs[IoReplayRecorder._defs.length - 1]).length + 1) | 0;
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
        // (QoL #96: a raid's damage, worked out here: the buildings' health, walls and traps aside)
        let hpNow: number = 0;
        let hpMax: number = 0;
        for (let b of as3.values(BASE._buildingsAll)) {
            if (!b || b.maxHealth <= 0) {
                continue;
            }
            let bhp: int = (b.health <= 0 ? 0 : Math.max(1, Math.round(100 * b.health / b.maxHealth))) | 0;
            if (IoReplayRecorder._raid && b._class != "wall" && b._class != "trap") {
                hpNow += Math.max(0, Number(b.health));
                hpMax += Number(b.maxHealth);
            }
            if (IoReplayRecorder._buildings[b._id] !== bhp) {
                // (QoL #96: a raid's first sample has them all: the yard the server has may be a little older)
                if (IoReplayRecorder._buildings[b._id] != null || bhp < 100 || IoReplayRecorder._raid) {
                    walls.push([b._id, bhp]);
                }
                IoReplayRecorder._buildings[b._id] = bhp;
            }
        }
        let damage: int = BASE._percentDamaged;
        if (IoReplayRecorder._raid) {
            damage = (hpMax > 0 ? Math.max(0, Math.min(100, Math.round(100 - 100 * hpNow / hpMax))) : 0) | 0;
        }
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
        // (QoL #539: what the part weighs)
        IoReplayRecorder._pendingBytes += (JSON.stringify(entry).length + 1) | 0;
        ++IoReplayRecorder._t;
    }

    private static send(final: boolean): void {
        let key: string = IoReplayRecorder._key;
        let part: any = { "seq": IoReplayRecorder._seq, "rate": IoReplayRecorder.RATE, "d": IoReplayRecorder._defs, "s": IoReplayRecorder._samples };
        let data: string = JSON.stringify(part);
        let item: any = { "key": key, "seq": IoReplayRecorder._seq, "data": data, "final": final, "duration": (IoReplayRecorder._t / IoReplayRecorder.RATE) | 0, "damage": IoReplayRecorder._damage < 0 ? 0 : IoReplayRecorder._damage, "cut": final && IoReplayRecorder._cut, "at": getTimer(), "tries": 0 };
        // (QoL #92: a raid's last part says what it wrecked and took)
        if (final && IoReplayRecorder._extra) {
            item.extra = IoReplayRecorder._extra;
            IoReplayRecorder._extra = null;
        }
        ++IoReplayRecorder._seq;
        IoReplayRecorder._defs = [];
        IoReplayRecorder._samples = [];
        IoReplayRecorder._sentBytes += data.length | 0;
        IoReplayRecorder._pendingBytes = 64;
        // (QoL #455: in order, one at a time, again until it is in: IoReplayRecorder.pump)
        IoReplayRecorder._queue.push(item);
        IoReplayRecorder.pump();
    }

    /** QoL #455: sends the first part waiting, if none is on its way. */
    private static pump(): void {
        if (IoReplayRecorder._busy || !IoReplayRecorder._queue.length) {
            return;
        }
        let item: any = IoReplayRecorder._queue[0];
        IoReplayRecorder._busy = true;
        // (18 October, the user's: the part sent gzipped, a fifth to a tenth of its size, where the browser can)
        if (!item.packed) {
            IoReplayRecorder.pack(item, (): void => {
                IoReplayRecorder._busy = false;
                IoReplayRecorder.pump();
            });
            return;
        }
        let params: any[] = [["key", item.key], ["seq", item.seq], ["data", item.data], ["final", item.final ? 1 : 0], ["duration", item.duration], ["damage", item.damage]];
        if (item.z) {
            params.push(["z", 1]);
        }
        if (item.cut) {
            params.push(["cut", 1]);
        }
        if (item.extra) {
            params.push(["destroyed", item.extra.destroyed | 0]);
            params.push(["loot", JSON.stringify(item.extra.loot || [])]);
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/chunk", params, (response: any): void => {
            IoReplayRecorder._busy = false;
            if (response && (response.error === 0 || response.error === "0")) {
                IoReplayRecorder.answered(item, response);
                return;
            }
            let said: string = response && response.error ? String(response.error) : "";
            // (the server's own trouble, or too many at once: again later; anything else (not this player's,
            // replays off) won't be better later)
            if (!response || response.again || said.indexOf("Too many") == 0) {
                IoReplayRecorder.again(item, said || "no answer");
                return;
            }
            LOGGER.Log("log", "Replay " + item.key + ": part " + item.seq + " not kept: " + said);
            IoReplayRecorder.next(item);
        }, (e: IOErrorEvent): void => {
            IoReplayRecorder._busy = false;
            IoReplayRecorder.again(item, "no answer");
        });
    }

    /** Bytes of the parts as sent (gzipped where the browser can), for tests. */
    public static sentPacked: number = 0;

    public static sentPlain: number = 0;

    /**
     * (18 October, the user's) A part's data gzipped (CompressionStream) and sent as base64 (z=1: the server unpacks
     * it, services/replays: replayChunk): its samples repeat a lot, so it is a fraction of its size. As it is, where
     * the browser can't, or when it's tiny or doesn't get smaller.
     */
    private static pack(item: any, done: Function): void {
        item.packed = true;
        let G: any = globalThis as any;
        let data: string = String(item.data);
        IoReplayRecorder.sentPlain += data.length;
        if (typeof G.CompressionStream != "function" || data.length < 600) {
            IoReplayRecorder.sentPacked += data.length;
            done();
            return;
        }
        try {
            let stream: any = new G.Blob([data]).stream().pipeThrough(new G.CompressionStream("gzip"));
            new G.Response(stream).arrayBuffer().then((buf: any): void => {
                let bytes: any = new G.Uint8Array(buf);
                let bin: string = "";
                for (let i: int = 0; i < bytes.length; i += 8192) {
                    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
                }
                let b64: string = G.btoa(bin);
                if (b64.length < data.length) {
                    item.data = b64;
                    item.z = true;
                }
                IoReplayRecorder.sentPacked += String(item.data).length;
                done();
            }, (): void => {
                IoReplayRecorder.sentPacked += data.length;
                done();
            });
        } catch (e) {
            IoReplayRecorder.sentPacked += data.length;
            done();
        }
    }

    /** (18 October) Someone watches this attack (the Watch menu, attackwatch/status's recWatched): short parts, and now. */
    public static watched(): void {
        if (!IoReplayRecorder.recording) {
            return;
        }
        IoReplayRecorder._liveUntil = getTimer() + 20000;
    }

    /** QoL #455/#539: a part is in: the server's limits noted (and whether it cut the replay short), the next one goes. */
    private static answered(item: any, response: any): void {
        IoReplayRecorder.setLimits(response.limits);
        // (18 October: the yard's player is watching: short parts for a while longer)
        if (response.live && item.key == IoReplayRecorder._key) {
            IoReplayRecorder._liveUntil = getTimer() + 20000;
        }
        if (response.cut && item.key == IoReplayRecorder._key) {
            // (over the server's limits: the rest wouldn't be kept, so it stops here)
            IoReplayRecorder._cut = true;
            IoReplayRecorder.next(item);
            IoReplayRecorder.stop(true);
            return;
        }
        IoReplayRecorder.next(item);
    }

    private static next(item: any): void {
        if (IoReplayRecorder._queue.length && IoReplayRecorder._queue[0] == item) {
            IoReplayRecorder._queue.shift();
        }
        IoReplayRecorder.pump();
    }

    /** QoL #455: no answer: the same part again a little later (sooner when the browser says it is back online). */
    private static again(item: any, why: string): void {
        item.tries = (item.tries + 1) | 0;
        if (getTimer() - Number(item.at) > IoReplayRecorder.RETRY_FOR) {
            LOGGER.Log("log", "Replay " + item.key + ": part " + item.seq + " given up after " + item.tries + " tries (" + why + ")");
            IoReplayRecorder.next(item);
            return;
        }
        IoReplayRecorder._busy = true;
        let wait: int = Math.min(30000, 2000 * Math.pow(2, Math.min(4, item.tries - 1))) | 0;
        IoReplayRecorder.hookOnline();
        IoReplayRecorder._retryTimer = setTimeout((): void => {
            IoReplayRecorder.retryNow();
        }, wait);
    }

    private static retryNow(): void {
        if (IoReplayRecorder._retryTimer != null) {
            clearTimeout(IoReplayRecorder._retryTimer);
            IoReplayRecorder._retryTimer = null;
        }
        IoReplayRecorder._busy = false;
        IoReplayRecorder.pump();
    }

    private static hookOnline(): void {
        if (IoReplayRecorder._onlineHooked || typeof window == "undefined") {
            return;
        }
        IoReplayRecorder._onlineHooked = true;
        try {
            window.addEventListener("online", (): void => {
                if (IoReplayRecorder._retryTimer != null) {
                    IoReplayRecorder.retryNow();
                }
            });
        } catch (e) {
        }
    }
}
