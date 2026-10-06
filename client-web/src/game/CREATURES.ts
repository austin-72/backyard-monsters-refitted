import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CHAMPIONCAGE, CREATURELOCKER, ChampionBase, CreepBase, CreepEvent, GLOBAL, MAP, MonsterBase, SPECIALEVENT } from "@game";

export class CREATURES extends ASObject {
    public static _creatures: any = null;

    public static _creatureID: int = 0;

    public static _creatureCount: int = 0;

    public static _ticks: int = 0;

    public static _guardianList: Vector<ChampionBase> = new Vector<ChampionBase>(0, false, ChampionBase);

    public $ctor(): void {
        super.$ctor();
        CREATURES._creatures = {};
        CREATURES._creatureID = 0;
        CREATURES._creatureCount = 0;
        CREATURES._ticks = 0;
        as3.vsetLength(CREATURES._guardianList, 0);
    }

    public static GetProperty(param1: string, param2: string, param3: int = 0, param4: boolean = true): number {
        let stat: any[] = null;
        let checkID: string = null;
        let monsterID: string = param1;
        let statID: string = param2;
        let level: int = param3;
        let friendly: boolean = param4;
        if (!monsterID || monsterID.substr(0, 1) == "G") {
            return 0;
        }
        if (GLOBAL.INFERNO_ONLY && statID == "cTime") {
            return GLOBAL.ioHatchSeconds;
        }
        try {
            try {
                if (monsterID == "C100") {
                    monsterID = "C12";
                }
                // Only for monsters that exist: asking about a made-up id (the hatchery once asked for
                // "IC19") used to leave a junk entry in the player's academy data for good.
                if (!GLOBAL.player.m_upgrades[monsterID] && CREATURELOCKER._creatures[monsterID]) {
                    GLOBAL.player.m_upgrades[monsterID] = { "level": 1 };
                }
                stat = as3.cast(CREATURELOCKER._creatures[monsterID].props[statID], Array);
                if (!stat) {
                    return 0;
                }
                checkID = monsterID;
                if (CREATURELOCKER._creatures[checkID].dependent) {
                    checkID = String(CREATURELOCKER._creatures[checkID].dependent);
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || !friendly) {
                    if (level == 0) {
                        if (!friendly && Boolean(GLOBAL.attackingPlayer)) {
                            if (GLOBAL.attackingPlayer.m_upgrades[checkID] != null) {
                                level = GLOBAL.attackingPlayer.m_upgrades[checkID].level | 0;
                            }
                        } else if (GLOBAL.player.m_upgrades[checkID] != null) {
                            level = GLOBAL.player.m_upgrades[checkID].level | 0;
                        }
                    }
                } else if (level == 0 && GLOBAL.player.m_upgrades[checkID] != null) {
                    let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
                    if (activeEvent.active && !friendly) {
                        level = GLOBAL._wmCreatureLevels[monsterID] | 0;
                    }
                    level = GLOBAL.player.m_upgrades[checkID].level | 0;
                }
                if (stat.length < level) {
                    level = stat.length | 0;
                }
            } catch (e) {
            }
            return Number(stat[level - 1]);
        } catch (e) {
        }
        return 0;
    }

    public static Tick(): void {
        let _loc1_: MonsterBase = null;
        let _loc2_: string = null;
        for (_loc2_ in CREATURES._creatures) {
            _loc1_ = as3.cast(CREATURES._creatures[_loc2_], MonsterBase);
            if (_loc1_.tick()) {
                if (!_loc1_.dying || _loc1_.juiceReady) {
                    _loc1_.die();
                    if (!_loc1_.isDisposable && Boolean(GLOBAL.player.monsterListByID(_loc1_._creatureID))) {
                        GLOBAL.player.monsterListByID(_loc1_._creatureID).unlinkCreepFromData(_loc1_);
                    }
                }
                if (_loc1_.dead) {
                    if (!BYMConfig.instance.RENDERER_ON) {
                        MAP._BUILDINGTOPS.removeChild(_loc1_.graphic);
                    }
                    --CREATURES._creatureCount;
                    delete CREATURES._creatures[_loc2_];
                }
            }
        }
        if (CREATURES._creatureCount <= 0) {
            CREATURES._creatureCount = 0;
        }
    }

    public static Spawn(param1: string, param2: any, param3: string, param4: Point, param5: number, param6: Point = null, param7: BFOUNDATION = null, param8: int = 0, param9: int = 2147483647): MonsterBase {
        let _loc10_: MonsterBase = null;
        let _loc11_: string = null;
        if (!CREATURELOCKER._creatures[param1]) {
            return null;
        }
        ++CREATURES._creatureID;
        ++CREATURES._creatureCount;
        let _loc12_: any = null;
        _loc12_ = CREATURELOCKER._creatures[param1].classType;
        if (!_loc12_) {
            _loc12_ = CreepBase;
        }
        if (!BYMConfig.instance.RENDERER_ON) {
            _loc10_ = as3.cast(new _loc12_(param1, param3, param4, param5, param8, param9, param6, true, param7, 1, false, null), MonsterBase);
            param2.addChild(_loc10_.graphic);
        } else {
            _loc10_ = as3.cast(new _loc12_(param1, param3, param4, param5, param8, param9, param6, true, param7, 1, false, null), MonsterBase);
        }
        CREATURES._creatures[CREATURES._creatureID] = _loc10_;
        if (GLOBAL._render) {
            _loc10_._spawned = true;
        }
        GLOBAL.eventDispatcher.dispatchEvent(new CreepEvent(CreepEvent.DEFENDING_CREEP_SPAWNED, _loc10_));
        return _loc10_;
    }

