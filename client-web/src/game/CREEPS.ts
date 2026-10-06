import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BitmapData } from "flash/display";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { ATTACK, BASE, BYMConfig, CHAMPIONCAGE, CREATURELOCKER, ChampionBase, CreepBase, CreepEvent, GLOBAL, Krallen, LOGGER, MAP, MagmaPuddle, MonsterBase, SPRITES, bmp_healthbarsmall } from "@game";

export class CREEPS extends ASObject {
    public static _creeps: any;

    public static m_attackingCreeps: Vector<MonsterBase>;

    public static _creepID: int;

    public static _creepCount: int;

    public static _flungCount: int;

    public static _ticks: int;

    public static _bmdHPbar: BitmapData;

    private static _creepOverlap: any;

    public static _flungGuardian: any[];

    public static _guardianList: Vector<ChampionBase>;

    private static _overlapKeyCache: any;

    private static _cacheHits: int;

    private static _cacheMisses: int;

    private static _lastCacheClear: int;

    // Performance optimization: Batch processing arrays
    private static _aliveCreeps: Vector<MonsterBase>;
    private static _deadCreeps: Vector<string>;
    private static _visibleCreepCount: int;
    private static _overlapProcessingIndex: int;
    private static OVERLAP_BATCH_SIZE: int; // const

    static {
        as3.lazyStatics(this, { _creeps: null, m_attackingCreeps: null, _creepID: 0, _creepCount: 0, _flungCount: 0, _ticks: 0, _bmdHPbar: null, _creepOverlap: null, _flungGuardian: null, _guardianList: null, _overlapKeyCache: null, _cacheHits: 0, _cacheMisses: 0, _lastCacheClear: 0, _aliveCreeps: null, _deadCreeps: null, _visibleCreepCount: 0, _overlapProcessingIndex: 0, OVERLAP_BATCH_SIZE: 0 }, () => {
            CREEPS.m_attackingCreeps = new Vector<MonsterBase>(0, false, MonsterBase);
            CREEPS._bmdHPbar = new bmp_healthbarsmall(0, 0);
            CREEPS._flungGuardian = [];
            CREEPS._guardianList = new Vector<ChampionBase>(0, false, ChampionBase);
            CREEPS._overlapKeyCache = {};
            CREEPS._cacheHits = 0;
            CREEPS._cacheMisses = 0;
            CREEPS._lastCacheClear = 0;
            CREEPS._aliveCreeps = new Vector<MonsterBase>(0, false, MonsterBase);
            CREEPS._deadCreeps = new Vector<string>(0, false, String);
            CREEPS._visibleCreepCount = 0;
            CREEPS._overlapProcessingIndex = 0;
            CREEPS.OVERLAP_BATCH_SIZE = 10;
        });
    }

    public $ctor(): void {
        super.$ctor();
        CREEPS._creeps = {};
        as3.vsetLength(CREEPS.m_attackingCreeps, 0);
        CREEPS._creepID = 0;
        CREEPS._creepCount = CREEPS._flungCount = 0;
        CREEPS._ticks = 0;
        CREEPS._creepOverlap = {};
        CREEPS._flungGuardian = new Array();
        as3.vsetLength(CREEPS._guardianList, 0);
    }

