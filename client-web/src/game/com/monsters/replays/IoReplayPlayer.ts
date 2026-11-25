import * as as3 from "as3";
import { ASObject, Class, Vector, int, uint } from "as3";
import { MovieClip, Shape, Sprite, Stage } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Dictionary, getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BTOWER, CHAMPIONCAGE, CREEPS, FIREBALLS, GRID, InstanceManager, PROJECTILES, Targeting, IoAttackLogs, IoLiveWatch, IoWatch, URLLoaderApi, BYMChat, BYMConfig, CREATURELOCKER, CreepBase, Decoy, EnumYardType, Expo, GLOBAL, IoDave, IoFormat, IoKit, IoQuests, IoReplays, IoReplaySprite, Jars, KEYS, LOGGER, MAP, MonsterBase, ResourceBomb, ResourceBombs, SOUNDS, SpriteData, SPRITES, SpriteSheetAnimation, TweenLite, UI2, UI_BOTTOM } from "@game";

/**
 * Inferno-only: plays an attack replay (IoReplayRecorder's recording) over the yard as it was when the attack
 * began (loaded in view mode with the replay's key: IoReplays.Watch).
 *
 * The monsters are made again as puppets of their own classes (MonsterBase.ioPuppet: their own art, facing,
 * walk and health bar), never ticked: each frame they are put where the recording says, between its samples
 * (four a second). A champion of the cage is drawn from its sprite (IoReplaySprite). The buildings take the
 * health the recording gives them, wrecked at 0. Nothing is fought or saved: it is a picture of what happened.
 *
 * A bar at the top: who attacked whom and when, the time and the damage so far, Pause / Play, the speed (1/4x to
 * 4x), Restart, Share (Global or Alliance chat), Download, and Close (home).
 *
 * Inferno-only (15 October):
 * - QoL #94: under the buttons, a seek bar: click or drag to go to a time. The damage so far is drawn along it (the
 *   curve) and the catapult's shots are marked on it (the yellow marks). Everything a time shows comes from the
 *   recording, so a seek goes straight there (seekTo): the buildings as they began with every change up to then,
 *   the monsters made again where they were, the shots' pictures gone (a Candy Jar still working is put back).
 * - QoL #97: Keep (★): the replay stays on the server however old (IoReplays.Favourite), 10 at most.
 * - QoL #98: Share > Copy link: the game's page that opens straight into this replay (?replay=KEY), and the replay
 *   shared in chat says who attacked whom and the damage. While no replay plays, step() looks for such a link.
 * - QoL #539: a replay cut short at the size limits says so in its title.
 *
 * Inferno-only (19 October, the user's: "simulate tower attacks and monster attack animations ... it's ok if it's not
 * correct since it's just a simulation"): a recording has where everything was and how hurt, not who hit whom, so the
 * fighting is made up from that, a picture only (nothing is hurt by it: the health shown is still the recording's).
 * - The yard's towers take their own steps (simTowers) as the replay plays (at its speed), finding the attacking
 *   puppets as they would monsters (the puppets keep their place in Targeting's cells): they turn, fire, and their
 *   shots fly with their sounds; the shots do nothing (MonsterBase._ioPuppetOnly). A champion of the cage (a
 *   picture: IoReplaySprite) has a stand-in for the towers to aim at (makeStandIn), never drawn.
 * - A monster or champion standing still beside a building that was hurt in the last second and a half, or beside a
 *   monster of the other side that was, fights it (fightOf): it faces it and its attack plays.
 */
export class IoReplayPlayer extends ASObject {
    public static readonly SPEEDS: any[] = [0.25, 0.5, 1, 2, 4];

    private static readonly SPEED_LABELS: any[] = ["¼x", "½x", "1x", "2x", "4x"];

    /** The replay waiting for its yard to load (IoReplays.Watch). */
    private static _pending: any = null;

    private static _on: boolean = false;

    private static _replay: any = null;

    private static _rate: number = 4;

    private static _total: int = 0;

    private static _t: number = 0;

    private static _speed: number = 1;

    private static _paused: boolean = false;

    /** uid -> { def, keys: [[t, x, y, hp, alt, hold]], end, cur, actor, x, y } */
    private static _tracks: any = {};

    private static _buildingEvents: any[] = [];

    private static _buildingCursor: int = 0;

    private static _damageEvents: any[] = [];

    private static _damage: int = 0;

    /** The catapult's shots: [t, shot] (IoReplayRecorder.shot), and the next to throw. */
    private static _shots: any[] = [];

    private static _shotCursor: int = 0;

    /** The shots' pictures on the field now: {kind, ...}. */
    private static _effects: any[] = [];

    private static _effectTicks: int = 0;

    /** building id -> [health, destroyed] when the replay began (for Restart). */
    private static _initial: any = {};

    private static _hud: Sprite = null;

    private static _title: TextField = null;

    private static _clock: TextField = null;

    private static _playButton: Sprite = null;

    private static _speedButtons: any[] = [];

    private static _shareMenu: Sprite = null;

    private static _hudTicks: int = 0;

    /** QoL #94: the seek bar's size (under the buttons), the bar and its head, and the drag. */
    private static readonly SEEK_W: int = 640;

    private static readonly SEEK_H: int = 18;

    private static _seek: Sprite = null;

    private static _seekHead: Shape = null;

    private static _seekStage: Stage = null;

    private static _seekDrag: boolean = false;

    /** QoL #94: when the drag last moved the replay (getTimer): a few times a second, not every mouse move. */
    private static _seekAt: number = -1000;

    /** QoL #94: a seek is putting the yard as it was: no hits heard. */
    private static _seeking: boolean = false;

    /** QoL #97: the player's ★ on this replay, and its button. */
    private static _fav: boolean = false;

    private static _favButton: Sprite = null;

    /**
     * (18 October, the user's) An attack on the player's own yard shown as it happens (IoLiveWatch): the recording so
     * far, then each new part as it comes (asked every LIVE_ASK_MS: replays/live), played a little behind the newest.
     * Its bar has the Map Room only (the yard can't be played until it's over); then "Return home".
     */
    private static _live: boolean = false;

    private static _liveKey: string = null;

    /** The last part had (its seq), the monsters had, and the attack's end has come (done) and been shown. */
    private static _liveSeq: int = -1;

    private static _liveDefs: int = 0;

    private static _liveDone: boolean = false;

    private static _liveShownEnd: boolean = false;

    private static _liveBusy: boolean = false;

    private static _liveAskedAt: number = -100000;

    private static _liveHome: Sprite = null;

    private static _liveMap: Sprite = null;

    /** (18 October) Someone else's attack, from the Watch menu (IoWatch): its bar has Stop watching (and Next). */
    private static _spectator: boolean = false;

    private static _liveNext: Sprite = null;

    private static readonly LIVE_ASK_MS: int = 1000;

    /** Seconds behind the newest sample it is shown at (the parts come every 1.5 s while watched, asked every second). */
    private static readonly LIVE_BEHIND: number = 2.5;

    /** (19 October) building id -> the replay time it was last hurt (fightOf). */
    private static _hurtAt: any = {};

    /** (19 October) The yard's towers' steps owed (the replay's speed: simTowers). */
    private static _towerCarry: number = 0;

    /** (19 October) Towers whose step failed in a replay: left alone after that. */
    private static _towerBroken: Dictionary = new Dictionary(true);

    /** (19 October) Replay time a fight lasts after the hurt it is made up from (1.5 seconds). */
    private static readonly FIGHT_FOR: number = 1.5;

    public $ctor(): void {
        super.$ctor();
    }

    /** (18 October) The key of the attack being watched live, or null. */
    public static get liveKey(): string {
        return IoReplayPlayer._on && IoReplayPlayer._live ? IoReplayPlayer._liveKey : null;
    }

    /** (18 October) Where the yard watched live is on the map ({x, y}), or null. */
    public static get liveWhere(): any {
        let meta: any = IoReplayPlayer._on && IoReplayPlayer._live && IoReplayPlayer._replay ? IoReplayPlayer._replay.meta : null;
        return meta && meta.x != null && meta.y != null ? { "x": Number(meta.x), "y": Number(meta.y) } : null;
    }

    public static get live(): boolean {
        return IoReplayPlayer._on && IoReplayPlayer._live;
    }

    /** (18 October) The attack watched live is someone else's (the Watch menu). */
    public static get spectator(): boolean {
        return IoReplayPlayer._on && IoReplayPlayer._live && IoReplayPlayer._spectator;
    }

    /** (18 October) The live attack's end has come and is shown. */
    public static get liveOver(): boolean {
        return IoReplayPlayer._on && IoReplayPlayer._live && IoReplayPlayer._liveShownEnd;
    }

    public static get playing(): boolean {
        return IoReplayPlayer._on;
    }

    public static get time(): number {
        return IoReplayPlayer._t;
    }

    public static get total(): int {
        return IoReplayPlayer._total;
    }

    public static get speed(): number {
        return IoReplayPlayer._speed;
    }

    /** The recording's samples a game step at 1x (the time runs speed x rate / 80 a game step). */
    public static get rate(): number {
        return IoReplayPlayer._rate;
    }

    public static get paused(): boolean {
        return IoReplayPlayer._paused;
    }

    /** The puppets on the field now (tests). */
    public static get actors(): any[] {
        let out: any[] = [];
        for (let track of as3.values(IoReplayPlayer._tracks)) {
            if (track.actor) {
                out.push(track);
            }
        }
        return out;
    }

    /** A replay to play once its yard has loaded. */
    public static prepare(replay: any): void {
        IoReplayPlayer._pending = replay;
    }

