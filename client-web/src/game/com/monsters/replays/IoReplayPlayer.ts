import * as as3 from "as3";
import { ASObject, Class, Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, BFOUNDATION, BTOWER, BYMChat, BYMConfig, CREATURELOCKER, CreepBase, Decoy, EnumYardType, Expo, GLOBAL, IoReplaySprite, IoReplays, Jars, LOGGER, MAP, MonsterBase, ResourceBomb, ResourceBombs, SOUNDS, SPRITES, SpriteData, SpriteSheetAnimation, TweenLite, UI2 } from "@game";

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

    public $ctor(): void {
        super.$ctor();
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
        IoReplayPlayer._rate = Number(Number(replay.rate) || 4);
        IoReplayPlayer._tracks = {};
        IoReplayPlayer._buildingEvents = [];
        IoReplayPlayer._damageEvents = [];
        IoReplayPlayer._shots = [];
        IoReplayPlayer._shotCursor = 0;
        IoReplayPlayer.clearEffects();
        ResourceBombs.ioLoadArt();
        SPRITES.SetupSprite(Decoy.DECOY_WAVE);
        SPRITES.SetupSprite(Decoy.DECOY_EXPLOSION);
        SPRITES.SetupSprite(Jars.JAR_GRAPHIC);
        let def: any[] = null;
        for (def of as3.values(as3.as(replay.defs, Array) || [])) {
            if (def && def.length >= 4) {
                IoReplayPlayer._tracks[def[0] | 0] = { "def": def, "keys": [], "end": int.MAX_VALUE, "cur": 0, "actor": null, "glows": [], "glowKey": "" };
            }
        }
        let samples: any[] = as3.as(replay.samples, Array) || [];
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
        IoReplayPlayer._on = true;
        // (the visitor's panel, Open Map / Attack, goes: the bar's Close goes home; an attack from a replay
        // would be an attack on the yard as it is now)
        if (UI2._visitor) {
            UI2._visitor.visible = false;
        }
        IoReplayPlayer.buildHud();
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
            return;
        }
        if (UI2._visitor && UI2._visitor.visible) {
            UI2._visitor.visible = false;
        }
        if (!IoReplayPlayer._paused) {
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
        if (GLOBAL._render) {
            IoReplayPlayer.drawActors();
            if (++IoReplayPlayer._hudTicks >= 10) {
                IoReplayPlayer._hudTicks = 0;
                IoReplayPlayer.updateHud();
            }
        }
    }

    private static setBuilding(id: int, hp: int): void {
        let b: BFOUNDATION = as3.as(BASE._buildingsAll["b" + id], BFOUNDATION);
        if (!b) {
            return;
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
            }
            IoReplayPlayer.applyGlow(track);
            let walking: boolean = !IoReplayPlayer._paused && (Math.abs(x - track.x) > 0.02 || Math.abs(y - track.y) > 0.02);
            track.x = x;
            track.y = y;
            if (track.actor instanceof MonsterBase) {
                as3.cast(track.actor, MonsterBase).ioPuppet(x, y, hp / 100, alt, walking);
            } else {
                as3.cast(track.actor, IoReplaySprite).show(x, y, alt, walking);
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
    private static throwShot(shot: any[]): void {
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
                IoReplayPlayer._effects.push({ "kind": "j", "towers": jarred, "end": IoReplayPlayer._t + Math.max(1, Number(Number(shot[4]) || 10)) * IoReplayPlayer._rate });
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
            let m: MonsterBase = as3.as(new cls(String(def[1]), MonsterBase.k_sBHVR_PEN, new Point(x, y), 0, Math.max(1, def[4] | 0), int.MAX_VALUE, null, false, null, 1, false, null), MonsterBase);
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
            m.clear();
        } else {
            as3.cast(track.actor, IoReplaySprite).clear();
        }
        track.actor = null;
    }

    /** The yard is going (BASE.Cleanup). */
    public static Clear(): void {
        for (let track of as3.values(IoReplayPlayer._tracks)) {
            IoReplayPlayer.dropActor(track);
        }
        IoReplayPlayer.clearEffects();
        IoReplayPlayer._shots = [];
        IoReplayPlayer._tracks = {};
        IoReplayPlayer._on = false;
        IoReplayPlayer._replay = null;
        if (IoReplayPlayer._hud && IoReplayPlayer._hud.parent) {
            IoReplayPlayer._hud.parent.removeChild(IoReplayPlayer._hud);
        }
        IoReplayPlayer._hud = null;
        IoReplayPlayer._shareMenu = null;
    }

    // ---- the bar
    private static clock(t: number): string {
        let s: int = (t / IoReplayPlayer._rate) | 0;
        return ((s / 60) | 0) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    }

    private static buildHud(): void {
        let meta: any = null;
        meta = IoReplayPlayer._replay.meta || {};
        IoReplayPlayer._hud = new Sprite();
        IoReplayPlayer._hud.name = "ioReplayHud";
        let w: int = 660;
        IoReplayPlayer._hud.graphics.lineStyle(1, 12092939, 1);
        IoReplayPlayer._hud.graphics.beginFill(1971212, 0.9);
        IoReplayPlayer._hud.graphics.drawRoundRect(0, 0, w, 66, 12, 12);
        IoReplayPlayer._hud.graphics.endFill();
        let when: Date = new Date(Number(meta.time) * 1000);
        let where: string = String(meta.yard_type) == "outpost" ? "outpost" : "yard";
        IoReplayPlayer._title = IoReplayPlayer.label("<b>Replay:</b> " + IoReplayPlayer.esc(meta.attacker) + " attacked " + IoReplayPlayer.esc(meta.defender) + "'s " + where + " · " + when.toLocaleDateString() + " " + (when.getHours() < 10 ? "0" : "") + when.getHours() + ":" + (when.getMinutes() < 10 ? "0" : "") + when.getMinutes(), 12, (w - 20) | 0);
        IoReplayPlayer._title.x = 10;
        IoReplayPlayer._title.y = 5;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._title);
        let x: int = 10;
        IoReplayPlayer._playButton = IoReplayPlayer.button("Pause", 62, (e: MouseEvent): void => {
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
        let restartB: Sprite = IoReplayPlayer.button("Restart", 58, (e: MouseEvent): void => {
            IoReplayPlayer.restart();
        });
        restartB.x = x;
        restartB.y = 32;
        restartB.name = "ioReplayRestart";
        IoReplayPlayer._hud.addChild(restartB);
        x += 62;
        let share: Sprite = IoReplayPlayer.button("Share", 50, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
        });
        share.x = x;
        share.y = 32;
        share.name = "ioReplayShare";
        IoReplayPlayer._hud.addChild(share);
        x += 54;
        if (!meta.imported) {
            let download: Sprite = IoReplayPlayer.button("Save", 44, (e: MouseEvent): void => {
                IoReplays.Download(String(meta.key));
            });
            download.x = x;
            download.y = 32;
            download.name = "ioReplayDownload";
            IoReplayPlayer._hud.addChild(download);
        }
        x += 48;
        let close: Sprite = IoReplayPlayer.button("Close", 50, (e: MouseEvent): void => {
            IoReplayPlayer.goHome();
        });
        close.x = w - 56;
        close.y = 32;
        close.name = "ioReplayClose";
        IoReplayPlayer._hud.addChild(close);
        GLOBAL._layerUI.addChild(IoReplayPlayer._hud);
        IoReplayPlayer.updateHud();
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
        IoReplayPlayer._shareMenu.graphics.beginFill(1971212, 0.95);
        IoReplayPlayer._shareMenu.graphics.drawRoundRect(0, 0, 150, 62, 8, 8);
        IoReplayPlayer._shareMenu.graphics.endFill();
        let g: Sprite = IoReplayPlayer.button("Global chat", 134, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
            IoReplays.Share(key, BYMChat.IO_GLOBAL);
        });
        g.x = 8;
        g.y = 6;
        IoReplayPlayer._shareMenu.addChild(g);
        let a: Sprite = IoReplayPlayer.button("Alliance chat", 134, (e: MouseEvent): void => {
            IoReplayPlayer.toggleShare();
            IoReplays.Share(key, BYMChat.IO_ALLIANCE);
        });
        a.x = 8;
        a.y = 34;
        IoReplayPlayer._shareMenu.addChild(a);
        let shareButton: Sprite = as3.as(IoReplayPlayer._hud.getChildByName("ioReplayShare"), Sprite);
        IoReplayPlayer._shareMenu.x = shareButton.x;
        IoReplayPlayer._shareMenu.y = 70;
        IoReplayPlayer._hud.addChild(IoReplayPlayer._shareMenu);
    }

    private static goHome(): void {
        IoReplayPlayer.Clear();
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    private static updateHud(): void {
        if (!IoReplayPlayer._hud) {
            return;
        }
        IoReplayPlayer._hud.x = (GLOBAL._SCREENCENTER.x - IoReplayPlayer._hud.width * 0.5) | 0;
        IoReplayPlayer._hud.y = 6;
        if (IoReplayPlayer._shareMenu) {
            IoReplayPlayer._hud.x = (GLOBAL._SCREENCENTER.x - 330) | 0;
        }
        IoReplayPlayer._clock.htmlText = "<b>" + IoReplayPlayer.clock(IoReplayPlayer._t) + "</b> / " + IoReplayPlayer.clock(IoReplayPlayer._total) + "  ·  Damage <b>" + IoReplayPlayer._damage + "%</b>";
        IoReplayPlayer.setLabel(IoReplayPlayer._playButton, IoReplayPlayer._t >= IoReplayPlayer._total && IoReplayPlayer._paused ? "Again" : (IoReplayPlayer._paused ? "Play" : "Pause"));
        for (let i: int = 0; i < IoReplayPlayer._speedButtons.length; i++) {
            IoReplayPlayer.highlight(as3.cast(IoReplayPlayer._speedButtons[i], Sprite), IoReplayPlayer.SPEEDS[i] == IoReplayPlayer._speed);
        }
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
        b.graphics.lineStyle(1, 8018458, 1);
        b.graphics.beginFill(15915404, 1);
        b.graphics.drawRoundRect(0, 0, width, 24, 7, 7);
        b.graphics.endFill();
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
        let t: TextField = as3.as(b.getChildByName("label"), TextField);
        b.graphics.clear();
        b.graphics.lineStyle(1, 8018458, 1);
        b.graphics.beginFill((on ? 0xFFE94D : 0xF2D98C) >>> 0, 1);
        b.graphics.drawRoundRect(0, 0, t.width, 24, 7, 7);
        b.graphics.endFill();
    }
}