    public static Clear(): void {
        let _loc1_: MonsterBase = null;
        let _loc2_: string = null;
        let _loc3_: int = 0;
        for (_loc2_ in CREATURES._creatures) {
            _loc1_ = as3.cast(CREATURES._creatures[_loc2_], MonsterBase);
            _loc1_.clear();
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(_loc1_.graphic);
            }
        }
        CREATURES._creatures = {};
        CREATURES._creatureCount = 0;
        _loc3_ = 0;
        while (_loc3_ < CREATURES._guardianList.length) {
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(as3.vget(CREATURES._guardianList, _loc3_).graphic);
            }
            as3.vset(CREATURES._guardianList, _loc3_, null);
            _loc3_++;
        }
        as3.vsetLength(CREATURES._guardianList, 0);
    }

    public static get _hasLivingGuardian(): boolean {
        for (let idx: int = 0; idx < CREATURES._guardianList.length; idx++) {
            if (as3.vget(CREATURES._guardianList, idx) && as3.vget(CREATURES._guardianList, idx).health > 0) {
                return true;
            }
        }
        return false;
    }

    public static get _guardian(): ChampionBase {
        let _loc1_: int = 0;
        while (_loc1_ < CREATURES._guardianList.length) {
            if (Boolean(as3.vget(CREATURES._guardianList, _loc1_)) && CHAMPIONCAGE.isBasicGuardian(as3.vget(CREATURES._guardianList, _loc1_)._creatureID)) {
                return as3.vget(CREATURES._guardianList, _loc1_);
            }
            _loc1_++;
        }
        return null;
    }

    public static get _krallen(): ChampionBase {
        let _loc1_: int = 0;
        while (_loc1_ < CREATURES._guardianList.length) {
            if (Boolean(as3.vget(CREATURES._guardianList, _loc1_)) && as3.vget(CREATURES._guardianList, _loc1_)._creatureID == "G5") {
                return as3.vget(CREATURES._guardianList, _loc1_);
            }
            _loc1_++;
        }
        return null;
    }

    public static getGuardian(param1: int): ChampionBase {
        let _loc2_: int = 0;
        while (_loc2_ < CREATURES._guardianList.length) {
            if ((Number(as3.vget(CREATURES._guardianList, _loc2_)._creatureID.substr(1)) | 0) == param1) {
                return as3.vget(CREATURES._guardianList, _loc2_);
            }
            _loc2_++;
        }
        return null;
    }

    public static getGuardianIndex(param1: int): int {
        let _loc2_: int = 0;
        while (_loc2_ < CREATURES._guardianList.length) {
            if ((Number(as3.vget(CREATURES._guardianList, _loc2_)._creatureID.substr(1)) | 0) == param1) {
                return _loc2_;
            }
            _loc2_++;
        }
        return -1;
    }

    public static set _guardian(param1: ChampionBase) {
        let _loc2_: int = -1;
        let _loc3_: int = 0;
        while (_loc3_ < CREATURES._guardianList.length) {
            if (Boolean(as3.vget(CREATURES._guardianList, _loc3_)) && CHAMPIONCAGE.isBasicGuardian(as3.vget(CREATURES._guardianList, _loc3_)._creatureID)) {
                _loc2_ = _loc3_;
            }
            _loc3_++;
        }
        if (_loc2_ == -1) {
            if (param1) {
                CREATURES._guardianList.unshift(param1);
            }
        } else if (!param1) {
            CREATURES._guardianList.splice(_loc2_, 1);
        } else {
            as3.vset(CREATURES._guardianList, _loc2_, param1);
        }
    }

    public static addGuardian(param1: ChampionBase): boolean {
        let _loc2_: int = -1;
        let _loc3_: int = 0;
        while (_loc3_ < CREATURES._guardianList.length) {
            if (as3.vget(CREATURES._guardianList, _loc3_)._creatureID == param1._creatureID) {
                _loc2_ = _loc3_;
            }
            _loc3_++;
        }
        if (_loc2_ == -1) {
            if (param1) {
                CREATURES._guardianList.push(param1);
                return true;
            }
        }
        return false;
    }

    public static removeGuardianType(param1: int): void {
        let _loc2_: int = 0;
        while (_loc2_ < CREATURES._guardianList.length) {
            if ((Number(as3.vget(CREATURES._guardianList, _loc2_)._creatureID.substr(1)) | 0) == param1) {
                break;
            }
            _loc2_++;
        }
        if (_loc2_ < CREATURES._guardianList.length) {
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(as3.vget(CREATURES._guardianList, _loc2_).graphic);
            }
            if (as3.vget(CREATURES._guardianList, _loc2_) == CREATURES._guardian) {
                CREATURES._guardian = null;
            } else {
                CREATURES._guardianList.splice(_loc2_, 1);
            }
        }
    }

    public static removeAllGuardians(): void {
        let _loc1_: int = CREATURES._guardianList.length | 0;
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_) {
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(as3.vget(CREATURES._guardianList, _loc2_).graphic);
            }
            _loc2_++;
        }
        as3.vsetLength(CREATURES._guardianList, 0);
    }
}
