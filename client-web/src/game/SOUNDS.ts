import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, MouseEvent } from "flash/events";
import { Sound, SoundChannel, SoundMixer, SoundTransform } from "flash/media";
import { URLRequest } from "flash/net";
import { GLOBAL, UI2, sound_click1 } from "@game";

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
            if (GLOBAL.StatGet("mute") == 1) {
                SOUNDS.MuteUnmute(true);
            }
            if (GLOBAL.StatGet("mutemusic") == 1) {
                SOUNDS.MuteUnmute(true, "music");
            }
            try {
                for (key in SOUNDS._sounds) {
                    if (key == "click1") {
                        continue;
                    }

                    // Comment: Preload the audio from the server
                    SOUNDS._sounds[key] = new Sound(new URLRequest(GLOBAL._soundPathURL + SOUNDS._sounds[key]));
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
        if (!SOUNDS._concurrent[param1]) {
            SOUNDS._concurrent[param1] = 1;
        }
        if (SOUNDS._concurrent[param1] <= 2) {
            SOUNDS._concurrent[param1] += 1;

            // Retrieve music from preloaded assets
            let sound: Sound = as3.as(SOUNDS._sounds[param1], Sound);
            if (sound) {
                if (SOUNDS._musicChannel) {
                    try {
                        SOUNDS._musicChannel.stop();
                    } catch (e) {
                    }
                    SOUNDS._musicChannel.removeEventListener(Event.SOUND_COMPLETE, SOUNDS.replayMusic);
                }
                // Played once and restarted by replayMusic when it ends. Asking for int.MAX_VALUE loops made
                // the browser runtime compute an invalid stop time and throw, which left _musicChannel null.
                // A sound can also fail to start (Flash returns null when it is out of channels).
                try {
                    SOUNDS._musicChannel = sound.play(param4, 1, new SoundTransform(param2, param3));
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

    private static replayMusic(param1: Event): void {
        SOUNDS._queuedMusic = SOUNDS._currentMusic;
        SOUNDS._currentMusic = null;
        // At the music's own volume: _musicVolume is 0 while the music is switched off. Without it the
        // replay used PlayMusicB's default (0.7), so switched-off music came back at every new loop.
        SOUNDS.PlayMusicB(SOUNDS._queuedMusic, SOUNDS._musicVolume, SOUNDS._musicPan);
    }

    public static Play(soundPath: string = "", volume: number = 0.8, pan: number = 0, loop: int = 1): SoundChannel {
        if (!GLOBAL._catchup && !SOUNDS._muted) {
            if (!SOUNDS._concurrent[soundPath] || SOUNDS._concurrent[soundPath] <= 2) {
                SOUNDS._concurrent[soundPath] = (SOUNDS._concurrent[soundPath] || 0) + 1;

                // Retrieve sound from preloaded assets
                let sound: Sound = as3.as(SOUNDS._sounds[soundPath], Sound);
                if (sound) {
                    try {
                        return sound.play(0, loop, new SoundTransform(volume, pan));
                    } catch (e) {
                    }
                }
            }
        }
        return null;
    }

    public static Tick(): void {
        for (let soundName in SOUNDS._concurrent) {
            if (SOUNDS._concurrent[soundName] > 0) {
                SOUNDS._concurrent[soundName]--;
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
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
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
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.StatSet("mutemusic", SOUNDS._mutedMusic);
            }
        } catch (e) {
            GLOBAL.Message("There was a problem turning the music on ");
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
                if (SOUNDS._currentMusic == null && SOUNDS._queuedMusic == null) {
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
            _loc3_.volume = SOUNDS._musicVolume;
            if (SOUNDS._musicChannel) {
                SOUNDS._musicChannel.soundTransform = _loc3_;
            }
        }
    }
}
