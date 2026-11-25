import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { Sound, SoundChannel, SoundMixer, SoundTransform, ioAudioRunning, ioChannelsPlaying } from "flash/media";
import { URLRequest } from "flash/net";
import { setTimeout } from "flash/utils";
import { GLOBAL, MAP, UI2, sound_click1 } from "@game";

export class SOUNDS extends ASObject {
    public static _muted: int;

    public static _mutedMusic: int;

    public static _soundAssets: any[];

    public static _setup: boolean;

    private static _currentMusic: string;

    private static _queuedMusic: string;

    private static _musicVolume: number;

    private static _musicPan: number;

    private static _musicTime: number;

    public static _concurrent: any;

    public static _musicChannel: SoundChannel;

    // Sound directories
    public static attacksounds: string;

    public static othersounds: string;

    public static uisounds: string;

    public static infernosounds: string;

    public static mainmusic: string;

    public static infernomusic: string;

    public static _sounds: any;

    public static music_volumes: any;

    static {
        as3.lazyStatics(this, { _muted: 0, _mutedMusic: 0, _soundAssets: null, _setup: false, _currentMusic: null, _queuedMusic: null, _musicVolume: NaN, _musicPan: NaN, _musicTime: NaN, _concurrent: null, _musicChannel: null, attacksounds: null, othersounds: null, uisounds: null, infernosounds: null, mainmusic: null, infernomusic: null, _sounds: null, music_volumes: null }, () => {
            SOUNDS._muted = 0;
            SOUNDS._mutedMusic = 0;
            SOUNDS._setup = false;
            SOUNDS._currentMusic = null;
            SOUNDS._queuedMusic = "musicbuild";
            SOUNDS._musicVolume = 0.7;
            SOUNDS._musicPan = 0;
            SOUNDS._concurrent = {};
            SOUNDS.attacksounds = "attacksounds/";
            SOUNDS.othersounds = "othersounds/";
            SOUNDS.uisounds = "uisounds/";
            SOUNDS.infernosounds = "infernosounds/";
            SOUNDS.mainmusic = "music/";
            SOUNDS.infernomusic = "infernomusic/";
            SOUNDS._sounds = { "click1": new sound_click1(), "laser": SOUNDS.attacksounds + "sound_laser.mp3", "wmbstart": SOUNDS.othersounds + "sound_monsterbaiterloop.mp3", "wmbhorn": SOUNDS.othersounds + "sound_monsterbaiterhorn.mp3", "purchasepopup": SOUNDS.uisounds + "sound_purchasepop.mp3", "bankfire": SOUNDS.uisounds + "sound_bankfire.mp3", "bankland": SOUNDS.uisounds + "sound_bankland.mp3", "repair1": SOUNDS.uisounds + "sound_repair1.mp3", "error1": SOUNDS.uisounds + "sound_error1.mp3", "levelup": SOUNDS.othersounds + "sound_levelup.mp3", "shotgun": SOUNDS.uisounds + "sound_shotgun.mp3", "clock1": SOUNDS.uisounds + "sound_clock1.mp3", "warcry1": SOUNDS.attacksounds + "sound_warcry1.mp3", "splat1": SOUNDS.attacksounds + "sound_splat1.mp3", "splat2": SOUNDS.attacksounds + "sound_splat2.mp3", "splat3": SOUNDS.attacksounds + "sound_splat3.mp3", "splat4": SOUNDS.attacksounds + "sound_splat4.mp3", "splat5": SOUNDS.attacksounds + "sound_splat5.mp3", "snipe1": SOUNDS.attacksounds + "sound_snipe1.mp3", "magma1": SOUNDS.infernosounds + "sound_magma_attack1.mp3", "magma2": SOUNDS.infernosounds + "sound_magma_attack2.mp3", "quake": SOUNDS.infernosounds + "sound_quake_attack.mp3", "railgun1": SOUNDS.attacksounds + "sound_railgun1.mp3", "splash1": SOUNDS.attacksounds + "sound_splash1.mp3", "juice": SOUNDS.othersounds + "sound_juice.mp3", "close": SOUNDS.uisounds + "sound_close.mp3", "buildingplace": SOUNDS.uisounds + "sound_buildingplace.mp3", "lightningstart": SOUNDS.attacksounds + "sound_lightningstart.mp3", "lightningfire": SOUNDS.attacksounds + "sound_lightningfire.mp3", "lightningend": SOUNDS.attacksounds + "sound_lightningend.mp3", "chaching": SOUNDS.uisounds + "sound_chaching.mp3", "pebblebomb": SOUNDS.attacksounds + "sound_pebblebomb.mp3", "twigbomb": SOUNDS.attacksounds + "sound_twigbomb.mp3", "puttybomb": SOUNDS.attacksounds + "sound_puttybomb.mp3", "trap": SOUNDS.attacksounds + "sound_trap.mp3", "damage1": SOUNDS.attacksounds + "building_damage_1.mp3", "damage2": SOUNDS.attacksounds + "building_damage_2.mp3", "damage3": SOUNDS.attacksounds + "building_damage_3.mp3", "destroy1": SOUNDS.attacksounds + "building_destroy_1.mp3", "destroy2": SOUNDS.attacksounds + "building_destroy_2.mp3", "destroy3": SOUNDS.attacksounds + "building_destroy_3.mp3", "destroy4": SOUNDS.attacksounds + "building_destroy_4.mp3", "destroytownhall": SOUNDS.attacksounds + "town_hall_destroy.mp3", "monsterland1": SOUNDS.attacksounds + "monster_land_1.mp3", "monsterland2": SOUNDS.attacksounds + "monster_land_2.mp3", "monsterland3": SOUNDS.attacksounds + "monster_land_3.mp3", "monsterlanddave": SOUNDS.attacksounds + "monster_land_dave.mp3", "hit1": SOUNDS.attacksounds + "sound_hit1.mp3", "hit2": SOUNDS.attacksounds + "sound_hit2.mp3", "hit3": SOUNDS.attacksounds + "sound_hit3.mp3", "hit4": SOUNDS.attacksounds + "sound_hit4.mp3", "hit5": SOUNDS.attacksounds + "sound_hit5.mp3", "ihit1": SOUNDS.infernosounds + "sound_ihit1.mp3", "ihit2": SOUNDS.infernosounds + "sound_ihit2.mp3", "ihit3": SOUNDS.infernosounds + "sound_ihit3.mp3", "ihit4": SOUNDS.infernosounds + "sound_ihit4.mp3", "ihit5": SOUNDS.infernosounds + "sound_ihit5.mp3", "ihit6": SOUNDS.infernosounds + "sound_ihit6.mp3", "ihit7": SOUNDS.infernosounds + "sound_ihit7.mp3", "ihit8": SOUNDS.infernosounds + "sound_ihit8.mp3", "imonster1": SOUNDS.infernosounds + "inferno_monster1.mp3", "imonster2": SOUNDS.infernosounds + "inferno_monster2.mp3", "imonster3": SOUNDS.infernosounds + "inferno_monster3.mp3", "imonster4": SOUNDS.infernosounds + "inferno_monster4.mp3", "iquestshow": SOUNDS.infernosounds + "inferno_questshow.mp3", "iquesthide": SOUNDS.infernosounds + "inferno_questhide.mp3", "inf_buildingplace": SOUNDS.infernosounds + "sound_infernoplace.mp3", "ibankfire": SOUNDS.infernosounds + "sound_ibankfire.mp3", "ibankland": SOUNDS.infernosounds + "sound_ibankland.mp3", "icannon": SOUNDS.infernosounds + "inferno_cannonfire.mp3", "isniper": SOUNDS.infernosounds + "inferno_sniperfire.mp3", "arise": SOUNDS.attacksounds + "wormzer_arise.mp3", "dig": SOUNDS.attacksounds + "wormzer_dig.mp3", "bunkerdoor": SOUNDS.attacksounds + "bunkerdoor.mp3", "pumpkintreat": SOUNDS.othersounds + "sound_pumpkin_treat.mp3", "musicattack": SOUNDS.mainmusic + "Music_Attack.mp3", "musicbuild": SOUNDS.mainmusic + "Music_Building.mp3", "musicpanic": SOUNDS.mainmusic + "Music_UnderAttack.mp3", "musiciattack": SOUNDS.infernomusic + "Music_IAttack.mp3", "musicibuild": SOUNDS.infernomusic + "Music_IBuild.mp3", "musicipanic": SOUNDS.infernomusic + "Music_IDefense.mp3" };
            SOUNDS.music_volumes = { "musicattack": 0.7, "musicbuild": 0.6, "musicpanic": 0.7, "musicibuild": 0.6, "musicipanic": 0.7, "musiciattack": 0.7 };
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        let key: string = null;
        if (!SOUNDS._setup) {
            SOUNDS._setup = true;
            if (SOUNDS._mutedMusic == 0) {
                SOUNDS._musicVolume = 0.7;
            } else {
                SOUNDS._musicVolume = 0;
            }
            // (Inferno-only, QoL #609: the mute buttons' choice is kept in this browser, from wherever it was made)
            let kept: any = GLOBAL.INFERNO_ONLY ? SOUNDS.ioKeptMute() : null;
            if (kept ? kept.snd == 1 : GLOBAL.StatGet("mute") == 1) {
                SOUNDS.MuteUnmute(true);
            }
            if (kept ? kept.music == 1 : GLOBAL.StatGet("mutemusic") == 1) {
                SOUNDS.MuteUnmute(true, "music");
            }
            try {
                if (GLOBAL.INFERNO_ONLY) {
                    // (Inferno-only, QoL #238: the sounds are no longer all asked for here, as the first yard appears: 3.6 MB
                    // that competed with the yard's pictures. The table keeps their paths; a sound's file is asked for
                    // the first time it plays (ioSound), and the effects all come in a few seconds after the yard, two at
                    // a time (ioStartLoading). Music is loaded only when a track plays (one of the six). While the
                    // sounds are muted, none is loaded (unmuting starts it); while the music is, no track.)
                    // (the siege weapons' sounds, played by their paths: in the table, so they load with the rest)
                    for (let path of ["othersounds/decoyExplosionSound.mp3", "othersounds/decoyLoopingSound.mp3", "othersounds/decoyLandSound.mp3", "othersounds/glass_cracking_1.mp3", "othersounds/glass_cracking_2.mp3", "othersounds/glass_cracking_3.mp3", "othersounds/glass_explode_1.mp3", "othersounds/glass_explode_2.mp3", "othersounds/jar_land_2.mp3", "othersounds/vacuumstart.mp3", "othersounds/vacuumloop.mp3", "othersounds/vacuumbroken.mp3", "othersounds/vacuumloopoff.mp3"]) {
                        SOUNDS._sounds[path] = path;
                    }
                    SOUNDS.ioStartLoading();
                } else {
                    for (key in SOUNDS._sounds) {
                        if (key == "click1") {
                            continue;
                        }

                        // Comment: Preload the audio from the server
                        SOUNDS._sounds[key] = new Sound(new URLRequest(GLOBAL._soundPathURL + SOUNDS._sounds[key]));
                    }
                }
            } catch (e) {
                GLOBAL.Message("There was a problem setting up audio " + e.message);
            }
        }
    }

    public static DamageSoundIDForLevel(param1: int): string {
        let _loc2_: string = "";
        if (param1 < 3) {
            _loc2_ = "damage1";
        } else if (param1 < 6) {
            _loc2_ = "damage2";
        } else {
            _loc2_ = "damage3";
        }
        return _loc2_;
    }

    public static DestroySoundIDForLevel(param1: int): string {
        let _loc2_: string = "";
        if (param1 < 2) {
            _loc2_ = "destroy1";
        } else if (param1 < 5) {
            _loc2_ = "destroy2";
        } else if (param1 < 8) {
            _loc2_ = "destroy3";
        } else {
            _loc2_ = "destroy4";
        }
        return _loc2_;
    }

    public static PlayMusic(param1: string = ""): void {
        SOUNDS._queuedMusic = param1;
        if (!SOUNDS._mutedMusic) {
            SOUNDS._musicVolume = Number(SOUNDS.music_volumes[param1]);
        }
    }

    public static PlayMusicB(param1: string = "", param2: number = 0.7, param3: number = 0, param4: number = 0): void {
        if (SOUNDS._currentMusic == param1) {
            return;
        }
        // (Inferno-only, QoL #238: a track not loaded yet isn't loaded while the music is off; the queued track starts
        // once it is switched on, from Tick)
        if (GLOBAL.INFERNO_ONLY && SOUNDS._mutedMusic && !as3.as(SOUNDS._sounds[param1], Sound)) {
            return;
        }
        if (!SOUNDS._concurrent[param1]) {
            SOUNDS._concurrent[param1] = 1;
        }
        if (SOUNDS._concurrent[param1] <= 2) {
            SOUNDS._concurrent[param1] += 1;

            // Retrieve music from preloaded assets
            // (Inferno-only, QoL #238: loaded now, the first time it plays; it starts when it is in)
            let sound: Sound = GLOBAL.INFERNO_ONLY ? SOUNDS.ioSound(param1) : as3.as(SOUNDS._sounds[param1], Sound);
            if (sound) {
                if (SOUNDS._musicChannel) {
                    // (Inferno-only, QoL #613: where the track that stops was, to go on from there next time)
                    if (GLOBAL.INFERNO_ONLY && SOUNDS._currentMusic) {
                        try {
                            SOUNDS._ioMusicAt[SOUNDS._currentMusic] = SOUNDS._musicChannel.position;
                        } catch (e) {
                        }
                    }
                    try {
                        SOUNDS._musicChannel.stop();
                    } catch (e) {
                    }
                    SOUNDS._musicChannel.removeEventListener(Event.SOUND_COMPLETE, SOUNDS.replayMusic);
                }
                // Played once and restarted by replayMusic when it ends. Asking for int.MAX_VALUE loops made
                // the browser runtime compute an invalid stop time and throw, which left _musicChannel null.
                // A sound can also fail to start (Flash returns null when it is out of channels).
                // (Inferno-only, QoL #231: at the page's Music volume)
                if (GLOBAL.INFERNO_ONLY) {
                    param2 *= GLOBAL.ioVolume("music");
                }
                // (Inferno-only, QoL #613: a track comes back where it was, after an attack or a run; QoL #614: and
                // loops without the gap a restart on SOUND_COMPLETE left, about 0.2 s every minute)
                let ioLoops: int = 1;
                if (GLOBAL.INFERNO_ONLY) {
                    let at: number = Number(SOUNDS._ioMusicAt[param1]) || 0;
                    delete SOUNDS._ioMusicAt[param1];
                    // (not while the browser still holds sound back: a single play from there would be left out)
                    if (param4 == 0 && at > 0 && sound.length > 0 && ioAudioRunning()) {
                        param4 = at % sound.length;
                    }
                    ioLoops = param4 > 0 ? 1 : 1000;
                }
                try {
                    SOUNDS._musicChannel = sound.play(param4, ioLoops, new SoundTransform(param2, param3));
                } catch (e) {
                    SOUNDS._musicChannel = null;
                }
                SOUNDS._currentMusic = param1;
                if (SOUNDS._musicChannel) {
                    SOUNDS._musicChannel.addEventListener(Event.SOUND_COMPLETE, SOUNDS.replayMusic);
                }
            }
        }
    }

    /** QoL #635: when the last notification sound played (getTimer). */
    private static _ioNotifiedAt: number = -10000;

    /**
     * Inferno-only (QoL #635): a short sound for a mention in chat, a letter or a quest ready to collect, when the
     * page's settings ask for it (Notification sounds, off by default); at most one every 3 seconds.
     */
    public static ioNotify(kind: string): boolean {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.ioPageSettings.notifySounds !== true || getTimer() - SOUNDS._ioNotifiedAt < 3000) {
            return false;
        }
        SOUNDS._ioNotifiedAt = getTimer();
        SOUNDS.Play(kind == "quest" ? "iquestshow" : "purchasepopup", 0.7);
        return true;
    }

    /** QoL #613: where each music track was when it last stopped (ms). */
    private static _ioMusicAt: any = {};

    private static replayMusic(param1: Event): void {
        SOUNDS._queuedMusic = SOUNDS._currentMusic;
        SOUNDS._currentMusic = null;
        // At the music's own volume: _musicVolume is 0 while the music is switched off. Without it the
        // replay used PlayMusicB's default (0.7), so switched-off music came back at every new loop.
        SOUNDS.PlayMusicB(SOUNDS._queuedMusic, SOUNDS._musicVolume, SOUNDS._musicPan);
    }

    /** QoL #631: the interface's own sounds (buttons, windows), which "Interface clicks" turns off. */
    public static readonly IO_CLICKS: any = { "click1": true, "close": true, "buttonclick": true };

    public static Play(soundPath: string = "", volume: number = 0.8, pan: number = 0, loop: int = 1): SoundChannel {
        if (!GLOBAL._catchup && !SOUNDS._muted) {
            // (Inferno-only, QoL #631: the page's settings can turn the interface's clicks off)
            if (GLOBAL.INFERNO_ONLY && SOUNDS.IO_CLICKS[soundPath] && GLOBAL.ioPageSettings.clicks === false) {
                return null;
            }
            // (QoL #615: the last two of the 32 channels are kept for the music: in a big attack every one was taken
            // and the music, once it ended, couldn't start again)
            if (GLOBAL.INFERNO_ONLY && ioChannelsPlaying() >= 30) {
                return null;
            }
            if (!SOUNDS._concurrent[soundPath] || SOUNDS._concurrent[soundPath] <= 2) {
                SOUNDS._concurrent[soundPath] = (SOUNDS._concurrent[soundPath] || 0) + 1;

                // Retrieve sound from preloaded assets
                // (Inferno-only, QoL #238: one whose file wasn't asked for yet is asked for now, and plays when it is in)
                let sound: Sound = GLOBAL.INFERNO_ONLY ? SOUNDS.ioSound(soundPath) : as3.as(SOUNDS._sounds[soundPath], Sound);
                if (!sound && GLOBAL.INFERNO_ONLY && soundPath) {
                    sound = SOUNDS.ioFind(soundPath);
                }
                // (Inferno-only, QoL #627: at most IO_MAX_COPIES of one sound at a time (a big battle stacked dozens of
                // the same hit); loops are the game's own business)
                if (sound && GLOBAL.INFERNO_ONLY && loop <= 1 && sound.ioPlaying >= SOUNDS.IO_MAX_COPIES) {
                    return null;
                }
                if (sound) {
                    // (Inferno-only, QoL #231: at the page's Effects volume)
                    if (GLOBAL.INFERNO_ONLY) {
                        volume *= GLOBAL.ioVolume("effects");
                    }
                    try {
                        return sound.play(0, loop, new SoundTransform(volume, pan));
                    } catch (e) {
                    }
                }
            }
        }
        return null;
    }

    /** QoL #627: how many copies of one sound may play at once. */
    public static readonly IO_MAX_COPIES: int = 4;

    /** QoL #627: how far to the side a sound at the screen's edge is heard (1: all the way). */
    public static readonly IO_PAN: number = 0.7;

    /**
     * Inferno-only (QoL #627): a sound made somewhere in the yard (x, y in the map's coordinates, as a monster's or a
     * building's): heard from the side of the screen it is on, and quieter when it is off the screen (at 60% just past
     * the edge, down to 25% a screen's width away). Elsewhere (or no map): Play.
     */
    public static ioPlayAt(soundPath: string, volume: number, x: number, y: number, loop: int = 1): SoundChannel {
        let pan: number = 0;
        // (Inferno-only, 21 October: one Play would turn away (all channels taken, or this sound already playing as often
        // as it may) isn't placed on the screen first: thousands of monsters' hits asked)
        if (GLOBAL.INFERNO_ONLY && (GLOBAL._catchup || SOUNDS._muted || SOUNDS._concurrent[soundPath] > 2 || ioChannelsPlaying() >= 30)) {
            return null;
        }
        if (GLOBAL.INFERNO_ONLY) {
            try {
                let ground: any = MAP._GROUND;
                let st: any = ground ? ground.stage : null;
                let w: number = st ? Number(st.stageWidth) : 0;
                let h: number = st ? Number(st.stageHeight) : 0;
                if (w > 0 && h > 0 && isFinite(x) && isFinite(y)) {
                    let p: Point = ground.localToGlobal(new Point(x, y));
                    pan = Math.max(-1, Math.min(1, p.x / w * 2 - 1)) * SOUNDS.IO_PAN;
                    let dx: number = p.x < 0 ? -p.x : (p.x > w ? p.x - w : 0);
                    let dy: number = p.y < 0 ? -p.y : (p.y > h ? p.y - h : 0);
                    if (dx > 0 || dy > 0) {
                        let off: number = Math.sqrt(dx * dx + dy * dy) / Math.max(w, h);
                        volume *= Math.max(0.25, 0.6 * (1 - off));
                    }
                }
            } catch (e) {
                pan = 0;
            }
        }
        return SOUNDS.Play(soundPath, volume, pan, loop);
    }

    /**
     * Inferno-only (QoL #616): the files' own levels. Measured on the files (integrated loudness, EBU R128; the
     * shortest by their mean), the effects louder than about -19 LUFS (the Inferno music's own level) are brought
     * down to it, at most to 35%; the overworld's three tracks to the Inferno music's -20. So an Inferno hit isn't
     * 5-11 dB over the music any more, and every caller's volume (an arcade hit's 0.8-0.9, a monster's 0.1-0.2) keeps
     * its meaning. Files not here play as recorded. Sound.ioLevel (flash.media) applies it under the game's volumes.
     */
    public static readonly IO_LEVELS: any = {
        "attacksounds/building_destroy_4.mp3": 0.59, "attacksounds/monster_land_dave.mp3": 0.75, "attacksounds/sound_laser.mp3": 0.67,
        "attacksounds/sound_pebblebomb.mp3": 0.72, "attacksounds/sound_railgun1.mp3": 0.74, "attacksounds/sound_splash1.mp3": 0.71,
        "attacksounds/sound_warcry1.mp3": 0.66, "attacksounds/town_hall_destroy.mp3": 0.66, "attacksounds/wormzer_arise.mp3": 0.56,
        "infernosounds/inferno_cannonfire.mp3": 0.51, "infernosounds/inferno_monster1.mp3": 0.68, "infernosounds/inferno_monster2.mp3": 0.79,
        "infernosounds/inferno_monster3.mp3": 0.59, "infernosounds/inferno_monster4.mp3": 0.71, "infernosounds/inferno_sniperfire.mp3": 0.46,
        "infernosounds/sound_ibankfire.mp3": 0.83, "infernosounds/sound_ihit1.mp3": 0.49, "infernosounds/sound_ihit2.mp3": 0.58,
        "infernosounds/sound_ihit3.mp3": 0.52, "infernosounds/sound_ihit4.mp3": 0.48, "infernosounds/sound_ihit5.mp3": 0.58,
        "infernosounds/sound_ihit6.mp3": 0.51, "infernosounds/sound_ihit7.mp3": 0.5, "infernosounds/sound_ihit8.mp3": 0.54,
        "infernosounds/sound_infernoplace.mp3": 0.54, "infernosounds/sound_magma_attack1.mp3": 0.72, "infernosounds/sound_magma_attack2.mp3": 0.63,
        "infernosounds/sound_quake_attack.mp3": 0.51,
        "music/Music_Attack.mp3": 0.51, "music/Music_Building.mp3": 0.68, "music/Music_UnderAttack.mp3": 0.24,
        "othersounds/decoyLandSound.mp3": 0.57, "othersounds/jar_land_2.mp3": 0.52, "othersounds/sound_juice.mp3": 0.57,
        "othersounds/sound_levelup.mp3": 0.6, "othersounds/sound_pumpkin_large.mp3": 0.37, "othersounds/sound_pumpkin_spinagain.mp3": 0.71,
        "othersounds/sound_pumpkin_treat.mp3": 0.61, "othersounds/vacuumbroken.mp3": 0.7,
        "uisounds/sound_buildingplace.mp3": 0.42, "uisounds/sound_shotgun.mp3": 0.64,
    };

    /** QoL #616: a file's level (its path under the sounds folder), 1 when it isn't in the table. */
    public static ioLevelOf(path: string): number {
        let g: any = SOUNDS.IO_LEVELS[path];
        return g != null ? Number(g) : 1;
    }

    /**
     * Inferno-only (QoL #238): the table's sound by its name: made (and its file asked for) the first time, once the
     * sounds are set up; null for a name the table doesn't have.
     */
    private static ioSound(key: string): Sound {
        let v: any = SOUNDS._sounds[key];
        if (typeof v == "string" && SOUNDS._setup) {
            let made: Sound = new Sound(new URLRequest(GLOBAL._soundPathURL + v));
            made.ioLevel = SOUNDS.ioLevelOf(v);
            SOUNDS._sounds[key] = made;
            return made;
        }
        return as3.as(v, Sound);
    }

    /** QoL #238: how long after the first yard the effects start loading (ms), and how many load at once. */
    public static readonly IO_LOAD_DELAY: int = 4000;

    public static readonly IO_LOAD_AT_ONCE: int = 2;

    /** QoL #238: the effects still to load (their names), null when none is planned; and how many are on the way. */
    private static _ioQueue: any[] = null;

    private static _ioLoading: int = 0;

    /**
     * Inferno-only (QoL #238): plans the effects' loading, a few seconds from now, unless the sounds are muted (then
     * unmuting does it). The music isn't in it: a track loads when it plays.
     */
    public static ioStartLoading(): void {
        if (!GLOBAL.INFERNO_ONLY || !SOUNDS._setup || SOUNDS._muted || SOUNDS._ioQueue) {
            return;
        }
        let q: any[] = [];
        for (let key in SOUNDS._sounds) {
            if (typeof SOUNDS._sounds[key] == "string" && key.indexOf("music") != 0) {
                q.push(key);
            }
        }
        SOUNDS._ioQueue = q;
        setTimeout(SOUNDS.ioPump, SOUNDS.IO_LOAD_DELAY);
    }

    /** QoL #238: starts the next effects' files, IO_LOAD_AT_ONCE at a time; muted meanwhile: stops (unmuting plans it again). */
    private static ioPump(): void {
        let q: any[] = SOUNDS._ioQueue;
        if (!q) {
            return;
        }
        if (SOUNDS._muted) {
            SOUNDS._ioQueue = null;
            return;
        }
        while (SOUNDS._ioLoading < SOUNDS.IO_LOAD_AT_ONCE && q.length > 0) {
            let key: string = String(q.shift());
            // (asked for meanwhile, by a sound that played: already on its way)
            if (typeof SOUNDS._sounds[key] != "string") {
                continue;
            }
            let made: Sound = SOUNDS.ioSound(key);
            if (made) {
                SOUNDS._ioLoading++;
                made.addEventListener(Event.COMPLETE, SOUNDS.ioLoaded);
                made.addEventListener(IOErrorEvent.IO_ERROR, SOUNDS.ioLoaded);
            }
        }
    }

    private static ioLoaded(param1: Event): void {
        let made: Sound = as3.as(param1.target, Sound);
        if (made) {
            made.removeEventListener(Event.COMPLETE, SOUNDS.ioLoaded);
            made.removeEventListener(IOErrorEvent.IO_ERROR, SOUNDS.ioLoaded);
        }
        SOUNDS._ioLoading = Math.max(0, SOUNDS._ioLoading - 1) | 0;
        SOUNDS.ioPump();
    }

    /**
     * Inferno-only (QoL #637): a sound cut short: played, then faded out over 0.3 s after `ms` (Repair all's hammering
     * is 11.7 s long). Elsewhere: Play.
     */
    public static ioPlayFor(soundPath: string, volume: number, ms: int): SoundChannel {
        let ch: SoundChannel = SOUNDS.Play(soundPath, volume);
        if (!ch || !GLOBAL.INFERNO_ONLY) {
            return ch;
        }
        let start: number = ch.soundTransform ? ch.soundTransform.volume : volume;
        setTimeout((): void => {
            let step: int = 0;
            let fade: Function = (): void => {
                step++;
                try {
                    if (step >= 6) {
                        ch.stop();
                        return;
                    }
                    ch.soundTransform = new SoundTransform(start * (1 - step / 6));
                } catch (e) {
                    return;
                }
                setTimeout(fade, 50);
            };
            fade();
        }, ms);
        return ch;
    }

    /**
     * Inferno-only (QoL #610, #611, 14 October): sounds asked for by a name the table doesn't have. The Candy Jars',
     * the Decoy's and the vacuum's are played by their file's path (othersounds/...mp3): loaded the first time,
     * then kept. Hellgate's names that never existed play the nearest real sound. Any other unknown name is noted
     * once in the console.
     */
    private static readonly IO_ALIASES: any = { "upgrade1": "repair1", "explosion": "destroy2" };

    private static _ioUnknown: any = {};

    private static ioFind(name: string): Sound {
        if (SOUNDS.IO_ALIASES[name]) {
            return as3.as(SOUNDS._sounds[SOUNDS.IO_ALIASES[name]], Sound);
        }
        if (/^[a-z]+sounds\/[A-Za-z0-9_]+\.mp3$/.test(name)) {
            try {
                let made: Sound = new Sound(new URLRequest(GLOBAL._soundPathURL + name));
                made.ioLevel = SOUNDS.ioLevelOf(name); // (QoL #616)
                SOUNDS._sounds[name] = made;
                return made;
            } catch (e) {
            }
        }
        if (!SOUNDS._ioUnknown[name]) {
            SOUNDS._ioUnknown[name] = true;
            console.info("SOUNDS: no sound called " + name);
        }
        return null;
    }

    public static Tick(): void {
        for (let soundName in SOUNDS._concurrent) {
            if (SOUNDS._concurrent[soundName] > 0) {
                SOUNDS._concurrent[soundName]--;
            }
        }
        // (Inferno-only, QoL #231: the playing music follows the Music slider as it moves)
        if (GLOBAL.INFERNO_ONLY && SOUNDS._musicChannel && SOUNDS._currentMusic && SOUNDS._currentMusic == SOUNDS._queuedMusic) {
            let want: number = SOUNDS._musicVolume * GLOBAL.ioVolume("music");
            if (Math.abs(SOUNDS._musicChannel.soundTransform.volume - want) > 0.01) {
                SOUNDS._musicChannel.soundTransform = new SoundTransform(want, SOUNDS._musicPan);
            }
        }
        if (SOUNDS._currentMusic != SOUNDS._queuedMusic) {
            if (SOUNDS._currentMusic && SOUNDS._musicChannel) {
                let currentMusicVolume: number = SOUNDS._musicChannel.soundTransform.volume;
                currentMusicVolume -= 0.05;
                if (currentMusicVolume <= 0) {
                    SOUNDS.PlayMusicB(SOUNDS._queuedMusic, SOUNDS._musicVolume, SOUNDS._musicPan);
                } else {
                    SOUNDS._musicChannel.soundTransform = new SoundTransform(currentMusicVolume, SOUNDS._musicPan);
                }
            } else {
                SOUNDS.PlayMusicB(SOUNDS._queuedMusic, SOUNDS._musicVolume, SOUNDS._musicPan);
            }
        }
    }

    /** Inferno-only (QoL #626): the music stops (the Oops window, a reload): it went on looping, the battle track too. */
    public static ioStopMusic(): void {
        try {
            if (SOUNDS._musicChannel) {
                SOUNDS._musicChannel.removeEventListener(Event.SOUND_COMPLETE, SOUNDS.replayMusic);
                SOUNDS._musicChannel.stop();
            }
        } catch (e) {
        }
        SOUNDS._musicChannel = null;
        SOUNDS._queuedMusic = null;
        SOUNDS._currentMusic = null;
    }

    public static TutorialStopMusic(): void {
        SOUNDS.MuteUnmute(true, "music");
        SOUNDS._queuedMusic = null;
        SOUNDS._currentMusic = null;
    }

    public static StopAll(): void {
        SoundMixer.stopAll();
    }

    public static Toggle(param1: MouseEvent = null): void {
        let e: MouseEvent = param1;
        try {
            if (SOUNDS._muted == 0) {
                SOUNDS.MuteUnmute(true);
            } else {
                SOUNDS.MuteUnmute(false);
            }
            if (GLOBAL.INFERNO_ONLY) {
                SOUNDS.ioKeepMute();
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.StatSet("mute", SOUNDS._muted);
            }
        } catch (e) {
            GLOBAL.Message("There was a problem turning sounds on ");
        }
    }

    public static ToggleMusic(param1: MouseEvent = null): void {
        let e: MouseEvent = param1;
        try {
            if (SOUNDS._mutedMusic == 0) {
                SOUNDS.MuteUnmute(true, "music");
            } else {
                SOUNDS.MuteUnmute(false, "music");
            }
            if (GLOBAL.INFERNO_ONLY) {
                SOUNDS.ioKeepMute();
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.StatSet("mutemusic", SOUNDS._mutedMusic);
            }
        } catch (e) {
            GLOBAL.Message("There was a problem turning the music on ");
        }
    }

    /** QoL #609: where the mute buttons' choice is kept (this browser; it was the yard's save, made only at home). */
    public static readonly IO_MUTE_KEY: string = "bymr-mute";

    /** {snd, music} (1 muted), or null when nothing is kept here yet. */
    public static ioKeptMute(): any {
        try {
            let raw: string = window.localStorage.getItem(SOUNDS.IO_MUTE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    public static ioKeepMute(): void {
        try {
            window.localStorage.setItem(SOUNDS.IO_MUTE_KEY, JSON.stringify({ "snd": SOUNDS._muted | 0, "music": SOUNDS._mutedMusic | 0 }));
        } catch (e) {
        }
    }

    public static MuteUnmute(param1: boolean = true, param2: string = "snd"): void {
        let _loc3_: SoundTransform = null;
        if (param2 == "snd") {
            if (param1) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcSound.gotoAndStop(2 + 2);
                } else {
                    UI2._top.mcSound.gotoAndStop(2);
                }
                SOUNDS._muted = 1;
            } else {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcSound.gotoAndStop(1 + 2);
                } else {
                    UI2._top.mcSound.gotoAndStop(1);
                }
                SOUNDS._muted = 0;
                // (Inferno-only, QoL #238: the effects weren't loaded while muted: now they are)
                if (GLOBAL.INFERNO_ONLY) {
                    SOUNDS.ioStartLoading();
                }
            }
        } else if (param2 == "music") {
            _loc3_ = new SoundTransform();
            if (param1) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcMusic.gotoAndStop(2 + 2);
                } else {
                    UI2._top.mcMusic.gotoAndStop(2);
                }
                SOUNDS._musicVolume = 0;
                SOUNDS._mutedMusic = 1;
            } else {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    UI2._top.mcMusic.gotoAndStop(1 + 2);
                } else {
                    UI2._top.mcMusic.gotoAndStop(1);
                }
                SOUNDS._musicVolume = 0.7;
                SOUNDS._mutedMusic = 0;
                // (Inferno-only, QoL #633: the Inferno's own tracks, at their own volume; it could start the
                // overworld's build music at 0.7)
                if (GLOBAL.INFERNO_ONLY) {
                    let attacking: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK;
                    let track: string = SOUNDS._currentMusic || SOUNDS._queuedMusic || (attacking ? "musicipanic" : "musicibuild");
                    if (SOUNDS.music_volumes[track] != null) {
                        SOUNDS._musicVolume = Number(SOUNDS.music_volumes[track]);
                    }
                    if (SOUNDS._currentMusic == null && SOUNDS._queuedMusic == null) {
                        SOUNDS.PlayMusic(track);
                    }
                } else if (SOUNDS._currentMusic == null && SOUNDS._queuedMusic == null) {
                    switch (GLOBAL.mode) {
                        case GLOBAL.e_BASE_MODE.ATTACK:
                        case GLOBAL.e_BASE_MODE.WMATTACK:
                            SOUNDS.PlayMusic("musicattack");
                            break;
                        case GLOBAL.e_BASE_MODE.BUILD:
                        case GLOBAL.e_BASE_MODE.HELP:
                        case GLOBAL.e_BASE_MODE.VIEW:
                        default:
                            SOUNDS.PlayMusic("musicbuild");
                    }
                }
            }
            _loc3_.volume = SOUNDS._musicVolume * (GLOBAL.INFERNO_ONLY ? GLOBAL.ioVolume("music") : 1);
            if (SOUNDS._musicChannel) {
                SOUNDS._musicChannel.soundTransform = _loc3_;
            }
        }
    }
}