    /** The yard has loaded (BASE): its replay plays, if it is the one waiting. */
    public static Setup(view: any): void {
        IoReplayPlayer.Clear();
        if (!GLOBAL.INFERNO_ONLY || !view || !IoReplayPlayer._pending) {
            return;
        }
        let replay: any = IoReplayPlayer._pending;
        IoReplayPlayer._pending = null;
        if (replay.meta && String(replay.meta.key) != String(view.key)) {
            return;
        }
        IoReplayPlayer.start(replay);
    }

    private static start(replay: any): void {
        IoReplayPlayer._replay = replay;
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.once("replay");
            // (QoL #624: the battle's music; it played the yard's build music)
            SOUNDS.PlayMusic("musiciattack");
        }
        IoReplayPlayer._rate = Number(Number(replay.rate) || 4);
        IoReplayPlayer._tracks = {};
        IoReplayPlayer._buildingEvents = [];
        IoReplayPlayer._damageEvents = [];
        // (18 October, SUSPECTED-BUGS.md: kept from the replay before, so a shorter one played on into empty time)
        IoReplayPlayer._total = 0;
        IoReplayPlayer._shots = [];
        IoReplayPlayer._shotCursor = 0;
        IoReplayPlayer.clearEffects();
        ResourceBombs.ioLoadArt();
        SPRITES.SetupSprite(Decoy.DECOY_WAVE);
        SPRITES.SetupSprite(Decoy.DECOY_EXPLOSION);
        SPRITES.SetupSprite(Jars.JAR_GRAPHIC);
        IoReplayPlayer.ingest(as3.as(replay.defs, Array) || [], as3.as(replay.samples, Array) || []);
        IoReplayPlayer._initial = {};
        for (let building of as3.values(BASE._buildingsAll)) {
            if (building) {
                IoReplayPlayer._initial[building._id] = [building.health, building._destroyed];
            }
        }
        IoReplayPlayer._t = 0;
        IoReplayPlayer._speed = 1;
        IoReplayPlayer._paused = false;
        IoReplayPlayer._buildingCursor = 0;
        IoReplayPlayer._damage = 0;
        IoReplayPlayer._fav = Boolean(replay.fav);
        IoReplayPlayer._seekDrag = false;
        IoReplayPlayer._hurtAt = {};
        IoReplayPlayer._towerCarry = 0;
        IoReplayPlayer._live = Boolean(replay.live);
        if (IoReplayPlayer._live) {
            // (18 October: shown a little behind the newest sample; the shots from before then are not thrown again)
            IoReplayPlayer._liveKey = String(replay.meta && replay.meta.key ? replay.meta.key : "");
            IoReplayPlayer._liveSeq = replay.liveSeq | 0;
            IoReplayPlayer._liveDefs = (as3.as(replay.defs, Array) || []).length | 0;
            IoReplayPlayer._liveDone = Boolean(replay.liveDone);
            IoReplayPlayer._liveShownEnd = false;
            IoReplayPlayer._spectator = Boolean(replay.spectator);
            IoReplayPlayer._liveBusy = false;
            IoReplayPlayer._liveAskedAt = getTimer();
            IoReplayPlayer._t = Math.max(0, IoReplayPlayer._total - IoReplayPlayer.LIVE_BEHIND * IoReplayPlayer._rate);
            while (IoReplayPlayer._shotCursor < IoReplayPlayer._shots.length && IoReplayPlayer._shots[IoReplayPlayer._shotCursor][0] < IoReplayPlayer._t) {
                IoReplayPlayer._shotCursor++;
            }
        }
        IoReplayPlayer._on = true;
        // (the visitor's panel, Open Map / Attack, goes: the bar's Close goes home; an attack from a replay
        // would be an attack on the yard as it is now)
        if (UI2._visitor) {
            UI2._visitor.visible = false;
        }
        IoReplayPlayer.buildHud();
    }

    /**
     * The recording's monsters and samples, added to what is there: all of it when a replay starts, and (18 October)
     * each new part as an attack watched live goes on (liveAnswer). The tracks, building changes, damage and shots
     * come in time order, after what was there.
     */
    private static ingest(defs: any[], samples: any[]): void {
        let def: any[] = null;
        for (def of as3.values(defs)) {
            if (def && def.length >= 4) {
                if (IoReplayPlayer._tracks[def[0] | 0]) {
                    continue;
                }
                IoReplayPlayer._tracks[def[0] | 0] = { "def": def, "keys": [], "end": int.MAX_VALUE, "cur": 0, "actor": null, "glows": [], "glowKey": "" };
            }
        }
        for (let sample of as3.values(samples)) {
            let t: int = sample[0] | 0;
            for (let m of as3.values(as3.as(sample[1], Array) || [])) {
                let track: any = IoReplayPlayer._tracks[m[0] | 0];
                if (!track) {
                    continue;
                }
                if (m.length == 1) {
                    track.end = t;
                } else {
                    track.keys.push([t, Number(m[1]), Number(m[2]), Number(m[3]), m.length > 4 ? Number(m[4]) : 0, m.length > 5 ? m[5] | 0 : 0]);
                }
            }
            for (let b of as3.values(as3.as(sample[2], Array) || [])) {
                IoReplayPlayer._buildingEvents.push([t, b[0] | 0, b[1] | 0]);
            }
            if (sample.length > 3 && sample[3] != null) {
                IoReplayPlayer._damageEvents.push([t, sample[3] | 0]);
            }
            let extras: any = sample.length > 4 ? sample[4] : null;
            if (extras) {
                for (let shot of as3.values(as3.as(extras.e, Array) || [])) {
                    IoReplayPlayer._shots.push([t, shot]);
                }
                for (let g of as3.values(as3.as(extras.g, Array) || [])) {
                    let glowing: any = IoReplayPlayer._tracks[g[0] | 0];
                    if (glowing) {
                        glowing.glows.push([t, as3.is(g[1], Array) ? g[1] : null]);
                    }
                }
            }
            IoReplayPlayer._total = Math.max(IoReplayPlayer._total, t + 1) | 0;
        }
    }

    /** Back to the start: the buildings as they were, the monsters gone. */
    public static restart(): void {
        if (!IoReplayPlayer._replay) {
            return;
        }
        for (let id in IoReplayPlayer._initial) {
            let b: BFOUNDATION = as3.as(BASE._buildingsAll["b" + id], BFOUNDATION);
            if (b) {
                b.setHealth(Number(IoReplayPlayer._initial[id][0]));
                b._destroyed = Boolean(IoReplayPlayer._initial[id][1]);
                b.Update(true);
            }
        }
        for (let track of as3.values(IoReplayPlayer._tracks)) {
            IoReplayPlayer.dropActor(track);
            track.cur = 0;
        }
        IoReplayPlayer.clearEffects();
        IoReplayPlayer.resetTowers();
        IoReplayPlayer._shotCursor = 0;
        IoReplayPlayer._t = 0;
        IoReplayPlayer._buildingCursor = 0;
        IoReplayPlayer._damage = 0;
        IoReplayPlayer._paused = false;
        IoReplayPlayer.updateHud();
    }

    public static setSpeed(speed: number): void {
        IoReplayPlayer._speed = speed;
        IoReplayPlayer.updateHud();
    }

    public static togglePause(): void {
        if (IoReplayPlayer._paused && IoReplayPlayer._t >= IoReplayPlayer._total) {
            IoReplayPlayer.restart();
            return;
        }
        IoReplayPlayer._paused = !IoReplayPlayer._paused;
        IoReplayPlayer.updateHud();
    }

    /** Every game step (GLOBAL, 80 a second). */
    public static step(): void {
        if (!IoReplayPlayer._on) {
            // (QoL #98: a ?replay=KEY link opens its replay once the player's yard is up)
            IoReplays.ioLinkStep();
            return;
        }
        if (UI2._visitor && UI2._visitor.visible) {
            UI2._visitor.visible = false;
        }
        // (18 October: nothing of the yard while it is watched live: the quests' panel, with its Collect, goes too)
        if (IoReplayPlayer._live && UI_BOTTOM._missions && UI_BOTTOM._missions.visible) {
            UI_BOTTOM._missions.visible = false;
        }
        // (18 October: an attack watched live: its own clock, and the next parts asked for)
        if (IoReplayPlayer._live) {
            IoReplayPlayer.liveStep();
        } else if (!IoReplayPlayer._paused && !IoReplayPlayer._seekDrag) {
            IoReplayPlayer._t += IoReplayPlayer._speed * IoReplayPlayer._rate / 80;
            if (IoReplayPlayer._t >= IoReplayPlayer._total) {
                IoReplayPlayer._t = IoReplayPlayer._total;
                IoReplayPlayer._paused = true;
                IoReplayPlayer.updateHud();
            }
        }
        while (IoReplayPlayer._buildingCursor < IoReplayPlayer._buildingEvents.length && IoReplayPlayer._buildingEvents[IoReplayPlayer._buildingCursor][0] <= IoReplayPlayer._t) {
            let e: any[] = as3.cast(IoReplayPlayer._buildingEvents[IoReplayPlayer._buildingCursor++], Array);
            IoReplayPlayer.setBuilding(e[1] | 0, e[2] | 0);
        }
        for (let d of as3.values(IoReplayPlayer._damageEvents)) {
            if (d[0] <= IoReplayPlayer._t) {
                IoReplayPlayer._damage = d[1] | 0;
            }
        }
        while (IoReplayPlayer._shotCursor < IoReplayPlayer._shots.length && IoReplayPlayer._shots[IoReplayPlayer._shotCursor][0] <= IoReplayPlayer._t) {
            IoReplayPlayer.throwShot(as3.as(IoReplayPlayer._shots[IoReplayPlayer._shotCursor++][1], Array));
        }
        IoReplayPlayer.tickEffects();
        IoReplayPlayer.simTowers();
        if (GLOBAL._render) {
            IoReplayPlayer.drawActors();
            if (++IoReplayPlayer._hudTicks >= 10) {
                IoReplayPlayer._hudTicks = 0;
                IoReplayPlayer.updateHud();
            }
        }
    }

    /** QoL #624: when the last hit was heard (getTimer). */
    private static _ioHitAt: number = -1000;

    private static setBuilding(id: int, hp: int): void {
        let b: BFOUNDATION = as3.as(BASE._buildingsAll["b" + id], BFOUNDATION);
        if (!b) {
            return;
        }
        // (Inferno-only, QoL #624: the hits and the wrecks are heard, a few at a time; a replay was almost silent)
        if (GLOBAL.INFERNO_ONLY && !IoReplayPlayer._paused && !IoReplayPlayer._seeking && getTimer() - IoReplayPlayer._ioHitAt > 180) {
            let before: number = b.maxHealth > 0 ? 100 * b.health / b.maxHealth : 0;
            if (hp <= 0 && !b._destroyed) {
                IoReplayPlayer._ioHitAt = getTimer();
                SOUNDS.Play("destroy" + ((1 + Math.random() * 4) | 0), 0.5);
            } else if (hp > 0 && hp < before - 0.5) {
                IoReplayPlayer._ioHitAt = getTimer();
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.3);
            }
        }
        // (19 October: when it was hurt, for the fights made up (fightOf))
        if (GLOBAL.INFERNO_ONLY && !IoReplayPlayer._seeking && b.maxHealth > 0 && hp < 100 * b.health / b.maxHealth - 0.5) {
            IoReplayPlayer._hurtAt[id] = IoReplayPlayer._t;
        }
        if (hp <= 0) {
            b.setHealth(0);
            b._destroyed = true;
        } else {
            b.setHealth(Math.max(1, b.maxHealth * hp / 100));
            b._destroyed = false;
        }
        b.Update(true);
    }

    private static drawActors(): void {
        for (let track of as3.values(IoReplayPlayer._tracks)) {
            let keys: any[] = as3.cast(track.keys, Array);
            if (!keys.length || IoReplayPlayer._t < keys[0][0] || IoReplayPlayer._t >= track.end) {
                IoReplayPlayer.dropActor(track);
                continue;
            }
            while (track.cur + 1 < keys.length && keys[track.cur + 1][0] <= IoReplayPlayer._t) {
                track.cur++;
                // (19 October: when it was hurt, for the fights made up (fightOf))
                if (keys[track.cur][3] < keys[track.cur - 1][3]) {
                    track.hurtAt = keys[track.cur][0];
                }
            }
            let a: any[] = as3.cast(keys[track.cur], Array);
            let x: number = Number(a[1]);
            let y: number = Number(a[2]);
            let hp: number = Number(a[3]);
            let alt: number = Number(a[4]);
            if (track.cur + 1 < keys.length) {
                let b: any[] = as3.cast(keys[track.cur + 1], Array);
                let from: number = Number(b[5] ? Math.max(Number(a[0]), b[0] - 1) : a[0]);
                if (IoReplayPlayer._t > from) {
                    let f: number = Math.min(1, (IoReplayPlayer._t - from) / Math.max(0.001, b[0] - from));
                    x = Number(a[1] + (b[1] - a[1]) * f);
                    y = Number(a[2] + (b[2] - a[2]) * f);
                    alt = Number(a[4] + (b[4] - a[4]) * f);
                }
            }
            if (!track.actor) {
                track.actor = IoReplayPlayer.makeActor(as3.cast(track.def, Array), x, y);
                if (!track.actor) {
                    continue;
                }
                track.x = x;
                track.y = y;
                track.still = 0;
                track.fight = null;
                track.fightCheck = 0;
                if (GLOBAL.INFERNO_ONLY && track.actor instanceof IoReplaySprite) {
                    track.standIn = IoReplayPlayer.makeStandIn(as3.cast(track.def, Array), x, y, alt);
                }
            }
            IoReplayPlayer.applyGlow(track);
            let walking: boolean = !IoReplayPlayer._paused && (Math.abs(x - track.x) > 0.02 || Math.abs(y - track.y) > 0.02);
            track.x = x;
            track.y = y;
            // (19 October: standing still beside something hurt just now: fighting it, as far as the replay can tell)
            let fight: Point = null;
            if (GLOBAL.INFERNO_ONLY) {
                track.still = (walking ? 0 : (track.still | 0) + 1) | 0;
                if (!walking && track.still >= 3 && !IoReplayPlayer._paused) {
                    if (--track.fightCheck <= 0) {
                        track.fight = IoReplayPlayer.fightOf(track, x, y);
                        track.fightCheck = 6;
                    }
                    fight = as3.as(track.fight, Point);
                } else if (walking) {
                    track.fight = null;
                    track.fightCheck = 0;
                }
                if (track.standIn) {
                    IoReplayPlayer.placeStandIn(as3.cast(track.standIn, MonsterBase), x, y, hp, alt);
                }
            }
            if (track.actor instanceof MonsterBase) {
                as3.cast(track.actor, MonsterBase).ioPuppet(x, y, hp / 100, alt, walking, fight != null, fight ? fight.x : NaN, fight ? fight.y : NaN);
            } else {
                as3.cast(track.actor, IoReplaySprite).show(x, y, alt, walking, fight != null, fight ? fight.x : NaN, fight ? fight.y : NaN);
            }
        }
    }

    /** The glows a monster had at this time of the replay (its recorded GlowFilters), put on its puppet. */
    private static applyGlow(track: any): void {
        let list: any[] = null;
        for (let g of as3.values(as3.as(track.glows, Array))) {
            if (g[0] > IoReplayPlayer._t) {
                break;
            }
            list = as3.as(g[1], Array);
        }
        let key: string = list ? JSON.stringify(list) : "";
        if (key == track.glowKey && track.glowActor == track.actor) {
            return;
        }
        track.glowKey = key;
        track.glowActor = track.actor;
        let filters: any[] = [];
        for (let f of as3.values(list || [])) {
            filters.push(new GlowFilter(f[0] >>> 0, Number(f[1]) / 100, Number(f[2]), Number(f[2]), Number(f[3]), 1));
        }
        if (track.actor instanceof MonsterBase) {
            as3.cast(track.actor, MonsterBase).ioPuppetGlow(filters);
        } else if (track.actor instanceof IoReplaySprite) {
            as3.cast(track.actor, IoReplaySprite).glow(filters);
        }
    }

    // ---- the catapult's shots: their pictures only (the yard's and the monsters' health are recorded)
    private static throwShot(shot: any[], at: number = -1): void {
        if (!shot || !GLOBAL._render || !MAP._BUILDINGTOPS) {
            return;
        }
        try {
            let x: number = Number(shot[1]);
            let y: number = Number(shot[2]);
            let radius: int = shot[3] | 0;
            if (shot[0] == "b") {
                let group: int = shot[6] | 0;
                let bomb: ResourceBomb = new ResourceBomb(MAP._BUILDINGBASES, new Point(x, y), { "radius": radius, "particles": Math.max(1, shot[4] | 0), "resource": shot[5] | 0, "group": group, "damage": 0, "kind": group == 2 ? "sulfur" : null }, 2);
                bomb.ioPicture = true;
                SOUNDS.Play(group == 0 ? "twigbomb" : (group == 1 ? "pebblebomb" : "puttybomb"));
                IoReplayPlayer._effects.push({ "kind": "b", "bomb": bomb });
            } else if (shot[0] == "j") {
                let towers: Vector<BFOUNDATION> = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
                BASE.GetBuildingOverlap(x, y, radius, towers);
                let jarred: any[] = [];
                for (let b of (towers ?? [])) {
                    if (b instanceof BTOWER && b.health > 0) {
                        as3.cast(b, BTOWER).ApplyJar(0);
                        jarred.push(b);
                    }
                }
                // (QoL #94: a jar put back by a seek lasts from when it was thrown: at)
                IoReplayPlayer._effects.push({ "kind": "j", "towers": jarred, "end": (at >= 0 ? at : IoReplayPlayer._t) + Math.max(1, Number(Number(shot[4]) || 10)) * IoReplayPlayer._rate });
            } else if (shot[0] == "d") {
                let box: Sprite = new Sprite();
                box.x = x;
                box.y = y;
                let wave: SpriteSheetAnimation = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Decoy.DECOY_WAVE), SpriteData), 45);
                wave.render();
                wave.x = -wave.width * 0.5;
                wave.y = -wave.height * 0.5;
                wave.doesRepeat = true;
                wave.play();
                box.addChild(wave);
                MAP._BUILDINGTOPS.addChild(box);
                TweenLite.from(box, 0.6, { "y": y - 300, "ease": Expo.easeIn });
                SOUNDS.Play(Decoy.LAND_SOUND);
                IoReplayPlayer._effects.push({ "kind": "d", "box": box, "anim": wave, "end": IoReplayPlayer._t + Math.max(1, Number(Number(shot[4]) || 10)) * IoReplayPlayer._rate, "boom": false });
            }
        } catch (e) {
            LOGGER.Log("log", "Replay: a catapult shot not shown: " + e.message);
        }
    }

    private static tickEffects(): void {
        if (!IoReplayPlayer._effects.length) {
            return;
        }
        let animate: boolean = ++IoReplayPlayer._effectTicks % 2 == 0;
        for (let i: int = (IoReplayPlayer._effects.length - 1) | 0; i >= 0; i--) {
            let fx: any = IoReplayPlayer._effects[i];
            if (fx.kind == "b") {
                if (!fx.done && as3.cast(fx.bomb, ResourceBomb).Tick()) {
                    as3.cast(fx.bomb, ResourceBomb).Freeze();
                    // (what it left on the ground stays, as in the attack)
                    fx.done = true;
                }
            } else if (fx.kind == "j") {
                if (IoReplayPlayer._t >= fx.end && !fx.done) {
                    for (let t of as3.values(fx.towers)) {
                        t.KillJar();
                    }
                    fx.done = true;
                    IoReplayPlayer._effects.splice(i, 1);
                }
            } else if (fx.kind == "d") {
                if (animate) {
                    as3.cast(fx.anim, SpriteSheetAnimation).update();
                }
                if (!fx.boom && IoReplayPlayer._t >= fx.end) {
                    // the explosion, then gone
                    fx.boom = true;
                    let box: Sprite = as3.as(fx.box, Sprite);
                    if (fx.anim.parent) {
                        fx.anim.parent.removeChild(fx.anim);
                    }
                    let boom: SpriteSheetAnimation = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Decoy.DECOY_EXPLOSION), SpriteData), 33);
                    boom.render();
                    boom.x = -boom.width * 0.5;
                    boom.y = -boom.height * 0.5;
                    boom.play();
                    box.addChild(boom);
                    fx.anim = boom;
                    SOUNDS.Play(Decoy.EXPLOSION_SOUND);
                } else if (fx.boom && fx.anim.currentFrame >= fx.anim.totalFrames) {
                    if (fx.box.parent) {
                        fx.box.parent.removeChild(fx.box);
                    }
                    IoReplayPlayer._effects.splice(i, 1);
                }
            }
        }
    }

    /** Every shot's picture gone (the start again, or the yard left). */
    private static clearEffects(): void {
        for (let fx of as3.values(IoReplayPlayer._effects)) {
            try {
                if (fx.kind == "b") {
                    as3.cast(fx.bomb, ResourceBomb).ioRemove();
                } else if (fx.kind == "j" && !fx.done) {
                    for (let t of as3.values(fx.towers)) {
                        t.KillJar();
                    }
                } else if (fx.kind == "d" && fx.box.parent) {
                    fx.box.parent.removeChild(fx.box);
                }
            } catch (e) {
            }
        }
        IoReplayPlayer._effects = [];
    }

    // ---- (19 October) the fighting, made up (see the top)
    /**
     * The yard's towers take their steps, as many as the replay's speed makes this game step (one at 1x, four at 4x,
     * one every fourth at 1/4x), none while it is paused or being wound to a time. Each finds the attacking puppets in
     * its range as it would monsters, turns and fires; a tower under a Candy Jar (a shot's picture) waits.
     */
    private static simTowers(): void {
        if (!GLOBAL.INFERNO_ONLY || IoReplayPlayer._seeking || IoReplayPlayer._seekDrag || (IoReplayPlayer._paused && !IoReplayPlayer._live) || CREEPS._creepCount > 0) {
            return;
        }
        IoReplayPlayer._towerCarry = Math.min(8, IoReplayPlayer._towerCarry + (IoReplayPlayer._live ? 1 : IoReplayPlayer._speed));
        let n: int = Math.min(4, Math.floor(IoReplayPlayer._towerCarry)) | 0;
        if (n <= 0) {
            return;
        }
        IoReplayPlayer._towerCarry -= n;
        let towers: any = InstanceManager.getInstancesByClass(BTOWER);
        for (let i: int = 0; i < n; i++) {
            for (let o of (towers ?? [])) {
                let tower: BTOWER = as3.as(o, BTOWER);
                if (!tower || tower.health <= 0 || tower._destroyed || tower.isJard || IoReplayPlayer._towerBroken.get(tower)) {
                    continue;
                }
                try {
                    tower.TickAttack();
                } catch (e) {
                    IoReplayPlayer._towerBroken.set(tower, true);
                    LOGGER.Log("log", "Replay: a tower not shown firing: " + e.message);
                }
            }
        }
    }

    /** The towers aim at nothing, and the shots in the air go (a seek, Restart, or the replay over). */
    private static resetTowers(): void {
        try {
            for (let o of (InstanceManager.getInstancesByClass(BTOWER) ?? [])) {
                let tower: BTOWER = as3.as(o, BTOWER);
                if (tower) {
                    tower._hasTargets = false;
                    tower._targetCreeps = [];
                    tower._target = null;
                    tower._targetVacuum = false;
                }
            }
            PROJECTILES.Clear();
            FIREBALLS.Clear();
        } catch (e) {
            LOGGER.Log("log", "Replay: the towers not put back: " + e.message);
        }
        IoReplayPlayer._towerCarry = 0;
    }

    /**
     * What a monster standing at x, y was fighting, as far as the replay can tell (the place to face), or null: for
     * an attacker, the nearest building hurt in the last FIGHT_FOR seconds within its reach, or a defender hurt then;
     * for one of the yard's, an attacker hurt then.
     */
    private static fightOf(track: any, x: number, y: number): Point {
        let window: number = IoReplayPlayer._rate * IoReplayPlayer.FIGHT_FOR;
        let now: number = IoReplayPlayer._t;
        let side: int = track.def[2] | 0;
        let reach: number = IoReplayPlayer.reachOf(track);
        let g: Point = GRID.FromISO(x, y);
        let best: Point = null;
        let bestD: number = reach;
        if (side == 0) {
            for (let id in IoReplayPlayer._hurtAt) {
                if (now - Number(IoReplayPlayer._hurtAt[id]) > window || now < Number(IoReplayPlayer._hurtAt[id])) {
                    continue;
                }
                let b: BFOUNDATION = as3.as(BASE._buildingsAll["b" + id], BFOUNDATION);
                if (!b || b.health <= 0 || b._destroyed || !b._mc || !b._footprint || !b._footprint[0]) {
                    continue;
                }
                let fp: any = b._footprint[0];
                let g0: Point = GRID.FromISO(b._mc.x, b._mc.y);
                let dx: number = Math.max(g0.x - g.x, 0, g.x - (g0.x + fp.width));
                let dy: number = Math.max(g0.y - g.y, 0, g.y - (g0.y + fp.height));
                let d: number = Math.sqrt(dx * dx + dy * dy);
                if (d < bestD) {
                    bestD = d;
                    best = GRID.ToISO(g0.x + fp.width * 0.5, g0.y + fp.height * 0.5, 0);
                }
            }
        }
        for (let other of as3.values(IoReplayPlayer._tracks)) {
            if (other === track || !other.actor || (other.def[2] | 0) == side || other.hurtAt == null || now - Number(other.hurtAt) > window || now < Number(other.hurtAt)) {
                continue;
            }
            let o: Point = GRID.FromISO(Number(other.x), Number(other.y));
            let d2: number = Math.sqrt((o.x - g.x) * (o.x - g.x) + (o.y - g.y) * (o.y - g.y)) - 10;
            if (d2 < bestD) {
                bestD = d2;
                best = new Point(Number(other.x), Number(other.y));
            }
        }
        return best;
    }

    /** How far from what it hits a monster stands (grid units): its range, or next to it for a hand-to-hand one. */
    private static reachOf(track: any): number {
        if (track.reach != null) {
            return Number(track.reach);
        }
        let range: number = 0;
        try {
            if (track.actor instanceof MonsterBase) {
                range = Number(as3.cast(track.actor, MonsterBase).range) || 0;
            } else {
                let id: string = String(track.def[4] || "");
                range = Number(CHAMPIONCAGE.GetGuardianProperty(String(track.def[1]), Math.max(1, Number(id.substr(3, 1)) | 0) | 0, "range")) || 0;
            }
        } catch (e) {
        }
        track.reach = range > 1 ? range + 12 : 28;
        return Number(track.reach);
    }

    /** A puppet's side for the towers' aim (the yard's are defenders), and flying or not (-1: as its class says). */
    private static sideFlags(m: MonsterBase, side: int, flying: int): void {
        let f: int = m.defenseFlags | 0;
        if (side == 1) {
            f = (f & ~Targeting.k_TARGETS_ATTACKERS) | Targeting.k_TARGETS_DEFENDERS;
        }
        if (flying >= 0) {
            f = (f & ~(Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING)) | (flying ? Targeting.k_TARGETS_FLYING : Targeting.k_TARGETS_GROUND);
        }
        m.defenseFlags = f;
    }

    /**
     * A champion of the cage is a picture (IoReplaySprite), not a monster the towers can aim at: a stand-in monster
     * goes where it is, never drawn, shots at it doing nothing.
     */
    private static makeStandIn(def: any[], x: number, y: number, alt: number): MonsterBase {
        try {
            let m: MonsterBase = new CreepBase("C1", MonsterBase.k_sBHVR_PEN, new Point(x, y), 0, 1, int.MAX_VALUE, null, false, null, 1, false, null);
            m._ioPuppetOnly = true;
            let hidden: any = m;
            if (hidden._rasterData) {
                hidden._rasterData.clear();
                hidden._rasterData = null;
            }
            if (hidden._shadowData) {
                hidden._shadowData.clear();
                hidden._shadowData = null;
            }
            let flying: boolean = alt > 0;
            m._movement = flying ? "fly" : "";
            IoReplayPlayer.sideFlags(m, def[2] | 0, flying ? 1 : 0);
            return m;
        } catch (e) {
            LOGGER.Log("log", "Replay: no stand-in for " + def[1] + ": " + e.message);
        }
        return null;
    }

    private static placeStandIn(m: MonsterBase, x: number, y: number, hp: number, alt: number): void {
        m._tmpPoint.x = x;
        m._tmpPoint.y = y;
        if (m.graphic) {
            m.graphic.x = x;
            m.graphic.y = y;
        }
        m._altitude = alt;
        m.setHealth(Math.max(1, m.maxHealth * Math.min(1, hp / 100)));
        m.ioCellMove();
    }

    private static makeActor(def: any[], x: number, y: number): any {
        try {
            if ((def[3] | 0) == 1) {
                let sprite: IoReplaySprite = new IoReplaySprite(String(def[4]), def[5] | 0, def[6] | 0);
                MAP._BUILDINGTOPS.addChild(sprite);
                return sprite;
            }
            let c: any = CREATURELOCKER._creatures[String(def[1])];
            if (!c) {
                return null;
            }
            let cls: any = c.classType ? as3.as(c.classType, Class) : CreepBase;
            // (16 October) in the look it was recorded in (a champion's skin; none in an older replay)
            let m: MonsterBase = as3.as(IoDave.withRecorded(def.length > 5 ? String(def[5]) : null, (): any => new cls(String(def[1]), MonsterBase.k_sBHVR_PEN, new Point(x, y), 0, Math.max(1, def[4] | 0), int.MAX_VALUE, null, false, null, 1, false, null)), MonsterBase);
            if (GLOBAL.INFERNO_ONLY && m) {
                // (19 October: shots at it do nothing; the yard's own are its defenders, for the towers (simTowers))
                m._ioPuppetOnly = true;
                IoReplayPlayer.sideFlags(m, def[2] | 0, -1);
            }
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.addChild(m.graphic);
            }
            return m;
        } catch (e) {
            LOGGER.Log("log", "Replay: " + def[1] + " not shown: " + e.message);
        }
        return null;
    }

    private static dropActor(track: any): void {
        if (!track.actor) {
            return;
        }
        if (track.actor instanceof MonsterBase) {
            let m: MonsterBase = as3.cast(track.actor, MonsterBase);
            if (!BYMConfig.instance.RENDERER_ON && m.graphic && m.graphic.parent) {
                m.graphic.parent.removeChild(m.graphic);
            }
            // (19 October: no longer where the towers look; clear() puts its health at 0, so their aim moves on)
            m.ioCellDrop();
            m.clear();
        } else {
            as3.cast(track.actor, IoReplaySprite).clear();
        }
        if (track.standIn) {
            let s: MonsterBase = as3.cast(track.standIn, MonsterBase);
            s.ioCellDrop();
            s.clear();
            track.standIn = null;
        }
        track.actor = null;
        track.fight = null;
    }

    /** The yard is going (BASE.Cleanup). */
    public static Clear(): void {
        IoReplayPlayer._total = 0;
        for (let track of as3.values(IoReplayPlayer._tracks)) {
            IoReplayPlayer.dropActor(track);
        }
        IoReplayPlayer.clearEffects();
        if (GLOBAL.INFERNO_ONLY && IoReplayPlayer._on) {
            IoReplayPlayer.resetTowers();
        }
        IoReplayPlayer._hurtAt = {};
        IoReplayPlayer._shots = [];
        IoReplayPlayer._tracks = {};
        if (GLOBAL.INFERNO_ONLY && IoReplayPlayer._on) {
            SOUNDS.PlayMusic("musicibuild");
        }
        IoReplayPlayer._on = false;
        IoReplayPlayer._replay = null;
        IoReplayPlayer._live = false;
        IoReplayPlayer._liveKey = null;
        IoReplayPlayer._liveHome = null;
        IoReplayPlayer._liveMap = null;
        IoReplayPlayer._spectator = false;
        IoReplayPlayer._liveNext = null;
        if (IoReplayPlayer._hud && IoReplayPlayer._hud.parent) {
            IoReplayPlayer._hud.parent.removeChild(IoReplayPlayer._hud);
        }
        IoReplayPlayer._hud = null;
        IoReplayPlayer._shareMenu = null;
        // (QoL #94/#97)
        IoReplayPlayer.seekStopDrag();
        IoReplayPlayer._seek = null;
        IoReplayPlayer._seekHead = null;
        IoReplayPlayer._favButton = null;
    }

    // ---- the bar
    private static clock(t: number): string {
        let s: int = (t / IoReplayPlayer._rate) | 0;
        return ((s / 60) | 0) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    }

    private static buildHud(): void {
        if (IoReplayPlayer._live) {
            IoReplayPlayer.buildLiveHud();
            return;
        }
        let meta: any = null;
        meta = IoReplayPlayer._replay.meta || {};
        IoReplayPlayer._hud = new Sprite();
        IoReplayPlayer._hud.name = "ioReplayHud";
        let w: int = 660;
        let hud: Sprite = IoReplayPlayer._hud;
        let drawHud: Function = (): void => {
            hud.graphics.clear();
            // (the UI kit's obsidian panel, 11 October)
            // (QoL #94: taller, for the seek bar under the buttons)
            if (IoKit.panel(hud.graphics, 0, 0, w, IoReplayPlayer.HUD_H)) {
                return;
            }
            hud.graphics.lineStyle(1, 12092939, 1);
            hud.graphics.beginFill(1971212, 0.9);
            hud.graphics.drawRoundRect(0, 0, w, IoReplayPlayer.HUD_H, 12, 12);
            hud.graphics.endFill();
        };
        drawHud();
        IoKit.whenLoaded(["panel", "panel_tile"], drawHud);
        let when: Date = new Date(Number(meta.time) * 1000);
        let where: string = String(meta.yard_type) == "outpost" ? "outpost" : "yard";
        // (QoL #539: a replay cut short at the size limits says so; QoL #97: room on the right for Keep)
        let cutNote: string = meta.cut ? " · <font color=\"#FF9966\">" + IoReplayPlayer.esc(KEYS.Get("io_rp2_cut")) + "</font>" : "";
        let titleText: string = "<b>Replay:</b> " + IoReplayPlayer.esc(meta.attacker) + " attacked " + IoReplayPlayer.esc(meta.defender) + "'s " + where + " · " + when.toLocaleDateString() + " " + (when.getHours() < 10 ? "0" : "") + when.getHours() + ":" + (when.getMinutes() < 10 ? "0" : "") + when.getMinutes() + cutNote;
        // (Inferno-only, QoL #574: the game's one date and time (IoFormat.dateTime); QoL #235: the line in the
        // player's language)
        if (GLOBAL.INFERNO_ONLY) {
            titleText = IoFormat.text(where == "outpost" ? "io_fmt_rp_title_outpost" : "io_fmt_rp_title", "<b>Replay:</b> #v1# attacked #v2#'s " + where + " · #v3#", { "v1": IoReplayPlayer.esc(meta.attacker), "v2": IoReplayPlayer.esc(meta.defender), "v3": IoFormat.dateTime(Number(meta.time)) }) + cutNote;
        }
        IoReplayPlayer._title = IoReplayPlayer.label(titleText, 12, (w - (meta.imported ? 20 : 96)) | 0);
        IoReplayPlayer._title.x = 10;
        IoReplayPlayer._title.y = 5;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._title);
        let x: int = 10;
        IoReplayPlayer._playButton = IoReplayPlayer.button(KEYS.Get("io_tr_rp_pause"), 62, (e: MouseEvent): void => {
            IoReplayPlayer.togglePause();
        });
        IoReplayPlayer._playButton.x = x;
        IoReplayPlayer._playButton.y = 32;
        IoReplayPlayer._playButton.name = "ioReplayPlay";
        IoReplayPlayer._hud.addChild(IoReplayPlayer._playButton);
        x += 68;
        IoReplayPlayer._speedButtons = [];
        for (let i: int = 0; i < IoReplayPlayer.SPEEDS.length; i++) {
            let sb: Sprite = IoReplayPlayer.button(as3.str(IoReplayPlayer.SPEED_LABELS[i]), 36, IoReplayPlayer.speedClick(Number(IoReplayPlayer.SPEEDS[i])));
            sb.x = x;
            sb.y = 32;
            sb.name = "ioReplaySpeed" + i;
            IoReplayPlayer._hud.addChild(sb);
            IoReplayPlayer._speedButtons.push(sb);
            x += 40;
        }
        x += 4;
        IoReplayPlayer._clock = IoReplayPlayer.label("", 11, 160);
        IoReplayPlayer._clock.x = x;
        IoReplayPlayer._clock.y = 36;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._clock);
        x += 160;
        let restartB: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_restart"), 58, (e: MouseEvent): void => {
            IoReplayPlayer.restart();
        });
        restartB.x = x;
        restartB.y = 32;
        restartB.name = "ioReplayRestart";
        IoReplayPlayer._hud.addChild(restartB);
        x += 62;
        let share: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_share"), 50, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
        });
        share.x = x;
        share.y = 32;
        share.name = "ioReplayShare";
        IoReplayPlayer._hud.addChild(share);
        x += 54;
        if (!meta.imported) {
            let download: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_save"), 44, (e: MouseEvent): void => {
                IoReplays.Download(String(meta.key));
            });
            download.x = x;
            download.y = 32;
            download.name = "ioReplayDownload";
            IoReplayPlayer._hud.addChild(download);
        }
        x += 48;
        let close: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_close"), 50, (e: MouseEvent): void => {
            IoReplayPlayer.goHome();
        });
        close.x = w - 56;
        close.y = 32;
        close.name = "ioReplayClose";
        IoReplayPlayer._hud.addChild(close);
        // (QoL #97: Keep, top right: the player's ★ on it; not for a downloaded file opened again, kept a day)
        if (!meta.imported) {
            IoReplayPlayer._favButton = IoReplayPlayer.button(IoReplayPlayer.favText(), 76, (e: MouseEvent): void => {
                IoReplayPlayer.toggleFav();
            });
            IoReplayPlayer._favButton.x = w - 86;
            IoReplayPlayer._favButton.y = 4;
            IoReplayPlayer._favButton.name = "ioRp2Fav";
            IoReplayPlayer._hud.addChild(IoReplayPlayer._favButton);
        }
        // (QoL #94: the seek bar)
        IoReplayPlayer._hud.addChild(IoReplayPlayer.buildSeek());
        GLOBAL._layerUI.addChild(IoReplayPlayer._hud);
        IoReplayPlayer.updateHud();
    }

    /** QoL #94: the HUD's height (the buttons, then the seek bar). */
    private static readonly HUD_H: int = 88;

    // ---- QoL #94: the seek bar
    /** The bar: its damage curve and the shots' marks drawn once; its head (where the replay is) on each update. */
    private static buildSeek(): Sprite {
        let bar: Sprite = new Sprite();
        bar.name = "ioRp2Seek";
        bar.buttonMode = true;
        bar.x = 10;
        bar.y = 62;
        let sw: int = IoReplayPlayer.SEEK_W;
        let sh: int = IoReplayPlayer.SEEK_H;
        let total: number = Math.max(1, IoReplayPlayer._total);
        bar.graphics.lineStyle(1, 0x7A5A2A, 1);
        bar.graphics.beginFill(0x1A0E06, 0.95);
        bar.graphics.drawRoundRect(0, 0, sw, sh, 6, 6);
        bar.graphics.endFill();
        let curve: Shape = new Shape();
        curve.name = "ioRp2SeekCurve";
        let g: any = curve.graphics;
        // the damage so far, a step at each change (0 at the bottom, 100% at the top)
        let bottom: number = sh - 2;
        let tall: number = sh - 4;
        let points: any[] = [];
        let y: number = bottom;
        for (let d of as3.values(IoReplayPlayer._damageEvents)) {
            let x: number = Math.min(sw, sw * Number(d[0]) / total);
            points.push([x, y]);
            y = bottom - tall * Math.max(0, Math.min(100, Number(d[1]))) / 100;
            points.push([x, y]);
        }
        points.push([sw, y]);
        g.lineStyle(0, 0, 0);
        g.beginFill(0xC0392B, 0.45);
        g.moveTo(0, bottom);
        for (let pt of as3.values(points)) {
            g.lineTo(pt[0], pt[1]);
        }
        g.lineTo(sw, bottom);
        g.lineTo(0, bottom);
        g.endFill();
        g.lineStyle(1, 0xFF7A3A, 1);
        g.moveTo(0, bottom);
        for (let pt of as3.values(points)) {
            g.lineTo(pt[0], pt[1]);
        }
        // the catapult's shots: a mark at the top (one a pixel)
        let lastX: int = -10;
        g.lineStyle(0, 0, 0);
        for (let shot of as3.values(IoReplayPlayer._shots)) {
            let sx: int = Math.round(sw * Number(shot[0]) / total) | 0;
            if (sx - lastX < 2) {
                continue;
            }
            lastX = sx;
            g.beginFill(0xFFE94D, 1);
            g.moveTo(sx - 3, 1);
            g.lineTo(sx + 3, 1);
            g.lineTo(sx, 6);
            g.lineTo(sx - 3, 1);
            g.endFill();
        }
        bar.addChild(curve);
        IoReplayPlayer._seekHead = new Shape();
        IoReplayPlayer._seekHead.name = "ioRp2SeekHead";
        bar.addChild(IoReplayPlayer._seekHead);
        bar.addEventListener(MouseEvent.MOUSE_DOWN, IoReplayPlayer.seekDown);
        IoReplayPlayer._seek = bar;
        return bar;
    }

    private static drawSeekHead(t: number): void {
        let head: Shape = IoReplayPlayer._seekHead;
        if (!head) {
            return;
        }
        let sw: int = IoReplayPlayer.SEEK_W;
        let sh: int = IoReplayPlayer.SEEK_H;
        let x: number = Math.round(sw * Math.max(0, Math.min(1, t / Math.max(1, IoReplayPlayer._total))));
        head.graphics.clear();
        head.graphics.beginFill(0xFFE94D, 0.16);
        head.graphics.drawRect(1, 1, Math.max(0, x - 1), sh - 2);
        head.graphics.endFill();
        head.graphics.beginFill(0xFFF2CC, 1);
        head.graphics.drawRect(x - 1, -2, 2, sh + 4);
        head.graphics.endFill();
        head.graphics.lineStyle(1, 0x2A1A0A, 1);
        head.graphics.beginFill(0xFFE94D, 1);
        head.graphics.drawCircle(x, sh * 0.5, 5);
        head.graphics.endFill();
    }

    private static seekDown(e: MouseEvent): void {
        e.stopPropagation();
        if (!IoReplayPlayer._on || !IoReplayPlayer._seek) {
            return;
        }
        IoReplayPlayer._seekDrag = true;
        IoReplayPlayer._seekStage = IoReplayPlayer._seek.stage;
        if (IoReplayPlayer._seekStage) {
            IoReplayPlayer._seekStage.addEventListener(MouseEvent.MOUSE_MOVE, IoReplayPlayer.seekMove);
            IoReplayPlayer._seekStage.addEventListener(MouseEvent.MOUSE_UP, IoReplayPlayer.seekUp);
        }
        IoReplayPlayer.seekAtMouse(true);
    }

    private static seekMove(e: MouseEvent): void {
        IoReplayPlayer.seekAtMouse(false);
    }

    private static seekUp(e: MouseEvent): void {
        IoReplayPlayer.seekAtMouse(true);
        IoReplayPlayer.seekStopDrag();
    }

    private static seekStopDrag(): void {
        IoReplayPlayer._seekDrag = false;
        if (IoReplayPlayer._seekStage) {
            IoReplayPlayer._seekStage.removeEventListener(MouseEvent.MOUSE_MOVE, IoReplayPlayer.seekMove);
            IoReplayPlayer._seekStage.removeEventListener(MouseEvent.MOUSE_UP, IoReplayPlayer.seekUp);
            IoReplayPlayer._seekStage = null;
        }
    }

    /** The time under the mouse: the head goes there at once, the replay a few times a second while dragged. */
    private static seekAtMouse(now: boolean): void {
        if (!IoReplayPlayer._seek || !IoReplayPlayer._on) {
            return;
        }
        let f: number = Math.max(0, Math.min(1, IoReplayPlayer._seek.mouseX / IoReplayPlayer.SEEK_W));
        let t: number = f * IoReplayPlayer._total;
        IoReplayPlayer.drawSeekHead(t);
        if (now || getTimer() - IoReplayPlayer._seekAt > 150) {
            IoReplayPlayer._seekAt = getTimer();
            IoReplayPlayer.seekTo(t);
        }
    }

    /**
     * QoL #94: the replay at time t (samples from the start, 0 to total; tests can call it): the buildings as they
     * began with every change up to t, the monsters made again where they were, the shots' pictures gone (but a
     * Candy Jar still working then is put back). Playing or paused, it stays so.
     */
    public static seekTo(t: number): void {
        if (!IoReplayPlayer._on || !IoReplayPlayer._replay) {
            return;
        }
        t = Math.max(0, Math.min(IoReplayPlayer._total, Number(t) || 0));
        IoReplayPlayer._seeking = true;
        try {
            let events: any[] = IoReplayPlayer._buildingEvents;
            let hp: any = {};
            let cursor: int = 0;
            while (cursor < events.length && events[cursor][0] <= t) {
                hp[events[cursor][1]] = events[cursor][2];
                cursor++;
            }
            for (let id in IoReplayPlayer._initial) {
                if (hp[id] != null) {
                    IoReplayPlayer.setBuilding(Number(id) | 0, hp[id] | 0);
                    continue;
                }
                let b: BFOUNDATION = as3.as(BASE._buildingsAll["b" + id], BFOUNDATION);
                if (b) {
                    b.setHealth(Number(IoReplayPlayer._initial[id][0]));
                    b._destroyed = Boolean(IoReplayPlayer._initial[id][1]);
                    b.Update(true);
                }
            }
            IoReplayPlayer._buildingCursor = cursor;
            for (let track of as3.values(IoReplayPlayer._tracks)) {
                IoReplayPlayer.dropActor(track);
                track.cur = 0;
                // (22 October: when it was hurt, worked out again as play goes on: seeking back, the old time made
                // monsters near it fight one not hurt yet)
                track.hurtAt = null;
            }
            IoReplayPlayer.clearEffects();
            IoReplayPlayer.resetTowers();
            IoReplayPlayer._hurtAt = {};
            let s: int = 0;
            while (s < IoReplayPlayer._shots.length && IoReplayPlayer._shots[s][0] <= t) {
                let shot: any[] = as3.as(IoReplayPlayer._shots[s][1], Array);
                let at: number = Number(IoReplayPlayer._shots[s][0]);
                if (shot && shot[0] == "j" && at + Math.max(1, Number(Number(shot[4]) || 10)) * IoReplayPlayer._rate > t) {
                    IoReplayPlayer.throwShot(shot, at);
                }
                s++;
            }
            IoReplayPlayer._shotCursor = s;
            IoReplayPlayer._t = t;
            let damage: int = 0;
            for (let d of as3.values(IoReplayPlayer._damageEvents)) {
                if (d[0] > t) {
                    break;
                }
                damage = d[1] | 0;
            }
            IoReplayPlayer._damage = damage;
            if (GLOBAL._render) {
                IoReplayPlayer.drawActors();
            }
        } catch (e) {
            LOGGER.Log("log", "Replay: a seek went wrong: " + e.message);
        }
        IoReplayPlayer._seeking = false;
        IoReplayPlayer.updateHud();
    }

    // ---- QoL #97: Keep (the ★)
    private static favText(): string {
        return IoReplayPlayer._fav ? "★ " + KEYS.Get("io_rp2_fav_btn_on") : "☆ " + KEYS.Get("io_rp2_fav_btn");
    }

    /** QoL #97: the player's ★ on this replay or off (tests: IoReplayPlayer.fav). */
    public static toggleFav(): void {
        if (!IoReplayPlayer._replay || !IoReplayPlayer._replay.meta) {
            return;
        }
        let key: string = String(IoReplayPlayer._replay.meta.key);
        IoReplays.Favourite(key, !IoReplayPlayer._fav, (fav: boolean): void => {
            if (!IoReplayPlayer._replay || String(IoReplayPlayer._replay.meta.key) != key) {
                return;
            }
            IoReplayPlayer._fav = fav;
            IoReplayPlayer.setLabel(IoReplayPlayer._favButton, IoReplayPlayer.favText());
        });
    }

    public static get fav(): boolean {
        return IoReplayPlayer._fav;
    }

    private static speedClick(speed: number): Function {
        return (e: MouseEvent): void => {
            IoReplayPlayer.setSpeed(speed);
        };
    }

    private static toggleShare(): void {
        let key: string = null;
        if (IoReplayPlayer._shareMenu) {
            if (IoReplayPlayer._shareMenu.parent) {
                IoReplayPlayer._shareMenu.parent.removeChild(IoReplayPlayer._shareMenu);
            }
            IoReplayPlayer._shareMenu = null;
            return;
        }
        key = String(IoReplayPlayer._replay.meta.key);
        IoReplayPlayer._shareMenu = new Sprite();
        // (QoL #98: and Copy link, the page that opens straight into this replay; not a file opened again, only
        // this player can watch it)
        let meta: any = IoReplayPlayer._replay.meta;
        let menuH: int = meta.imported ? 62 : 90;
        if (!IoKit.panel(IoReplayPlayer._shareMenu.graphics, 0, 0, 150, menuH)) {
            IoReplayPlayer._shareMenu.graphics.beginFill(1971212, 0.95);
            IoReplayPlayer._shareMenu.graphics.drawRoundRect(0, 0, 150, menuH, 8, 8);
            IoReplayPlayer._shareMenu.graphics.endFill();
        }
        // (QoL #98: the chat's pill says who attacked whom and the damage: meta)
        let g: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_chat_global"), 134, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
            IoReplays.Share(key, BYMChat.IO_GLOBAL, meta);
        });
        g.x = 8;
        g.y = 6;
        IoReplayPlayer._shareMenu.addChild(g);
        let a: Sprite = IoReplayPlayer.button(KEYS.Get("io_tr_rp_chat_alliance"), 134, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
            IoReplays.Share(key, BYMChat.IO_ALLIANCE, meta);
        });
        a.x = 8;
        a.y = 34;
        IoReplayPlayer._shareMenu.addChild(a);
        if (!meta.imported) {
            let link: Sprite = IoReplayPlayer.button(KEYS.Get("io_rp2_copy_link"), 134, (e: MouseEvent): void => {
                IoReplayPlayer.toggleShare();
                IoReplays.CopyLink(key);
            });
            link.x = 8;
            link.y = 62;
            link.name = "ioRp2CopyLink";
            IoReplayPlayer._shareMenu.addChild(link);
        }
        IoReplayPlayer._shareMenu.name = "ioRp2ShareMenu";
        let shareButton: Sprite = as3.as(IoReplayPlayer._hud.getChildByName("ioReplayShare"), Sprite);
        IoReplayPlayer._shareMenu.x = shareButton.x;
        // (QoL #94: under the seek bar)
        IoReplayPlayer._shareMenu.y = IoReplayPlayer.HUD_H + 4;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._shareMenu);
    }

    private static goHome(): void {
        IoReplayPlayer.Clear();
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        // (QoL #95: watched from the Attack Log: back to it)
        if (IoReplays.ioFromLogs) {
            IoReplays.ioFromLogs = false;
            IoAttackLogs.ioReopenAfterLoad();
        } else {
            IoAttackLogs.ioReturnOffset = -1;
        }
    }

    private static updateHud(): void {
        if (!IoReplayPlayer._hud) {
            return;
        }
        if (IoReplayPlayer._live) {
            IoReplayPlayer.updateLiveHud();
            return;
        }
        IoReplayPlayer._hud.x = (GLOBAL._SCREENCENTER.x - IoReplayPlayer._hud.width * 0.5) | 0;
        IoReplayPlayer._hud.y = 6;
        if (IoReplayPlayer._shareMenu) {
            IoReplayPlayer._hud.x = (GLOBAL._SCREENCENTER.x - 330) | 0;
        }
        IoReplayPlayer._clock.htmlText = "<b>" + IoReplayPlayer.clock(IoReplayPlayer._t) + "</b> / " + IoReplayPlayer.clock(IoReplayPlayer._total) + "  ·  " + KEYS.Get("io_tr_rp_damage") + " <b>" + IoReplayPlayer._damage + "%</b>";
        IoReplayPlayer.setLabel(IoReplayPlayer._playButton, IoReplayPlayer._t >= IoReplayPlayer._total && IoReplayPlayer._paused ? KEYS.Get("io_tr_rp_again") : (IoReplayPlayer._paused ? KEYS.Get("io_tr_rp_play") : KEYS.Get("io_tr_rp_pause")));
        // (QoL #94: the seek bar's head, unless the mouse is moving it)
        if (!IoReplayPlayer._seekDrag) {
            IoReplayPlayer.drawSeekHead(IoReplayPlayer._t);
        }
        for (let i: int = 0; i < IoReplayPlayer._speedButtons.length; i++) {
            IoReplayPlayer.highlight(as3.cast(IoReplayPlayer._speedButtons[i], Sprite), IoReplayPlayer.SPEEDS[i] == IoReplayPlayer._speed);
        }
    }

    // ---- (18 October, the user's) an attack watched live (IoLiveWatch)
    /** Every game step of a live attack: time on at 1x (faster when far behind), up to the newest sample. */
    private static liveStep(): void {
        let behind: number = IoReplayPlayer._total - IoReplayPlayer._t;
        // (18 October: a little slower when close to the newest sample, so it doesn't stop and start between parts)
        let speed: number = behind > 12 * IoReplayPlayer._rate ? 3 : (behind > 6 * IoReplayPlayer._rate ? 1.5 : (behind < IoReplayPlayer._rate && !IoReplayPlayer._liveDone ? 0.85 : 1));
        IoReplayPlayer._t = Math.min(IoReplayPlayer._total, IoReplayPlayer._t + speed * IoReplayPlayer._rate / 80);
        if (!IoReplayPlayer._liveDone && !IoReplayPlayer._liveBusy && getTimer() - IoReplayPlayer._liveAskedAt >= IoReplayPlayer.LIVE_ASK_MS) {
            IoReplayPlayer.liveAsk();
        }
        if (IoReplayPlayer._liveDone && !IoReplayPlayer._liveShownEnd && IoReplayPlayer._t >= IoReplayPlayer._total) {
            IoReplayPlayer._liveShownEnd = true;
            IoReplayPlayer.updateHud();
            IoLiveWatch.ended(IoReplayPlayer._liveKey);
            if (IoReplayPlayer._spectator) {
                // (the Watch menu: its end shown a moment, then what's next)
                let key: string = IoReplayPlayer._liveKey;
                setTimeout((): void => {
                    if (IoReplayPlayer._on && IoReplayPlayer._liveKey == key) {
                        IoWatch.ended();
                    }
                }, 4000);
            }
        }
    }

    /** The parts since the last one (replays/live). */
    private static liveAsk(): void {
        IoReplayPlayer._liveBusy = true;
        IoReplayPlayer._liveAskedAt = getTimer();
        let key: string = IoReplayPlayer._liveKey;
        new URLLoaderApi().load(GLOBAL.serverUrl + "replays/live", [["key", key], ["after", IoReplayPlayer._liveSeq], ["t", IoReplayPlayer._total - 1], ["defs", IoReplayPlayer._liveDefs]], (response: any): void => {
            IoReplayPlayer._liveBusy = false;
            if (!IoReplayPlayer._on || !IoReplayPlayer._live || IoReplayPlayer._liveKey != key) {
                return;
            }
            if (!response || (response.error !== 0 && response.error !== "0") || !response.replay) {
                // ("too many", the server's trouble: asked again next time; "can't be watched": it is over)
                if (response && response.error && String(response.error).indexOf("Too many") != 0 && !response.again) {
                    IoReplayPlayer._liveDone = true;
                }
                return;
            }
            IoReplayPlayer.liveAnswer(response.replay);
        }, (e: any): void => {
            IoReplayPlayer._liveBusy = false;
        });
    }

    /** What replays/live gave: new parts while it records; the rest of it, by time, once it is finished. */
    public static liveAnswer(r: any): void {
        for (let part of as3.values(as3.as(r.parts, Array) || [])) {
            let defs: any[] = as3.as(part.d, Array) || [];
            IoReplayPlayer.ingest(defs, as3.as(part.s, Array) || []);
            IoReplayPlayer._liveDefs = (IoReplayPlayer._liveDefs + defs.length) | 0;
            IoReplayPlayer._liveSeq = Math.max(IoReplayPlayer._liveSeq, part.seq | 0) | 0;
        }
        if (r.done) {
            let defs: any[] = as3.as(r.defs, Array) || [];
            IoReplayPlayer.ingest(defs, as3.as(r.samples, Array) || []);
            IoReplayPlayer._liveDefs = (IoReplayPlayer._liveDefs + defs.length) | 0;
            IoReplayPlayer._liveDone = true;
        } else if (r.recording && r.active === false) {
            // (the attacker's game went away: the attack is over, whatever it did by then)
            IoReplayPlayer._liveDone = true;
        }
        if (r.damage != null && (r.damage | 0) > IoReplayPlayer._damage && IoReplayPlayer._liveDone) {
            IoReplayPlayer._liveFinalDamage = r.damage | 0;
        }
    }

    /** The attack's own damage at its end (the server's), shown with "the attack is over". */
    private static _liveFinalDamage: int = -1;

    private static buildLiveHud(): void {
        let meta: any = IoReplayPlayer._replay.meta || {};
        IoReplayPlayer._liveFinalDamage = -1;
        IoReplayPlayer._hud = new Sprite();
        IoReplayPlayer._hud.name = "ioReplayHud";
        let w: int = 640;
        let h: int = 62;
        let hud: Sprite = IoReplayPlayer._hud;
        let drawHud: Function = (): void => {
            hud.graphics.clear();
            if (IoKit.panel(hud.graphics, 0, 0, w, h)) {
                return;
            }
            hud.graphics.lineStyle(1, 12092939, 1);
            hud.graphics.beginFill(1971212, 0.9);
            hud.graphics.drawRoundRect(0, 0, w, h, 12, 12);
            hud.graphics.endFill();
        };
        drawHud();
        IoKit.whenLoaded(["panel", "panel_tile"], drawHud);
        let where: string = String(meta.yard_type) == "outpost" ? "outpost" : "yard";
        IoReplayPlayer._title = IoReplayPlayer.label("", 12, w - 20);
        IoReplayPlayer._title.x = 10;
        IoReplayPlayer._title.y = 6;
        IoReplayPlayer._title.name = "ioLiveTitle";
        IoReplayPlayer._title.htmlText = "<font color=\"#FF5A3C\"><b>\u25CF " + IoReplayPlayer.esc(KEYS.Get("io_live_tag")) + "</b></font>  " + IoReplayPlayer.liveTitle(meta, where);
        IoReplayPlayer._hud.addChild(IoReplayPlayer._title);
        IoReplayPlayer._clock = IoReplayPlayer.label("", 11, w - 230);
        IoReplayPlayer._clock.x = 10;
        IoReplayPlayer._clock.y = 34;
        IoReplayPlayer._clock.name = "ioLiveClock";
        IoReplayPlayer._hud.addChild(IoReplayPlayer._clock);
        if (IoReplayPlayer._spectator) {
            // (the Watch menu: someone else's attack: Stop watching, and Watch all's Next)
            IoReplayPlayer._liveHome = IoReplayPlayer.button(KEYS.Get("io_watch_stop"), 110, (e: MouseEvent): void => {
                IoWatch.stop();
            });
            IoReplayPlayer._liveHome.x = w - 120;
            IoReplayPlayer._liveHome.y = 32;
            IoReplayPlayer._liveHome.name = "ioLiveStop";
            IoReplayPlayer._hud.addChild(IoReplayPlayer._liveHome);
            IoReplayPlayer._liveNext = IoReplayPlayer.button(KEYS.Get("io_watch_next"), 70, (e: MouseEvent): void => {
                IoWatch.next();
            });
            IoReplayPlayer._liveNext.x = w - 200;
            IoReplayPlayer._liveNext.y = 32;
            IoReplayPlayer._liveNext.name = "ioLiveNext";
            IoReplayPlayer._liveNext.visible = IoWatch.mode == "all";
            IoReplayPlayer._hud.addChild(IoReplayPlayer._liveNext);
            GLOBAL._layerUI.addChild(IoReplayPlayer._hud);
            IoReplayPlayer.updateHud();
            return;
        }
        // (the only thing to do while it goes on: the Map Room)
        IoReplayPlayer._liveMap = IoReplayPlayer.button(KEYS.Get("io_live_map"), 90, (e: MouseEvent): void => {
            IoLiveWatch.openMap();
        });
        IoReplayPlayer._liveMap.x = w - 100;
        IoReplayPlayer._liveMap.y = 32;
        IoReplayPlayer._liveMap.name = "ioLiveMap";
        IoReplayPlayer._hud.addChild(IoReplayPlayer._liveMap);
        // (when it's over: home)
        IoReplayPlayer._liveHome = IoReplayPlayer.button(KEYS.Get("io_live_home"), 100, (e: MouseEvent): void => {
            IoLiveWatch.ended(IoReplayPlayer._liveKey);
            IoReplayPlayer.Clear();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        });
        IoReplayPlayer._liveHome.x = w - 206;
        IoReplayPlayer._liveHome.y = 32;
        IoReplayPlayer._liveHome.name = "ioLiveHome";
        IoReplayPlayer._liveHome.visible = false;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._liveHome);
        GLOBAL._layerUI.addChild(IoReplayPlayer._hud);
        IoReplayPlayer.updateHud();
    }

    /** The live bar's title: "Ann is attacking your yard", or (the Watch menu) "Ann is attacking Bob's yard". */
    private static liveTitle(meta: any, where: string): string {
        if (IoReplayPlayer._spectator) {
            return KEYS.Get("io_watch_row_attack", { "v1": "<b>" + IoReplayPlayer.esc(meta.watchAttacker || meta.attacker) + "</b>", "v2": IoReplayPlayer.esc(meta.watchTitle || meta.defender) });
        }
        return KEYS.Get(where == "outpost" ? "io_live_title_outpost" : "io_live_title_yard", { "v1": "<b>" + IoReplayPlayer.esc(meta.attacker) + "</b>" });
    }

    private static updateLiveHud(): void {
        IoReplayPlayer._hud.x = (GLOBAL._SCREENCENTER.x - IoReplayPlayer._hud.width * 0.5) | 0;
        IoReplayPlayer._hud.y = 6;
        let meta: any = IoReplayPlayer._replay ? IoReplayPlayer._replay.meta || {} : {};
        if (IoReplayPlayer._liveShownEnd) {
            let dmg: int = (IoReplayPlayer._liveFinalDamage >= 0 ? IoReplayPlayer._liveFinalDamage : IoReplayPlayer._damage) | 0;
            IoReplayPlayer._title.htmlText = "<b>" + IoReplayPlayer.esc(KEYS.Get("io_live_over", { "v1": String(dmg) })) + "</b>";
            IoReplayPlayer._clock.htmlText = IoReplayPlayer._spectator ? IoReplayPlayer.esc(KEYS.Get("io_watch_over_hint")) : IoReplayPlayer.esc(KEYS.Get("io_live_over_hint", { "v1": IoReplayPlayer.esc(meta.attacker) }));
            if (IoReplayPlayer._liveHome) {
                IoReplayPlayer._liveHome.visible = true;
            }
            return;
        }
        IoReplayPlayer._clock.htmlText = KEYS.Get("io_live_clock", { "v1": "<b>" + IoReplayPlayer.clock(IoReplayPlayer._t) + "</b>", "v2": "<b>" + IoReplayPlayer._damage + "</b>" });
    }

    // ---- small things
    private static esc(text: any): string {
        return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    private static label(html: string, size: int, width: int): TextField {
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = width;
        t.height = size + 10;
        t.defaultTextFormat = new TextFormat("Verdana", size, 0xFFF2CC);
        t.htmlText = html;
        t.filters = [new GlowFilter(0, 0.8, 2, 2, 4, 1)];
        return t;
    }

    private static button(text: string, width: int, onClick: Function): Sprite {
        let b: Sprite = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = width;
        t.height = 20;
        let f: TextFormat = new TextFormat("Verdana", 11, 0x2A1A0A, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.text = text;
        t.y = 3;
        t.name = "label";
        b.addChild(t);
        // (11 October: the game's own stock button under the label)
        IoKit.stockFace(b, width, 24, false);
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            onClick(e);
        });
        return b;
    }

    private static setLabel(b: Sprite, text: string): void {
        let t: TextField = b ? as3.as(b.getChildByName("label"), TextField) : null;
        if (t && t.text != text) {
            t.text = text;
        }
    }

    private static highlight(b: Sprite, on: boolean): void {
        let face: MovieClip = as3.as(b.getChildByName("ioStockFace"), MovieClip);
        if (face) {
            IoKit.stockState(face, false, true, on);
            return;
        }
        let t: TextField = as3.as(b.getChildByName("label"), TextField);
        b.graphics.clear();
        b.graphics.lineStyle(1, 8018458, 1);
        b.graphics.beginFill((on ? 0xFFE94D : 0xF2D98C) >>> 0, 1);
        b.graphics.drawRoundRect(0, 0, t.width, 24, 7, 7);
        b.graphics.endFill();
    }
}