    public static get krallen(): Krallen {
        let _loc2_: ChampionBase = null;
        let _loc1_: Vector<ChampionBase> = CREEPS._guardianList;
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_._creatureID === "G5") {
                return as3.as(_loc2_, Krallen);
            }
        }
        return null;
    }

    /*
     * Generates overlap key for creep positioning, using cache to avoid expensive string operations.
     * Caches frequently used position keys to eliminate repeated string concatenations.
     *
     * @param creatureID The creature identifier
     * @param x The x coordinate
     * @param y The y coordinate
     * @return Cached or newly created overlap key string
     */
    private static getOverlapKey(creatureID: string, x: number, y: number): string {
        let gridX: int = (x * 0.5) | 0;
        let gridY: int = (y * 0.5) | 0;

        let cacheKey: string = creatureID + "_" + gridX + "_" + gridY;

        let cachedKey: string = as3.str(CREEPS._overlapKeyCache[cacheKey]);
        if (cachedKey) {
            CREEPS._cacheHits++;
            return cachedKey;
        }

        // Cache miss - create the overlap key
        CREEPS._cacheMisses++;
        let overlapKey: string = creatureID + "x" + gridX + "y" + gridY;
        CREEPS._overlapKeyCache[cacheKey] = overlapKey;

        return overlapKey;
    }

    /*
     * Clears the overlap key cache periodically to prevent memory growth.
     */
    private static clearOverlapCache(): void {
        CREEPS._overlapKeyCache = {};
        CREEPS._cacheHits = CREEPS._cacheMisses = 0;
    }

    public static Tick(): void {
        let _loc1_: int = getTimer();
        MagmaPuddle.TickAll();

        // Inferno-only: Clinkerjaw's healing puddles
        // Clear cache periodically to prevent memory bloat
        if (_loc1_ - CREEPS._lastCacheClear > 30000) {
            CREEPS.clearOverlapCache();
            CREEPS._lastCacheClear = _loc1_;
        }

        as3.vsetLength(CREEPS._aliveCreeps, 0);
        as3.vsetLength(CREEPS._deadCreeps, 0);
        CREEPS._visibleCreepCount = 0;

        // Phase 1: Separate alive/dead creeps and tick alive ones
        let creepId: string = null;
        let creep: MonsterBase = null;
        for (creepId in CREEPS._creeps) {
            creep = as3.cast(CREEPS._creeps[creepId], MonsterBase);

            if (!creep) {
                CREEPS._deadCreeps.push(creepId);
                continue;
            }

            // Tick the creep first
            if (creep.tick(1)) {
                if (!creep.dying) {
                    creep.die();
                }
                if (creep.dead) {
                    CREEPS._deadCreeps.push(creepId);
                    continue;
                }
            }

            // Creep is alive, add to processing list
            CREEPS._aliveCreeps.push(creep);
        }

        // Phase 2: Clean up dead creeps (batch operation)
        let deadId: string = null;
        for (deadId of (CREEPS._deadCreeps ?? [])) {
            creep = as3.cast(CREEPS._creeps[deadId], MonsterBase);

            if (!creep) {
                delete CREEPS._creeps[deadId];
                continue;
            }

            if (!BYMConfig.instance.RENDERER_ON) {
                if (creep.graphic) {
                    MAP._BUILDINGTOPS.removeChild(creep.graphic);
                }
            }
            --CREEPS._creepCount;

            if (creep._creatureID && (creep._creatureID.substr(0, 1) == "G" || (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) && !creep.isDisposable)) {
                --CREEPS._flungCount;
                ATTACK._creaturesFlung.Add(-1);
            }
            delete CREEPS._creeps[deadId];
        }

        // Phase 3: Process overlap detection in batches (spread across multiple frames)
        CREEPS.processOverlapBatch();

        if (CREEPS._creepCount <= 0) {
            CREEPS._flungCount = CREEPS._creepCount = 0;
        }

        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            if (ATTACK._creaturesFlung.Get() < CREEPS._flungCount && ATTACK._creaturesFlung.Get() > 0) {
                LOGGER.Log("log", "More creeps than flung creatures");
                GLOBAL.ErrorMessage();
            }
        }
    }

    /*
     * Process overlap detection in small batches to spread CPU load across frames
     */
    private static processOverlapBatch(): void {
        if (CREEPS._aliveCreeps.length == 0) {
            return;
        }

        CREEPS._creepOverlap = {};
        // Reset overlap data
        let processed: int = 0;
        let startIndex: int = CREEPS._overlapProcessingIndex;
        let creep: MonsterBase = null;
        let overlapKey: string = null;

        // Process a batch of creeps
        while (processed < CREEPS.OVERLAP_BATCH_SIZE && CREEPS._overlapProcessingIndex < CREEPS._aliveCreeps.length) {
            creep = as3.vget(CREEPS._aliveCreeps, CREEPS._overlapProcessingIndex);

            if (!creep || !creep._tmpPoint || !creep._creatureID) {
                CREEPS._overlapProcessingIndex++;
                processed++;
                continue;
            }

            overlapKey = CREEPS.getOverlapKey(creep._creatureID, creep._tmpPoint.x, creep._tmpPoint.y);

            if (!CREEPS._creepOverlap[overlapKey]) {
                CREEPS._creepOverlap[overlapKey] = 1;
                if (Boolean(creep._mc) && !creep._mc.visible) {
                    creep._mc.visible = true;
                }
            } else {
                CREEPS._creepOverlap[overlapKey] += 1;
                if (CREEPS._creepOverlap[overlapKey] > 1) {
                    if (Boolean(creep._mc) && creep._mc.visible) {
                        creep._mc.visible = false;
                    }
                } else if (Boolean(creep._mc) && !creep._mc.visible) {
                    creep._mc.visible = true;
                }
            }

            if (Boolean(creep._mc) && creep._mc.visible) {
                CREEPS._visibleCreepCount++;
            }

            CREEPS._overlapProcessingIndex++;
            processed++;
        }

        // Reset index when we've processed all creeps
        if (CREEPS._overlapProcessingIndex >= CREEPS._aliveCreeps.length) {
            CREEPS._overlapProcessingIndex = 0;
        }
    }

    public static Spawn(param1: string, param2: any, param3: string, param4: Point, param5: number, param6: number = 1, param7: boolean = false, param8: boolean = false, param9: int = 0): MonsterBase {
        let _loc9_: MonsterBase = null;
        ++CREEPS._creepID;
        if (!param8) {
            ++CREEPS._flungCount;
        }
        ++CREEPS._creepCount;
        let _loc10_: any = null;
        _loc10_ = CREATURELOCKER._creatures[param1].classType;
        if (!_loc10_) {
            _loc10_ = CreepBase;
        }
        // param9: the monster's level (0: the usual rule, see CREATURES.GetProperty).
        _loc9_ = as3.cast(new _loc10_(param1, param3, param4, param5, param9, int.MAX_VALUE, null, false, null, param6, param7), MonsterBase);
        if (!BYMConfig.instance.RENDERER_ON) {
            param2.addChild(_loc9_.graphic);
        }
        _loc9_.isDisposable = param8;
        CREEPS._creeps[CREEPS._creepID] = _loc9_;
        CREEPS.m_attackingCreeps.push(_loc9_);
        GLOBAL.eventDispatcher.dispatchEvent(new CreepEvent(CreepEvent.ATTACKING_MONSTER_SPAWNED, _loc9_));
        return _loc9_;
    }

    public static SpawnGuardian(param1: int, param2: any, param3: string, param4: int, param5: Point, param6: number, param7: int = 20000, param8: int = 0, param9: int = 0, param10: boolean = false): ChampionBase {
        let _loc13_: int = 0;
        let _loc11_: any = CHAMPIONCAGE.getGuardianSpawnClass(param1);
        ++CREEPS._creepID;
        ++CREEPS._creepCount;
        ++CREEPS._flungCount;
        let _loc12_: ChampionBase = null;
        if (param10) {
            _loc12_ = as3.cast(new _loc11_(param3, param5, 0, null, false, null, param4, 0, 0, param1, param7, param8, param9), ChampionBase);
        } else {
            _loc13_ = GLOBAL.getPlayerGuardianIndex(param1);
            if (as3.vget(GLOBAL._playerGuardianData, _loc13_).status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                _loc12_ = as3.cast(new _loc11_(param3, param5, 0, null, false, null, param4, as3.vget(GLOBAL._playerGuardianData, _loc13_).fd, as3.vget(GLOBAL._playerGuardianData, _loc13_).ft, param1, param7, param8, param9), ChampionBase);
                if (CHAMPIONCAGE.getGuardianClassType(param1) == CHAMPIONCAGE.CLASS_TYPE_BASIC) {
                    CREEPS._guardian = _loc12_;
                } else if (!CREEPS.addGuardian(_loc12_)) {
                    _loc12_ = null;
                }
            }
        }
        if (_loc12_) {
            CREEPS._creeps[CREEPS._creepID] = _loc12_;
            if (!BYMConfig.instance.RENDERER_ON) {
                param2.addChild(_loc12_.graphic);
            }
        }
        GLOBAL.eventDispatcher.dispatchEvent(new CreepEvent(CreepEvent.ATTACKING_MONSTER_SPAWNED, _loc12_));
        return _loc12_;
    }

    public static Retreat(): void {
        let _loc1_: MonsterBase = null;
        for (_loc1_ of as3.values(CREEPS._creeps)) {
            _loc1_.changeModeRetreat();
        }
    }

    public static CreepOverlap(param1: Point, param2: int): boolean {
        let _loc3_: MonsterBase = null;
        let _loc4_: any = null;
        let _loc5_: Point = null;
        let _loc6_: number = NaN;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: int = 0;
        for (_loc3_ of as3.values(CREEPS._creeps)) {
            if (_loc3_._creatureID.substr(0, 1) == "G") {
                _loc4_ = SPRITES._sprites[(as3.as(_loc3_, ChampionBase))._spriteID];
            } else {
                _loc4_ = SPRITES._sprites[_loc3_._creatureID];
            }
            _loc5_ = new Point(_loc3_.x + _loc4_.middle.x, _loc3_.y + _loc4_.middle.y);
            _loc6_ = Math.atan2(param1.y - _loc5_.y, param1.x - _loc5_.x);
            _loc7_ = BASE.EllipseEdgeDistance(_loc6_, param2, (param2 * BASE._angle) | 0);
            _loc6_ = Math.atan2(_loc5_.y - param1.y, _loc5_.x - param1.x);
            _loc8_ = BASE.EllipseEdgeDistance(_loc6_, (_loc4_.width * 0.5) | 0, (_loc4_.width * 0.5 * BASE._angle) | 0);
            _loc9_ = param1.x - _loc5_.x;
            _loc10_ = param1.y - _loc5_.y;
            if ((_loc11_ = Math.sqrt(_loc9_ * _loc9_ + _loc10_ * _loc10_) | 0) < _loc7_ + _loc8_) {
                return true;
            }
        }
        return false;
    }

    public static Clear(): void {
        let _loc1_: MonsterBase = null;
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: int = 0;
        if (CREEPS.m_attackingCreeps) {
            as3.vsetLength(CREEPS.m_attackingCreeps, 0);
        }
        for (_loc2_ in CREEPS._creeps) {
            _loc1_ = as3.cast(CREEPS._creeps[_loc2_], MonsterBase);
            _loc1_.clear();
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(_loc1_.graphic);
            }
        }
        CREEPS._creeps = {};
        CREEPS._creepCount = CREEPS._flungCount = 0;
        for (_loc3_ in CREEPS._flungGuardian) {
            CREEPS._flungGuardian[_loc3_] = false;
        }
        _loc4_ = 0;
        while (_loc4_ < CREEPS._guardianList.length) {
            as3.vset(CREEPS._guardianList, _loc4_, null);
            _loc4_++;
        }
        as3.vsetLength(CREEPS._guardianList, 0);
        CREEPS.clearOverlapCache();
    }

    public static get _guardian(): ChampionBase {
        let _loc1_: int = 0;
        while (_loc1_ < CREEPS._guardianList.length) {
            if (Boolean(as3.vget(CREEPS._guardianList, _loc1_)) && CHAMPIONCAGE.isBasicGuardian(as3.vget(CREEPS._guardianList, _loc1_)._creatureID)) {
                return as3.vget(CREEPS._guardianList, _loc1_);
            }
            _loc1_++;
        }
        return null;
    }

    public static set _guardian(param1: ChampionBase) {
        let _loc2_: int = -1;
        let _loc3_: int = 0;
        while (_loc3_ < CREEPS._guardianList.length) {
            if (CHAMPIONCAGE.isBasicGuardian(as3.vget(CREEPS._guardianList, _loc3_)._creatureID)) {
                _loc2_ = _loc3_;
            }
            _loc3_++;
        }
        if (_loc2_ == -1) {
            if (param1) {
                CREEPS._guardianList.unshift(param1);
            }
        } else if (!param1) {
            CREEPS._guardianList.splice(_loc2_, 1);
        } else {
            as3.vset(CREEPS._guardianList, _loc2_, param1);
        }
    }

    public static addGuardian(param1: ChampionBase): boolean {
        let _loc2_: int = -1;
        let _loc3_: int = 0;
        while (_loc3_ < CREEPS._guardianList.length) {
            if (as3.vget(CREEPS._guardianList, _loc3_)._creatureID == param1._creatureID) {
                _loc2_ = _loc3_;
            }
            _loc3_++;
        }
        if (_loc2_ == -1) {
            if (param1) {
                CREEPS._guardianList.push(param1);
                return true;
            }
        }
        return false;
    }

    public static getGuardianIndex(param1: int): int {
        let _loc2_: int = 0;
        while (_loc2_ < CREEPS._guardianList.length) {
            if ((Number(as3.vget(CREEPS._guardianList, _loc2_)._creatureID.substr(1)) | 0) == param1) {
                return _loc2_;
            }
            _loc2_++;
        }
        return -1;
    }
}
